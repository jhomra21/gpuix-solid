import { spawnSync } from "node:child_process"
import { cpus, homedir, platform, release, totalmem } from "node:os"

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(" ")}`)
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function text(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  })
  if (result.status !== 0) return "unknown"
  return result.stdout.trim() || "unknown"
}

const cpu = cpus()[0]
const gitSha = text("git", ["rev-parse", "HEAD"])
const bunVersion = text("bun", ["--version"])
const nodeVersion = process.version

console.log("# GPUix Solid benchmark report")
console.log(`date: ${new Date().toISOString()}`)
console.log(`git: ${gitSha}`)
console.log(`os: ${platform()} ${release()}`)
console.log(`cpu: ${cpu?.model ?? "unknown"} (${cpus().length} logical cores)`)
console.log(`memory: ${(totalmem() / 1024 ** 3).toFixed(1)} GiB`)
console.log(`bun: ${bunVersion}`)
console.log(`node: ${nodeVersion}`)
console.log(`home: ${homedir().replace(homedir(), "~")}`)
console.log("policy: local-machine measurements only; do not compare numbers across different hardware")

run("bun", ["run", "--filter", "gpuix-solid", "build"])
run("bun", ["run", "--filter", "gpuix-solid-counter", "perf:chat"])
run("bun", ["run", "--filter", "gpuix-solid-counter", "perf:timeline"])
run("bun", ["run", "--filter", "gpuix-solid-counter", "bench:serialization"])
