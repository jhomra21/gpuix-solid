import "./dom-environment.js"
import {
  splitProps,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js"
import { createElement, spread } from "./universal.js"

export const isServer = false

export type DynamicProps<T extends ValidComponent, P = ComponentProps<T>> = {
  [K in keyof P]: P[K]
} & {
  component: T | undefined
}

type LocalEventListener = (event: Event) => void

type CompatDocumentStyle = {
  pointerEvents: string
  getPropertyValue(name: string): string
  setProperty(name: string, value: string): void
  removeProperty(name: string): string
}

installDocumentStyleCompatibility()

export function createDynamic<T extends ValidComponent>(
  component: () => T | undefined,
  props: ComponentProps<T>,
) {
  const current = component()
  if (current === undefined) return undefined
  if (isHostTag(current)) {
    const element = createElement(current)
    installSemanticTagMetadata(element, current)
    spread(element, props)
    return element
  }
  return current(props)
}

export function Dynamic<T extends ValidComponent>(props: DynamicProps<T>) {
  const [, others] = splitProps(props, ["component"])
  // SAFETY: splitProps removes only the synthetic `component` key, leaving the exact ComponentProps<T> payload passed to Dynamic.
  const componentProps = others as ComponentProps<T>
  return createDynamic(() => props.component, componentProps)
}

export function Portal(props: { children: JSX.Element }): JSX.Element {
  return props.children
}

function isHostTag(component: ValidComponent): component is string {
  return typeof component === "string"
}

function installDocumentStyleCompatibility(): void {
  for (const target of [globalThis.document.body, globalThis.document.documentElement]) {
    if ("style" in target) continue
    Object.defineProperty(target, "style", {
      configurable: true,
      enumerable: true,
      value: createDocumentStyle(),
    })
  }
}

function createDocumentStyle(): CompatDocumentStyle {
  let pointerEvents = ""
  return {
    get pointerEvents() {
      return pointerEvents
    },
    set pointerEvents(value: string) {
      pointerEvents = String(value)
    },
    getPropertyValue(name: string) {
      return name === "pointer-events" ? pointerEvents : ""
    },
    setProperty(name: string, value: string) {
      if (name === "pointer-events") pointerEvents = String(value)
    },
    removeProperty(name: string) {
      if (name !== "pointer-events") return ""
      const previous = pointerEvents
      pointerEvents = ""
      return previous
    },
  }
}

function installSemanticTagMetadata(element: ReturnType<typeof createElement>, tagName: string): void {
  const localName = tagName.toLowerCase()
  const nodeName = localName.toUpperCase()
  const listeners = new Map<string, Set<LocalEventListener>>()
  Object.defineProperties(element, {
    tagName: { configurable: true, enumerable: true, value: nodeName },
    nodeName: { configurable: true, enumerable: true, value: nodeName },
    localName: { configurable: true, enumerable: true, value: localName },
    matches: {
      configurable: true,
      enumerable: true,
      value: (selector: string) => selector
        .split(",")
        .map((candidate) => candidate.trim().toLowerCase())
        .includes(localName),
    },
    contains: {
      configurable: true,
      enumerable: true,
      value: (child: ReturnType<typeof createElement> | null) => {
        let current = child
        while (current) {
          if (current === element) return true
          if (current.kind === "root") return false
          const parent = current.parent
          if (!parent || parent.kind === "root") return false
          current = parent
        }
        return false
      },
    },
    addEventListener: {
      configurable: true,
      enumerable: true,
      value: (type: string, listener: LocalEventListener | null) => {
        if (!listener) return
        const entries = listeners.get(type) ?? new Set<LocalEventListener>()
        entries.add(listener)
        listeners.set(type, entries)
      },
    },
    removeEventListener: {
      configurable: true,
      enumerable: true,
      value: (type: string, listener: LocalEventListener | null) => {
        if (!listener) return
        const entries = listeners.get(type)
        entries?.delete(listener)
        if (entries?.size === 0) listeners.delete(type)
      },
    },
    dispatchEvent: {
      configurable: true,
      enumerable: true,
      value: (event: Event) => {
        for (const listener of listeners.get(event.type) ?? []) listener(event)
        return !event.defaultPrevented
      },
    },
  })
}
