import { For, createSignal, type JSX } from "solid-js"
import {
  Button,
  ColorModeProvider,
  ContextMenu,
  Dialog,
  DropdownMenu,
  Image,
  Menubar,
  Separator,
  TextField,
  Tooltip,
  useColorMode,
} from "@jhomra21/gpuix-solid1/kobalte"

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

type SupportEntry = {
  id: string
  name: string
  parts: string
  behavior: string
}

const supportEntries: SupportEntry[] = [
  { id: "button", name: "Button", parts: "Root", behavior: "press · disabled · keyboard" },
  { id: "image", name: "Image", parts: "Root · Img · Fallback", behavior: "source · fallback" },
  { id: "separator", name: "Separator", parts: "Root", behavior: "horizontal · vertical" },
  { id: "text-field", name: "TextField", parts: "Root · Label · Input · TextArea · Description · ErrorMessage", behavior: "controlled · invalid · disabled" },
  { id: "tooltip", name: "Tooltip", parts: "Root · Trigger · Portal · Content", behavior: "hover · focus · escape" },
  { id: "dialog", name: "Dialog", parts: "Root · Trigger · Portal · Overlay · Content · CloseButton · Title · Description", behavior: "open · overlay · escape · close" },
  { id: "dropdown", name: "DropdownMenu", parts: "15 exported parts", behavior: "items · groups · checkbox · radio · submenu" },
  { id: "context", name: "ContextMenu", parts: "11 exported parts", behavior: "right click · groups · disabled · submenu" },
  { id: "menubar", name: "Menubar", parts: "10 exported parts", behavior: "menus · disabled · submenu" },
  { id: "color", name: "ColorMode", parts: "Provider · hook", behavior: "dark · light · native style mode" },
]

const sourceAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZwsAAAAASUVORK5CYII="

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

function Section(props: { title: string; caption?: string; children?: JSX.Element }): JSX.Element {
  const palette = usePalette()
  return (
    <div style={{ padding: 12, gap: 9, borderWidth: 1, borderColor: palette().border, borderRadius: 7, backgroundColor: palette().surface }}>
      <div style={{ gap: 2 }}>
        <text style={{ fontSize: 13, lineHeight: 18, fontWeight: 700, color: palette().text }}>{props.title}</text>
        {props.caption ? <text style={{ fontSize: 10, lineHeight: 14, color: palette().muted }}>{props.caption}</text> : null}
      </div>
      {props.children}
    </div>
  )
}

function SupportMatrix(): JSX.Element {
  const palette = usePalette()
  return (
    <Section title="Published compatibility matrix" caption="Every adapter exported from the Solid 1 Kobalte barrel is represented below and exercised by the native test.">
      <div testId="support-matrix" style={{ display: "grid", gridTemplateColumns: 2, gap: 6 }}>
        <For each={supportEntries}>
          {(entry) => (
            <div
              testId={`support-${entry.id}`}
              style={{
                minHeight: 50,
                padding: 8,
                borderWidth: 1,
                borderColor: palette().border,
                borderRadius: 5,
                backgroundColor: palette().surface2,
                gap: 2,
              }}
            >
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <text style={{ fontSize: 11, lineHeight: 15, fontWeight: 700, color: palette().text }}>{entry.name}</text>
                <text style={{ fontSize: 9, lineHeight: 13, fontWeight: 700, color: palette().green }}>SUPPORTED</text>
              </div>
              <text style={{ fontSize: 9, lineHeight: 13, color: palette().muted }}>{entry.parts}</text>
              <text style={{ fontSize: 9, lineHeight: 13, color: palette().muted }}>{entry.behavior}</text>
            </div>
          )}
        </For>
      </div>
    </Section>
  )
}

