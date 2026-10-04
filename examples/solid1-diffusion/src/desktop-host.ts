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
import { mkdir, open, rm } from "node:fs/promises"
import { dirname } from "node:path"
import { randomUUID } from "node:crypto"
import {
  MAIN_CHANNELS,
  MAIN_WIRE,
  type MainReply,
  type MainRequest,
} from "@desktop/main-channels"
import {
  compileProject,
  createProject,
  defaultRoot,
  deleteProject,
  duplicateProject,
  getProject,
  initProject,
  listEntries,
  pickFolder,
  pickRoot,
  readConfig,
  readManifest,
  realPathEntry,
  removeEntry,
  renameProject,
  resolveProject,
  scanProjects,
  statEntry,
  unwatchProject,
  watchProject,
  writeConfig,
  writeManifest,
  writeProject,
} from "@desktop/projects"

type DesktopListener = (payload: unknown) => void

type OpenWrite = Awaited<ReturnType<typeof open>>

const listeners = new Map<string, Set<DesktopListener>>()
const writes = new Map<string, OpenWrite>()
let installed = false

const globalProperty = {
  enumerable: false,
  configurable: true,
  writable: true,
} as const

const indexedDbProperties: PropertyDescriptorMap = {
  indexedDB: { ...globalProperty, value: indexedDB },
  IDBCursor: { ...globalProperty, value: IDBCursor },
  IDBCursorWithValue: { ...globalProperty, value: IDBCursorWithValue },
  IDBDatabase: { ...globalProperty, value: IDBDatabase },
  IDBFactory: { ...globalProperty, value: IDBFactory },
  IDBIndex: { ...globalProperty, value: IDBIndex },
  IDBKeyRange: { ...globalProperty, value: IDBKeyRange },
  IDBObjectStore: { ...globalProperty, value: IDBObjectStore },
  IDBOpenDBRequest: { ...globalProperty, value: IDBOpenDBRequest },
  IDBRecord: { ...globalProperty, value: IDBRecord },
  IDBRequest: { ...globalProperty, value: IDBRequest },
  IDBTransaction: { ...globalProperty, value: IDBTransaction },
  IDBVersionChangeEvent: { ...globalProperty, value: IDBVersionChangeEvent },
}

const watchWindow = {
  isDestroyed: () => false,
  webContents: {
    isLoading: () => false,
    send(channel: string, payload: unknown): void {
      emit(channel, payload)
    },
  },
}

