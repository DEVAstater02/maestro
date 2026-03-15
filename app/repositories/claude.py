import os
from anthropic import Anthropic,AsyncAnthropic, APIError

class ClaudeRepository:
    def __init__(self):
        self.api_key = os.getenv("CLAUDE_CODE")
        if not self.api_key:
            raise ValueError("CLAUDE_CODE environment variable not set.")
        self.client = AsyncAnthropic(api_key=self.api_key)
        self.streaming_client = Anthropic(api_key=self.api_key)

    async def generate_response(
        self, 
        prompt: str, 
        system_prompt: str = None, 
        model: str = "claude-haiku-4-5", 
        max_tokens: int = 1536
    ) -> str:
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
            params = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            if system_prompt:
                params["system"] = [
                    {
                        "type": "text",
                        "text": system_prompt,
                        "cache_control": {"type": "ephemeral"}
                    }
                ]
                params["extra_headers"] = {"anthropic-beta": "prompt-caching-2024-07-31"}
            
            message = await self.client.messages.create(**params)
            
            # Log caching stats if available
            usage = getattr(message, "usage", None)
            if usage:
                cache_read = getattr(usage, "cache_read_input_tokens", 0)
                cache_created = getattr(usage, "cache_creation_input_tokens", 0)
                if cache_read > 0 or cache_created > 0:
                    print(f"[Claude Caching] Read: {cache_read}, Created: {cache_created}")

            return message.content[0].text
        except APIError as e:
            print(f"Anthropic API Error: {e}")
            raise
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            raise

    async def stream_response(
        self, 
        prompt: str, 
        system_prompt: str = None, 
        model: str = "claude-haiku-4-5", 
        max_tokens: int = 1536
    ):
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
            params = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            if system_prompt:
                params["system"] = [
                    {
                        "type": "text",
                        "text": system_prompt,
                        "cache_control": {"type": "ephemeral"}
                    }
                ]
                params["extra_headers"] = {"anthropic-beta": "prompt-caching-2024-07-31"}
            
            # Use the streaming client/method
            async with self.client.messages.stream(**params) as stream:
                async for text in stream.text_stream:
                    yield text
                
                # Log caching stats after stream finishes
                try:
                    final_msg = await stream.get_final_message()
                    usage = getattr(final_msg, "usage", None)
                    if usage:
                        cache_read = getattr(usage, "cache_read_input_tokens", 0)
                        cache_created = getattr(usage, "cache_creation_input_tokens", 0)
                        if cache_read > 0 or cache_created > 0:
                            print(f"[Claude Caching] Read: {cache_read}, Created: {cache_created}")
                except:
                    pass
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
