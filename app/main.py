from dotenv import load_dotenv
import os
import json
import re
import uvicorn
from fastapi import FastAPI, WebSocket

from fastapi.middleware.cors import CORSMiddleware
from app.prompts.prompts import TEST_PROMPT
from app.prompts.visualiser import VISUALISER_PROMPT
import time
from app.repositories import claude, gemini, elevenlabs, assemblyai_repo
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.visualizer_service import VisualizerService

def sanitize_mermaid(diagram: str) -> str:
    """Fix common Mermaid syntax issues that LLMs produce."""
    if not diagram:
        return diagram

    lines = diagram.split("\n")
    sanitized = []

    for line in lines:
        # Fix unquoted labels in square brackets: A[Label Text] -> A["Label Text"]
        # But skip already-quoted labels: A["Label Text"]
        line = re.sub(
            r'\[([^\]"]+)\]',
            lambda m: f'["{m.group(1)}"]' if not m.group(1).startswith('"') else m.group(0),
            line
        )
        
        # Fix unquoted labels in arrow labels: -->|label| -> -->|"label"|
        line = re.sub(
            r'\|([^"|]+)\|',
            lambda m: f'|"{m.group(1)}"|',
            line
        )

        sanitized.append(line)

    return "\n".join(sanitized)

# Load environment variables from .env file at the very beginning
# This makes all variables in .env available via os.getenv()
load_dotenv()

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

# You can now access any environment variable loaded from .env generically.
# For example, to get a variable named 'MY_GENERIC_KEY':
# my_generic_key = os.getenv("MY_GENERIC_KEY")
# print(f"My generic key: {my_generic_key}") # For debugging, do not expose in production

@app.websocket("/ws/voice")
async def conversation_ws_handler(websocket : WebSocket):
    await websocket.accept()
    print("Client Connected")

    messages = []
    tts_service = TTSService()
    stt_service = STTService()
    llm_repo = get_llm_repository()
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
                    CHAT_HISTORY=format_history(messages), 
                    USER_INPUT=transcribed_text
                )
            )
            
            # Collect the full response for conversation history
            full_response = ""
            
            # 5 - Stream TTS audio chunks to the client in real-time
            try:
                # Stream audio chunks as they're generated from the text stream
                async for full_text, audio_chunk in tts_service.stream_speech(text_stream, provider="cartesia"):
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
                    print("Generating visualisation...")
                    visualiser_to_llm = VISUALISER_PROMPT.format(
                        USER_INPUT=transcribed_text,
                        TUTOR_RESPONSE=full_response
                    )
                    
                    vis_data = None
                    
                    # Use structured output if the LLM repo supports it (Gemini)
                    if hasattr(llm_repo, 'generate_structured_response'):
                        from app.models.user_models import VisualisationResponse
                        result = await llm_repo.generate_structured_response(
                            prompt=visualiser_to_llm,
                            response_schema=VisualisationResponse,
                        )
                        if result:
                            vis_data = result.model_dump(exclude_none=True)
                            print(f"Structured output from Gemini: {vis_data.get('title', 'N/A')}")
                    else:
                        # Fallback for Claude: parse raw text as JSON
                        raw_visualisation = await llm_repo.generate_response(visualiser_to_llm)
                        print(f"Generated visualisation: {raw_visualisation[:200]}...")
                        
                        if raw_visualisation and raw_visualisation.strip():
                            cleaned = raw_visualisation.strip()
                            if cleaned.startswith("```"):
                                lines = cleaned.split("\n")
                                if lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].strip() == "```":
                                    lines = lines[:-1]
                                cleaned = "\n".join(lines).strip()
                            try:
                                vis_data = json.loads(cleaned)
                            except json.JSONDecodeError:
                                print("JSON parse failed for visualisation")
                    
                    # Sanitize the Mermaid diagram regardless of source
                    if vis_data and "diagram" in vis_data and vis_data["diagram"]:
                        original = vis_data["diagram"]
                        vis_data["diagram"] = sanitize_mermaid(original)
                        if original != vis_data["diagram"]:
                            print(f"Sanitized diagram: {vis_data['diagram'][:100]}...")
                    
                    if vis_data:
                        await websocket.send_json({
                            "type": "visualisation",
                            "format": "structured",
                            "data": vis_data
                        })
                        print("Structured visualisation sent to client")

                    # visualization_payload = await visualizer_service.generate_visualisation(
                    #     user_input=transcribed_text,
                    #     tutor_response=full_response
                    # )
                    
                    # if visualization_payload:
                    #     await websocket.send_json(visualization_payload)
                    #     print(f"{visualization_payload['format'].capitalize()} visualisation sent to client")
                    
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