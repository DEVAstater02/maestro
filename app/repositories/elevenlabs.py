from elevenlabs import ElevenLabs as ElevenLabsClient
import os
import io

class ElevenLabsRepository:
    def __init__(self):
        self.api_key = os.getenv("ELEVEN_LABS")
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY environment variable not set.")
        self.client = ElevenLabsClient(api_key=self.api_key)

    def generate_speech(self, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM"):
        """
        Generate speech from text using ElevenLabs API.
        
        Args:
            text (str): The text to convert to speech.
            voice_id (str): The voice ID to use (default is a sample voice).
            
        Returns:
            bytes: Audio data.
        """
        if not text:
            raise ValueError("Text cannot be empty.")
        
        try:
            audio = self.client.text_to_speech.convert(
            voice_id=voice_id,
                text=text,
                model_id="eleven_flash_v2_5"
            )
            
            return audio
                
        except Exception as e:
            print(f"ElevenLabs API Error: {e}")
            raise
    
    def transcribe_audio(self, audio_file_path: str):
        try:
            # 1. Open the file in 'rb' (read binary) mode
            with open(audio_file_path, "rb") as audio_file:
                # 2. Read the actual content and pass it to BytesIO
                audio_bytes_io = io.BytesIO(audio_file.read())
            
            response = self.client.speech_to_text.convert(
                file=audio_bytes_io,
                model_id="scribe_v2"
            )
            
            # The response is a SpeechToTextResponse object with a 'text' attribute.
            return response.text
                
        except Exception as e:
            print(f"ElevenLabs API Error during transcription: {e}")
            raise
    
    async def stream_speech_from_text_stream(self, text_stream, voice_id: str = "21m00Tcm4TlvDq8ikWAM"):
        """
        Generate speech from a streaming text source using ElevenLabs API.
        This method consumes text chunks from an async generator (like Claude's stream_response),
        collects the full text, and then streams the audio as one continuous piece.
        
        Args:
            text_stream: An async generator that yields text chunks.
            voice_id (str): The voice ID to use (default is a sample voice).
            
        Yields:
            tuple: (full_text, audio_chunk) - The complete text and audio data chunks.
        """
        try:
            # Collect all text chunks first to ensure smooth, continuous audio
            full_text = ""
            
            async for text_chunk in text_stream:
                full_text += text_chunk
            
            print(f"Collected full text ({len(full_text)} chars): {full_text[:100]}...")
            
            # Now generate speech for the complete text as one continuous stream
            if full_text.strip():
                print("Calling ElevenLabs TTS stream API...")
                audio_stream = self.client.text_to_speech.stream(
                    voice_id=voice_id,
                    text=full_text.strip(),
                    model_id="eleven_flash_v2_5"
                )
                
                chunk_num = 0
                # Yield audio chunks with the full text
                for audio_chunk in audio_stream:
                    if isinstance(audio_chunk, bytes):
                        chunk_num += 1
                        print(f"ElevenLabs yielding chunk {chunk_num}, size: {len(audio_chunk)}")
                        yield (full_text, audio_chunk)
                
                print(f"ElevenLabs finished streaming {chunk_num} total chunks")
                    
        except Exception as e:
            print(f"ElevenLabs API Error during streaming TTS: {e}")
            raise

# Example of how to use (for testing purposes)
async def main():
    # Ensure ELEVENLABS_API_KEY is set in your .env file or environment
    # For example: ELEVENLABS_API_KEY="YOUR_ELEVENLABS_API_KEY"
    
    elevenlabs_repo = ElevenLabsRepository()
    test_text = "Hello, this is a test of the Eleven Labs text-to-speech API streaming functionality."
    output_filename = "output_speech.mp3"

    print(f"Generating speech for: '{test_text}'")
    print(f"Saving to: {output_filename}")

    try:
        async with open(output_filename, "wb") as f:
            async for chunk in elevenlabs_repo.generate_speech(test_text):
                if chunk:
                    f.write(chunk)
        print("Speech generation complete and saved to file.")
    except ValueError as e:
        print(f"Error during speech generation: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    import asyncio
    # Ensure ELEVENLABS_API_KEY is set before running
    if not os.getenv("ELEVENLABS_API_KEY"):
        print("Error: ELEVENLABS_API_KEY environment variable not set.")
    else:
        asyncio.run(main())
