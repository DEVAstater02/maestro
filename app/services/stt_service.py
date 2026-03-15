import os

class STTService:
    def __init__(self):
        self.default_provider = os.getenv("STT_PROVIDER", "cartesia").lower()
        print(f"[STTService] Using STT provider: {self.default_provider}")

        # Only instantiate the configured provider
        if self.default_provider == "elevenlabs":
            from app.repositories.elevenlabs import ElevenLabsRepository
            self._repo = ElevenLabsRepository()
        elif self.default_provider == "cartesia":
            from app.repositories.cartesia import CartesiaRepository
            self._repo = CartesiaRepository()
        elif self.default_provider == "assemblyai":
            from app.repositories.assemblyai_repo import AssemblyAI
            self._repo = AssemblyAI()
        else:
            raise ValueError(f"Unsupported STT provider: {self.default_provider}")

    async def transcribe(self, audio_file_path: str, provider: str = None) -> str:
        """
        Transcribe audio using the configured provider.
        
        Args:
            audio_file_path (str): Path to the audio file.
            provider (str): The STT provider to use ('elevenlabs', 'cartesia', 'assemblyai').
            
        Returns:
            str: The transcribed text.
        """
        if not audio_file_path or not os.path.exists(audio_file_path):
            raise ValueError(f"Audio file not found: {audio_file_path}")

        provider = (provider or self.default_provider).lower()
        
        if provider == "elevenlabs":
            from app.repositories.elevenlabs import ElevenLabsRepository
            repo = self._repo if isinstance(self._repo, ElevenLabsRepository) else ElevenLabsRepository()
            return repo.transcribe_audio(audio_file_path)
        elif provider == "cartesia":
            from app.repositories.cartesia import CartesiaRepository
            repo = self._repo if isinstance(self._repo, CartesiaRepository) else CartesiaRepository()
            return repo.speech_to_text(audio_file_path)
        elif provider == "assemblyai":
            from app.repositories.assemblyai_repo import AssemblyAI
            repo = self._repo if isinstance(self._repo, AssemblyAI) else AssemblyAI()
            return await repo.transcribe_audio_file(audio_file_path)
        else:
            raise ValueError(f"Unsupported STT provider: {provider}")
