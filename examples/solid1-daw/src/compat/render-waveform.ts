type WaveformRenderOptions = {
  ctx: CanvasRenderingContext2D
  peaks: Uint8Array
  drawCols: number
  padPx: number
  topY: number
  contentH: number
  cssW: number
  cssH: number
  fillStyle: string
  boundaryStyle: string
  maxHeightFraction: number
  amplitudeScaleAtColumn?: (column: number) => number
}

export function drawWaveformPeaks(_options: WaveformRenderOptions): void {
  // GPUIX 0.7 has no Canvas 2D surface. Exact source feature-detects this through getContext().
}
