import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import "qml/FleetModel.js" as Fleet

Item {
  id: root
  visible: false

  property var shell: null
  property var manifest: null
  property var settings: ({})
  property string omarchyPath: Quickshell.env("OMARCHY_PATH")

  readonly property string pluginId: manifest && manifest.id ? String(manifest.id) : "io.github.spencerbull.oma-yokai"
  readonly property string pluginDir: manifest && manifest.__sourceDir ? String(manifest.__sourceDir).replace(/\/$/, "") : ""
  readonly property string daemonAddr: {
    var configured = settings && settings.daemonAddr ? String(settings.daemonAddr).trim() : ""
    return configured || "127.0.0.1:7473"
  }
  readonly property int refreshIntervalSec: {
    var n = parseInt(String(settings && settings.refreshIntervalSec != null ? settings.refreshIntervalSec : 5), 10)
    if (!isFinite(n)) n = 5
    return Math.max(2, Math.min(120, n))
  }

  property string phase: "checking"
  property string binaryPath: ""
  property string lastError: ""
  property string actionStatus: ""
  property string actionError: ""
  property var snapshot: Fleet.emptySnapshot()
  property var pendingAction: null
  property bool snapshotInFlight: false
  property bool daemonStartAttempted: false

  readonly property bool ready: phase === "ready"
  readonly property bool needsInstall: phase === "needs_install"
  readonly property bool busy: snapshotProc.running || actionProc.running || startProc.running || whichProc.running
  readonly property var totals: snapshot && snapshot.totals ? snapshot.totals : Fleet.emptyTotals()
  readonly property var devices: snapshot && snapshot.devices ? snapshot.devices : []
  readonly property var services: snapshot && snapshot.services ? snapshot.services : []
  readonly property var aiServices: snapshot && snapshot.aiServices ? snapshot.aiServices : []
  readonly property var monitoringServices: snapshot && snapshot.monitoringServices ? snapshot.monitoringServices : []

  function scriptPath(name) {
    return pluginDir ? pluginDir + "/scripts/" + name : ""
  }

  function pathSegment(value) {
    return encodeURIComponent(String(value == null ? "" : value))
  }

  function safeError(raw, fallback) {
    var text = String(raw || "").trim()
    if (!text) return fallback
    text = text.replace(/("(?:token|password|secret)"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2")
    text = text.replace(/((?:token|password|secret)\s*[=:]\s*)\S+/gi, "$1[redacted]")
    return text.length > 500 ? text.slice(0, 497) + "..." : text
  }

  function snapshotErrorCode(raw) {
    var lines = String(raw || "").trim().split("\n")
    for (var i = lines.length - 1; i >= 0; i--) {
      try {
        var parsed = JSON.parse(lines[i])
        if (parsed && parsed.error) return String(parsed.error)
      } catch (e) {
        // Curl may have written a diagnostic before the script's final JSON error.
      }
    }
    return ""
  }

  function snapshotErrorMessage(code) {
    switch (code) {
      case "devices_unavailable": return "OmaYokai devices are temporarily unavailable"
      case "metrics_unavailable": return "OmaYokai metrics are temporarily unavailable"
      case "settings_unavailable": return "OmaYokai settings are temporarily unavailable"
      case "jq_not_found": return "The OmaYokai plugin requires jq"
      default: return "OmaYokai daemon is not reachable at " + daemonAddr
    }
  }

  function refresh() {
    if (!pluginDir) {
      phase = "error"
      lastError = "Plugin source directory is unknown"
      return
    }
    if (whichProc.running) return
    whichProc.command = [scriptPath("yokai-which"), pluginDir]
    whichProc.running = true
  }

  function fetchSnapshot() {
    if (!binaryPath || snapshotProc.running) return
    snapshotInFlight = true
    snapshotProc.command = [scriptPath("yokai-snapshot"), daemonAddr]
    snapshotProc.running = true
  }

  function ensureDaemon() {
    if (!binaryPath || startProc.running) return
    phase = "starting"
    startProc.command = [scriptPath("yokai-ensure-daemon"), binaryPath, daemonAddr]
    startProc.running = true
  }

  function runApi(method, path, body, okMessage) {
    if (!binaryPath) {
      actionError = "OmaYokai is not installed"
      return false
    }
    if (actionProc.running) {
      actionError = "Another OmaYokai action is still running"
      return false
    }
    actionError = ""
    actionStatus = okMessage || (method + " " + path)
    pendingAction = { method: method, path: path, message: okMessage || "" }
    actionProc.pendingBody = body && body !== "" ? String(body) : ""
    var command = [scriptPath("yokai-api"), method, path, daemonAddr]
    if (actionProc.pendingBody !== "") command.push("--stdin-json")
    actionProc.command = command
    actionProc.running = true
    return true
  }

  function stopService(deviceId, containerId) {
    return runApi("POST", "/containers/" + pathSegment(deviceId) + "/" + pathSegment(containerId) + "/stop", "", "Stopping service")
  }

  function restartService(deviceId, containerId) {
    return runApi("POST", "/containers/" + pathSegment(deviceId) + "/" + pathSegment(containerId) + "/restart", "", "Restarting service")
  }

  function removeService(deviceId, containerId) {
    return runApi("DELETE", "/containers/" + pathSegment(deviceId) + "/" + pathSegment(containerId) + "/remove", "", "Removing service")
  }

  function testDevice(deviceId) {
    return runApi("POST", "/devices/" + pathSegment(deviceId) + "/test", "", "Testing device")
  }

  function removeDevice(deviceId) {
    return runApi("DELETE", "/devices/" + pathSegment(deviceId), "", "Removing device")
  }

  function bootstrapDevice(payload) {
    return runApi("POST", "/bootstrap/device", JSON.stringify(payload || {}), "Bootstrapping device")
  }

  function deploy(payload) {
    return runApi("POST", "/deploy", JSON.stringify(payload || {}), "Deploying service")
  }

  function searchModels(query, workload) {
    var q = encodeURIComponent(query || "")
    var w = encodeURIComponent(workload || "vllm")
    return runApi("GET", "/hf/models?query=" + q + "&workload=" + w, "", "Searching models")
  }

  function fetchBKC(workload, model, deviceId) {
    var params = "workload=" + encodeURIComponent(workload || "vllm") + "&model=" + encodeURIComponent(model || "")
    if (deviceId) params += "&device_id=" + encodeURIComponent(deviceId)
    return runApi("GET", "/deploy/bkc?" + params, "", "Loading best-known config")
  }

  function configureIntegrations(tools) {
    return runApi("POST", "/integrations/configure", JSON.stringify({ tools: tools || [] }), "Configuring tools")
  }

  function saveHFToken(token) {
    return runApi("PUT", "/settings/hf-token", JSON.stringify({ token: token || "" }), "Saving Hugging Face token")
  }

  function launchTui() {
    if (!binaryPath) {
      actionError = "OmaYokai is not installed"
      return false
    }
    Quickshell.execDetached(["omarchy", "launch", "tui", "--app-id=yokai", binaryPath])
    actionStatus = "Opening OmaYokai TUI"
    return true
  }

  function applyWhich(raw) {
    var path = String(raw || "").trim().split("\n")[0]
    if (!path) {
      phase = "needs_install"
      binaryPath = ""
      lastError = "Install the OmaYokai service with make install from this plugin directory"
      return
    }
    binaryPath = path
    if ((phase === "checking" || phase === "needs_install") && !daemonStartAttempted) {
      daemonStartAttempted = true
      ensureDaemon()
      return
    }
    fetchSnapshot()
  }

  function applySnapshot(raw, exitCode) {
    snapshotInFlight = false
    var text = String(raw || "").trim()
    if (exitCode !== 0 || text === "") {
      var errorCode = snapshotErrorCode(text)
      var daemonUnavailable = errorCode === "" || errorCode === "daemon_unreachable"
      if (daemonUnavailable && !daemonStartAttempted) {
        daemonStartAttempted = true
        ensureDaemon()
        return
      }
      phase = "error"
      lastError = snapshotErrorMessage(errorCode)
      daemonStartAttempted = false
      return
    }
    try {
      var parsed = JSON.parse(text)
      if (parsed && parsed.ok === false) {
        phase = "error"
        lastError = parsed.error || "Daemon snapshot failed"
        return
      }
      snapshot = Fleet.normalizePayload(parsed)
      phase = "ready"
      lastError = ""
      daemonStartAttempted = false
    } catch (e) {
      phase = "error"
      lastError = "Could not parse OmaYokai snapshot"
      daemonStartAttempted = false
    }
  }

  function applyAction(raw, exitCode) {
    var text = String(raw || "").trim()
    if (exitCode !== 0) {
      actionError = safeError(text, "OmaYokai action failed")
      actionStatus = ""
      pendingAction = null
      return
    }
    actionError = ""
    if (pendingAction && pendingAction.message) actionStatus = pendingAction.message + " complete"
    pendingAction = null
    Qt.callLater(fetchSnapshot)
  }

  Timer {
    id: refreshTimer
    interval: Math.max(2000, root.refreshIntervalSec * 1000)
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  Process {
    id: whichProc
    stdout: StdioCollector {
      id: whichOut
      waitForEnd: true
    }
    onExited: function(exitCode) {
      root.applyWhich(exitCode === 0 ? whichOut.text : "")
    }
  }

  Process {
    id: startProc
    stdout: StdioCollector { id: startOut; waitForEnd: true }
    stderr: StdioCollector { id: startErr; waitForEnd: true }
    onExited: function(exitCode) {
      if (exitCode !== 0) {
        root.phase = "error"
        root.lastError = root.safeError(startErr.text || startOut.text, "Could not start the OmaYokai daemon")
        root.daemonStartAttempted = false
        return
      }
      startGrace.start()
    }
  }

  Timer {
    id: startGrace
    interval: 400
    repeat: false
    onTriggered: root.fetchSnapshot()
  }

  Process {
    id: snapshotProc
    stdout: StdioCollector {
      id: snapshotOut
      waitForEnd: true
    }
    stderr: StdioCollector {
      id: snapshotErr
      waitForEnd: true
    }
    onExited: function(exitCode) {
      root.applySnapshot(exitCode === 0 ? snapshotOut.text : snapshotErr.text, exitCode)
    }
  }

  Process {
    id: actionProc
    property string pendingBody: ""
    stdinEnabled: true
    onStarted: {
      if (pendingBody !== "") write(pendingBody + "\n")
      pendingBody = ""
    }
    stdout: StdioCollector {
      id: actionOut
      waitForEnd: true
    }
    stderr: StdioCollector {
      id: actionErr
      waitForEnd: true
    }
    onExited: function(exitCode) {
      pendingBody = ""
      root.applyAction(exitCode === 0 ? actionOut.text : (actionOut.text || actionErr.text), exitCode)
    }
  }
}
