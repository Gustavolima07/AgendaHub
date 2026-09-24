import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import config from './firebase-config.json';
const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getDatabase(app);
if (__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
}
