import { open, type FileHandle } from "node:fs/promises"
import {
  CustomPathedSource,
  CustomSource,
  type FilePathSourceOptions,
} from "mediabunny"

function parseRootPath(value: unknown): string {
  if (Object.prototype.toString.call(value) !== "[object String]") {
    throw new TypeError("rootPath must be a string")
  }
  return value as string
}

function parseOptions(value: unknown): FilePathSourceOptions {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    throw new TypeError("options must be an object")
  }
  return value as FilePathSourceOptions
}

function createFileSource(
  filePath: string,
  options: FilePathSourceOptions,
): CustomSource {
  let handlePromise: Promise<FileHandle> | null = null
  let closed = false

  const getHandle = () => {
    if (closed) {
      throw new Error("GPUix file-path source is disposed")
    }
    handlePromise ??= open(filePath, "r")
    return handlePromise
  }

  return new CustomSource({
    async getSize() {
      const handle = await getHandle()
      return (await handle.stat()).size
    },
    async read(start, end) {
      const handle = await getHandle()
      const bytes = new Uint8Array(end - start)
      const { bytesRead } = await handle.read(
        bytes,
        0,
        bytes.byteLength,
        start,
      )
      return bytesRead === bytes.byteLength
        ? bytes
        : bytes.subarray(0, bytesRead)
    },
    dispose() {
      closed = true
      const pending = handlePromise
      handlePromise = null
      if (pending) {
        void pending.then((handle) => handle.close()).catch(() => {})
      }
    },
    prefetchProfile: "fileSystem",
    ...(options.maxCacheSize === undefined
      ? {}
      : { maxCacheSize: options.maxCacheSize }),
    ...(options.handleUnhandledError === undefined
      ? {}
      : { handleUnhandledError: options.handleUnhandledError }),
  })
}

export function createGpuixFilePathSource(
  rootPath: string,
  options: FilePathSourceOptions = {},
): CustomPathedSource {
  const parsedRootPath = parseRootPath(rootPath)
  const parsedOptions = parseOptions(options)

  return new CustomPathedSource(
    parsedRootPath,
    ({ path }) => createFileSource(path, parsedOptions),
  )
}
