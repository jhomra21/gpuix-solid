import { createSignal, type JSX } from "solid-js"
import { ColorModeProvider, useColorMode } from "@jhomra21/gpuix-solid1/kobalte"
import * as Button from "@jhomra21/gpuix-solid1/kobalte/button"
import * as Image from "@jhomra21/gpuix-solid1/kobalte/image"
import * as Separator from "@jhomra21/gpuix-solid1/kobalte/separator"
import * as TextField from "@jhomra21/gpuix-solid1/kobalte/text-field"
import * as Tooltip from "@jhomra21/gpuix-solid1/kobalte/tooltip"
import * as Dialog from "@jhomra21/gpuix-solid1/kobalte/dialog"
import * as DropdownMenu from "@jhomra21/gpuix-solid1/kobalte/dropdown-menu"
import * as ContextMenu from "@jhomra21/gpuix-solid1/kobalte/context-menu"
import * as Menubar from "@jhomra21/gpuix-solid1/kobalte/menubar"

const colors = {
  bg: "#09090b",
  surface: "#151518",
  surface2: "#202024",
  border: "#34343a",
  text: "#fafafa",
  muted: "#a1a1aa",
  accent: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
}

const buttonStyle = {
  height: 30,
  minHeight: 30,
  paddingLeft: 10,
  paddingRight: 10,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 5,
  backgroundColor: colors.surface2,
  color: colors.text,
  gap: 6,
}

function Section(props: { title: string; children?: JSX.Element }): JSX.Element {
  return (
    <div style={{ padding: 12, gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 7, backgroundColor: colors.surface }}>
      <text style={{ fontSize: 13, lineHeight: 18, fontWeight: 700, color: colors.text }}>{props.title}</text>
      {props.children}
    </div>
  )
}

