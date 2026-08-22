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
  width: parent ? parent.width : implicitWidth
  spacing: Style.space(10)

  PanelHero {
    width: parent.width
    title: "Devices"
    meta: snapshot.totals.onlineDevices + "/" + snapshot.totals.devices + " online"
    detail: "Tests are immediate; removal always requires confirmation."
    foreground: root.foreground
    fontFamily: root.fontFamily
  }

  Text {
    visible: snapshot.devices.length === 0
    width: parent.width
    text: "No devices yet. Use Open TUI for SSH, Tailscale, and guided bootstrap."
    color: root.dim
    font.family: root.fontFamily
    font.pixelSize: Style.font.body
    wrapMode: Text.WordWrap
  }

  Repeater {
    model: snapshot.devices

    Yokai.SectionCard {
      required property var modelData
      width: root.width
      foreground: root.foreground

      Row {
        width: parent.width
        spacing: Style.space(10)

        Column {
          width: Math.max(80, parent.width - actions.implicitWidth - parent.spacing)
          spacing: Style.space(3)

          Text { width: parent.width; text: (modelData.online ? "● " : "○ ") + modelData.label; color: modelData.online ? root.foreground : root.dim; font.family: root.fontFamily; font.pixelSize: Style.font.subtitle; font.bold: true; elide: Text.ElideRight }
          Text { width: parent.width; text: (modelData.gpuName || modelData.gpuType || "GPU not reported") + " · " + modelData.serviceCount + " services"; color: root.dim; font.family: root.fontFamily; font.pixelSize: Style.font.bodySmall; elide: Text.ElideRight }
          Text { width: parent.width; text: Fleet.formatPercent(modelData.gpuUtilPercent) + " GPU · " + Fleet.formatMemory(modelData.gpuMemoryUsedMB) + " VRAM"; color: root.dim; font.family: root.fontFamily; font.pixelSize: Style.font.caption; elide: Text.ElideRight }
        }

        Row {
          id: actions
          spacing: Style.space(6)
          Yokai.RowButton { text: "Test"; compact: true; bordered: true; foreground: root.foreground; onClicked: if (root.yokai) root.yokai.testDevice(modelData.id) }
          Yokai.ConfirmButton { actionText: "Remove"; confirmationText: "Confirm remove"; dangerous: true; baseForeground: root.foreground; onConfirmed: if (root.yokai) root.yokai.removeDevice(modelData.id) }
        }
      }
    }
  }
}
