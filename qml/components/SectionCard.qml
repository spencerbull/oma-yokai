import QtQuick
import qs.Commons
import qs.Ui

BorderSurface {
  id: root
  property color foreground: Color.foreground
  property int contentPadding: Style.space(12)
  default property alias content: body.children

  width: parent ? parent.width : implicitWidth
  implicitHeight: body.implicitHeight + contentPadding * 2
  radius: Style.cornerRadius
  color: Style.normalFillFor(foreground, Color.accent)
  borderSpec: Border.controlSpec("normal", foreground, Color.accent)

  Column {
    id: body
    anchors.left: parent.left
    anchors.right: parent.right
    anchors.top: parent.top
    anchors.margins: root.contentPadding
    spacing: Style.space(8)
  }
}
