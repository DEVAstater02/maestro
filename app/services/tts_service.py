from app.repositories.elevenlabs import ElevenLabsRepository
from app.repositories.cartesia import CartesiaRepository
from app.repositories.openai_repo import OpenAIRepository
from app.repositories.grok import GrokRepository
import os

class TTSService:
    def __init__(self):
        self.elevenlabs_repo = ElevenLabsRepository()
        self.cartesia_repo = CartesiaRepository()
        self.openai_repo = OpenAIRepository()
        self.grok_repo = GrokRepository()
        self.default_provider = os.getenv("TTS_PROVIDER", "openai").lower()
        self.cartesia_api_key = os.getenv("CARTESIA_API_KEY", "")
        print(f"[TTSService] Using TTS provider: {self.default_provider}")

        # Only instantiate the configured provider
        effective = self._get_effective_provider(self.default_provider)
        if effective == "elevenlabs":
            from app.repositories.elevenlabs import ElevenLabsRepository
            self._repo = ElevenLabsRepository()
        elif effective == "cartesia":
            from app.repositories.cartesia import CartesiaRepository
            self._repo = CartesiaRepository()
        elif effective == "openai":
            from app.repositories.openai_repo import OpenAIRepository
            self._repo = OpenAIRepository()
        else:
            raise ValueError(f"Unsupported TTS provider: {effective}")

    def _get_effective_provider(self, provider: str) -> str:
        """Determines the provider to use, with fallback logic."""
        p = (provider or self.default_provider).lower()
        if p == "cartesia":
            # Fallback if API key is obviously invalid or missing
            if not self.cartesia_api_key or self.cartesia_api_key.lower() == "randoms":
                print("[TTSService] WARNING: Cartesia selected but API key is missing or invalid. Falling back to OpenAI.")
                return "openai"
        return p

    def _get_repo(self, provider: str):
        """Get or create a repo for the given provider."""
        effective = self._get_effective_provider(provider)
        # Check if the cached repo matches the requested provider
        if effective == "elevenlabs":
            from app.repositories.elevenlabs import ElevenLabsRepository
            return self._repo if isinstance(self._repo, ElevenLabsRepository) else ElevenLabsRepository()
        elif effective == "cartesia":
            from app.repositories.cartesia import CartesiaRepository
            return self._repo if isinstance(self._repo, CartesiaRepository) else CartesiaRepository()
        elif effective == "openai":
            from app.repositories.openai_repo import OpenAIRepository
            return self._repo if isinstance(self._repo, OpenAIRepository) else OpenAIRepository()
        else:
            raise ValueError(f"Unsupported TTS provider: {effective}")

    def get_stream_audio_format(self, provider: str = None) -> dict:
        """Describe the audio format emitted by the active TTS provider."""
        effective = self._get_effective_provider(provider)

        if effective == "openai":
            return {
                "provider": effective,
                "container": "mp3",
                "encoding": "mp3",
                "sample_rate": None,
                "channels": 1,
            }

        if effective == "elevenlabs":
            return {
                "provider": effective,
                "container": "raw",
                "encoding": "pcm_s16le",
                "sample_rate": 24000,
                "channels": 1,
            }

        if effective == "cartesia":
            return {
                "provider": effective,
                "container": "raw",
                "encoding": "pcm_f32le",
                "sample_rate": 44100,
                "channels": 1,
            }

        raise ValueError(f"Unsupported TTS provider: {effective}")

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
        effective = self._get_effective_provider(provider)
        repo = self._get_repo(effective)
        if effective == "openai":
            return repo.generate_speech(text, voice_id=voice_id or "marin")
        elif effective == "elevenlabs":
            return repo.generate_speech(text, voice_id=voice_id or "21m00Tcm4TlvDq8ikWAM")
        elif effective == "cartesia":
            return repo.text_to_speech(text, voice_id=voice_id or "a0e99829-1bb2-4353-9d43-352c75535515", speed=speed)
        elif provider == "grok":
            return self.grok_repo.generate_speech(text, voice_id=voice_id or "eve")
        else:
            raise ValueError(f"Unsupported TTS provider: {effective}")

    async def stream_speech(self, text_stream, provider: str = None, voice_id: str = None, speed: float = 1.0):
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
        effective = self._get_effective_provider(provider)
        repo = self._get_repo(effective)
        if effective == "openai":
            async for data in repo.stream_speech_from_text_stream(
                text_stream,
                voice_id=voice_id or "marin"
            ):
                yield data
        elif effective == "elevenlabs":
            async for data in repo.stream_speech_from_text_stream(
                text_stream,
                voice_id=voice_id or "EXAVITQu4vr4xnSDxMaL"
            ):
                yield data
        elif effective == "cartesia":
            async for data in repo.stream_speech_from_text_stream(
                text_stream,
                voice_id=voice_id or "a33f7a4c-100f-41cf-a1fd-5822e8fc253f",
                speed=speed
            ):
                yield data
        elif provider == "grok":
            async for data in self.grok_repo.stream_speech_from_text_stream(
                text_stream,
                voice_id=voice_id or "eve"
            ):
                yield data
        else:
            raise ValueError(f"Unsupported TTS provider: {effective}")
