from app.repositories.elevenlabs import ElevenLabsRepository
from app.repositories.cartesia import CartesiaRepository
from app.repositories.assemblyai_repo import AssemblyAI
import os

class STTService:
    def __init__(self):
        self.elevenlabs_repo = ElevenLabsRepository()
        self.cartesia_repo = CartesiaRepository()
        self.assemblyai_repo = AssemblyAI()

    async def transcribe(self, audio_file_path: str, provider: str = "elevenlabs") -> str:
        """
        Transcribe audio using the specified provider.
        
        Args:
            audio_file_path (str): Path to the audio file.
            provider (str): The STT provider to use ('elevenlabs', 'cartesia', 'assemblyai').
            
        Returns:
            str: The transcribed text.
        """
        if not audio_file_path or not os.path.exists(audio_file_path):
            raise ValueError(f"Audio file not found: {audio_file_path}")

        provider = provider.lower()
        
        if provider == "elevenlabs":
            return self.elevenlabs_repo.transcribe_audio(audio_file_path)
        elif provider == "cartesia":
            return self.cartesia_repo.speech_to_text(audio_file_path)
        elif provider == "assemblyai":
            # Note: AssemblyAI repo has transcribe_audio_file which is async
            return await self.assemblyai_repo.transcribe_audio_file(audio_file_path)
        else:
            raise ValueError(f"Unsupported STT provider: {provider}")
