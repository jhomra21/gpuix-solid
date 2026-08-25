import type { JSX as SolidJSX } from "solid-js"
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

export namespace JSX {
  type Element = SolidJSX.Element

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
