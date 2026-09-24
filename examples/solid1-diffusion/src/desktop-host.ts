type MainRequest = {
  id: string
  channel: string
}

type MainReply =
  | { id: string; ok: true; data: boolean | null }
  | { id: string; ok: false; error: string }

type DesktopListener = (payload: MainReply) => void

const listeners = new Map<string, Set<DesktopListener>>()

/**
 * Supplies the small Electron preload surface the pinned editor reads while
 * running inside GPUIX. Keep unsupported main-process calls visible instead
 * of silently inventing desktop behavior.
 */
export function installDiffusionDesktopHost(): void {
  const browserWindow = globalThis.window as Window & { desktop?: object }
  if (browserWindow.desktop) return

  const desktop = {
    platform: "darwin",
    send(channel: string, payload: unknown): void {
      if (channel !== "main:request") return
      const request = parseMainRequest(payload)
      if (!request) return

      let reply: MainReply
      switch (request.channel) {
        case "window:is-fullscreen":
          reply = { id: request.id, ok: true, data: false }
          break
        case "window:set-color-mode":
        case "analytics:track":
          reply = { id: request.id, ok: true, data: null }
          break
        default:
          reply = {
            id: request.id,
            ok: false,
            error: `GPUIX Diffusion desktop host does not implement ${request.channel}`,
          }
      }

      queueMicrotask(() => emit("main:response", reply))
    },
    on(channel: string, listener: DesktopListener): () => void {
      const channelListeners = listeners.get(channel) ?? new Set<DesktopListener>()
      channelListeners.add(listener)
      listeners.set(channel, channelListeners)
      return () => {
        channelListeners.delete(listener)
        if (channelListeners.size === 0) listeners.delete(channel)
      }
    },
    getPathForFile(file: File): string {
      return file.name
    },
  }

  Object.defineProperty(browserWindow, "desktop", {
    configurable: true,
    writable: true,
    value: desktop,
  })
  document.documentElement.dataset.platform = "darwin"
  document.documentElement.dataset.fullscreen = "false"
}

function emit(channel: string, payload: MainReply): void {
  for (const listener of listeners.get(channel) ?? []) listener(payload)
}

function parseMainRequest(payload: unknown): MainRequest | undefined {
  if (!isRecord(payload)) return undefined
  const { id, channel } = payload
  if (typeof id !== "string" || typeof channel !== "string") return undefined
  return { id, channel }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
