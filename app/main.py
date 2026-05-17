from dotenv import load_dotenv
import asyncio
import math
import os
import json
import re
import uvicorn
from fastapi import FastAPI, WebSocket, Query
from starlette.websockets import WebSocketDisconnect
from typing import Optional

from fastapi.middleware.cors import CORSMiddleware
from app.prompts.prompts import (
    TUTOR_PROMPT, TUTOR_CONTEXT,
    WELCOME_SYSTEM_PROMPT, WELCOME_USER_CONTEXT,
    REVIEW_PROMPT, WELCOME_COMPLETE_SYSTEM_PROMPT,
)
import time
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.visualizer_service import VisualizerService
from app.services.conversation_service import ConversationService
from app.routers import syllabus, curation, auth

# Load environment variables from .env file at the very beginning
from app.database import init_db

load_dotenv()
init_db()

app = FastAPI(title="Voice AI Tutor")


def _build_syllabus_context(content_json: dict) -> str:
    """Format syllabus content_json into clean teaching context (no noise fields)."""
    if not content_json or not isinstance(content_json, dict):
        return "No specific syllabus provided."

    lines = []

    objectives = content_json.get("learning_objectives", [])
    if objectives:
        lines.append("Learning Objectives:")
        for i, obj in enumerate(objectives, 1):
            lines.append(f"  {i}. {obj}")
        lines.append("")

    nodes = content_json.get("content_nodes", [])
    if nodes:
        lines.append("Content Nodes:")
        for i, node in enumerate(nodes):
            title = node.get("title", f"Node {i + 1}")
            concept = node.get("concept", "")
            lines.append(f"  [{i + 1}] {title}" + (f" — {concept}" if concept else ""))

    return "\n".join(lines) if lines else "No specific syllabus provided."


def _build_persona_context(user_record) -> str:
    """Format UserRecord into a compact persona string for prompt injection."""
    if not user_record:
        return "No profile available."
    parts = []
    profile_line = []
    if user_record.learning_style:
        profile_line.append(f"Learning style: {user_record.learning_style}")
    if user_record.reasoning_speed:
        profile_line.append(f"Pace: {user_record.reasoning_speed}")
    if user_record.grade:
        profile_line.append(f"Grade: {user_record.grade}")
    if profile_line:
        parts.append(" | ".join(profile_line))
    if user_record.interests:
        parts.append(f"Interests: {user_record.interests}")
    # Uncomment to pass knowledge map into teaching prompt (most value is at syllabus creation time)
    # if getattr(user_record, 'prior_knowledge', None):
    #     km = ", ".join(f"{k} ({v}/50)" for k, v in user_record.prior_knowledge.items())
    #     parts.append(f"Prior exposure: {km}")
    # if getattr(user_record, 'completed_courses', None):
    #     cc_parts = []
    #     for sid, (label, score) in user_record.completed_courses.items():
    #         if score >= 100:
    #             cc_parts.append(f"{label} (mastered)")
    #         else:
    #             cc_parts.append(f"{label} ({score}% through)")
    #     parts.append(f"Completed courses: {', '.join(cc_parts)}")
    if user_record.analogy_pool and isinstance(user_record.analogy_pool, list) and user_record.analogy_pool:
        parts.append(f"Analogies that resonate: {', '.join(str(a) for a in user_record.analogy_pool)}")
    if user_record.persona_notes:
        parts.append(f"Behavioral notes: {user_record.persona_notes}")
    return "\n".join(parts) if parts else "No profile available."


def _resolve_current_node(content_nodes: list, index: int) -> tuple[str, str]:
    """Return (title, concept) for the node at index, clamped to valid range."""
    if not content_nodes:
        return "General", ""
    safe = min(index, len(content_nodes) - 1)
    node = content_nodes[safe]
    return node.get("title", "General"), node.get("concept", "")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(syllabus.router, prefix="/api", tags=["Syllabus"])
app.include_router(curation.router, prefix="/api", tags=["Curation"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])


async def to_async_iterator(items):
    """Helper to convert a list into an async iterator for TTS streaming."""
    for item in items:
        yield item


