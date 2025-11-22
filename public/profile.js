import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { generateGhostAvatar } from "./avatar-generator.js";

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
const db = getFirestore(app); // Initialize Firestore

// UI Elements
const nameEl = document.getElementById('profile-name');
const emailEl = document.getElementById('profile-email');
const picEl = document.getElementById('profile-pic');
const placeholderEl = document.getElementById('profile-placeholder');
const logoutBtn = document.getElementById('logout-btn');
const profileImgTrigger = document.getElementById('profile-img-trigger');

// Modal Elements
const modal = document.getElementById('avatar-modal');
const previewImg = document.getElementById('generated-avatar-preview');
const btnSaveAvatar = document.getElementById('btn-save-avatar');
const btnCloseModal = document.getElementById('btn-close-modal');

// Customization Groups
const colorBtns = document.querySelectorAll('.color-btn');
const moodBtns = document.querySelectorAll('#mood-options .opt-btn');
const accBtns = document.querySelectorAll('#acc-options .opt-btn');

let currentUser = null;

// Default State
let avatarConfig = {
    color: 'blue',
    mood: 'happy',
    accessory: 'none'
};

// 1. Auth Check & Load Profile
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        nameEl.innerText = user.displayName || "Ghost Reader";
        emailEl.innerText = user.email;

        // --- NEW: Load Avatar Config from Firestore ---
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().avatarConfig) {
                // If config exists, load it and generate image locally
                const savedConfig = docSnap.data().avatarConfig;
                const svgData = generateGhostAvatar(savedConfig);
                
                // Update UI
                picEl.src = svgData;
                picEl.style.display = 'block';
                placeholderEl.style.display = 'none';
                
                // Update local state so modal opens with correct settings
                avatarConfig = savedConfig;
                updateSelectionUI();
            }
        } catch (error) {
            console.error("Error loading avatar:", error);
        }

    } else {
        window.location.href = 'login.html';
    }
});

// 2. Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = 'login.html');
    });
}

// 3. Avatar Generator Logic
function updatePreview() {
    const dataUrl = generateGhostAvatar(avatarConfig);
    previewImg.src = dataUrl;
}

// Helper to handle selection
function setupSelection(buttons, configKey) {
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update config
            const value = btn.dataset[Object.keys(btn.dataset)[0]];
            avatarConfig[configKey] = value;
            
            // Update Visuals
            updateSelectionUI();
            updatePreview();
        });
    });
}

// Update the active class on buttons based on current `avatarConfig`
function updateSelectionUI() {
    // Colors
    colorBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === avatarConfig.color);
    });
    // Moods
    moodBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === avatarConfig.mood);
    });
    // Accessories
    accBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.acc === avatarConfig.accessory);
    });
}

// Initialize Listeners
setupSelection(colorBtns, 'color');
setupSelection(moodBtns, 'mood');
setupSelection(accBtns, 'accessory');

// Modal Open/Close
function openModal() {
    updatePreview(); // Show current config
    modal.classList.add('open');
}
function closeModal() {
    modal.classList.remove('open');
}

// 4. Save Logic (Updated: Removed updateProfile call)
async function saveAvatar() {
    if (!currentUser) return;
    
    const btn = btnSaveAvatar;
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        // Save the CONFIG to Firestore
        // We ONLY save the text configuration (color, mood, etc.) which is very small.
        // We do NOT save the image itself.
        await setDoc(doc(db, "users", currentUser.uid), {
            avatarConfig: avatarConfig,
            email: currentUser.email,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Update the main profile picture immediately in the UI
        const newAvatarUrl = generateGhostAvatar(avatarConfig);
        picEl.src = newAvatarUrl;
        picEl.style.display = 'block';
        placeholderEl.style.display = 'none';
        
        closeModal();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Failed to save: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Event Bindings
if (profileImgTrigger) profileImgTrigger.addEventListener('click', openModal);
if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
if (btnSaveAvatar) btnSaveAvatar.addEventListener('click', saveAvatar);

window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

if (typeof feather !== 'undefined') feather.replace();