const express = require('express');
const router = express.Router();
const mapboxController = require('../controllers/mapbox.controller');

// Geocoding endpoints
router.get('/geocode', mapboxController.geocode);
router.get('/reverse-geocode', mapboxController.reverseGeocode);

// Places autocomplete
router.get('/places-autocomplete', mapboxController.placesAutocomplete);

// Directions endpoints
router.get('/directions', mapboxController.getDirections);
router.post('/matrix', mapboxController.getMatrix);
router.get('/isochrone', mapboxController.getIsochrone);

module.exports = router;
