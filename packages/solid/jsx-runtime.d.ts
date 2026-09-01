import type { Element as SolidElement, JSX as SolidJSX } from "solid-js"
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

type RendererNode = { readonly kind: "element" | "text" }

type NativeClassProps = {
  class?: string | undefined
  className?: string | undefined
  classList?: NativeClassList | undefined
}

type JSXProps<T> = {
  [K in keyof T]: {} extends Pick<T, K> ? T[K] | undefined : T[K]
} & NativeClassProps

type DomCompatibleProps<TNative, TDom> = JSXProps<TNative> | TDom

type SemanticDomProps = DomCompatibleProps<HostProps, SolidJSX.HTMLAttributes<HTMLElement>> & {
  disabled?: boolean | undefined
  href?: string | undefined
  type?: string | undefined
  role?: string | undefined
  "aria-label"?: string | undefined
  "aria-hidden"?: string | boolean | undefined
}

type InlineSvgProps = JSXProps<SvgProps> | SolidJSX.SvgSVGAttributes<SVGSVGElement>

type InlineSvgChildProps = NativeClassProps & {
  children?: SolidJSX.Element | SolidJSX.Element[] | undefined
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
    div: DomCompatibleProps<HostProps, SolidJSX.HTMLAttributes<HTMLDivElement>>
    span: SemanticDomProps
    p: SemanticDomProps
    h1: SemanticDomProps
    h2: SemanticDomProps
    h3: SemanticDomProps
    h4: SemanticDomProps
    h5: SemanticDomProps
    h6: SemanticDomProps
    strong: SemanticDomProps
    em: SemanticDomProps
    small: SemanticDomProps
    label: SemanticDomProps
    time: SemanticDomProps
    kbd: SemanticDomProps
    samp: SemanticDomProps
    button: SemanticDomProps
    hr: SemanticDomProps
    section: SemanticDomProps
    main: SemanticDomProps
    header: SemanticDomProps
    footer: SemanticDomProps
    nav: SemanticDomProps
    aside: SemanticDomProps
    article: SemanticDomProps
    ul: SemanticDomProps
    ol: SemanticDomProps
    li: SemanticDomProps
    form: SemanticDomProps
    fieldset: SemanticDomProps
    legend: SemanticDomProps
    figure: SemanticDomProps
    figcaption: SemanticDomProps
    a: SemanticDomProps
    text: JSXProps<HostProps>
    img: JSXProps<ImgProps>
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
    canvas: JSXProps<HostProps>
    input: DomCompatibleProps<InputProps, SolidJSX.InputHTMLAttributes<HTMLInputElement>>
    textarea: DomCompatibleProps<TextareaProps, SolidJSX.TextareaHTMLAttributes<HTMLTextAreaElement>>
    anchored: JSXProps<AnchoredProps>
    code: JSXProps<CodeProps>
    diff: JSXProps<DiffProps>
    markdown: JSXProps<MarkdownProps>
    "virtual-list": JSXProps<VirtualListProps>
  }
}