function ShowcaseBody(): JSX.Element {
  const { colorMode, toggleColorMode } = useColorMode()
  const palette = usePalette()
  const [lastAction, setLastAction] = createSignal("Ready")
  const [name, setName] = createSignal("Synth Lead")
  const [notes, setNotes] = createSignal("Automation notes")
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
        <div style={{ gap: 2 }}>
          <text style={{ fontSize: 22, lineHeight: 28, fontWeight: 700, color: palette().text }}>Kobalte compatibility gallery</text>
          <text style={{ fontSize: 12, lineHeight: 17, color: palette().muted }}>Root-barrel API · native behavior · visible state coverage · Solid 1 + GPUIX</text>
        </div>
        <Button.Root testId="theme-toggle" onPress={toggleColorMode} style={buttonStyle()}>
          <text style={{ fontSize: 12, color: palette().text }}>{`Theme: ${colorMode()}`}</text>
        </Button.Root>
      </div>

      <SupportMatrix />

      <Menubar.Root testId="menubar-root" onValueChange={(value) => { if (value != null) setLastAction(`Menubar: ${value}`) }}>
        <Menubar.Menu value="file">
          <Menubar.Trigger testId="menubar-file" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>File</text></Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content testId="menubar-file-content" style={popupStyle()}>
              <Menubar.Item testId="menubar-new" style={menuItemStyle()} onSelect={() => setLastAction("New project")}><text style={{ fontSize: 12, color: palette().text }}>New Project</text></Menubar.Item>
              <Menubar.Item testId="menubar-disabled" disabled style={menuItemStyle()} onSelect={() => setLastAction("Disabled menubar item fired")}><text style={{ fontSize: 12, color: palette().muted }}>Unavailable command</text></Menubar.Item>
              <Menubar.Separator style={separatorStyle()} />
              <Menubar.Sub>
                <Menubar.SubTrigger testId="menubar-export" style={menuItemStyle()}><text style={{ fontSize: 12, color: palette().text }}>Export ▸</text></Menubar.SubTrigger>
                <Menubar.SubContent testId="menubar-export-content" style={popupStyle()}>
                  <Menubar.Item testId="menubar-export-wav" style={menuItemStyle()} onSelect={() => setLastAction("Export WAV")}><text style={{ fontSize: 12, color: palette().text }}>WAV</text></Menubar.Item>
                </Menubar.SubContent>
              </Menubar.Sub>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
        <Menubar.Menu value="edit">
          <Menubar.Trigger testId="menubar-edit" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Edit</text></Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content testId="menubar-edit-content" style={popupStyle()}>
              <Menubar.Item testId="menubar-undo" style={menuItemStyle()} onSelect={() => setLastAction("Undo")}><text style={{ fontSize: 12, color: palette().text }}>Undo</text></Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      </Menubar.Root>

      <div style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "stretch" }}>
        <div style={{ flexGrow: 1, gap: 12 }}>
          <Section title="Button" caption="Pointer, disabled and keyboard activation states.">
            <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Button.Root testId="button-action" onPress={() => setLastAction("Button pressed")} style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Action</text></Button.Root>
              <Button.Root testId="button-disabled" disabled onPress={() => setLastAction("Disabled button fired")} style={buttonStyle()}><text style={{ fontSize: 12, color: palette().muted }}>Disabled</text></Button.Root>
              <Button.Root testId="button-keyboard" onPress={() => setLastAction("Keyboard button pressed")} style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Enter / Space</text></Button.Root>
            </div>
          </Section>

          <Section title="TextField" caption="Input, TextArea, validation and disabled state all share one Kobalte-shaped context.">
            <TextField.Root value={name()} onValueChange={setName}>
              <TextField.Label testId="text-field-label" style={{ color: palette().text }}>Track name</TextField.Label>
              <TextField.Input testId="text-field-input" placeholder="Track name" style={fieldStyle()} />
              <TextField.Description testId="text-field-description" style={{ color: palette().muted }}>Controlled through the native context.</TextField.Description>
            </TextField.Root>
            <TextField.Root value={notes()} onValueChange={setNotes}>
              <TextField.Label style={{ color: palette().text }}>Notes</TextField.Label>
              <TextField.TextArea testId="text-field-textarea" minRows={3} maxRows={5} style={fieldStyle()} />
            </TextField.Root>
            <TextField.Root validationState="invalid" defaultValue="Bad route">
              <TextField.Label style={{ color: palette().text }}>Invalid field</TextField.Label>
              <TextField.Input testId="text-field-invalid" style={{ ...fieldStyle(), borderColor: palette().red }} />
              <TextField.ErrorMessage testId="text-field-error" style={{ color: palette().red }}>This state must remain visible.</TextField.ErrorMessage>
            </TextField.Root>
            <TextField.Root disabled defaultValue="Locked value">
              <TextField.Label style={{ color: palette().muted }}>Disabled field</TextField.Label>
              <TextField.Input testId="text-field-disabled" style={fieldStyle()} />
            </TextField.Root>
          </Section>

          <Section title="Image + Separator" caption="Both real-source and deterministic fallback paths are represented.">
            <div style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Image.Root testId="avatar-source" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette().surface2 }}>
                <Image.Img testId="avatar-source-img" src={sourceAvatar} alt="Loaded source" />
                <Image.Fallback testId="avatar-source-fallback"><text style={{ fontSize: 12, color: palette().text }}>NO</text></Image.Fallback>
              </Image.Root>
              <Image.Root testId="avatar-fallback" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette().surface2 }}>
                <Image.Fallback testId="avatar-fallback-content"><text style={{ fontSize: 12, color: palette().text }}>FX</text></Image.Fallback>
              </Image.Root>
              <Separator.Root testId="separator-vertical" orientation="vertical" style={{ height: 44, backgroundColor: palette().border }} />
              <div style={{ flexGrow: 1, gap: 6 }}>
                <text style={{ fontSize: 11, color: palette().muted }}>Source image + no-source fallback</text>
                <Separator.Root testId="separator-horizontal" orientation="horizontal" style={{ backgroundColor: palette().border }} />
              </div>
            </div>
          </Section>

          <Section title="Tooltip" caption="Anchored native floating layer with hover, focus and Escape behavior.">
            <Tooltip.Root openDelay={0} closeDelay={0} placement="top">
              <Tooltip.Trigger testId="tooltip-trigger" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Hover / Focus</text></Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content testId="tooltip-content" style={popupStyle()}><text style={{ fontSize: 11, color: palette().text }}>Native anchored tooltip</text></Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Section>
        </div>

        <div style={{ width: 430, minWidth: 430, gap: 12 }}>
          <Section title="DropdownMenu" caption="Group label, disabled item, checkbox, radio group and nested submenu.">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger testId="dropdown-trigger" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Open menu ▾</text></DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content testId="dropdown-content" style={popupStyle()}>
                  <DropdownMenu.Group>
                    <DropdownMenu.GroupLabel testId="dropdown-group-label" style={{ color: palette().muted }}>Tracks</DropdownMenu.GroupLabel>
                    <DropdownMenu.Item testId="dropdown-item" style={menuItemStyle()} onSelect={() => setLastAction("Insert audio track")}><text style={{ fontSize: 12, color: palette().text }}>Insert Audio Track</text></DropdownMenu.Item>
                    <DropdownMenu.Item testId="dropdown-disabled" disabled style={menuItemStyle()} onSelect={() => setLastAction("Disabled dropdown item fired")}><text style={{ fontSize: 12, color: palette().muted }}>Unavailable Track</text></DropdownMenu.Item>
                  </DropdownMenu.Group>
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
                    <DropdownMenu.SubContent testId="dropdown-sub-content" style={popupStyle()}>
                      <DropdownMenu.Item testId="dropdown-sub-master" style={menuItemStyle()} onSelect={() => setLastAction("Master routing")}><text style={{ fontSize: 12, color: palette().text }}>Master</text></DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Section>

          <Section title="ContextMenu" caption="Right-click positioning, group label, disabled command and submenu.">
            <ContextMenu.Root>
              <ContextMenu.Trigger testId="context-trigger" style={{ ...buttonStyle(), justifyContent: "flex-start" }}><text style={{ fontSize: 12, color: palette().text }}>Right-click clip context surface</text></ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content testId="context-content" style={popupStyle()}>
                  <ContextMenu.Group>
                    <ContextMenu.GroupLabel testId="context-group-label" style={{ color: palette().muted }}>Clip</ContextMenu.GroupLabel>
                    <ContextMenu.Item testId="context-duplicate" style={menuItemStyle()} onSelect={() => setLastAction("Duplicate clip")}><text style={{ fontSize: 12, color: palette().text }}>Duplicate</text></ContextMenu.Item>
                    <ContextMenu.Item testId="context-disabled" disabled style={menuItemStyle()} onSelect={() => setLastAction("Disabled context item fired")}><text style={{ fontSize: 12, color: palette().muted }}>Consolidate unavailable</text></ContextMenu.Item>
                  </ContextMenu.Group>
                  <ContextMenu.Separator style={separatorStyle()} />
                  <ContextMenu.Sub>
                    <ContextMenu.SubTrigger testId="context-sub-trigger" style={menuItemStyle()}><text style={{ fontSize: 12, color: palette().text }}>Color ▸</text></ContextMenu.SubTrigger>
                    <ContextMenu.SubContent testId="context-sub-content" style={popupStyle()}>
                      <ContextMenu.Item testId="context-sub-blue" style={menuItemStyle()} onSelect={() => setLastAction("Blue clip")}><text style={{ fontSize: 12, color: palette().accent }}>Blue</text></ContextMenu.Item>
                    </ContextMenu.SubContent>
                  </ContextMenu.Sub>
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu.Root>
          </Section>

          <Section title="Dialog" caption="Overlay, content, semantic title/description, close button and Escape dismissal.">
            <Dialog.Root>
              <Dialog.Trigger testId="dialog-trigger" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Open dialog</text></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay testId="dialog-overlay" style={{ backgroundColor: palette().overlay }} />
                <Dialog.Content testId="dialog-content" style={popupStyle()}>
                  <Dialog.Title testId="dialog-title" style={{ color: palette().text }}>Export Project</Dialog.Title>
                  <Dialog.Description testId="dialog-description" style={{ color: palette().muted }}>Dialog state, overlay, close button and Escape/outside dismissal are native.</Dialog.Description>
                  <Dialog.CloseButton testId="dialog-close" style={buttonStyle()}><text style={{ fontSize: 12, color: palette().text }}>Close</text></Dialog.CloseButton>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Section>
        </div>
      </div>

      <div style={{ padding: 10, borderWidth: 1, borderColor: palette().border, backgroundColor: palette().surface, display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
        <text testId="support-summary" style={{ fontSize: 11, color: palette().muted }}>{`${supportEntries.length} published compatibility areas · root barrel + native states`}</text>
        <text testId="last-action" style={{ fontSize: 11, color: palette().green }}>{lastAction()}</text>
      </div>
    </div>
  )
}

export function KobalteShowcase(): JSX.Element {
  return <ColorModeProvider initialColorMode="dark"><ShowcaseBody /></ColorModeProvider>
}
