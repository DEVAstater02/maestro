from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import json
import time
import re
import os
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.services.curation_service import CurationService

USER_ID = "00000000-0000-0000-0000-000000000000"

router = APIRouter()

async def to_async_iterator(iterator):
    """Helper to convert sync iterator to async iterator."""
    for item in iterator:
        yield item

@router.websocket("/ws/curation")
async def curation_ws_handler(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    await websocket.accept()
    print("[Curation] Client Connected")

    stt_service = STTService()
    tts_service = TTSService()
    curation_service = CurationService()

    # Resolve the user_id from the JWT token (or fall back to anonymous)
    from app.utils.auth_utils import decode_access_token
    user_id = USER_ID
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub", USER_ID)
            print(f"[Curation] Authenticated user: {user_id}")

    # Fetch user data via CurationService
    user_profile_str = curation_service.get_user_profile(user_id)
    
    # State for curation
    curation_history = []
    topic = ""
    user_persona = ""
    subject = ""

    try:
        await websocket.send_json({
            "type": "audio_format",
            "data": tts_service.get_stream_audio_format(),
        })

        # 1. Initial configuration message
        try:
            initial_msg = await websocket.receive_json()
        except json.JSONDecodeError as e:
            raw_data = await websocket.receive_text()
            print(f"[Curation] Failed to parse initial JSON: {e}. Received: {raw_data}")
            raise ValueError(f"Invalid JSON configuration message: {e}")

        topic = initial_msg.get("topic", "Unknown Topic")
        user_persona = initial_msg.get("user_persona", "A student")
        subject = initial_msg.get("subject", "General")
        
        print(f"[Curation] Started for Topic: {topic}, Persona: {user_persona}")

        # 2. Get the first curation question
        current_question = await curation_service.generate_curation_question(
            topic=topic,
            user_profile_str=user_profile_str,
            subject=subject,
            curation_history_text="No conversation yet."
        )
        
        # Stream the first question
        async for _, audio_chunk in tts_service.stream_speech(to_async_iterator([current_question]), provider="grok"):
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
                
                transcribed_text = await stt_service.transcribe(file_name)
                os.remove(file_name) # Clean up
                
                await websocket.send_json({"type": "transcription", "data": transcribed_text})
                
                # Update history
                curation_history.append(f"Tutor: {current_question}")
                curation_history.append(f"Student: {transcribed_text}")
                
                llm_response = await curation_service.generate_curation_question(
                    topic=topic,
                    user_profile_str=user_profile_str,
                    subject=subject,
                    curation_history_text="\n".join(curation_history)
                )
                
                # Check for conclusion
                conclusion_text = curation_service.check_conclusion(llm_response)
                
                if conclusion_text:
                    await websocket.send_json({"type": "status", "data": "generating_syllabus", "text": conclusion_text})
                    
                    # 4. Generate Final Syllabus
                    syllabus_json = await curation_service.generate_syllabus(
                        topic=topic,
                        user_persona=user_persona,
                        subject=subject,
                        conclusion_text=conclusion_text
                    )

                    print(f"[Curation] Syllabus Generated: {list(syllabus_json.keys())}")
                    
                    # Store the generated syllabus to db if it's not a raw/error response
                    if "raw_response" not in syllabus_json and "error" not in syllabus_json:
                        try:
                            syllabus_id = curation_service.store_syllabus(
                                user_id=user_id,
                                title=topic,
                                content_json=syllabus_json
                            )
                            # add the generated id to the payload
                            syllabus_json["_id"] = syllabus_id
                        except Exception as e:
                            print(f"[Curation] Failed to store syllabus to DB: {e}")
                    
                    await websocket.send_json({"type": "final_syllabus", "data": syllabus_json})
                    print("[Curation] Syllabus generated and sent. Closing connection.")
                    break
                else:
                    # Continue curation
                    current_question = llm_response
                    async for _, audio_chunk in tts_service.stream_speech(to_async_iterator([current_question]), provider="grok"):
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
