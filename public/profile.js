import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { generateGhostAvatar } from "./avatar-generator.js";
import { generateCursorGhost } from "./cursor-ghost-generator.js"; 
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

// --- GAMIFICATION CONFIG ---
const ALL_BADGES = [
    // Reading
    { id: 'reader_1', category: 'reading', name: 'First Chapter', icon: '📖', desc: 'Finish your first book', threshold: 1, stat: 'books_read' },
    { id: 'reader_5', category: 'reading', name: 'Bookworm', icon: '🐛', desc: 'Finish 5 books', threshold: 5, stat: 'books_read' },
    { id: 'reader_10', category: 'reading', name: 'Bibliophile', icon: '📚', desc: 'Finish 10 books', threshold: 10, stat: 'books_read' },
    
    // Publishing
    { id: 'author_1', category: 'writing', name: 'Debut Author', icon: '✍️', desc: 'Publish your first book', threshold: 1, stat: 'books_published' },
    { id: 'author_5', category: 'writing', name: 'Storyteller', icon: '🌟', desc: 'Publish 5 books', threshold: 5, stat: 'books_published' },
    { id: 'author_20', category: 'writing', name: 'Bestseller', icon: '🏆', desc: 'Publish 20 books', threshold: 20, stat: 'books_published' },

    // Streaks & Loyalty
    { id: 'streak_3', category: 'social', name: 'On Fire', icon: '🔥', desc: '3-day login streak', threshold: 3, stat: 'login_streak' },
    { id: 'veteran_30', category: 'social', name: 'Resident', icon: '🏠', desc: 'Log in on 30 different days', threshold: 30, stat: 'total_days_logged_in' }
];

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
let avatarConfig = { color: 'blue', mood: 'happy', accessory: 'none' };

// --- MAIN INIT ---
onAuthStateChanged(auth, async (user) => {
    updateNavUser(user);

    if (user) {
        currentUser = user;
        if(nameEl) nameEl.innerText = user.displayName || "Ghost Reader";
        if(emailEl) emailEl.innerText = user.email;

        // 1. Load Profile & Avatar
        await loadProfileData(user);

        // 2. Handle Daily Login Logic
        await handleLoginStreak(user);

        // 3. Load & Render Gamification Stats
        await loadGamification(user);

    } else {
        window.location.href = 'login.html';
    }
});

// --- PROFILE LOGIC ---
async function loadProfileData(user) {
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().avatarConfig) {
            const savedConfig = docSnap.data().avatarConfig;
            
            const cardAvatarSrc = generateGhostAvatar(savedConfig);
            if(picEl) {
                picEl.src = cardAvatarSrc;
                picEl.style.display = 'block';
            }
            if(placeholderEl) placeholderEl.style.display = 'none';
            
            updateBackgroundGhost(savedConfig);
            avatarConfig = savedConfig;
            updateSelectionUI();
        }
    } catch (error) {
        console.error("Error loading avatar:", error);
    }
}

// --- GAMIFICATION: LOGIN STREAK ---
async function handleLoginStreak(user) {
    const today = new Date().toDateString(); 
    const trackingRef = doc(db, "users", user.uid, "gamification", "login_tracking");
    const statsRef = doc(db, "users", user.uid, "gamification", "stats");

    try {
        const trackSnap = await getDoc(trackingRef);
        let lastLogin = null;
        let currentStreak = 0;

        if (trackSnap.exists()) {
            const data = trackSnap.data();
            lastLogin = data.lastLoginDate;
            currentStreak = data.currentStreak || 0;
        }

        if (lastLogin === today) {
            return; 
        }

        let newStreak = 1;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin === yesterday.toDateString()) {
            newStreak = currentStreak + 1;
        }

        await setDoc(trackingRef, {
            lastLoginDate: today,
            currentStreak: newStreak
        }, { merge: true });

        await setDoc(statsRef, {
            login_streak: newStreak,
            total_days_logged_in: increment(1)
        }, { merge: true });

    } catch (e) {
        console.error("Streak Error:", e);
    }
}

