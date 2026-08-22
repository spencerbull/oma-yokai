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

  signal tuiRequested()

  readonly property color dim: Qt.darker(foreground, 1.55)
  width: parent ? parent.width : implicitWidth
  spacing: Style.space(10)

  PanelHero {
    width: parent.width
    title: "Services"
    meta: snapshot.services.length + " across the fleet"
    detail: snapshot.totals.alertServices > 0 ? snapshot.totals.alertServices + " need attention" : "No reported alerts"
    foreground: root.foreground
    fontFamily: root.fontFamily
  }

  Text {
    visible: snapshot.services.length === 0
    width: parent.width
    text: "No running services were reported."
    color: root.dim
    font.family: root.fontFamily
    font.pixelSize: Style.font.body
  }

  Repeater {
    model: snapshot.services

    Yokai.SectionCard {
      required property var modelData
      width: root.width
      foreground: root.foreground

      Row {
        width: parent.width
        spacing: Style.space(10)

        Column {
          width: Math.max(80, parent.width - serviceActions.implicitWidth - parent.spacing)
          spacing: Style.space(3)
          Text { width: parent.width; text: (Fleet.isAlertService(modelData) ? "⚠ " : "● ") + modelData.name; color: Fleet.isAlertService(modelData) ? Color.urgent : root.foreground; font.family: root.fontFamily; font.pixelSize: Style.font.subtitle; font.bold: true; elide: Text.ElideRight }
          Text { width: parent.width; text: modelData.deviceLabel + " · " + modelData.type + " · " + (modelData.health || modelData.status); color: root.dim; font.family: root.fontFamily; font.pixelSize: Style.font.bodySmall; elide: Text.ElideRight }
          Text { width: parent.width; visible: modelData.generationTokPerSec > 0 || modelData.gpuMemoryMB > 0; text: Math.round(modelData.generationTokPerSec) + " tok/s · " + Fleet.formatMemory(modelData.gpuMemoryMB) + " GPU memory"; color: root.dim; font.family: root.fontFamily; font.pixelSize: Style.font.caption; elide: Text.ElideRight }
        }

        Row {
          id: serviceActions
          spacing: Style.space(6)
          Yokai.ConfirmButton { actionText: "Restart"; confirmationText: "Confirm restart"; baseForeground: root.foreground; onConfirmed: if (root.yokai) root.yokai.restartService(modelData.deviceId, modelData.containerId) }
          Yokai.ConfirmButton { actionText: "Stop"; confirmationText: "Confirm stop"; dangerous: true; baseForeground: root.foreground; onConfirmed: if (root.yokai) root.yokai.stopService(modelData.deviceId, modelData.containerId) }
          Yokai.ConfirmButton { actionText: "Remove"; confirmationText: "Confirm remove"; dangerous: true; baseForeground: root.foreground; onConfirmed: if (root.yokai) root.yokai.removeService(modelData.deviceId, modelData.containerId) }
        }
      }
    }
  }

  Button {
    text: "Open TUI for logs and details"
    bordered: true
    foreground: root.foreground
    onClicked: root.tuiRequested()
  }
}
