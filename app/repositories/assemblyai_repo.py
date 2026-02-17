import os
import assemblyai as aai

class AssemblyAI:
    def __init__(self):
        self.api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not self.api_key:
            raise ValueError("ASSEMBLYAI_API_KEY environment variable not set.")
        aai.settings.api_key = self.api_key

    async def transcribe_audio_file(self, audio_file_path: str) -> str:
        if not audio_file_path:
            raise ValueError("Audio file path cannot be empty.")
        if not os.path.exists(audio_file_path):
            raise ValueError(f"Audio file not found at: {audio_file_path}")

        try:
            # Create a transcriber client
            transcriber = aai.Transcriber()

            # Configure transcription (optional, but good for demonstration)
            config = aai.TranscriptionConfig(
                speaker_labels=False, # Set to True if you need speaker diarization
                auto_chapters=False,  # Set to True for automatic chapter generation
                # Add other configurations as needed
            )

            # Transcribe the audio file asynchronously
            # The SDK handles the upload and polling for the result
            transcript = transcriber.transcribe(
                audio_file_path,
                config=config
            )

            if transcript.status == aai.TranscriptStatus.error:
                raise ValueError(f"AssemblyAI transcription failed: {transcript.error}")
            elif transcript.text is None:
                raise ValueError("AssemblyAI transcription returned no text.")

            return transcript.text

        except Exception as e:
            print(f"AssemblyAI Transcription Error: {e}")
            raise ValueError(f"Transcription failed due to AssemblyAI error: {e}")
        except Exception as e2:
            print(f"An unexpected error occurred during AssemblyAI transcription: {e}")
            raise

# # Example of how to use (for testing purposes)
# async def main():
#     # IMPORTANT: Replace with a valid path to an audio file for testing
#     # For example, you can download a short audio file or record one.
#     # Ensure ASSEMBLYAI_API_KEY is set in your .env file or environment
#     # For example: ASSEMBLYAI_API_KEY="YOUR_ASSEMBLYAI_API_KEY"
#     test_audio_file = "path/to/your/audio.mp3" # <--- CHANGE THIS

#     if not os.path.exists(test_audio_file):
#         print(f"Warning: Test audio file not found at '{test_audio_file}'. Skipping test.")
#         print("Please update 'test_audio_file' in assemblyai_stt.py to a valid path to run the test.")
#         return

#     try:
#         stt_repo = AssemblyAI()
#         print(f"Transcribing audio from: {test_audio_file}")
#         transcribed_text = await stt_repo.transcribe_audio_file(test_audio_file)
#         print(f"Transcribed Text: {transcribed_text}")
#     except ValueError as e:
#         print(f"Error during transcription: {e}")
#     except Exception as e:
#         print(f"An unexpected error occurred: {e}")

# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(main())
