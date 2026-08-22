.pragma library

function emptyTotals() {
  return {
    devices: 0,
    onlineDevices: 0,
    services: 0,
    alertServices: 0,
    gpuCount: 0,
    activeGpuCount: 0,
    gpuMemoryUsedMB: 0,
    gpuMemoryTotalMB: 0,
    avgGpuUtilPercent: 0,
    avgCpuPercent: 0,
    ramUsedMB: 0,
    ramTotalMB: 0,
    avgRamPercent: 0
  }
}

function emptySnapshot() {
  return {
    devices: [],
    services: [],
    aiServices: [],
    monitoringServices: [],
    totals: emptyTotals(),
    updatedAt: "",
    settings: emptySettings()
  }
}

function emptySettings() {
  return {
    hf: { configured: false, source: "none", username: "" },
    preferences: {
      theme: "auto",
      default_vllm_image: "",
      default_llama_image: "",
      default_comfyui_image: ""
    },
    history: { images: [], models: [] },
    integrations: {}
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

function asStringList(value) {
  var input = asArray(value)
  var output = []
  for (var i = 0; i < input.length; i++) output.push(String(input[i] || ""))
  return output
}

function numberOr(value, fallback) {
  var n = Number(value)
  return isFinite(n) ? n : fallback
}

function round(value) {
  return Math.round(numberOr(value, 0))
}

function formatPercent(value) {
  return round(value) + "%"
}

function formatMemory(mb) {
  var n = numberOr(mb, 0)
  if (n >= 1024) return (n / 1024).toFixed(1) + " GB"
  return round(n) + " MB"
}

function memoryPercent(used, total) {
  var t = numberOr(total, 0)
  if (t <= 0) return 0
  return (numberOr(used, 0) / t) * 100
}

function averageOf(values) {
  var list = asArray(values)
  if (list.length === 0) return 0
  var sum = 0
  for (var i = 0; i < list.length; i++) sum += numberOr(list[i], 0)
  return sum / list.length
}

function compareText(left, right) {
  var a = String(left || "")
  var b = String(right || "")
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function isAlertService(service) {
  var status = String((service && (service.health || service.status)) || "").toLowerCase()
  switch (status) {
    case "":
    case "healthy":
    case "running":
    case "starting":
    case "created":
    case "restarting":
      return false
    default:
      return true
  }
}

function isMonitoringService(service) {
  var haystack = ((service && service.name) || "") + " " + ((service && service.type) || "") + " " + ((service && service.image) || "")
  haystack = haystack.toLowerCase()
  return haystack.indexOf("mon-") === 0
    || haystack.indexOf("monitoring") !== -1
    || haystack.indexOf("prometheus") !== -1
    || haystack.indexOf("grafana") !== -1
    || haystack.indexOf("loki") !== -1
    || haystack.indexOf("alloy") !== -1
}

function isAIService(service) {
  return !isMonitoringService(service)
}

function inferServiceType(name, image) {
  var haystack = (String(name || "") + " " + String(image || "")).toLowerCase()
  if (haystack.indexOf("vllm") !== -1) return "vllm"
  if (haystack.indexOf("llama") !== -1) return "llamacpp"
  if (haystack.indexOf("comfyui") !== -1 || haystack.indexOf("comfy") !== -1) return "comfyui"
  if (haystack.indexOf("prometheus") !== -1 || haystack.indexOf("grafana") !== -1) return "monitoring"
  return "service"
}

function inferServiceID(name, fallback) {
  var raw = String(name || "")
  if (raw.indexOf("yokai-") === 0) return raw.slice("yokai-".length)
  return fallback || raw
}

function inferServiceName(name, fallback) {
  return inferServiceID(name, fallback) || fallback || name
}

function externalPort(ports) {
  var map = asObject(ports)
  var keys = Object.keys(map).sort(compareText)
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var parsed = parseInt(map[key], 10)
    if (isFinite(parsed)) return parsed
  }
  return 0
}

function summarizeDeviceGpus(gpus) {
  var list = asArray(gpus)
  if (list.length === 0) {
    return { count: 0, activeCount: 0, name: "", utilPercent: 0, memoryUsedMB: 0, memoryTotalMB: 0 }
  }
  var totalUtil = 0
  var memoryUsedMB = 0
  var memoryTotalMB = 0
  var activeCount = 0
  for (var i = 0; i < list.length; i++) {
    var gpu = list[i] || {}
    var util = numberOr(gpu.utilization_percent, 0)
    var used = numberOr(gpu.vram_used_mb, 0)
    totalUtil += util
    memoryUsedMB += used
    memoryTotalMB += numberOr(gpu.vram_total_mb, 0)
    if (util > 0 || used > 0) activeCount++
  }
  return {
    count: list.length,
    activeCount: activeCount,
    name: String(list[0] && list[0].name || ""),
    utilPercent: totalUtil / list.length,
    memoryUsedMB: memoryUsedMB,
    memoryTotalMB: memoryTotalMB
  }
}

function toFleetDevice(device, metrics) {
  var record = asObject(device)
  var deviceMetrics = asObject(metrics)
  var gpuStats = summarizeDeviceGpus(deviceMetrics.gpus)
  var online = record.online === true && (metrics ? deviceMetrics.online !== false : true)
  return {
    id: String(record.id || ""),
    label: String(record.label || record.id || ""),
    host: String(record.host || ""),
    online: online,
    tunnelPort: numberOr(record.tunnel_port, 0),
    gpuType: String(record.gpu_type || ""),
    gpuName: gpuStats.name,
    gpuCount: gpuStats.count,
    activeGpuCount: gpuStats.activeCount,
    gpuUtilPercent: gpuStats.utilPercent,
    gpuMemoryUsedMB: gpuStats.memoryUsedMB,
    gpuMemoryTotalMB: gpuStats.memoryTotalMB,
    cpuPercent: numberOr(deviceMetrics.cpu && deviceMetrics.cpu.percent, 0),
    ramUsedMB: numberOr(deviceMetrics.ram && deviceMetrics.ram.used_mb, 0),
    ramTotalMB: numberOr(deviceMetrics.ram && deviceMetrics.ram.total_mb, 0),
    ramPercent: numberOr(deviceMetrics.ram && deviceMetrics.ram.percent, 0),
    serviceCount: asArray(deviceMetrics.containers).length,
    connectionType: String(record.connection_type || "")
  }
}

function toFleetService(device, container) {
  var item = asObject(container)
  return {
    containerId: String(item.id || ""),
    serviceId: inferServiceID(item.name, item.id),
    name: inferServiceName(item.name, item.id),
    type: inferServiceType(item.name, item.image),
    image: String(item.image || ""),
    status: String(item.status || "running"),
    health: String(item.health || ""),
    deviceId: device.id,
    deviceLabel: device.label,
    deviceOnline: device.online,
    port: externalPort(item.ports),
    cpuPercent: numberOr(item.cpu_percent, 0),
    memoryUsedMB: numberOr(item.memory_used_mb, 0),
    gpuMemoryMB: numberOr(item.gpu_memory_mb, 0),
    uptimeSeconds: numberOr(item.uptime_seconds, 0),
    generationTokPerSec: numberOr(item.generation_tok_per_s, 0),
    promptTokPerSec: numberOr(item.prompt_tok_per_s, 0),
    promptTokensTotal: numberOr(item.prompt_tokens_total, 0),
    generationTokensTotal: numberOr(item.generation_tokens_total, 0),
    cachedPromptTokensTotal: numberOr(item.cached_prompt_tokens_total, 0)
  }
}

function latestTimestamp(metrics) {
  var latest = ""
  var map = asObject(metrics)
  for (var id in map) {
    var ts = map[id] && map[id].timestamp ? String(map[id].timestamp) : ""
    if (ts && (latest === "" || ts > latest)) latest = ts
  }
  return latest
}

function normalizeFleet(devices, metrics) {
  var deviceList = asArray(devices)
  var metricsMap = asObject(metrics)
  var fleetDevices = []
  var fleetServices = []
  var i

  for (i = 0; i < deviceList.length; i++) {
    var raw = asObject(deviceList[i])
    fleetDevices.push(toFleetDevice(raw, metricsMap[raw.id]))
  }
  fleetDevices.sort(function(a, b) {
    var labelCmp = compareText(a.label, b.label)
    return labelCmp !== 0 ? labelCmp : compareText(a.id, b.id)
  })

  for (i = 0; i < fleetDevices.length; i++) {
    var device = fleetDevices[i]
    var deviceMetrics = asObject(metricsMap[device.id])
    var containers = asArray(deviceMetrics.containers)
    for (var c = 0; c < containers.length; c++) {
      fleetServices.push(toFleetService(device, containers[c]))
    }
  }
  fleetServices.sort(function(left, right) {
    var leftAlert = isAlertService(left)
    var rightAlert = isAlertService(right)
    if (leftAlert !== rightAlert) return leftAlert ? -1 : 1
    var deviceCmp = compareText(left.deviceLabel, right.deviceLabel)
    if (deviceCmp !== 0) return deviceCmp
    var nameCmp = compareText(left.name, right.name)
    return nameCmp !== 0 ? nameCmp : compareText(left.containerId, right.containerId)
  })

  var gpuUtils = []
  var cpuUtils = []
  var ramPercents = []
  var totals = emptyTotals()
  totals.devices = fleetDevices.length
  for (i = 0; i < fleetDevices.length; i++) {
    var d = fleetDevices[i]
    if (d.online) totals.onlineDevices++
    totals.gpuCount += d.gpuCount
    totals.activeGpuCount += d.activeGpuCount
    totals.gpuMemoryUsedMB += d.gpuMemoryUsedMB
    totals.gpuMemoryTotalMB += d.gpuMemoryTotalMB
    totals.ramUsedMB += d.ramUsedMB
    totals.ramTotalMB += d.ramTotalMB
    if (d.gpuCount > 0) gpuUtils.push(d.gpuUtilPercent)
    if (d.online) {
      cpuUtils.push(d.cpuPercent)
      ramPercents.push(d.ramPercent)
    }
  }
  totals.services = fleetServices.length
  totals.alertServices = 0
  var aiServices = []
  var monitoringServices = []
  for (i = 0; i < fleetServices.length; i++) {
    if (isAlertService(fleetServices[i])) totals.alertServices++
    if (isMonitoringService(fleetServices[i])) monitoringServices.push(fleetServices[i])
    else aiServices.push(fleetServices[i])
  }
  totals.avgGpuUtilPercent = averageOf(gpuUtils)
  totals.avgCpuPercent = averageOf(cpuUtils)
  totals.avgRamPercent = averageOf(ramPercents)

  return {
    devices: fleetDevices,
    services: fleetServices,
    aiServices: aiServices,
    monitoringServices: monitoringServices,
    totals: totals,
    updatedAt: latestTimestamp(metricsMap)
  }
}

function normalizePayload(payload) {
  var body = asObject(payload)
  var devicesBody = asObject(body.devices)
  var devices = asArray(devicesBody.devices)
  if (devices.length === 0 && Array.isArray(body.devices)) devices = body.devices
  var fleet = normalizeFleet(devices, body.metrics)
  var defaults = emptySettings()
  var rawSettings = asObject(body.settings)
  var rawHF = asObject(rawSettings.hf)
  var rawPreferences = asObject(rawSettings.preferences)
  var rawHistory = asObject(rawSettings.history)
  var rawIntegrations = asObject(rawSettings.integrations)
  var integrationNames = ["vscode", "opencode", "openclaw", "claudecode", "codex"]
  var integrations = {}
  for (var i = 0; i < integrationNames.length; i++) {
    var integrationName = integrationNames[i]
    var rawIntegration = asObject(rawIntegrations[integrationName])
    integrations[integrationName] = {
      available: rawIntegration.available === true,
      configured: rawIntegration.configured === true
    }
  }
  fleet.settings = {
    hf: {
      configured: rawHF.configured === true,
      source: String(rawHF.source || defaults.hf.source),
      username: String(rawHF.username || defaults.hf.username)
    },
    preferences: {
      theme: String(rawPreferences.theme || defaults.preferences.theme),
      default_vllm_image: String(rawPreferences.default_vllm_image || ""),
      default_llama_image: String(rawPreferences.default_llama_image || ""),
      default_comfyui_image: String(rawPreferences.default_comfyui_image || "")
    },
    history: {
      images: asStringList(rawHistory.images),
      models: asStringList(rawHistory.models)
    },
    integrations: integrations
  }
  return fleet
}

function barLabel(snapshot, phase) {
  if (phase === "needs_install") return "OmaYokai"
  if (phase === "starting" || phase === "checking") return "OmaYokai"
  var totals = snapshot && snapshot.totals ? snapshot.totals : emptyTotals()
  if (totals.alertServices > 0) return "⚠ " + totals.alertServices
  if (totals.gpuCount > 0) return formatPercent(totals.avgGpuUtilPercent)
  if (totals.onlineDevices > 0) return String(totals.onlineDevices)
  return "OmaYokai"
}

function barTooltip(snapshot, phase, lastError) {
  if (phase === "needs_install") return "OmaYokai is not installed yet"
  if (phase === "starting") return "Starting OmaYokai daemon"
  if (phase === "checking") return "Checking OmaYokai daemon"
  if (phase === "error") return lastError || "OmaYokai daemon is unavailable"
  var totals = snapshot && snapshot.totals ? snapshot.totals : emptyTotals()
  var gpu = totals.gpuCount > 0 ? "GPU " + formatPercent(totals.avgGpuUtilPercent) : "no GPUs"
  var vram = totals.gpuMemoryTotalMB > 0
    ? "VRAM " + formatMemory(totals.gpuMemoryUsedMB) + " / " + formatMemory(totals.gpuMemoryTotalMB)
    : ""
  var nodes = totals.onlineDevices + "/" + totals.devices + " online"
  var services = totals.services + " svc"
  if (totals.alertServices > 0) services += " · " + totals.alertServices + " alert"
  return [gpu, vram, nodes, services].filter(function(part) { return part !== "" }).join(" · ")
}

function phaseUrgent(phase, snapshot) {
  if (phase === "error" || phase === "needs_install") return true
  return !!(snapshot && snapshot.totals && snapshot.totals.alertServices > 0)
}
