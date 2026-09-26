import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBCPdzbOwwwOxVolUe8t9j5lQwcgf_6Fn8',
  authDomain: 'dermalink45.firebaseapp.com',
  projectId: 'dermalink45',
  storageBucket: 'dermalink45.firebasestorage.app',
  messagingSenderId: '949569025403',
  appId: '1:949569025403:web:6920cc6efd9f2b3d89f9de',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
db.settings({ experimentalForceLongPolling: true, merge: true });
export const storage = firebase.storage();
export default firebase;
