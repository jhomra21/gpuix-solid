export default function Project() {
  return (
    <stage background="#161616" camera={[0.3, 0, 0, 0.3, 85, 150]}>
      <scene name="Motion" width={1920} height={1080} fill="#101014" active>
        <rect
          name="Animated card"
          x={120}
          y={330}
          width={420}
          height={260}
          cornerRadius={36}
          fill="#6366f1"
          start={0}
          end={8}
        >
          <keyframeTrack property="x">
            <keyframe time={0} value={120} easing="easeInOut" />
            <keyframe time={4} value={1320} easing="easeInOut" />
            <keyframe time={8} value={120} easing="easeInOut" />
          </keyframeTrack>
          <keyframeTrack property="rotation">
            <keyframe time={0} value={0} />
            <keyframe time={4} value={12} easing="easeInOut" />
            <keyframe time={8} value={0} easing="easeInOut" />
          </keyframeTrack>
        </rect>

        <text
          name="Title"
          x={180}
          y={120}
          width={1560}
          height={120}
          fontFamily="Inter"
          fontSize={72}
          fontWeight={700}
          color="#ffffff"
          start={0}
          end={8}
        >
          Diffusion Studio on GPUIX
        </text>
      </scene>

      <scene name="Second scene" x={2200} width={1920} height={1080} fill="#18181b">
        <rect name="Second card" x={560} y={300} width={800} height={480} cornerRadius={48} fill="#0ea5e9" />
      </scene>
    </stage>
  )
}
