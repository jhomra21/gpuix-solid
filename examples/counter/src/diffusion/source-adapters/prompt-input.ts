import { useSourceDiffusionRuntime } from "./runtime"

export function usePromptInput() {
  const runtime = useSourceDiffusionRuntime()
  return {
    setPromptInputOpen: (open: boolean) => runtime.setPromptOpen?.(open),
  }
}
