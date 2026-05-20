
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0Z4lN_BSjELk_MedubANuOl__BiS9zwE",
  authDomain: "evosas-system-dct.firebaseapp.com",
  projectId: "evosas-system-dct",
  storageBucket: "evosas-system-dct.appspot.com",
  messagingSenderId: "1072577365174",
  appId: "1:1072577365174:web:21f34d3c20fcfeaedfd217"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);