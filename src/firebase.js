import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBsuAhbhI8J18aD-tcsNNRy-qtzKJoILWY",
  authDomain: "jdmdb-498da.firebaseapp.com",
  projectId: "jdmdb-498da",
  storageBucket: "jdmdb-498da.firebasestorage.app",
  messagingSenderId: "761610515872",
  appId: "1:761610515872:web:34c9642013a73279a93fe5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
