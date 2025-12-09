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

    // --- 2. Bank Modal Logic ---
    const bankTrigger = document.getElementById('bank-details-trigger');
    const bankModal = document.getElementById('bank-modal');
    const closeBankBtn = document.getElementById('close-bank-modal');
    const doneBankBtn = document.getElementById('done-bank-btn');

    function openBankModal() {
        if(bankModal) bankModal.classList.add('open');
    }

    function closeBankModal() {
        if(bankModal) bankModal.classList.remove('open');
    }

    if (bankTrigger) bankTrigger.addEventListener('click', openBankModal);
    if (closeBankBtn) closeBankBtn.addEventListener('click', closeBankModal);
    if (doneBankBtn) doneBankBtn.addEventListener('click', closeBankModal);

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === bankModal) closeBankModal();
    });

    // --- 3. Interaction Logic (Toasts & Copy) ---
    
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
});