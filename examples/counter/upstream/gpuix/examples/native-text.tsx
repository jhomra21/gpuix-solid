/**
 * GPUIX native text components.
 *
 * Shows `<markdown>`, `<code>` and `<diff>` — three elements that render text
 * with Tree-sitter syntax highlighting inside Rust, and stay selectable and
 * copyable through the shared selection registry.
 *
 * Drag across any two blocks and press Cmd+C. The selection spans them,
 * because every painted text element registers into one per-frame registry in
 * paint order, no matter which element drew it.
 *
 * Run with:  cd examples && bun run native-text
 */

import React, { useState } from 'react'
import { render } from '@gpuix/react'

const README = `# GPUIX

Build **native** desktop apps with *React*, rendered on the \`GPU\`.

## Why

- Selectable text everywhere, across element boundaries
- Tree-sitter highlighting computed in Rust
- Diffs virtualized with GPUI's \`list()\`

> Immediate mode aligns with React's model: rebuild every frame.

See https://github.com/remorses/gpuix for more.
`

const SAMPLE = `export function greet(user: User): string {
  // Say hello.
  return \`hello \${user.name}\`
}`

const PATCH = [
  'diff --git a/src/server.ts b/src/server.ts',
  '--- a/src/server.ts',
  '+++ b/src/server.ts',
  '@@ -1,5 +1,6 @@',
  " import { createServer } from 'http'",
  ' ',
  '-const port = 3000',
  '+const port = 8080',
  "+const host = '0.0.0.0'",
  ' ',
  ' export function start() {',
  '-  return createServer().listen(port)',
  '+  return createServer().listen(port, host)',
  ' }',
].join('\n')

const TABS = ['markdown', 'code', 'diff'] as const
type Tab = (typeof TABS)[number]

function Tabs({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 4,
        padding: 8,
        // Chrome must never start a text drag, or clicking a tab selects it.
        userSelect: 'none',
      }}
    >
      {TABS.map((tab) => (
        <div
          key={tab}
          style={{
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 6,
            fontSize: 12,
            cursor: 'pointer',
            color: tab === active ? '#ebebeb' : '#b4b4b4',
            backgroundColor: tab === active ? '#ffffff14' : '#00000000',
            hover: { backgroundColor: '#ffffff0d' },
          }}
          onClick={() => onSelect(tab)}
        >
          {tab}
        </div>
      ))}
    </div>
  )
}

/**
 * `<code>` paints glyphs only: no fill, border, radius, padding or header.
 * The card is app code, built from a plain `<div>` and the `style` prop.
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffffff1f',
        backgroundColor: '#ffffff09',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 12,
          paddingRight: 12,
          borderBottomWidth: 1,
          borderColor: '#ffffff1f',
          backgroundColor: '#ffffff05',
        }}
      >
        <text style={{ fontSize: 11, color: '#b4b4b4' }}>{language}</text>
      </div>
      <code
        code={code}
        language={language}
        showLineNumbers
        style={{ minWidth: 0, paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12 }}
      />
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<Tab>('markdown')
  const [status, setStatus] = useState('drag across blocks, then press Cmd+C')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#060606',
      }}
    >
      <Tabs active={tab} onSelect={setTab} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minHeight: 0,
          padding: 24,
          overflowY: tab === 'diff' ? undefined : 'scroll',
        }}
      >
        {tab === 'markdown' && (
          <markdown source={README} onLinkClick={(e) => setStatus(`link: ${e.value}`)} />
        )}
        {tab === 'code' && <CodeBlock code={SAMPLE} language="typescript" />}
        {tab === 'diff' && (
          <diff
            scroll
            patch={PATCH}
            wordDiff
            style={{ flexGrow: 1, minHeight: 0 }}
            onLineClick={(e) => setStatus(`line ${e.newLine ?? e.oldLine}: ${e.value}`)}
            onToggleFile={(e) => setStatus(`toggle: ${e.value}`)}
          />
        )}
      </div>

      <div
        style={{
          padding: 10,
          fontSize: 11,
          color: '#8d8d8d',
          userSelect: 'none',
        }}
      >
        {status}
      </div>
    </div>
  )
}

render(<App />, {
  title: 'GPUIX Native Text',
  width: 900,
  height: 700,
  // Agent checks need real GPU paint, not control of the user's keyboard.
  focus: process.env.GPUIX_BACKGROUND !== '1',
})
