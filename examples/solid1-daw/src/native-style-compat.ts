import { registerCssVariableHardSplit } from "./compat/gpuix-solid-canvas"
import { nativeTailwindManifest } from "./native-tailwind.generated"

nativeTailwindManifest.classes["!cursor-pointer"] ??= {
  base: { cursor: "pointer" },
}

nativeTailwindManifest.classes["[&_svg]:pointer-events-none"] ??= {
  descendants: { svg: { base: { pointerEvents: "none" } } },
}
nativeTailwindManifest.classes["[&_svg]:size-4"] ??= {
  descendants: { svg: { base: { width: 16, height: 16 } } },
}
nativeTailwindManifest.classes["[&_svg]:shrink-0"] ??= {
  descendants: { svg: { base: { flexShrink: 0 } } },
}

// The exact source .mixer-volume-slider CSS paints a two-color hard split whose
// position is driven by --mixer-volume-percent. Published GPUIX 0.7 retains but
// does not paint its linear-gradient background, so preserve the copied source
// and translate only that paint primitive to a muted base plus retained fill.
registerCssVariableHardSplit({
  property: "--mixer-volume-percent",
  light: {
    from: "#b55000",
    to: "#71717b",
  },
  dark: {
    from: "#fac547",
    to: "#9f9fa9",
  },
})
