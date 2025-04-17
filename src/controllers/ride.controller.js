const Ride = require('../models/ride.model');
const User = require('../models/user.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new ride offer
 */
const createRideOffer = async (req, res) => {
  try {
    const {
      driverId,
      sourceLocation,
      sourceCoordinates,
      destinationLocation,
      destinationCoordinates,
      departureTime,
      vehicleType,
      pricePerSeat,
      totalSeats
    } = req.body;

    // Validate required fields
    if (!driverId || !sourceLocation || !sourceCoordinates || !destinationLocation ||
        !destinationCoordinates || !departureTime || !vehicleType || !pricePerSeat || !totalSeats) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify departure time is in the future
    const departureDate = new Date(departureTime);
    if (departureDate <= new Date()) {
      return res.status(400).json({ error: 'Departure time must be in the future' });
    }

    // Format coordinates as array if they are strings
    const sourceCoordsArray = Array.isArray(sourceCoordinates)
      ? sourceCoordinates
      : JSON.parse(sourceCoordinates);

    const destCoordsArray = Array.isArray(destinationCoordinates)
      ? destinationCoordinates
      : JSON.parse(destinationCoordinates);

    // Create ride
    const rideData = {
      driverId,
      sourceLocation,
      sourceCoordinates: sourceCoordsArray,
      destinationLocation,
      destinationCoordinates: destCoordsArray,
      departureTime: departureDate,
      vehicleType,
      pricePerSeat: Number(pricePerSeat),
      totalSeats: Number(totalSeats),
      availableSeats: Number(totalSeats),
      routePolyline: req.body.routePolyline || null, // Optional
      estimatedDuration: req.body.estimatedDuration || null, // Optional
      estimatedDistance: req.body.estimatedDistance || null, // Optional
      additionalInfo: req.body.additionalInfo || '' // Optional
    };

    const ride = await Ride.createRideOffer(rideData);
    res.status(201).json(ride);
  } catch (error) {
    console.error('Create ride offer controller error:', error);
    res.status(500).json({ error: 'Failed to create ride offer' });
  }
};

/**
 * Get rides offered by a user
 */
const getRidesByDriver = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const rides = await Ride.getRidesByDriver(userId);
    res.status(200).json(rides);
  } catch (error) {
    console.error('Get rides by driver controller error:', error);
    res.status(500).json({ error: 'Failed to get rides' });
  }
};

/**
 * Get available rides with optional filters
 */
const getAvailableRides = async (req, res) => {
  try {
    const filters = req.query;
    const rides = await Ride.getAvailableRides(filters);
    res.status(200).json(rides);
  } catch (error) {
    console.error('Get available rides controller error:', error);
    res.status(500).json({ error: 'Failed to get available rides' });
  }
};

/**
 * Get a ride by ID
 */
const getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID is required' });
    }

    const ride = await Ride.getRideById(rideId);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.status(200).json(ride);
  } catch (error) {
    console.error('Get ride by ID controller error:', error);
    res.status(500).json({ error: 'Failed to get ride' });
  }
};

/**
 * Update a ride
 */
const updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updateData = req.body;

    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID is required' });
    }

    // Get current ride to verify ownership
    const currentRide = await Ride.getRideById(rideId);

    if (!currentRide) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Ensure the requester is the ride owner
    if (currentRide.driverId !== req.body.requesterId) {
      return res.status(403).json({ error: 'Unauthorized to update this ride' });
    }

    const updatedRide = await Ride.updateRide(rideId, updateData);
    res.status(200).json(updatedRide);
  } catch (error) {
    console.error('Update ride controller error:', error);
    res.status(500).json({ error: 'Failed to update ride' });
  }
};

/**
 * Add a passenger request to a ride
 */
const addPassengerRequest = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { userId, seats, name } = req.body;

    if (!rideId || !userId || !seats) {
      return res.status(400).json({ error: 'Ride ID, user ID, and seats are required' });
    }

    // Generate a unique request ID
    const requestId = uuidv4();

    const requestData = {
      id: requestId,
      userId,
      name: name || 'Anonymous',
      seats: Number(seats),
    };

    const updatedRide = await Ride.addPassengerRequest(rideId, requestData);
    res.status(200).json(updatedRide);
  } catch (error) {
    console.error('Add passenger request controller error:', error);

    if (error.message === 'Ride not found') {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (error.message === 'Not enough available seats') {
      return res.status(400).json({ error: 'Not enough available seats' });
    }

    res.status(500).json({ error: 'Failed to add passenger request' });
  }
};

/**
 * Respond to a passenger request
 */
const respondToPassengerRequest = async (req, res) => {
  try {
    const { rideId, requestId } = req.params;
    const { accept, requesterId } = req.body;

    if (!rideId || !requestId || accept === undefined) {
      return res.status(400).json({ error: 'Ride ID, request ID, and accept flag are required' });
    }

    // Get current ride to verify ownership
    const currentRide = await Ride.getRideById(rideId);

    if (!currentRide) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Ensure the requester is the ride owner
    if (currentRide.driverId !== requesterId) {
      return res.status(403).json({ error: 'Unauthorized to update this ride' });
    }

    const updatedRide = await Ride.respondToPassengerRequest(rideId, requestId, accept);
    res.status(200).json(updatedRide);
  } catch (error) {
    console.error('Respond to passenger request controller error:', error);

    if (error.message === 'Ride not found') {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (error.message === 'Request not found') {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.status(500).json({ error: 'Failed to respond to passenger request' });
  }
};

/**
 * Cancel a ride
 */
const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { requesterId } = req.body;

    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID is required' });
    }

    // Get current ride to verify ownership
    const currentRide = await Ride.getRideById(rideId);

    if (!currentRide) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Ensure the requester is the ride owner
    if (currentRide.driverId !== requesterId) {
      return res.status(403).json({ error: 'Unauthorized to cancel this ride' });
    }

    const updatedRide = await Ride.cancelRide(rideId);
    res.status(200).json(updatedRide);
  } catch (error) {
    console.error('Cancel ride controller error:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
};

module.exports = {
  createRideOffer,
  getRidesByDriver,
  getAvailableRides,
  getRideById,
  updateRide,
  addPassengerRequest,
  respondToPassengerRequest,
  cancelRide
};