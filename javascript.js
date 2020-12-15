/* ########################################################### */
/* ########## Bluetooth LE functions, buttons, etc. ########## */
/* ########################################################### */


// Globals for the web interface to connect/disconnect to bluetooth device
const connectButton =		document.getElementById('connectButton');
const disconnectButton =	document.getElementById('disconnectButton');
const connectMessage =		document.getElementById('connectMessage');

// Setting options of connecting to device
const options = {
  filters: [
	{name: 'ESP32'},
  ],
  optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b']
}

// Connect to bluetooth device, called by button click
let device, characteristic;
connectButton.onclick = async () => {
  device = await navigator.bluetooth
             .requestDevice(options);
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
  characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');
  
  device.ongattserverdisconnected = disconnect;
  //connected.style.display = 'block';
  connectButton.style.display = 'none';
  disconnectButton.style.display = 'initial';
};

// Disconnect from bluetooth device, called by button click
const disconnect = () => {
  device = null;
  receiveCharacteristic = null;
  sendCharacteristic = null;
  //connected.style.display = 'none';
  connectButton.style.display = 'initial';
  disconnectButton.style.display = 'none';
};
disconnectButton.onclick = async () => {
  await device.gatt.disconnect();
  disconnect();
};

// Old function that connects to device and sends characteristic all at once
/*async function impracticalBluetoothSender() {
	let device = await navigator.bluetooth.requestDevice(options);
	let server = await device.gatt.connect();
	let service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
	console.log(service);
	let characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');
	
	let c = await characteristic.readValue();
	
	let enc = new TextDecoder("utf-8");
	console.log("here comes c");
	console.log(enc.decode(c));
	
	characteristic.writeValue(
		new Uint8Array([ 0x41, 0x42, 0x43, 0x44 ]) //=ABCD
	);
};*/

// Homing function
async function home() {	
	let c = await characteristic.readValue();
	
	console.log(new TextDecoder("utf-8").decode(c));
	
	characteristic.writeValue(
		new Uint8Array([ 0x24, 0x48 ])
	);

}

var ready = true;
// G-Code sender function
async function sendGCode(gcode = document.getElementById("gcode").value) {
	let c = await characteristic.readValue();			

	console.log(new TextDecoder("utf-8").decode(c));

	characteristic.writeValue(
		new TextEncoder().encode(gcode)
	).then(function () {
		ready = true;
	});
	
}

const roll = document.getElementById('roll');
const pitch = document.getElementById('pitch');
const yaw = document.getElementById('yaw');

// Play around with device orientation
var ball   = document.querySelector('.ball');
var garden = document.querySelector('.garden');
var output = document.querySelector('.output');

var maxX = garden.clientWidth  - ball.clientWidth;
var maxY = garden.clientHeight - ball.clientHeight;

/* #################################################################################### */
/* ########## Getting orientation of device, sending gcode accordingly, etc. ########## */
/* #################################################################################### */
/*
function handleOrientation(event) {
  //var a = parseInt(event.alpha);  // In degree in the range [-180,180]
  //var b = parseInt(event.beta);  // In degree in the range [-180,180]
  //var c = parseInt(event.gamma); // In degree in the range [-90,90]

  //roll.innerHTML  = "alpha: " + a;
  //pitch.innerHTML = "beta: " + b;
  //yaw.innerHTML = "gamma: " + c;
  var y = parseInt(event.beta);  // In degree in the range [-180,180]
  var x = parseInt(event.gamma); // In degree in the range [-90,90]

  output.innerHTML  = "beta : " + x + "\n";
  output.innerHTML += "gamma: " + y + "\n";

  // Because we don't want to have the device upside down
  // We constrain the x value to the range [-90,90]
  if (x >  90) { x =  90};
  if (x < -90) { x = -90};

  // To make computation easier we shift the range of 
  // x and y to [0,180]
  x += 90;
  y += 90;

  // 10 is half the size of the ball
  // It center the positioning point to the center of the ball
  ball.style.top  = (maxY*y/180 - 10) + "px";
  ball.style.left = (maxX*x/180 - 10) + "px";
  
  if (!characteristic || isNaN(x)) { return }
  let gcode = "G0 X-" + x + "Y-" + y + "\n";
  document.getElementById("demo").innerHTML = gcode;
  sendGCode(gcode);

}
window.addEventListener('deviceorientation', handleOrientation);*/

/* ######################################################################### */
/* ########## Integrating acceleration twice to calculate motion, ########## */
/* ##########           sending gcode accordingly, etc.           ########## */
/* ######################################################################### */

