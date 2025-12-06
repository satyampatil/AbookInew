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

    // --- 2. Interaction Logic (Toasts & Copy) ---
    
    // Create Toast Element dynamically
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(toast);

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // Handle Copy Buttons
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.dataset.copy;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast('Account details copied!');
                    // Visual feedback on button
                    const icon = btn.querySelector('i');
                    btn.style.color = '#4CAF50';
                    setTimeout(() => btn.style.color = '', 1000);
                    
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    // Fallback to older method if clipboard API fails
                    fallbackCopy(textToCopy);
                });
            } else {
                fallbackCopy(textToCopy);
            }
        });
    });

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Account details copied!'); // Show success message
        } catch (err) {
            showToast('Copy failed. Please copy manually.');
        }
        document.body.removeChild(textarea);
    }

    // --- 3. Apple Pay Integration Logic ---
    const applePayBtn = document.getElementById('apple-pay-btn');
    if (applePayBtn) {
        applePayBtn.addEventListener('click', () => {
            
            // Check if Apple Pay is available
            if (window.ApplePaySession) {
                // IMPORTANT: In a real app, you need a Merchant ID and a backend server to validate the session.
                // This code demonstrates the JS API structure.
                
                try {
                    const request = {
                        countryCode: 'US',
                        currencyCode: 'USD',
                        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
                        merchantCapabilities: ['supports3DS'],
                        total: { label: 'Abooki Donation', amount: '5.00' },
                    };

                    const session = new ApplePaySession(3, request);
                    
                    // 1. Validate Merchant (Requires Server)
                    session.onvalidatemerchant = event => {
                        console.log("Validating merchant...", event.validationURL);
                        // FETCH call to your backend would go here.
                        // Since we don't have a backend:
                        alert("Apple Pay Demo: Merchant validation requires a backend server.");
                        session.abort();
                    };

                    // 2. Payment Authorized
                    session.onpaymentauthorized = event => {
                        // Process payment token here
                        const payment = event.payment;
                        // Determine success/fail
                        session.completePayment(ApplePaySession.STATUS_SUCCESS);
                        showToast("Donation successful! (Demo)");
                    };

                    session.begin();

                } catch (e) {
                    alert("Unable to start Apple Pay session: " + e.message);
                }
            } else {
                // Fallback for non-Safari browsers
                alert("Apple Pay is available on Safari on supported devices (iPhone, iPad, Mac). Please try there!");
            }
        });
    }
});