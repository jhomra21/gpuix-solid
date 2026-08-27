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
