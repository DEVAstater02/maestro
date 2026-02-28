import os
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import Type, Optional


class GeminiRepository:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set.")
        self.client = genai.Client(api_key=self.api_key)

    async def generate_response(self, prompt: str, model: str = "gemini-flash-latest") -> str:
        """
        Generates a response from the Gemini LLM API for a given prompt.
        """
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        try:
            response = await self.client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=1024,
                ),
            )
            return response.text
        except Exception as e:
            print(f"Gemini API Error: {e}")
            raise

    async def generate_structured_response(
        self,
        prompt: str,
        response_schema: Type[BaseModel],
        model: str = "gemini-flash-latest",
    ) -> Optional[BaseModel]:
        """
        Generates a structured response from Gemini that conforms to a Pydantic schema.
        Uses response_mime_type='application/json' + response_json_schema to guarantee
        the output is valid JSON matching the schema.

        Args:
            prompt: The input prompt.
            response_schema: A Pydantic model class defining the expected output structure.
            model: The Gemini model to use.

        Returns:
            An instance of response_schema populated with the model's output,
            or None if generation fails.
        """
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        try:
            response = await self.client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=8192,
                    response_mime_type="application/json",
                    response_json_schema=response_schema.model_json_schema(),
                ),
            )
            # Parse and validate with Pydantic
            return response_schema.model_validate_json(response.text)
        except Exception as e:
            print(f"Gemini Structured Output Error: {e}")
            return None

    async def stream_response(self, prompt: str, model: str = "gemini-flash-latest"):
        """
        Streams the response from the Gemini LLM API for a given prompt.

        Args:
            prompt (str): The input prompt for the LLM.
            model (str): The Gemini model to use.

        Yields:
            str: Chunks of the generated text response from the LLM.

        Raises:
            ValueError: If the prompt is empty.
        """
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        try:
            async for chunk in await self.client.aio.models.generate_content_stream(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=1024,
                ),
            ):
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Gemini API Error: {e}")
            raise


# Example of how to use (for testing purposes, typically called from a service layer)
async def main():
    # Ensure GEMINI_API_KEY is set in your .env file or environment
    # For example: GEMINI_API_KEY="your_gemini_api_key_here"
    gemini_repo = GeminiRepository()
    test_prompt = "Hello Gemini, tell me a short story about a robot who learns to paint."

    print("--- Non-streaming response ---")
    try:
        response = await gemini_repo.generate_response(test_prompt)
        print(f"Gemini's response: {response}")
    except Exception as e:
        print(f"Failed to get response: {e}")

    print("\n--- Streaming response ---")
    try:
        print("Gemini's streaming response: ", end="")
        async for chunk in gemini_repo.stream_response(test_prompt):
            print(chunk, end="", flush=True)
        print()
    except Exception as e:
        print(f"Failed to get streaming response: {e}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
