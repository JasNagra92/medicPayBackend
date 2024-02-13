// Import the functions you need from the SDKs you need
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";

let serviceAccount = require("/Users/jasnagra/Downloads/google-credentials.json");
if (process.env.NODE_ENV === "dev") {
  serviceAccount = require("/Users/jasnagra/downloads/google-credentials.json");
}

// Initialize Firebase
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

if (process.env.FIREBASE_EMULATOR_HOST) {
  db.settings({
    host: "127.0.0.1:8080",
    ssl: false,
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export { db };
