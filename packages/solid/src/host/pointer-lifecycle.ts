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
 * A synchronous source mutation can also paint a new sibling relay surface
 * between press and release. On some GPUI backends that new surface receives
 * the physical mouse-up instead of the root. If the original pressed target is
 * still live beneath the release point, recover that sibling release to the
 * pressed target; if the target was actually remounted/destroyed, leave the
 * release on the new surface so browser-global pointer-up still fires.
 *
 * Native hit paths can report more than one subscribed ancestor/descendant for
 * one physical press. Those related callbacks are not treated as sibling relay
 * surfaces, so the structurally deepest pressed listener remains the fallback
 * regardless of native callback order.
 */
export class BrowserPointerReleaseRelay {
  #pressedElementId: number | undefined
  #rootFallback: { elementId: number; burst: PointerReleaseBurst } | undefined
  #completedRelease: { elementId: number; burst: PointerReleaseBurst } | undefined

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
      this.#completedRelease = undefined
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

      const pressedElementId = this.#pressedElementId
      if (event.elementId === pressedElementId) {
        this.#pressedElementId = undefined
        this.#rememberCompletedRelease(event.elementId, burst)
        return event
      }

      if (
        pressedElementId !== undefined
        && !isDescendantOf(event.elementId, pressedElementId)
        && !isDescendantOf(pressedElementId, event.elementId)
      ) {
        this.#pressedElementId = undefined
        if (!canRouteRootRelease(pressedElementId, event)) return event
        this.#rememberRecoveredRelease(pressedElementId, burst)
        return { ...event, elementId: pressedElementId }
      }

      return event
    }

    const pressedElementId = this.#pressedElementId
    if (pressedElementId === undefined) {
      const completed = this.#completedRelease
      if (completed && sameReleaseBurst(completed.burst, burst)) {
        this.#completedRelease = undefined
        return undefined
      }
      return event
    }

    this.#pressedElementId = undefined
    if (pressedElementId === rootId || !canRouteRootRelease(pressedElementId, event)) {
      return event
    }

    this.#rememberFallbackRelease(pressedElementId, burst)
    return { ...event, elementId: pressedElementId }
  }

  clear(): void {
    this.#pressedElementId = undefined
    this.#rootFallback = undefined
    this.#completedRelease = undefined
  }

  #rememberFallbackRelease(elementId: number, burst: PointerReleaseBurst): void {
    const fallback = { elementId, burst }
    this.#rootFallback = fallback
    queueMicrotask(() => {
      if (this.#rootFallback === fallback) this.#rootFallback = undefined
    })
  }

  #rememberCompletedRelease(elementId: number, burst: PointerReleaseBurst): void {
    const completed = { elementId, burst }
    this.#completedRelease = completed
    queueMicrotask(() => {
      if (this.#completedRelease === completed) this.#completedRelease = undefined
    })
  }

  #rememberRecoveredRelease(elementId: number, burst: PointerReleaseBurst): void {
    this.#rememberFallbackRelease(elementId, burst)
    this.#rememberCompletedRelease(elementId, burst)
  }
}

/**
 * Browser code commonly starts a gesture on an element and listens for
 * pointermove/pointerup on window. GPUIX, unlike the browser, implicitly
 * captures a pointer whenever one retained node subscribes to both mouseDown
 * and mouseMove at the time the physical press is delivered. Do not manufacture
 * that combination before an ephemeral child is pressed: a reactive remount can
 * destroy the captured native node before release.
 *
 * Once an authored mouse-down has already been delivered, however, the pressed
 * surface may safely gain a temporary native mouseMove subscription for the
 * current gesture. That cannot retroactively capture the completed mouse-down,
 * and it gives browser-style window.pointermove a carrier when the pointer is
 * still over the pressed surface. If that move mounts a new drag surface, newly
 * connected non-press elements also receive move/up relay listeners without
 * mouseDown so the gesture can continue across the frame change. All temporary
 * relay listeners are removed on the physical release.
 *
 * Keep the mounted root move/up-only unless it has an authored mouseDown of its
 * own. Pre-arming a synthetic root mouseDown makes GPUI capture unrelated clicks
 * merely because another branch of the tree contains a gesture owner.
 */
export class BrowserPointerMutationDriver extends MutationDriver {
  readonly #authored = new Map<number, PointerLifecycleState>()
  readonly #applied = new Map<number, PointerLifecycleState>()
  readonly #parents = new Map<number, number>()
  readonly #children = new Map<number, Set<number>>()
  readonly #elementTypes = new Map<number, string>()
  readonly #directClickListeners = new Map<number, boolean>()
  readonly #activeRelayIds = new Set<number>()
  #rootId: number | undefined
  #authoredPointerRelayActive = false
  #activePressedRelayId: number | undefined

  constructor(renderer: NativeRenderer, events: EventRegistry) {
    super(renderer, events)
  }

  beginAuthoredPointerRelay(elementId: number): void {
    if (this.#authoredPointerRelayActive) return
    if (this.#authored.get(elementId)?.mouseDown !== true) return
    if (!this.#isConnectedDescendantOfRoot(elementId)) return
    this.#authoredPointerRelayActive = true
    this.#activePressedRelayId = elementId
    this.#syncPointerLifecycle(elementId)
  }

  endAuthoredPointerRelay(): void {
    if (!this.#authoredPointerRelayActive && this.#activeRelayIds.size === 0) return
    this.#authoredPointerRelayActive = false
    this.#activePressedRelayId = undefined
    for (const id of this.#activeRelayIds) this.#syncPointerLifecycle(id)
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
      return
    }

    if (name === "removeChild") {
      const childId = numberArg(args, 1)
      super.enqueue(name, ...args)
      this.#setParent(childId, null)
      this.#syncPointerSubtree(childId)
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
        this.#syncPointerLifecycle(id)
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

  #needsActiveRelay(id: number, authored: PointerLifecycleState, isRootRelay: boolean): boolean {
    if (!this.#authoredPointerRelayActive || isRootRelay || !this.#isConnectedDescendantOfRoot(id)) return false
    if (id === this.#activePressedRelayId) return authored.mouseDown
    if (authored.mouseDown || this.#needsClickPressProbe(id, authored)) return false
    return true
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
    const activeRelay = this.#needsActiveRelay(id, authored, isRootRelay)
    if (activeRelay) this.#activeRelayIds.add(id)
    else this.#activeRelayIds.delete(id)
    const desired = {
      mouseDown: authored.mouseDown || (!isRootRelay && this.#needsClickPressProbe(id, authored)),
      mouseMove: authored.mouseMove || isRootRelay || activeRelay,
      mouseUp: authored.mouseUp || authored.mouseDown || isRootRelay || activeRelay,
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
      this.#activeRelayIds.delete(id)
      this.#authored.delete(id)
      this.#applied.delete(id)
      if (this.#activePressedRelayId === id) this.#activePressedRelayId = undefined
      if (this.#rootId === id) this.#rootId = undefined
    }
  }
}
