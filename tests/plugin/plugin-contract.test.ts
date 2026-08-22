import { afterEach, describe, expect, test } from "bun:test"
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"

const root = resolve(import.meta.dir, "../..")
const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return []
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function tempDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "oma-yokai-test-"))
  temporaryDirectories.push(directory)
  return directory
}

describe("native plugin contract", () => {
  test("manifest has the exact v1 service and bar widget entry points", () => {
    const manifest = JSON.parse(read("manifest.json"))
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      id: "io.github.spencerbull.oma-yokai",
      name: "OmaYokai",
      kinds: ["bar-widget", "service"],
      entryPoints: { barWidget: "BarWidget.qml", service: "Service.qml" },
    })
    for (const entryPoint of Object.values(manifest.entryPoints) as string[]) {
      expect(lstatSync(join(root, entryPoint)).isFile()).toBe(true)
      expect(entryPoint.startsWith("/")).toBe(false)
      expect(entryPoint.includes("..")).toBe(false)
    }
  })

  test("all deliberate panel views exist and destructive actions use confirmation controls", () => {
    for (const name of ["Overview", "Devices", "Services", "Deploy", "Settings"]) {
      expect(lstatSync(join(root, `qml/views/${name}View.qml`)).isFile()).toBe(true)
      expect(read("qml/DeepView.qml")).toContain(`Views.${name}View`)
    }
    expect(read("qml/views/DevicesView.qml")).toContain("ConfirmButton")
    expect(read("qml/views/ServicesView.qml").match(/ConfirmButton/g)?.length).toBe(3)
    expect(read("qml/views/DeployView.qml")).toContain("Confirm deploy")
    expect(read("qml/views/SettingsView.qml")).not.toMatch(/settings\.hf\.(token|secret)|agent_token|ssh_password/)
  })

  test("deploy editors suspend panel shortcuts and Escape deliberately returns panel focus", () => {
    const panel = read("Panel.qml")
    const deepView = read("qml/DeepView.qml")
    const deployView = read("qml/views/DeployView.qml")

    expect(panel).toContain("blocked: root.deepMode && deepView.modalInteractionActive")
    expect(deepView).toContain('currentSection === "deploy" && deployView.textEditing')
    expect(deployView).toContain("imageField.activeFocus || modelField.activeFocus || portField.activeFocus")
    expect(deployView.match(/Keys\.onEscapePressed/g)?.length).toBe(3)
    expect(panel).toContain("keyCatcher.forceActiveFocus()")
  })

  test("unavailable glance offers Retry and settings uses truthful TUI copy", () => {
    const simpleView = read("qml/SimpleView.qml")

    expect(simpleView).toContain('root.phase === "error" ? "Retry"')
    expect(simpleView).toContain('(root.phase === "needs_install" || root.phase === "error") ? root.refreshRequested()')
    expect(simpleView).toContain('(root.phase === "error" && yokai.lastError)')
    expect(read("qml/views/SettingsView.qml")).toContain('text: "Open full TUI"')
    expect(read("qml/views/SettingsView.qml")).not.toContain("Open TUI settings")
  })

  test("plugin payload contains no symlinks and scripts are executable", () => {
    for (const path of walk(root)) expect(lstatSync(path).isSymbolicLink()).toBe(false)
    for (const name of ["validate-plugin", "yokai-api", "yokai-ensure-daemon", "yokai-snapshot", "yokai-which"]) {
      expect(lstatSync(join(root, "scripts", name)).mode & 0o111).not.toBe(0)
    }
  })

  test("module, updater, installer, TUI, and release archives use the OmaYokai identity", () => {
    expect(read("go.mod")).toMatch(/^module github\.com\/spencerbull\/oma-yokai$/m)
    expect(read("internal/upgrade/upgrade.go")).toContain("github.com/spencerbull/oma-yokai/releases/download")
    expect(read("internal/upgrade/upgrade.go")).toContain('projectName      = "OmaYokai"')
    expect(read("install.sh")).toContain('REPO="spencerbull/oma-yokai"')
    expect(read("install.sh")).toContain('PROJECT_NAME="OmaYokai"')
    expect(read(".goreleaser.yml")).toContain("project_name: OmaYokai")
    expect(JSON.parse(read("ui/tui/package.json")).name).toBe("@oma-yokai/tui")
  })

  test("release publishing requires an explicit tag push or manual dispatch", () => {
    const workflow = read(".github/workflows/release.yml")
    const triggerBlock = workflow.slice(0, workflow.indexOf("\npermissions:"))

    expect(triggerBlock).toContain("tags:")
    expect(triggerBlock).toContain("- 'v*'")
    expect(triggerBlock).toContain("workflow_dispatch:")
    expect(triggerBlock).not.toContain("branches:")
    expect(workflow).not.toContain("github.event.head_commit")
  })
})

