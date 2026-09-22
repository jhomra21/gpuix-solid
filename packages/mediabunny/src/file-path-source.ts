import { open, type FileHandle } from "node:fs/promises"
import {
  CustomPathedSource,
  CustomSource,
  type FilePathSourceOptions,
} from "mediabunny"

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
    maxCacheSize: options.maxCacheSize,
    prefetchProfile: "fileSystem",
    handleUnhandledError: options.handleUnhandledError,
  })
}

export function createGpuixFilePathSource(
  rootPath: string,
  options: FilePathSourceOptions = {},
): CustomPathedSource {
  if (typeof rootPath !== "string") {
    throw new TypeError("rootPath must be a string")
  }
  if (!options || typeof options !== "object") {
    throw new TypeError("options must be an object")
  }

  return new CustomPathedSource(
    rootPath,
    ({ path }) => createFileSource(path, options),
  )
}
