import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';
import { initializeAuth, getAuth, type Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// getReactNativePersistence only exists in the React Native build of
// firebase/auth, which Metro resolves at runtime via the "react-native" export
// condition. The published typings describe the browser build, so it has to be
// read dynamically. If it's ever missing we fall back to the default auth
// instance rather than crashing on startup.
const getRNPersistence = (firebaseAuth as any).getReactNativePersistence as
  | ((storage: unknown) => Persistence)
  | undefined;
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

// Config loaded from the .env file via react-native-dotenv — keys stay out of git
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Keep the user signed in between app launches. Without an explicit persistence
// layer the RN SDK only keeps auth in memory, so every cold start logs you out.
// initializeAuth throws if it's already been called (e.g. after a Fast Refresh),
// so fall back to the existing instance in that case.
let _auth;
try {
  _auth = getRNPersistence
    ? initializeAuth(app, {persistence: getRNPersistence(AsyncStorage)})
    : getAuth(app);
} catch (e) {
  _auth = getAuth(app);
}
export const auth = _auth;
