import { createSignal } from "solid-js"

export function SourceDomFixture() {
  const [active, setActive] = createSignal(false)

  return (
    <main class="min-h-0 flex flex-col" classList={{ active: active() }}>
      <header class="h-12 flex items-center px-4">
        <h1 class="text-sm font-medium">Copied Solid UI</h1>
        <button
          type="button"
          class="ml-auto rounded-md px-2 py-1"
          aria-label="Toggle source UI"
          onClick={() => setActive(!active())}
        >
          Toggle
        </button>
      </header>
      <section class="flex-1">
        <p class="text-muted-foreground">
          Exact <strong>semantic</strong> source markup.
        </p>
        <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true">
          <path d="M2 8h12" stroke="currentColor" stroke-width="2" />
        </svg>
      </section>
    </main>
  )
}
