import type { JSX as SolidJSX } from "solid-js"
import type {
  AnchoredProps,
  CodeProps,
  DiffProps,
  HostProps,
  ImgProps,
  InputProps,
  MarkdownProps,
  NativeClassList,
  SvgProps,
  TextareaProps,
  VirtualListProps,
} from "./dist/index.js"

type NativeClassProps = {
  class?: string | undefined
  className?: string | undefined
  classList?: NativeClassList | undefined
}

type JSXProps<T> = {
  [K in keyof T]: {} extends Pick<T, K> ? T[K] | undefined : T[K]
} & NativeClassProps

export namespace JSX {
  type Element = SolidJSX.Element

  interface ElementChildrenAttribute {
    children: {}
  }

  interface IntrinsicElements {
    div: JSXProps<HostProps>
    text: JSXProps<HostProps>
    img: JSXProps<ImgProps>
    svg: JSXProps<SvgProps>
    canvas: JSXProps<HostProps>
    input: JSXProps<InputProps>
    textarea: JSXProps<TextareaProps>
    anchored: JSXProps<AnchoredProps>
    code: JSXProps<CodeProps>
    diff: JSXProps<DiffProps>
    markdown: JSXProps<MarkdownProps>
    "virtual-list": JSXProps<VirtualListProps>
  }
}
