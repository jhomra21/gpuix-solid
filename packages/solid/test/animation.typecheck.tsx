import {
  animate,
  type AnimationStyle,
  type AnimationTransition,
} from "../src/index.js"

const target: AnimationStyle = {
  width: 240,
  opacity: 1,
  borderRadius: 12,
}

const transition: AnimationTransition = {
  duration: 0.25,
  delay: 0.05,
  ease: [0.25, 0.1, 0.25, 1],
}

const animated = (
  <animate.div
    initial={{ width: 120, opacity: 0 }}
    to={target}
    transition={transition}
    style={{ height: 44 }}
    tabIndex={0}
    testId="animated-card"
  >
    Native animation
  </animate.div>
)

const withoutInitial = <animate.div to={{ opacity: 0.5 }} />
const disabledInitial = <animate.div initial={false} to={{ opacity: 1 }} />

// @ts-expect-error The raw native motion wire prop is not public JSX API.
const rawMotion = <div motion={{ animate: { opacity: 1 } }} />

// @ts-expect-error animate.div uses `to`; the native `animate` field stays private.
const legacyTarget = <animate.div animate={{ opacity: 1 }} />

void animated
void withoutInitial
void disabledInitial
void rawMotion
void legacyTarget
