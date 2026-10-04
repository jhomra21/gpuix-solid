type MarkdownSanitizeConfig = {
  USE_PROFILES?: {
    html?: boolean
  }
}

type SanitizeNode = {
  readonly tagName: string
  setAttribute(name: string, value: string): void
}

type SanitizeHook = (node: SanitizeNode) => void

const hooks = new Map<string, SanitizeHook[]>()

const allowedTags = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "small",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
])

const voidTags = new Set(["br", "hr", "img"])
const dropContentsTags = new Set(["iframe", "math", "object", "script", "style", "svg", "template"])
const globalAttributes = new Set(["title"])
const tagAttributes = new Map<string, Set<string>>([
  ["a", new Set(["href", "title"])],
  ["img", new Set(["alt", "src", "title"])],
  ["th", new Set(["align"])],
  ["td", new Set(["align"])],
])

class HookNode implements SanitizeNode {
  readonly #attributes: Map<string, string>

  constructor(
    readonly tagName: string,
    attributes: Map<string, string>,
  ) {
    this.#attributes = attributes
  }

  setAttribute(name: string, value: string): void {
    this.#attributes.set(name.toLowerCase(), String(value))
  }
}

const compat = {
  addHook(name: string, hook: SanitizeHook): void {
    const registered = hooks.get(name) ?? []
    registered.push(hook)
    hooks.set(name, registered)
  },

  sanitize(value: string, config?: MarkdownSanitizeConfig): string {
    if (config?.USE_PROFILES && config.USE_PROFILES.html !== true) return ""
    return sanitizeHtml(String(value))
  },
}

function sanitizeHtml(html: string): string {
  const output: string[] = []
  const openTags: string[] = []
  let droppedDepth = 0
  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+|</g) ?? []

  for (const token of tokens) {
    if (token.startsWith("<!--")) continue

    if (!token.startsWith("<") || token === "<") {
      if (droppedDepth === 0) output.push(token === "<" ? "&lt;" : token)
      continue
    }

    const closing = /^<\/([A-Za-z][\w:-]*)\s*>$/u.exec(token)
    if (closing?.[1]) {
      const tag = closing[1].toLowerCase()
      if (dropContentsTags.has(tag)) {
        if (droppedDepth > 0) droppedDepth -= 1
        continue
      }
      if (droppedDepth > 0 || !allowedTags.has(tag) || voidTags.has(tag)) continue
      closeThrough(openTags, output, tag)
      continue
    }

    const opening = /^<([A-Za-z][\w:-]*)([\s\S]*?)(\/?)>$/u.exec(token)
    if (!opening?.[1]) {
      if (droppedDepth === 0) output.push("&lt;")
      continue
    }

    const tag = opening[1].toLowerCase()
    if (dropContentsTags.has(tag)) {
      droppedDepth += 1
      continue
    }
    if (droppedDepth > 0 || !allowedTags.has(tag)) continue

    const attributes = sanitizeAttributes(tag, opening[2] ?? "")
    const node = new HookNode(tag.toUpperCase(), attributes)
    for (const hook of hooks.get("afterSanitizeAttributes") ?? []) hook(node)

    output.push(`<${tag}${serializeAttributes(attributes)}>`)
    if (!voidTags.has(tag) && opening[3] !== "/") openTags.push(tag)
  }

  while (openTags.length > 0) output.push(`</${openTags.pop()}>`)
  return output.join("")
}

function closeThrough(openTags: string[], output: string[], tag: string): void {
  const index = openTags.lastIndexOf(tag)
  if (index < 0) return
  while (openTags.length > index) output.push(`</${openTags.pop()}>`)
}

function sanitizeAttributes(tag: string, source: string): Map<string, string> {
  const attributes = new Map<string, string>()
  const allowed = tagAttributes.get(tag)
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gu

  for (const match of source.matchAll(pattern)) {
    const rawName = match[1]
    if (!rawName) continue
    const name = rawName.toLowerCase()
    if (!globalAttributes.has(name) && !allowed?.has(name)) continue

    const rawValue = match[2] ?? match[3] ?? match[4] ?? ""
    const value = decodeAttribute(rawValue)
    if (name === "href" && !safeHref(value)) continue
    if (name === "src" && !safeImageSource(value)) continue
    attributes.set(name, value)
  }

  return attributes
}

function safeHref(value: string): boolean {
  return safeUrl(value, new Set(["http:", "https:", "mailto:"]))
}

function safeImageSource(value: string): boolean {
  const trimmed = value.trim()
  if (/^data:image\/(?:png|jpeg|gif|webp);base64,/iu.test(trimmed)) return true
  return safeUrl(trimmed, new Set(["http:", "https:"]))
}

function safeUrl(value: string, allowedProtocols: ReadonlySet<string>): boolean {
  const normalized = value.replace(/[\u0000-\u0020]+/gu, "").trim()
  if (!normalized) return false
  if (normalized.startsWith("#") || normalized.startsWith("/") || normalized.startsWith("./") || normalized.startsWith("../")) {
    return true
  }

  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*:)/u.exec(normalized)?.[1]?.toLowerCase()
  return scheme === undefined || allowedProtocols.has(scheme)
}

function serializeAttributes(attributes: ReadonlyMap<string, string>): string {
  let serialized = ""
  for (const [name, value] of attributes) {
    serialized += ` ${name}="${escapeAttribute(value)}"`
  }
  return serialized
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function decodeAttribute(value: string): string {
  return value.replace(
    /&(#x[0-9A-Fa-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gu,
    (entity, encoded: string) => {
      if (encoded.startsWith("#x")) return String.fromCodePoint(Number.parseInt(encoded.slice(2), 16))
      if (encoded.startsWith("#")) return String.fromCodePoint(Number.parseInt(encoded.slice(1), 10))
      if (encoded === "amp") return "&"
      if (encoded === "apos") return "'"
      if (encoded === "gt") return ">"
      if (encoded === "lt") return "<"
      if (encoded === "nbsp") return "\u00a0"
      if (encoded === "quot") return '"'
      return entity
    },
  )
}

export default compat
