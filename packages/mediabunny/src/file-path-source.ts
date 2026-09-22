import { PathedSource } from "mediabunny"
import {
  open,
  type FileHandle,
} from "node:fs/promises"

type InternalPathedSource = PathedSource & {
  _dispatchRead(start: number, end: number): void
}

class GpuixFilePathSource extends PathedSource {
  #handlePromise: Promise<FileHandle> | null = null
  #size: number | undefined
  #closed = false

  constructor(filePath: string) {
    super(filePath, ({ path }) => new GpuixFilePathSource(path))
  }

  #getHandle() {
    if (this.#closed) {
      throw new Error("GPUix file-path source is closed")
    }

    this.#handlePromise ??= open(this.rootPath, "r")
    return this.#handlePromise
  }

  _getFileSize() {
    return this.#size
  }

  async _read(
    start: number,
    end: number,
    _minReadPosition: number,
    _maxReadPosition: number,
  ) {
    const handle = await this.#getHandle()
    this.#size ??= (await handle.stat()).size

    if (start >= this.#size) {
      return null
    }

    const readEnd = Math.min(end, this.#size)
    if (readEnd <= start) {
      return null
    }

    const bytes = new Uint8Array(readEnd - start)
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

    ;(this as unknown as InternalPathedSource)._dispatchRead(start, readEnd)

    return {
      bytes,
      view: new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      ),
      offset: start,
    }
  }

  _dispose() {
    this.#closed = true
    const pending = this.#handlePromise
    this.#handlePromise = null
    if (pending) {
      void pending.then((handle) => handle.close()).catch(() => {})
    }
  }
}

export function createGpuixFilePathSource(
  rootPath: string,
): PathedSource {
  return new GpuixFilePathSource(rootPath)
}
