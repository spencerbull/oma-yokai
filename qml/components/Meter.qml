import QtQuick
import qs.Commons
import qs.Commons as Commons

Item {
  id: root
  property string label: ""
  property real value: 0
  property string detail: ""
  property color foreground: Commons.Color.foreground
  property color fill: Commons.Color.accent
  property string fontFamily: Style.font.family
  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property real clamped: Math.max(0, Math.min(1, Number(value) / 100))

  width: parent ? parent.width : implicitWidth
  implicitHeight: col.implicitHeight

  Column {
    id: col
    width: parent.width
    spacing: Style.space(4)

    Row {
      width: parent.width
      spacing: Style.space(8)

      Text {
        text: root.label
        color: root.foreground
        font.family: root.fontFamily
        font.pixelSize: Style.font.body
        font.bold: true
      }

      Text {
        text: Math.round(root.value) + "%"
        color: root.dim
        font.family: root.fontFamily
        font.pixelSize: Style.font.body
      }

      Text {
        visible: root.detail !== ""
        text: root.detail
        color: root.dim
        font.family: root.fontFamily
        font.pixelSize: Style.font.bodySmall
      }
    }

    Rectangle {
      width: parent.width
      height: Style.space(6)
      radius: height / 2
      color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.12)

      Rectangle {
        width: Math.max(height, parent.width * root.clamped)
        height: parent.height
        radius: parent.radius
        color: root.fill
      }
    }
  }
}
