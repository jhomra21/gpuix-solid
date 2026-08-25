import { createContext, createSignal, Show, useContext, type JSX } from "solid-js"
import type { ImgProps } from "../host/types.js"
import type { NativeClassList } from "../native-style.js"
import type { PolymorphicProps } from "./polymorphic.js"
import { mergeStyle, type NativeComponentProps } from "./shared.jsx"

type ImageContextValue = {
  hasSource: () => boolean
  setHasSource: (value: boolean) => void
}

const ImageContext = createContext<ImageContextValue>()

export interface ImageRootProps<T = "span"> extends NativeComponentProps { as?: T }
export interface ImageImgProps<T = "img"> extends Omit<ImgProps, "children"> {
  as?: T
  class?: string
  className?: string
  classList?: NativeClassList
}
export interface ImageFallbackProps<T = "span"> extends NativeComponentProps { as?: T }

export function Root<T = "span">(props: PolymorphicProps<T, ImageRootProps<T>>): JSX.Element {
  const [hasSource, setHasSource] = createSignal(false)
  return (
    <ImageContext.Provider value={{ hasSource, setHasSource }}>
      <div
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        style={mergeStyle({ position: "relative", overflow: "hidden" }, props.style)}
      >
        {props.children}
      </div>
    </ImageContext.Provider>
  )
}

export function Img<T = "img">(props: PolymorphicProps<T, ImageImgProps<T>>): JSX.Element {
  const context = useContext(ImageContext)
  const present = () => Boolean(props.src)
  if (context) context.setHasSource(present())
  return (
    <Show when={present()}>
      <img
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        src={props.src}
        objectFit={props.objectFit ?? "cover"}
        alt={props.alt}
        style={mergeStyle({ width: "100%", height: "100%" }, props.style)}
      />
    </Show>
  )
}

export function Fallback<T = "span">(props: PolymorphicProps<T, ImageFallbackProps<T>>): JSX.Element {
  const context = useContext(ImageContext)
  return (
    <Show when={!context?.hasSource()}>
      <div
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        style={mergeStyle({ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }, props.style)}
      >
        {props.children}
      </div>
    </Show>
  )
}

export const Image = Object.assign(Root, { Root, Img, Fallback })
