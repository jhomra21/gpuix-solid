import { registerProresDecoder } from "@mediabunny/prores"
import { registerMediabunnyServer, type MediabunnyServerOptions } from "@mediabunny/server"
import { VideoSample } from "mediabunny"
import { installNapiCanvasGlobals } from "./napi-canvas-globals.js"
import { installGpuixCanvasSinkBridge } from "./gpuix-canvas-sink.js"
import {
  getVideoToolboxVideoSampleResource,
  registerVideoToolboxMediaDecoder,
} from "./videotoolbox-mediabunny.js"

export type GpuixVideoFrameRenderer = {
  getVideoFrameIosurfaceVersion(): number | null
  setVideoFrameIosurface(elementId: number, handle: Uint8Array): void
  setVideoFrameBgra(
    elementId: number,
    width: number,
    height: number,
    data: Uint8Array,
  ): void
}

export type GpuixMediaBunnyRegistration = {
  videoToolbox: boolean
  serverFallback: true
}

let registered = false
let registration: GpuixMediaBunnyRegistration | undefined

export function registerGpuixMediaBunny(
  serverOptions: MediabunnyServerOptions = {},
): GpuixMediaBunnyRegistration {
  if (registered && registration) return registration

  installNapiCanvasGlobals()
  installGpuixCanvasSinkBridge()

  const videoToolbox = registerVideoToolboxMediaDecoder()
  registerProresDecoder()
  registerMediabunnyServer(serverOptions)

  registration = {
    videoToolbox,
    serverFallback: true,
  }
  registered = true
  return registration
}

export type MediaBunnyGpuixPresentation = {
  path: "iosurface" | "bgra"
  width: number
  height: number
  bytes: number
}

export class MediaBunnyGpuixPresenter {
  #bgra = new Uint8Array(0)

  constructor(
    readonly renderer: GpuixVideoFrameRenderer,
    readonly elementId: number,
  ) {}

  async present(sample: VideoSample): Promise<MediaBunnyGpuixPresentation> {
    const native = getVideoToolboxVideoSampleResource(sample)
    if (
      native
      && this.renderer.getVideoFrameIosurfaceVersion() === 1
    ) {
      const handle = native.iosurfaceHandle
      this.renderer.setVideoFrameIosurface(this.elementId, handle)
      return {
        path: "iosurface",
        width: sample.codedWidth,
        height: sample.codedHeight,
        bytes: handle.byteLength,
      }
    }

    const required = sample.allocationSize({ format: "BGRA" })
    if (this.#bgra.byteLength < required) {
      this.#bgra = new Uint8Array(required)
    }

    const destination = this.#bgra.subarray(0, required)
    await sample.copyTo(destination, { format: "BGRA" })
    this.renderer.setVideoFrameBgra(
      this.elementId,
      sample.codedWidth,
      sample.codedHeight,
      destination,
    )

    return {
      path: "bgra",
      width: sample.codedWidth,
      height: sample.codedHeight,
      bytes: required,
    }
  }
}


export {
  VideoToolboxMediaDecoder,
  VideoToolboxVideoSampleResource,
  getVideoToolboxVideoSampleResource,
  registerVideoToolboxMediaDecoder,
  type NativeVideoToolboxFrame,
} from "./videotoolbox-mediabunny.js"
export { installGpuixCanvasSinkBridge } from "./gpuix-canvas-sink.js"
export { createGpuixFilePathSource } from "./file-path-source.js"
export { installNapiCanvasGlobals } from "./napi-canvas-globals.js"
