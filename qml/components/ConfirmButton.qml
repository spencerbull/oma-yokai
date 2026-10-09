import QtQuick
import qs.Commons
import qs.Commons as Commons
import qs.Ui

Button {
  id: root
  property string actionText: "Continue"
  property string confirmationText: "Confirm"
  property bool dangerous: false
  property bool armed: false
  property color baseForeground: Commons.Color.foreground

  signal confirmed()

  text: armed ? confirmationText : actionText
  bordered: true
  foreground: dangerous && armed ? Commons.Color.urgent : baseForeground
  fontFamily: Style.font.family
  fontSize: Style.font.bodySmall

  onClicked: {
    if (armed) {
      armed = false
      disarm.stop()
      confirmed()
    } else {
      armed = true
      disarm.restart()
    }
  }

  Timer {
    id: disarm
    interval: 5000
    repeat: false
    onTriggered: root.armed = false
  }
}
