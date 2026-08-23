const validVirtualList = (
  <virtual-list
    alignment="bottom"
    followTail
    overdraw={4}
    estimatedItemHeight={28}
    style={{ height: 200 }}
    ref={() => {}}
  >
    <text>row</text>
  </virtual-list>
)

// @ts-expect-error Upstream VirtualListProps does not expose generic event props.
const virtualListWithEvent = <virtual-list onClick={() => {}} />

// @ts-expect-error Upstream VirtualListProps does not expose generic focus props.
const virtualListWithFocus = <virtual-list autoFocus />

void validVirtualList
void virtualListWithEvent
void virtualListWithFocus
