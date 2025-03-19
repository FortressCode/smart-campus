import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
// Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABNDrseHZo8Lgt-uwAfzMRZNwQefCHQwY",
  authDomain: "scms-8c96e.firebaseapp.com",
  projectId: "scms-8c96e",
  storageBucket: "scms-8c96e.firebasestorage.app",
  messagingSenderId: "469565027594",
  appId: "1:469565027594:web:96b3ac7f2a8b456e42f6f3",
  measurementId: "G-W15XKKVKKN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

export { auth, db, storage, realtimeDb };
export default app; 