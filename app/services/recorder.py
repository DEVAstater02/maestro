import sounddevice as sd
from scipy.io.wavfile import write
import queue
import sys

# Configuration
FS = 44100  # Sample rate (Hz)
q = queue.Queue()

class VoiceRecorder:
    def __init__(self):
        pass

    @staticmethod
    def callback(indata, frames, time, status):
        """This function is called for every audio block recorded."""
        if status:
            print(status, file=sys.stderr)
        q.put(indata.copy())
    
    def RecordVoice(self, filename:str):
        try:
            print("--- Recording Started ---")
            print("Press 'Enter' or 'Ctrl+C' to stop recording...")

            # Open the microphone stream
            with sd.InputStream(samplerate=FS, channels=1, callback=self.callback):
                # The program waits here while the 'callback' fills the queue
                input() 

            print("--- Recording Stopped ---")
            
            # Consolidate all audio chunks from the queue
            recording = []
            while not q.empty():
                recording.append(q.get())
            
            import numpy as np
            full_recording = np.concatenate(recording, axis=0)

            # Save as WAV file
            write(filename, FS, full_recording)
            print(f"File saved as: {filename}")

        except KeyboardInterrupt:
            print("\nRecording aborted by user.")
        except Exception as e:
            print(f"An error occurred: {e}")

async def main():
    recorder = VoiceRecorder()
    recorder.RecordVoice()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())