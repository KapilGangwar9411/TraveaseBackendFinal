const admin = require('firebase-admin');

// Check for required environment variables
const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`⚠️ Firebase initialization: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Firebase will be initialized with demo mode enabled');
}

try {
  // Initialize Firebase Admin with either real credentials or demo mode
  let db;

  if (missingVars.length === 0) {
    // Use actual Firebase credentials
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };

    console.log(`Initializing Firebase with project: ${serviceAccount.projectId}`);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    // Get Firestore instance
    db = admin.firestore();

    // Enable offline persistence (optional)
    db.settings({
      cacheSizeBytes: admin.firestore.CACHE_SIZE_UNLIMITED
    });

    console.log('✅ Firebase initialized successfully with real credentials');
  } else {
    // Demo mode - Provide in-memory implementation for development/testing
    console.log('🔄 Using in-memory Firebase implementation');

    // Mock DB implementation
    db = {
      collection: (name) => ({
        where: () => ({
          orderBy: () => ({
            get: async () => ({ empty: true, docs: [], size: 0 })
          }),
          limit: () => ({
            get: async () => ({ empty: true, docs: [], size: 0 })
          }),
          get: async () => ({ empty: true, docs: [], size: 0 })
        }),
        doc: () => ({
          get: async () => ({ exists: false, data: () => ({}) }),
          set: async () => ({}),
          update: async () => ({})
        }),
        add: async (data) => ({ id: `demo-${Date.now()}` })
      }),
      settings: () => {}
    };
  }

  // Export the db object
  module.exports = { admin, db };

} catch (error) {
  console.error('❌ Firebase initialization error:', error);

  // Provide a fallback in-memory implementation
  const db = {
    collection: (name) => ({
      where: () => ({
        get: async () => ({ empty: true, docs: [], size: 0 })
      }),
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => ({}),
        update: async () => ({})
      }),
      add: async (data) => ({ id: `error-${Date.now()}` })
    }),
    settings: () => {}
  };

  module.exports = { admin, db };
}
