import QtQuick
import qs.Commons
import qs.Ui
import "../FleetModel.js" as Fleet
import "../components" as Yokai

Column {
  id: root
  property var yokai: null
  property var snapshot: Fleet.emptySnapshot()
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family

  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property var totals: snapshot && snapshot.totals ? snapshot.totals : Fleet.emptyTotals()
  width: parent ? parent.width : implicitWidth
  spacing: Style.space(12)

  PanelHero {
    width: parent.width
    title: "Fleet overview"
    meta: totals.onlineDevices + "/" + totals.devices + " devices online"
    detail: totals.services + " services · " + totals.alertServices + " alerts"
    foreground: root.foreground
    fontFamily: root.fontFamily
  }

  Row {
    width: parent.width
    spacing: Style.space(12)

    Yokai.SectionCard {
      width: (parent.width - parent.spacing) / 2
      foreground: root.foreground

      PanelSectionHeader { text: "UTILIZATION"; foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.Meter { width: parent.width; label: "GPU"; value: totals.avgGpuUtilPercent; detail: totals.activeGpuCount + "/" + totals.gpuCount + " active"; foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.Meter { width: parent.width; label: "VRAM"; value: Fleet.memoryPercent(totals.gpuMemoryUsedMB, totals.gpuMemoryTotalMB); detail: Fleet.formatMemory(totals.gpuMemoryUsedMB) + " used"; foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.Meter { width: parent.width; label: "CPU"; value: totals.avgCpuPercent; detail: "online devices"; foreground: root.foreground; fontFamily: root.fontFamily }
    }

    Yokai.SectionCard {
      width: (parent.width - parent.spacing) / 2
      foreground: root.foreground

      PanelSectionHeader { text: "AT A GLANCE"; foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.InfoPair { width: parent.width; label: "Devices"; value: String(totals.devices); foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.InfoPair { width: parent.width; label: "AI"; value: String(snapshot.aiServices.length); foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.InfoPair { width: parent.width; label: "Monitoring"; value: String(snapshot.monitoringServices.length); foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.InfoPair { width: parent.width; label: "Updated"; value: snapshot.updatedAt || "waiting for data"; foreground: root.foreground; fontFamily: root.fontFamily }
    }
  }

  Text {
    visible: totals.devices === 0
    width: parent.width
    text: "No fleet devices are configured. Open the TUI to run the guided device setup."
    color: root.dim
    font.family: root.fontFamily
    font.pixelSize: Style.font.body
    wrapMode: Text.WordWrap
  }
}
