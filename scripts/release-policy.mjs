import process from "node:process"

const PROVENANCE_BOOTSTRAP_EXCEPTIONS = new Set([
  "gpuix-solid@0.1.0-beta.4",
])

export function provenancePolicy(packageName, version) {
  if (!packageName) throw new Error("provenance policy requires a package name")
  if (!version) throw new Error("provenance policy requires a version")

  const release = `${packageName}@${version}`
  if (PROVENANCE_BOOTSTRAP_EXCEPTIONS.has(release)) {
    return {
      required: false,
      release,
      reason: "one-time manual npm package-name migration bootstrap",
    }
  }

  return {
    required: true,
    release,
    reason: "trusted publishing release",
  }
}

function option(args, name) {
  const index = args.indexOf(name)
  return index < 0 ? undefined : args[index + 1]
}

const invoked = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]
if (invoked) {
  try {
    const args = process.argv.slice(2)
    const policy = provenancePolicy(option(args, "--package"), option(args, "--version"))
    process.stdout.write(`${policy.required ? "required" : "bootstrap-exception"}\n`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
