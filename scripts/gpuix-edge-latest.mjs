import { spawnSync } from "node:child_process"

const mode = process.argv[2] ?? "check"
if (mode !== "prepare" && mode !== "check") {
  throw new Error(`Unknown latest-edge mode ${JSON.stringify(mode)}. Use prepare or check.`)
}

const tip = capture("node", ["scripts/gpuix-edge.mjs", "tip"])
const env = { ...process.env, GPUIX_EDGE_SHA: tip }

console.log(`Testing latest GPUIX main: ${tip}`)
run("bun", ["run", "gpuix:edge:prepare"], env)
run("bun", ["run", "gpuix:edge:status"], env)
if (mode === "check") run("bun", ["run", "gpuix:edge:check"], env)

function run(executable, args, env) {
  const result = spawnSync(executable, args, { stdio: "inherit", env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed with exit code ${result.status}`)
  }
}

function capture(executable, args) {
  const result = spawnSync(executable, args, { encoding: "utf8", env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed with exit code ${result.status}: ${result.stderr.trim()}`)
  }
  const output = result.stdout.trim()
  if (!/^[0-9a-f]{40}$/i.test(output)) {
    throw new Error(`Expected a GPUIX commit SHA, got ${JSON.stringify(output)}`)
  }
  return output
}
