from app.repositories.elevenlabs import ElevenLabsRepository
from app.repositories.cartesia import CartesiaRepository
from app.repositories.openai_repo import OpenAIRepository
import os

class TTSService:
    def __init__(self):
        self.elevenlabs_repo = ElevenLabsRepository()
        self.cartesia_repo = CartesiaRepository()
        self.openai_repo = OpenAIRepository()
        self.default_provider = os.getenv("TTS_PROVIDER", "openai").lower()
        self.cartesia_api_key = os.getenv("CARTESIA_API_KEY", "")

    def _get_effective_provider(self, provider: str) -> str:
        """Determines the provider to use, with fallback logic."""
        p = (provider or self.default_provider).lower()
        if p == "cartesia":
            # Fallback if API key is obviously invalid or missing
            if not self.cartesia_api_key or self.cartesia_api_key.lower() == "randoms":
                print("[TTSService] WARNING: Cartesia selected but API key is missing or invalid. Falling back to OpenAI.")
                return "openai"
        return p

    def generate_speech(self, text: str, provider: str = None, voice_id: str = None, speed: float = 1.0) -> bytes:
        """
        Generate speech from text (batch).

        Args:
            text (str): The text to convert to speech.
            provider (str): The TTS provider to use ('openai', 'elevenlabs', 'cartesia').
            voice_id (str): Optional voice ID.
            speed (float): The speed of the speech (0.6 to 1.5, supported by Cartesia).

        Returns:
            bytes: Audio data.
        """
        provider = self._get_effective_provider(provider)
        if provider == "openai":
            return self.openai_repo.generate_speech(text, voice_id=voice_id or "coral")
        elif provider == "elevenlabs":
            return self.elevenlabs_repo.generate_speech(text, voice_id=voice_id or "21m00Tcm4TlvDq8ikWAM")
        elif provider == "cartesia":
            return self.cartesia_repo.text_to_speech(text, voice_id=voice_id or "a0e99829-1bb2-4353-9d43-352c75535515", speed=speed)
        else:
            raise ValueError(f"Unsupported TTS provider: {provider}")

    async def stream_speech(self, text_stream, provider: str = "openai", voice_id: str = None, speed: float = 1.0):
        """
        Stream speech from a text stream (async generator).

        Args:
            text_stream: Async generator yielding text chunks.
            provider (str): The TTS provider to use ('openai', 'elevenlabs', 'cartesia').
            voice_id (str): Optional voice ID.
            speed (float): The speed of the speech (0.6 to 1.5, supported by Cartesia).

        Yields:
            tuple: (full_text, audio_chunk)
        """
        provider = self._get_effective_provider(provider)
        if provider == "openai":
            async for data in self.openai_repo.stream_speech_from_text_stream(
                text_stream,
                voice_id=voice_id or "coral"
            ):
                yield data
        elif provider == "elevenlabs":
            async for data in self.elevenlabs_repo.stream_speech_from_text_stream(
                text_stream,
                voice_id=voice_id or "EXAVITQu4vr4xnSDxMaL"
            ):
                yield data
        elif provider == "cartesia":
            async for data in self.cartesia_repo.stream_speech_from_text_stream(
                text_stream,
                voice_id=voice_id or "a33f7a4c-100f-41cf-a1fd-5822e8fc253f",
                speed=speed
            ):
                yield data
        else:
            raise ValueError(f"Unsupported TTS provider: {provider}")