@app.websocket("/ws/voice")
async def conversation_ws_handler(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
    syllabus_id: Optional[str] = Query(default=None)
):
    await websocket.accept()
    print("[Maestro] Client Connected")

    import time as _time
    _connect_time: float = _time.monotonic()

    messages = []
    tts_service = TTSService()
    stt_service = STTService()

    conv_service = ConversationService()
    visualizer_service = VisualizerService(conv_service.get_llm_repo())

    # ── Resolve user_id from JWT token ───────────────────────────────────────
    user_id = None
    user_name = "Student"
    user_record = None
    if token:
        from app.utils.auth_utils import decode_access_token
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            user_name = payload.get("name", "Student")
            print(f"[Maestro] Authenticated user: {user_id} ({user_name})")
            try:
                user_record = conv_service.persistence_repo.get_user(user_id)
                if user_record:
                    knowledge = conv_service.persistence_repo.get_user_knowledge(user_id)
                    user_record.prior_knowledge = knowledge["prior"]
                    user_record.completed_courses = knowledge["completed"]
            except Exception as e:
                print(f"[Maestro] WARNING: could not fetch user record: {e}")

    # ── Initialize State (Memory & Syllabus) ──────────────────────────────────
    SESSION_MEMORY = ""
    CONVERSATION_SYLLABUS = "No specific syllabus provided."
    CONTENT_NODES = []
    CURRENT_NODE_INDEX = 0
    SESSION_COMPLETE = False
    session_id = None
    syllabus_data = None
    SESSION_TOTAL_SECONDS = 0
    SESSION_LLM_INPUT_TOKENS = 0
    SESSION_LLM_OUTPUT_TOKENS = 0
    SESSION_TTS_CHARS = 0

    # ── Resume or Create Session for the given Syllabus ──────────────────────
    if syllabus_id:
        latest_session = conv_service.get_latest_session(user_id=user_id, syllabus_id=syllabus_id)
        if latest_session:
            session_id = latest_session.get("id")
            SESSION_MEMORY = latest_session.get("session_memory_string") or ""
            CURRENT_NODE_INDEX = latest_session.get("current_chapter_index", 0)
            SESSION_COMPLETE = latest_session.get("is_completed", False)
            SESSION_TOTAL_SECONDS = latest_session.get("total_seconds", 0)
            print(f"[Maestro] Resuming session {session_id} at node {CURRENT_NODE_INDEX} (complete={SESSION_COMPLETE})")
        else:
            try:
                session_id = conv_service.create_session(user_id=user_id, syllabus_id=syllabus_id)
                print(f"[Maestro] Created new session {session_id} for syllabus {syllabus_id}")
            except Exception as e:
                print(f"[Maestro] ERROR creating session: {e}")

        # Load Actual Syllabus Content
        syllabus_data = conv_service.get_syllabus(syllabus_id)
        if syllabus_data:
            content_json = syllabus_data.get("content_json", {})
            CONTENT_NODES = content_json.get("content_nodes", []) if isinstance(content_json, dict) else []
            CONVERSATION_SYLLABUS = _build_syllabus_context(content_json)
            print(f"[Maestro] Loaded syllabus: {syllabus_data.get('title')} ({len(CONTENT_NODES)} nodes)")
        else:
            print(f"[Maestro] Warning: Syllabus {syllabus_id} not found.")
    else:
        try:
            session_id = conv_service.create_session(user_id=user_id)
            print(f"[Maestro] Created anonymous session: {session_id}")
        except Exception as e:
            print(f"[Maestro] ERROR creating session: {e}")

    # ── Extract subject/topic metadata from syllabus ─────────────────────────
    subject = "General"
    syllabus_title = "this topic"
    grade_level = "intermediate"

    if syllabus_data:
        syllabus_title = syllabus_data.get("title", "this topic")
        _cj = syllabus_data.get("content_json", {})
        if isinstance(_cj, dict):
            subject = _cj.get("subject", _cj.get("metadata", {}).get("subject", "General"))
            grade_level = _cj.get("grade_level", _cj.get("metadata", {}).get("grade_level", "intermediate"))

    TOTAL_NODES_COUNT = len(CONTENT_NODES)
    PER_NODE_DELTA = math.floor(100 / TOTAL_NODES_COUNT) if TOTAL_NODES_COUNT > 0 else 0

    TURN_COUNTER = 0

    try:
        await websocket.send_json({
            "type": "audio_format",
            "data": tts_service.get_stream_audio_format(),
        })

        await websocket.send_json({
            "type": "session_state",
            "current_node_index": CURRENT_NODE_INDEX,
            "total_nodes": len(CONTENT_NODES),
            "is_completed": SESSION_COMPLETE,
            "total_seconds": SESSION_TOTAL_SECONDS,
        })

        # ── AI Greeting (speaks first) ───────────────────────────────────────
        try:
            greeting_user_ctx = WELCOME_USER_CONTEXT.format(
                USER_NAME=user_name,
                USER_PERSONA=_build_persona_context(user_record),
                SUBJECT=subject,
                TOPIC=syllabus_title,
                GRADE_LEVEL=grade_level,
                CONVERSATION_SYLLABUS=CONVERSATION_SYLLABUS,
                SESSION_MEMORY=SESSION_MEMORY,
            )
            greeting_stream = conv_service.stream_response(
                prompt=greeting_user_ctx,
                system_prompt=WELCOME_COMPLETE_SYSTEM_PROMPT if SESSION_COMPLETE else WELCOME_SYSTEM_PROMPT
            )

            greeting_text = ""
            greeting_start = time.perf_counter()
            async for chunk_text, audio_chunk in tts_service.stream_speech(greeting_stream):
                greeting_text = chunk_text
                await websocket.send_bytes(audio_chunk)

            print(f"[Maestro] Greeting delivered in {time.perf_counter() - greeting_start:.4f}s: {greeting_text[:80]}...")
            messages.append({"role": "agent", "input": greeting_text})
            await websocket.send_json({"type": "greeting_complete", "data": greeting_text})
        except WebSocketDisconnect:
            print("[Maestro] Client disconnected during greeting")
            return
        except Exception as e:
            print(f"[Maestro] Greeting failed (non-fatal): {e}")

        while True:
            # 1 - wait for user audio
            raw_voice_data = await websocket.receive_bytes()

            start_time = time.perf_counter()

            # 2 - write the audio bytes into file
            file_name = f"voice_{time.time()}.wav"
            with open(file_name, "wb") as f:
                f.write(raw_voice_data)
            print(f"Saved audio file of {len(raw_voice_data)} bytes")

            end_time = time.perf_counter()
            print(f"Time taken by input audio upload : {(end_time-start_time):.4f} seconds")

            start_time = time.perf_counter()
            # 3 - Send audio file to STT API to get the transcript
            transcribed_text = await stt_service.transcribe(file_name)

            try:
                os.remove(file_name)
            except:
                pass

            end_time = time.perf_counter()
            print(f"Time taken by STT : {(end_time-start_time):.4f} seconds")

            # Send transcription to the frontend for diagram labels
            await websocket.send_json({
                "type": "transcription",
                "data": transcribed_text
            })

            # 4 - Stream LLM response
            total_nodes = len(CONTENT_NODES)
            current_node_title, current_node_concept = _resolve_current_node(CONTENT_NODES, CURRENT_NODE_INDEX)

            llm_start_time = time.perf_counter()

            user_persona_str = _build_persona_context(user_record)

            if SESSION_COMPLETE:
                llm_system_prompt = REVIEW_PROMPT.format(
                    SUBJECT=subject,
                    TOPIC=syllabus_title,
                    GRADE_LEVEL=grade_level,
                    USER_PERSONA=user_persona_str,
                )
                llm_user_prompt = TUTOR_CONTEXT.format(
                    CONVERSATION_SYLLABUS=CONVERSATION_SYLLABUS,
                    CURRENT_NODE_INDEX=total_nodes,
                    TOTAL_NODES=total_nodes or 1,
                    CURRENT_NODE_TITLE="Course Complete",
                    CURRENT_NODE_CONCEPT="All nodes covered — review mode.",
                    SESSION_MEMORY=SESSION_MEMORY,
                    CHAT_HISTORY=conv_service.format_history(messages),
                    USER_INPUT=transcribed_text
                )
            else:
                llm_system_prompt = TUTOR_PROMPT.format(
                    SUBJECT=subject,
                    TOPIC=syllabus_title,
                    GRADE_LEVEL=grade_level,
                    USER_PERSONA=user_persona_str,
                )
                llm_user_prompt = TUTOR_CONTEXT.format(
                    CONVERSATION_SYLLABUS=CONVERSATION_SYLLABUS,
                    CURRENT_NODE_INDEX=CURRENT_NODE_INDEX + 1,
                    TOTAL_NODES=total_nodes or 1,
                    CURRENT_NODE_TITLE=current_node_title,
                    CURRENT_NODE_CONCEPT=current_node_concept,
                    SESSION_MEMORY=SESSION_MEMORY,
                    CHAT_HISTORY=conv_service.format_history(messages),
                    USER_INPUT=transcribed_text
                )

            text_stream = conv_service.stream_response(
                prompt=llm_user_prompt,
                system_prompt=llm_system_prompt,
            )

            # Wrapper to measure LLM TTFT (Time To First Token)
            async def tracked_text_stream(stream):
                first_token = False
                async for chunk in stream:
                    if not first_token:
                        print(f"[Maestro] LLM TTFT: {time.perf_counter() - llm_start_time:.4f}s")
                        first_token = True
                    yield chunk

            # 5 - Stream TTS audio chunks based on the LLM text stream
            full_response = ""
            tts_start_time = time.perf_counter()
            first_audio_chunk = False
            advance_flag = {"detected": False}
            _turn_tts_chars = 0

            async def advance_filter(stream):
                """Strip <advance_node/> from LLM stream before TTS; set flag if found."""
                buffer = ""
                async for chunk in stream:
                    buffer += chunk
                    if "<advance_node/>" in buffer:
                        advance_flag["detected"] = True
                        buffer = buffer.replace("<advance_node/>", "")
                    # Hold back tail if a partial tag might be accumulating
                    if "<" in buffer:
                        safe, _, tail = buffer.rpartition("<")
                        yield safe
                        buffer = "<" + tail
                    else:
                        yield buffer
                        buffer = ""
                if buffer:
                    cleaned = buffer.replace("<advance_node/>", "")
                    if "<advance_node/>" in buffer:
                        advance_flag["detected"] = True
                    yield cleaned

            try:
                async for chunk_text, audio_chunk in tts_service.stream_speech(
                    advance_filter(tracked_text_stream(text_stream))
                ):
                    if not first_audio_chunk:
                        first_audio_chunk = True
                        print(f"[Maestro] TTS TTFB (Time to First Byte): {time.perf_counter() - tts_start_time:.4f}s")

                    _turn_tts_chars += len(chunk_text)
                    full_response = chunk_text
                    await websocket.send_bytes(audio_chunk)

                tts_end_time = time.perf_counter()

                # Accumulate cost metrics for this turn
                _turn_input_tokens = (len(llm_system_prompt) + sum(len(m.get("input", "")) for m in messages)) // 4
                _turn_output_tokens = _turn_tts_chars // 4
                SESSION_LLM_INPUT_TOKENS += _turn_input_tokens
                SESSION_LLM_OUTPUT_TOKENS += _turn_output_tokens
                SESSION_TTS_CHARS += _turn_tts_chars

                # Update conversation history
                messages.append({"role": "user", "input": transcribed_text})
                messages.append({"role": "agent", "input": full_response})

                print(f"[Maestro] Total generation cycle (LLM + TTS): {tts_end_time - llm_start_time:.4f}s")

                await websocket.send_json({
                    "type": "tutor_transcription",
                    "data": full_response
                })

                # ── Node advance handling ─────────────────────────────────────
                if advance_flag["detected"] and total_nodes > 0 and CURRENT_NODE_INDEX < total_nodes - 1:
                    CURRENT_NODE_INDEX += 1
                    if session_id:
                        conv_service.persistence_repo.update_chapter_index(session_id, CURRENT_NODE_INDEX)
                    if user_id and user_record and syllabus_id and PER_NODE_DELTA > 0:
                        conv_service.persistence_repo.increment_completed_course(
                            user_id, syllabus_id, syllabus_title, PER_NODE_DELTA
                        )
                        cur_score = user_record.completed_courses.get(syllabus_id, (syllabus_title, 0))[1]
                        user_record.completed_courses[syllabus_id] = (syllabus_title, min(cur_score + PER_NODE_DELTA, 100))
                    await websocket.send_json({
                        "type": "node_advance",
                        "index": CURRENT_NODE_INDEX,
                        "total": total_nodes,
                        "node_title": CONTENT_NODES[CURRENT_NODE_INDEX].get("title", "") if CONTENT_NODES else "",
                    })
                    print(f"[Maestro] Advanced to node {CURRENT_NODE_INDEX}: {CONTENT_NODES[CURRENT_NODE_INDEX].get('title', '')}")

                elif advance_flag["detected"] and total_nodes > 0 and CURRENT_NODE_INDEX == total_nodes - 1:
                    # Last node understood — course complete
                    CURRENT_NODE_INDEX = total_nodes  # sentinel: one past end
                    SESSION_COMPLETE = True
                    if session_id:
                        conv_service.persistence_repo.update_chapter_index(session_id, CURRENT_NODE_INDEX)
                        conv_service.persistence_repo.mark_session_complete(session_id)
                    if user_id and user_record and syllabus_id and PER_NODE_DELTA > 0:
                        # Use remainder delta to land at exactly 100
                        remainder = 100 - user_record.completed_courses.get(syllabus_id, (syllabus_title, 0))[1]
                        final_delta = max(remainder, PER_NODE_DELTA)
                        conv_service.persistence_repo.increment_completed_course(
                            user_id, syllabus_id, syllabus_title, final_delta
                        )
                        user_record.completed_courses[syllabus_id] = (syllabus_title, 100)
                    # Capture messages before force flush empties the list
                    messages_for_persona = messages[:]
                    # Force memory flush to capture final turns before session ends
                    TURN_COUNTER, SESSION_MEMORY, _ = await conv_service.update_memory(
                        messages=messages,
                        TURN_COUNTER=TURN_COUNTER,
                        SESSION_MEMORY=SESSION_MEMORY,
                        session_id=session_id,
                        force=True,
                    )
                    if user_id and user_record:
                        asyncio.create_task(conv_service.update_persona_notes(
                            user_id=user_id,
                            user_record=user_record,
                            messages=messages_for_persona,
                            session_memory=SESSION_MEMORY,
                        ))
                    await websocket.send_json({"type": "course_complete", "total": total_nodes})
                    print("[Maestro] Course complete — memory flushed, session marked done")

                # 6 - Generate and send Visualisation
                try:
                    visualization_payload = await visualizer_service.generate_visualisation(
                        user_input=transcribed_text,
                        tutor_response=full_response,
                        subject=subject
                    )

                    if visualization_payload:
                        await websocket.send_json(visualization_payload)

                except Exception as e:
                    print(f"Error generating visualisation: {e}")

                TURN_COUNTER += 1
                should_update = TURN_COUNTER >= 10 and bool(messages)
                messages_for_persona = messages[:] if should_update and user_id and user_record else []
                TURN_COUNTER, SESSION_MEMORY, recovered_index = await conv_service.update_memory(
                    messages=messages,
                    TURN_COUNTER=TURN_COUNTER,
                    SESSION_MEMORY=SESSION_MEMORY,
                    session_id=session_id
                )
                if should_update and user_id and user_record:
                    asyncio.create_task(conv_service.update_persona_notes(
                        user_id=user_id,
                        user_record=user_record,
                        messages=messages_for_persona,
                        session_memory=SESSION_MEMORY,
                    ))
                if recovered_index is not None:
                    CURRENT_NODE_INDEX = recovered_index
                    if session_id:
                        conv_service.persistence_repo.update_chapter_index(session_id, CURRENT_NODE_INDEX)
                    print(f"[Maestro] Node index recovered from memory: {CURRENT_NODE_INDEX}")

            except Exception as e:
                print(f"Error during streaming audio: {e}")

    except WebSocketDisconnect:
        print("[Maestro] Client disconnected")
    except Exception as e:
        print(f"[Maestro] Connection closed : {e}")
    finally:
        if session_id:
            elapsed = int(_time.monotonic() - _connect_time)
            conv_service.persistence_repo.update_session_time(session_id, elapsed)
            if SESSION_LLM_INPUT_TOKENS or SESSION_LLM_OUTPUT_TOKENS or SESSION_TTS_CHARS:
                conv_service.persistence_repo.update_session_costs(
                    session_id, SESSION_LLM_INPUT_TOKENS, SESSION_LLM_OUTPUT_TOKENS, SESSION_TTS_CHARS
                )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