async function dispatch(request: MainRequest): Promise<unknown> {
  const data = request.data as Record<string, any> | undefined

  switch (request.channel) {
    case MAIN_CHANNELS.WINDOW_IS_FULLSCREEN:
      return false
    case MAIN_CHANNELS.WINDOW_SET_COLOR_MODE:
    case MAIN_CHANNELS.ANALYTICS_TRACK:
      return undefined
    case MAIN_CHANNELS.AUTH_GET_PENDING_CALLBACK:
    case MAIN_CHANNELS.CHECKOUT_GET_PENDING_CALLBACK:
      return null
    case MAIN_CHANNELS.APP_OPEN_EXTERNAL:
    case MAIN_CHANNELS.APP_SHOW_IN_FOLDER:
      return undefined
    case MAIN_CHANNELS.LOGS_GET:
      return []
    case MAIN_CHANNELS.PROJECTS_PICK_ROOT:
      return pickRoot(null)
    case MAIN_CHANNELS.PROJECTS_PICK_FOLDER:
      return pickFolder(null)
    case MAIN_CHANNELS.PROJECTS_DEFAULT_ROOT:
      return defaultRoot(null)
    case MAIN_CHANNELS.PROJECTS_SCAN:
      return scanProjects(data!.root)
    case MAIN_CHANNELS.PROJECTS_GET:
      return getProject(data!.dir)
    case MAIN_CHANNELS.PROJECTS_INIT:
      return initProject(null, data!.dir)
    case MAIN_CHANNELS.PROJECTS_RESOLVE:
      return resolveProject(data!.dir)
    case MAIN_CHANNELS.PROJECTS_CREATE:
      return createProject(data!.root, data!.displayName)
    case MAIN_CHANNELS.PROJECTS_RENAME:
      return renameProject(data!.dir, data!.displayName)
    case MAIN_CHANNELS.PROJECTS_DUPLICATE:
      return duplicateProject(data!.dir)
    case MAIN_CHANNELS.PROJECTS_DELETE:
      await deleteProject(data!.dir)
      return undefined
    case MAIN_CHANNELS.PROJECTS_COMPILE:
      return compileProject(data!.dir)
    case MAIN_CHANNELS.PROJECTS_WRITE:
      return writeProject(data!.dir, data!.edits)
    case MAIN_CHANNELS.PROJECTS_WATCH:
      watchProject(watchWindow as never, data!.dir)
      return undefined
    case MAIN_CHANNELS.PROJECTS_UNWATCH:
      unwatchProject(data!.dir)
      return undefined
    case MAIN_CHANNELS.PROJECTS_MANIFEST_READ:
      return readManifest(data!.dir)
    case MAIN_CHANNELS.PROJECTS_MANIFEST_WRITE:
      await writeManifest(data!.dir, data!.manifest)
      return undefined
    case MAIN_CHANNELS.PROJECTS_CONFIG_READ:
      return readConfig(data!.dir)
    case MAIN_CHANNELS.PROJECTS_CONFIG_WRITE:
      await writeConfig(data!.dir, data!.config)
      return undefined
    case MAIN_CHANNELS.PROJECTS_FS_LIST:
      return listEntries(data!.dir, data!.source)
    case MAIN_CHANNELS.PROJECTS_FS_STAT:
      return statEntry(data!.dir, data!.source)
    case MAIN_CHANNELS.PROJECTS_FS_REMOVE:
      await removeEntry(data!.dir, data!.path)
      return undefined
    case MAIN_CHANNELS.PROJECTS_FS_REAL_PATH:
      return realPathEntry(data!.dir, data!.source)
    case MAIN_CHANNELS.FILE_WRITE_OPEN: {
      const path = data!.path as string
      await mkdir(dirname(path), { recursive: true })
      const id = randomUUID()
      writes.set(id, await open(path, data!.exclusive ? "wx" : "w"))
      return { id }
    }
    case MAIN_CHANNELS.FILE_WRITE_CHUNK: {
      const handle = writes.get(data!.id)
      if (!handle) throw new Error(`Unknown GPUIX Diffusion write handle ${data!.id}`)
      const bytes = data!.data instanceof Uint8Array ? data!.data : new Uint8Array(data!.data)
      await handle.write(bytes, 0, bytes.byteLength, data!.position)
      return undefined
    }
    case MAIN_CHANNELS.FILE_WRITE_CLOSE: {
      const handle = writes.get(data!.id)
      writes.delete(data!.id)
      await handle?.close()
      return undefined
    }
    case MAIN_CHANNELS.FILE_WRITE_ABORT: {
      const handle = writes.get(data!.id)
      writes.delete(data!.id)
      await handle?.close()
      if (data!.path) await rm(data!.path, { force: true })
      return undefined
    }
    case MAIN_CHANNELS.AGENT_CHAT_ENDPOINT:
      return null
    case MAIN_CHANNELS.MCP_STATUS:
      return { url: "", agents: [] }
    case MAIN_CHANNELS.MCP_APPLY:
      return { added: [], removed: [], failures: [] }
    case MAIN_CHANNELS.CLI_STATUS:
      return { installed: false, path: null, managed: false, available: false }
    case MAIN_CHANNELS.CLI_INSTALL:
      return { status: "error", error: "CLI installation is not available in the GPUIX host yet." }
    case MAIN_CHANNELS.CLI_UNINSTALL:
      return { status: "absent" }
    default:
      throw new Error(`GPUIX Diffusion desktop host does not implement ${request.channel}`)
  }
}

/**
 * Supplies the browser storage globals and the exact Electron-preload-shaped
 * bridge the pinned editor expects while running inside GPUIX. Project,
 * compiler, watcher and filesystem requests delegate to Diffusion's pinned
 * desktop implementation instead of recreating those behaviors in the host.
 */
export function installDiffusionDesktopHost(): void {
  if (installed) return
  installed = true

  Object.defineProperties(globalThis, indexedDbProperties)
  Object.defineProperties(globalThis.window, indexedDbProperties)

  const desktop = {
    platform: process.platform,
    send(channel: string, request: MainRequest): void {
      if (channel !== MAIN_WIRE.REQUEST) return

      void dispatch(request).then(
        (data) => {
          const reply: MainReply = { id: request.id, ok: true, data } as MainReply
          emit(MAIN_WIRE.RESPONSE, reply)
        },
        (error) => {
          const reply: MainReply = {
            id: request.id,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }
          emit(MAIN_WIRE.RESPONSE, reply)
        },
      )
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
  document.documentElement.dataset.platform = process.platform
  document.documentElement.dataset.fullscreen = "false"
}

function emit(channel: string, payload: unknown): void {
  queueMicrotask(() => {
    for (const listener of listeners.get(channel) ?? []) listener(payload)
  })
}
