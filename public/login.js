// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2VtkohplpoihVUzlFncyxW6qi39r_IEU",
  authDomain: "studio-5978542726-e345b.firebaseapp.com",
  projectId: "studio-5978542726-e345b",
  storageBucket: "studio-5978542726-e345b.firebasestorage.app",
  messagingSenderId: "968782492427",
  appId: "1:968782492427:web:90108da3599e50bc2b680e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Get All Form Elements ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupButton = document.getElementById('show-signup');
    const showLoginButton = document.getElementById('show-login');

    // --- Get All Book Animation Elements ---
    const bookContainer = document.getElementById('book-anim-container');
    const allPages = document.querySelectorAll('.page');
    const writingPen = document.getElementById('writing-pen');
    
    // --- Get Form Inputs ---
    const loginInputs = [
        document.getElementById('login-email'),
        document.getElementById('login-password')
    ];
    const signupInputs = [
        document.getElementById('signup-name'),
        document.getElementById('signup-email'),
        document.getElementById('signup-password')
    ];
    const allInputs = [...loginInputs, ...signupInputs];

    // --- Helper Function: Flip a specific page ---
    function flipPage(pageIndex) {
        if (allPages[pageIndex]) {
            allPages[pageIndex].classList.add('page-flipped');
        }
        for (let i = 0; i < pageIndex; i++) {
            if (allPages[i]) allPages[i].classList.add('page-flipped');
        }
    }

    // --- Helper Function: Unflip all pages ---
    function unflipAllPages() {
        allPages.forEach(page => {
            page.classList.remove('page-flipped');
        });
    }

    // --- Pen Animation Helper Functions ---
    let writingTimeout = null;

    function showPen() {
        if (writingPen) writingPen.classList.add('visible');
    }

    function startWriting() {
        if (!writingPen) return;
        writingPen.classList.add('is-writing');
        if (writingTimeout) clearTimeout(writingTimeout);
        writingTimeout = setTimeout(stopWriting, 500);
    }

    function stopWriting(force = false) {
        if (writingTimeout || force) {
            clearTimeout(writingTimeout);
            writingTimeout = null;
            writingPen?.classList.remove('is-writing');
        }
    }

    // --- 1. Form Toggle Logic ---
    if (loginForm && signupForm && showSignupButton && showLoginButton) {
        showSignupButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            unflipAllPages();
            stopWriting(true);
        });

        showLoginButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
            unflipAllPages();
            stopWriting(true);
        });
    }

    // --- 2. Book Animation & Auth Logic ---
    if (bookContainer && loginForm && signupForm && allPages.length > 0) {
        
        // On Page Load: Pop up
        setTimeout(() => {
            bookContainer.classList.add('loaded');
        }, 100);

        // Flip listeners
        loginInputs[0]?.addEventListener('focus', () => { flipPage(0); showPen(); });
        loginInputs[1]?.addEventListener('focus', () => { flipPage(1); showPen(); });
        
        signupInputs[0]?.addEventListener('focus', () => { flipPage(0); showPen(); });
        signupInputs[1]?.addEventListener('focus', () => { flipPage(1); showPen(); });
        signupInputs[2]?.addEventListener('focus', () => { flipPage(2); showPen(); });

        // Writing listeners
        allInputs.forEach(input => {
            if (input) input.addEventListener('input', startWriting);
        });

        // --- Animation Trigger ---
        function playCloseAnimationAndRedirect() {
            // Stop pen
            stopWriting(true);
            // Add closing class
            bookContainer.classList.add('closing');
            
            // Wait for animation then redirect
            setTimeout(() => {
                window.location.href = 'index.html'; // Redirect to home page
            }, 1800); 
        }

        // --- FIREBASE LOGIN ---
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginInputs[0].value;
            const password = loginInputs[1].value;
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerText;

            // Basic Feedback
            btn.innerText = "Signing In...";
            btn.disabled = true;

            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    // Success
                    console.log("Logged in:", userCredential.user);
                    btn.innerText = "Success!";
                    playCloseAnimationAndRedirect();
                })
                .catch((error) => {
                    // Error
                    console.error(error.code, error.message);
                    alert("Login Failed: " + error.message);
                    btn.innerText = originalText;
                    btn.disabled = false;
                });
        });

        // --- FIREBASE SIGNUP ---
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = signupInputs[0].value;
            const email = signupInputs[1].value;
            const password = signupInputs[2].value;
            const btn = signupForm.querySelector('button');
            const originalText = btn.innerText;

            btn.innerText = "Creating Account...";
            btn.disabled = true;

            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    // Update Display Name
                    return updateProfile(user, { displayName: name });
                })
                .then(() => {
                    // Success
                    console.log("Account created");
                    btn.innerText = "Success!";
                    playCloseAnimationAndRedirect();
                })
                .catch((error) => {
                    console.error(error.code, error.message);
                    alert("Signup Failed: " + error.message);
                    btn.innerText = originalText;
                    btn.disabled = false;
                });
        });
    }

    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});