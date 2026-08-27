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
  border: string
  text: string
  muted: string
  subtle: string
  accent: string
  accentHover: string
  accentActive: string
  menubar: string
  imageFallback: string
  imageFallbackText: string
  tooltip: string
  tooltipText: string
  red: string
  overlay: string
}

const darkPalette: Palette = {
  bg: "#18181b",
  surface: "#27272a",
  border: "#3f3f46",
  text: "rgba(255, 255, 255, 0.9)",
  muted: "#a1a1aa",
  subtle: "#71717a",
  accent: "#0369a0",
  accentHover: "#0284c5",
  accentActive: "#0da2e7",
  menubar: "#27272a",
  imageFallback: "#0c4a6e",
  imageFallbackText: "#3abff8",
  tooltip: "rgba(255, 255, 255, 0.9)",
  tooltipText: "#27272a",
  red: "#dc2828",
  overlay: "rgba(0, 0, 0, 0.2)",
}

const lightPalette: Palette = {
  bg: "#ffffff",
  surface: "#ffffff",
  border: "#e4e4e7",
  text: "#27272a",
  muted: "#3f3f46",
  subtle: "#71717a",
  accent: "#0284c5",
  accentHover: "#0369a0",
  accentActive: "#075783",
  menubar: "#f6f6f7",
  imageFallback: "#e1f3fe",
  imageFallbackText: "#0369a0",
  tooltip: "#27272a",
  tooltipText: "#ffffff",
  red: "#dc2828",
  overlay: "rgba(0, 0, 0, 0.2)",
}

function usePalette(): () => Palette {
  const { colorMode } = useColorMode()
  return () => colorMode() === "light" ? lightPalette : darkPalette
}

function Section(props: { title: string; children?: JSX.Element }): JSX.Element {
  const palette = usePalette()
  return (
    <div style={{ padding: 20, gap: 14, borderWidth: 1, borderColor: palette().border, borderRadius: 8, backgroundColor: palette().surface }}>
      <text style={{ fontSize: 15, lineHeight: 20, fontWeight: 600, color: palette().text }}>{props.title}</text>
      {props.children}
    </div>
  )
}

