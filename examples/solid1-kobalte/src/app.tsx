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
  muted: "#52525b",
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

function Demo(props: { title: string; children?: JSX.Element }): JSX.Element {
  const palette = usePalette()
  return (
    <div style={{ gap: 9, alignItems: "flex-start" }}>
      <text style={{ fontSize: 13, lineHeight: 18, fontWeight: 600, color: palette().muted }}>{props.title}</text>
      {props.children}
    </div>
  )
}

function ChevronDown(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style={{ width: 20, height: 20 }}>
      <path d="m6 8 4 4 4-4" />
    </svg>
  )
}

function ChevronRight(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style={{ width: 20, height: 20 }}>
      <path d="m8 6 4 4-4 4" />
    </svg>
  )
}

function CheckIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" style={{ width: 16, height: 16 }}>
      <path d="m5 10 3 3 7-7" />
    </svg>
  )
}

function CloseIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style={{ width: 20, height: 20 }}>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  )
}

function DashedContextFrame(props: { color: string }): JSX.Element {
  const horizontal = [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275]
  const vertical = [21, 42, 63, 84]
  return (
    <>
      <div testId="context-dash-top-0" style={{ position: "absolute", top: 0, left: 0, width: 15, height: 2, backgroundColor: props.color, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 15, height: 2, backgroundColor: props.color, pointerEvents: "none" }} />
      {horizontal.map((left) => (
        <>
          <div style={{ position: "absolute", top: 0, left, width: 15, height: 2, backgroundColor: props.color, pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left, width: 15, height: 2, backgroundColor: props.color, pointerEvents: "none" }} />
        </>
      ))}
      <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: 12, backgroundColor: props.color, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: 2, height: 12, backgroundColor: props.color, pointerEvents: "none" }} />
      {vertical.map((top) => (
        <>
          <div style={{ position: "absolute", top, left: 0, width: 2, height: 12, backgroundColor: props.color, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top, right: 0, width: 2, height: 12, backgroundColor: props.color, pointerEvents: "none" }} />
        </>
      ))}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 2, height: 12, backgroundColor: props.color, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 2, height: 12, backgroundColor: props.color, pointerEvents: "none" }} />
    </>
  )
}

