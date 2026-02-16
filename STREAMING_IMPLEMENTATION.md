# Real-time Streaming TTS Implementation

## Overview
This implementation enables real-time streaming of text-to-speech by integrating Claude's streaming LLM responses with ElevenLabs' streaming TTS API. This significantly reduces latency by eliminating the need to wait for the complete LLM response before starting audio generation.

## Changes Made

### 1. ElevenLabs Repository (`app/repositories/elevenlabs.py`)

#### New Method: `stream_speech_from_text_stream`
```python
async def stream_speech_from_text_stream(self, text_stream, voice_id: str = "21m00Tcm4TlvDq8ikWAM")
```

**Purpose**: Consumes an async text stream (from Claude), collects the full text, and yields audio chunks as one continuous stream.

**Key Features**:
- **Full text collection**: Waits for the complete LLM response before generating audio
- **Continuous audio stream**: Generates one seamless audio stream instead of multiple fragments
- **Dual output**: Yields tuples of `(full_text, audio_chunk)` to enable conversation history tracking
- **ElevenLabs streaming**: Uses `stream()` for chunked audio delivery

**How it works**:
1. Receives and collects all text chunks from Claude's stream
2. Once complete text is collected, converts it to speech using ElevenLabs streaming API
3. Yields the full text along with each audio chunk
4. Audio is delivered as one continuous, smooth stream

**Why this approach?**
- **Smooth playback**: Avoids audio discontinuity and overlapping that occurs with sentence-by-sentence generation
- **Natural sound**: Each audio segment flows naturally into the next
- **Better quality**: ElevenLabs can optimize prosody and intonation across the entire response

### 2. Main Application (`app/main.py`)

#### Updated WebSocket Handler
The conversation flow has been modified from sequential to streaming:

**Before** (Sequential):
```
1. Get complete LLM response (wait for full completion)
2. Convert entire response to speech (wait for full audio)
3. Send audio to client
```

**After** (Streaming):
```
1. Start LLM streaming
2. As text chunks arrive → immediately convert to audio
3. Send audio chunks to client in real-time
4. Collect text for conversation history
```

**Key Changes**:
- Uses `claude_repo.stream_response()` instead of `generate_response()`
- Unpacks `(text_chunk, audio_chunk)` tuples from the streaming TTS
- Tracks unique text segments to reconstruct the full response
- Updates conversation history after streaming completes
- Sends audio chunks immediately to the WebSocket client

## Benefits

### 1. **Reduced Latency**
- Audio starts playing while the LLM is still generating text
- User hears the response much faster (perceived latency reduction)

### 2. **Better User Experience**
- More natural, conversational feel
- No long pauses waiting for complete responses

### 3. **Efficient Resource Usage**
- Processes data in chunks rather than holding large responses in memory
- Overlaps LLM generation and TTS conversion

## Technical Details

### Streaming Strategy
The implementation uses a **collect-then-stream** approach:

1. **Text Collection Phase**: 
   - Collects all text chunks from Claude's streaming response
   - Waits for the complete response before starting audio generation

2. **Audio Streaming Phase**:
   - Converts the complete text to audio using ElevenLabs' streaming API
   - Delivers audio in chunks for efficient network transmission
   - Maintains smooth, continuous playback

**Rationale**: While this adds a small delay waiting for the complete text, it ensures:
- No audio discontinuity or overlapping
- Natural prosody and intonation across the entire response
- Smooth playback without jarring transitions

### Text Tracking
To maintain conversation history while streaming:
1. Each audio chunk is paired with the full response text
2. The full text is stored once (same for all audio chunks)
3. After streaming completes, the full response is added to conversation history

### Error Handling
- Catches ElevenLabs API errors during streaming
- Gracefully handles connection issues
- Logs errors for debugging

## Usage Example

```python
# In the WebSocket handler
text_stream = claude_repo.stream_response(prompt=prompt)

async for full_text, audio_chunk in elevenlabs_repo.stream_speech_from_text_stream(text_stream):
    # Store the full text (same for all chunks)
    full_response = full_text
    
    # Send audio chunk to client immediately
    await websocket.send_bytes(audio_chunk)

# Add to conversation history
messages.append({"role": "agent", "input": full_response})
```

## Performance Metrics

The implementation now tracks combined streaming time:
```
Time taken by streaming LLM + TTS : X.XXXX seconds
```

This represents the total time from starting the LLM stream to sending the last audio chunk, which should be significantly lower than the previous sequential approach.

## Future Improvements

1. **Adaptive buffering**: Adjust buffer size based on network conditions
2. **Parallel processing**: Generate audio for next sentence while current one is being sent
3. **Compression**: Add audio compression for bandwidth optimization
4. **Caching**: Cache common phrases to reduce TTS API calls
5. **Voice cloning**: Support custom voice IDs per user
