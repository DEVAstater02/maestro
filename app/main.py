from dotenv import load_dotenv
import os
import json
import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.prompts.prompts import TEST_PROMPT
from app.prompts.visualiser import VISUALISER_PROMPT
import time
from app.repositories import claude, elevenlabs
from app.services.stt_service import STTService
from app.services.visualizer_service import VisualizerService

# Load environment variables from .env file at the very beginning
# This makes all variables in .env available via os.getenv()
load_dotenv()

app = FastAPI(title="Voice AI Tutor")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def read_index():
    static_file = os.path.join(static_dir, "index.html")
    return FileResponse(static_file)

# You can now access any environment variable loaded from .env generically.
# For example, to get a variable named 'MY_GENERIC_KEY':
# my_generic_key = os.getenv("MY_GENERIC_KEY")
# print(f"My generic key: {my_generic_key}") # For debugging, do not expose in production

@app.websocket("/ws/voice")
async def conversation_ws_handler(websocket : WebSocket):
    await websocket.accept()
    print("Client Connected")

    messages = []
    elevenlabs_repo = elevenlabs.ElevenLabsRepository()
    stt_service = STTService()
    claude_repo = claude.ClaudeRepository()
    visualizer_service = VisualizerService(claude_repo)

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
            
            transcribed_text = await stt_service.transcribe(file_name, provider="elevenlabs")
            end_time = time.perf_counter()
            print(f"Time taken by STT : {(end_time-start_time):.4f} seconds")

            # Send transcription to the frontend for diagram labels
            await websocket.send_json({
                "type": "transcription",
                "data": transcribed_text
            })

            start_time = time.perf_counter()
            # 4 - Stream the response from LLM and convert to speech in real-time
            
            # Get the streaming text response from Claude
            text_stream = claude_repo.stream_response(
                prompt=TEST_PROMPT.format(
                    CHAT_HISTORY=format_history(messages), 
                    USER_INPUT=transcribed_text
                )
            )
            
            # Collect the full response for conversation history
            full_response = ""
            
            # 5 - Stream TTS audio chunks to the client in real-time
            try:
                # Stream audio chunks as they're generated from the text stream
                async for full_text, audio_chunk in elevenlabs_repo.stream_speech_from_text_stream(text_stream):
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
                        print(f"{visualization_payload['format'].capitalize()} visualisation sent to client")
                    
                except Exception as e:
                    print(f"Error generating visualisation: {e}")

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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)