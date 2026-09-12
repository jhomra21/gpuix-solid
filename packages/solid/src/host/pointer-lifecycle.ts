import type { EventPayload } from "@gpuix/native"
import type { EventRegistry } from "./events.js"
import { MutationDriver, type MutationValue } from "./mutations.js"
import type { NativeRenderer } from "./types.js"

type PointerLifecycleEvent = "mouseDown" | "mouseMove" | "mouseUp"
interface PointerLifecycleState {
  mouseDown: boolean
  mouseMove: boolean
  mouseUp: boolean
}

type PointerReleaseBurst = {
  x: number
  y: number
  button: number
}

const SEMANTIC_NATIVE_CLICK_TYPES = new Set([
  "input",
  "textarea",
  "anchored",
  "img",
  "svg",
  "code",
  "diff",
  "markdown",
])

function emptyPointerLifecycleState() {
  return { mouseDown: false, mouseMove: false, mouseUp: false } satisfies PointerLifecycleState
}

function isNumberValue<T>(value: T): value is T & number {
  return typeof value === "number"
}

function numberArg(args: MutationValue[], index: number): number {
  const value = args[index]
  if (!isNumberValue(value)) throw new TypeError(`Expected numeric mutation arg ${index}`)
  return value
}

function booleanArg(args: MutationValue[], index: number): boolean {
  const value = args[index]
  if (value === true) return true
  if (value === false) return false
  throw new TypeError(`Expected boolean mutation arg ${index}`)
}

function stringArg(args: MutationValue[], index: number): string {
  const value = args[index]
  if (Object.prototype.toString.call(value) !== "[object String]") {
    throw new TypeError(`Expected string mutation arg ${index}`)
  }
  return String(value)
}

function pointerLifecycleEvent(value: MutationValue | undefined): PointerLifecycleEvent | undefined {
  if (value === "mouseDown" || value === "mouseMove" || value === "mouseUp") return value
  return undefined
}

function releaseBurst(event: EventPayload): PointerReleaseBurst {
  return { x: event.x ?? 0, y: event.y ?? 0, button: event.button ?? 0 }
}

function sameReleaseBurst(left: PointerReleaseBurst, right: PointerReleaseBurst): boolean {
  return left.x === right.x && left.y === right.y && left.button === right.button
}

/**
 * The mounted root carries a synthetic native pointer lifecycle as a stable
 * browser-window relay. Native pointer capture can outlive a retained node
 * replacement, so local releases may need to be recovered through that root
 * relay even though the original pressed target was replaced.
 *
 * Native hit paths can report more than one subscribed non-root node for one
 * physical press, and their callback order is platform-dependent. Refine the
 * pressed owner only when the host tree proves the new report is a descendant
 * of the current owner, so the structurally deepest listener remains the local
 * release fallback regardless of native callback order. A mouse-up reported
 * for a different non-root subscription must not consume that fallback.
 */
export class BrowserPointerReleaseRelay {
  #pressedElementId: number | undefined
  #rootFallback: { elementId: number; burst: PointerReleaseBurst } | undefined

  get pressedElementId(): number | undefined {
    return this.#pressedElementId
  }

