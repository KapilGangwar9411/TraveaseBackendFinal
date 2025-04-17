const { db } = require('../config/firebase');

class Ride {
  /**
   * Create a new ride offering
   * @param {Object} rideData - The ride data
   * @returns {Object} Created ride
   */
  static async createRideOffer(rideData) {
    try {
      const ridesRef = db.collection('rides');

      // Add timestamps
      const ride = {
        ...rideData,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        passengers: [],
        passengerRequests: []
      };

      const docRef = await ridesRef.add(ride);
      return { id: docRef.id, ...ride };
    } catch (error) {
      console.error('Error creating ride offer:', error);
      throw error;
    }
  }

  /**
   * Get rides offered by a user
   * @param {string} userId - The user ID
   * @returns {Array} Array of rides
   */
  static async getRidesByDriver(userId) {
    try {
      console.log(`Fetching rides for driver with ID: ${userId}`);

      // Validate userId
      if (!userId) {
        console.error('Invalid user ID provided');
        return [];
      }

      const ridesRef = db.collection('rides');

      // Basic query without sorting to test if it works
      console.log('Executing Firestore query...');
      let query = ridesRef.where('driverId', '==', userId);

      try {
        const snapshot = await query.get();
        console.log(`Query returned ${snapshot.size} results`);

        if (snapshot.empty) {
          console.log(`No rides found for driver ${userId}`);
          return [];
        }

        const rides = snapshot.docs.map(doc => {
          const data = doc.data();
          // Format any Firestore timestamps to Date objects
          const formattedData = { ...data };
          if (data.departureTime && typeof data.departureTime.toDate === 'function') {
            formattedData.departureTime = data.departureTime.toDate();
          }
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            formattedData.createdAt = data.createdAt.toDate();
          }
          if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
            formattedData.updatedAt = data.updatedAt.toDate();
          }

          return {
            id: doc.id,
            ...formattedData
          };
        });

        console.log(`Successfully formatted ${rides.length} rides`);
        return rides;
      } catch (queryError) {
        console.error('Error executing Firestore query:', queryError);
        throw new Error(`Firestore query error: ${queryError.message}`);
      }
    } catch (error) {
      console.error('Error getting rides by driver:', error);
      // Return empty array instead of throwing to avoid 500 errors
      return [];
    }
  }

  /**
   * Get available ride offerings (for riders to find)
   * @param {Object} filters - Filters like sourceLocation, destinationLocation, etc.
   * @returns {Array} Array of available rides
   */
  static async getAvailableRides(filters = {}) {
    try {
      let query = db.collection('rides')
        .where('status', '==', 'active');

      // Apply departure time filter if provided
      if (filters.departureDate) {
        const startOfDay = new Date(filters.departureDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(filters.departureDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .where('departureTime', '>=', startOfDay)
          .where('departureTime', '<=', endOfDay);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        return [];
      }

      let rides = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Additional filtering that can't be done in Firestore query
      if (filters.sourceLocation) {
        rides = rides.filter(ride =>
          ride.sourceLocation.toLowerCase().includes(filters.sourceLocation.toLowerCase()));
      }

      if (filters.destinationLocation) {
        rides = rides.filter(ride =>
          ride.destinationLocation.toLowerCase().includes(filters.destinationLocation.toLowerCase()));
      }

      if (filters.availableSeats) {
        rides = rides.filter(ride =>
          ride.availableSeats >= filters.availableSeats);
      }

      return rides;
    } catch (error) {
      console.error('Error getting available rides:', error);
      throw error;
    }
  }

  /**
   * Get a ride by ID
   * @param {string} rideId - The ride ID
   * @returns {Object} The ride
   */
  static async getRideById(rideId) {
    try {
      const rideRef = db.collection('rides').doc(rideId);
      const doc = await rideRef.get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting ride by ID:', error);
      throw error;
    }
  }

  /**
   * Update a ride
   * @param {string} rideId - The ride ID
   * @param {Object} updateData - The data to update
   * @returns {Object} Updated ride
   */
  static async updateRide(rideId, updateData) {
    try {
      const rideRef = db.collection('rides').doc(rideId);

      // Don't allow updating critical fields
      delete updateData.driverId;
      delete updateData.createdAt;
      delete updateData.passengers;
      delete updateData.passengerRequests;

      await rideRef.update({
        ...updateData,
        updatedAt: new Date()
      });

      // Get the updated document
      const updatedDoc = await rideRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error('Error updating ride:', error);
      throw error;
    }
  }

  /**
   * Add a passenger request to a ride
   * @param {string} rideId - The ride ID
   * @param {Object} requestData - The passenger request data
   * @returns {Object} Updated ride
   */
  static async addPassengerRequest(rideId, requestData) {
    try {
      const rideRef = db.collection('rides').doc(rideId);
      const doc = await rideRef.get();

      if (!doc.exists) {
        throw new Error('Ride not found');
      }

      const ride = doc.data();

      // Check if there are available seats
      if (ride.availableSeats < requestData.seats) {
        throw new Error('Not enough available seats');
      }

      // Add request
      const request = {
        ...requestData,
        status: 'pending',
        createdAt: new Date()
      };

      await rideRef.update({
        passengerRequests: [...(ride.passengerRequests || []), request],
        updatedAt: new Date()
      });

      // Get the updated document
      const updatedDoc = await rideRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error('Error adding passenger request:', error);
      throw error;
    }
  }

  /**
   * Accept or reject a passenger request
   * @param {string} rideId - The ride ID
   * @param {string} requestId - The request ID
   * @param {boolean} accept - Whether to accept or reject
   * @returns {Object} Updated ride
   */
  static async respondToPassengerRequest(rideId, requestId, accept) {
    try {
      const rideRef = db.collection('rides').doc(rideId);
      const doc = await rideRef.get();

      if (!doc.exists) {
        throw new Error('Ride not found');
      }

      const ride = doc.data();
      const requestIndex = ride.passengerRequests.findIndex(req => req.id === requestId);

      if (requestIndex === -1) {
        throw new Error('Request not found');
      }

      // Update the request status
      const updatedRequests = [...ride.passengerRequests];
      updatedRequests[requestIndex].status = accept ? 'accepted' : 'rejected';
      updatedRequests[requestIndex].updatedAt = new Date();

      let updatedRide = {
        passengerRequests: updatedRequests,
        updatedAt: new Date()
      };

      // If accepted, add to passengers and update available seats
      if (accept) {
        const request = ride.passengerRequests[requestIndex];
        const newPassenger = {
          userId: request.userId,
          name: request.name,
          seats: request.seats,
          joinedAt: new Date()
        };

        updatedRide.passengers = [...(ride.passengers || []), newPassenger];
        updatedRide.availableSeats = ride.availableSeats - request.seats;

        // Mark as full if no more seats available
        if (updatedRide.availableSeats <= 0) {
          updatedRide.status = 'full';
        }
      }

      await rideRef.update(updatedRide);

      // Get the updated document
      const updatedDoc = await rideRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error('Error responding to passenger request:', error);
      throw error;
    }
  }

  /**
   * Cancel a ride
   * @param {string} rideId - The ride ID
   * @returns {Object} Updated ride
   */
  static async cancelRide(rideId) {
    try {
      const rideRef = db.collection('rides').doc(rideId);

      await rideRef.update({
        status: 'cancelled',
        updatedAt: new Date()
      });

      // Get the updated document
      const updatedDoc = await rideRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error('Error cancelling ride:', error);
      throw error;
    }
  }
}

module.exports = Ride;
