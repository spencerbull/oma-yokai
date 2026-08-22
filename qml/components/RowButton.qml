import QtQuick
import qs.Ui
import qs.Commons

Button {
  id: root
  property bool compact: false
  implicitHeight: compact ? Style.space(28) : Style.space(32)
  fontSize: Style.font.bodySmall
}
