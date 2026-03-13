from dotenv import load_dotenv
import os
import json
import re
import uvicorn
from fastapi import FastAPI, WebSocket, Query
from typing import Optional

from fastapi.middleware.cors import CORSMiddleware
from app.prompts.prompts import TEST_PROMPT
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

@app.websocket("/ws/voice")
async def conversation_ws_handler(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    await websocket.accept()
    print("Client Connected")

    messages = []
    tts_service = TTSService()
    stt_service = STTService()
    
    conv_service = ConversationService()
    visualizer_service = VisualizerService(conv_service.get_llm_repo())

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
        session_id = conv_service.create_session(user_id=user_id)
        print(f"[Maestro] DB session started: {session_id}")
    except Exception as e:
        print(f"[Maestro] WARNING – could not create DB session: {e}")
        session_id = None  # continue in-memory only if DB is unavailable

    SESSION_MEMORY = ""
    TURN_COUNTER = 0

    try:
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
            transcribed_text = await stt_service.transcribe(file_name, provider="cartesia")
            
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

            start_time = time.perf_counter()
            # 4 - Stream the response from LLM and convert to speech in real-time
            
            # Get the streaming text response from LLM
            text_stream = conv_service.stream_response(
                prompt=TEST_PROMPT.format(
                    SESSION_MEMORY=SESSION_MEMORY,
                    CHAT_HISTORY=conv_service.format_history(messages), 
                    USER_INPUT=transcribed_text
                )
            )
            
            # Collect the full response for conversation history
            full_response = ""
            
            # 5 - Stream TTS audio chunks to the client in real-time
            try:
                # Stream audio chunks as they're generated from the text stream
                async for full_text, audio_chunk in tts_service.stream_speech(text_stream, provider="cartesia", speed=float(0.9)):
                    full_response = full_text
                    await websocket.send_bytes(audio_chunk)
                
                # Update conversation history
                messages.append({"role": "user", "input": transcribed_text})
                messages.append({"role": "agent", "input": full_response})
                
                end_time = time.perf_counter()
                print(f"Time taken by streaming LLM + TTS : {(end_time-start_time):.4f} seconds")
                
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
                TURN_COUNTER, SESSION_MEMORY = await conv_service.update_memory(
                    messages=messages,
                    TURN_COUNTER=TURN_COUNTER,
                    SESSION_MEMORY=SESSION_MEMORY,
                    session_id=session_id
                )

            except Exception as e:
                print(f"Error during streaming audio: {e}")

    except Exception as e:
        print(f"Connection closed : {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)