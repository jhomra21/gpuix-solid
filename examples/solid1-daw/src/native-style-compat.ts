import { nativeTailwindManifest } from "./native-tailwind.generated"

nativeTailwindManifest.classes["!cursor-pointer"] ??= {
  base: { cursor: "pointer" },
}
