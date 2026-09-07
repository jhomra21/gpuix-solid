type FakeAudioParam = { value: number }

type BiquadCoefficients = {
  b0: number
  b1: number
  b2: number
  a0: number
  a1: number
  a2: number
}

class FakeBiquadFilter {
  type: BiquadFilterType = "lowpass"
  readonly frequency: FakeAudioParam = { value: 350 }
  readonly Q: FakeAudioParam = { value: 1 }
  readonly gain: FakeAudioParam = { value: 0 }

  constructor(private readonly sampleRate: number) {}

  getFrequencyResponse(
    frequencyHz: Float32Array,
    magResponse: Float32Array,
    phaseResponse: Float32Array,
  ): void {
    const length = Math.min(frequencyHz.length, magResponse.length, phaseResponse.length)
    const coefficients = biquadCoefficients(
      this.type,
      this.frequency.value,
      this.Q.value,
      this.gain.value,
      this.sampleRate,
    )
    for (let index = 0; index < length; index++) {
      const frequency = Math.max(0, Math.min(this.sampleRate / 2, frequencyHz[index] ?? 0))
      const omega = 2 * Math.PI * frequency / this.sampleRate
      const response = evaluateBiquad(coefficients, omega)
      magResponse[index] = response.magnitude
      phaseResponse[index] = response.phase
    }
  }
}

class FakeOfflineAudioContext {
  readonly sampleRate: number

  constructor(_channels: number, _length: number, sampleRate: number) {
    this.sampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 44100
  }

  createBiquadFilter(): FakeBiquadFilter {
    return new FakeBiquadFilter(this.sampleRate)
  }
}

export function installEqVisualAudioCompatibility(): void {
  if (typeof globalThis.OfflineAudioContext !== "undefined") return
  Object.defineProperty(globalThis, "OfflineAudioContext", {
    configurable: true,
    writable: true,
    value: FakeOfflineAudioContext,
  })
}

installEqVisualAudioCompatibility()

function biquadCoefficients(
  type: BiquadFilterType,
  frequency: number,
  q: number,
  gainDb: number,
  sampleRate: number,
): BiquadCoefficients {
  const nyquist = sampleRate / 2
  const normalizedFrequency = Math.max(1, Math.min(nyquist - 1, frequency))
  const omega = 2 * Math.PI * normalizedFrequency / sampleRate
  const cos = Math.cos(omega)
  const sin = Math.sin(omega)
  const safeQ = Math.max(0.001, q)
  const alpha = sin / (2 * safeQ)
  const amplitude = 10 ** (gainDb / 40)

  switch (type) {
    case "lowpass":
      return {
        b0: (1 - cos) / 2,
        b1: 1 - cos,
        b2: (1 - cos) / 2,
        a0: 1 + alpha,
        a1: -2 * cos,
        a2: 1 - alpha,
      }
    case "highpass":
      return {
        b0: (1 + cos) / 2,
        b1: -(1 + cos),
        b2: (1 + cos) / 2,
        a0: 1 + alpha,
        a1: -2 * cos,
        a2: 1 - alpha,
      }
    case "bandpass":
      return {
        b0: alpha,
        b1: 0,
        b2: -alpha,
        a0: 1 + alpha,
        a1: -2 * cos,
        a2: 1 - alpha,
      }
    case "notch":
      return {
        b0: 1,
        b1: -2 * cos,
        b2: 1,
        a0: 1 + alpha,
        a1: -2 * cos,
        a2: 1 - alpha,
      }
    case "allpass":
      return {
        b0: 1 - alpha,
        b1: -2 * cos,
        b2: 1 + alpha,
        a0: 1 + alpha,
        a1: -2 * cos,
        a2: 1 - alpha,
      }
    case "peaking":
      return {
        b0: 1 + alpha * amplitude,
        b1: -2 * cos,
        b2: 1 - alpha * amplitude,
        a0: 1 + alpha / amplitude,
        a1: -2 * cos,
        a2: 1 - alpha / amplitude,
      }
    case "lowshelf": {
      const shelfAlpha = sin / 2 * Math.sqrt(Math.max(0, (amplitude + 1 / amplitude) * (1 / safeQ - 1) + 2))
      const twoRootAAlpha = 2 * Math.sqrt(amplitude) * shelfAlpha
      return {
        b0: amplitude * ((amplitude + 1) - (amplitude - 1) * cos + twoRootAAlpha),
        b1: 2 * amplitude * ((amplitude - 1) - (amplitude + 1) * cos),
        b2: amplitude * ((amplitude + 1) - (amplitude - 1) * cos - twoRootAAlpha),
        a0: (amplitude + 1) + (amplitude - 1) * cos + twoRootAAlpha,
        a1: -2 * ((amplitude - 1) + (amplitude + 1) * cos),
        a2: (amplitude + 1) + (amplitude - 1) * cos - twoRootAAlpha,
      }
    }
    case "highshelf": {
      const shelfAlpha = sin / 2 * Math.sqrt(Math.max(0, (amplitude + 1 / amplitude) * (1 / safeQ - 1) + 2))
      const twoRootAAlpha = 2 * Math.sqrt(amplitude) * shelfAlpha
      return {
        b0: amplitude * ((amplitude + 1) + (amplitude - 1) * cos + twoRootAAlpha),
        b1: -2 * amplitude * ((amplitude - 1) + (amplitude + 1) * cos),
        b2: amplitude * ((amplitude + 1) + (amplitude - 1) * cos - twoRootAAlpha),
        a0: (amplitude + 1) - (amplitude - 1) * cos + twoRootAAlpha,
        a1: 2 * ((amplitude - 1) - (amplitude + 1) * cos),
        a2: (amplitude + 1) - (amplitude - 1) * cos - twoRootAAlpha,
      }
    }
  }
}

function evaluateBiquad(coefficients: BiquadCoefficients, omega: number): { magnitude: number; phase: number } {
  const cos1 = Math.cos(omega)
  const sin1 = Math.sin(omega)
  const cos2 = Math.cos(2 * omega)
  const sin2 = Math.sin(2 * omega)

  const numeratorReal = coefficients.b0 + coefficients.b1 * cos1 + coefficients.b2 * cos2
  const numeratorImag = -(coefficients.b1 * sin1 + coefficients.b2 * sin2)
  const denominatorReal = coefficients.a0 + coefficients.a1 * cos1 + coefficients.a2 * cos2
  const denominatorImag = -(coefficients.a1 * sin1 + coefficients.a2 * sin2)

  const numeratorMagnitude = Math.hypot(numeratorReal, numeratorImag)
  const denominatorMagnitude = Math.max(1e-12, Math.hypot(denominatorReal, denominatorImag))
  return {
    magnitude: Math.max(1e-12, numeratorMagnitude / denominatorMagnitude),
    phase: Math.atan2(numeratorImag, numeratorReal) - Math.atan2(denominatorImag, denominatorReal),
  }
}
