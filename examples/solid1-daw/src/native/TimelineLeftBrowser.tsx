import type { JSX } from "solid-js"
import { TimelineLeftBrowser as UpstreamTimelineLeftBrowser } from "../upstream/components/timeline/browser/timeline-left-browser"
import type {
  BrowserItem,
  BrowserSection,
  BrowserTreeExpansionState,
  TimelineBrowserTab,
  TimelineLeftBrowserModel,
} from "../upstream/components/timeline/browser/browser-types"
import { browserSections, type BrowserTab } from "./model"
import { layout } from "./theme"

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

const emptyQueries = (): Record<TimelineBrowserTab, string> => ({
  assets: "",
  effects: "",
  "midi-instruments": "",
})

const emptyScroll = (): Record<TimelineBrowserTab, number> => ({
  assets: 0,
  effects: 0,
  "midi-instruments": 0,
})

function itemForTab(tab: TimelineBrowserTab, item: { id: string; label: string; subtitle?: string }): BrowserItem {
  return {
    id: item.id,
    source: tab === "assets" ? "project" : "builtin",
    category: tab === "assets" ? "sample" : tab === "effects" ? "audio-effect" : "midi-instrument",
    label: item.label,
    subtitle: item.subtitle,
    searchText: `${item.label} ${item.subtitle ?? ""}`.trim().toLowerCase(),
  }
}

function sourceSections(tab: TimelineBrowserTab, query: string): BrowserSection[] {
  const normalized = query.trim().toLowerCase()
  return browserSections[tab]
    .map((section) => {
      const items = section.items
        .map((item) => itemForTab(tab, item))
        .filter((item) => !normalized || item.searchText.includes(normalized))
      return {
        id: section.id,
        label: section.label,
        leafCount: items.length,
        rows: items.map((item) => ({ kind: "leaf" as const, item })),
      }
    })
    .filter((section) => section.leafCount > 0 || !normalized)
}

function treeExpansion(props: TimelineLeftBrowserProps): Record<TimelineBrowserTab, BrowserTreeExpansionState> {
  const stateFor = (tab: TimelineBrowserTab): BrowserTreeExpansionState =>
    Object.fromEntries(browserSections[tab].map((section) => [`section:${section.id}`, props.expandedSections.has(section.id)]))
  return {
    assets: stateFor("assets"),
    effects: stateFor("effects"),
    "midi-instruments": stateFor("midi-instruments"),
  }
}

export const TimelineLeftBrowser = (props: TimelineLeftBrowserProps): JSX.Element => {
  const browser: TimelineLeftBrowserModel = {
    get open() {
      return props.open
    },
    widthPx: layout.browserWidth,
    get activeTab() {
      return props.activeTab
    },
    get searchQueryByTab() {
      const queries = emptyQueries()
      queries[props.activeTab] = props.searchQuery
      return queries
    },
    get scrollTopByTab() {
      return emptyScroll()
    },
    get treeExpansionByTab() {
      return treeExpansion(props)
    },
    assets: {
      sections: () => sourceSections("assets", props.activeTab === "assets" ? props.searchQuery : ""),
      folderOptions: () => [],
      renameFolderInline: {
        folderId: () => null,
        name: () => "",
        busy: () => false,
        setName: () => {},
        onConfirm: () => {},
        onCancel: () => {},
      },
      onInsert: props.onActivateItem,
      onDragStart: (_event, itemId) => props.onActivateItem(itemId),
      onCreateFolder: () => {},
      onRenameFolder: () => {},
      onDeleteFolder: () => {},
      onMoveSampleToFolder: () => {},
      sampleFolderId: () => undefined,
      folderSampleCount: () => 0,
    },
    devices: {
      effectSections: () => sourceSections("effects", props.activeTab === "effects" ? props.searchQuery : ""),
      instrumentSections: () => sourceSections("midi-instruments", props.activeTab === "midi-instruments" ? props.searchQuery : ""),
      dragSession: () => undefined,
      onAddEffect: props.onActivateItem,
      onAddInstrument: props.onActivateItem,
      onDevicePointerDown: () => {},
    },
    onToggle: () => {},
    onSelectTab: (tab) => props.onSelectTab(tab),
    onSearchQueryChange: (tab, query) => {
      if (tab === props.activeTab) props.onSearchQueryChange(query)
    },
    onScrollTopChange: () => {},
    onTreeRowExpandedChange: (_tab, rowId) => {
      if (rowId.startsWith("section:")) props.onToggleSection(rowId.slice("section:".length))
    },
    onResizePointerDown: () => {},
  }

  return (
    <div
      testId="browser-sidebar"
      style={{
        width: layout.browserWidth,
        minWidth: layout.browserWidth,
        height: "100%",
        flexShrink: 0,
      }}
    >
      <UpstreamTimelineLeftBrowser browser={browser} />
    </div>
  )
}
