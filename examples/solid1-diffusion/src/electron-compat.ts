import { rm } from "node:fs/promises"
import { tmpdir, homedir } from "node:os"
import { join } from "node:path"

type IpcListener = (...args: unknown[]) => void

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

export class BrowserWindow {}
export type IpcMainEvent = unknown
