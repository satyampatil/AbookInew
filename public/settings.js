import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
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
const db = getFirestore(app);

// Default Prefs
let prefs = {
    theme: 'light',
    font: 'lora',
    fontSize: 18,
    voiceURI: '', // Added voice preference
    ghostMode: false,
    soundEffects: true
};

document.addEventListener('DOMContentLoaded', () => {
    initThemePicker();
    setupRangeListener();
    initVoicePicker(); // Initialize voice dropdown
    setupCacheClear();
    setupResetButton(); 

    onAuthStateChanged(auth, async (user) => {
        updateNavUser(user);
        if (user) {
            await loadPreferences(user);
        } else {
            window.location.href = 'login.html';
        }
    });

    document.getElementById('save-prefs-btn').addEventListener('click', savePreferences);
});

// --- UI HELPERS ---

function initThemePicker() {
    const options = document.querySelectorAll('.theme-option');
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            prefs.theme = opt.dataset.theme;
        });
    });
}

function initVoicePicker() {
    const voiceSelect = document.getElementById('voice-select');
    const synthesis = window.speechSynthesis;

    const populateVoices = () => {
        // Filter generally for English or device defaults, remove empty
        let voices = synthesis.getVoices().filter(v => v.name);
        
        // Optional: Sort voices alphabetically
        voices.sort((a, b) => a.name.localeCompare(b.name));

        voiceSelect.innerHTML = '<option value="">Default Device Voice</option>';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            // Show Name and Language
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });

        // Set selected value if available in prefs
        if (prefs.voiceURI) {
            voiceSelect.value = prefs.voiceURI;
        }
    };

    // Chrome loads voices asynchronously
    populateVoices();
    if (synthesis.onvoiceschanged !== undefined) {
        synthesis.onvoiceschanged = populateVoices;
    }

    voiceSelect.addEventListener('change', (e) => {
        prefs.voiceURI = e.target.value;
    });
}

function setupRangeListener() {
    const range = document.getElementById('font-size-range');
    const display = document.getElementById('font-size-display');
    
    range.addEventListener('input', (e) => {
        const val = e.target.value;
        display.textContent = `${val}px`;
        prefs.fontSize = parseInt(val);
    });
}

function setupCacheClear() {
    document.getElementById('clear-cache-btn').addEventListener('click', () => {
        if(confirm("This will clear downloaded books and local history. Continue?")) {
            localStorage.clear();
            alert("Cache cleared. The page will reload.");
            window.location.reload();
        }
    });
}

function setupResetButton() {
    document.getElementById('reset-defaults-btn').addEventListener('click', () => {
        // 1. Update State
        prefs.theme = 'light';
        prefs.font = 'lora';
        prefs.fontSize = 18;
        prefs.voiceURI = '';

        // 2. Update UI
        // Theme
        document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
        const defaultTheme = document.querySelector('.theme-option[data-theme="light"]');
        if(defaultTheme) defaultTheme.classList.add('selected');

        // Font
        document.getElementById('font-select').value = 'lora';

        // Voice
        document.getElementById('voice-select').value = '';

        // Size
        const range = document.getElementById('font-size-range');
        range.value = 18;
        document.getElementById('font-size-display').textContent = '18px';
    });
}

// --- DATA LOGIC ---

async function loadPreferences(user) {
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().preferences) {
            prefs = { ...prefs, ...docSnap.data().preferences };
        }
    } catch (e) {
        console.log("No custom prefs found, using defaults.");
    }

    // Apply to UI
    // 1. Theme
    document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
    const activeTheme = document.querySelector(`.theme-option[data-theme="${prefs.theme}"]`);
    if(activeTheme) activeTheme.classList.add('selected');

    // 2. Font
    const fontSelect = document.getElementById('font-select');
    if (fontSelect.querySelector(`option[value="${prefs.font}"]`)) {
        fontSelect.value = prefs.font;
    } else {
        fontSelect.value = 'lora';
    }

    // 3. Size
    document.getElementById('font-size-range').value = prefs.fontSize;
    document.getElementById('font-size-display').textContent = `${prefs.fontSize}px`;
    
    // 4. Voice (Attempt to set if populated)
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect && prefs.voiceURI) {
        voiceSelect.value = prefs.voiceURI;
    }

    // 5. Toggles
    document.getElementById('ghost-mode-toggle').checked = prefs.ghostMode;
    document.getElementById('sfx-toggle').checked = prefs.soundEffects;

    // Update internal state from UI inputs
    document.getElementById('font-select').addEventListener('change', (e) => prefs.font = e.target.value);
    document.getElementById('ghost-mode-toggle').addEventListener('change', (e) => prefs.ghostMode = e.target.checked);
    document.getElementById('sfx-toggle').addEventListener('change', (e) => prefs.soundEffects = e.target.checked);
}

async function savePreferences() {
    const user = auth.currentUser;
    if (!user) return;

    const btn = document.getElementById('save-prefs-btn');
    const msg = document.getElementById('save-message');
    
    btn.disabled = true;
    btn.textContent = 'Saving...';
    msg.textContent = '';

    try {
        const userRef = doc(db, "users", user.uid);
        
        // Save to Firestore
        await setDoc(userRef, {
            preferences: prefs,
            updatedAt: new Date()
        }, { merge: true });

        // Save to LocalStorage for fast access by Reader
        localStorage.setItem('abooki_reader_prefs', JSON.stringify(prefs));

        msg.textContent = "Preferences saved!";
        msg.style.color = "#4CAF50"; // Green
        
        setTimeout(() => msg.textContent = '', 3000);

    } catch (error) {
        console.error(error);
        msg.textContent = "Error saving.";
        msg.style.color = "#E50914"; // Red
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Preferences';
    }
}