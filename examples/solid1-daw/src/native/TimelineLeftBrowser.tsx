import { For, Show, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import { browserSections, type BrowserTab } from "./model"
import { dawTheme, layout, text2xs, text3xs, textXs } from "./theme"

const tabs: Array<{ id: BrowserTab; label: string }> = [
  { id: "assets", label: "Assets" },
  { id: "effects", label: "Effects" },
  { id: "midi-instruments", label: "MIDI Instruments" },
]

export interface TimelineLeftBrowserProps {
  open: boolean
  activeTab: BrowserTab
  onSelectTab: (tab: BrowserTab) => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  expandedSections: ReadonlySet<string>
  onToggleSection: (id: string) => void
  onActivateItem: (id: string) => void
}

export const TimelineLeftBrowser = (props: TimelineLeftBrowserProps): JSX.Element => {
  const visibleSections = () => {
    const query = props.searchQuery.trim().toLowerCase()
    if (!query) return browserSections[props.activeTab]
    return browserSections[props.activeTab]
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(query) || (item.subtitle ?? "").toLowerCase().includes(query)),
      }))
      .filter((section) => section.items.length > 0)
  }

  return (
    <Show when={props.open}>
      <div
        testId="browser-sidebar"
        style={{
          width: layout.browserWidth,
          minWidth: layout.browserWidth,
          height: "100%",
          backgroundColor: dawTheme.background,
          color: dawTheme.foreground,
          borderWidth: 1,
          borderColor: dawTheme.border,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 8, borderWidth: 1, borderColor: dawTheme.border, gap: 4 }}>
          <For each={tabs}>
            {(tab) => (
              <div
                testId={`browser-tab-${tab.id}`}
                onClick={() => props.onSelectTab(tab.id)}
                style={{
                  height: 28,
                  minHeight: 28,
                  paddingLeft: 8,
                  paddingRight: 8,
                  justifyContent: "center",
                  backgroundColor: props.activeTab === tab.id ? dawTheme.appSurface : dawTheme.background,
                  color: props.activeTab === tab.id ? dawTheme.foreground : dawTheme.mutedForeground,
                  cursor: "pointer",
                  hover: { backgroundColor: dawTheme.appSurface },
                }}
              >
                <text style={{ ...textXs, color: props.activeTab === tab.id ? dawTheme.foreground : dawTheme.mutedForeground }}>{tab.label}</text>
              </div>
            )}
          </For>
        </div>

        <div style={{ borderWidth: 1, borderColor: dawTheme.border }}>
          <input
            testId="browser-search"
            value={props.searchQuery}
            placeholder={`Search ${tabs.find((tab) => tab.id === props.activeTab)?.label.toLowerCase() ?? "browser"}`}
            onChange={(event: EventPayload) => props.onSearchQueryChange(event.value ?? "")}
            style={{
              width: "100%",
              height: 36,
              paddingLeft: 12,
              paddingRight: 12,
              backgroundColor: dawTheme.background,
              color: dawTheme.foreground,
              borderWidth: 0,
              fontSize: 12,
            }}
          />
        </div>

        <div style={{ flexGrow: 1, minHeight: 0, overflowY: "auto", paddingTop: 2, paddingBottom: 2 }}>
          <For each={visibleSections()}>
            {(section) => {
              const expanded = () => props.searchQuery.trim().length > 0 || props.expandedSections.has(section.id)
              return (
                <div>
                  <div
                    testId={`browser-section-${section.id}`}
                    onClick={() => props.onToggleSection(section.id)}
                    style={{
                      height: 24,
                      minHeight: 24,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      paddingLeft: 6,
                      paddingRight: 6,
                      cursor: "pointer",
                      hover: { backgroundColor: dawTheme.appSurface },
                    }}
                  >
                    <text style={{ ...textXs, width: 12, color: dawTheme.mutedForeground, textAlign: "center" }}>{expanded() ? "▾" : "▸"}</text>
                    <text style={{ ...text2xs, flexGrow: 1, color: dawTheme.mutedForeground, fontWeight: 700 }}>{section.label}</text>
                    <text style={{ ...textXs, color: dawTheme.mutedForeground }}>{String(section.items.length)}</text>
                  </div>
                  <Show when={expanded()}>
                    <For each={section.items}>
                      {(item) => (
                        <div
                          testId={`browser-item-${item.id}`}
                          onClick={() => props.onActivateItem(item.id)}
                          style={{
                            height: 24,
                            minHeight: 24,
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 20,
                            paddingRight: 12,
                            cursor: "pointer",
                            hover: { backgroundColor: dawTheme.appSurface },
                          }}
                        >
                          <text style={{ ...textXs, flexGrow: 1, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.label}</text>
                          <Show when={item.subtitle}>
                            <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{item.subtitle}</text>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              )
            }}
          </For>
          <Show when={visibleSections().length === 0}>
            <div style={{ margin: 8, padding: 8, borderWidth: 1, borderColor: dawTheme.border }}>
              <text style={{ ...textXs, color: dawTheme.mutedForeground }}>No items match this search.</text>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}
