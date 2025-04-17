const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ride.controller');

// Create a new ride offer
router.post('/offer', rideController.createRideOffer);

// Get rides
router.get('/driver/:userId', rideController.getRidesByDriver);
router.get('/available', rideController.getAvailableRides);
router.get('/:rideId', rideController.getRideById);

// Update a ride
router.put('/:rideId', rideController.updateRide);

// Cancel a ride
router.patch('/:rideId/cancel', rideController.cancelRide);

// Passenger requests
router.post('/:rideId/request', rideController.addPassengerRequest);
router.patch('/:rideId/request/:requestId/respond', rideController.respondToPassengerRequest);

module.exports = router;
