import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// COLAR AQUI A STRING DE CONEXÃO
const firebaseConfig = {
     apiKey: "AIzaSyDeMtm3bS7viV6hp5hFy57BQuEs2orfPD4",
  authDomain: "info-3e065.firebaseapp.com",
  projectId: "info-3e065",
  storageBucket: "info-3e065.firebasestorage.app",
  messagingSenderId: "364239967693",
  appId: "1:364239967693:web:f5af78bd909597c96aa084",
  measurementId: "G-48G4P1XYSF"
};
  
  
// INICIALIZAR O FIREBASE
let app;
if (firebase.apps.length == 0) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app();
}

const auth = firebase.auth();
const firestore = firebase.firestore();
const storage = firebase.storage();
export { auth, firestore, storage };
