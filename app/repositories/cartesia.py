import os
import io
from cartesia import Cartesia

class CartesiaRepository:
    def __init__(self):
        """
        Initialize the Cartesia repository with the API key from environment variables.
        """
        self.api_key = os.getenv("CARTESIA_API_KEY")
        if not self.api_key:
            # Check for alternative env var name if necessary
            self.api_key = os.getenv("CARTESIA_API")
            
        if not self.api_key:
            raise ValueError("CARTESIA_API_KEY environment variable not set in .env")
            
        self.client = Cartesia(api_key=self.api_key)

    def text_to_speech(self, text: str, voice_id: str = "a0e99829-1bb2-4353-9d43-352c75535515", model_id: str = "sonic-english", speed: float = 1.0) -> bytes:
        """
        Convert text to speech using Cartesia's Sonic model.
        
        Args:
            text (str): The text to convert to speech.
            voice_id (str): The voice ID to use (default: British Female).
            model_id (str): The model ID to use (default: sonic-english).
            speed (float): The speed of the speech (0.6 to 1.5).
            
        Returns:
            bytes: Audio data in wav format.
        """
        if not text:
            raise ValueError("Text cannot be empty.")
            
        try:
            # Cartesia's tts.bytes returns an iterator of audio chunks
            audio_chunks = self.client.tts.bytes(
                model_id=model_id,
                transcript=text,
                voice={"mode": "id", "id": voice_id},
                output_format={
                    "container": "raw",
                    "encoding": "pcm_f32le",
                    "sample_rate": 44100
                },
                generation_config={
                    "speed": speed
                }
            )
            
            return b"".join(audio_chunks)
                
        except Exception as e:
            print(f"Cartesia TTS Error: {e}")
            raise

    async def stream_speech_from_text_stream(self, text_stream, voice_id: str = "a0e99829-1bb2-4353-9d43-352c75535515", model_id: str = "sonic-3", speed: float = 1.0):
        """
        Generate speech from a streaming text source using Cartesia's Sonic model.
        This method consumes text chunks from an async generator, collects the full text,
        and then streams the audio chunks back.
        
        Args:
            text_stream: An async generator that yields text chunks (e.g., from Claude).
            voice_id (str): The voice ID to use.
            model_id (str): The model ID to use.
            speed (float): The speed of the speech (0.6 to 1.5).
            
        Yields:
            tuple: (full_text, audio_chunk) - The complete text and audio data chunks.
        """
        try:
            # Collect all text chunks first to ensure smooth, continuous audio
            full_text = ""
            async for text_chunk in text_stream:
                full_text += text_chunk
            
            if full_text.strip():
                # print(f"Cartesia: Generating speech for collected text ({len(full_text)} chars) at speed {speed}")
                
                # Cartesia's SSE method returns a generator that yields audio chunks
                # We use 'wav' container for compatibility, though 'raw' is also possible
                response = self.client.tts.sse(
                    model_id=model_id,
                    transcript=full_text.strip(),
                    voice={"mode": "id", "id": voice_id},
                    output_format={
                        "container": "raw",
                        "encoding": "pcm_f32le",
                        "sample_rate": 44100
                    },
                    generation_config={
                        "speed": speed
                    }
                )
                
                chunk_num = 0
                for chunk in response:
                    # Each chunk is an object with a 'type' and potentially an 'audio' property
                    if hasattr(chunk, "audio") and chunk.audio is not None and len(chunk.audio) > 0:
                        chunk_num += 1
                        yield (full_text, chunk.audio)
                
                print(f"Cartesia finished streaming {chunk_num} total chunks")
                    
        except Exception as e:
            print(f"Cartesia API Error during streaming TTS: {e}")
            raise

    def speech_to_text(self, audio_file_path: str, model_id: str = "ink-whisper") -> str:
        """
        Convert speech to text using Cartesia's Ink model.
        
        Args:
            audio_file_path (str): Path to the audio file to transcribe.
            model_id (str): The model ID to use (default: ink-whisper).
            
        Returns:
            str: The transcribed text.
        """
        if not audio_file_path:
            raise ValueError("Audio file path cannot be empty.")
        
        if not os.path.exists(audio_file_path):
            raise ValueError(f"Audio file not found at: {audio_file_path}")
            
        try:
            with open(audio_file_path, "rb") as audio_file:
                audio_data = audio_file.read()
            
            # Use the STT transcribe method
            response = self.client.stt.transcribe(
                model=model_id,
                file=audio_data,
                language="en"
            )
            
            return response.text
                
        except Exception as e:
            print(f"Cartesia STT Error: {e}")
            raise

# Example of how to use (for testing purposes)
if __name__ == "__main__":
    # This is just a placeholder example
    try:
        repo = CartesiaRepository()
        print("Cartesia Repository initialized successfully.")
    except Exception as e:
        print(f"Initialization failed: {e}")
