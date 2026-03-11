from dotenv import load_dotenv
import os
import json
import re
import uvicorn
from fastapi import FastAPI, WebSocket, Query
from typing import Optional

from fastapi.middleware.cors import CORSMiddleware
from app.prompts.prompts import TEST_PROMPT
from app.prompts.session_memory import SESSION_MEMORY_PROMPT
import time
from app.repositories import claude, gemini, elevenlabs, assemblyai_repo
from app.repositories.persistence_repo import PersistenceRepository
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.visualizer_service import VisualizerService
from app.routers import syllabus, curation, auth

# Load environment variables from .env file at the very beginning
from app.database import init_db

load_dotenv()
init_db()

# ─── LLM Provider Toggle ───────────────────────────────────────────
# Set LLM_PROVIDER in your .env file to switch between providers.
# Supported values: "claude" (default), "gemini"
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "claude").lower()
print(f"[Maestro] Using LLM provider: {LLM_PROVIDER}")

def get_llm_repository():
    """Factory function that returns the correct LLM repository based on LLM_PROVIDER."""
    if LLM_PROVIDER == "gemini":
        return gemini.GeminiRepository()
    elif LLM_PROVIDER == "claude":
        return claude.ClaudeRepository()
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{LLM_PROVIDER}'. "
            "Supported values: 'claude', 'gemini'"
        )

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

# You can now access any environment variable loaded from .env generically.
# For example, to get a variable named 'MY_GENERIC_KEY':
# my_generic_key = os.getenv("MY_GENERIC_KEY")
# print(f"My generic key: {my_generic_key}") # For debugging, do not expose in production

