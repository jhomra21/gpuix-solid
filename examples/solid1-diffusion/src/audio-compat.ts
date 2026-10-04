class CompatAudioParam {
  value: number

  constructor(value: number) {
    this.value = value
  }

  setValueAtTime(value: number): this {
    this.value = value
    return this
  }

  linearRampToValueAtTime(value: number): this {
    this.value = value
    return this
  }

  exponentialRampToValueAtTime(value: number): this {
    this.value = value
    return this
  }

  cancelScheduledValues(): this {
    return this
  }

  cancelAndHoldAtTime(): this {
    return this
  }
}

class CompatAudioNode {
  readonly context: CompatAudioContext
  channelCount = 2
  channelCountMode = "max"
  channelInterpretation = "speakers"

  constructor(context: CompatAudioContext) {
    this.context = context
  }

  connect<T extends CompatAudioNode>(destination: T): T {
    return destination
  }

  disconnect(): void {}
}

class CompatGainNode extends CompatAudioNode {
  readonly gain = new CompatAudioParam(1)
}

class CompatAudioDestinationNode extends CompatAudioNode {
  readonly maxChannelCount = 2
}

class CompatAudioBufferSourceNode extends CompatAudioNode {
  buffer: AudioBuffer | null = null
  loop = false
  loopStart = 0
  loopEnd = 0
  readonly detune = new CompatAudioParam(0)
  readonly playbackRate = new CompatAudioParam(1)
  onended: (() => void) | null = null

  start(): void {}
  stop(): void {
    this.onended?.()
  }
}

class CompatMessagePort {
  onmessage: ((event: MessageEvent<Float32Array>) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null

  postMessage(): void {}
  start(): void {}
  close(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true
  }
}

class CompatAudioWorkletNode extends CompatAudioNode {
  readonly port = new CompatMessagePort()
  readonly parameters = new Map<string, CompatAudioParam>()

  constructor(context: CompatAudioContext, _name: string, _options?: AudioWorkletNodeOptions) {
    super(context)
  }
}

class CompatAudioContext {
  readonly sampleRate = 48_000
  readonly destination = new CompatAudioDestinationNode(this)
  readonly audioWorklet = {
    addModule: async (_url: string): Promise<void> => {},
  }

  state: "suspended" | "running" | "closed" = "suspended"
  onstatechange: (() => void) | null = null

  #offsetSeconds = 0
  #runningSinceMs = 0

  constructor(_options?: AudioContextOptions) {}

  get currentTime(): number {
    if (this.state !== "running") return this.#offsetSeconds
    return this.#offsetSeconds + (performance.now() - this.#runningSinceMs) / 1000
  }

  async resume(): Promise<void> {
    if (this.state === "closed" || this.state === "running") return
    this.#runningSinceMs = performance.now()
    this.state = "running"
    this.onstatechange?.()
  }

  async suspend(): Promise<void> {
    if (this.state !== "running") return
    this.#offsetSeconds = this.currentTime
    this.state = "suspended"
    this.onstatechange?.()
  }

  async close(): Promise<void> {
    if (this.state === "running") this.#offsetSeconds = this.currentTime
    this.state = "closed"
    this.onstatechange?.()
  }

  createGain(): CompatGainNode {
    return new CompatGainNode(this)
  }

  createBufferSource(): CompatAudioBufferSourceNode {
    return new CompatAudioBufferSourceNode(this)
  }
}

let installed = false

/**
 * Browser-shaped realtime audio clock for Diffusion's native host.
 *
 * GPUIX does not yet provide a full WebAudio backend. This compatibility layer
 * deliberately models silence, but unlike the old fixture stub it provides a
 * monotonic AudioContext clock and the graph nodes the real Diffusion engine
 * owns. The UI therefore follows Diffusion's playback lifecycle instead of a
 * permanently frozen currentTime=0 test double.
 */
export function installNativeAudioCompatibility(): void {
  if (installed) return
  installed = true

  const descriptors: PropertyDescriptorMap = {
    AudioContext: { configurable: true, writable: true, value: CompatAudioContext },
    BaseAudioContext: { configurable: true, writable: true, value: CompatAudioContext },
    AudioNode: { configurable: true, writable: true, value: CompatAudioNode },
    GainNode: { configurable: true, writable: true, value: CompatGainNode },
    AudioDestinationNode: { configurable: true, writable: true, value: CompatAudioDestinationNode },
    AudioBufferSourceNode: { configurable: true, writable: true, value: CompatAudioBufferSourceNode },
    AudioWorkletNode: { configurable: true, writable: true, value: CompatAudioWorkletNode },
    AudioParam: { configurable: true, writable: true, value: CompatAudioParam },
  }

  Object.defineProperties(globalThis, descriptors)
  Object.defineProperties(globalThis.window, descriptors)
}
