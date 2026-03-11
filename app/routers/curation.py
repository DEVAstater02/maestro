from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import json
import time
import re
import os
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.repositories.claude import ClaudeRepository
from app.prompts.curation import CURATION_PROMPT
from app.prompts.syllabus import SYLLABUS_GENERATION_PROMPT
from app.repositories.persistence_repo import PersistenceRepository

USER_ID = "00000000-0000-0000-0000-000000000000"

router = APIRouter()

async def to_async_iterator(iterator):
    """Helper to convert sync iterator to async iterator."""
    for item in iterator:
        yield item

def extract_json(text: str):
    """Robustly extract and parse JSON from LLM response."""
    # 1. Look for markdown blocks
    json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', text, re.DOTALL)
    candidate = json_match.group(1) if json_match else None
    
    if not candidate:
        # 2. Look for the first { and last }
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            candidate = text[start:end+1]
            
    if candidate:
        try:
            # Clean common LLM mistakes like trailing commas
            # This is a bit risky but can help for "Expecting ',' delimiter"
            # though usually that error means something else.
            # For now, let's just try basic parsing and add logging.
            return json.loads(candidate)
        except json.JSONDecodeError as e:
            print(f"[JSON Extraction] Direct decode failed: {e}. Text length: {len(candidate)}")
            # Try a very basic clean up for trailing commas in simple structures
            try:
                # Remove trailing commas before closing braces/brackets
                cleaned = re.sub(r',\s*([}\]])', r'\1', candidate)
                return json.loads(cleaned)
            except:
                raise e
    raise ValueError("No valid JSON found in text")

@router.websocket("/ws/curation")
async def curation_ws_handler(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    await websocket.accept()
    print("[Curation] Client Connected")

    stt_service = STTService()
    tts_service = TTSService()
    llm_repo = ClaudeRepository()
    persistence_repo = PersistenceRepository()

    # Resolve the user_id from the JWT token (or fall back to anonymous)
    from app.utils.auth_utils import decode_access_token
    user_id = USER_ID
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub", USER_ID)
            print(f"[Curation] Authenticated user: {user_id}")

    # Fetch user data
    user_record = persistence_repo.get_user(user_id)
    user_profile_str = "No existing profile data."
    if user_record:
        user_profile_str = f"Name: {user_record.name}\n"
        user_profile_str += f"Grade: {user_record.grade or 'Unknown'}\n"
        user_profile_str += f"Learning Style: {user_record.learning_style}\n"
        user_profile_str += f"Interests: {user_record.interests or 'Not specified'}\n"
        user_profile_str += f"Reasoning Speed: {user_record.reasoning_speed}\n"
    
    # State for curation
    curation_history = []
    topic = ""
    user_persona = ""
    subject = ""

    try:
        # 1. Initial configuration message
        initial_msg = await websocket.receive_json()
        topic = initial_msg.get("topic", "Unknown Topic")
        user_persona = initial_msg.get("user_persona", "A student")
        subject = initial_msg.get("subject", "General")
        
        print(f"[Curation] Started for Topic: {topic}, Persona: {user_persona}")

        # 2. Get the first curation question
        first_prompt = CURATION_PROMPT.format(
            TOPIC=topic,
            USER_PERSONA=user_profile_str,
            SUBJECT=subject,
            CURATION_HISTORY="No conversation yet."
        )
        
        current_question = await llm_repo.generate_response(
            prompt=first_prompt
        )
        
        # Stream the first question
        async for _, audio_chunk in tts_service.stream_speech(to_async_iterator([current_question]), provider="cartesia"):
            await websocket.send_bytes(audio_chunk)
            
        await websocket.send_json({"type": "status", "data": "waiting_for_input", "text": current_question})

        # 3. Main conversation loop
        while True:
            # Wait for user audio
            data = await websocket.receive()
            
            if "bytes" in data:
                raw_voice_data = data["bytes"]
                
                # STT
                file_name = f"curation_{time.time()}.wav"
                with open(file_name, "wb") as f:
                    f.write(raw_voice_data)
                
                transcribed_text = await stt_service.transcribe(file_name, provider="cartesia")
                os.remove(file_name) # Clean up
                
                await websocket.send_json({"type": "transcription", "data": transcribed_text})
                
                # Update history
                curation_history.append(f"Tutor: {current_question}")
                curation_history.append(f"Student: {transcribed_text}")
                
                # Decide next step
                prompt = CURATION_PROMPT.format(
                    TOPIC=topic,
                    USER_PERSONA=user_profile_str,
                    SUBJECT=subject,
                    CURATION_HISTORY="\n".join(curation_history)
                )
                
                llm_response = await llm_repo.generate_response(
                    prompt=prompt
                )
                
                # Check for conclusion
                if "<conclude_curation>" in llm_response:
                    conclusion_match = re.search(r'<conclude_curation>(.*?)</conclude_curation>', llm_response, re.DOTALL)
                    conclusion_text = conclusion_match.group(1).strip() if conclusion_match else "Great! I have enough information to build your syllabus."
                    
                    # Inform user we are generating syllabus
                    async for _, audio_chunk in tts_service.stream_speech(to_async_iterator([conclusion_text]), provider="cartesia"):
                        await websocket.send_bytes(audio_chunk)
                    
                    await websocket.send_json({"type": "status", "data": "generating_syllabus", "text": conclusion_text})
                    
                    # 4. Generate Final Syllabus
                    final_syllabus_prompt = SYLLABUS_GENERATION_PROMPT.replace("{{TOPIC}}", f"{topic} (Context: {conclusion_text})")
                    final_syllabus_prompt = final_syllabus_prompt.replace("{{USER_PERSONA}}", user_persona)
                    final_syllabus_prompt = final_syllabus_prompt.replace("{{SUBJECT}}", subject)
                    
                    syllabus_response = await llm_repo.generate_response(
                        prompt=final_syllabus_prompt,
                        model="claude-sonnet-4-6"
                    )

                    print(f"[Curation] Syllabus Response: {syllabus_response}")
                    
                    # Extract JSON
                    try:
                        syllabus_json = extract_json(syllabus_response)
                        
                        # Store the generated syllabus to db
                        try:
                            syllabus_id = persistence_repo.store_syllabus(
                                user_id=user_id,
                                title=topic,
                                content_json=syllabus_json
                            )
                            # add the generated id to the payload
                            syllabus_json["_id"] = syllabus_id
                        except Exception as e:
                            print(f"[Curation] Failed to store syllabus to DB: {e}")
                            
                    except Exception as e:
                        print(f"[Curation] JSON Extraction Final Failure: {e}")
                        syllabus_json = {"error": "Could not parse syllabus JSON", "raw": syllabus_response}
                    
                    await websocket.send_json({"type": "final_syllabus", "data": syllabus_json})
                    print("[Curation] Syllabus generated and sent. Closing connection.")
                    break
                else:
                    # Continue curation
                    current_question = llm_response
                    async for _, audio_chunk in tts_service.stream_speech(to_async_iterator([current_question]), provider="cartesia"):
                        await websocket.send_bytes(audio_chunk)
                    
                    await websocket.send_json({"type": "status", "data": "waiting_for_input", "text": current_question})

    except WebSocketDisconnect:
        print("[Curation] Client Disconnected")
    except Exception as e:
        print(f"[Curation] Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
