import { spawn } from "node:child_process"
import { dirname } from "node:path"
import type { WindowOptions } from "@gpuix/native"

export class DesktopUnsupportedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DesktopUnsupportedError"
  }
}

export interface OpenFileDialogOptions {
  kind?: "file" | "directory"
  multiple?: boolean
  prompt?: string
  defaultPath?: string
}

export interface SaveFileDialogOptions {
  prompt?: string
  suggestedName?: string
  defaultPath?: string
}

export type MessageDialogButtons = readonly ["OK"] | readonly ["Cancel", "OK"]

export interface MessageDialogOptions {
  message: string
  detail?: string
  level?: "info" | "warning" | "error"
  buttons?: MessageDialogButtons
}

interface CommandResult {
  code: number | null
  stdout: string
  stderr: string
}

interface RunOptions {
  env?: NodeJS.ProcessEnv
}

function run(command: string, args: readonly string[], options: RunOptions = {}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => { stdout += chunk })
    child.stderr.on("data", (chunk: string) => { stderr += chunk })
    child.once("error", reject)
    child.once("close", (code) => resolve({ code, stdout, stderr }))
  })
}

function commandFailure(command: string, result: CommandResult): Error {
  const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.code ?? "unknown"}`
  return new Error(`${command} failed: ${detail}`)
}

function lines(stdout: string): string[] {
  return stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
}

function isMacCancel(result: CommandResult): boolean {
  return result.code !== 0 && /User canceled\.|\(-128\)/u.test(result.stderr)
}

async function macOpenFile(options: OpenFileDialogOptions): Promise<string[] | null> {
  const kind = options.kind ?? "file"
  const prompt = options.prompt ?? (kind === "directory" ? "Choose a folder" : "Choose a file")
  const script = kind === "directory"
    ? `on run argv
set promptText to item 1 of argv
set defaultPath to item 2 of argv
set allowMultiple to item 3 of argv is "true"
if defaultPath is "" then
  set chosen to choose folder with prompt promptText multiple selections allowed allowMultiple
else
  set chosen to choose folder with prompt promptText default location POSIX file defaultPath multiple selections allowed allowMultiple
end if
if allowMultiple then
  set output to ""
  repeat with chosenItem in chosen
    set output to output & POSIX path of chosenItem & linefeed
  end repeat
  return output
end if
return POSIX path of chosen
end run`
    : `on run argv
set promptText to item 1 of argv
set defaultPath to item 2 of argv
set allowMultiple to item 3 of argv is "true"
if defaultPath is "" then
  set chosen to choose file with prompt promptText multiple selections allowed allowMultiple
else
  set chosen to choose file with prompt promptText default location POSIX file defaultPath multiple selections allowed allowMultiple
end if
if allowMultiple then
  set output to ""
  repeat with chosenItem in chosen
    set output to output & POSIX path of chosenItem & linefeed
  end repeat
  return output
end if
return POSIX path of chosen
end run`
  const result = await run("osascript", [
    "-e",
    script,
    "--",
    prompt,
    options.defaultPath ?? "",
    options.multiple ? "true" : "false",
  ])
  if (isMacCancel(result)) return null
  if (result.code !== 0) throw commandFailure("osascript", result)
  return lines(result.stdout)
}

async function macSaveFile(options: SaveFileDialogOptions): Promise<string | null> {
  const script = `on run argv
set promptText to item 1 of argv
set suggestedName to item 2 of argv
set defaultPath to item 3 of argv
if defaultPath is "" then
  set chosen to choose file name with prompt promptText default name suggestedName
else
  set chosen to choose file name with prompt promptText default name suggestedName default location POSIX file defaultPath
end if
return POSIX path of chosen
end run`
  const result = await run("osascript", [
    "-e",
    script,
    "--",
    options.prompt ?? "Save file",
    options.suggestedName ?? "Untitled",
    options.defaultPath ?? "",
  ])
  if (isMacCancel(result)) return null
  if (result.code !== 0) throw commandFailure("osascript", result)
  return result.stdout.trim() || null
}

async function macMessage(options: MessageDialogOptions): Promise<number | null> {
  const buttons = options.buttons ?? ["Cancel", "OK"]
  const script = `on run argv
set messageText to item 1 of argv
set detailText to item 2 of argv
set firstButton to item 3 of argv
set secondButton to item 4 of argv
if detailText is not "" then set messageText to messageText & linefeed & linefeed & detailText
if secondButton is "" then
  set answer to display dialog messageText buttons {firstButton} default button firstButton
else
  set answer to display dialog messageText buttons {firstButton, secondButton} default button secondButton
