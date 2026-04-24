import os
from openai import OpenAI, AsyncOpenAI
from pydantic import BaseModel
from typing import Type, Optional

VOICE_INSTRUCTIONS = "Speak clearly and project your voice with strong volume. Use a confident, engaging tone."


class OpenAIRepository:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set in .env")
        self.client = OpenAI(api_key=self.api_key)
        self.async_client = AsyncOpenAI(api_key=self.api_key)

    async def generate_response(
        self, 
        prompt: str, 
        system_prompt: str = None, 
        model: str = "gpt-4o-mini", 
        max_tokens: int = 1536
    ) -> str:
        """
        Generates a response from the OpenAI LLM API for a given prompt.
        """
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await self.async_client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI LLM Generation Error: {e}")
            raise

    async def generate_structured_response(
        self,
        prompt: str,
        response_schema: Type[BaseModel],
        model: str = "gpt-4o-mini",
        system_prompt: str = None,
    ) -> Optional[BaseModel]:
        """
        Generates a structured response from OpenAI that conforms to a Pydantic schema.
        Uses OpenAI's 'Structured Outputs' feature.
        """
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            schema_dict = response_schema.model_json_schema()
            response = await self.async_client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={
                    "type": "json_schema", 
                    "json_schema": {
                        "name": response_schema.__name__, 
                        "strict": False, 
                        "schema": schema_dict
                    }
                },
            )
            content = response.choices[0].message.content
            if content:
                from pydantic import TypeAdapter
                return response_schema.model_validate_json(content)
            return None
        except Exception as e:
            print(f"OpenAI Structured Output Error: {e}")
            return None

    async def stream_response(
        self, 
        prompt: str, 
        system_prompt: str = None, 
        model: str = "gpt-4o-mini", 
        max_tokens: int = 1536
    ):
        """
        Streams a response from the OpenAI LLM API for a given prompt.
        """
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            stream = await self.async_client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            print(f"OpenAI LLM Streaming Error: {e}")
            raise

    def generate_speech(self, text: str, voice_id: str = "marin") -> bytes:
        """
        Generate speech from text using OpenAI TTS (batch).

        Args:
            text (str): The text to convert to speech.
            voice_id (str): The voice to use (default: marin).

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
                instructions=VOICE_INSTRUCTIONS,
                response_format="mp3",
            )
            return response.content
        except Exception as e:
            print(f"OpenAI TTS Error: {e}")
            raise

    async def stream_speech_from_text_stream(self, text_stream, voice_id: str = "marin"):
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
                    response = await self.async_client.audio.speech.create(
                        model="gpt-4o-mini-tts",
                        voice=voice_id,
                        input=current_sentence,
                        instructions=VOICE_INSTRUCTIONS,
                        response_format="mp3",
                    )
                    if response.content:
                        yield (full_text, response.content)

            # Handle any remaining text in the buffer
            if sentence_buffer.strip():
                print(f"[OpenAI TTS] Streaming final sentence: {sentence_buffer[:50]}...")
                response = await self.async_client.audio.speech.create(
                    model="gpt-4o-mini-tts",
                    voice=voice_id,
                    input=sentence_buffer.strip(),
                    instructions=VOICE_INSTRUCTIONS,
                    response_format="mp3",
                )
                if response.content:
                    yield (full_text, response.content)

        except Exception as e:
            print(f"OpenAI TTS Error during streaming: {e}")
            raise