function ShowcaseBody(): JSX.Element {
  const { colorMode, toggleColorMode } = useColorMode()
  const palette = usePalette()
  const [lastAction, setLastAction] = createSignal("Ready")
  const [name, setName] = createSignal("Apple")
  const [checkbox, setCheckbox] = createSignal(true)
  const [history, setHistory] = createSignal(false)
  const [radio, setRadio] = createSignal("main")

  const light = () => colorMode() === "light"
  const buttonTextColor = () => light() ? "#ffffff" : "rgba(255, 255, 255, 0.9)"
  const contextBorder = () => light() ? "#71717a" : "rgba(255, 255, 255, 0.5)"
  const buttonStyle = () => ({
    alignSelf: "flex-start",
    flexShrink: 0,
    height: 40,
    minHeight: 40,
    paddingLeft: 16,
    paddingRight: 16,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: palette().accent,
    color: buttonTextColor(),
    gap: 8,
    hover: { backgroundColor: palette().accentHover },
    active: { backgroundColor: palette().accentActive },
  })
  const themeToggleStyle = () => ({
    height: 30,
    minHeight: 30,
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: palette().border,
    borderRadius: 6,
    backgroundColor: palette().surface,
    color: palette().muted,
    hover: { backgroundColor: palette().menubar },
  })
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
  const indicatorStyle = () => ({ display: "flex", width: 20, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", color: palette().text })
  const shortcutStyle = () => ({ flexGrow: 1, textAlign: "right", paddingLeft: 20, fontSize: 14, color: palette().subtle })
  const menubarTriggerStyle = (edge: "first" | "middle" | "last") => ({
    height: 40,
    minHeight: 40,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: palette().menubar,
    color: palette().text,
    fontSize: 16,
    ...(edge === "first"
      ? { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }
      : edge === "last"
        ? { borderTopRightRadius: 4, borderBottomRightRadius: 4 }
        : {}),
    hover: { backgroundColor: palette().accent, color: buttonTextColor() },
  })

  return (
    <div testId="kobalte-showcase" style={{ width: "100%", height: "100%", padding: 32, gap: 26, overflowY: "auto", backgroundColor: palette().bg, color: palette().text }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div style={{ gap: 3 }}>
          <text style={{ fontSize: 22, lineHeight: 28, fontWeight: 700, color: palette().text }}>Kobalte component examples</text>
          <text style={{ fontSize: 13, lineHeight: 18, color: palette().muted }}>The same BasicExample visuals, rendered natively through GPUIX.</text>
        </div>
        <Button.Root testId="theme-toggle" onPress={toggleColorMode} style={themeToggleStyle()}>
          <text style={{ fontSize: 12, color: palette().muted }}>{`Theme: ${colorMode()}`}</text>
        </Button.Root>
      </div>

      <div style={{ width: "100%", alignItems: "center", gap: 9 }}>
        <text style={{ fontSize: 13, lineHeight: 18, fontWeight: 600, color: palette().muted }}>Menubar</text>
        <Menubar.Root testId="menubar-root" style={{ justifyContent: "center", gap: 0 }} onValueChange={(value) => { if (value != null) setLastAction(`Menubar: ${value}`) }}>
          <Menubar.Menu value="git">
            <Menubar.Trigger testId="menubar-file" style={menubarTriggerStyle("first")}><text style={{ fontSize: 16 }}>Git</text></Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content testId="menubar-file-content" style={popupStyle()}>
                <Menubar.Item testId="menubar-new" style={menuItemStyle()} onSelect={() => setLastAction("Commit")}>
                  <text style={{ fontSize: 16 }}>Commit</text><text style={shortcutStyle()}>⌘+K</text>
                </Menubar.Item>
                <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Push")}><text style={{ fontSize: 16 }}>Push</text><text style={shortcutStyle()}>⇧+⌘+K</text></Menubar.Item>
                <Menubar.Item disabled style={menuItemStyle()}><text style={{ fontSize: 16 }}>Update Project</text><text style={shortcutStyle()}>⌘+T</text></Menubar.Item>
                <Menubar.Sub>
                  <Menubar.SubTrigger testId="menubar-export" style={{ ...menuItemStyle(), justifyContent: "space-between" }}><text style={{ fontSize: 16 }}>GitHub</text><ChevronRight /></Menubar.SubTrigger>
                  <Menubar.SubContent testId="menubar-export-content" style={popupStyle()}>
                    <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Create Pull Request")}><text style={{ fontSize: 16 }}>Create Pull Request…</text></Menubar.Item>
                    <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("View Pull Requests")}><text style={{ fontSize: 16 }}>View Pull Requests</text></Menubar.Item>
                    <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Sync Fork")}><text style={{ fontSize: 16 }}>Sync Fork</text></Menubar.Item>
                    <Menubar.Separator style={separatorStyle()} />
                    <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Open on GitHub")}><text style={{ fontSize: 16 }}>Open on GitHub</text></Menubar.Item>
                  </Menubar.SubContent>
                </Menubar.Sub>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
          <Menubar.Menu value="file">
            <Menubar.Trigger testId="menubar-middle-file" style={menubarTriggerStyle("middle")}><text style={{ fontSize: 16 }}>File</text></Menubar.Trigger>
            <Menubar.Content style={popupStyle()}>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("New Tab")}><text style={{ fontSize: 16 }}>New Tab</text><text style={shortcutStyle()}>⌘+T</text></Menubar.Item>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("New Window")}><text style={{ fontSize: 16 }}>New Window</text><text style={shortcutStyle()}>⌘+N</text></Menubar.Item>
              <Menubar.Item disabled style={menuItemStyle()}><text style={{ fontSize: 16 }}>New Incognito Window</text></Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>
          <Menubar.Menu value="edit">
            <Menubar.Trigger testId="menubar-edit" style={menubarTriggerStyle("last")}><text style={{ fontSize: 16 }}>Edit</text></Menubar.Trigger>
            <Menubar.Content testId="menubar-edit-content" style={popupStyle()}>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Undo")}><text style={{ fontSize: 16 }}>Undo</text><text style={shortcutStyle()}>⌘+Z</text></Menubar.Item>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Redo")}><text style={{ fontSize: 16 }}>Redo</text><text style={shortcutStyle()}>⇧+⌘+Z</text></Menubar.Item>
              <Menubar.Separator style={separatorStyle()} />
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Cut")}><text style={{ fontSize: 16 }}>Cut</text></Menubar.Item>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Copy")}><text style={{ fontSize: 16 }}>Copy</text></Menubar.Item>
              <Menubar.Item style={menuItemStyle()} onSelect={() => setLastAction("Paste")}><text style={{ fontSize: 16 }}>Paste</text></Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>
        </Menubar.Root>
      </div>

      <Separator.Root style={{ width: "100%", height: 1, backgroundColor: palette().border }} />

      <div style={{ display: "flex", flexDirection: "row", gap: 72, alignItems: "flex-start" }}>
        <div style={{ flexGrow: 1, gap: 34, alignItems: "flex-start" }}>
          <Demo title="Button">
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
              <Button.Root testId="button-action" onPress={() => setLastAction("Button pressed")} style={buttonStyle()}><text style={{ fontSize: 16, color: buttonTextColor() }}>Click me</text></Button.Root>
            </div>
          </Demo>

          <Demo title="Text Field">
            <div style={{ display: "flex", flexDirection: "row", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
              <TextField.Root value={name()} onValueChange={setName} style={{ gap: 4, alignItems: "flex-start" }}>
                <TextField.Label style={{ color: light() ? "#18181b" : "#d4d4d8", fontSize: 14, lineHeight: 18, fontWeight: 500 }}>Favorite fruit</TextField.Label>
                <TextField.Input testId="text-field-input" placeholder="Apple" style={fieldStyle()} />
                <TextField.Description style={{ color: light() ? "#3f3f46" : "#a1a1aa", fontSize: 12, lineHeight: 16 }}>Enter your favorite fruit.</TextField.Description>
              </TextField.Root>
              <TextField.Root validationState="invalid" defaultValue="Bad route" style={{ gap: 4, alignItems: "flex-start" }}>
                <TextField.Label style={{ color: light() ? "#18181b" : "#d4d4d8", fontSize: 14, lineHeight: 18, fontWeight: 500 }}>Invalid field</TextField.Label>
                <TextField.Input testId="text-field-invalid" style={fieldStyle(true)} />
                <TextField.ErrorMessage testId="text-field-error" style={{ color: palette().red, fontSize: 12, lineHeight: 16 }}>A valid value is required.</TextField.ErrorMessage>
              </TextField.Root>
            </div>
          </Demo>

          <Demo title="Image">
            <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Image.Root testId="avatar-jm" style={{ width: 56, height: 56, borderRadius: 28, overflow: "hidden", backgroundColor: palette().imageFallback }}>
                <Image.Fallback testId="avatar-jm-content" style={{ width: "100%", height: "100%", borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: palette().imageFallback }}><text style={{ fontSize: 16, lineHeight: 20, fontWeight: 500, color: palette().imageFallbackText }}>KB</text></Image.Fallback>
              </Image.Root>
              <Image.Root testId="avatar-fallback" style={{ width: 56, height: 56, borderRadius: 28, overflow: "hidden", backgroundColor: palette().imageFallback }}>
                <Image.Fallback testId="avatar-fallback-content" style={{ width: "100%", height: "100%", borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: palette().imageFallback }}><text style={{ fontSize: 16, lineHeight: 20, fontWeight: 500, color: palette().imageFallbackText }}>J</text></Image.Fallback>
              </Image.Root>
            </div>
          </Demo>

          <Demo title="Tooltip">
            <Tooltip.Root openDelay={0} closeDelay={0} placement="top">
              <Tooltip.Trigger testId="tooltip-trigger" style={buttonStyle()}><text style={{ fontSize: 16, color: buttonTextColor() }}>Trigger</text></Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content testId="tooltip-content" style={{ maxWidth: 380, padding: 8, borderWidth: 1, borderColor: light() ? "#d4d4d8" : "#3f3f46", borderRadius: 6, backgroundColor: palette().tooltip, color: palette().tooltipText, boxShadow: shadow(true) }}>
                  <text style={{ fontSize: 14, color: palette().tooltipText }}>Tooltip content</text>
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Demo>
        </div>

        <div style={{ width: 390, minWidth: 390, gap: 34, alignItems: "flex-start" }}>
          <Demo title="Dropdown Menu">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger testId="dropdown-trigger" style={buttonStyle()}><text style={{ fontSize: 16, color: buttonTextColor() }}>Git Settings</text><ChevronDown /></DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content testId="dropdown-content" style={popupStyle()}>
                  <DropdownMenu.Item testId="dropdown-item" style={menuItemStyle()} onSelect={() => setLastAction("Commit")}><text style={{ fontSize: 16 }}>Commit</text><text style={shortcutStyle()}>⌘+K</text></DropdownMenu.Item>
                  <DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Push")}><text style={{ fontSize: 16 }}>Push</text><text style={shortcutStyle()}>⇧+⌘+K</text></DropdownMenu.Item>
                  <DropdownMenu.Item disabled style={menuItemStyle()}><text style={{ fontSize: 16 }}>Update Project</text><text style={shortcutStyle()}>⌘+T</text></DropdownMenu.Item>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger testId="dropdown-sub-trigger" style={{ ...menuItemStyle(), justifyContent: "space-between" }}><text style={{ fontSize: 16 }}>GitHub</text><ChevronRight /></DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent testId="dropdown-sub-content" style={popupStyle()}>
                      <DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Create Pull Request")}><text style={{ fontSize: 16 }}>Create Pull Request…</text></DropdownMenu.Item>
                      <DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("View Pull Requests")}><text style={{ fontSize: 16 }}>View Pull Requests</text></DropdownMenu.Item>
                      <DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Sync Fork")}><text style={{ fontSize: 16 }}>Sync Fork</text></DropdownMenu.Item>
                      <DropdownMenu.Separator style={separatorStyle()} />
                      <DropdownMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Open on GitHub")}><text style={{ fontSize: 16 }}>Open on GitHub</text></DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                  <DropdownMenu.Separator style={separatorStyle()} />
                  <DropdownMenu.CheckboxItem testId="dropdown-checkbox" style={menuItemStyle()} checked={checkbox()} onChange={setCheckbox}>
                    <DropdownMenu.ItemIndicator testId="dropdown-checkbox-indicator" style={indicatorStyle()}><CheckIcon /></DropdownMenu.ItemIndicator>
                    <text style={{ fontSize: 16 }}>Show Git Log</text>
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.CheckboxItem style={menuItemStyle()} checked={history()} onChange={setHistory}>
                    <DropdownMenu.ItemIndicator style={indicatorStyle()}><CheckIcon /></DropdownMenu.ItemIndicator>
                    <text style={{ fontSize: 16 }}>Show History</text>
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.Separator style={separatorStyle()} />
                  <DropdownMenu.Group>
                    <DropdownMenu.GroupLabel style={{ fontSize: 14, lineHeight: 20, color: palette().subtle, paddingLeft: 24, paddingRight: 8 }}>Branches</DropdownMenu.GroupLabel>
                    <DropdownMenu.RadioGroup value={radio()} onChange={setRadio}>
                      <DropdownMenu.RadioItem testId="radio-beats" style={menuItemStyle()} value="main"><DropdownMenu.ItemIndicator testId="radio-beats-indicator" style={indicatorStyle()}><text style={{ fontSize: 12 }}>●</text></DropdownMenu.ItemIndicator><text style={{ fontSize: 16 }}>main</text></DropdownMenu.RadioItem>
                      <DropdownMenu.RadioItem testId="radio-time" style={menuItemStyle()} value="develop"><DropdownMenu.ItemIndicator testId="radio-time-indicator" style={indicatorStyle()}><text style={{ fontSize: 12 }}>●</text></DropdownMenu.ItemIndicator><text style={{ fontSize: 16 }}>develop</text></DropdownMenu.RadioItem>
                    </DropdownMenu.RadioGroup>
                  </DropdownMenu.Group>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Demo>

          <Demo title="Context Menu">
            <ContextMenu.Root>
              <ContextMenu.Trigger testId="context-trigger" style={{ position: "relative", display: "flex", flexDirection: "row", width: 300, height: 105, minHeight: 105, alignItems: "center", justifyContent: "center", borderRadius: 4, color: light() ? "#52525b" : "rgba(255, 255, 255, 0.7)", userSelect: "none" }}>
                <DashedContextFrame color={contextBorder()} />
                <text testId="context-trigger-label" style={{ fontSize: 15, color: light() ? "#52525b" : "rgba(255, 255, 255, 0.7)" }}>Right click here.</text>
              </ContextMenu.Trigger>
              <ContextMenu.Content testId="context-content" style={popupStyle()}>
                <ContextMenu.Item testId="context-duplicate" style={menuItemStyle()} onSelect={() => setLastAction("Commit")}><text style={{ fontSize: 16 }}>Commit</text><text style={shortcutStyle()}>⌘+K</text></ContextMenu.Item>
                <ContextMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Push")}><text style={{ fontSize: 16 }}>Push</text><text style={shortcutStyle()}>⇧+⌘+K</text></ContextMenu.Item>
                <ContextMenu.Item disabled style={menuItemStyle()}><text style={{ fontSize: 16 }}>Update Project</text><text style={shortcutStyle()}>⌘+T</text></ContextMenu.Item>
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger style={{ ...menuItemStyle(), justifyContent: "space-between" }}><text style={{ fontSize: 16 }}>GitHub</text><ChevronRight /></ContextMenu.SubTrigger>
                  <ContextMenu.SubContent style={popupStyle()}>
                    <ContextMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Create Pull Request")}><text style={{ fontSize: 16 }}>Create Pull Request…</text></ContextMenu.Item>
                    <ContextMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("View Pull Requests")}><text style={{ fontSize: 16 }}>View Pull Requests</text></ContextMenu.Item>
                    <ContextMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Sync Fork")}><text style={{ fontSize: 16 }}>Sync Fork</text></ContextMenu.Item>
                    <ContextMenu.Separator style={separatorStyle()} />
                    <ContextMenu.Item style={menuItemStyle()} onSelect={() => setLastAction("Open on GitHub")}><text style={{ fontSize: 16 }}>Open on GitHub</text></ContextMenu.Item>
                  </ContextMenu.SubContent>
                </ContextMenu.Sub>
              </ContextMenu.Content>
            </ContextMenu.Root>
          </Demo>

          <Demo title="Dialog">
            <Dialog.Root>
              <Dialog.Trigger testId="dialog-trigger" style={buttonStyle()}><text style={{ fontSize: 16, color: buttonTextColor() }}>Open</text></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay testId="dialog-overlay" style={{ backgroundColor: palette().overlay }} />
                <Dialog.Content testId="dialog-content" style={{ width: 500, padding: 16, gap: 12, backgroundColor: palette().surface, color: palette().text, borderWidth: 1, borderColor: light() ? "#d4d4d8" : "#3f3f46", borderRadius: 6, boxShadow: shadow(true) }}>
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Dialog.Title style={{ fontSize: 20, lineHeight: 26, fontWeight: 500, color: light() ? "#18181b" : "rgba(255, 255, 255, 0.9)" }}>About Kobalte</Dialog.Title>
                    <Dialog.CloseButton testId="dialog-close" style={{ width: 25, height: 25, minWidth: 25, minHeight: 25, borderRadius: 4, color: light() ? "#52525b" : "rgba(255, 255, 255, 0.8)", hover: { backgroundColor: light() ? "#f4f4f5" : "#3f3f46" } }}><CloseIcon /></Dialog.CloseButton>
                  </div>
                  <Dialog.Description style={{ fontSize: 16, lineHeight: 23, color: light() ? "#3f3f46" : "rgba(255, 255, 255, 0.7)" }}>
                    Kobalte is a UI toolkit for building accessible web apps and design systems with SolidJS. It provides a set of low-level UI components and primitives which can be the foundation for your design system implementation.
                  </Dialog.Description>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Demo>
        </div>
      </div>

      <Button.Root testId="button-disabled" disabled style={{ position: "absolute", width: 1, height: 1, minHeight: 1, padding: 0, opacity: 0, pointerEvents: "none" }}><text style={{ fontSize: 1 }}>Disabled</text></Button.Root>

      <div style={{ paddingTop: 2, display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 20 }}>
        <text style={{ fontSize: 11, color: palette().subtle }}>kobalte.dev BasicExample parity · native GPUIX</text>
        <text testId="last-action" style={{ fontSize: 11, color: palette().imageFallbackText }}>{lastAction()}</text>
      </div>
    </div>
  )
}

export function KobalteShowcase(): JSX.Element {
  return <ColorModeProvider initialColorMode="dark"><ShowcaseBody /></ColorModeProvider>
}
