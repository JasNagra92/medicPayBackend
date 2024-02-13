// Import the functions you need from the SDKs you need
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";

let serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};
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
