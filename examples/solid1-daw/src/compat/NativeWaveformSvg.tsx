import type { JSX } from "solid-js"

export default function NativeWaveformSvg(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-native-waveform-placeholder="true"
    >
      <path
        d="M0 20 L4 17 L8 10 L12 14 L16 6 L20 12 L24 3 L28 9 L32 15 L36 7 L40 11 L44 4 L48 13 L52 8 L56 16 L60 5 L64 12 L68 9 L72 2 L76 14 L80 7 L84 11 L88 5 L92 15 L96 9 L100 20 L96 31 L92 25 L88 35 L84 29 L80 33 L76 26 L72 38 L68 31 L64 28 L60 35 L56 24 L52 32 L48 27 L44 36 L40 29 L36 33 L32 25 L28 31 L24 37 L20 28 L16 34 L12 26 L8 30 L4 23 Z"
        fill="rgba(255,255,255,0.52)"
      />
    </svg>
  )
}
