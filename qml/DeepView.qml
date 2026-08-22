import QtQuick
import qs.Commons
import qs.Ui
import "FleetModel.js" as Fleet
import "views" as Views

Column {
  id: root
  property var yokai: null
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family
  property string currentSection: "overview"
  property var snapshot: yokai && yokai.snapshot ? yokai.snapshot : Fleet.emptySnapshot()
  readonly property bool modalInteractionActive: currentSection === "deploy" && deployView.textEditing

  signal backRequested()
  signal textEditingEscapeRequested()
  signal tuiRequested()
  signal refreshRequested()

  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property var sections: [
    { key: "overview", label: "Overview" },
    { key: "devices", label: "Devices" },
    { key: "services", label: "Services" },
    { key: "deploy", label: "Deploy" },
    { key: "settings", label: "Settings" }
  ]

  spacing: Style.space(12)
  width: parent ? parent.width : implicitWidth

  Row {
    width: parent.width
    spacing: Style.space(8)

    Button {
      text: "Glance"
      bordered: true
      onClicked: root.backRequested()
    }

    Repeater {
      model: root.sections
      delegate: Button {
        required property var modelData
        text: modelData.label
        selected: root.currentSection === modelData.key
        bordered: true
        onClicked: root.currentSection = modelData.key
      }
    }

    Button {
      text: "TUI"
      bordered: true
      onClicked: root.tuiRequested()
    }
  }

  Text {
    visible: yokai && (yokai.actionError || yokai.actionStatus)
    width: parent.width
    text: yokai && yokai.actionError ? yokai.actionError : (yokai ? yokai.actionStatus : "")
    color: yokai && yokai.actionError ? Color.urgent : root.dim
    font.family: root.fontFamily
    font.pixelSize: Style.font.bodySmall
    wrapMode: Text.WordWrap
  }

  Views.OverviewView {
    visible: root.currentSection === "overview"
    width: parent.width
    yokai: root.yokai
    snapshot: root.snapshot
    foreground: root.foreground
    fontFamily: root.fontFamily
  }

  Views.DevicesView {
    visible: root.currentSection === "devices"
    width: parent.width
    yokai: root.yokai
    snapshot: root.snapshot
    foreground: root.foreground
    fontFamily: root.fontFamily
  }

  Views.ServicesView {
    visible: root.currentSection === "services"
    width: parent.width
    yokai: root.yokai
    snapshot: root.snapshot
    foreground: root.foreground
    fontFamily: root.fontFamily
    onTuiRequested: root.tuiRequested()
  }

  Views.DeployView {
    id: deployView
    visible: root.currentSection === "deploy"
    width: parent.width
    yokai: root.yokai
    snapshot: root.snapshot
    foreground: root.foreground
    fontFamily: root.fontFamily
    onTextEditingEscapeRequested: root.textEditingEscapeRequested()
  }

  Views.SettingsView {
    visible: root.currentSection === "settings"
    width: parent.width
    yokai: root.yokai
    snapshot: root.snapshot
    foreground: root.foreground
    fontFamily: root.fontFamily
    onTuiRequested: root.tuiRequested()
    onRefreshRequested: root.refreshRequested()
  }
}
