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

type DomCompatibleProps<TNative, TDom> = JSXProps<TNative> | TDom

type InlineSvgProps = NativeClassProps & {
  children?: SolidJSX.Element | SolidJSX.Element[] | undefined
  xmlns?: string | undefined
  viewBox?: string | undefined
  width?: string | number | undefined
  height?: string | number | undefined
  fill?: string | undefined
  stroke?: string | undefined
  "stroke-width"?: string | number | undefined
  role?: string | undefined
  "aria-label"?: string | undefined
  "aria-hidden"?: string | boolean | undefined
}

type InlineSvgPathProps = NativeClassProps & {
  d?: string | undefined
  fill?: string | undefined
  stroke?: string | undefined
  "stroke-width"?: string | number | undefined
}

export namespace JSX {
  type Element = SolidJSX.Element

  interface ElementChildrenAttribute {
    children: {}
  }

  interface IntrinsicElements {
    div: DomCompatibleProps<HostProps, SolidJSX.HTMLAttributes<HTMLDivElement>>
    span: DomCompatibleProps<HostProps, SolidJSX.HTMLAttributes<HTMLSpanElement>>
    text: JSXProps<HostProps>
    img: JSXProps<ImgProps>
    svg: JSXProps<SvgProps> | InlineSvgProps
    path: InlineSvgPathProps
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
