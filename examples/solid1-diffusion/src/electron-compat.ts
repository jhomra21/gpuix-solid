import { rm } from "node:fs/promises"
import { tmpdir, homedir } from "node:os"
import { join } from "node:path"
import type { MainEvent, MainReply, MainRequest } from "@desktop/main-channels"

export type IpcMainEvent = {
  sender: {
    isDestroyed(): boolean
    send(channel: string, payload: MainReply): void
  }
}

type IpcListener = (event: IpcMainEvent, request: MainRequest) => void | Promise<void>
type WindowPayload = MainEvent | MainReply
type WindowSend = (channel: string, payload: WindowPayload) => void

export const app = {
  isPackaged: false,
  getPath(name: string): string {
    switch (name) {
      case "home":
        return homedir()
      case "videos":
        return join(homedir(), "Movies")
      case "desktop":
        return join(homedir(), "Desktop")
      case "documents":
        return join(homedir(), "Documents")
      case "appData":
      case "userData":
        return join(homedir(), "Library", "Application Support")
      default:
        return tmpdir()
    }
  },
}

export const dialog = {
  async showOpenDialog(): Promise<{ canceled: true; filePaths: string[] }> {
    return { canceled: true, filePaths: [] }
  },
  async showMessageBox(): Promise<{ response: number }> {
    return { response: 0 }
  },
}

export const shell = {
  async trashItem(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true })
  },
  async openExternal(): Promise<void> {},
  showItemInFolder(): void {},
}

export const ipcMain = {
  on(_channel: string, _listener: IpcListener): void {},
}

export class BrowserWindow {
  readonly webContents: {
    isLoading(): boolean
    send(channel: string, payload: WindowPayload): void
  }

  constructor(send: WindowSend = () => {}) {
    this.webContents = {
      isLoading: () => false,
      send,
    }
  }

  isDestroyed(): boolean {
    return false
  }
}
