import type { EventPayload } from "@gpuix/native"
import { EVENT_PROP_TO_TYPE } from "./host/events.js"

const BROWSER_KEY_NAMES = new Map([
  ["alt", "Alt"],
  ["backspace", "Backspace"],
  ["cmd", "Meta"],
  ["ctrl", "Control"],
  ["delete", "Delete"],
  ["down", "ArrowDown"],
  ["end", "End"],
  ["enter", "Enter"],
  ["escape", "Escape"],
  ["home", "Home"],
  ["insert", "Insert"],
  ["left", "ArrowLeft"],
  ["pagedown", "PageDown"],
  ["pageup", "PageUp"],
  ["right", "ArrowRight"],
  ["shift", "Shift"],
  ["space", " "],
  ["tab", "Tab"],
  ["up", "ArrowUp"],
] as const)

/**
 * Browser-only event names used by upstream component libraries that GPUIX
 * exposes through equivalent enter/leave native events.
 */
export function installBrowserEventCompatibility(): void {
  EVENT_PROP_TO_TYPE.set("onMouseOver", "mouseEnter")
  EVENT_PROP_TO_TYPE.set("onMouseOut", "mouseLeave")
}

/** GPUIX 0.6 reports platform-neutral key names; browser libraries expect KeyboardEvent.key names. */
export function browserCompatibleNativeEvent(event: EventPayload): EventPayload {
  if ((event.eventType !== "keyDown" && event.eventType !== "keyUp") || !event.key) return event
  return { ...event, key: browserKeyName(event.key) }
}

/**
 * Native key events are element-scoped. Browser primitives such as Kobalte's
 * escape-key listener attach to document/window, so replay the same key event
 * at those global EventTargets after the focused host element receives it.
 */
export function dispatchBrowserKeyboardEvent(event: EventPayload): void {
  const eventName = event.eventType === "keyDown"
    ? "keydown"
    : event.eventType === "keyUp"
      ? "keyup"
      : undefined
  if (!eventName) return

  const documentTarget = globalThis.document
  const windowTarget = globalThis.window
  if (!documentTarget?.dispatchEvent || !windowTarget?.dispatchEvent) return

  documentTarget.dispatchEvent(createKeyboardCompatEvent(eventName, event, documentTarget))
  windowTarget.dispatchEvent(createKeyboardCompatEvent(eventName, event, windowTarget))
}

function browserKeyName(key: string): string {
  const normalized = key.toLowerCase()
  const named = BROWSER_KEY_NAMES.get(normalized)
  if (named !== undefined) return named
  if (/^f\d{1,2}$/.test(normalized)) return normalized.toUpperCase()
  return key
}

function createKeyboardCompatEvent(
  eventName: "keydown" | "keyup",
  event: EventPayload,
  currentTarget: EventTarget,
): Event {
  const domEvent = new Event(eventName, { bubbles: true, cancelable: true })
  const target = globalThis.document.activeElement ?? currentTarget
  Object.defineProperties(domEvent, {
    target: { configurable: true, value: target },
    currentTarget: { configurable: true, value: currentTarget },
    key: { configurable: true, value: event.key ?? "" },
    repeat: { configurable: true, value: event.isHeld ?? false },
    shiftKey: { configurable: true, value: event.modifiers?.shift ?? false },
    metaKey: { configurable: true, value: event.modifiers?.cmd ?? false },
    altKey: { configurable: true, value: event.modifiers?.alt ?? false },
    ctrlKey: { configurable: true, value: event.modifiers?.ctrl ?? false },
    composedPath: {
      configurable: true,
      value: () => target === currentTarget ? [currentTarget] : [target, currentTarget],
    },
  })
  return domEvent
}
