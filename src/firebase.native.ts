import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  connectAuthEmulator,
  // Firebase exposes this API at runtime through Metro's React Native export.
  // @ts-expect-error Firebase's default web declaration omits the native persistence API.
  getReactNativePersistence,
} from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './firebase-config.json';
const app = initializeApp(config);
export const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getDatabase(app);
if (__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
}
