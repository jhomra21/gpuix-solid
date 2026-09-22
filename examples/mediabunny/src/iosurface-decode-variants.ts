export type IosurfaceDecodeVariant = {
  key: string
  label: string
  env: Record<string, string>
}

export const iosurfaceDecodeVariants: readonly IosurfaceDecodeVariant[] = [
  { key: "baseline", label: "baseline", env: {} },
  { key: "packet-view", label: "packet Buffer view", env: { GPUIX_MEDIA_PACKET_VIEW: "1" } },
  { key: "sync", label: "sync codec calls", env: { GPUIX_MEDIA_SYNC_CODEC_CALLS: "1" } },
  { key: "batch-2", label: "packet batch 2", env: { GPUIX_MEDIA_PACKET_BATCH: "2" } },
  { key: "batch-4", label: "packet batch 4", env: { GPUIX_MEDIA_PACKET_BATCH: "4" } },
  { key: "batch-8", label: "packet batch 8", env: { GPUIX_MEDIA_PACKET_BATCH: "8" } },
  { key: "batch-16", label: "packet batch 16", env: { GPUIX_MEDIA_PACKET_BATCH: "16" } },
  { key: "batch-40", label: "packet batch 40", env: { GPUIX_MEDIA_PACKET_BATCH: "40" } },
  {
    key: "batch-8-fast-first",
    label: "batch 8, fast first frame",
    env: {
      GPUIX_MEDIA_PACKET_BATCH: "8",
      GPUIX_MEDIA_FAST_FIRST_FRAME: "1",
    },
  },
  {
    key: "batch-40-fast-first",
    label: "batch 40, fast first frame",
    env: {
      GPUIX_MEDIA_PACKET_BATCH: "40",
      GPUIX_MEDIA_FAST_FIRST_FRAME: "1",
    },
  },
  { key: "extra-2", label: "+2 hardware frames", env: { GPUIX_MEDIA_EXTRA_HW_FRAMES: "2" } },
  {
    key: "batch-8-extra-2",
    label: "batch 8 +2 hardware frames",
    env: {
      GPUIX_MEDIA_PACKET_BATCH: "8",
      GPUIX_MEDIA_EXTRA_HW_FRAMES: "2",
    },
  },
]
