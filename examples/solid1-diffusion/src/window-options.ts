import type { RenderOptions } from "@jhomra21/gpuix-solid1"

export const diffusionWindowOptions = {
  title: "Diffusion Studio — Solid 1 + GPUIX",
  appName: "Diffusion Studio",
  width: 1280,
  height: 800,
  minWidth: 960,
  minHeight: 640,
  titlebarTransparent: true,
  windowBackground: "blurred",
  trafficLightX: 16,
  trafficLightY: 17,
  focus: process.env.GPUIX_BACKGROUND !== "1",
} satisfies RenderOptions
