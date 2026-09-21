import { createRenderEffect, For } from "solid-js"
import type { ImgInstance, PublicInstance } from "gpuix-solid"

function isImgInstance(instance: PublicInstance): instance is ImgInstance {
  return instance.type === "img"
    && "setImagePixels" in instance
    && typeof instance.setImagePixels === "function"
}

const WIDTH = 720
const HEIGHT = 96
const PIXEL_RATIO = 2

function rgbaWaveform(phase: number): Uint8Array {
  const width = WIDTH * PIXEL_RATIO
  const height = HEIGHT * PIXEL_RATIO
  const bytes = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      bytes[offset] = 18
      bytes[offset + 1] = 22
      bytes[offset + 2] = 38
      bytes[offset + 3] = 255
    }
  }

  const mid = (height - 1) / 2
  for (let x = 0; x < width; x += 1) {
    const sample = Math.sin((x / width) * Math.PI * 6 + phase) * 0.72
    const y = Math.round(mid - sample * mid)
    const offset = (y * width + x) * 4
    bytes[offset] = 92
    bytes[offset + 1] = 169
    bytes[offset + 2] = 255
    bytes[offset + 3] = 255
  }

  return bytes
}

function Waveform(props: { phase: number }) {
  let image: ImgInstance | undefined

  createRenderEffect(
    () => props.phase,
    (phase) => {
      const pixels = rgbaWaveform(phase)
      queueMicrotask(() => {
        image?.setImagePixels(WIDTH * PIXEL_RATIO, HEIGHT * PIXEL_RATIO, pixels)
      })
    },
  )

  return (
    <img
      ref={(instance) => {
        if (!isImgInstance(instance)) throw new TypeError("Expected an img host instance")
        image = instance
      }}
      testId="waveform"
      objectFit="fill"
      style={{ width: WIDTH, height: HEIGHT, borderRadius: 10 }}
    />
  )
}

const CLIPS = ["Intro", "Verse", "Chorus", "Bridge", "Outro"] as const

export function WaveformApp(props: { phase?: number } = {}) {
  let lastClip: PublicInstance | undefined

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
        width: "100%",
        height: "100%",
        backgroundColor: "#11111b",
      }}
    >
      <text style={{ color: "#cdd6f4", fontSize: 18, fontWeight: 600 }}>
        Waveform
      </text>

      <Waveform phase={props.phase ?? 0} />

      <div
        testId="clip-list"
        style={{
          height: 120,
          overflow: "scroll",
          borderRadius: 10,
          backgroundColor: "#1e1e2e",
        }}
      >
        <For each={CLIPS}>
          {(name, index) => (
            <div
              ref={index() === CLIPS.length - 1
                ? (instance) => {
                    lastClip = instance
                  }
                : undefined}
              testId={`clip-${name.toLowerCase()}`}
              style={{
                height: 48,
                padding: 14,
                color: "#cdd6f4",
                backgroundColor: index() % 2 === 0 ? "#1e1e2e" : "#181825",
              }}
            >
              {name}
            </div>
          )}
        </For>
      </div>

      <div
        testId="jump-outro"
        style={{
          padding: 10,
          borderRadius: 8,
          backgroundColor: "#89b4fa",
          color: "#1e1e2e",
          width: 140,
        }}
        onClick={() => lastClip?.scrollIntoView?.()}
      >
        Jump to outro
      </div>
    </div>
  )
}
