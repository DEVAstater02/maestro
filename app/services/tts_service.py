from app.repositories.elevenlabs import ElevenLabsRepository
from app.repositories.cartesia import CartesiaRepository
import os

class TTSService:
    def __init__(self):
        self.elevenlabs_repo = ElevenLabsRepository()
        self.cartesia_repo = CartesiaRepository()

    def generate_speech(self, text: str, provider: str = "elevenlabs", voice_id: str = None) -> bytes:
        """
        Generate speech from text (batch).
        
        Args:
            text (str): The text to convert to speech.
            provider (str): The TTS provider to use ('elevenlabs', 'cartesia').
            voice_id (str): Optional voice ID.
            
        Returns:
            bytes: Audio data.
        """
        provider = provider.lower()
        if provider == "elevenlabs":
            return self.elevenlabs_repo.generate_speech(text, voice_id=voice_id or "21m00Tcm4TlvDq8ikWAM")
        elif provider == "cartesia":
            return self.cartesia_repo.text_to_speech(text, voice_id=voice_id or "a0e99829-1bb2-4353-9d43-352c75535515")
        else:
            raise ValueError(f"Unsupported TTS provider: {provider}")

    async def stream_speech(self, text_stream, provider: str = "elevenlabs", voice_id: str = None):
        """
        Stream speech from a text stream (async generator).
        
        Args:
            text_stream: Async generator yielding text chunks.
            provider (str): The TTS provider to use ('elevenlabs', 'cartesia').
            voice_id (str): Optional voice ID.
            
        Yields:
            tuple: (full_text, audio_chunk)
        """
        provider = provider.lower()
        if provider == "elevenlabs":
            async for data in self.elevenlabs_repo.stream_speech_from_text_stream(
                text_stream, 
                voice_id=voice_id or "21m00Tcm4TlvDq8ikWAM"
            ):
                yield data
        elif provider == "cartesia":
            async for data in self.cartesia_repo.stream_speech_from_text_stream(
                text_stream, 
                voice_id=voice_id or "a33f7a4c-100f-41cf-a1fd-5822e8fc253f"
            ):
                yield data
        else:
            raise ValueError(f"Unsupported TTS provider: {provider}")
