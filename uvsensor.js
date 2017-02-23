var fs = require('fs');
var csvWriter = require('csv-write-stream');
var five = require("johnny-five");
// var readline = require('readline');

var writer = csvWriter({ headers: ["Date", "UV"]});
// var rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// rl.question("Do you want to calibrate the sensor[Y/N]? (if yes dont forget to cover the sensor) : ", (answer) => {
  var calibrate = true;

  // console.log(`answer: ${answer}`);
  // if(answer === 'y' || answer === 'Y' || answer === '') {
  //   calibrate = true;
  //   console.log('Calibrating, please wait...')
  // } else {
  //   calibrate = false;
  // }
  // rl.close();

var board = new five.Board();

board.on("exit", function() {
   writer.end();
});

board.on("ready", function() {
  //create time stamp for csv file name
  var now = new Date();
  writer.pipe(fs.createWriteStream((((((
    now.getFullYear()*100 + (now.getMonth()+1))*100 + now.getDate())*100 +
    now.getHours())*100 + now.getMinutes())*100 + now.getSeconds()) + '.csv'));

  
  // create a new UV sensor object
  var uvOut = new five.Sensor({
    pin: "A0",
    freq: 100, // get reading every 100ms
    thresh: 0.5
  });
  // create a new voltage referance object
  var ref_3V3 = new five.Sensor({
    pin: "A1",
    freq: 100, // get reading every 100ms
    thresh: 0.5
  });

  var minVoltage = 0.99; // default value per data sheet
  var readings = 10;// number of reading for avarage read
  var uvLevel = 0;
  var uvLevelTemp = 0;
  var uvCounter = 0;
  var refLevel = 0;
  var refLevelTemp = 0;
  var refCounter = 0;

    // this gets called each time there is a new sensor reading
    uvOut.on("data", function() {
      uvLevelTemp += this.value;
     
      if (uvCounter++ < readings) {
        return;
      }
      uvLevel = uvLevelTemp / readings;
      uvCounter = 0;
      uvLevelTemp = 0;
      // lets return since we dont have 3.3 referance level yet
      if (refLevel === 0) {
        return;
      }
      //console.log('ref output Voltage: ', refLevel);
      var outputVoltage = 3.3 / refLevel * uvLevel;
      //console.log('sensor output Voltage: ', outputVoltage);

      if (calibrate) {
          calibrate = false;
          minVoltage = outputVoltage;//.toFixed(2);
          console.log('Calibration process is done, min voltage set to', minVoltage);
      }
      var uvIntensity = mapfloat(outputVoltage, minVoltage, 2.8, 0.0, 15.0);
      //uvIntensity = Math.round(uvIntensity);
      //console.log(getDateString());
      console.log('UV Intensity: ', uvIntensity.toFixed(3));

      // write to csv file writer
      writer.write([getDateString(), uvIntensity.toFixed(3)])
    });

    ref_3V3.on("data", function() { 
      refLevelTemp += this.value;

      if (refCounter++ < readings) {
        return;
      }

      refLevel = refLevelTemp / readings;
     // console.log('3.3 ref level: ', refLevel);
      refCounter = 0;
      refLevelTemp = 0;
    });
  });

// little helper function to get a nicely formatted date string
function getDateString () {
  var time = new Date();
  // for your timezone just multiply +/-GMT by 3600000
  var datestr = new Date(time - (3600000 * -2)).toISOString().replace(/T/, '_').replace(/Z/, '');
  return datestr;
}

function mapfloat(x, in_min, in_max, out_min, out_max) {
  //make sure we dont get negative resualt
  if(x < in_min) {
    x = in_min;
  }
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}