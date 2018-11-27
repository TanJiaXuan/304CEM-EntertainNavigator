const axios = require('axios');
const express = require('express');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const server = express();
const filemgr = require('./filemgr');
const port = process.env.PORT || 3000;

server.use(express.static(__dirname + '/public'));
server.use(bodyParser.urlencoded({ extended: true }));
server.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');

const PLACES_API_KEY = 'AIzaSyDyeJk4dDTAszgqLudbcQfz4Cxc9XvgOr0';
var filteredResults;

hbs.registerHelper('list', (items, options) => {
  items = filteredResults;
  var out =
    "<thead class='thead-light'><tr><th>Name</th><th>Address</th><th>Rating (1-5) &nbsp;&nbsp;&nbsp; </th><th>Photo</th></tr></thead>";

  const length = items.length;

  for (var i = 0; i < length; i++) {
    out = out + options.fn(items[i]);
  }

  return out;
});

server.get('/', (req, res) => {
  res.render('home.hbs');
});

server.get('/search', (req, res) => {
  res.render('search.hbs');
});

server.get('/about', (req, res) => {
  res.render('about.hbs');
});
server.post('/getplaces', (req, res) => {
  const addr = req.body.address;
  const placetype = req.body.placetype;
  const name = req.body.name;
  const website = req.body.website;
  const rating = req.body.rating;
  const locationReq = `https://maps.googleapis.com/maps/api/geocode/json?address=${addr}&key=AIzaSyDyeJk4dDTAszgqLudbcQfz4Cxc9XvgOr0`;

  axios
    .get(locationReq)
    .then(response => {
      const locationData = {
        addr: response.data.results[0].formatted_address,
        lat: response.data.results[0].geometry.location.lat,
        lng: response.data.results[0].geometry.location.lng
      };

      const placesReq = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${
        locationData.lat
      },${
        locationData.lng
      }&radius=1500&types=${placetype}&name=${name}&rating=${rating}&key=${PLACES_API_KEY}`;

      return axios.get(placesReq);
    })
    .then(response => {
      filteredResults = extractData(response.data.results);

      filemgr
        .saveData(filteredResults)
        .then(result => {
          res.render('result.hbs');
        })
        .catch(errorMessage => {
          console.log(errorMessage);
        });

      //res.status(200).send(filteredResults);
    })
    .catch(error => {
      console.log(error);
    });
});

server.get('/history', (req, res) => {
  filemgr
    .getAllData()
    .then(result => {
      filteredResults = result;
      console.log(filteredResults[0]);
      res.render('history.hbs');
    })
    .catch(errorMessage => {
      console.log(errorMessage);
    });
});

server.post('/delete', (req, res) => {
  filemgr
    .deleteAll()
    .then(result => {
      filteredResults = result;
      res.render('history.hbs');
    })
    .catch(errorMessage => {
      console.log(errorMessage);
    });
});

const extractData = originalResults => {
  var placesObj = {
    table: []
  };

  const length = originalResults.length;

  for (var i = 0; i < length; i++) {
    if (originalResults[i].photos) {
      const photoRef = originalResults[i].photos[0].photo_reference;
      const requestUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${PLACES_API_KEY}`;
      tempObj = {
        name: originalResults[i].name,
        address: originalResults[i].vicinity,
        rating: originalResults[i].rating,
        photo_reference: requestUrl
      };
    } else {
      tempObj = {
        name: originalResults[i].name,
        address: originalResults[i].vicinity,
        rating: originalResults[i].rating,
        photo_reference: 'noimage.jpg'
      };
    }
    placesObj.table.push(tempObj);
  }
  return placesObj.table;
};

server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
