import { createContext, useContext } from "solid-js"
import type { NativeRenderer } from "./host/types.js"

export interface GpuixContextValue {
  renderer: NativeRenderer
  flushSync<T>(fn: () => T): T
}

export const GpuixContext = createContext<GpuixContextValue>()

export function useGpuix(): GpuixContextValue | undefined {
  return useContext(GpuixContext)
}

export function useGpuixRequired(): NativeRenderer {
  const context = useGpuix()
  if (!context) throw new Error("useGpuixRequired must be called inside a GPUix Solid root")
  return context.renderer
}
