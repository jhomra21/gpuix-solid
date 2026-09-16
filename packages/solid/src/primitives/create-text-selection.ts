import { onCleanup, type Accessor } from "solid-js"
import { useGpuix } from "../context.js"

export interface TextSelection {
  /** Current selected text joined in document order, or null when empty. */
  readonly text: Accessor<string | null>
  /** Clear the native window selection. */
  clear(): void
}

/**
 * Solid reactive primitive for GPUIX's window-wide text selection.
 *
 * The native subscription is retained only while the calling Solid owner is
 * alive. Read selection.text() anywhere a normal Solid accessor is accepted.
 */
export function createTextSelection(): TextSelection {
  const context = useGpuix()
  if (!context) throw new Error("createTextSelection must be called inside a GPUix Solid root")

  const release = context.selection.retain()
  onCleanup(release)

  return {
    text: context.selection.text,
    clear: context.selection.clear,
  }
}
