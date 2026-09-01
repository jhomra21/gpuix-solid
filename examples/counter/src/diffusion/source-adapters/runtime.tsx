import { createContext, useContext, type ParentProps } from "solid-js"
import type { DiffusionEditorState } from "../compat"

const SourceDiffusionContext = createContext<DiffusionEditorState>()

export function SourceDiffusionProvider(props: ParentProps<{ state: DiffusionEditorState }>) {
  return (
    <SourceDiffusionContext value={props.state}>
      {props.children}
    </SourceDiffusionContext>
  )
}

export function useSourceDiffusionState(): DiffusionEditorState {
  const state = useContext(SourceDiffusionContext)
  if (!state) throw new Error("Diffusion source adapter requires SourceDiffusionProvider")
  return state
}
