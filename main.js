var express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var sys = require('sys')
var exec = require('child_process').exec;
var fs = require('fs');
var  path = require("path");
var  pngparse = require("pngparse");
var   myLedStripe = require('ledstripe');
app.use(express.static(__dirname + '/img'));

server.listen(8080);

////////// LED ///////////////

var imgDir = __dirname + '/img',
  numLEDs = 30,
  ledStripeType = 'LPD8806'
  //ledStripeType = 'WS2801'

var blackBuffer = new Buffer(numLEDs * 3);
for (var i = 0; i < blackBuffer.length; i++) {
  blackBuffer[i] = 0;
};

function displayPNG(filename, socket, onFinish) {
  pngparse.parseFile(path.join(imgDir, filename), function (err, data) {
    if (err)
      throw err
    console.log('writing to device');
    //append 1 black row
    var imgBuffer = Buffer.concat([data.data, blackBuffer]);
	//console.log(imgBuffer)
	console.log(new Uint16Array(imgBuffer))
    //myLedStripe.animate(imgBuffer, '50m', socket, onFinish);
  });
  return;
}




////////// SERVER /////////////////////////////

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

var cim = 0;
var connect = 0;
io.sockets.on('connection', function (socket) {
	console.log("come",cim++);
  fs.readdir(imgDir, function (err, list) {
    socket.emit('filelist', {
      stdout: JSON.stringify(list)
    });
  });
  socket.on('command', function (data) {
    console.log(data);
		displayLED(data.command, socket); 
  });
  
  socket.on('connectDevice', function (data) {
    console.log(data);
	if(connect == 1 ){
		myLedStripe.disconnect();
	}
	myLedStripe.connect(parseInt(data.numLEDs), data.ledStripeType, data.spiDevice);
	connect = 1;
	socket.emit('connectDeviceSuccess', { 
      stdout: true
    });
  });
  
});

function displayLED(filename, socket) {
  myLedStripe.fill(0x00, 0x00, 0x00);
  displayPNG(filename, socket, function () {
    socket.emit('news', {
      stdout: "ok"
    });
	myLedStripe.fill(0x00, 0x00, 0x00);
  });
}

 function doFancyColors(){
        // o.k., lets do some colorful animation
        console.log("all colors are beautiful \\o/")
        var myDisplayBuffer = new Buffer(numLEDs*3);
        var animationTick = 0.005;
        var angle = 0;
        var ledDistance = 0.3;
        setInterval(function(){
          angle = (angle < Math.PI * 2) ? angle : angle - Math.PI*2;
          for (var i=0; i<myDisplayBuffer.length; i+=3){
            //red
            myDisplayBuffer[i] = 128 + Math.sin(angle + (i/3)*ledDistance) * 128;
            //green
            myDisplayBuffer[i+1] = 128 + Math.sin(angle * -5 + (i/3)*ledDistance) * 128;
            //blue
            myDisplayBuffer[i+2] = 128 + Math.sin(angle * 7 + (i/3)*ledDistance) * 128;
          }
          myLedStripe.sendRgbBuf(myDisplayBuffer);
          angle+=animationTick;
        },5);
    }; // end doFancyColors

function runTerminal(command, socket) {
  exec(command, function (error, stdout, stderr) {
    socket.emit('news', {
      stdout: stdout
    });
    if (error !== null) {
      socket.emit('news', {
        stdout: stderr
      });
    }
  });
}
