import QtQuick
import qs.Commons
import qs.Commons as Commons

Row {
  id: root
  property string label: ""
  property string value: ""
  property color foreground: Commons.Color.foreground
  property string fontFamily: Style.font.family
  readonly property color dim: Qt.darker(foreground, 1.55)
  spacing: Style.space(8)
  width: parent ? parent.width : implicitWidth

  Text {
    text: root.label
    color: root.dim
    font.family: root.fontFamily
    font.pixelSize: Style.font.body
    width: Style.space(72)
  }

  Text {
    text: root.value
    color: root.foreground
    font.family: root.fontFamily
    font.pixelSize: Style.font.body
    wrapMode: Text.WordWrap
    width: Math.max(40, root.width - Style.space(80))
  }
}
