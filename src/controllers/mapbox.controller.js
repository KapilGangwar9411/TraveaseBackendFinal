const mapboxService = require('../services/mapbox.service');

/**
 * Geocode a location query
 */
const geocode = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const result = await mapboxService.geocode(query);
    res.status(200).json(result);
  } catch (error) {
    console.error('Geocode controller error:', error);
    res.status(500).json({ error: 'Failed to geocode location' });
  }
};

/**
 * Places autocomplete for incremental search
 */
const placesAutocomplete = async (req, res) => {
  try {
    const { query, proximity, limit, country } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Convert limit to number if it exists
    const limitNum = limit ? parseInt(limit, 10) : 5;

    const result = await mapboxService.placesAutocomplete(
      query,
      proximity || null,
      limitNum,
      country || 'IN'
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Places autocomplete controller error:', error);
    res.status(500).json({ error: 'Failed to get place suggestions' });
  }
};

/**
 * Reverse geocode coordinates
 */
const reverseGeocode = async (req, res) => {
  try {
    const { longitude, latitude } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'Longitude and latitude parameters are required' });
    }

    const result = await mapboxService.reverseGeocode(parseFloat(longitude), parseFloat(latitude));
    res.status(200).json(result);
  } catch (error) {
    console.error('Reverse geocode controller error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode coordinates' });
  }
};

/**
 * Get directions between two points
 */
const getDirections = async (req, res) => {
  try {
    const { startLng, startLat, endLng, endLat, profile } = req.query;
    const waypoints = req.body.waypoints || [];

    if (!startLng || !startLat || !endLng || !endLat) {
      return res.status(400).json({ error: 'Start and end coordinates are required' });
    }

    const start = [parseFloat(startLng), parseFloat(startLat)];
    const end = [parseFloat(endLng), parseFloat(endLat)];

    const result = await mapboxService.getDirections(start, end, waypoints, profile || 'driving');
    res.status(200).json(result);
  } catch (error) {
    console.error('Directions controller error:', error);
    res.status(500).json({ error: 'Failed to get directions' });
  }
};

/**
 * Get matrix of travel times
 */
const getMatrix = async (req, res) => {
  try {
    const { profile } = req.query;
    const { sources, destinations } = req.body;

    if (!sources || !destinations || !Array.isArray(sources) || !Array.isArray(destinations)) {
      return res.status(400).json({ error: 'Sources and destinations arrays are required' });
    }

    const result = await mapboxService.getMatrix(sources, destinations, profile || 'driving');
    res.status(200).json(result);
  } catch (error) {
    console.error('Matrix controller error:', error);
    res.status(500).json({ error: 'Failed to get travel time matrix' });
  }
};

/**
 * Get isochrone (area reachable within given time)
 */
const getIsochrone = async (req, res) => {
  try {
    const { longitude, latitude, contours, profile } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'Longitude and latitude parameters are required' });
    }

    const contoursArray = contours ? contours.split(',').map(Number) : [10, 20, 30];

    const result = await mapboxService.getIsochrone(
      parseFloat(longitude),
      parseFloat(latitude),
      contoursArray,
      profile || 'driving'
    );
    res.status(200).json(result);
  } catch (error) {
    console.error('Isochrone controller error:', error);
    res.status(500).json({ error: 'Failed to get isochrone' });
  }
};

module.exports = {
  geocode,
  placesAutocomplete,
  reverseGeocode,
  getDirections,
  getMatrix,
  getIsochrone
};
