import { createContext, useContext, type ParentProps } from "solid-js"
import type { DiffusionEditorState } from "../compat"

interface SourceDiffusionRuntime {
  state: DiffusionEditorState
  setPromptOpen?: (open: boolean) => void
}

const SourceDiffusionContext = createContext<SourceDiffusionRuntime>()

export function SourceDiffusionProvider(props: ParentProps<SourceDiffusionRuntime>) {
  return (
    <SourceDiffusionContext value={{ state: props.state, setPromptOpen: props.setPromptOpen }}>
      {props.children}
    </SourceDiffusionContext>
  )
}

export function useSourceDiffusionRuntime(): SourceDiffusionRuntime {
  const runtime = useContext(SourceDiffusionContext)
  if (!runtime) throw new Error("Diffusion source adapter requires SourceDiffusionProvider")
  return runtime
}

export function useSourceDiffusionState(): DiffusionEditorState {
  return useSourceDiffusionRuntime().state
}
