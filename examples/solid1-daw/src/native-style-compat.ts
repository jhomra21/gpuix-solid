import { registerCssVariableLinearGradient } from "./compat/gpuix-solid-canvas"
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

// The exact source .mixer-volume-slider CSS paints a hard split whose position
// is driven by --mixer-volume-percent. GPUIX 0.7 can represent that base layer
// as a two-stop native linear gradient, so keep the copied component/CSS intact
// and translate only this browser custom-property dependency at the renderer edge.
registerCssVariableLinearGradient({
  className: "mixer-volume-slider",
  property: "--mixer-volume-percent",
  angle: 90,
  colorSpace: "srgb",
  light: {
    from: "#b55000",
    to: "#71717b",
  },
  dark: {
    from: "#fac547",
    to: "#9f9fa9",
  },
})
