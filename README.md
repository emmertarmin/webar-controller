# webar-controller
This is an HTML site that uses the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) and the [WebXR Device API](https://immersive-web.github.io/webxr/) to send G-Code to an ESP32.

The ESP32 receives those commands and forwards it via serial to an Arduino nano, which runs the [GRBL firmware](https://github.com/gnea/grbl/wiki). Two microcontrollers might be an overkill, but I wanted to have the Nano with GRBL to be its own separate CNC layer and have the wireless component be optional.