describe("script boundaries", () => {
  test("API script keeps stdin JSON literal and out of its argv", () => {
    const directory = tempDirectory()
    const curl = join(directory, "curl")
    const argumentLog = join(directory, "args")
    writeFileSync(curl, '#!/bin/sh\nprintf "%s\\n" "$@" >"$ARGUMENT_LOG"\nprintf \'{"ok":true}\\n\'\n')
    chmodSync(curl, 0o755)

    const body = '{"token":"@/etc/passwd","line":"one\\ntwo"}'
    const command = [join(root, "scripts/yokai-api"), "POST", "/devices/a%2Fb/test?query=x%20y", "127.0.0.1:7473", "--stdin-json"]
    const input = join(directory, "request-body")
    writeFileSync(input, `${body}\n`)
    expect(command).not.toContain(body)

    const result = Bun.spawnSync({
      cmd: command,
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, ARGUMENT_LOG: argumentLog },
      stdin: Bun.file(input),
    })

    expect(result.exitCode).toBe(0)
    const args = readFileSync(argumentLog, "utf8").split("\n")
    expect(args).toContain("--data-raw")
    expect(args).toContain(body)
    expect(args).toContain("http://127.0.0.1:7473/devices/a%2Fb/test?query=x%20y")
  })

  test("service writes request bodies to Process stdin and clears them", () => {
    const service = read("Service.qml")

    expect(service).toContain('command.push("--stdin-json")')
    expect(service).not.toContain("command.push(body)")
    expect(service).toContain("stdinEnabled: true")
    expect(service).toContain('write(pendingBody + "\\n")')
    expect(service).toContain('pendingBody = ""')
  })

  test("API script rejects legacy argv bodies and missing stdin", () => {
    const directory = tempDirectory()
    const legacy = Bun.spawnSync({
      cmd: [join(root, "scripts/yokai-api"), "POST", "/deploy", "127.0.0.1:7473", '{"password":"argv-secret"}'],
    })
    expect(legacy.exitCode).toBe(64)
    expect(new TextDecoder().decode(legacy.stderr)).toContain("unsupported body transport")

    const emptyInput = join(directory, "empty-input")
    writeFileSync(emptyInput, "")
    const missing = Bun.spawnSync({
      cmd: [join(root, "scripts/yokai-api"), "POST", "/deploy", "127.0.0.1:7473", "--stdin-json"],
      stdin: Bun.file(emptyInput),
    })
    expect(missing.exitCode).toBe(64)
    expect(new TextDecoder().decode(missing.stderr)).toContain("not provided on stdin")
  })

  test("service rearms bounded daemon recovery and preserves structured snapshot errors", () => {
    const service = read("Service.qml")

    expect(service).toContain('(phase === "checking" || phase === "needs_install") && !daemonStartAttempted')
    expect(service).toContain('errorCode === "" || errorCode === "daemon_unreachable"')
    expect(service).toContain('case "metrics_unavailable"')
    expect(service.match(/daemonStartAttempted = false/g)?.length).toBeGreaterThanOrEqual(3)
  })

  test("API and snapshot scripts reject non-loopback or malformed daemon addresses", () => {
    for (const [script, args] of [
      ["yokai-api", ["GET", "/health", "example.com:80"]],
      ["yokai-api", ["GET", "/health", "127.0.0.1:7473/path"]],
      ["yokai-snapshot", ["10.0.0.5:7473"]],
    ] as const) {
      const result = Bun.spawnSync({ cmd: [join(root, "scripts", script), ...args] })
      expect(result.exitCode).toBe(64)
    }
  })

  test("snapshot fails closed on malformed endpoint JSON and emits one deterministic document", () => {
    const directory = tempDirectory()
    const curl = join(directory, "curl")
    writeFileSync(curl, `#!/bin/sh
url=""
for argument do
  case "$argument" in http://*) url="$argument" ;; esac
done
case "$url" in
  */health) printf '%s\\n' '{"healthy":true}' ;;
  */devices) printf '%s\\n' '{"devices":[{"id":"node-a"}]}' ;;
  */metrics)
    if [ "\${BAD_METRICS:-}" = "1" ]; then printf '%s\\n' 'not-json'; else printf '%s\\n' '{"node-a":{"online":true}}'; fi
    ;;
  */settings) printf '%s\\n' '{"hf":{"configured":false}}' ;;
  *) exit 22 ;;
esac
`)
    chmodSync(curl, 0o755)
    const env = { ...process.env, PATH: `${directory}:/usr/bin:/bin` }

    const success = Bun.spawnSync({ cmd: [join(root, "scripts/yokai-snapshot")], env })
    expect(success.exitCode).toBe(0)
    expect(JSON.parse(new TextDecoder().decode(success.stdout))).toEqual({
      ok: true,
      health: { healthy: true },
      devices: { devices: [{ id: "node-a" }] },
      metrics: { "node-a": { online: true } },
      settings: { hf: { configured: false } },
    })

    const failure = Bun.spawnSync({
      cmd: [join(root, "scripts/yokai-snapshot")],
      env: { ...env, BAD_METRICS: "1" },
    })
    expect(failure.exitCode).toBe(1)
    expect(new TextDecoder().decode(failure.stderr)).toContain('"error":"metrics_unavailable"')
  })

  test("binary discovery returns an absolute executable path from plugin directories with spaces", () => {
    const directory = tempDirectory()
    const pluginDirectory = join(directory, "plugin with spaces")
    const binaryDirectory = join(pluginDirectory, "bin")
    mkdirSync(binaryDirectory, { recursive: true })
    writeFileSync(join(binaryDirectory, "yokai"), "#!/bin/sh\nexit 0\n")
    chmodSync(join(binaryDirectory, "yokai"), 0o755)

    const result = Bun.spawnSync({
      cmd: [join(root, "scripts/yokai-which"), pluginDirectory],
      env: { ...process.env, HOME: join(directory, "empty-home"), PATH: "/usr/bin:/bin" },
    })
    expect(result.exitCode).toBe(0)
    expect(new TextDecoder().decode(result.stdout).trim()).toBe(join(binaryDirectory, "yokai"))
  })
})
