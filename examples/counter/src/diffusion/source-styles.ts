import { configureNativeStyleManifest, type NativeStyleManifest } from "gpuix-solid"

const manifest: NativeStyleManifest = {
  classes: {
    "h-12": { base: { height: 48 } },
    "shrink-0": { base: { flexShrink: 0 } },
    flex: { base: { display: "flex", flexDirection: "row" } },
    "items-center": { base: { alignItems: "center" } },
    "px-4": { base: { paddingLeft: 16, paddingRight: 16 } },
    "text-[12px]": { base: { fontSize: 12 } },
    "font-450": { base: { fontWeight: 450 } },
    "text-foreground": { base: { color: "#F2F2F2" } },
    "ml-auto": {},
    "gap-0": { base: { gap: 0 } },
    "text-muted-foreground": { base: { color: "#F2F2F2A3" } },
    "px-0": { base: { paddingLeft: 0, paddingRight: 0 } },
    relative: { base: { position: "relative" } },
    "z-30": {},
    "size-6": { base: { width: 24, height: 24 } },
    "w-40": { base: { width: 160 } },
  },
}

configureNativeStyleManifest(manifest)
