import {
  CustomSource,
  PathedSource,
} from "mediabunny"
import {
  open,
  type FileHandle,
} from "node:fs/promises"

class GpuixFilePathSource extends PathedSource {
  #source: CustomSource

  constructor(filePath: string) {
    super(filePath, ({ path }) => new GpuixFilePathSource(path))

    let handlePromise: Promise<FileHandle> | null = null
    let closed = false

    const getHandle = () => {
      if (closed) {
        throw new Error("GPUix file-path source is closed")
      }
      handlePromise ??= open(filePath, "r")
      return handlePromise
    }

    this.#source = new CustomSource({
      async getSize() {
        return (await (await getHandle()).stat()).size
      },
      async read(start, end) {
        const handle = await getHandle()
        const bytes = new Uint8Array(end - start)
        let offset = 0

        while (offset < bytes.byteLength) {
          const { bytesRead } = await handle.read(
            bytes,
            offset,
            bytes.byteLength - offset,
            start + offset,
          )
          if (bytesRead === 0) {
            throw new Error(
              "GPUix file-path source reached EOF before completing the requested range",
            )
          }
          offset += bytesRead
        }

        return bytes
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
    })
  }

  override _read(
    start: number,
    end: number,
    minReadPosition: number,
    maxReadPosition: number,
  ) {
    return this.#source._read(
      start,
      end,
      minReadPosition,
      maxReadPosition,
    )
  }

  override _getFileSize() {
    return this.#source._getFileSize()
  }

  override _dispose() {
    this.#source._dispose()
  }
}

export function createGpuixFilePathSource(
  rootPath: string,
): PathedSource {
  return new GpuixFilePathSource(rootPath)
}
