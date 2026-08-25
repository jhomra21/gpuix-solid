import { createContext, createSignal, useContext, type JSX } from "solid-js"

export type ColorMode = "light" | "dark" | "system"
export interface ColorModeStorageManager {
  type?: string
  get?: (fallback?: ColorMode) => ColorMode | undefined | null
  set?: (value: ColorMode) => void
}
export interface ColorModeProviderProps {
  children?: JSX.Element
  initialColorMode?: ColorMode
  storageManager?: ColorModeStorageManager
}

type ColorModeContextValue = {
  colorMode: () => ColorMode
  setColorMode: (value: ColorMode) => void
  toggleColorMode: () => void
}

const ColorModeContext = createContext<ColorModeContextValue>()

export function ColorModeProvider(props: ColorModeProviderProps): JSX.Element {
  const initial = props.storageManager?.get?.(props.initialColorMode ?? "system") ?? props.initialColorMode ?? "system"
  const [colorMode, setInternalColorMode] = createSignal<ColorMode>(initial)
  const setColorMode = (value: ColorMode) => {
    setInternalColorMode(value)
    props.storageManager?.set?.(value)
  }
  return (
    <ColorModeContext.Provider value={{
      colorMode,
      setColorMode,
      toggleColorMode: () => setColorMode(colorMode() === "dark" ? "light" : "dark"),
    }}>
      {props.children}
    </ColorModeContext.Provider>
  )
}

export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext)
  if (!context) throw new Error("useColorMode must be used inside ColorModeProvider")
  return context
}

export type { PolymorphicProps, ElementOf } from "./polymorphic.js"
export * as Button from "./button.jsx"
export * as Image from "./image.jsx"
export * as Separator from "./separator.jsx"
export * as TextField from "./text-field.jsx"
export * as Tooltip from "./tooltip.jsx"
export * as Dialog from "./dialog.jsx"
export * as DropdownMenu from "./dropdown-menu.jsx"
export * as ContextMenu from "./context-menu.jsx"
export * as Menubar from "./menubar.jsx"
