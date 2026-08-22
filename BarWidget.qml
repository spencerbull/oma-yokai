import QtQuick
import qs.Commons
import qs.Ui
import "qml/FleetModel.js" as Fleet

BarWidget {
  id: root
  moduleName: "io.github.spencerbull.oma-yokai"

  readonly property var yokai: bar && bar.shell && typeof bar.shell.serviceFor === "function"
    ? bar.shell.serviceFor(moduleName) : null
  readonly property string phase: yokai ? String(yokai.phase || "checking") : "checking"
  readonly property var snapshot: yokai && yokai.snapshot ? yokai.snapshot : Fleet.emptySnapshot()
  readonly property bool alarming: Fleet.phaseUrgent(phase, snapshot)
  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false
  readonly property real openPanelIndicatorWidth: button.labelWidth

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = button
    if ("hostWidget" in target) target.hostWidget = root
    if ("yokai" in target) target.yokai = root.yokai
  }

  function refresh() {
    if (yokai && yokai.refresh) yokai.refresh()
  }

  function open() {
    if (panelLoader.item && panelLoader.item.openFromHotkey) panelLoader.item.openFromHotkey()
  }

  function close() {
    if (panelLoader.item && panelLoader.item.close) panelLoader.item.close()
  }

  function togglePanel() {
    if (panelLoader.item) panelLoader.item.toggle()
  }

  function closeForPopoutSwitch() {
    if (panelLoader.item) panelLoader.item.closeForPopoutSwitch()
  }

  function launchTui() {
    if (yokai && yokai.launchTui) yokai.launchTui()
  }

  onBarChanged: injectPanel()
  onSettingsChanged: {
    injectPanel()
    if (yokai) yokai.settings = root.settings
  }
  onYokaiChanged: {
    injectPanel()
    if (yokai) yokai.settings = root.settings
  }

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.vertical
      ? (root.alarming ? "󰀦" : "󰢮")
      : (root.alarming ? "󰀦 " : "󰢮 ") + Fleet.barLabel(root.snapshot, root.phase)
    fontSize: Style.font.bodySmall
    horizontalMargin: 7
    active: root.opened || root.alarming
    tooltipText: Fleet.barTooltip(root.snapshot, root.phase, yokai ? yokai.lastError : "")
    onPressed: function(buttonCode) {
      if (buttonCode === Qt.RightButton) root.launchTui()
      else if (buttonCode === Qt.MiddleButton) root.refresh()
      else root.togglePanel()
    }
  }
}
