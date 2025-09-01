// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMOTHc9U1whgepO8AAE0-xaK7xiNjqqVQ",
  authDomain: "osportalmanagmnet.firebaseapp.com",
  projectId: "osportalmanagmnet",
  storageBucket: "osportalmanagmnet.firebasestorage.app",
  messagingSenderId: "846394060555",
  appId: "1:846394060555:web:a4c6d3b64af58cd77f3c0e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;