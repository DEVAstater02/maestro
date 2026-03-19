export type AudioChunk = ArrayBuffer | Blob;

export interface PlaybackAudioFormat {
  provider?: string;
  container?: string | null;
  encoding?: string | null;
  sample_rate?: number | null;
  channels?: number | null;
}

const DEFAULT_RAW_AUDIO_FORMAT: PlaybackAudioFormat = {
  container: "raw",
  encoding: "pcm_s16le",
  sample_rate: 24000,
  channels: 1,
};

const chunkToBytes = async (chunk: AudioChunk): Promise<Uint8Array> => {
  if (chunk instanceof ArrayBuffer) {
    return new Uint8Array(chunk);
  }

  return new Uint8Array(await chunk.arrayBuffer());
};

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
};

const toArrayBuffer = (bytes: Uint8Array<ArrayBufferLike>): ArrayBuffer =>
  new Uint8Array(bytes).buffer as ArrayBuffer;

const decodeRawAudio = ({
  audioContext,
  bytes,
  audioFormat,
}: {
  audioContext: AudioContext;
  bytes: Uint8Array<ArrayBufferLike>;
  audioFormat: PlaybackAudioFormat;
}): { audioBuffer: AudioBuffer | null; pendingRawBytes: Uint8Array<ArrayBufferLike> } => {
  const channels = Math.max(1, audioFormat.channels ?? 1);
  const sampleRate = audioFormat.sample_rate ?? DEFAULT_RAW_AUDIO_FORMAT.sample_rate ?? 24000;
  const encoding = audioFormat.encoding ?? DEFAULT_RAW_AUDIO_FORMAT.encoding;
  const bytesPerSample =
    encoding === "pcm_f32le" ? Float32Array.BYTES_PER_ELEMENT
    : encoding === "pcm_s16le" ? Int16Array.BYTES_PER_ELEMENT
    : 0;

  if (bytesPerSample === 0) {
    throw new Error(`Unsupported raw audio encoding: ${encoding}`);
  }

  const frameBytes = bytesPerSample * channels;
  const alignedLength = bytes.byteLength - (bytes.byteLength % frameBytes);
  if (alignedLength === 0) {
    return { audioBuffer: null, pendingRawBytes: bytes };
  }

  const completeBytes = bytes.slice(0, alignedLength);
  const trailingBytes = bytes.slice(alignedLength);

  if (encoding === "pcm_f32le") {
    const floatSamples = new Float32Array(completeBytes.buffer.slice(0));
    const frameCount = Math.floor(floatSamples.length / channels);
    if (frameCount === 0) {
      return { audioBuffer: null, pendingRawBytes: trailingBytes };
    }

    const audioBuffer = audioContext.createBuffer(channels, frameCount, sampleRate);
    for (let channel = 0; channel < channels; channel += 1) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let frame = 0; frame < frameCount; frame += 1) {
        channelData[frame] = floatSamples[(frame * channels) + channel];
      }
    }

    return { audioBuffer, pendingRawBytes: trailingBytes };
  }

  const int16Samples = new Int16Array(completeBytes.buffer.slice(0));
  const frameCount = Math.floor(int16Samples.length / channels);
  if (frameCount === 0) {
    return { audioBuffer: null, pendingRawBytes: trailingBytes };
  }

  const audioBuffer = audioContext.createBuffer(channels, frameCount, sampleRate);
  for (let channel = 0; channel < channels; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let frame = 0; frame < frameCount; frame += 1) {
      channelData[frame] = int16Samples[(frame * channels) + channel] / 32768;
    }
  }

  return { audioBuffer, pendingRawBytes: trailingBytes };
};

export const decodeAudioForPlayback = async ({
  audioContext,
  chunks,
  audioFormat,
  pendingRawBytes = new Uint8Array(0) as Uint8Array<ArrayBufferLike>,
}: {
  audioContext: AudioContext;
  chunks: AudioChunk[];
  audioFormat?: PlaybackAudioFormat | null;
  pendingRawBytes?: Uint8Array<ArrayBufferLike>;
}): Promise<{ audioBuffer: AudioBuffer | null; pendingRawBytes: Uint8Array<ArrayBufferLike> }> => {
  const chunkBytes = await Promise.all(chunks.map(chunkToBytes));
  const payloadBytes = concatBytes(chunkBytes);

  if (payloadBytes.byteLength === 0) {
    return { audioBuffer: null, pendingRawBytes };
  }

  if (audioFormat?.container !== "raw") {
    try {
      const standardAudio = await audioContext.decodeAudioData(toArrayBuffer(payloadBytes));
      return { audioBuffer: standardAudio, pendingRawBytes: new Uint8Array(0) };
    } catch (decodeError) {
      console.warn("Standard audio decoding failed, attempting raw PCM fallback...", decodeError);
    }
  }

  const combinedBytes =
    pendingRawBytes.byteLength > 0 ? concatBytes([pendingRawBytes, payloadBytes]) : payloadBytes;

  return decodeRawAudio({
    audioContext,
    bytes: combinedBytes,
    audioFormat: audioFormat ?? DEFAULT_RAW_AUDIO_FORMAT,
  });
};
