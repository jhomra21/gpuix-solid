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
  type MainEvent,
  type MainReply,
  type MainRequest,
  type MainRequestChannel,
  type MainRequestMap,
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
import { BrowserWindow } from "./electron-compat"

type DesktopPayload = MainReply | MainEvent
type DesktopListener = (payload: DesktopPayload) => void
type OpenWrite = {
  handle: Awaited<ReturnType<typeof open>>
  path: string
}

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

const watchWindow = new BrowserWindow((channel, payload) => emit(channel, payload))

function requestData<C extends MainRequestChannel>(
  request: MainRequest,
  channel: C,
): MainRequestMap[C]["request"] {
  if (request.channel !== channel) {
    throw new Error(`Expected ${channel}, received ${request.channel}`)
  }

  // SAFETY: the renderer constructs every request from MainRequestMap before
  // sending it over this in-process bridge, and the channel discriminant was
  // checked immediately above against the same owner contract.
  return request.data as MainRequestMap[C]["request"]
}

async function dispatch(request: MainRequest): Promise<MainReply> {
  const id = request.id

  switch (request.channel) {
    case MAIN_CHANNELS.WINDOW_IS_FULLSCREEN:
      return { id, ok: true, data: false }
    case MAIN_CHANNELS.WINDOW_SET_COLOR_MODE:
    case MAIN_CHANNELS.ANALYTICS_TRACK:
      return { id, ok: true, data: undefined }
    case MAIN_CHANNELS.AUTH_GET_PENDING_CALLBACK:
    case MAIN_CHANNELS.CHECKOUT_GET_PENDING_CALLBACK:
      return { id, ok: true, data: null }
    case MAIN_CHANNELS.APP_OPEN_EXTERNAL:
    case MAIN_CHANNELS.APP_SHOW_IN_FOLDER:
      return { id, ok: true, data: undefined }
    case MAIN_CHANNELS.LOGS_GET:
      return { id, ok: true, data: [] }
    case MAIN_CHANNELS.PROJECTS_PICK_ROOT:
      return { id, ok: true, data: await pickRoot(null) }
    case MAIN_CHANNELS.PROJECTS_PICK_FOLDER:
      return { id, ok: true, data: await pickFolder(null) }
    case MAIN_CHANNELS.PROJECTS_DEFAULT_ROOT:
      return { id, ok: true, data: await defaultRoot(null) }
    case MAIN_CHANNELS.PROJECTS_SCAN: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_SCAN)
      return { id, ok: true, data: await scanProjects(data.root) }
    }
    case MAIN_CHANNELS.PROJECTS_GET: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_GET)
      return { id, ok: true, data: await getProject(data.dir) }
    }
    case MAIN_CHANNELS.PROJECTS_INIT: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_INIT)
      return { id, ok: true, data: await initProject(null, data.dir) }
    }
    case MAIN_CHANNELS.PROJECTS_RESOLVE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_RESOLVE)
      return { id, ok: true, data: await resolveProject(data.dir) }
    }
    case MAIN_CHANNELS.PROJECTS_CREATE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_CREATE)
      return { id, ok: true, data: await createProject(data.root, data.displayName) }
    }
    case MAIN_CHANNELS.PROJECTS_RENAME: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_RENAME)
      return { id, ok: true, data: await renameProject(data.dir, data.displayName) }
    }
    case MAIN_CHANNELS.PROJECTS_DUPLICATE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_DUPLICATE)
      return { id, ok: true, data: await duplicateProject(data.dir) }
    }
    case MAIN_CHANNELS.PROJECTS_DELETE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_DELETE)
      await deleteProject(data.dir)
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.PROJECTS_COMPILE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_COMPILE)
      return { id, ok: true, data: await compileProject(data.dir) }
    }
    case MAIN_CHANNELS.PROJECTS_WRITE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_WRITE)
      return { id, ok: true, data: await writeProject(data.dir, data.edits) }
    }
    case MAIN_CHANNELS.PROJECTS_WATCH: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_WATCH)
      watchProject(watchWindow, data.dir)
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.PROJECTS_UNWATCH: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_UNWATCH)
      unwatchProject(data.dir)
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.PROJECTS_MANIFEST_READ: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_MANIFEST_READ)
      return { id, ok: true, data: await readManifest(data.dir) }
    }
    case MAIN_CHANNELS.PROJECTS_MANIFEST_WRITE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_MANIFEST_WRITE)
      await writeManifest(data.dir, data.manifest)
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.PROJECTS_CONFIG_READ: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_CONFIG_READ)
      return { id, ok: true, data: await readConfig(data.dir) }
    }
    case MAIN_CHANNELS.PROJECTS_CONFIG_WRITE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_CONFIG_WRITE)
      await writeConfig(data.dir, data.config)
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.PROJECTS_FS_LIST: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_FS_LIST)
      return { id, ok: true, data: await listEntries(data.dir, data.source) }
    }
    case MAIN_CHANNELS.PROJECTS_FS_STAT: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_FS_STAT)
      return { id, ok: true, data: await statEntry(data.dir, data.source) }
    }
    case MAIN_CHANNELS.PROJECTS_FS_REMOVE: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_FS_REMOVE)
      await removeEntry(data.dir, data.path)
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.PROJECTS_FS_REAL_PATH: {
      const data = requestData(request, MAIN_CHANNELS.PROJECTS_FS_REAL_PATH)
      return { id, ok: true, data: await realPathEntry(data.dir, data.source) }
    }
    case MAIN_CHANNELS.FILE_WRITE_OPEN: {
      const data = requestData(request, MAIN_CHANNELS.FILE_WRITE_OPEN)
      await mkdir(dirname(data.path), { recursive: true })
      const writeId = randomUUID()
      writes.set(writeId, {
        handle: await open(data.path, data.exclusive ? "wx" : "w"),
        path: data.path,
      })
      return { id, ok: true, data: { id: writeId } }
    }
    case MAIN_CHANNELS.FILE_WRITE_CHUNK: {
      const data = requestData(request, MAIN_CHANNELS.FILE_WRITE_CHUNK)
      const entry = writes.get(data.id)
      if (!entry) throw new Error(`Unknown GPUIX Diffusion write handle ${data.id}`)
      await entry.handle.write(data.data, 0, data.data.byteLength, data.position)
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.FILE_WRITE_CLOSE: {
      const data = requestData(request, MAIN_CHANNELS.FILE_WRITE_CLOSE)
      const entry = writes.get(data.id)
      writes.delete(data.id)
      await entry?.handle.close()
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.FILE_WRITE_ABORT: {
      const data = requestData(request, MAIN_CHANNELS.FILE_WRITE_ABORT)
      const entry = writes.get(data.id)
      writes.delete(data.id)
      await entry?.handle.close()
      if (entry) await rm(entry.path, { force: true })
      return { id, ok: true, data: undefined }
    }
    case MAIN_CHANNELS.AGENT_CHAT_ENDPOINT:
      return { id, ok: true, data: null }
    case MAIN_CHANNELS.MCP_STATUS:
      return { id, ok: true, data: { url: "", agents: [] } }
    case MAIN_CHANNELS.MCP_APPLY:
      return { id, ok: true, data: { added: [], removed: [], failures: [] } }
    case MAIN_CHANNELS.CLI_STATUS:
      return { id, ok: true, data: { installed: false, path: null, managed: false, available: false } }
    case MAIN_CHANNELS.CLI_INSTALL:
      return {
        id,
        ok: true,
        data: { status: "error", error: "CLI installation is not available in the GPUIX host yet." },
      }
    case MAIN_CHANNELS.CLI_UNINSTALL:
      return { id, ok: true, data: { status: "absent" } }
    default:
      return {
        id,
        ok: false,
        error: `GPUIX Diffusion desktop host does not implement ${request.channel}`,
      }
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
        (reply) => emit(MAIN_WIRE.RESPONSE, reply),
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

function emit(channel: string, payload: DesktopPayload): void {
  queueMicrotask(() => {
    for (const listener of listeners.get(channel) ?? []) listener(payload)
  })
}
