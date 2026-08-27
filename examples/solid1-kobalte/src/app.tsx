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

type Palette = {
  bg: string
  surface: string
  surface2: string
  field: string
  border: string
  text: string
  muted: string
  hover: string
  accent: string
  green: string
  red: string
  overlay: string
}

const darkPalette: Palette = {
  bg: "#09090b",
  surface: "#151518",
  surface2: "#202024",
  field: "#0d0d0f",
  border: "#34343a",
  text: "#fafafa",
  muted: "#a1a1aa",
  hover: "#2a2a30",
  accent: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  overlay: "#00000088",
}

const lightPalette: Palette = {
  bg: "#f5f5f7",
  surface: "#ffffff",
  surface2: "#eeeef2",
  field: "#ffffff",
  border: "#d1d1d6",
  text: "#1d1d1f",
  muted: "#6e6e73",
  hover: "#e5e5ea",
  accent: "#2563eb",
  green: "#15803d",
  red: "#d70015",
  overlay: "#00000044",
}

function usePalette(): () => Palette {
  const { colorMode } = useColorMode()
  return () => colorMode() === "light" ? lightPalette : darkPalette
}

function Section(props: { title: string; children?: JSX.Element }): JSX.Element {
  const palette = usePalette()
  return (
    <div style={{ padding: 12, gap: 9, borderWidth: 1, borderColor: palette().border, borderRadius: 7, backgroundColor: palette().surface }}>
      <text style={{ fontSize: 13, lineHeight: 18, fontWeight: 700, color: palette().text }}>{props.title}</text>
      {props.children}
    </div>
  )
}