end if
return button returned of answer
end run`
  const result = await run("osascript", [
    "-e",
    script,
    "--",
    options.message,
    options.detail ?? "",
    buttons[0],
    buttons[1] ?? "",
  ])
  if (isMacCancel(result)) return 0
  if (result.code !== 0) throw commandFailure("osascript", result)
  const label = result.stdout.trim()
  return Math.max(0, buttons.indexOf(label))
}

function windowsEnv(values: Record<string, string>): NodeJS.ProcessEnv {
  return { ...process.env, ...values }
}

async function windowsOpenFile(options: OpenFileDialogOptions): Promise<string[] | null> {
  const kind = options.kind ?? "file"
  if (kind === "directory" && options.multiple) {
    throw new DesktopUnsupportedError("Windows directory selection does not support multiple folders yet")
  }
  const script = kind === "directory"
    ? `Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.FolderBrowserDialog
$d.Description = $env:GPUIX_DIALOG_PROMPT
if ($env:GPUIX_DIALOG_PATH) { $d.SelectedPath = $env:GPUIX_DIALOG_PATH }
if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath; exit 0 }
exit 1`
    : `Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Title = $env:GPUIX_DIALOG_PROMPT
$d.Multiselect = $env:GPUIX_DIALOG_MULTIPLE -eq "1"
if ($env:GPUIX_DIALOG_PATH) { $d.InitialDirectory = $env:GPUIX_DIALOG_PATH }
if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.FileNames | ForEach-Object { Write-Output $_ }; exit 0 }
exit 1`
  const result = await run("powershell.exe", ["-NoProfile", "-Command", script], {
    env: windowsEnv({
      GPUIX_DIALOG_PROMPT: options.prompt ?? (kind === "directory" ? "Choose a folder" : "Choose a file"),
      GPUIX_DIALOG_PATH: options.defaultPath ?? "",
      GPUIX_DIALOG_MULTIPLE: options.multiple ? "1" : "0",
    }),
  })
  if (result.code === 1 && result.stdout.trim() === "") return null
  if (result.code !== 0) throw commandFailure("powershell.exe", result)
  return lines(result.stdout)
}

async function windowsSaveFile(options: SaveFileDialogOptions): Promise<string | null> {
  const script = `Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.SaveFileDialog
$d.Title = $env:GPUIX_DIALOG_PROMPT
$d.FileName = $env:GPUIX_DIALOG_NAME
if ($env:GPUIX_DIALOG_PATH) { $d.InitialDirectory = $env:GPUIX_DIALOG_PATH }
if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.FileName; exit 0 }
exit 1`
  const result = await run("powershell.exe", ["-NoProfile", "-Command", script], {
    env: windowsEnv({
      GPUIX_DIALOG_PROMPT: options.prompt ?? "Save file",
      GPUIX_DIALOG_NAME: options.suggestedName ?? "Untitled",
      GPUIX_DIALOG_PATH: options.defaultPath ?? "",
    }),
  })
  if (result.code === 1 && result.stdout.trim() === "") return null
  if (result.code !== 0) throw commandFailure("powershell.exe", result)
  return result.stdout.trim() || null
}

async function windowsMessage(options: MessageDialogOptions): Promise<number | null> {
  const buttons = options.buttons ?? ["Cancel", "OK"]
  const buttonKind = buttons.length === 1 ? "OK" : "OKCancel"
  const icon = options.level === "error" ? "Error" : options.level === "warning" ? "Warning" : "Information"
  const script = `Add-Type -AssemblyName System.Windows.Forms
