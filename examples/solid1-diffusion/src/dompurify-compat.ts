type MarkdownSanitizeConfig = {
  USE_PROFILES?: {
    html?: boolean
  }
}

type SanitizeHook = (node: Element) => void

const hooks = new Map<string, SanitizeHook[]>()

const compat = {
  addHook(name: string, hook: SanitizeHook): void {
    const registered = hooks.get(name) ?? []
    registered.push(hook)
    hooks.set(name, registered)
  },
  sanitize(_value: string, _config?: MarkdownSanitizeConfig): string {
    throw new Error(
      "Diffusion markdown sanitization requires a standards-compatible DOM; native DOMPurify is unavailable",
    )
  },
}

export default compat
