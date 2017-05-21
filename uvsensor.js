let fs = require('fs');
let readline = require('readline');
//let csvWriter = require('csv-write-stream');
let csv = require("fast-csv");
let five = require("johnny-five");

let board = new five.Board();
let rl = readline.createInterface({input: process.stdin,output: process.stdout});

let runTest = false;
let calibrate = true;
let minVoltage = 0.99; // default value per data sheet
const readings = 10;// number of reading for aletage read
const TEST_DIR_NAME = 'test_case';
let uvIntensity = 0;
let uvLevel = 0;
let uvLevelTemp = 0;
let uvCounter = 0;
let refLevel = 0;
let refLevelTemp = 0;
let refCounter = 0;

let testRunning = false;// flag if test is in process
let index = 0;// current index of test object
let jsonContent = []; // the list object that holds the tests

board.on("exit", () => {
  // writer.end();
});

board.on("ready", () => {
  if (calibrate) {
    console.log('calibrating minimum voltage please wait...');
  }
   // create a new UV sensor object
  let uvOut = new five.Sensor({
    pin: "A0",
    freq: 100, // get reading every 100ms
    thresh: 0.5
  });
  // create a new voltage referance object
  let ref_3V3 = new five.Sensor({
    pin: "A1",
    freq: 100, // get reading every 100ms
    thresh: 0.5
  });

  // this gets called each time there is a new sensor reading
  uvOut.on("data", () => {
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
    let outputVoltage = 3.3 / refLevel * uvLevel;
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

  ref_3V3.on("data", () => { 
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
  let testFiles = [];
  try {
    // get all files from test_case directory
    testFiles = fs.readdirSync(TEST_DIR_NAME);
  } catch (e) {
    // cannot read files from dir exit with error
    console.error("error reading json directory", TEST_DIR_NAME);
    process.exit(1);
  }
  // if files found
  if (testFiles.length > 0) {
    // read the first file's content. TODO: read and run multiple files
    //let contents = fs.readFileSync("TestCase\\" + testFiles[0]);
    let csvFile = TEST_DIR_NAME + "\\" + testFiles[0];
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
      .on("end", () => {
          if (jsonContent.length == 0) {
            console.log('csv file is empty, exiting.');
            process.exit(2);
          }
          console.log('');
          console.log("Runnig test case:" + jsonContent[index].Frame + ", " + jsonContent[index].Index + ", " + jsonContent[index].Coating + ", " + jsonContent[index].Direction);
          console.log("Press enter to start, press enter again to stop and move to next test.");

          rl.on('line', (line) => {
            if (testRunning) {
              testRunning = false;
              let uvIntensityNow = uvIntensity.toFixed(3);
              jsonContent[index].Date = getDateString();
              jsonContent[index].Uv = uvIntensityNow;
              console.log("Test ended, UV value saved", uvIntensityNow);
              console.log('');
              index++;
              if (index == jsonContent.length) {
                csv.writeToPath(csvFile, jsonContent, { headers: true })
                  .on("finish", () => {
                    console.log("done!");
                    rl.close();
                  });
                  
              } else {
                console.log("Runnig test case:" + jsonContent[index].Frame + ", " + jsonContent[index].Index + ", " + jsonContent[index].Coating + ", " + jsonContent[index].Direction);
                console.log("Press enter to start, press enter again to stop and move to next test.");
              }
            } else {
              testRunning = true;
            }
          });
          rl.on('close', () => {
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
  let time = new Date();
  // for your timezone just multiply +/-GMT by 3600000
  let datestr = new Date(time - (3600000 * -2)).toISOString().replace(/T/, '_').replace(/Z/, '');
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
  let now = new Date();
  return (((((now.getFullYear()*100 + (now.getMonth()+1))*100 + now.getDate())*100 +
     now.getHours())*100 + now.getMinutes())*100 + now.getSeconds());
}
