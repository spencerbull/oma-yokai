import QtQuick
import QtQuick.Controls
import qs.Commons
import qs.Ui

Panel {
  id: root
  moduleName: "io.github.spencerbull.oma-yokai"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  property var yokai: null
  property bool deepMode: false

  readonly property var barIdentity: hostWidget || root
  readonly property color contentForeground: bar ? bar.foreground : Color.foreground
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family

  function open() {
    deepMode = false
    controller.show()
    if (yokai && yokai.refresh) yokai.refresh()
  }

  function openFromHotkey() {
    open()
    Qt.callLater(function() {
      if (root.opened && root.bar && "centerHoverRevealSuppressed" in root.bar)
        root.bar.centerHoverRevealSuppressed = true
    })
  }

  function close() {
    if (bar && "centerHoverRevealSuppressed" in bar) bar.centerHoverRevealSuppressed = false
    controller.hide()
  }

  function toggle() {
    if (opened) close()
    else openFromHotkey()
  }

  function switchPanel(direction) {
    if (bar && typeof bar.switchPanelFrom === "function")
      return bar.switchPanelFrom(barIdentity, direction)
    return false
  }

  function launchTui() {
    if (yokai && yokai.launchTui && yokai.launchTui()) close()
  }

  KeyboardPanel {
    id: popup
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    centerOnBar: root.deepMode
    focusTarget: keyCatcher
    contentWidth: popup.fittedContentWidth(root.deepMode ? Style.space(760) : Style.space(390))
    contentHeight: popup.fittedContentHeight(panelContent.implicitHeight, Style.space(720))

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      blocked: root.deepMode && deepView.modalInteractionActive
      onCloseRequested: root.close()
      onReturnRequested: if (!root.deepMode) root.deepMode = true
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onTextKey: function(text) {
        if (text === "r" || text === "R") {
          if (root.yokai && root.yokai.refresh) root.yokai.refresh()
        } else if (text === "t" || text === "T") {
          root.launchTui()
        } else if (text === "g" || text === "G") {
          root.deepMode = false
        } else if (text === "d" || text === "D") {
          root.deepMode = true
        }
      }

      Flickable {
        id: scroll
        anchors.fill: parent
        contentWidth: width
        contentHeight: panelContent.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        flickableDirection: Flickable.VerticalFlick
        interactive: contentHeight > height
        ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

        Column {
          id: panelContent
          width: scroll.width

          SimpleView {
            visible: !root.deepMode
            width: parent.width
            yokai: root.yokai
            foreground: root.contentForeground
            fontFamily: root.contentFontFamily
            onDiveRequested: root.deepMode = true
            onTuiRequested: root.launchTui()
            onRefreshRequested: if (root.yokai && root.yokai.refresh) root.yokai.refresh()
          }

          DeepView {
            id: deepView
            visible: root.deepMode
            width: parent.width
            yokai: root.yokai
            foreground: root.contentForeground
            fontFamily: root.contentFontFamily
            onBackRequested: root.deepMode = false
            onTextEditingEscapeRequested: Qt.callLater(function() { keyCatcher.forceActiveFocus() })
            onTuiRequested: root.launchTui()
            onRefreshRequested: if (root.yokai && root.yokai.refresh) root.yokai.refresh()
          }
        }
      }
    }
  }
}
