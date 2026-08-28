import type { JSX } from "solid-js"
import { configureNativeStyleManifest } from "@jhomra21/gpuix-solid1"
import { ColorModeProvider, useColorMode } from "@jhomra21/gpuix-solid1/kobalte"
import { nativeKobalteManifest } from "./native-kobalte.generated"
import { BasicExample as ButtonExample } from "./upstream/kobalte/examples/button"
import { BasicExample as TooltipExample } from "./upstream/kobalte/examples/tooltip"
import { BasicExample as DialogExample } from "./upstream/kobalte/examples/dialog"
import { BasicExample as DropdownMenuExample } from "./upstream/kobalte/examples/dropdown-menu"
import { BasicExample as ContextMenuExample } from "./upstream/kobalte/examples/context-menu"
import { BasicExample as MenubarExample } from "./upstream/kobalte/examples/menubar"
import { DefaultValueExample as TextFieldExample } from "./upstream/kobalte/examples/text-field"
import { BasicExample as ImageExample } from "./upstream/kobalte/examples/image"
import { BasicExample as SeparatorExample } from "./upstream/kobalte/examples/separator"

configureNativeStyleManifest(nativeKobalteManifest)

function Section(props: { title: string; children: JSX.Element }): JSX.Element {
  return <div style={{ gap: 8, alignItems: "flex-start" }}><text style={{ fontSize: 13, fontWeight: 600 }}>{props.title}</text>{props.children}</div>
}

function Body(): JSX.Element {
  const mode = useColorMode()
  return (
    <div style={{ width: "100%", height: "100%", padding: 28, gap: 18, backgroundColor: mode.colorMode() === "dark" ? "#18181b" : "#ffffff", color: mode.colorMode() === "dark" ? "rgba(255,255,255,0.9)" : "#27272a" }}>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ gap: 3 }}><text style={{ fontSize: 24, fontWeight: 700 }}>Kobalte upstream BasicExample source</text><text style={{ fontSize: 13, opacity: 0.7 }}>Pinned verbatim source rendered through the GPUIX compatibility layer.</text></div>
        <div testId="theme-toggle" tabIndex={0} onClick={() => mode.toggleColorMode()} style={{ padding: 10, borderWidth: 1, borderColor: mode.colorMode() === "dark" ? "#3f3f46" : "#e4e4e7", borderRadius: 6 }}>{`Theme: ${mode.colorMode()}`}</div>
      </div>
      <Section title="Menubar"><div testId="upstream-menubar"><MenubarExample /></div></Section>
      <div style={{ display: "flex", flexDirection: "row", gap: 48, alignItems: "flex-start" }}>
        <div style={{ width: 560, gap: 18 }}>
          <Section title="Button"><div testId="upstream-button"><ButtonExample /></div></Section>
          <Section title="Text Field"><div testId="upstream-text-field"><TextFieldExample /></div></Section>
          <Section title="Image"><div testId="upstream-image"><ImageExample /></div></Section>
          <Section title="Tooltip"><div testId="upstream-tooltip"><TooltipExample /></div></Section>
          <Section title="Separator"><div testId="upstream-separator"><SeparatorExample /></div></Section>
        </div>
        <div style={{ width: 380, gap: 18 }}>
          <Section title="Dropdown Menu"><div testId="upstream-dropdown"><DropdownMenuExample /></div></Section>
          <Section title="Context Menu"><div testId="upstream-context"><ContextMenuExample /></div></Section>
          <Section title="Dialog"><div testId="upstream-dialog"><DialogExample /></div></Section>
        </div>
      </div>
    </div>
  )
}

export function UpstreamKobalteShowcase(): JSX.Element {
  return <ColorModeProvider initialColorMode="dark"><Body /></ColorModeProvider>
}
