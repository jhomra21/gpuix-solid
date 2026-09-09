import type { Element as SolidElement } from "solid-js"
import type { EventPayload, StyleDesc } from "gpuix-solid"

export type DashboardRoute = "home" | "account" | "notes" | "tasks" | "weather"
export type TaskFilter = "all" | "active" | "completed"
export type NoteFilter = "all" | "active" | "archived"

export interface Task {
  id: number
  text: string
  isCompleted: boolean
}

export interface Note {
  id: number
  title: string
  content: string
  status: "active" | "archived"
}

export interface WeatherLocation {
  id: number
  city: string
  condition: string
  temperature: number
}

export const palette = {
  background: "#ffffff",
  sidebar: "#f8fafc",
  muted: "#f1f5f9",
  border: "#e2e8f0",
  text: "#0f172a",
  secondary: "#64748b",
  primary: "#2563eb",
  primaryTop: "#60a5fa",
  primaryBottom: "#3b82f6",
  primaryBorder: "#1d4ed8",
  destructive: "#dc2626",
  white: "#ffffff",
  greenAccent: "#bbf7d0",
  purpleAccent: "#e9d5ff",
  blueAccent: "#bfdbfe",
} as const

export const initialTasks: Task[] = [
  { id: 1, text: "Review pull request", isCompleted: false },
  { id: 2, text: "Update documentation", isCompleted: true },
  { id: 3, text: "Test deployment", isCompleted: false },
]

export const initialNotes: Note[] = [
  { id: 1, title: "Project notes", content: "Keep the dashboard source-first.", status: "active" },
  { id: 2, title: "Release notes", content: "Validate the native application before merging.", status: "archived" },
]

export const initialWeather: WeatherLocation[] = [
  { id: 1, city: "Austin", condition: "Clear", temperature: 91 },
  { id: 2, city: "Chicago", condition: "Partly cloudy", temperature: 78 },
]

export function inputStyle(extra: StyleDesc = {}): StyleDesc {
  return {
    minHeight: 36,
    paddingLeft: 12,
    paddingRight: 12,
    backgroundColor: "#00000000",
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 6,
    boxShadow: { offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, color: "#0f172a0d" },
    ...extra,
  }
}

export function buttonStyle(active = false): StyleDesc {
  return {
    minHeight: active ? 40 : 36,
    paddingTop: active ? 8 : 6,
    paddingBottom: active ? 8 : 6,
    paddingLeft: active ? 16 : 12,
    paddingRight: active ? 16 : 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: active ? palette.primaryBorder : palette.border,
    background: active
      ? {
          type: "linear-gradient",
          angle: 180,
          stops: [
            { color: palette.primaryTop, position: 0 },
            { color: palette.primaryBottom, position: 1 },
          ],
        }
      : undefined,
    backgroundColor: active ? undefined : "#00000000",
    boxShadow: active
      ? { offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, color: "#00000033" }
      : undefined,
    cursor: "pointer",
    active: active ? { opacity: 0.92 } : { backgroundColor: palette.muted },
    hover: active ? { opacity: 0.94 } : { backgroundColor: palette.muted },
  }
}

export function Card(props: { children: SolidElement; style?: StyleDesc }): SolidElement {
  return (
    <div
      style={{
        position: "relative",
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 8,
        backgroundColor: palette.background,
        boxShadow: { offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, color: "#0f172a0d" },
        ...props.style,
      }}
    >
      {props.children}
    </div>
  )
}

export function DialogSurface(props: { children: SolidElement; testId?: string }): SolidElement {
  return (
    <div
      testId={props.testId}
      style={{
        position: "absolute",
        top: 24,
        left: 24,
        width: 560,
        padding: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 10,
        backgroundColor: palette.background,
        boxShadow: { offsetX: 0, offsetY: 12, blurRadius: 30, spreadRadius: 0, color: "#0f172a28" },
      }}
    >
      {props.children}
    </div>
  )
}

export function Button(props: { children: SolidElement; testId?: string; active?: boolean; onClick?(): void }): SolidElement {
  return (
    <div testId={props.testId} style={buttonStyle(props.active)} onClick={props.onClick}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none" }}>
        {props.children}
      </div>
    </div>
  )
}

export function Divider(): SolidElement {
  return <div style={{ height: 1, backgroundColor: palette.border }} />
}

export function valueFromEvent(event: EventPayload): string {
  return event.value ?? ""
}
