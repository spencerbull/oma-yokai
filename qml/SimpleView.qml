import QtQuick
import qs.Commons
import qs.Ui
import "FleetModel.js" as Fleet
import "components" as Yokai

Column {
  id: root
  property var yokai: null
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family
  property var snapshot: yokai && yokai.snapshot ? yokai.snapshot : Fleet.emptySnapshot()
  property string phase: yokai ? String(yokai.phase || "checking") : "checking"

  signal diveRequested()
  signal tuiRequested()
  signal refreshRequested()

  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property color urgent: Color.urgent
  readonly property var totals: snapshot.totals || Fleet.emptyTotals()
  spacing: Style.space(12)
  width: parent ? parent.width : implicitWidth

  PanelHero {
    width: parent.width
    title: "OmaYokai"
    meta: root.phase === "ready"
      ? (totals.onlineDevices + " online · " + totals.services + " services")
      : root.phase === "needs_install" ? "Service not installed"
      : root.phase === "starting" ? "Starting daemon"
      : root.phase === "error" ? "Daemon unavailable"
      : "Checking fleet"
    detail: root.phase === "ready"
      ? Fleet.formatPercent(totals.avgGpuUtilPercent) + " GPU · " + Fleet.formatMemory(totals.gpuMemoryUsedMB) + " VRAM"
      : ""
    foreground: root.foreground
    fontFamily: root.fontFamily
    iconComponent: Component {
      Text {
        text: root.phase === "ready" && totals.alertServices > 0 ? "󰀦" : "󰢮"
        color: root.foreground
        font.family: root.fontFamily
        font.pixelSize: Style.font.display
      }
    }
  }

  Text {
    visible: yokai && (yokai.lastError || yokai.actionError || yokai.actionStatus)
    width: parent.width
    text: (yokai && yokai.actionError) ? yokai.actionError
      : (yokai && yokai.lastError && root.phase !== "ready") ? yokai.lastError
      : (yokai && yokai.actionStatus) ? yokai.actionStatus : ""
    color: yokai && (yokai.actionError || (root.phase === "error" && yokai.lastError)) ? root.urgent : root.dim
    font.family: root.fontFamily
    font.pixelSize: Style.font.bodySmall
    wrapMode: Text.WordWrap
  }

  Column {
    visible: root.phase === "needs_install"
    width: parent.width
    spacing: Style.space(8)

    Text {
      width: parent.width
      text: "Omarchy clones plugin files only. Build the OmaYokai service from this plugin directory, then refresh."
      color: root.dim
      font.family: root.fontFamily
      font.pixelSize: Style.font.body
      wrapMode: Text.WordWrap
    }

    Text {
      width: parent.width
      text: "make install"
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.body
    }
  }

  Column {
    visible: root.phase === "ready"
    width: parent.width
    spacing: Style.space(10)

    Yokai.Meter {
      label: "GPU"
      value: totals.avgGpuUtilPercent
      detail: totals.activeGpuCount + "/" + totals.gpuCount + " active"
      foreground: root.foreground
      fontFamily: root.fontFamily
    }

    Yokai.Meter {
      label: "VRAM"
      value: Fleet.memoryPercent(totals.gpuMemoryUsedMB, totals.gpuMemoryTotalMB)
      detail: Fleet.formatMemory(totals.gpuMemoryUsedMB) + " / " + Fleet.formatMemory(totals.gpuMemoryTotalMB)
      foreground: root.foreground
      fontFamily: root.fontFamily
    }

    Yokai.InfoPair { label: "Nodes"; value: totals.onlineDevices + " online · " + Math.max(0, totals.devices - totals.onlineDevices) + " offline"; foreground: root.foreground; fontFamily: root.fontFamily }
    Yokai.InfoPair { label: "Alerts"; value: totals.alertServices > 0 ? String(totals.alertServices) : "none"; foreground: root.foreground; fontFamily: root.fontFamily }
  }

  PanelSeparator {
    visible: root.phase === "ready"
    foreground: root.foreground
  }

  Column {
    visible: root.phase === "ready"
    width: parent.width
    spacing: Style.space(8)

    PanelSectionHeader {
      text: "AI SERVICES"
      foreground: root.foreground
      fontFamily: root.fontFamily
    }

    Text {
      visible: snapshot.aiServices.length === 0
      width: parent.width
      text: totals.devices === 0 ? "No devices yet. Dive in to add one." : "No AI services are running."
      color: root.dim
      font.family: root.fontFamily
      font.pixelSize: Style.font.body
      wrapMode: Text.WordWrap
    }

    Repeater {
      model: snapshot.aiServices.slice(0, 5)
      delegate: Text {
        required property var modelData
        width: root.width
        text: (Fleet.isAlertService(modelData) ? "⚠ " : "● ") + modelData.name + "  ·  " + modelData.deviceLabel
        color: Fleet.isAlertService(modelData) ? root.urgent : root.foreground
        font.family: root.fontFamily
        font.pixelSize: Style.font.body
        elide: Text.ElideRight
      }
    }
  }

  Row {
    width: parent.width
    spacing: Style.space(8)

    Button {
      text: root.phase === "needs_install" ? "Refresh" : root.phase === "error" ? "Retry" : "Dive in"
      bordered: true
      onClicked: (root.phase === "needs_install" || root.phase === "error") ? root.refreshRequested() : root.diveRequested()
    }

    Button {
      text: "Open TUI"
      visible: root.phase !== "needs_install"
      bordered: true
      onClicked: root.tuiRequested()
    }

    Button {
      text: "Reload"
      visible: root.phase === "ready"
      bordered: true
      onClicked: root.refreshRequested()
    }
  }
}
