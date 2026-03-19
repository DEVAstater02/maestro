import os
import json
import base64
import requests
import websockets
import asyncio
from typing import AsyncGenerator, Tuple

class GrokRepository:
    def __init__(self):
        """
        Initialize the Grok repository with the API key from environment variables.
        """
        self.api_key = os.getenv("GROK_API_KEY")
        if not self.api_key:
            raise ValueError("GROK_API_KEY environment variable not set in .env")
        
        self.base_url = "https://api.x.ai/v1/tts"
        self.ws_url = "wss://api.x.ai/v1/tts"

    def generate_speech(self, text: str, voice_id: str = "eve", language: str = "en") -> bytes:
        """
        Generate speech from text using Grok TTS (batch).

        Args:
            text (str): The text to convert to speech.
            voice_id (str): The voice ID to use (default: eve).
            language (str): The language code (default: en).

        Returns:
            bytes: Audio data.
        """
        if not text:
            raise ValueError("Text cannot be empty.")

        try:
            response = requests.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "voice_id": voice_id,
                    "language": language,
                },
            )
            response.raise_for_status()
            return response.content
        except Exception as e:
            print(f"Grok TTS Error: {e}")
            raise

    async def stream_speech_from_text_stream(
        self, 
        text_stream: AsyncGenerator[str, None], 
        voice_id: str = "eve", 
        language: str = "en",
        codec: str = "mp3"
    ) -> AsyncGenerator[Tuple[str, bytes], None]:
        """
        Generate speech from a streaming text source using Grok TTS WebSocket API.
        Buffers text until sentence boundaries, then sends to Grok for synthesis.

        Yields:
            tuple: (full_text, audio_chunk_bytes)
        """
        uri = f"{self.ws_url}?language={language}&voice={voice_id}&codec={codec}"
        
        try:
            async with websockets.connect(
                uri, 
                extra_headers={"Authorization": f"Bearer {self.api_key}"}
            ) as ws:
                full_text = ""
                sentence_buffer = ""
                sentence_endings = (".", "!", "?", "\n")

                async for text_chunk in text_stream:
                    full_text += text_chunk
                    sentence_buffer += text_chunk

                    if (
                        any(ending in sentence_buffer for ending in sentence_endings)
                        and len(sentence_buffer.strip()) > 20
                    ):
                        current_sentence = sentence_buffer.strip()
                        sentence_buffer = ""

                        print(f"[Grok TTS] Streaming sentence: {current_sentence[:50]}...")
                        
                        await ws.send(json.dumps({"type": "text.delta", "delta": current_sentence}))
                        await ws.send(json.dumps({"type": "text.done"}))

                        async for msg in ws:
                            event = json.loads(msg)
                            if event["type"] == "audio.delta":
                                audio_bytes = base64.b64decode(event["delta"])
                                yield (full_text, audio_bytes)
                            elif event["type"] == "audio.done":
                                break
                            elif event["type"] == "error":
                                raise RuntimeError(event["message"])

                # Handle any remaining text in the buffer
                if sentence_buffer.strip():
                    current_sentence = sentence_buffer.strip()
                    print(f"[Grok TTS] Streaming final sentence: {current_sentence[:50]}...")
                    
                    await ws.send(json.dumps({"type": "text.delta", "delta": current_sentence}))
                    await ws.send(json.dumps({"type": "text.done"}))

                    async for msg in ws:
                        event = json.loads(msg)
                        if event["type"] == "audio.delta":
                            audio_bytes = base64.b64decode(event["delta"])
                            yield (full_text, audio_bytes)
                        elif event["type"] == "audio.done":
                            break
                        elif event["type"] == "error":
                            raise RuntimeError(event["message"])

        except Exception as e:
            print(f"Grok TTS Error during streaming: {e}")
            raise
