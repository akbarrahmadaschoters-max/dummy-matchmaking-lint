import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Ganti config ini dengan milik Firebase Console kamu, 
// dan enable Google di Authentication > Sign-in method.
const firebaseConfig = {
  apiKey: "AIzaSyB8O90VMe-e9RXL99UtFWDGavUWiYbnBHQ",
  authDomain: "lint-matchmaking-dashboard.firebaseapp.com",
  projectId: "lint-matchmaking-dashboard",
  storageBucket: "lint-matchmaking-dashboard.firebasestorage.app",
  messagingSenderId: "813705743660",
  appId: "1:813705743660:web:4651ec0966ef23519f3089",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, googleProvider, db };
