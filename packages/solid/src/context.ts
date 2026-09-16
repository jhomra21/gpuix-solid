import { createContext, useContext, type Accessor } from "solid-js"
import type { NativeRenderer } from "./host/types.js"

export interface GpuixSelectionContext {
  text: Accessor<string | null>
  retain(): () => void
  clear(): void
}

export interface GpuixContextValue {
  renderer: NativeRenderer
  flushSync<T>(fn: () => T): T
  selection: GpuixSelectionContext
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
