import type { Element as SolidElement } from "solid-js"
import type {
  AnchoredProps,
  CodeProps,
  DiffProps,
  HostProps,
  ImgProps,
  InputProps,
  MarkdownProps,
  SvgProps,
  TextareaProps,
  VirtualListProps,
} from "./dist/index.js"

type RendererNode = { readonly kind: "element" | "text" }

export namespace JSX {
  type Element = SolidElement | RendererNode | ArrayElement
  interface ArrayElement extends Array<Element> {}

  interface ElementChildrenAttribute {
    children: {}
  }

  interface IntrinsicElements {
    div: HostProps
    text: HostProps
    img: ImgProps
    svg: SvgProps
    canvas: HostProps
    input: InputProps
    textarea: TextareaProps
    anchored: AnchoredProps
    code: CodeProps
    diff: DiffProps
    markdown: MarkdownProps
    "virtual-list": VirtualListProps
  }
}
