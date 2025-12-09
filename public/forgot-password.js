import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// Your web app's Firebase configuration
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
    
    const emailForm = document.getElementById('form-send-email');
    const successMessage = document.getElementById('success-message');

    if (emailForm && successMessage) {
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('reset-email');
            const email = emailInput.value;
            const btn = emailForm.querySelector('button');
            const originalText = btn.innerText;

            btn.innerText = "Sending...";
            btn.disabled = true;

            sendPasswordResetEmail(auth, email)
                .then(() => {
                    // Success
                    emailForm.style.display = 'none';
                    successMessage.style.display = 'block';
                    // Re-render icons for the new checkmark
                    if (typeof feather !== 'undefined') feather.replace();
                })
                .catch((error) => {
                    console.error(error);
                    alert("Error: " + error.message);
                    btn.innerText = originalText;
                    btn.disabled = false;
                });
        });
    }
    
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
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