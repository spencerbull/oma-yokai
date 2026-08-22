import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

type FleetModule = Record<string, (...args: any[]) => any>

function loadFleetModel(): FleetModule {
  const source = readFileSync(resolve(import.meta.dir, "../../qml/FleetModel.js"), "utf8")
    .replace(/^\.pragma library\s*/, "")
  const names = [
    "emptySettings",
    "emptySnapshot",
    "formatMemory",
    "normalizePayload",
    "phaseUrgent",
  ]
  return new Function(`${source}\nreturn { ${names.join(", ")} }`)() as FleetModule
}

const Fleet = loadFleetModel()

function fixture(devices: any[]) {
  return {
    devices: { devices },
    metrics: {
      "node-b": {
        timestamp: "2026-08-22T12:00:02Z",
        online: true,
        cpu: { percent: 30 },
        ram: { used_mb: 2048, total_mb: 8192, percent: 25 },
        gpus: [{ name: "Arc B390", utilization_percent: 60, vram_used_mb: 8192, vram_total_mb: 24576 }],
        containers: [
          { id: "c-2", name: "yokai-vllm-zeta", status: "running", ports: { "9000": "9000", "8000": "8000" } },
          { id: "c-1", name: "yokai-vllm-alpha", status: "exited" },
        ],
      },
      "node-a": {
        timestamp: "2026-08-22T12:00:01Z",
        online: true,
        cpu: { percent: 10 },
        ram: { used_mb: 1024, total_mb: 4096, percent: 25 },
        gpus: [{ name: "RTX", utilization_percent: 20, vram_used_mb: 1024, vram_total_mb: 8192 }],
        containers: [{ id: "a-1", name: "yokai-prometheus", status: "running" }],
      },
    },
    settings: { preferences: { theme: "omarchy" } },
  }
}

describe("FleetModel", () => {
  test("normalizes and sorts fleet data without locale-dependent ordering", () => {
    const first = Fleet.normalizePayload(fixture([
      { id: "node-b", label: "zeta", online: true },
      { id: "node-a", label: "Alpha", online: true },
    ]))
    const second = Fleet.normalizePayload(fixture([
      { id: "node-a", label: "Alpha", online: true },
      { id: "node-b", label: "zeta", online: true },
    ]))

    expect(first).toEqual(second)
    expect(first.devices.map((device: any) => device.id)).toEqual(["node-a", "node-b"])
    expect(first.services.map((service: any) => service.name)).toEqual(["vllm-alpha", "prometheus", "vllm-zeta"])
    expect(first.services[2].port).toBe(8000)
    expect(first.totals).toMatchObject({ devices: 2, onlineDevices: 2, services: 3, alertServices: 1, gpuCount: 2 })
    expect(first.updatedAt).toBe("2026-08-22T12:00:02Z")
  })

  test("fills partial settings without inventing or retaining secret values", () => {
    const snapshot = Fleet.normalizePayload({
      devices: [],
      metrics: {},
      settings: {
        token: "top-level-secret",
        hf: { token: "hf-secret", configured: true, source: "config", username: "operator" },
        preferences: { theme: "omarchy", password: "preference-secret" },
        integrations: { codex: { available: true, configured: true, secret: "integration-secret" } },
      },
    })
    expect(snapshot.settings.preferences.theme).toBe("omarchy")
    expect(snapshot.settings.hf).toEqual({ configured: true, source: "config", username: "operator" })
    expect(snapshot.settings.integrations.codex).toEqual({ available: true, configured: true })
    expect(JSON.stringify(snapshot.settings)).not.toMatch(/secret|token|password/)
  })

  test("uses stable empty and alert behavior", () => {
    expect(Fleet.emptySnapshot()).toMatchObject({ devices: [], services: [], updatedAt: "" })
    expect(Fleet.formatMemory(1536)).toBe("1.5 GB")
    expect(Fleet.phaseUrgent("error", Fleet.emptySnapshot())).toBe(true)
  })
})
