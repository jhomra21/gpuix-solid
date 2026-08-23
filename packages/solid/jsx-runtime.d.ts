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
  type ElementClass = SolidJSX.ElementClass
  type ElementAttributesProperty = SolidJSX.ElementAttributesProperty
  type ElementChildrenAttribute = SolidJSX.ElementChildrenAttribute
  type IntrinsicAttributes = SolidJSX.IntrinsicAttributes

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
