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
  destructive: "#dc2626",
  white: "#ffffff",
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
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: palette.background,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 6,
    ...extra,
  }
}

export function buttonStyle(active = false): StyleDesc {
  return {
    minHeight: 34,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 6,
    backgroundColor: active ? palette.primary : palette.muted,
    cursor: "pointer",
  }
}

export function Card(props: { children: SolidElement; style?: StyleDesc }): SolidElement {
  return (
    <div style={{ padding: 16, gap: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.background, ...props.style }}>
      {props.children}
    </div>
  )
}

export function Button(props: { children: SolidElement; testId?: string; active?: boolean; onClick?(): void }): SolidElement {
  return (
    <div testId={props.testId} style={buttonStyle(props.active)} onClick={props.onClick}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
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
