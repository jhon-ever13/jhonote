import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyBtVjzKnZg3LtnSFGxg1KojALKjAArZQ3w",
    authDomain: "mi-app-notas.firebaseapp.com",
    projectId: "mi-app-notas",
    storageBucket: "mi-app-notas.firebasestorage.app",
    messagingSenderId: "847429252528",
    appId: "1:847429252528:web:6b7b961f0a8965d5d6d275",
    measurementId: "G-QNXPP3ZMN9"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
