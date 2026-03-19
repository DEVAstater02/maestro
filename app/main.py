from dotenv import load_dotenv
import os
import json
import re
import uvicorn
from fastapi import FastAPI, WebSocket, Query
from starlette.websockets import WebSocketDisconnect
from typing import Optional

from fastapi.middleware.cors import CORSMiddleware
from app.prompts.prompts import TUTOR_PROMPT, TUTOR_CONTEXT, GREETING_PROMPT
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

    messages = []
    tts_service = TTSService()
    stt_service = STTService()

    conv_service = ConversationService()
    visualizer_service = VisualizerService(conv_service.get_llm_repo())

    # ── Resolve user_id from JWT token ───────────────────────────────────────
    user_id = None
    user_name = "Student"
    if token:
        from app.utils.auth_utils import decode_access_token
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            user_name = payload.get("name", "Student")
            print(f"[Maestro] Authenticated user: {user_id} ({user_name})")

    # ── Initialize State (Memory & Syllabus) ──────────────────────────────────
    SESSION_MEMORY = ""
    CONVERSATION_SYLLABUS = "No specific syllabus provided."
    session_id = None
    syllabus_data = None

    # ── Resume or Create Session for the given Syllabus ──────────────────────
    if syllabus_id:
        # Try to find the existing session for this user/syllabus
        latest_session = conv_service.get_latest_session(user_id=user_id, syllabus_id=syllabus_id)
        if latest_session:
            session_id = latest_session.get("id")
            SESSION_MEMORY = latest_session.get("session_memory_string") or ""
            print(f"[Maestro] Resuming session {session_id} for syllabus {syllabus_id}")
        else:
            # Create a new session for this syllabus
            try:
                session_id = conv_service.create_session(user_id=user_id, syllabus_id=syllabus_id)
                print(f"[Maestro] Created new session {session_id} for syllabus {syllabus_id}")
            except Exception as e:
                print(f"[Maestro] ERROR creating session: {e}")

        # Load Actual Syllabus Content
        syllabus_data = conv_service.get_syllabus(syllabus_id)
        if syllabus_data:
            CONVERSATION_SYLLABUS = json.dumps(syllabus_data.get("content_json"), indent=2)
            print(f"[Maestro] Loaded syllabus: {syllabus_data.get('title')}")
        else:
            print(f"[Maestro] Warning: Syllabus {syllabus_id} not found.")
    else:
        # Fallback for sessions without a syllabus (unlikely in current design)
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
        content_json = syllabus_data.get("content_json", {})
        if isinstance(content_json, dict):
            subject = content_json.get("subject", content_json.get("metadata", {}).get("subject", "General"))

    TURN_COUNTER = 0

    try:
        await websocket.send_json({
            "type": "audio_format",
            "data": tts_service.get_stream_audio_format(),
        })

        # ── AI Greeting (speaks first) ───────────────────────────────────────
        try:
            greeting_prompt = GREETING_PROMPT.format(
                SUBJECT=subject,
                TOPIC=syllabus_title,
                GRADE_LEVEL=grade_level,
                CONVERSATION_SYLLABUS=CONVERSATION_SYLLABUS
            )
            greeting_text = await conv_service.generate_response(greeting_prompt)
            print(f"[Maestro] Greeting: {greeting_text[:80]}...")

            # Stream greeting audio
            async for _, audio_chunk in tts_service.stream_speech(to_async_iterator([greeting_text]), provider="grok"):
                await websocket.send_bytes(audio_chunk)

            messages.append({"role": "agent", "input": greeting_text})

            await websocket.send_json({"type": "greeting_complete", "data": greeting_text})
            print("[Maestro] Greeting delivered")
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
            llm_start_time = time.perf_counter()
            text_stream = conv_service.stream_response(
                prompt=TUTOR_CONTEXT.format(
                    CONVERSATION_SYLLABUS=CONVERSATION_SYLLABUS,
                    SESSION_MEMORY=SESSION_MEMORY,
                    CHAT_HISTORY=conv_service.format_history(messages),
                    USER_INPUT=transcribed_text
                ),
                system_prompt=TUTOR_PROMPT.format(
                    SUBJECT=subject,
                    TOPIC=syllabus_title,
                    GRADE_LEVEL=grade_level
                )
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

            try:
                # Stream audio chunks based on the provider (Cartesia/ElevenLabs now use sentence-based streaming)
                async for chunk_text, audio_chunk in tts_service.stream_speech(tracked_text_stream(text_stream), provider="grok"):
                    if not first_audio_chunk:
                        first_audio_chunk = True
                        print(f"[Maestro] TTS TTFB (Time to First Byte): {time.perf_counter() - tts_start_time:.4f}s")

                    full_response = chunk_text
                    await websocket.send_bytes(audio_chunk)

                tts_end_time = time.perf_counter()

                # Update conversation history
                messages.append({"role": "user", "input": transcribed_text})
                messages.append({"role": "agent", "input": full_response})

                print(f"[Maestro] Total generation cycle (LLM + TTS): {tts_end_time - llm_start_time:.4f}s")

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
                TURN_COUNTER, SESSION_MEMORY = await conv_service.update_memory(
                    messages=messages,
                    TURN_COUNTER=TURN_COUNTER,
                    SESSION_MEMORY=SESSION_MEMORY,
                    session_id=session_id
                )

            except Exception as e:
                print(f"Error during streaming audio: {e}")

    except WebSocketDisconnect:
        print("[Maestro] Client disconnected")
    except Exception as e:
        print(f"[Maestro] Connection closed : {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
