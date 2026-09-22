import { open, type FileHandle } from "node:fs/promises"
import {
  CustomPathedSource,
  CustomSource,
  type CustomSourceOptions,
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

  const sourceOptions: CustomSourceOptions = {
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
  }

  if (options.maxCacheSize !== undefined) {
    sourceOptions.maxCacheSize = options.maxCacheSize
  }
  if (options.handleUnhandledError !== undefined) {
    sourceOptions.handleUnhandledError = options.handleUnhandledError
  }

  return new CustomSource(sourceOptions)
}

export function createGpuixFilePathSource(
  rootPath: string,
  options: FilePathSourceOptions = {},
): CustomPathedSource {
  return new CustomPathedSource(
    rootPath,
    ({ path }) => createFileSource(path, options),
  )
}
