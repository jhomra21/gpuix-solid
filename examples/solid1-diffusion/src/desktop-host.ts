import {
  IDBCursor,
  IDBCursorWithValue,
  IDBDatabase,
  IDBFactory,
  IDBIndex,
  IDBKeyRange,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRecord,
  IDBRequest,
  IDBTransaction,
  IDBVersionChangeEvent,
  indexedDB,
} from "fake-indexeddb"
import {
  MAIN_CHANNELS,
  MAIN_WIRE,
  type MainReply,
  type MainRequest,
} from "@desktop/main-channels"

type DesktopListener = (payload: MainReply) => void

const listeners = new Map<string, Set<DesktopListener>>()
let installed = false

const indexedDbProperties: PropertyDescriptorMap = {
  indexedDB: writableGlobal(indexedDB),
  IDBCursor: writableGlobal(IDBCursor),
  IDBCursorWithValue: writableGlobal(IDBCursorWithValue),
  IDBDatabase: writableGlobal(IDBDatabase),
  IDBFactory: writableGlobal(IDBFactory),
  IDBIndex: writableGlobal(IDBIndex),
  IDBKeyRange: writableGlobal(IDBKeyRange),
  IDBObjectStore: writableGlobal(IDBObjectStore),
  IDBOpenDBRequest: writableGlobal(IDBOpenDBRequest),
  IDBRecord: writableGlobal(IDBRecord),
  IDBRequest: writableGlobal(IDBRequest),
  IDBTransaction: writableGlobal(IDBTransaction),
  IDBVersionChangeEvent: writableGlobal(IDBVersionChangeEvent),
}

/**
 * Supplies the browser storage globals and Electron preload surface the pinned
 * editor reads while running inside GPUIX. Unsupported main-process calls
 * return an explicit error.
 */
export function installDiffusionDesktopHost(): void {
  if (installed) return
  installed = true

  // GPUIX exposes a browser-like window object that is distinct from the JS
  // global object. Diffusion uses both window APIs and bare IndexedDB globals.
  Object.defineProperties(globalThis, indexedDbProperties)
  Object.defineProperties(globalThis.window, indexedDbProperties)

  const desktop = {
    platform: "darwin",
    send(channel: string, request: MainRequest): void {
      if (channel !== MAIN_WIRE.REQUEST) return

      let reply: MainReply
      switch (request.channel) {
        case MAIN_CHANNELS.WINDOW_IS_FULLSCREEN:
          reply = { id: request.id, ok: true, data: false }
          break
        case MAIN_CHANNELS.WINDOW_SET_COLOR_MODE:
        case MAIN_CHANNELS.ANALYTICS_TRACK:
          reply = { id: request.id, ok: true, data: undefined }
          break
        default:
          reply = {
            id: request.id,
            ok: false,
            error: `GPUIX Diffusion desktop host does not implement ${request.channel}`,
          }
      }

      queueMicrotask(() => emit(MAIN_WIRE.RESPONSE, reply))
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

  Object.defineProperty(globalThis.window, "desktop", {
    configurable: true,
    writable: true,
    value: desktop,
  })
  document.documentElement.dataset.platform = "darwin"
  document.documentElement.dataset.fullscreen = "false"
}

function writableGlobal(value: object): PropertyDescriptor {
  return {
    value,
    enumerable: false,
    configurable: true,
    writable: true,
  }
}

function emit(channel: string, payload: MainReply): void {
  for (const listener of listeners.get(channel) ?? []) listener(payload)
}
