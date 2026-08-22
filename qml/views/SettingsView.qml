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
  signal refreshRequested()

  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property var settings: snapshot && snapshot.settings ? snapshot.settings : Fleet.emptySettings()
  readonly property var integrationNames: ["vscode", "opencode", "openclaw", "claudecode", "codex"]
  width: parent ? parent.width : implicitWidth
  spacing: Style.space(10)

  PanelHero {
    width: parent.width
    title: "Settings"
    meta: settings.hf.configured ? "Hugging Face connected" : "Hugging Face not configured"
    detail: "Credentials and token values are never rendered in this panel."
    foreground: root.foreground
    fontFamily: root.fontFamily
  }

  Row {
    width: parent.width
    spacing: Style.space(12)

    Yokai.SectionCard {
      width: (parent.width - parent.spacing) / 2
      foreground: root.foreground
      PanelSectionHeader { text: "PLUGIN"; foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.InfoPair { width: parent.width; label: "Daemon"; value: root.yokai ? root.yokai.daemonAddr : "127.0.0.1:7473"; foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.InfoPair { width: parent.width; label: "Refresh"; value: (root.yokai ? root.yokai.refreshIntervalSec : 5) + " seconds"; foreground: root.foreground; fontFamily: root.fontFamily }
      Yokai.InfoPair { width: parent.width; label: "Binary"; value: root.yokai && root.yokai.binaryPath ? "available" : "not found"; foreground: root.foreground; fontFamily: root.fontFamily }
    }

    Yokai.SectionCard {
      width: (parent.width - parent.spacing) / 2
      foreground: root.foreground
      PanelSectionHeader { text: "INTEGRATIONS"; foreground: root.foreground; fontFamily: root.fontFamily }
      Repeater {
        model: root.integrationNames
        Yokai.InfoPair {
          required property string modelData
          width: parent.width
          label: modelData
          value: settings.integrations && settings.integrations[modelData]
            ? (settings.integrations[modelData].configured ? "configured" : settings.integrations[modelData].available ? "available" : "not found")
            : "not found"
          foreground: root.foreground
          fontFamily: root.fontFamily
        }
      }
    }
  }

  Text {
    width: parent.width
    text: "Use Open TUI to change credentials, defaults, endpoints, or tool integrations."
    color: root.dim
    font.family: root.fontFamily
    font.pixelSize: Style.font.bodySmall
    wrapMode: Text.WordWrap
  }

  Row {
    spacing: Style.space(8)
    Button { text: "Reload state"; bordered: true; foreground: root.foreground; onClicked: root.refreshRequested() }
    Button { text: "Open full TUI"; bordered: true; foreground: root.foreground; onClicked: root.tuiRequested() }
  }
}
