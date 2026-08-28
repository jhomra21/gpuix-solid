import { splitProps, type JSX } from "solid-js"
import * as Native from "@jhomra21/gpuix-solid1/kobalte/image"
import type { ImageImgProps, ImageRootProps } from "@jhomra21/gpuix-solid1/kobalte/image"

interface RootProps extends ImageRootProps {
  fallbackDelay?: number | undefined
}

interface ImgProps extends Omit<ImageImgProps, "class"> {
  class?: string | undefined
}

function Root(props: RootProps): JSX.Element {
  const [, rest] = splitProps(props, ["fallbackDelay"])
  return <Native.Root {...rest} />
}

function Img(props: ImgProps): JSX.Element {
  return <Native.Img {...props} class={props.class ?? ""} />
}

export const Fallback = Native.Fallback
export const Image = Object.assign(Root, { Root, Img, Fallback })
export { Root, Img }