function ShowcaseBody(): JSX.Element {
  const { colorMode, toggleColorMode } = useColorMode()
  const palette = usePalette()
  const [lastAction, setLastAction] = createSignal("Ready")
  const [name, setName] = createSignal("Apple")
  const [checkbox, setCheckbox] = createSignal(true)
  const [radio, setRadio] = createSignal("main")

  const light = () => colorMode() === "light"
  const buttonTextColor = () => light() ? "#ffffff" : "rgba(255, 255, 255, 0.9)"
  const buttonStyle = () => ({
    height: 40,
    minHeight: 40,
    paddingLeft: 16,
    paddingRight: 16,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: palette().accent,
    color: buttonTextColor(),
    hover: { backgroundColor: palette().accentHover },
    active: { backgroundColor: palette().accentActive },
  })
  const buttonTextStyle = () => ({ fontSize: 16, lineHeight: 20, color: buttonTextColor() })
  const shadow = (large = false) => light()
    ? { offsetX: 0, offsetY: large ? 10 : 4, blurRadius: large ? 15 : 6, spreadRadius: large ? -3 : -1, color: "rgba(0, 0, 0, 0.1)" }
    : { offsetX: 0, offsetY: 0, blurRadius: 0, spreadRadius: 0, color: "rgba(0, 0, 0, 0)" }
  const fieldStyle = (invalid = false) => ({
    width: 200,
    minHeight: 34,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: invalid ? palette().red : (light() ? palette().border : "#52525b"),
    borderRadius: 6,
    backgroundColor: palette().surface,
    color: invalid ? palette().red : palette().text,
    fontSize: 16,
    hover: { borderColor: light() ? "#a1a1aa" : "#71717a" },
  })
  const popupStyle = () => ({
    minWidth: 220,
    padding: 8,
    backgroundColor: palette().surface,
    color: palette().text,
    borderWidth: 1,
    borderColor: light() ? palette().border : "#3f3f46",
    borderRadius: 6,
    boxShadow: shadow(),
  })
  const menuItemStyle = () => ({
    height: 32,
    minHeight: 32,
    paddingLeft: 24,
    paddingRight: 8,
    borderRadius: 4,
    color: palette().text,
    fontSize: 16,
    hover: { backgroundColor: "#0284c5", color: "#ffffff" },
  })
  const separatorStyle = () => ({
    height: 1,
    marginTop: 6,
    marginBottom: 6,
    marginLeft: 6,
    marginRight: 6,
    backgroundColor: light() ? palette().border : "#52525b",
  })
  const indicatorStyle = () => ({ display: "flex", width: 20, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center" })
  const menubarTriggerStyle = (edge: "first" | "last") => ({
    height: 40,
    minHeight: 40,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: palette().menubar,
    color: palette().text,
    fontSize: 16,
    ...(edge === "first"
      ? { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }
      : { borderTopRightRadius: 4, borderBottomRightRadius: 4 }),
    hover: { backgroundColor: palette().accent, color: buttonTextColor() },
  })

  return (
    <div testId="kobalte-showcase" style={{ width: "100%", height: "100%", padding: 28, gap: 20, overflowY: "auto", backgroundColor: palette().bg, color: palette().text }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div style={{ gap: 4 }}>
          <text style={{ fontSize: 24, lineHeight: 30, fontWeight: 700, color: palette().text }}>Kobalte BasicExample parity</text>
          <text style={{ fontSize: 14, lineHeight: 20, color: palette().muted }}>Native GPUIX rendering matched to the component examples on kobalte.dev.</text>
        </div>
        <Button.Root testId="theme-toggle" onPress={toggleColorMode} style={buttonStyle()}>
          <text style={buttonTextStyle()}>{`Theme: ${colorMode()}`}</text>
        </Button.Root>
      </div>

      <Section title="Menubar">
        <Menubar.Root onValueChange={(value) => { if (value != null) setLastAction(`Menubar: ${value}`) }}>
          <Menubar.Menu value="file">
            <Menubar.Trigger testId="menubar-file" style={menubarTriggerStyle("first")}><text style={{ fontSize: 16, color: palette().text }}>Git</text></Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content testId="menubar-file-content" style={popupStyle()}>
                <Menubar.Item testId="menubar-new" style={menuItemStyle()} onSelect={() => setLastAction("Commit")}><text style={{ fontSize: 16, color: palette().text }}>Commit</text></Menubar.Item>
                <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Push")}><text style={{ fontSize: 16, color: palette().text }}>Push</text></Menubar.Item>
                <Menubar.Separator style={separatorStyle()} />
                <Menubar.Sub>
                  <Menubar.SubTrigger testId="menubar-export" style={menuItemStyle()}><text style={{ fontSize: 16, color: palette().text }}>GitHub  ›</text></Menubar.SubTrigger>
                  <Menubar.SubContent testId="menubar-export-content" style={popupStyle()}>
                    <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Create Pull Request")}><text style={{ fontSize: 16, color: palette().text }}>Create Pull Request…</text></Menubar.Item>
                  </Menubar.SubContent>
                </Menubar.Sub>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
          <Menubar.Menu value="edit">
            <Menubar.Trigger testId="menubar-edit" style={menubarTriggerStyle("last")}><text style={{ fontSize: 16, color: palette().text }}>Edit</text></Menubar.Trigger>
            <Menubar.Content testId="menubar-edit-content" style={popupStyle()}>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Cut")}><text style={{ fontSize: 16, color: palette().text }}>Cut</text></Menubar.Item>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Copy")}><text style={{ fontSize: 16, color: palette().text }}>Copy</text></Menubar.Item>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Paste")}><text style={{ fontSize: 16, color: palette().text }}>Paste</text></Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>
        </Menubar.Root>
      </Section>

      <div style={{ display: "flex", flexDirection: "row", gap: 16, alignItems: "stretch" }}>
        <div style={{ flexGrow: 1, gap: 16 }}>
          <Section title="Button + Tooltip + Separator">
            <div style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Button.Root testId="button-action" onPress={() => setLastAction("Button pressed")} style={buttonStyle()}><text style={buttonTextStyle()}>Click me</text></Button.Root>
              <Button.Root testId="button-disabled" disabled style={{ ...buttonStyle(), opacity: 0.5 }}><text style={buttonTextStyle()}>Disabled</text></Button.Root>
              <Separator.Root orientation="vertical" style={{ width: 1, height: 40, backgroundColor: light() ? palette().border : "#52525b" }} />
              <Tooltip.Root openDelay={0} closeDelay={0} placement="top">
                <Tooltip.Trigger testId="tooltip-trigger" style={buttonStyle()}><text style={buttonTextStyle()}>Trigger</text></Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content testId="tooltip-content" style={{ maxWidth: 380, padding: 8, borderWidth: 1, borderColor: light() ? "#d4d4d8" : "#3f3f46", borderRadius: 6, backgroundColor: palette().tooltip, color: palette().tooltipText, boxShadow: shadow(true) }}>
                    <text style={{ fontSize: 14, color: palette().tooltipText }}>Tooltip content</text>
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Section>

          <Section title="Text Field">
            <div style={{ display: "flex", flexDirection: "row", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
              <TextField.Root value={name()} onValueChange={setName}>
                <TextField.Label style={{ color: light() ? "#18181b" : "#d4d4d8", fontSize: 14, fontWeight: 500 }}>Favorite fruit</TextField.Label>
                <TextField.Input testId="text-field-input" placeholder="Apple" style={fieldStyle()} />
                <TextField.Description style={{ color: light() ? "#3f3f46" : "#a1a1aa", fontSize: 12 }}>Enter your favorite fruit.</TextField.Description>
              </TextField.Root>
              <TextField.Root validationState="invalid" defaultValue="Bad route">
                <TextField.Label style={{ color: light() ? "#18181b" : "#d4d4d8", fontSize: 14, fontWeight: 500 }}>Invalid field</TextField.Label>
                <TextField.Input testId="text-field-invalid" style={fieldStyle(true)} />
                <TextField.ErrorMessage testId="text-field-error" style={{ color: palette().red, fontSize: 12 }}>A valid value is required.</TextField.ErrorMessage>
              </TextField.Root>
            </div>
          </Section>

          <Section title="Image + Separator">
            <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Image.Root testId="avatar-jm" style={{ width: 56, height: 56, borderRadius: 28, overflow: "hidden", backgroundColor: palette().imageFallback }}>
                <Image.Fallback testId="avatar-jm-content" style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: palette().imageFallback }}><text style={{ fontSize: 16, lineHeight: 20, fontWeight: 500, color: palette().imageFallbackText }}>KB</text></Image.Fallback>
              </Image.Root>
              <Image.Root testId="avatar-fallback" style={{ width: 56, height: 56, borderRadius: 28, overflow: "hidden", backgroundColor: palette().imageFallback }}>
                <Image.Fallback testId="avatar-fallback-content" style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: palette().imageFallback }}><text style={{ fontSize: 16, lineHeight: 20, fontWeight: 500, color: palette().imageFallbackText }}>J</text></Image.Fallback>
              </Image.Root>
              <Separator.Root orientation="vertical" style={{ width: 1, height: 56, marginLeft: 8, marginRight: 8, backgroundColor: light() ? palette().border : "#52525b" }} />
              <text style={{ fontSize: 12, color: palette().muted }}>56px circular Kobalte fallback treatment</text>
            </div>
          </Section>
        </div>

        <div style={{ width: 430, minWidth: 430, gap: 16 }}>
          <Section title="Dropdown Menu">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger testId="dropdown-trigger" style={buttonStyle()}><text style={buttonTextStyle()}>Git Settings ⌄</text></DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content testId="dropdown-content" style={popupStyle()}>
                  <DropdownMenu.Item testId="dropdown-item" style={menuItemStyle()} onSelect={() => setLastAction("Commit")}><text style={{ fontSize: 16, color: palette().text }}>Commit</text></DropdownMenu.Item>
                  <DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Push")}><text style={{ fontSize: 16, color: palette().text }}>Push</text></DropdownMenu.Item>
                  <DropdownMenu.Separator style={separatorStyle()} />
                  <DropdownMenu.CheckboxItem testId="dropdown-checkbox" style={menuItemStyle()} checked={checkbox()} onChange={setCheckbox}>
                    <DropdownMenu.ItemIndicator testId="dropdown-checkbox-indicator" style={indicatorStyle()}><text style={{ fontSize: 14, color: palette().text }}>✓</text></DropdownMenu.ItemIndicator>
                    <text style={{ fontSize: 16, color: palette().text }}>Show Git Log</text>
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.RadioGroup value={radio()} onChange={setRadio}>
                    <DropdownMenu.RadioItem testId="radio-beats" style={menuItemStyle()} value="main"><DropdownMenu.ItemIndicator testId="radio-beats-indicator" style={indicatorStyle()}><text style={{ fontSize: 12, color: palette().text }}>●</text></DropdownMenu.ItemIndicator><text style={{ fontSize: 16, color: palette().text }}>main</text></DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem testId="radio-time" style={menuItemStyle()} value="develop"><DropdownMenu.ItemIndicator testId="radio-time-indicator" style={indicatorStyle()}><text style={{ fontSize: 12, color: palette().text }}>●</text></DropdownMenu.ItemIndicator><text style={{ fontSize: 16, color: palette().text }}>develop</text></DropdownMenu.RadioItem>
                  </DropdownMenu.RadioGroup>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger testId="dropdown-sub-trigger" style={menuItemStyle()}><text style={{ fontSize: 16, color: palette().text }}>GitHub  ›</text></DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent testId="dropdown-sub-content" style={popupStyle()}>
                      <DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Create Pull Request")}><text style={{ fontSize: 16, color: palette().text }}>Create Pull Request…</text></DropdownMenu.Item>
                      <DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("View Pull Requests")}><text style={{ fontSize: 16, color: palette().text }}>View Pull Requests</text></DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Section>

          <Section title="Context Menu">
            <ContextMenu.Root>
              <ContextMenu.Trigger testId="context-trigger" style={{ width: 300, height: 105, minHeight: 105, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: light() ? "#71717a" : "rgba(255, 255, 255, 0.5)", borderRadius: 4, color: light() ? "#52525b" : "rgba(255, 255, 255, 0.7)", userSelect: "none" }}>
                <text style={{ fontSize: 15, color: light() ? "#52525b" : "rgba(255, 255, 255, 0.7)" }}>Right click here.</text>
              </ContextMenu.Trigger>
              <ContextMenu.Content testId="context-content" style={popupStyle()}>
                <ContextMenu.Item testId="context-duplicate" style={menuItemStyle()} onSelect={() => setLastAction("Commit")}><text style={{ fontSize: 16, color: palette().text }}>Commit</text></ContextMenu.Item>
                <ContextMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Push")}><text style={{ fontSize: 16, color: palette().text }}>Push</text></ContextMenu.Item>
                <ContextMenu.Separator style={separatorStyle()} />
                <ContextMenu.Item style={menuItemStyle()} disabled><text style={{ fontSize: 16, color: palette().subtle }}>Update Project</text></ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Root>
          </Section>

          <Section title="Dialog">
            <Dialog.Root>
              <Dialog.Trigger testId="dialog-trigger" style={buttonStyle()}><text style={buttonTextStyle()}>Open</text></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay testId="dialog-overlay" style={{ backgroundColor: palette().overlay }} />
                <Dialog.Content testId="dialog-content" style={{ width: 500, padding: 16, gap: 12, backgroundColor: palette().surface, color: palette().text, borderWidth: 1, borderColor: light() ? "#d4d4d8" : "#3f3f46", borderRadius: 6, boxShadow: shadow(true) }}>
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Dialog.Title style={{ fontSize: 20, lineHeight: 26, fontWeight: 500, color: light() ? "#18181b" : "rgba(255, 255, 255, 0.9)" }}>About Kobalte</Dialog.Title>
                    <Dialog.CloseButton testId="dialog-close" style={{ width: 25, height: 25, minWidth: 25, minHeight: 25, borderRadius: 4, color: light() ? "#52525b" : "rgba(255, 255, 255, 0.8)", hover: { backgroundColor: light() ? "#f4f4f5" : "#3f3f46" } }}><text style={{ fontSize: 18, color: light() ? "#52525b" : "rgba(255, 255, 255, 0.8)" }}>×</text></Dialog.CloseButton>
                  </div>
                  <Dialog.Description style={{ fontSize: 16, lineHeight: 23, color: light() ? "#3f3f46" : "rgba(255, 255, 255, 0.7)" }}>
                    Kobalte is a UI toolkit for building accessible web apps and design systems with SolidJS. It provides low-level UI components and primitives for design systems.
                  </Dialog.Description>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Section>
        </div>
      </div>

      <div style={{ paddingTop: 2, display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 20 }}>
        <text style={{ fontSize: 12, color: palette().subtle }}>Reference: kobalte.dev BasicExample styles · Button · Image · TextField · Tooltip · Dialog · menus</text>
        <text testId="last-action" style={{ fontSize: 12, color: palette().imageFallbackText }}>{lastAction()}</text>
      </div>
    </div>
  )
}

export function KobalteShowcase(): JSX.Element {
  return <ColorModeProvider initialColorMode="dark"><ShowcaseBody /></ColorModeProvider>
}
