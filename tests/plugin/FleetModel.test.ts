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
    "barLabel",
    "formatMemory",
    "isAlertService",
    "isRunningService",
    "isStoppedService",
    "isTransitioningService",
    "isUnknownService",
    "normalizePayload",
    "phaseUrgent",
    "serviceDisplayState",
    "serviceGlyph",
    "serviceState",
    "serviceSummary",
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
          { id: "c-1", name: "yokai-vllm-alpha", status: "stopped" },
          { id: "c-3", name: "yokai-vllm-broken", status: "running", health: "unhealthy" },
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
    expect(first.services.map((service: any) => service.name)).toEqual(["vllm-broken", "prometheus", "vllm-zeta", "vllm-alpha"])
    expect(first.services[2].port).toBe(8000)
    expect(first.totals).toMatchObject({ devices: 2, onlineDevices: 2, services: 4, runningServices: 3, transitioningServices: 0, stoppedServices: 1, unknownServices: 0, alertServices: 1, gpuCount: 2 })
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
    expect(Fleet.isStoppedService({ status: "stopped", health: "unhealthy" })).toBe(true)
    expect(Fleet.isStoppedService({ status: "exited" })).toBe(true)
    expect(Fleet.isAlertService({ status: "stopped", health: "unhealthy" })).toBe(false)
    expect(Fleet.isRunningService({ status: "stopped" })).toBe(false)
    expect(Fleet.serviceDisplayState({ status: "stopped", health: "unhealthy" })).toBe("stopped")
    expect(Fleet.serviceGlyph({ status: "stopped" })).toBe("○")
    expect(Fleet.isAlertService({ status: "running", health: "unhealthy" })).toBe(true)
    expect(Fleet.isRunningService({ status: "running", health: "unhealthy" })).toBe(true)
    expect(Fleet.isTransitioningService({ status: "restarting" })).toBe(true)
    expect(Fleet.isAlertService({ status: "failed", health: "starting" })).toBe(true)
    expect(Fleet.serviceDisplayState({ status: "failed", health: "starting" })).toBe("failed")
    expect(Fleet.isUnknownService({ status: "unknown" })).toBe(true)
    expect(Fleet.isAlertService({ status: "unknown" })).toBe(false)
    expect(Fleet.serviceSummary({ runningServices: 2, transitioningServices: 1, stoppedServices: 2, unknownServices: 0, alertServices: 0 })).toBe("2 running · 1 transitioning · 2 stopped")

    const stoppedOnly = Fleet.normalizePayload({
      devices: { devices: [{ id: "node", label: "node", online: true }] },
      metrics: { node: { online: true, containers: [{ id: "stopped", name: "yokai-stopped", status: "stopped" }] } },
    })
    expect(stoppedOnly.totals).toMatchObject({ runningServices: 0, stoppedServices: 1, alertServices: 0 })
    expect(Fleet.phaseUrgent("ready", stoppedOnly)).toBe(false)
    expect(Fleet.barLabel(stoppedOnly, "ready")).not.toContain("⚠")
  })
})