/*var sx = 0;
var sy = 0;
var t_old = new Date().getMilliseconds();

function handleMotionEvent(event) {

    var x = event.acceleration.x;
    var y = event.acceleration.y;
    var z = event.acceleration.z;
	
	var t = new Date().getMilliseconds();
	var dt = (t-t_old)/1000;
	t_old = t;
	
	sx += 0.5*x*dt*dt;
	document.getElementById("acc").innerHTML = Math.round(sx*1000)/1000;

}
window.addEventListener("devicemotion", handleMotionEvent, true);*/

/* ############################################################## */
/* ########## WebXR to get position of device in space ########## */
/* ############################################################## */

let xrButton = document.getElementById('xr-button');
let xrSession = null;
let xrRefSpace = null;

// WebGL scene globals.
let gl = null;

function checkSupportedState() {
	navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
		if (supported) {
			xrButton.value = 'Enter AR';
		} else {
			xrButton.value = 'AR not found';
		}

		xrButton.disabled = !supported;
	});
}

function initXR() {
	if (!window.isSecureContext) {
		let message = "WebXR unavailable due to insecure context";
		document.getElementById("warning-zone").innerText = message;
	}
	
	if (navigator.xr) {
		xrButton.addEventListener('click', onButtonClicked);
		navigator.xr.addEventListener('devicechange', checkSupportedState);
		checkSupportedState();
	}
}

function onButtonClicked() {
	if (!xrSession) {
		// Ask for an optional DOM Overlay, see https://immersive-web.github.io/dom-overlays/
		navigator.xr.requestSession('immersive-ar', {
			optionalFeatures: ['dom-overlay'],
			domOverlay: {root: document.getElementById('overlay')} //document.getElementById('overlay')
		}).then(onSessionStarted, onRequestSessionError);
	} else {
		xrSession.end();
	}
}

function onSessionStarted(session) {
	xrSession = session;
	xrButton.value = 'Exit AR';

	// Show which type of DOM Overlay got enabled (if any)
	if (session.domOverlayState) {
		document.getElementById('session-info').innerHTML = 'DOM Overlay type: ' + session.domOverlayState.type;
	}

	session.addEventListener('end', onSessionEnded);
	let canvas = document.createElement('canvas');
	gl = canvas.getContext('webgl', {
		xrCompatible: true
	});
	session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
	session.requestReferenceSpace('local').then((refSpace) => {
		xrRefSpace = refSpace;
		session.requestAnimationFrame(onXRFrame);
	});
}

function onRequestSessionError(ex) {
	alert("Failed to start immersive AR session.");
	console.error(ex.message);
}

function onEndSession(session) {
	session.end();
}

function onSessionEnded(event) {
	xrSession = null;
	xrButton.value = 'Enter AR';
	document.getElementById('session-info').innerHTML = '';
	gl = null;
}
const poseEl = document.getElementById("pose");
var x = 0;
var y = 0;
var z = 0;
var ox = 0;
var oy = 0;
var oz = 0;
function onXRFrame(t, frame) {
	let session = frame.session;
	session.requestAnimationFrame(onXRFrame);
	let pose = frame.getViewerPose(xrRefSpace);

	if (pose) {
		x = parseInt(pose.transform.position.x*100000)/100;
		y = parseInt(pose.transform.position.y*100000)/100;
		z = parseInt(pose.transform.position.z*100000)/100;
		poseEl.innerHTML = "Position:<br/>w: " + pose.transform.position.w;
		poseEl.innerHTML += "<br/><span style='color: red'>x: " + x + "</span>";
		poseEl.innerHTML += "<br/>y: " + y;
		poseEl.innerHTML += "<br/>z: " + z;

		ox = parseInt(pose.transform.orientation.x*1000)/100;
		oy = parseInt(pose.transform.orientation.y*1000)/100;
		oz = parseInt(pose.transform.orientation.z*1000)/100;
		poseEl.innerHTML += "<br/>Orientation:<br/>w: " + pose.transform.orientation.w;
		poseEl.innerHTML += "<br/>x: " + ox;
		poseEl.innerHTML += "<br/>y: " + oy;
		poseEl.innerHTML += "<br/>z: " + oz;

		/*gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);

		// Update the clear color so that we can observe the color in the
		// headset changing over time. Use a scissor rectangle to keep the AR
		// scene visible.
		const width = session.renderState.baseLayer.framebufferWidth;
		const height = session.renderState.baseLayer.framebufferHeight;
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(width / 4, height / 4, width / 2, height / 2);
		let time = Date.now();
		gl.clearColor(Math.cos(time / 2000), Math.cos(time / 4000), Math.cos(time / 6000), 0.5);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);*/

		if (!characteristic || isNaN(x) || isNaN(oz)) { return }
		let gcode = "X" + (-oz*5-50) + " Y" + (x-50) + "\n";
		document.getElementById("demo").innerHTML = gcode;
		sendGCode(gcode);
	}
}

initXR();

  
  