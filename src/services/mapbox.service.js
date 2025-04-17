const axios = require('axios');

class MapboxService {
  constructor() {
    this.accessToken = 'pk.eyJ1Ijoia2FwaWxnYW5nd2FyIiwiYSI6ImNtOWw4eTk3ODAyNDYyanIwNW10dWc4a2MifQ.fhXzJwC258Bob-m4v6qHdg';
    this.baseUrl = 'https://api.mapbox.com';
  }

  /**
   * Forward geocoding - convert location text to coordinates
   * @param {string} query - The location to geocode
   * @returns {Promise} - The geocoding response
   */
  async geocode(query) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        {
          params: {
            access_token: this.accessToken,
            limit: 5,
            country: 'IN', // You can adjust or make this a parameter
            types: 'address,place,neighborhood,locality,poi'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  /**
   * Places autocomplete - search for places with incremental text input
   * @param {string} query - The partial location text to search for
   * @param {string} proximity - Optional comma-separated longitude,latitude for biasing results
   * @param {number} limit - Maximum number of results to return
   * @param {string} country - Optional country code(s) to restrict results to
   * @returns {Promise} - The autocomplete response
   */
  async placesAutocomplete(query, proximity = null, limit = 5, country = 'IN') {
    try {
      if (!query || query.trim().length < 2) {
        return { features: [] };
      }

      const params = {
        access_token: this.accessToken,
        limit: limit,
        country: country,
        types: 'address,place,neighborhood,locality,poi',
        autocomplete: true
      };

      // If proximity is provided, add it to params
      if (proximity) {
        params.proximity = proximity;
      }

      const response = await axios.get(
        `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        { params }
      );

      // Format the response to be more user-friendly for autocomplete
      const features = response.data.features.map(feature => ({
        id: feature.id,
        place_name: feature.place_name,
        text: feature.text,
        coordinates: feature.geometry.coordinates,
        context: feature.context || [],
        type: feature.place_type[0]
      }));

      return {
        features,
        attribution: response.data.attribution,
        query
      };
    } catch (error) {
      console.error('Places autocomplete error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocoding - convert coordinates to location information
   * @param {number} longitude - Longitude
   * @param {number} latitude - Latitude
   * @returns {Promise} - The reverse geocoding response
   */
  async reverseGeocode(longitude, latitude) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
        {
          params: {
            access_token: this.accessToken,
            limit: 1,
            types: 'address,place,neighborhood,locality'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  /**
   * Get directions between two points
   * @param {Array} start - [longitude, latitude] of start point
   * @param {Array} end - [longitude, latitude] of end point
   * @param {Array} waypoints - [[lng, lat], [lng, lat], ...] optional waypoints
   * @param {string} profile - The routing profile (driving, walking, cycling)
   * @returns {Promise} - The directions response
   */
  async getDirections(start, end, waypoints = [], profile = 'driving') {
    try {
      let coordinates = `${start[0]},${start[1]};`;

      // Add waypoints if any
      waypoints.forEach(point => {
        coordinates += `${point[0]},${point[1]};`;
      });

      coordinates += `${end[0]},${end[1]}`;

      const response = await axios.get(
        `${this.baseUrl}/directions/v5/mapbox/${profile}/${coordinates}`,
        {
          params: {
            access_token: this.accessToken,
            alternatives: true,
            geometries: 'geojson',
            overview: 'full',
            steps: true
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Directions error:', error);
      throw error;
    }
  }

  /**
   * Calculate the matrix of travel times between multiple points
   * @param {Array} sources - Array of [longitude, latitude] source points
   * @param {Array} destinations - Array of [longitude, latitude] destination points
   * @param {string} profile - The routing profile (driving, walking, cycling)
   * @returns {Promise} - The matrix response
   */
  async getMatrix(sources, destinations, profile = 'driving') {
    try {
      // Format sources and destinations as indices
      const sourceIndices = sources.map((_, index) => index).join(';');
      const destIndices = destinations.map((_, index) => index + sources.length).join(';');

      // Combine all coordinates
      const allCoordinates = [...sources, ...destinations].map(coord => coord.join(',')).join(';');

      const response = await axios.get(
        `${this.baseUrl}/directions-matrix/v1/mapbox/${profile}/${allCoordinates}`,
        {
          params: {
            access_token: this.accessToken,
            sources: sourceIndices,
            destinations: destIndices
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Matrix error:', error);
      throw error;
    }
  }

  /**
   * Get isochrone - area reachable within given time/distance from a point
   * @param {number} longitude - Longitude of center point
   * @param {number} latitude - Latitude of center point
   * @param {Array} contours - Array of contour minutes/distances
   * @param {string} profile - The routing profile (driving, walking, cycling)
   * @returns {Promise} - The isochrone response
   */
  async getIsochrone(longitude, latitude, contours = [10, 20, 30], profile = 'driving') {
    try {
      const contourMinutes = contours.join(',');

      const response = await axios.get(
        `${this.baseUrl}/isochrone/v1/mapbox/${profile}/${longitude},${latitude}`,
        {
          params: {
            access_token: this.accessToken,
            contours_minutes: contourMinutes,
            polygons: true
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Isochrone error:', error);
      throw error;
    }
  }
}

module.exports = new MapboxService();