  route(
    event: EventPayload,
    rootId: number | undefined,
    canRouteRootRelease: (elementId: number, event: EventPayload) => boolean,
    isDescendantOf: (elementId: number, ancestorId: number) => boolean = () => false,
  ): EventPayload | undefined {
    if (event.eventType === "mouseDown") {
      if (event.elementId !== rootId) {
        const pressedElementId = this.#pressedElementId
        if (
          pressedElementId === undefined
          || pressedElementId === event.elementId
          || isDescendantOf(event.elementId, pressedElementId)
        ) {
          this.#pressedElementId = event.elementId
        }
      }
      return event
    }

    if (event.eventType !== "mouseUp") return event
    const burst = releaseBurst(event)

    if (event.elementId !== rootId) {
      const fallback = this.#rootFallback
      if (fallback && fallback.elementId === event.elementId && sameReleaseBurst(fallback.burst, burst)) {
        this.#rootFallback = undefined
        return undefined
      }
      if (event.elementId === this.#pressedElementId) this.#pressedElementId = undefined
      return event
    }

    const pressedElementId = this.#pressedElementId
    this.#pressedElementId = undefined
    if (
      pressedElementId === undefined
      || pressedElementId === rootId
      || !canRouteRootRelease(pressedElementId, event)
    ) {
      return event
    }

    const fallback = { elementId: pressedElementId, burst }
    this.#rootFallback = fallback
    queueMicrotask(() => {
      if (this.#rootFallback === fallback) this.#rootFallback = undefined
    })
    return { ...event, elementId: pressedElementId }
  }

  clear(): void {
    this.#pressedElementId = undefined
    this.#rootFallback = undefined
  }
}

/**
 * Browser code commonly starts a gesture on an element and listens for
 * pointermove/pointerup on window. GPUIX, unlike the browser, implicitly
 * captures a pointer whenever one retained node subscribes to both mouseDown
 * and mouseMove. Do not manufacture that combination on an ephemeral pressed
 * child: a reactive remount can destroy the captured native node before the
 * physical release, causing GPUI to emit no release at all.
 *
 * The mounted root always relays native move/up as browser window events, but
 * it subscribes to mouseDown (and therefore becomes GPUI's stable capture
 * owner) only while the connected host tree contains an authored pointer-down
 * gesture. Click/hover-only trees must not be captured: root capture changes
 * GPUI hover ownership and can synthesize a mouse-leave that browser source
 * code never requested. Authored child listeners remain intact, and click-only
 * retained controls may use a non-capturing mouse-down probe so the host can
 * learn their real pressed target without manufacturing child capture.
 */
export class BrowserPointerMutationDriver extends MutationDriver {
  readonly #authored = new Map<number, PointerLifecycleState>()
  readonly #applied = new Map<number, PointerLifecycleState>()
  readonly #parents = new Map<number, number>()
  readonly #children = new Map<number, Set<number>>()
  readonly #elementTypes = new Map<number, string>()
  readonly #directClickListeners = new Map<number, boolean>()
  readonly #authoredMouseDownOwners = new Set<number>()
  #rootId: number | undefined

  constructor(renderer: NativeRenderer, events: EventRegistry) {
    super(renderer, events)
  }

  override enqueue(name: string, ...args: MutationValue[]): void {
    if (name === "createElement") {
      this.#elementTypes.set(numberArg(args, 0), stringArg(args, 1))
      super.enqueue(name, ...args)
      return
    }

    if (name === "setRoot") {
      const id = numberArg(args, 0)
      super.enqueue(name, ...args)
      this.#setParent(id, null)
      this.#rootId = id
      this.#syncPointerLifecycle(id)
      return
    }

    if (name === "appendChild" || name === "insertBefore") {
      const parentId = numberArg(args, 0)
      const childId = numberArg(args, 1)
      super.enqueue(name, ...args)
      this.#setParent(childId, parentId)
      this.#syncPointerSubtree(childId)
      this.#syncRootCapture()
      return
    }

    if (name === "removeChild") {
      const childId = numberArg(args, 1)
      super.enqueue(name, ...args)
      this.#setParent(childId, null)
      this.#syncPointerSubtree(childId)
      this.#syncRootCapture()
      return
    }

    if (name === "setEventListener") {
      const eventType = pointerLifecycleEvent(args[1])
      if (eventType) {
        const id = numberArg(args, 0)
        const enabled = booleanArg(args, 2)
        const state = this.#authored.get(id) ?? emptyPointerLifecycleState()
        state[eventType] = enabled
        this.#authored.set(id, state)
        if (eventType === "mouseDown") {
          if (enabled) this.#authoredMouseDownOwners.add(id)
          else this.#authoredMouseDownOwners.delete(id)
        }
        this.#syncPointerLifecycle(id)
        if (eventType === "mouseDown") this.#syncRootCapture()
        return
      }

      if (args[1] === "click") {
        const id = numberArg(args, 0)
        this.#directClickListeners.set(id, booleanArg(args, 2))
        super.enqueue(name, ...args)
        this.#syncPointerSubtree(id)
        return
      }
    }

    if (name === "destroyElement") {
      const id = numberArg(args, 0)
      super.enqueue(name, ...args)
      this.#forgetSubtree(id)
      this.#syncRootCapture()
      return
    }

    super.enqueue(name, ...args)
  }

  #setParent(childId: number, parentId: number | null): void {
    const previousParent = this.#parents.get(childId)
    if (previousParent !== undefined) {
      const siblings = this.#children.get(previousParent)
      siblings?.delete(childId)
      if (siblings?.size === 0) this.#children.delete(previousParent)
    }

    if (parentId === null) {
      this.#parents.delete(childId)
      return
    }

    this.#parents.set(childId, parentId)
    const children = this.#children.get(parentId) ?? new Set<number>()
    children.add(childId)
    this.#children.set(parentId, children)
  }

  #hasClickAncestor(id: number): boolean {
    let parentId = this.#parents.get(id)
    while (parentId !== undefined) {
      if (this.#directClickListeners.get(parentId) === true) return true
      parentId = this.#parents.get(parentId)
    }
    return false
  }

  #needsClickPressProbe(id: number, authored: PointerLifecycleState): boolean {
    if (authored.mouseMove) return false
    const type = this.#elementTypes.get(id)
    if (type !== undefined && SEMANTIC_NATIVE_CLICK_TYPES.has(type)) return false
    return this.#directClickListeners.get(id) === true || this.#hasClickAncestor(id)
  }

