import { createSignal, type JSX } from "solid-js"
import { configureNativeStyleManifest } from "@jhomra21/gpuix-solid1"
import { Button, ColorModeProvider, useColorMode } from "@jhomra21/gpuix-solid1/kobalte"
import { nativeTailwindManifest } from "./native-tailwind.generated"

configureNativeStyleManifest(nativeTailwindManifest)

export function TailwindShowcase(): JSX.Element {
  return (
    <ColorModeProvider initialColorMode="dark">
      <ShowcaseBody />
    </ColorModeProvider>
  )
}

function ShowcaseBody(): JSX.Element {
  const colorMode = useColorMode()
  const [selected, setSelected] = createSignal(false)
  const [presses, setPresses] = createSignal(0)

  return (
    <div
      testId="tailwind-root"
      class="flex bg-background text-foreground"
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 24,
        gap: 18,
      }}
    >
      <div class="flex items-center" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <text style={{ fontSize: 24, lineHeight: 30, fontWeight: 700 }}>Tailwind v4 → GPUI native styles</text>
          <text testId="tailwind-text-sm" class="text-muted-foreground text-sm">Compiler-generated classes, native hover/active state, and DAW-shaped theme tokens.</text>
        </div>
        <Button.Root
          testId="theme-toggle"
          class="flex items-center justify-center h-10 px-4 py-2 rounded-md border border-border bg-app-surface hover:bg-accent hover:text-accent-foreground cursor-pointer"
          onPress={() => colorMode.toggleColorMode()}
        >
          <text>{`Theme: ${colorMode.colorMode()}`}</text>
        </Button.Root>
      </div>

      <div
        testId="tailwind-card"
        class="flex border border-border rounded-md bg-app-surface"
        style={{ flexDirection: "column", padding: 18, gap: 12 }}
      >
        <text style={{ fontSize: 15, lineHeight: 20, fontWeight: 700 }}>Representative DAW button surface</text>
        <Button.Root
          testId="primary-action"
          class="flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground active:bg-muted cursor-pointer"
          onPress={() => setPresses((value) => value + 1)}
        >
          <text>{`Native action · ${presses()}`}</text>
        </Button.Root>
      </div>

      <div
        testId="classlist-card"
        class="flex border border-border rounded-md"
        classList={{ "bg-primary": selected(), "bg-muted": !selected() }}
        style={{ flexDirection: "column", padding: 18, gap: 10 }}
      >
        <text class={selected() ? "text-primary-foreground" : "text-foreground"}>Solid classList toggles native manifest entries reactively.</text>
        <Button.Root
          testId="classlist-toggle"
          class="flex items-center justify-center h-10 px-4 py-2 rounded-md border border-border bg-app-surface cursor-pointer"
          onPress={() => setSelected((value) => !value)}
        >
          <text>{selected() ? "Use muted state" : "Use primary state"}</text>
        </Button.Root>
      </div>

      <div
        testId="inline-precedence"
        class="bg-primary text-primary-foreground rounded-md"
        style={{ backgroundColor: "#7c3aed", padding: 14 }}
      >
        <text>Inline background wins over the generated bg-primary class.</text>
      </div>

      <text class="text-muted-foreground text-sm">
        Unsupported Tailwind CSS declarations fail manifest generation instead of silently becoming native no-ops.
      </text>
    </div>
  )
}
