// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {getMessaging, getToken, onMessage, isSupported} from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmWUfH6N3QhmvuHlqdCKweYtcf_BuXTmA",
  authDomain: "wearcycle-14d31.firebaseapp.com",
  projectId: "wearcycle-14d31",
  storageBucket: "wearcycle-14d31.firebasestorage.app",
  messagingSenderId: "659739359988",
  appId: "1:659739359988:web:155d0571244afd2d193ca1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
//export const messaging = getMessaging(app);

// // Initialize messaging with support check
// export const initializeMessaging = async () => {
//   const supported = await isSupported();
//   if (supported) {
//     return getMessaging(app);
//   }
//   console.warn('Firebase Messaging is not supported in this browser');
//   return null;
// };

// export default app;
