var plotly = require('plotly')('dpressle', 'bpibKG7xeqEfQjIg8Orq');//bpibKG7xeqEfQjIg8Orq
var five = require("johnny-five");
var board = new five.Board();

var data = [{x:[], y:[], stream:{token:'zerv76ehad', maxpoints:200}}];//,
//{x:[], y:[], stream:{token:'f8vwuj9udy', maxpoints:200}},
// {x:[], y:[], stream:{token:'t461uwgtcd', maxpoints:200}}];

var layout = {fileopt : "extend", filename : "uv sensing arduino!"};

board.on("ready", function() {

  // create a new UV sensor object
  var uvOut = new five.Sensor({
    pin: "A0",
    freq: 100, // get reading every 100ms
    thresh: 0.5
  });

  var ref_3V3 = new five.Sensor({
    pin: "A1",
    freq: 100, // get reading every 100ms
    thresh: 0.5
  });

   // create a new UV sensor object
  // var uvOut_1 = new five.Sensor({
  //   pin: "A2",
  //   freq: 1000, // get reading every 1000ms
  //   thresh: 0.5
  // });

  // // create a 3V reference Pin object
  // var ref_3V3_1 = new five.Sensor({
  //   pin: "A3",
  //   freq: 1000, // get reading every 1000ms
  //   thresh: 0.5
  // });

  // initialize the plotly graph
  plotly.plot(data,layout,function (err, res) {
    if (err) console.log(err);
    console.log(res);
    //once it's initialized, create a plotly stream
    //to pipe your data!
    var stream = plotly.stream('zerv76ehad', function (err, res) {
      if (err) console.log(err);
      console.log(res);
    });
    var stream1 = plotly.stream('f8vwuj9udy', function (err, res) {
      if (err) console.log(err);
      console.log(res);
    });
    // var stream_2 = plotly.stream('t461uwgtcd', function (err, res) {
    //   if (err) console.log(err);
    //   console.log(res);
    // });
    // this gets called each time there is a new sensor reading
    var readings = 10;
    var uvLevel = 0;
    var uvLevelTemp = 0;
    var uvCounter = 0;
    // var runningValue = 0;
    //var uvLevel1 = 0;
    //var refReadings = 8;
    var refLevel = 3.3;
    var refLevelTemp = 0;
    var refCounter = 0;
    //var refLevel1 = 0;

    uvOut.on("data", function() {
      uvLevelTemp += this.value;

      if (uvCounter++ < readings) {
        return;
      }
      uvLevel = uvLevelTemp / readings;
      uvCounter = 0;
      //uvReadings = 2;
      //uvLevel = uvLevelTemp / uvReadings;
      //uvCounter = 0;
      uvLevelTemp = 0;

      var outputVoltage = 3.3 / refLevel * uvLevel;
      console.log('sensor output Voltage: ', outputVoltage);
      var uvIntensity = mapfloat(outputVoltage, 0.99, 2.8, 0.0, 15.0);
      console.log('UV Intensity: ', uvIntensity);
      //uvIntensity = Math.round(uvIntensity);
      var data = {
        x : getDateString(),
        y : uvIntensity.toFixed(3)
      };
      console.log('UV1: ', data);
      // write the data to the plotly stream
      stream.write(JSON.stringify(data)+'\n');
    });

    // uvOut_1.on("data", function() {
    //   var uvLevel = this.value;
    //   var outputVoltage = 3.3 / refLevel1 * uvLevel;
    //   var uvIntensity = mapfloat(outputVoltage, 0.99, 2.8, 0.0, 15.0);
    //  // uvIntensity = Math.round(uvIntensity);
    //   var data = {
    //     x : getDateString(),
    //     y : Math.round(uvIntensity)//uvIntensity.toFixed(2)
    //   };
    //   console.log('UV2: ', data);
    //   // write the data to the plotly stream
    //   stream1.write(JSON.stringify(data)+'\n');
    // });

    ref_3V3.on("data", function() {
      
      refLevelTemp += this.value;

      if (refCounter++ < readings) {
        return;
      }

      refLevel = refLevelTemp / readings;
      console.log('3.3 ref level: ', refLevel);
      refCounter = 0;
      refLevelTemp = 0;
    //   var outputVoltage = 3.3 / refLevel * uvLevel;
    //   var uvIntensity = mapfloat(outputVoltage, 0.99, 2.8, 0.0, 15.0);

    //   var data = {
    //     x : getDateString(),
    //     y : refLevel
    //   };
    //   console.log('ref level: ', data);
    //   // write the data to the plotly stream
    //   stream_2.write(JSON.stringify(data)+'\n');
    });

    //  ref_3V3_1.on("data", function() {
    //   refLevel1 = this.value;
    // //   var outputVoltage = 3.3 / refLevel * uvLevel;
    // //   var uvIntensity = mapfloat(outputVoltage, 0.99, 2.8, 0.0, 15.0);

    // //   var data = {
    // //     x : getDateString(),
    // //     y : refLevel
    // //   };
    // //   console.log('ref level: ', data);
    // //   // write the data to the plotly stream
    // //   stream_2.write(JSON.stringify(data)+'\n');
    // });

  });
});

// little helper function to get a nicely formatted date string
function getDateString () {
  var time = new Date();
  // 14400000 is (GMT-4 Montreal)
  // for your timezone just multiply +/-GMT by 3600000
  var datestr = new Date(time - (3600000 * -2)).toISOString().replace(/T/, ' ').replace(/Z/, '');
  return datestr;
}

function mapfloat(x, in_min, in_max, out_min, out_max)
{
  if(x < in_min) {
    x = in_min;
  }
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}