@app.websocket("/ws/voice")
async def conversation_ws_handler(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    await websocket.accept()
    print("Client Connected")

    messages = []
    tts_service = TTSService()
    stt_service = STTService()
    llm_repo = get_llm_repository()
    visualizer_service = VisualizerService(llm_repo)
    persistence_repo = PersistenceRepository()

    # ── Resolve user_id from JWT token (falls back to anonymous) ─────────────
    user_id = None
    if token:
        from app.utils.auth_utils import decode_access_token
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            print(f"[Maestro] Authenticated user: {user_id}")

    # ── Create a new DB session row for this WebSocket connection ────────────
    try:
        session_id = persistence_repo.create_session(user_id=user_id)
        print(f"[Maestro] DB session started: {session_id}")
    except Exception as e:
        print(f"[Maestro] WARNING – could not create DB session: {e}")
        raise e
        session_id = None  # continue in-memory only if DB is unavailable

    SESSION_MEMORY = ""
    TURN_COUNTER = 0

    try:
        while True:
            # 1 - wait for user audio
            raw_voice_data = await websocket.receive_bytes()
            
            start_time = time.perf_counter()

            # 2 - write the audio bytes into file
            file_name = str(time.time())
            with open(file_name, "wb") as f:
                f.write(raw_voice_data)
            print(f"Saved audio file of {len(raw_voice_data)} bytes")

            end_time = time.perf_counter()
            print(f"Time taken by input audio upload : {(end_time-start_time):.4f} seconds")

            start_time = time.perf_counter()
            # 3 - Send audio file to STT API to get the transcript
            
            transcribed_text = await stt_service.transcribe(file_name, provider="cartesia")
            end_time = time.perf_counter()
            print(f"Time taken by STT : {(end_time-start_time):.4f} seconds")

            # Send transcription to the frontend for diagram labels
            await websocket.send_json({
                "type": "transcription",
                "data": transcribed_text
            })

            start_time = time.perf_counter()
            # 4 - Stream the response from LLM and convert to speech in real-time
            
            # Get the streaming text response from LLM
            text_stream = llm_repo.stream_response(
                prompt=TEST_PROMPT.format(
                    SESSION_MEMORY=SESSION_MEMORY,
                    CHAT_HISTORY=format_history(messages), 
                    USER_INPUT=transcribed_text
                )
            )
            
            # Collect the full response for conversation history
            full_response = ""
            
            # 5 - Stream TTS audio chunks to the client in real-time
            try:
                # Stream audio chunks as they're generated from the text stream
                async for full_text, audio_chunk in tts_service.stream_speech(text_stream, provider="cartesia", speed=float(0.9)):
                    # Store the full text (will be the same for all chunks)
                    full_response = full_text
                    
                    await websocket.send_bytes(audio_chunk)
                
                # Update conversation history
                messages.append({"role": "user", "input": transcribed_text})
                messages.append({"role": "agent", "input": full_response})
                
                end_time = time.perf_counter()
                print(f"Time taken by streaming LLM + TTS : {(end_time-start_time):.4f} seconds")
                print(f"Full response: {full_response}")
                
                # 6 - Generate and send Visualisation
                try:
                    visualization_payload = await visualizer_service.generate_visualisation(
                        user_input=transcribed_text,
                        tutor_response=full_response
                    )
                    
                    if visualization_payload:
                        await websocket.send_json(visualization_payload)
                    
                except Exception as e:
                    print(f"Error generating visualisation: {e}")

                TURN_COUNTER += 1
                TURN_COUNTER, SESSION_MEMORY = await update_memory(
                    messages=messages,
                    TURN_COUNTER=TURN_COUNTER,
                    SESSION_MEMORY=SESSION_MEMORY,
                    llm_repo=llm_repo,
                    session_id=session_id,
                    persistence_repo=persistence_repo,
                )

            except ValueError as e:
                print(f"Error during streaming speech generation: {e}")
            except Exception as e:
                print(f"An unexpected error occurred during streaming: {e}")

    except Exception as e:
        print(f"Connection closed : {e}")

def format_history(conversation_array : dict):
    formatted_str = ""

    for entry in conversation_array:
        role = "Student" if entry["role"] == "user" else "Tutor"
        content = entry["input"]
        formatted_str += f"{role} : {content}\n"

    return formatted_str

async def update_memory(
    messages: list,
    TURN_COUNTER: int,
    SESSION_MEMORY: str,
    llm_repo,
    session_id: str | None = None,
    persistence_repo: "PersistenceRepository | None" = None,
):
    if TURN_COUNTER == 10:
        print("[Maestro] Updating session memory...")
        TURN_COUNTER = 0

        prompt = SESSION_MEMORY_PROMPT.format(
            CURRENT_SESSION_MEMORY=SESSION_MEMORY,
            CONVERSATION_MESSAGES=format_history(messages)
        )

        response = await llm_repo.generate_response(prompt=prompt)

        # Extract content between <updated_session_memory> tags
        match = re.search(r'<updated_session_memory>(.*?)</updated_session_memory>', response, re.DOTALL)
        if match:
            SESSION_MEMORY = match.group(1).strip()
            print("[Maestro] Session memory updated.")
        else:
            # Fallback if tags are missing but there's content
            SESSION_MEMORY = response.strip()
            print("[Maestro] Session memory updated (tags missing).")

        # ── Persist to DB (only when a valid session_id is available) ────────
        if session_id and persistence_repo:
            try:
                # 1. Persist the new session memory string
                persistence_repo.update_session_memory(session_id, SESSION_MEMORY)

                # 2. Upsert the messages being evicted from the in-memory array.
                #    We keep the last 5 in RAM; everything before that goes to DB.
                evicted_messages = messages[:-5] if len(messages) > 5 else messages[:]
                if evicted_messages:
                    persistence_repo.upsert_conversation_history(session_id, evicted_messages)
            except Exception as e:
                print(f"[Maestro] WARNING – persistence error during update_memory: {e}")

        # Keep only the last 5 messages to save context space,
        # as the previous context is now in SESSION_MEMORY
        messages[:] = messages[-5:]

    return TURN_COUNTER, SESSION_MEMORY

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)