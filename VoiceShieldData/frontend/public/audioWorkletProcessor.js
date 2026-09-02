/**
 * AudioWorklet Processor
 * Processes audio in real-time and emits 1.5-second chunks with 50% overlap.
 * Register with: audioContext.audioWorklet.addModule('/audioWorkletProcessor.js')
 */

class AudioChunkProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private bufferIndex: number = 0;
  private windowSize: number;
  private hopSize: number;
  private readonly sampleRate = 16000;

  constructor(options: any) {
    super();
    const opts = options.processorOptions || {};
    this.windowSize = opts.windowSize || 24000; // 1.5s @ 16kHz
    this.hopSize = opts.hopSize || 12000; // 750ms hop (50% overlap)
    this.buffer = new Float32Array(this.windowSize);
    this.bufferIndex = 0;
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const channel = input[0]; // Mono, use first channel

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.bufferIndex++] = channel[i];

      // When buffer is full, emit chunk and slide window
      if (this.bufferIndex >= this.windowSize) {
        // Emit full window
        this.port.postMessage(
          {
            type: 'audio_chunk',
            pcmData: Array.from(this.buffer.slice(0, this.windowSize)),
            durationMs: (this.windowSize / this.sampleRate) * 1000,
            sampleRate: this.sampleRate,
            timestamp: this.currentTime * 1000,
          },
          []
        );

        // Slide window: keep second half, refill first half
        this.buffer.copyWithin(0, this.hopSize, this.windowSize);
        this.bufferIndex = this.windowSize - this.hopSize;
      }
    }

    return true;
  }
}

registerProcessor('audio-chunk-processor', AudioChunkProcessor);
