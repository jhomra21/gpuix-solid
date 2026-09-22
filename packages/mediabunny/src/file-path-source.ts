import {
  CustomPathedSource,
  Source,
} from "mediabunny"
import {
  open,
  type FileHandle,
} from "node:fs/promises"

class GpuixDirectFileSource extends Source {
  readonly #filePath: string
  #handlePromise: Promise<FileHandle> | null = null
  #fileSize: number | undefined
  #closed = false

  constructor(filePath: string) {
    super()
    this.#filePath = filePath
  }

  async #getHandle(): Promise<FileHandle> {
    if (this.#closed) {
      throw new Error("GPUix file-path source is closed")
    }

    this.#handlePromise ??= open(this.#filePath, "r")
    return this.#handlePromise
  }

  override _getFileSize(): number | undefined {
    return this.#fileSize
  }

  override async _read(start: number, end: number) {
    const handle = await this.#getHandle()
    if (this.#fileSize === undefined) {
      this.#fileSize = (await handle.stat()).size
    }

    if (start < 0 || end <= start || end > this.#fileSize) {
      return null
    }

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
        return null
      }
      offset += bytesRead
    }

    this._dispatchRead(start, end)
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

  override _dispose(): void {
    if (this.#closed) return
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
): CustomPathedSource {
  return new CustomPathedSource(
    rootPath,
    ({ path }) => new GpuixDirectFileSource(path).ref(),
  )
}