  #isConnectedDescendantOfRoot(id: number): boolean {
    const rootId = this.#rootId
    if (rootId === undefined || id === rootId) return false
    let parentId = this.#parents.get(id)
    while (parentId !== undefined) {
      if (parentId === rootId) return true
      parentId = this.#parents.get(parentId)
    }
    return false
  }

  #needsRootCapture(): boolean {
    for (const id of this.#authoredMouseDownOwners) {
      if (this.#isConnectedDescendantOfRoot(id)) return true
    }
    return false
  }

  #syncRootCapture(): void {
    const rootId = this.#rootId
    if (rootId !== undefined) this.#syncPointerLifecycle(rootId)
  }

  #syncPointerSubtree(rootId: number): void {
    const stack = [rootId]
    while (stack.length > 0) {
      const id = stack.pop()!
      this.#syncPointerLifecycle(id)
      for (const childId of this.#children.get(id) ?? []) stack.push(childId)
    }
  }

  #syncPointerLifecycle(id: number): void {
    const authored = this.#authored.get(id) ?? emptyPointerLifecycleState()
    const isRootRelay = id === this.#rootId
    const desired = {
      mouseDown: authored.mouseDown
        || (isRootRelay ? this.#needsRootCapture() : this.#needsClickPressProbe(id, authored)),
      mouseMove: authored.mouseMove || isRootRelay,
      mouseUp: authored.mouseUp || authored.mouseDown || isRootRelay,
    } satisfies PointerLifecycleState
    const applied = this.#applied.get(id) ?? emptyPointerLifecycleState()

    for (const eventType of ["mouseDown", "mouseMove", "mouseUp"] as const) {
      if (applied[eventType] === desired[eventType]) continue
      super.enqueue("setEventListener", id, eventType, desired[eventType])
      applied[eventType] = desired[eventType]
    }
    this.#applied.set(id, applied)
  }

  #forgetSubtree(rootId: number): void {
    const stack = [rootId]
    while (stack.length > 0) {
      const id = stack.pop()!
      for (const childId of this.#children.get(id) ?? []) stack.push(childId)
      const parentId = this.#parents.get(id)
      if (parentId !== undefined) {
        const siblings = this.#children.get(parentId)
        siblings?.delete(id)
        if (siblings?.size === 0) this.#children.delete(parentId)
      }
      this.#parents.delete(id)
      this.#children.delete(id)
      this.#elementTypes.delete(id)
      this.#directClickListeners.delete(id)
      this.#authoredMouseDownOwners.delete(id)
      this.#authored.delete(id)
      this.#applied.delete(id)
      if (this.#rootId === id) this.#rootId = undefined
    }
  }
}