function ShowcaseBody(): JSX.Element {
  const { colorMode, toggleColorMode } = useColorMode()
  const [lastAction, setLastAction] = createSignal("Ready")
  const [name, setName] = createSignal("Synth Lead")
  const [checkbox, setCheckbox] = createSignal(true)
  const [radio, setRadio] = createSignal("beats")

  return (
    <div testId="kobalte-showcase" style={{ width: "100%", height: "100%", padding: 16, gap: 12, overflowY: "auto", backgroundColor: colors.bg, color: colors.text }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <text style={{ fontSize: 22, lineHeight: 28, fontWeight: 750, color: colors.text }}>Kobalte → GPUIX Solid 1</text>
          <text style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}>Behavior-first native compatibility fixture for the DAW primitive surface.</text>
        </div>
        <Button.Root testId="theme-toggle" onPress={toggleColorMode} style={buttonStyle}>
          <text style={{ fontSize: 12, color: colors.text }}>{`Theme: ${colorMode()}`}</text>
        </Button.Root>
      </div>

      <Menubar.Root onValueChange={(value) => setLastAction(`Menubar: ${value ?? "closed"}`)}>
        <Menubar.Menu value="file">
          <Menubar.Trigger testId="menubar-file" style={buttonStyle}><text style={{ fontSize: 12, color: colors.text }}>File</text></Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content testId="menubar-file-content">
              <Menubar.Item testId="menubar-new" onSelect={() => setLastAction("New project")}><text style={{ fontSize: 12, color: colors.text }}>New Project</text></Menubar.Item>
              <Menubar.Item onSelect={() => setLastAction("Open project")}><text style={{ fontSize: 12, color: colors.text }}>Open…</text></Menubar.Item>
              <Menubar.Separator />
              <Menubar.Sub>
                <Menubar.SubTrigger testId="menubar-export"><text style={{ fontSize: 12, color: colors.text }}>Export ▸</text></Menubar.SubTrigger>
                <Menubar.SubContent testId="menubar-export-content"><Menubar.Item onSelect={() => setLastAction("Export WAV")}><text style={{ fontSize: 12, color: colors.text }}>WAV</text></Menubar.Item></Menubar.SubContent>
              </Menubar.Sub>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
        <Menubar.Menu value="edit">
          <Menubar.Trigger testId="menubar-edit" style={buttonStyle}><text style={{ fontSize: 12, color: colors.text }}>Edit</text></Menubar.Trigger>
          <Menubar.Content testId="menubar-edit-content"><Menubar.Item onSelect={() => setLastAction("Undo")}><text style={{ fontSize: 12, color: colors.text }}>Undo</text></Menubar.Item></Menubar.Content>
        </Menubar.Menu>
      </Menubar.Root>

      <div style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "stretch" }}>
        <div style={{ flexGrow: 1, gap: 12 }}>
          <Section title="Button + Tooltip + Separator">
            <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Button.Root testId="button-action" onPress={() => setLastAction("Button pressed")} style={buttonStyle}><text style={{ fontSize: 12, color: colors.text }}>Action</text></Button.Root>
              <Button.Root testId="button-disabled" disabled style={buttonStyle}><text style={{ fontSize: 12, color: colors.muted }}>Disabled</text></Button.Root>
              <Separator.Root orientation="vertical" style={{ height: 30 }} />
              <Tooltip.Root openDelay={0} closeDelay={0} placement="top">
                <Tooltip.Trigger testId="tooltip-trigger" style={buttonStyle}><text style={{ fontSize: 12, color: colors.text }}>Hover / Focus</text></Tooltip.Trigger>
                <Tooltip.Portal><Tooltip.Content testId="tooltip-content"><text style={{ fontSize: 11, color: colors.text }}>Native anchored tooltip</text></Tooltip.Content></Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Section>

          <Section title="TextField">
            <TextField.Root value={name()} onValueChange={setName}>
              <TextField.Label>Track name</TextField.Label>
              <TextField.Input testId="text-field-input" placeholder="Track name" />
              <TextField.Description>Controlled through the Kobalte-shaped native context.</TextField.Description>
            </TextField.Root>
            <TextField.Root validationState="invalid" defaultValue="Bad route">
              <TextField.Label>Invalid field</TextField.Label>
              <TextField.Input testId="text-field-invalid" />
              <TextField.ErrorMessage testId="text-field-error">This state must remain visible.</TextField.ErrorMessage>
            </TextField.Root>
          </Section>

          <Section title="Image / Avatar + Separator">
            <div style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Image.Root testId="avatar-image" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2 }}>
                <Image.Img src="https://example.invalid/avatar.png" alt="Example" />
                <Image.Fallback><text style={{ fontSize: 12, color: colors.text }}>JM</text></Image.Fallback>
              </Image.Root>
              <Image.Root testId="avatar-fallback" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2 }}>
                <Image.Fallback testId="avatar-fallback-content"><text style={{ fontSize: 12, color: colors.text }}>FX</text></Image.Fallback>
              </Image.Root>
              <Separator.Root orientation="vertical" style={{ height: 44 }} />
              <text style={{ fontSize: 11, color: colors.muted }}>Image and deterministic fallback states</text>
            </div>
          </Section>
        </div>

        <div style={{ width: 420, minWidth: 420, gap: 12 }}>
          <Section title="DropdownMenu">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger testId="dropdown-trigger" style={buttonStyle}><text style={{ fontSize: 12, color: colors.text }}>Open menu ▾</text></DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content testId="dropdown-content">
                  <DropdownMenu.Item testId="dropdown-item" onSelect={() => setLastAction("Insert audio track")}><text style={{ fontSize: 12, color: colors.text }}>Insert Audio Track</text></DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.CheckboxItem testId="dropdown-checkbox" checked={checkbox()} onChange={setCheckbox}>
                    <DropdownMenu.ItemIndicator><text style={{ fontSize: 12, color: colors.green }}>✓</text></DropdownMenu.ItemIndicator>
                    <text style={{ fontSize: 12, color: colors.text }}>Snap to Grid</text>
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.RadioGroup value={radio()} onChange={setRadio}>
                    <DropdownMenu.RadioItem testId="radio-beats" value="beats"><DropdownMenu.ItemIndicator><text style={{ fontSize: 10, color: colors.accent }}>●</text></DropdownMenu.ItemIndicator><text style={{ fontSize: 12, color: colors.text }}>Beats</text></DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem testId="radio-time" value="time"><DropdownMenu.ItemIndicator><text style={{ fontSize: 10, color: colors.accent }}>●</text></DropdownMenu.ItemIndicator><text style={{ fontSize: 12, color: colors.text }}>Time</text></DropdownMenu.RadioItem>
                  </DropdownMenu.RadioGroup>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger testId="dropdown-sub-trigger"><text style={{ fontSize: 12, color: colors.text }}>Routing ▸</text></DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent testId="dropdown-sub-content"><DropdownMenu.Item onSelect={() => setLastAction("Master routing")}><text style={{ fontSize: 12, color: colors.text }}>Master</text></DropdownMenu.Item></DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Section>

          <Section title="ContextMenu">
            <ContextMenu.Root>
              <ContextMenu.Trigger testId="context-trigger" style={{ ...buttonStyle, justifyContent: "flex-start" }}><text style={{ fontSize: 12, color: colors.text }}>Clip context surface</text></ContextMenu.Trigger>
              <ContextMenu.Content testId="context-content">
                <ContextMenu.Item testId="context-duplicate" onSelect={() => setLastAction("Duplicate clip")}><text style={{ fontSize: 12, color: colors.text }}>Duplicate</text></ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Item onSelect={() => setLastAction("Delete clip")}><text style={{ fontSize: 12, color: colors.red }}>Delete</text></ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Root>
          </Section>

          <Section title="Dialog">
            <Dialog.Root>
              <Dialog.Trigger testId="dialog-trigger" style={buttonStyle}><text style={{ fontSize: 12, color: colors.text }}>Open dialog</text></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay testId="dialog-overlay" />
                <Dialog.Content testId="dialog-content">
                  <Dialog.Title>Export Project</Dialog.Title>
                  <Dialog.Description>Dialog state, overlay, close button and Escape/outside dismissal are native.</Dialog.Description>
                  <Dialog.CloseButton testId="dialog-close" style={buttonStyle}><text style={{ fontSize: 12, color: colors.text }}>Close</text></Dialog.CloseButton>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Section>
        </div>
      </div>

      <div style={{ padding: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
        <text style={{ fontSize: 11, color: colors.muted }}>Button · Image · Separator · TextField · Tooltip · Dialog · DropdownMenu · ContextMenu · Menubar · ColorMode</text>
        <text testId="last-action" style={{ fontSize: 11, color: colors.green }}>{lastAction()}</text>
      </div>
    </div>
  )
}

export function KobalteShowcase(): JSX.Element {
  return <ColorModeProvider initialColorMode="dark"><ShowcaseBody /></ColorModeProvider>
}