// --- GAMIFICATION: RENDER & SYNC ---
async function loadGamification(user) {
    const statsRef = doc(db, "users", user.uid, "gamification", "stats");
    const userRef = doc(db, "users", user.uid);

    const statReadEl = document.getElementById('stat-read');
    const statPubEl = document.getElementById('stat-published');
    const statStreakEl = document.getElementById('stat-streak');
    const badgesContainer = document.getElementById('badges-container');

    try {
        const [statsSnap, userSnap] = await Promise.all([getDoc(statsRef), getDoc(userRef)]);
        
        const stats = statsSnap.exists() ? statsSnap.data() : {};
        let userData = userSnap.exists() ? userSnap.data() : {};
        let unlockedBadges = userData.badges || []; 

        // --- NEW: SYNC LOGIC ---
        // Verify current stats against existing badges and update if mismatched
        const { updatedBadges, hasChanges } = reconcileBadges(stats, unlockedBadges);
        
        if (hasChanges) {
            console.log("Syncing badges due to stat changes...");
            await updateDoc(userRef, { badges: updatedBadges });
            unlockedBadges = updatedBadges;
        }

        // 1. Update Top Stats
        if(statReadEl) statReadEl.innerText = stats.books_read || 0;
        if(statPubEl) statPubEl.innerText = stats.books_published || 0;
        if(statStreakEl) statStreakEl.innerText = stats.login_streak || 0;

        // 2. Render Badges Grid
        if(badgesContainer) renderBadges(unlockedBadges, badgesContainer);

    } catch (e) {
        console.error("Error loading gamification:", e);
    }
}

// Helper: Compares stats vs badges and returns corrected array
function reconcileBadges(stats, currentBadges) {
    let hasChanges = false;
    // Map existing badges by ID for easy lookup
    const existingBadgeIds = new Set(currentBadges.map(b => b.id));
    let newBadges = [...currentBadges];

    ALL_BADGES.forEach(def => {
        const currentStatValue = stats[def.stat] || 0;
        const hasBadge = existingBadgeIds.has(def.id);

        if (currentStatValue >= def.threshold) {
            // Should have badge
            if (!hasBadge) {
                // UNLOCK: Add it
                newBadges.push({
                    id: def.id,
                    name: def.name,
                    icon: def.icon,
                    desc: def.desc,
                    dateEarned: new Date().toISOString()
                });
                hasChanges = true;
            }
        } else {
            // Should NOT have badge (Lock it)
            if (hasBadge) {
                // LOCK: Remove it
                newBadges = newBadges.filter(b => b.id !== def.id);
                hasChanges = true;
            }
        }
    });

    return { updatedBadges: newBadges, hasChanges };
}

function renderBadges(unlockedList, container) {
    container.innerHTML = '';
    
    // Create a Set of unlocked IDs for fast lookup
    const unlockedIds = new Set(unlockedList.map(b => b.id));

    ALL_BADGES.forEach(badge => {
        const isUnlocked = unlockedIds.has(badge.id);
        const card = document.createElement('div');
        card.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.title = isUnlocked ? `Unlocked: ${badge.desc}` : `Locked: ${badge.desc}`;
        
        card.innerHTML = `
            <div class="badge-icon-wrapper">
                <span class="badge-emoji">${badge.icon}</span>
                ${!isUnlocked ? '<i data-feather="lock" class="lock-overlay"></i>' : ''}
            </div>
            <div class="badge-details">
                <h4>${badge.name}</h4>
                <p>${badge.desc}</p>
            </div>
        `;
        container.appendChild(card);
    });

    if (typeof feather !== 'undefined') feather.replace();
}


// --- AVATAR & GHOST HELPERS ---
function updateBackgroundGhost(config) {
    if (bgGhostImg && config) {
        const ghostSrc = generateCursorGhost(config);
        bgGhostImg.src = ghostSrc;
        bgGhostContainer.style.display = 'block';
    }
}

document.addEventListener('mousemove', (e) => {
    if (bgGhostContainer && bgGhostContainer.style.display !== 'none') {
        const x = e.clientX - 120; 
        const y = e.clientY - 50;
        bgGhostContainer.style.transform = `translate(${x}px, ${y}px)`;
    }
});

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = 'login.html');
    });
}

// Avatar Logic
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

        const newCardAvatar = generateGhostAvatar(avatarConfig);
        if(picEl) {
            picEl.src = newCardAvatar;
            picEl.style.display = 'block';
        }
        if(placeholderEl) placeholderEl.style.display = 'none';
        
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