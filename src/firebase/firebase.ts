import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

  apiKey: "AIzaSyDSfUTuoQv1jR1ARwEIpVZCmuD4s_MuJIw",

  authDomain: "fifa-wc-predicton.firebaseapp.com",

  projectId: "fifa-wc-predicton",

  storageBucket: "fifa-wc-predicton.firebasestorage.app",

  messagingSenderId: "392934405181",

  appId: "1:392934405181:web:452f85d80f75e80b75a654"

};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
