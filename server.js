// server.js
// where your node app starts

// init project
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const { URL } = require('url');


var app = express();

const mongoUrl = "mongodb://" + 
    process.env.DB_USERNAME +
    ':' +
    process.env.DB_PASSWORD +
    '@' +
    process.env.DB_URL +
    '/freecodecamp'

const mongoColl = 'url_shortener'

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/:number", function (req, resp) {
  sendTo(req.params.number, function(err, url) {
    if (err) {
      resp.send("error, cannot redirect")
      return;
    }
    if (url) {
      resp.redirect(url)
    } else {
      resp.send("not a valid short url")
    }
  })
})

// catch urls with forward slashes (note the asterisk)
app.get("/new/:url(*)", function (request, response) {
  getShortURL(request.params.url, function(err, short) {
    if (err) {
      response.send("invalid url " + request.params.url + " (do you have http in front?)")
      return;
    } else {
      response.send({
        short_url : 'https://' + request.headers['host'] + '/' + short,
        original_url : request.params.url
      })
    }
  })
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


function getShortURL(url, cb) {
  // Connect to the db
  MongoClient.connect(mongoUrl, function(err, db) {
    if (err) throw err;
    var myURL;
    try {
      myURL = new URL(url);
    } catch (e) {
      cb(e, null)
      return;
    }
    console.log("url: %s" , myURL.href)
    var coll = db.collection(mongoColl)
    var mysort = { count: -1 }
    
    // find largest count
    coll.find().sort(mysort).limit(1).toArray(function(err, result) {
      if (err) throw err
      console.log("find result: %s", JSON.stringify(result[0]))
      if (result) {
        const short = result[0].count + 1
        coll.insertOne({ count: short, url: myURL.href }, function(err, res) {
          if (err) throw err;
          console.log("insert result: %s", JSON.stringify(res.result));
          db.close();
          
          cb(false, short);
        }) // insertOne()
      } else {
        cb('unexpected error', null);
      }
    }) // find()
  }) // MongoClient.connect()
}

 
function sendTo(num, cb) {
  console.log("redirect %s", num)
  const short = parseInt(num)
  
  if (!short) {
    cb("cannot parse num")
    return
  }
  console.log("sendTo short=%s", short)
  MongoClient.connect(mongoUrl, function(err, db) {
    if (err) throw err;
    var coll = db.collection(mongoColl)
   
    // find count = num
    coll.find({count : short}, {count: false, id_: false}).toArray(function(err, result) {
      if (err) throw err
      console.log("find result: %s", JSON.stringify(result))
      if (result.length > 0) {
        cb(false, result[0].url);
      } else {
        cb(true, null);
      }
    }) // find()
  }) // MongoClient.connect()
}