function ShowcaseBody(): JSX.Element {
  const { colorMode, toggleColorMode } = useColorMode()
  const palette = usePalette()
  const [lastAction, setLastAction] = createSignal("Ready")
  const [name, setName] = createSignal("Synth Lead")
  const [checkbox, setCheckbox] = createSignal(true)
  const [radio, setRadio] = createSignal("beats")

  const buttonStyle = () => ({
    height: 30,
    minHeight: 30,
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: palette().border,
    borderRadius: 5,
    backgroundColor: palette().surface2,
    color: palette().text,
    gap: 6,
  })
  const fieldStyle = () => ({
    backgroundColor: palette().field,
    color: palette().text,
    borderColor: palette().border,
  })
  const popupStyle = () => ({
    backgroundColor: palette().surface,
    color: palette().text,
    borderColor: palette().border,
  })
  const menuItemStyle = () => ({ hover: { backgroundColor: palette().hover } })
  const separatorStyle = () => ({ backgroundColor: palette().border })

  return (
    <div testId="kobalte-showcase" style={{ width: "100%", height: "100%", padding: 16, gap: 12, overflowY: "auto", backgroundColor: palette().bg, color: palette().text }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <text style={{ fontSize: 22, lineHeight: 28, fontWeight: 700, color: palette().text }}>Kobalte → GPUIX Solid 1</text>
          <text style={{ fontSize: 12, lineHeight: 17, color: palette().muted }}>Behavior-first native compatibility fixture for the DAW primitive surface.</text>
        </div>
        <Button.Root testId="theme-toggle" onPress={toggleColorMode} style={buttonStyle()}>
          <text style={{ fontSize: 12, color: palette().text }}>{`Theme: ${colorMode()}`}</text>
        </Button.Root>
      </div>

      <Menubar.Root onValueChange={(value) => { if (value != null) setLastAction(`Menubar: ${value}`) }}>
        <Menubar.Menu value="file">
          <Menubar.Trigger testId="menubar-file" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>File</text></Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content testId="menubar-file-content" style={popupStyle()}>
              <Menubar.Item testId="menubar-new" style={menuItemStyle()} onSelect={() => setLastAction("New project")}><text style={{ fontSize: 12, color: palette().text }}>New Project</text></Menubar.Item>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Open project")}><text style={{ fontSize: 12, color: palette().text }}>Open…</text></Menubar.Item>
              <Menubar.Separator style={separatorStyle()} />
              <Menubar.Sub>
                <Menubar.SubTrigger testId="menubar-export" style={menuItemStyle()}><text style={{ fontSize: 12, color: palette().text }}>Export ▸</text></Menubar.SubTrigger>
                <Menubar.SubContent testId="menubar-export-content" style={popupStyle()}><Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Export WAV")}><text style={{ fontSize: 12, color: palette().text }}>WAV</text></Menubar.Item></Menubar.SubContent>
              </Menubar.Sub>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
        <Menubar.Menu value="edit">
          <Menubar.Trigger testId="menubar-edit" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Edit</text></Menubar.Trigger>
          <Menubar.Content testId="menubar-edit-content" style={popupStyle()}><Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Undo")}><text style={{ fontSize: 12, color: palette().text }}>Undo</text></Menubar.Item></Menubar.Content>
        </Menubar.Menu>
      </Menubar.Root>

      <div style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "stretch" }}>
        <div style={{ flexGrow: 1, gap: 12 }}>
          <Section title="Button + Tooltip + Separator">
            <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Button.Root testId="button-action" onPress={() => setLastAction("Button pressed")} style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Action</text></Button.Root>
              <Button.Root testId="button-disabled" disabled style={buttonStyle()}><text style={{ fontSize: 12, color: palette().muted }}>Disabled</text></Button.Root>
              <Separator.Root orientation="vertical" style={{ height: 30, backgroundColor: palette().border }} />
              <Tooltip.Root openDelay={0} closeDelay={0} placement="top">
                <Tooltip.Trigger testId="tooltip-trigger" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Hover / Focus</text></Tooltip.Trigger>
                <Tooltip.Portal><Tooltip.Content testId="tooltip-content" style={popupStyle()}><text style={{ fontSize: 11, color: palette().text }}>Native anchored tooltip</text></Tooltip.Content></Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Section>

          <Section title="TextField">
            <TextField.Root value={name()} onValueChange={setName}>
              <TextField.Label style={{ color: palette().text }}>Track name</TextField.Label>
              <TextField.Input testId="text-field-input" placeholder="Track name" style={fieldStyle()} />
              <TextField.Description style={{ color: palette().muted }}>Controlled through the Kobalte-shaped native context.</TextField.Description>
            </TextField.Root>
            <TextField.Root validationState="invalid" defaultValue="Bad route">
              <TextField.Label style={{ color: palette().text }}>Invalid field</TextField.Label>
              <TextField.Input testId="text-field-invalid" style={{ ...fieldStyle(), borderColor: palette().red }} />
              <TextField.ErrorMessage testId="text-field-error" style={{ color: palette().red }}>This state must remain visible.</TextField.ErrorMessage>
            </TextField.Root>
          </Section>

          <Section title="Image / Avatar + Separator">
            <div style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Image.Root testId="avatar-jm" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette().surface2 }}>
                <Image.Fallback testId="avatar-jm-content"><text style={{ fontSize: 12, color: palette().text }}>JM</text></Image.Fallback>
              </Image.Root>
              <Image.Root testId="avatar-fallback" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette().surface2 }}>
                <Image.Fallback testId="avatar-fallback-content"><text style={{ fontSize: 12, color: palette().text }}>FX</text></Image.Fallback>
              </Image.Root>
              <Separator.Root orientation="vertical" style={{ height: 44, backgroundColor: palette().border }} />
              <text style={{ fontSize: 11, color: palette().muted }}>Deterministic native avatar fallback states</text>
            </div>
          </Section>
        </div>

        <div style={{ width: 420, minWidth: 420, gap: 12 }}>
          <Section title="DropdownMenu">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger testId="dropdown-trigger" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Open menu ▾</text></DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content testId="dropdown-content" style={popupStyle()}>
                  <DropdownMenu.Item testId="dropdown-item" style={menuItemStyle()} onSelect={() => setLastAction("Insert audio track")}><text style={{ fontSize: 12, color: palette().text }}>Insert Audio Track</text></DropdownMenu.Item>
                  <DropdownMenu.Separator style={separatorStyle()} />
                  <DropdownMenu.CheckboxItem testId="dropdown-checkbox" style={menuItemStyle()} checked={checkbox()} onChange={setCheckbox}>
                    <DropdownMenu.ItemIndicator testId="dropdown-checkbox-indicator"><text style={{ fontSize: 12, color: palette().green }}>✓</text></DropdownMenu.ItemIndicator>
                    <text style={{ fontSize: 12, color: palette().text }}>Snap to Grid</text>
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.RadioGroup value={radio()} onChange={setRadio}>
                    <DropdownMenu.RadioItem testId="radio-beats" style={menuItemStyle()} value="beats"><DropdownMenu.ItemIndicator testId="radio-beats-indicator"><text style={{ fontSize: 10, color: palette().accent }}>●</text></DropdownMenu.ItemIndicator><text style={{ fontSize: 12, color: palette().text }}>Beats</text></DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem testId="radio-time" style={menuItemStyle()} value="time"><DropdownMenu.ItemIndicator testId="radio-time-indicator"><text style={{ fontSize: 10, color: palette().accent }}>●</text></DropdownMenu.ItemIndicator><text style={{ fontSize: 12, color: palette().text }}>Time</text></DropdownMenu.RadioItem>
                  </DropdownMenu.RadioGroup>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger testId="dropdown-sub-trigger" style={menuItemStyle()}><text style={{ fontSize: 12, color: palette().text }}>Routing ▸</text></DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent testId="dropdown-sub-content" style={popupStyle()}><DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Master routing")}><text style={{ fontSize: 12, color: palette().text }}>Master</text></DropdownMenu.Item></DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Section>

          <Section title="ContextMenu">
            <ContextMenu.Root>
              <ContextMenu.Trigger testId="context-trigger" style={{ ...buttonStyle(), justifyContent: "flex-start" }}><text style={{ fontSize: 12, color: palette().text }}>Right-click clip context surface</text></ContextMenu.Trigger>
              <ContextMenu.Content testId="context-content" style={popupStyle()}>
                <ContextMenu.Item testId="context-duplicate" style={menuItemStyle()} onSelect={() => setLastAction("Duplicate clip")}><text style={{ fontSize: 12, color: palette().text }}>Duplicate</text></ContextMenu.Item>
                <ContextMenu.Separator style={separatorStyle()} />
                <ContextMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Delete clip")}><text style={{ fontSize: 12, color: palette().red }}>Delete</text></ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Root>
          </Section>

          <Section title="Dialog">
            <Dialog.Root>
              <Dialog.Trigger testId="dialog-trigger" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Open dialog</text></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay testId="dialog-overlay" style={{ backgroundColor: palette().overlay }} />
                <Dialog.Content testId="dialog-content" style={popupStyle()}>
                  <Dialog.Title style={{ color: palette().text }}>Export Project</Dialog.Title>
                  <Dialog.Description style={{ color: palette().muted }}>Dialog state, overlay, close button and Escape/outside dismissal are native.</Dialog.Description>
                  <Dialog.CloseButton testId="dialog-close" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Close</text></Dialog.CloseButton>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Section>
        </div>
      </div>

      <div style={{ padding: 10, borderWidth: 1, borderColor: palette().border, backgroundColor: palette().surface, display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
        <text style={{ fontSize: 11, color: palette().muted }}>Button · Image · Separator · TextField · Tooltip · Dialog · DropdownMenu · ContextMenu · Menubar · ColorMode</text>
        <text testId="last-action" style={{ fontSize: 11, color: palette().green }}>{lastAction()}</text>
      </div>
    </div>
  )
}

export function KobalteShowcase(): JSX.Element {
  return <ColorModeProvider initialColorMode="dark"><ShowcaseBody /></ColorModeProvider>
}
