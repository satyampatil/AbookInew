import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { updateNavUser } from "./nav.js";

const firebaseConfig = {
    apiKey: "AIzaSyC2VtkohplpoihVUzlFncyxW6qi39r_IEU", 
    authDomain: "studio-5978542726-e345b.firebaseapp.com",
    projectId: "studio-5978542726-e345b",
    storageBucket: "studio-5978542726-e345b.firebasestorage.app",
    messagingSenderId: "968782492427",
    appId: "1:968782492427:web:90108da3599e50bc2b680e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Auth & Navigation Logic ---
    onAuthStateChanged(auth, (user) => {
        updateNavUser(user);
    });

});

// star rotation when scrolled
let lastScrollY = window.scrollY;
    let rotation = 0;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY;
        
        // Rotate 0.5 degrees per pixel scrolled
        // Clockwise (positive) when scrolling down (delta > 0)
        // Counter-clockwise (negative) when scrolling up (delta < 0)
        rotation += delta * 0.5;

        // Update the CSS variable on the document root
        document.documentElement.style.setProperty('--logo-star-rotate', `${rotation}deg`);
        
        lastScrollY = currentScrollY;
    });
