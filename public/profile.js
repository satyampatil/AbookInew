import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { generateGhostAvatar } from "./avatar-generator.js";
import { generateCursorGhost } from "./cursor-ghost-generator.js"; 
import { updateNavUser } from "./nav.js"; // --- IMPORT ---

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

// UI Elements
const nameEl = document.getElementById('profile-name');
const emailEl = document.getElementById('profile-email');
const picEl = document.getElementById('profile-pic');
const placeholderEl = document.getElementById('profile-placeholder');
const logoutBtn = document.getElementById('logout-btn');
const profileImgTrigger = document.getElementById('profile-img-trigger');

// Background Ghost Elements
const bgGhostContainer = document.getElementById('background-ghost-container');
const bgGhostImg = document.getElementById('background-ghost-img');

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

// --- UPDATE BACKGROUND GHOST ---
// Now accepts the config object instead of the raw SRC
function updateBackgroundGhost(config) {
    if (bgGhostImg && config) {
        // Generate the specific cursor-chasing version
        const ghostSrc = generateCursorGhost(config);
        bgGhostImg.src = ghostSrc;
        bgGhostContainer.style.display = 'block';
    }
}

// --- MOUSE FOLLOW LOGIC ---
document.addEventListener('mousemove', (e) => {
    if (bgGhostContainer && bgGhostContainer.style.display !== 'none') {
        // Position ghost to the LEFT of the cursor (-120px)
        const x = e.clientX - 120; 
        const y = e.clientY - 50;
        bgGhostContainer.style.transform = `translate(${x}px, ${y}px)`;
    }
});


// 1. Auth Check & Load Profile
onAuthStateChanged(auth, async (user) => {
    // --- NEW: UPDATE NAV ---
    updateNavUser(user);

    if (user) {
        currentUser = user;
        nameEl.innerText = user.displayName || "Ghost Reader";
        emailEl.innerText = user.email;

        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().avatarConfig) {
                const savedConfig = docSnap.data().avatarConfig;
                
                // Generate Standard Avatar for Card
                const cardAvatarSrc = generateGhostAvatar(savedConfig);
                picEl.src = cardAvatarSrc;
                picEl.style.display = 'block';
                placeholderEl.style.display = 'none';
                
                // Generate Cursor Ghost for Background
                updateBackgroundGhost(savedConfig);
                
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

function setupSelection(buttons, configKey) {
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset[Object.keys(btn.dataset)[0]];
            avatarConfig[configKey] = value;
            updateSelectionUI();
            updatePreview();
        });
    });
}

function updateSelectionUI() {
    colorBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.color === avatarConfig.color));
    moodBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mood === avatarConfig.mood));
    accBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.acc === avatarConfig.accessory));
}

setupSelection(colorBtns, 'color');
setupSelection(moodBtns, 'mood');
setupSelection(accBtns, 'accessory');

function openModal() {
    updatePreview(); 
    modal.classList.add('open');
}
function closeModal() {
    modal.classList.remove('open');
}

// 4. Save Logic
async function saveAvatar() {
    if (!currentUser) return;
    
    const btn = btnSaveAvatar;
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            avatarConfig: avatarConfig,
            email: currentUser.email,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Update Card Avatar
        const newCardAvatar = generateGhostAvatar(avatarConfig);
        picEl.src = newCardAvatar;
        picEl.style.display = 'block';
        placeholderEl.style.display = 'none';
        
        // Update Background Ghost
        updateBackgroundGhost(avatarConfig);
        
        closeModal();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Failed to save: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

if (profileImgTrigger) profileImgTrigger.addEventListener('click', openModal);
if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
if (btnSaveAvatar) btnSaveAvatar.addEventListener('click', saveAvatar);

window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

if (typeof feather !== 'undefined') feather.replace();