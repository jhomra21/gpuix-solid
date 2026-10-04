export default function Project() {
  return (
    <stage id="stage" background="#161616" camera={[0.3, 0, 0, 0.3, 85, 150]}>
      <scene id="motion-scene" name="Motion" width={1920} height={1080} fill="#101014" active>
        <rect
          id="animated-card"
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
          <keyframeTrack id="card-x-track" property="x">
            <keyframe id="card-x-0" time={0} value={120} easing="easeInOut" />
            <keyframe id="card-x-4" time={4} value={1320} easing="easeInOut" />
            <keyframe id="card-x-8" time={8} value={120} easing="easeInOut" />
          </keyframeTrack>
          <keyframeTrack id="card-rotation-track" property="rotation">
            <keyframe id="card-rotation-0" time={0} value={0} />
            <keyframe id="card-rotation-4" time={4} value={12} easing="easeInOut" />
            <keyframe id="card-rotation-8" time={8} value={0} easing="easeInOut" />
          </keyframeTrack>
        </rect>

        <text
          id="title"
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

      <scene id="second-scene" name="Second scene" x={2200} width={1920} height={1080} fill="#18181b">
        <rect id="second-card" name="Second card" x={560} y={300} width={800} height={480} cornerRadius={48} fill="#0ea5e9" />
      </scene>
    </stage>
  )
}
