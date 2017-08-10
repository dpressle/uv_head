var fs = require('fs');
var readline = require('readline');
//var csvWriter = require('csv-write-stream');
var csv = require("fast-csv");
var five = require("johnny-five");

var board = new five.Board();
var rl = readline.createInterface({input: process.stdin,output: process.stdout});

var runTest = false;
var calibrate = true;
var minVoltage = 0.99; // default value per data sheet
const readings = 10;// number of reading for avarage read
const TEST_DIR_NAME = 'test_case';
var uvIntensity = 0;
var uvLevel = 0;
var uvLevelTemp = 0;
var uvCounter = 0;
var refLevel = 0;
var refLevelTemp = 0;
var refCounter = 0;

var testRunning = false;// flag if test is in process
var index = 0;// current index of test object
var jsonContent = []; // the list object that holds the tests

board.on("exit", () => {
  // writer.end();
});

board.on("ready", function(){
  if (calibrate) {
    console.log('calibrating minimum voltage please wait...');
  }
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

  // this gets called each time there is a new sensor reading
  uvOut.on("data", function(){
    uvLevelTemp += this.value;
    
    if (uvCounter++ < readings) {
      return;
    }
    uvLevel = uvLevelTemp / readings;
    uvCounter = 0;
    uvLevelTemp = 0;
    // vars return since we dont have 3.3 referance level yet
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
        action_func();
    }
    if (testRunning) {
      uvIntensity = mapfloat(outputVoltage, minVoltage, 2.8, 0.0, 15.0);
      //uvIntensity = Math.round(uvIntensity);
      console.log('UV Intensity: ', uvIntensity.toFixed(3));
    }
  });

  ref_3V3.on("data", function(){ 
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

function action_func() {
  var testFiles = [];
  try {
    // get all files from test_case directory
    testFiles = fs.readdirSync(TEST_DIR_NAME);
  } catch (e) {
    // cannot read files from dir exit with error
    console.error("error reading tests directory", TEST_DIR_NAME);
    process.exit(1);
  }
  // if files found
  if (testFiles.length > 0) {
    // read the first file's content. TODO: read and run multiple files
    //var contents = fs.readFileSync("TestCase\\" + testFiles[0]);
    var csvFile = TEST_DIR_NAME + "\\" + testFiles[0];
    csv
      .fromPath(csvFile, { headers: true, ignoreEmpty: true })
      .transform((obj) => {
        return {
          Name: obj.Name,
          Frame: obj.Frame,
          Index: obj.Index,
          Coating: obj.Coating,
          Direction: obj.Direction
        }
      })
      .on("data", (data) => {
        //console.log(data);
        jsonContent.push(data);
      })
      .on("end", function() {
          if (jsonContent.length == 0) {
            console.log('csv file is empty, exiting.');
            process.exit(2);
          }
          console.log('');
          console.log("Runnig test case: " + jsonContent[index].Frame + ", " + jsonContent[index].Index + ", " + jsonContent[index].Coating + ", " + jsonContent[index].Direction);
          console.log("Press enter to start, press enter again to stop and move to next test.");

          rl.on('line', function(line) {
            if (testRunning) {
              testRunning = false;
              var uvIntensityNow = uvIntensity.toFixed(3);
              jsonContent[index].Date = getDateString();
              jsonContent[index].Uv = uvIntensityNow;
              csv.writeToPath(csvFile, jsonContent, { headers: true })
                  .on("finish", function() {
                    console.log("Test ended, UV value saved", uvIntensityNow);
                    console.log('');
                  });
              index++;
              if (index == jsonContent.length) {
                rl.close();
              } else {
                console.log("Runnig test case: " + jsonContent[index].Frame + ", " + jsonContent[index].Index + ", " + jsonContent[index].Coating + ", " + jsonContent[index].Direction);
                console.log("Press enter to start, press enter again to stop and move to next test.");
              }
            } else {
              testRunning = true;
            }
          });
          rl.on('close', function() {
            process.exit(0);
          });
      });
  } else {
    console.error("Cannot find any files in test_case directory!");
    process.exit(3);
  }
}

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

// helper function to get time stamp for file/dir names
function getTimeStamp() {
  var now = new Date();
  return (((((now.getFullYear()*100 + (now.getMonth()+1))*100 + now.getDate())*100 +
     now.getHours())*100 + now.getMinutes())*100 + now.getSeconds());
}
