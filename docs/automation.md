# Automation and testing

GPUix Solid has one locator API over two backends: an in-process native TestRenderer and a live stdio connection to a running native application.

## In-process native tests

```ts
import { createTestApp, createTestRoot } from "gpuix-solid"

const root = createTestRoot()
root.render(() => <App />)

const app = createTestApp(root.renderer)
await app.getByTestId("save").click()
await app.getByTestId("name").fill("New name")
await app.getByTestId("clip").dragBy(120, 0, { steps: 8 })
```

The TestRenderer path is deterministic and can inspect the retained accessibility/automation tree, query painted bounds, synthesize pointer and keyboard input, control the test clock, take screenshots, and synthesize native file drops where the test renderer exposes them.

## Locators

The public locator surface includes:

- `getByTestId()`, `getByText()`, and `getByType()`;
- descendant locator chaining;
- `all()`, `count()`, `element()`, `bounds()`, and `waitFor()`;
- `click()`, `hover()`, `wheel()`, `dragTo()`, `dragBy()`, `fill()`, and `press()`;
- `textContent()`;
- `dropFiles()` when the backend supports OS-file-drop synthesis.

Ambiguous, missing, timed-out, unsupported, closed, protocol, security, and cancellation failures use `AutomationError` with a stable error code.

## Live native automation

The `gpuix-solid/automation` subpath exposes `launch()` and `connectStdio()`.

```ts
import { launch } from "gpuix-solid/automation"

const app = await launch({
  command: "bun",
  args: ["dist/index.js"],
  cwd: process.cwd(),
})

await app.getByTestId("save").click()
await app.screenshot({ path: "/tmp/app.png" })
await app.close()
```

`launch()` starts the real application with piped stdin/stdout. GPUix Solid enables its automation server for that non-TTY process, performs a protocol-version handshake, and drives the same locator API over the live native renderer.

Use `connectStdio()` when another process manager owns the child and you only need to supply readable/writable chunks.

## Mouse and clock primitives

For cases that should not be expressed through one element, `app.mouse` can move, press, release, click, wheel, and drag between locators or explicit points.

`app.clock` can pause, set, fast-forward, and resume the deterministic native test clock.

## Validation policy

A logic-only TestRenderer pass is not enough evidence for behavior that can differ in the production adapter or native event loop. Release qualification therefore combines unit/contract tests with source-edge checks, clean package consumers, live native automation, screenshots where relevant, and focused foreground acceptance when literal physical input matters.

See [Release qualification](./release-candidate.md) and [Performance methodology](./performance.md).
