import type { Element as SolidElement } from "solid-js"
import type {
  AnchoredProps,
  CodeProps,
  DiffProps,
  HostEventHandler,
  HostProps,
  HostRef,
  ImgProps,
  InputProps,
  MarkdownProps,
  NativeClassList,
  PublicInstance,
  SvgProps,
  TextareaProps,
  VirtualListProps,
} from "./dist/index.js"

type RendererNode = { readonly kind: "element" | "text" }

type NativeClassProps = {
  class?: string | undefined
  className?: string | undefined
  classList?: NativeClassList | undefined
}

type SourceMetadataProps = {
  id?: string | undefined
  title?: string | undefined
  role?: string | undefined
  hidden?: boolean | undefined
  disabled?: boolean | undefined
  href?: string | undefined
  target?: string | undefined
  rel?: string | undefined
  type?: string | undefined
  name?: string | undefined
  value?: string | number | readonly string[] | undefined
  checked?: boolean | undefined
  selected?: boolean | undefined
  multiple?: boolean | undefined
  min?: string | number | undefined
  max?: string | number | undefined
  step?: string | number | undefined
  placeholder?: string | undefined
  autoComplete?: string | undefined
  htmlFor?: string | undefined
  draggable?: boolean | undefined
  contentEditable?: boolean | "inherit" | "plaintext-only" | undefined
  spellcheck?: boolean | undefined
}

type AriaAttributes = {
  [K in `aria-${string}`]?: string | number | boolean | undefined
}

type DataAttributes = {
  [K in `data-${string}`]?: string | number | boolean | undefined
}

type SourceRef = HostRef | PublicInstance | HTMLElement | SVGElement

type JSXProps<T> = {
  [K in keyof T]: {} extends Pick<T, K> ? T[K] | undefined : T[K]
} & NativeClassProps

type SourceElementProps<T extends HostProps = HostProps> = Omit<JSXProps<T>, "ref"> &
  SourceMetadataProps & AriaAttributes & DataAttributes & {
    ref?: SourceRef | undefined
  }

type SourceInputProps = Omit<SourceElementProps<InputProps>, "value"> & {
  value?: string | number | readonly string[] | undefined
  defaultValue?: string | number | readonly string[] | undefined
  defaultChecked?: boolean | undefined
  accept?: string | undefined
  capture?: boolean | string | undefined
}

type InlineSvgProps = SourceElementProps<SvgProps> & {
  viewBox?: string | undefined
  preserveAspectRatio?: string | undefined
  xmlns?: string | undefined
  fill?: string | undefined
  stroke?: string | undefined
  width?: string | number | undefined
  height?: string | number | undefined
}

type InlineSvgChildProps = NativeClassProps & AriaAttributes & DataAttributes & {
  children?: JSX.Element | JSX.Element[] | undefined
  id?: string | undefined
  d?: string | undefined
  x?: string | number | undefined
  y?: string | number | undefined
  x1?: string | number | undefined
  x2?: string | number | undefined
  y1?: string | number | undefined
  y2?: string | number | undefined
  cx?: string | number | undefined
  cy?: string | number | undefined
  r?: string | number | undefined
  rx?: string | number | undefined
  ry?: string | number | undefined
  width?: string | number | undefined
  height?: string | number | undefined
  points?: string | undefined
  offset?: string | number | undefined
  fill?: string | undefined
  stroke?: string | undefined
  opacity?: string | number | undefined
  transform?: string | undefined
  viewBox?: string | undefined
  preserveAspectRatio?: string | undefined
  href?: string | undefined
  onClick?: HostEventHandler | undefined
  onPointerDown?: HostEventHandler | undefined
  onPointerUp?: HostEventHandler | undefined
  "stroke-width"?: string | number | undefined
  "stroke-linecap"?: string | undefined
  "stroke-linejoin"?: string | undefined
  "stroke-miterlimit"?: string | number | undefined
  "stroke-dasharray"?: string | number | undefined
  "stroke-dashoffset"?: string | number | undefined
  "fill-rule"?: string | undefined
  "clip-rule"?: string | undefined
  "clip-path"?: string | undefined
  "stop-color"?: string | undefined
  "stop-opacity"?: string | number | undefined
}

export namespace JSX {
  type Element = SolidElement | RendererNode | ArrayElement
  interface ArrayElement extends Array<Element> {}

  interface ElementChildrenAttribute {
    children: {}
  }

  interface IntrinsicElements {
    div: SourceElementProps
    span: SourceElementProps
    p: SourceElementProps
    h1: SourceElementProps
    h2: SourceElementProps
    h3: SourceElementProps
    h4: SourceElementProps
    h5: SourceElementProps
    h6: SourceElementProps
    strong: SourceElementProps
    em: SourceElementProps
    small: SourceElementProps
    label: SourceElementProps
    time: SourceElementProps
    kbd: SourceElementProps
    samp: SourceElementProps
    button: SourceElementProps
    hr: SourceElementProps
    section: SourceElementProps
    main: SourceElementProps
    header: SourceElementProps
    footer: SourceElementProps
    nav: SourceElementProps
    aside: SourceElementProps
    article: SourceElementProps
    ul: SourceElementProps
    ol: SourceElementProps
    li: SourceElementProps
    form: SourceElementProps
    fieldset: SourceElementProps
    legend: SourceElementProps
    figure: SourceElementProps
    figcaption: SourceElementProps
    a: SourceElementProps
    text: JSXProps<HostProps>
    img: SourceElementProps<ImgProps>
    svg: InlineSvgProps
    path: InlineSvgChildProps
    g: InlineSvgChildProps
    defs: InlineSvgChildProps
    linearGradient: InlineSvgChildProps
    radialGradient: InlineSvgChildProps
    stop: InlineSvgChildProps
    rect: InlineSvgChildProps
    circle: InlineSvgChildProps
    ellipse: InlineSvgChildProps
    line: InlineSvgChildProps
    polyline: InlineSvgChildProps
    polygon: InlineSvgChildProps
    clipPath: InlineSvgChildProps
    mask: InlineSvgChildProps
    title: InlineSvgChildProps
    desc: InlineSvgChildProps
    use: InlineSvgChildProps
    canvas: SourceElementProps
    input: SourceInputProps
    textarea: SourceElementProps<TextareaProps>
    anchored: JSXProps<AnchoredProps>
    code: JSXProps<CodeProps>
    diff: JSXProps<DiffProps>
    markdown: JSXProps<MarkdownProps>
    "virtual-list": JSXProps<VirtualListProps>
  }
}