$text = $env:GPUIX_DIALOG_MESSAGE
if ($env:GPUIX_DIALOG_DETAIL) { $text = $text + [Environment]::NewLine + [Environment]::NewLine + $env:GPUIX_DIALOG_DETAIL }
$result = [System.Windows.Forms.MessageBox]::Show($text, "", [System.Windows.Forms.MessageBoxButtons]::$env:GPUIX_DIALOG_BUTTONS, [System.Windows.Forms.MessageBoxIcon]::$env:GPUIX_DIALOG_ICON)
Write-Output $result.ToString()`
  const result = await run("powershell.exe", ["-NoProfile", "-Command", script], {
    env: windowsEnv({
      GPUIX_DIALOG_MESSAGE: options.message,
      GPUIX_DIALOG_DETAIL: options.detail ?? "",
      GPUIX_DIALOG_BUTTONS: buttonKind,
      GPUIX_DIALOG_ICON: icon,
    }),
  })
  if (result.code !== 0) throw commandFailure("powershell.exe", result)
  const selected = result.stdout.trim()
  if (buttons.length === 1) return 0
  return selected === "OK" ? 1 : 0
}

async function linuxOpenFile(options: OpenFileDialogOptions): Promise<string[] | null> {
  const kind = options.kind ?? "file"
  const args = ["--file-selection", `--title=${options.prompt ?? (kind === "directory" ? "Choose a folder" : "Choose a file")}`]
  if (kind === "directory") args.push("--directory")
  if (options.multiple) args.push("--multiple", "--separator=\n")
  if (options.defaultPath) args.push(`--filename=${options.defaultPath}`)
  let result: CommandResult
  try {
    result = await run("zenity", args)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DesktopUnsupportedError("Linux file dialogs require zenity")
    }
    throw error
  }
  if (result.code === 1) return null
  if (result.code !== 0) throw commandFailure("zenity", result)
  return lines(result.stdout)
}

async function linuxSaveFile(options: SaveFileDialogOptions): Promise<string | null> {
  const filename = options.defaultPath
    ? `${options.defaultPath.replace(/\/$/u, "")}/${options.suggestedName ?? "Untitled"}`
    : options.suggestedName
  const args = ["--file-selection", "--save", "--confirm-overwrite", `--title=${options.prompt ?? "Save file"}`]
  if (filename) args.push(`--filename=${filename}`)
  let result: CommandResult
  try {
    result = await run("zenity", args)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DesktopUnsupportedError("Linux save dialogs require zenity")
    }
    throw error
  }
  if (result.code === 1) return null
  if (result.code !== 0) throw commandFailure("zenity", result)
  return result.stdout.trim() || null
}

async function linuxMessage(options: MessageDialogOptions): Promise<number | null> {
  const buttons = options.buttons ?? ["Cancel", "OK"]
  const text = options.detail ? `${options.message}\n\n${options.detail}` : options.message
  const args = buttons.length === 1
    ? ["--info", `--text=${text}`, `--ok-label=${buttons[0]}`]
    : ["--question", `--text=${text}`, `--cancel-label=${buttons[0]}`, `--ok-label=${buttons[1]}`]
  let result: CommandResult
  try {
    result = await run("zenity", args)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DesktopUnsupportedError("Linux message dialogs require zenity")
    }
    throw error
  }
  if (buttons.length === 1) {
    if (result.code !== 0 && result.code !== 1) throw commandFailure("zenity", result)
    return 0
  }
  if (result.code === 0) return 1
  if (result.code === 1) return 0
  throw commandFailure("zenity", result)
}

export const dialog = {
  async openFile(options: OpenFileDialogOptions = {}): Promise<string[] | null> {
    if (process.platform === "darwin") return await macOpenFile(options)
    if (process.platform === "win32") return await windowsOpenFile(options)
    if (process.platform === "linux") return await linuxOpenFile(options)
    throw new DesktopUnsupportedError(`File dialogs are not supported on ${process.platform}`)
  },

  async saveFile(options: SaveFileDialogOptions = {}): Promise<string | null> {
    if (process.platform === "darwin") return await macSaveFile(options)
    if (process.platform === "win32") return await windowsSaveFile(options)
    if (process.platform === "linux") return await linuxSaveFile(options)
    throw new DesktopUnsupportedError(`Save dialogs are not supported on ${process.platform}`)
  },

  async message(options: MessageDialogOptions): Promise<number | null> {
    if (process.platform === "darwin") return await macMessage(options)
    if (process.platform === "win32") return await windowsMessage(options)
    if (process.platform === "linux") return await linuxMessage(options)
    throw new DesktopUnsupportedError(`Message dialogs are not supported on ${process.platform}`)
  },
}

export const shell = {
  async openWithSystem(target: string): Promise<void> {
    let result: CommandResult
    if (process.platform === "darwin") {
      result = await run("open", [target])
    } else if (process.platform === "win32") {
      result = await run(
        "powershell.exe",
        ["-NoProfile", "-Command", "Start-Process -FilePath $env:GPUIX_OPEN_TARGET"],
        { env: windowsEnv({ GPUIX_OPEN_TARGET: target }) },
      )
    } else if (process.platform === "linux") {
      result = await run("xdg-open", [target])
    } else {
      throw new DesktopUnsupportedError(`System open is not supported on ${process.platform}`)
    }
    if (result.code !== 0) throw commandFailure("system open", result)
  },

  async revealPath(path: string): Promise<void> {
    let result: CommandResult
    if (process.platform === "darwin") {
      result = await run("open", ["-R", path])
    } else if (process.platform === "win32") {
      result = await run("explorer.exe", [`/select,${path}`])
    } else if (process.platform === "linux") {
      result = await run("xdg-open", [dirname(path)])
    } else {
      throw new DesktopUnsupportedError(`Reveal path is not supported on ${process.platform}`)
    }
    if (result.code !== 0) throw commandFailure("reveal path", result)
  },
}

/**
 * GPUIX 0.9 owns the native macOS application/window menus. Today it exposes
 * the application name at window creation but not arbitrary custom menu items.
 */
export const appMenu = {
  default(appName: string): Pick<WindowOptions, "appName"> {
    const trimmed = appName.trim()
    if (trimmed.length === 0) throw new TypeError("appMenu.default requires a non-empty app name")
    return { appName: trimmed }
  },
  supportsCustomItems: false as const,
}
