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
        This method yields audio chunks as sentences are completed in the text stream,
        ensuring lower latency than waiting for the full text.
        """
        try:
            full_text = ""
            sentence_buffer = ""
            # Common sentence endings
            sentence_endings = ('.', '!', '?', '\n')
            
            async for text_chunk in text_stream:
                full_text += text_chunk
                sentence_buffer += text_chunk
                
                # If we have a complete sentence, send it to TTS
                if any(ending in sentence_buffer for ending in sentence_endings) and len(sentence_buffer.strip()) > 20:
                    current_sentence = sentence_buffer.strip()
                    sentence_buffer = ""
                    
                    print(f"[Cartesia] Streaming sentence: {current_sentence[:50]}...")
                    response = self.client.tts.sse(
                        model_id=model_id,
                        transcript=current_sentence,
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
                    
                    for chunk in response:
                        if hasattr(chunk, "audio") and chunk.audio is not None and len(chunk.audio) > 0:
                            yield (full_text, chunk.audio)

            # Handle any remaining text in the buffer
            if sentence_buffer.strip():
                print(f"[Cartesia] Streaming final sentence: {sentence_buffer[:50]}...")
                response = self.client.tts.sse(
                    model_id=model_id,
                    transcript=sentence_buffer.strip(),
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
                for chunk in response:
                    if hasattr(chunk, "audio") and chunk.audio is not None and len(chunk.audio) > 0:
                        yield (full_text, chunk.audio)
                    
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
