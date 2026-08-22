.pragma library

function emptyTotals() {
  return {
    devices: 0,
    onlineDevices: 0,
    services: 0,
    runningServices: 0,
    transitioningServices: 0,
    stoppedServices: 0,
    unknownServices: 0,
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
  return serviceState(service) === "alert"
}

function isStoppedService(service) {
  return serviceState(service) === "stopped"
}

function isTransitioningService(service) {
  var status = String((service && service.status) || "").toLowerCase()
  return status === "restarting" || status === "starting"
}

function isUnknownService(service) {
  var status = String((service && service.status) || "").toLowerCase()
  return status === "" || status === "unknown"
}

function serviceState(service) {
  var status = String((service && service.status) || "").toLowerCase()
  var health = String((service && service.health) || "").toLowerCase()
  if (status === "stopped" || status === "exited" || status === "paused" || status === "created") return "stopped"
  if (status === "error" || status === "failed" || status === "dead") return "alert"
  if (status === "restarting" || status === "starting" || health === "starting") return "transitioning"
  if (health === "unhealthy" || health === "error" || health === "failed" || health === "dead") return "alert"
  if (status === "running" && (health === "" || health === "healthy")) return "running"
  if (status === "" && health === "healthy") return "running"
  return "unknown"
}

function isRunningService(service) {
  return String((service && service.status) || "").toLowerCase() === "running"
}

function serviceSortRank(service) {
  var state = serviceState(service)
  if (state === "alert") return 0
  if (isRunningService(service)) return 1
  if (state === "transitioning") return 2
  if (state === "stopped") return 3
  return 4
}

function serviceDisplayState(service) {
  var state = serviceState(service)
  var status = String((service && service.status) || "").toLowerCase()
  var health = String((service && service.health) || "").toLowerCase()
  if (state === "stopped") return status || "stopped"
  if (state === "transitioning") return health === "starting" ? "starting" : status || "starting"
  if (state === "alert") return (status === "error" || status === "failed" || status === "dead") ? status : health || status || "error"
  if (state === "running") return health || status || "running"
  return status || health || "unknown"
}

function serviceGlyph(service) {
  var state = serviceState(service)
  if (state === "alert") return "⚠"
  if (state === "stopped") return "○"
  if (state === "transitioning") return "↻"
  if (state === "unknown") return "?"
  return "●"
}

function serviceSummary(totals) {
  var value = totals || emptyTotals()
  var summary = value.runningServices + " running"
  if (value.transitioningServices > 0) summary += " · " + value.transitioningServices + " transitioning"
  if (value.stoppedServices > 0) summary += " · " + value.stoppedServices + " stopped"
  if (value.unknownServices > 0) summary += " · " + value.unknownServices + " unknown"
  if (value.alertServices > 0) summary += " · " + value.alertServices + (value.alertServices === 1 ? " alert" : " alerts")
  return summary
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
    status: String(item.status || "unknown"),
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
    var rankCmp = serviceSortRank(left) - serviceSortRank(right)
    if (rankCmp !== 0) return rankCmp
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
  totals.runningServices = 0
  totals.transitioningServices = 0
  totals.stoppedServices = 0
  totals.unknownServices = 0
  totals.alertServices = 0
  var aiServices = []
  var monitoringServices = []
  for (i = 0; i < fleetServices.length; i++) {
    if (isAlertService(fleetServices[i])) totals.alertServices++
    if (isRunningService(fleetServices[i])) totals.runningServices++
    else if (isStoppedService(fleetServices[i])) totals.stoppedServices++
    else if (isTransitioningService(fleetServices[i])) totals.transitioningServices++
    else if (isUnknownService(fleetServices[i])) totals.unknownServices++
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
  var services = serviceSummary(totals)
  return [gpu, vram, nodes, services].filter(function(part) { return part !== "" }).join(" · ")
}

function phaseUrgent(phase, snapshot) {
  if (phase === "error" || phase === "needs_install") return true
  return !!(snapshot && snapshot.totals && snapshot.totals.alertServices > 0)
}
