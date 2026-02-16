import os
from anthropic import Anthropic,AsyncAnthropic, APIError

class ClaudeRepository:
    def __init__(self):
        self.api_key = os.getenv("CLAUDE_CODE")
        if not self.api_key:
            raise ValueError("CLAUDE_CODE environment variable not set.")
        self.client = AsyncAnthropic(api_key=self.api_key)
        self.streaming_client = Anthropic(api_key=self.api_key)

    async def generate_response(self, prompt: str, model: str = "claude-haiku-4-5-20251001") -> str:
        """
        Generates a response from the Claude LLM API for a given prompt.

        Args:
            prompt (str): The input prompt for the LLM.
            model (str): The Claude model to use (e.g., "claude-3-opus-20240229", "claude-3-sonnet-20240229").

        Returns:
            str: The generated text response from the LLM.

        Raises:
            APIError: If there's an issue with the Anthropic API call.
            ValueError: If the prompt is empty.
        """
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        try:
            message = await self.client.messages.create(
                model=model,
                max_tokens=1024,
                # TODO : use system variable with prompt caching for system_prompt
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return message.content[0].text
        except APIError as e:
            print(f"Anthropic API Error: {e}")
            raise
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            raise

    async def stream_response(self, prompt: str, model: str = "claude-haiku-4-5-20251001"):
        """
        Streams the response from the Claude LLM API for a given prompt.

        Args:
            prompt (str): The input prompt for the LLM.
            model (str): The Claude model to use.

        Yields:
            str: Chunks of the generated text response from the LLM.

        Raises:
            APIError: If there's an issue with the Anthropic API call.
            ValueError: If the prompt is empty.
        """
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        try:
            async with self.client.messages.stream(
                model=model,
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except APIError as e:
            print(f"Anthropic API Error: {e}")
            raise
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            raise

# Example of how to use (for testing purposes, typically called from a service layer)
async def main():
    # Ensure ANTHROPIC_API_KEY is set in your .env file or environment
    # For example: ANTHROPIC_API_KEY="sk-ant-..."
    claude_repo = ClaudeRepository()
    test_prompt = "Hello Claude, tell me a short story about a robot who learns to paint."
    
    print("--- Non-streaming response ---")
    try:
        response = await claude_repo.generate_response(test_prompt)
        print(f"Claude's response: {response}")
    except Exception as e:
        print(f"Failed to get response: {e}")

    print("\n--- Streaming response ---")
    try:
        print("Claude's streaming response: ", end="")
        async for chunk in claude_repo.stream_response(test_prompt):
            print(chunk, end="", flush=True)
        print()
    except Exception as e:
        print(f"Failed to get streaming response: {e}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
