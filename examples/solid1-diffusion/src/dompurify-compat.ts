import createDOMPurify from "@diffusion-native/dompurify-source"

type Hook = (node: Element, data?: unknown, config?: unknown) => void

type Purifier = {
  addHook(name: string, hook: Hook): void
  sanitize(value: string, config?: unknown): string
}

type PurifierFactory = Purifier | ((window: Window) => unknown)

function isPurifier(value: unknown): value is Purifier {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return false
  const candidate = value as Partial<Purifier>
  return typeof candidate.addHook === "function" && typeof candidate.sanitize === "function"
}

function resolvePurifier(): Purifier | undefined {
  const candidate = createDOMPurify as PurifierFactory
  if (isPurifier(candidate)) return candidate
  if (typeof candidate !== "function") return undefined

  try {
    const instance = candidate(globalThis.window)
    return isPurifier(instance) ? instance : undefined
  } catch {
    return undefined
  }
}

const purifier = resolvePurifier()
const pendingHooks: Array<{ name: string; hook: Hook }> = []

const compat: Purifier = {
  addHook(name, hook) {
    if (purifier) {
      purifier.addHook(name, hook)
      return
    }
    pendingHooks.push({ name, hook })
  },
  sanitize(value, config) {
    if (!purifier) {
      throw new Error(
        "Diffusion markdown sanitization requires a standards-compatible DOM; native DOMPurify is unavailable",
      )
    }
    for (const { name, hook } of pendingHooks.splice(0)) purifier.addHook(name, hook)
    return purifier.sanitize(value, config)
  },
}

export default compat
