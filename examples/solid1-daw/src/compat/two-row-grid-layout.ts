export type TwoRowGridDefinition = {
  leftWidth: number
  rightWidth: number
  bottomHeight: number
}

export type TwoRowGridPlacement = {
  column: 0 | 1 | 2
  row: 0 | 1
  rowSpan: 1 | 2
}

export type TwoRowGridLayoutStyle = {
  position: "absolute"
  top?: number
  right?: number
  bottom?: number
  left?: number
  width?: number
  height?: number
}

export function parseTwoRowGridDefinition(
  columns: string | undefined,
  rows: string | undefined,
): TwoRowGridDefinition | undefined {
  if (!columns || !rows) return undefined
  const columnMatch = columns.trim().match(
    /^(\d+(?:\.\d+)?)px\s+(?:minmax\(\s*\d+(?:\.\d+)?px\s*,\s*\d+(?:\.\d+)?fr\s*\)|\d+(?:\.\d+)?fr)\s+(\d+(?:\.\d+)?)px$/i,
  )
  const rowMatch = rows.trim().match(
    /^minmax\(\s*0(?:px)?\s*,\s*\d+(?:\.\d+)?fr\s*\)\s+(\d+(?:\.\d+)?)px$/i,
  )
  if (!columnMatch || !rowMatch) return undefined

  const leftWidth = Number(columnMatch[1])
  const rightWidth = Number(columnMatch[2])
  const bottomHeight = Number(rowMatch[1])
  if (![leftWidth, rightWidth, bottomHeight].every((value) => Number.isFinite(value) && value >= 0)) return undefined
  return { leftWidth, rightWidth, bottomHeight }
}

export function placeTwoRowGridItems(rowSpans: readonly (1 | 2)[]): TwoRowGridPlacement[] | undefined {
  const occupied = [
    [false, false, false],
    [false, false, false],
  ]
  const placements: TwoRowGridPlacement[] = []

  for (const rowSpan of rowSpans) {
    let placement: TwoRowGridPlacement | undefined
    for (const row of [0, 1] as const) {
      if (rowSpan === 2 && row !== 0) continue
      for (const column of [0, 1, 2] as const) {
        if (occupied[row][column]) continue
        if (rowSpan === 2 && occupied[1][column]) continue
        placement = { column, row, rowSpan }
        break
      }
      if (placement) break
    }
    if (!placement) return undefined
    occupied[placement.row][placement.column] = true
    if (placement.rowSpan === 2) occupied[1][placement.column] = true
    placements.push(placement)
  }

  return placements
}

export function twoRowGridItemStyle(
  definition: TwoRowGridDefinition,
  placement: TwoRowGridPlacement,
): TwoRowGridLayoutStyle {
  const style: TwoRowGridLayoutStyle = { position: "absolute" }

  if (placement.column === 0) {
    style.left = 0
    style.width = definition.leftWidth
  } else if (placement.column === 1) {
    style.left = definition.leftWidth
    style.right = definition.rightWidth
  } else {
    style.right = 0
    style.width = definition.rightWidth
  }

  if (placement.rowSpan === 2) {
    style.top = 0
    style.bottom = 0
  } else if (placement.row === 0) {
    style.top = 0
    style.bottom = definition.bottomHeight
  } else {
    style.bottom = 0
    style.height = definition.bottomHeight
  }

  return style
}
