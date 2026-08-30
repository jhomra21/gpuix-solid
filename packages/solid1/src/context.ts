import { createContext, useContext } from "solid-js"
import type { NativeRenderer } from "./host/types.js"

export interface ViewportSize {
  width: number
  height: number
}

export interface GpuixContextValue {
  renderer: NativeRenderer
  getViewportSize: () => ViewportSize
}

export const GpuixContext = createContext<GpuixContextValue>()

export function useGpuix(): GpuixContextValue | undefined {
  return useContext(GpuixContext)
}

export function useGpuixContextRequired(): GpuixContextValue {
  const context = useGpuix()
  if (!context) throw new Error("useGpuixContextRequired must be called inside a GPUix Solid root")
  return context
}

export function useGpuixRequired(): NativeRenderer {
  return useGpuixContextRequired().renderer
}
