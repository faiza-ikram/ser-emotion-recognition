import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAHogIWkRKZv27XySgnjJ9p-juoNNqpoz4",
    authDomain: "ser-emotion-app.firebaseapp.com",
    projectId: "ser-emotion-app",
    storageBucket: "ser-emotion-app.firebasestorage.app",
    messagingSenderId: "672892503645",
    appId: "1:672892503645:web:bf2d96d129eb8fb4f6efb4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
