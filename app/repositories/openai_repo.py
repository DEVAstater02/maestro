import os
from openai import OpenAI, AsyncOpenAI


class OpenAIRepository:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set in .env")
        self.client = OpenAI(api_key=self.api_key)
        self.async_client = AsyncOpenAI(api_key=self.api_key)

    def generate_speech(self, text: str, voice_id: str = "coral") -> bytes:
        """
        Generate speech from text using OpenAI TTS (batch).

        Args:
            text (str): The text to convert to speech.
            voice_id (str): The voice to use (default: coral).

        Returns:
            bytes: Audio data in mp3 format.
        """
        if not text:
            raise ValueError("Text cannot be empty.")

        try:
            response = self.client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice=voice_id,
                input=text,
                response_format="mp3",
            )
            return response.content
        except Exception as e:
            print(f"OpenAI TTS Error: {e}")
            raise

    async def stream_speech_from_text_stream(self, text_stream, voice_id: str = "coral"):
        """
        Generate speech from a streaming text source using OpenAI TTS streaming API.
        Buffers text until sentence boundaries, then streams audio chunks per sentence
        for low latency.

        Yields:
            tuple: (full_text, audio_chunk_bytes)
        """
        try:
            full_text = ""
            sentence_buffer = ""
            sentence_endings = (".", "!", "?", "\n")

            async for text_chunk in text_stream:
                full_text += text_chunk
                sentence_buffer += text_chunk

                if (
                    any(ending in sentence_buffer for ending in sentence_endings)
                    and len(sentence_buffer.strip()) > 20
                ):
                    current_sentence = sentence_buffer.strip()
                    sentence_buffer = ""

                    print(f"[OpenAI TTS] Streaming sentence: {current_sentence[:50]}...")
                    async with self.async_client.audio.speech.with_streaming_response.create(
                        model="gpt-4o-mini-tts",
                        voice=voice_id,
                        input=current_sentence,
                        response_format="pcm",
                    ) as response:
                        async for chunk in response.aiter_bytes(chunk_size=1024):
                            if chunk:
                                yield (full_text, chunk)

            # Handle any remaining text in the buffer
            if sentence_buffer.strip():
                print(f"[OpenAI TTS] Streaming final sentence: {sentence_buffer[:50]}...")
                async with self.async_client.audio.speech.with_streaming_response.create(
                    model="gpt-4o-mini-tts",
                    voice=voice_id,
                    input=sentence_buffer.strip(),
                    response_format="pcm",
                ) as response:
                    async for chunk in response.aiter_bytes(chunk_size=1024):
                        if chunk:
                            yield (full_text, chunk)

        except Exception as e:
            print(f"OpenAI TTS Error during streaming: {e}")
            raise
