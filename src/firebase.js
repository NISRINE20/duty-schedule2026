import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAfIfVSPXNdEDIseObeNHSusLreMV9Yehw",
  authDomain: "duty-schedule-system-1c48b.firebaseapp.com",
  projectId: "duty-schedule-system-1c48b",
  storageBucket: "duty-schedule-system-1c48b.firebasestorage.app",
  messagingSenderId: "43903595064",
  appId: "1:43903595064:web:58ef2bb90dcedaa5b1accd",
  measurementId: "G-G15ESNSPNE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
