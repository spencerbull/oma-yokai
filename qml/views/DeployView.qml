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
  property string selectedDeviceId: ""
  property string workload: "vllm"
  property string validationError: ""
  readonly property bool textEditing: imageField.activeFocus || modelField.activeFocus || portField.activeFocus

  signal textEditingEscapeRequested()

  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property var preferences: snapshot.settings && snapshot.settings.preferences ? snapshot.settings.preferences : ({})
  width: parent ? parent.width : implicitWidth
  spacing: Style.space(10)

  function defaultImage() {
    if (workload === "llamacpp") return String(preferences.default_llama_image || "")
    if (workload === "comfyui") return String(preferences.default_comfyui_image || "")
    return String(preferences.default_vllm_image || "")
  }

  function serviceName() {
    var seed = String(modelField.text || workload).toLowerCase()
    return (workload + "-" + seed).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
  }

  function requestPayload() {
    var port = String(portField.text || "").trim()
    var ports = ({})
    ports[port] = port
    return {
      device_id: selectedDeviceId,
      service_type: workload,
      image: String(imageField.text || "").trim(),
      name: serviceName(),
      model: workload === "comfyui" ? "" : String(modelField.text || "").trim(),
      ports: ports,
      env: ({}),
      gpu_ids: "all",
      extra_args: "",
      volumes: ({}),
      plugins: [],
      runtime: ({})
    }
  }

  function validate() {
    if (!selectedDeviceId) return "Select an online device"
    if (!String(imageField.text || "").trim()) return "Image is required"
    if (workload !== "comfyui" && !String(modelField.text || "").trim()) return "Model is required"
    var port = parseInt(String(portField.text || ""), 10)
    if (!isFinite(port) || port < 1 || port > 65535) return "Port must be between 1 and 65535"
    return ""
  }

  function prepareDeploy() {
    validationError = validate()
    if (validationError) return
    confirmDeploy.armed = true
    confirmReset.restart()
  }

  onWorkloadChanged: {
    imageField.text = defaultImage()
    portField.text = workload === "comfyui" ? "8188" : "8000"
  }

  PanelHero {
    width: parent.width
    title: "Deploy"
    meta: "Small, explicit launch path"
    detail: "Advanced flags, BKC tuning, GGUF selection, and secrets stay in Open TUI."
    foreground: root.foreground
    fontFamily: root.fontFamily
  }

  Yokai.SectionCard {
    width: parent.width
    foreground: root.foreground

    PanelSectionHeader { text: "TARGET"; foreground: root.foreground; fontFamily: root.fontFamily }
    Row {
      width: parent.width
      spacing: Style.space(6)
      Repeater {
        model: snapshot.devices.filter(function(device) { return device.online })
        Yokai.RowButton { required property var modelData; text: modelData.label; compact: true; bordered: true; selected: root.selectedDeviceId === modelData.id; foreground: root.foreground; onClicked: root.selectedDeviceId = modelData.id }
      }
    }

    PanelSectionHeader { text: "WORKLOAD"; foreground: root.foreground; fontFamily: root.fontFamily }
    Row {
      spacing: Style.space(6)
      Repeater {
        model: ["vllm", "llamacpp", "comfyui"]
        Yokai.RowButton { required property string modelData; text: modelData; compact: true; bordered: true; selected: root.workload === modelData; foreground: root.foreground; onClicked: root.workload = modelData }
      }
    }

    TextField {
      id: imageField
      width: parent.width
      placeholderText: "Container image"
      foreground: root.foreground
      font.family: root.fontFamily
      text: root.defaultImage()
      Keys.onEscapePressed: function(event) {
        root.textEditingEscapeRequested()
        event.accepted = true
      }
    }
    TextField {
      id: modelField
      visible: root.workload !== "comfyui"
      width: parent.width
      placeholderText: root.workload === "llamacpp" ? "GGUF model repository" : "Model ID"
      foreground: root.foreground
      font.family: root.fontFamily
      Keys.onEscapePressed: function(event) {
        root.textEditingEscapeRequested()
        event.accepted = true
      }
    }
    TextField {
      id: portField
      width: Style.space(130)
      placeholderText: "Port"
      foreground: root.foreground
      font.family: root.fontFamily
      text: "8000"
      Keys.onEscapePressed: function(event) {
        root.textEditingEscapeRequested()
        event.accepted = true
      }
    }

    Text { visible: root.validationError !== ""; width: parent.width; text: root.validationError; color: Color.urgent; font.family: root.fontFamily; font.pixelSize: Style.font.bodySmall; wrapMode: Text.WordWrap }

    Row {
      spacing: Style.space(8)
      Button { text: "Review deployment"; bordered: true; foreground: root.foreground; onClicked: root.prepareDeploy() }
      Yokai.ConfirmButton {
        id: confirmDeploy
        visible: armed
        actionText: "Deploy"
        confirmationText: "Confirm deploy"
        dangerous: true
        baseForeground: root.foreground
        onConfirmed: {
          root.validationError = root.validate()
          if (!root.validationError && root.yokai) root.yokai.deploy(root.requestPayload())
        }
      }
    }

  }

  Timer { id: confirmReset; interval: 5000; repeat: false; onTriggered: confirmDeploy.armed = false }
}
