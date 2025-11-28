import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, where, doc, setDoc, serverTimestamp, deleteDoc, getDocs, writeBatch, limit } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { updateNavUser } from "./nav.js";
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
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-book-app';

// Global variables to manage state
const playground = document.getElementById('avatar-playground');
const activeGhosts = new Map(); 
let unsubscribeSnapshot = null;
let currentUser = null;

// --- MUSIC CONFIGURATION ---
const MUSIC_FOLDER = 'Music/';
const PLAYLIST = [
    "Purple lofi",
    "In Dreamland",
    "Loading cute"
];
let currentTrackIndex = 0;
let audioObj = new Audio();
let isPlaying = false;

// --- 1. AUTHENTICATION INIT ---
const initAuth = async () => {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } 
    } catch (error) {
        console.error("Auth Init Error:", error);
    }
};

// Start Auth Flow
initAuth();

// --- 2. MAIN LOGIC LOOP ---
onAuthStateChanged(auth, (user) => {
    updateNavUser(user);
    currentUser = user;

    if (user) {
        if (!unsubscribeSnapshot) {
            startLibraryListener();
        }
        // Initialize Music Player once we are logged in/ready
        if (!document.getElementById('music-player-widget')) {
            initMusicPlayer();
        }
    } else {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }
        activeGhosts.forEach(el => el.remove());
        activeGhosts.clear();
    }
});


function startLibraryListener() {
    console.log("Authenticated. Starting library listener...");
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'active_readers'));
    
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const now = Date.now();
        const activeIds = new Set();
        
        if (snapshot.empty) {
            console.log("No active readers found.");
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            let lastSeenTime = now;
            if (data.lastSeen && typeof data.lastSeen.toMillis === 'function') {
                lastSeenTime = data.lastSeen.toMillis();
            } else if (data.lastSeen === null) {
                lastSeenTime = now; 
            }

            if (now - lastSeenTime > 5 * 60 * 1000) return;

            activeIds.add(data.userId);

            if (activeGhosts.has(data.userId)) {
                updateGhost(data.userId, data);
            } else {
                createGhost(data);
            }
        });

        for (const [userId, element] of activeGhosts) {
            if (!activeIds.has(userId)) {
                removeGhost(userId);
            }
        }
    }, (error) => {
        console.error("Library Listener Error:", error);
    });

    // --- DEBUG CONTROLS ---
    const oldBtn = document.getElementById('debug-sim-btn');
    if (oldBtn) oldBtn.remove();

    if (!document.getElementById('debug-controls')) {
        const container = document.createElement('div');
        container.id = 'debug-controls';
        container.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 1000;
            display: flex; gap: 10px;
        `;

        const clearBtn = document.createElement('button');
        clearBtn.innerText = "Clear Bots";
        clearBtn.style.cssText = `
            padding: 8px 16px; background: #333; color: white;
            border: 1px solid #555; border-radius: 20px; cursor: pointer;
            font-size: 0.9rem;
        `;
        clearBtn.onclick = removeDummyReaders;

        const addBtn = document.createElement('button');
        addBtn.innerText = "+ 5 Bots";
        addBtn.style.cssText = `
            padding: 8px 16px; background: #E50914; color: white;
            border: none; border-radius: 20px; cursor: pointer;
            box-shadow: 0 4px 12px rgba(229, 9, 20, 0.3); font-weight: bold;
        `;
        addBtn.onclick = addDummyReaders;

        container.appendChild(clearBtn);
        container.appendChild(addBtn);
        document.body.appendChild(container);
    }
}

// --- MUSIC PLAYER LOGIC ---
function initMusicPlayer() {
    
    // 1. Create Widget DOM
    const widget = document.createElement('div');
    widget.id = 'music-player-widget';
    widget.className = 'music-player-widget';

    // NEW SYMMETRICAL SVG (Red & Black Sound Wave Icon)
    const discSVG = `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
        <!-- Red Background Circle -->
        <circle cx="50" cy="50" r="50" fill="#E50914" />
        
        <!-- Black Inner Circle -->
        <circle cx="50" cy="50" r="32" fill="#111" />
        
        <!-- Center White Dot -->
        <circle cx="50" cy="50" r="6" fill="white" />
        
        <!-- Symmetrical Sound Waves (Arcs) -->
        <g fill="none" stroke="white" stroke-width="4" stroke-linecap="round">
            <path d="M 62 38 A 17 17 0 0 1 62 62" />
            <path d="M 70 30 A 28 28 0 0 1 70 70" />
            <path d="M 38 62 A 17 17 0 0 1 38 38" />
            <path d="M 30 70 A 28 28 0 0 1 30 30" />
        </g>
    </svg>`;

    // --- Header Section ---
    const header = document.createElement('div');
    header.className = 'music-header';

    const disc = document.createElement('div');
    disc.className = 'music-disc';
    disc.innerHTML = discSVG;

    const infoControls = document.createElement('div');
    infoControls.className = 'music-info-controls';

    const songName = document.createElement('div');
    songName.className = 'music-song-name';
    songName.innerText = PLAYLIST[0];

    const controls = document.createElement('div');
    controls.className = 'music-controls';
    
    // Play/Pause
    const playBtn = document.createElement('button');
    playBtn.className = 'music-btn';
    playBtn.innerHTML = `<i data-feather="play"></i>`;
    
    // Next
    const nextBtn = document.createElement('button');
    nextBtn.className = 'music-btn';
    nextBtn.innerHTML = `<i data-feather="skip-forward"></i>`;

    controls.appendChild(playBtn);
    controls.appendChild(nextBtn);
    
    infoControls.appendChild(songName);
    infoControls.appendChild(controls);

    header.appendChild(disc);
    header.appendChild(infoControls);

    // --- Playlist Section ---
    const playlistContainer = document.createElement('div');
    playlistContainer.className = 'music-playlist';

    // Generate Playlist Items
    PLAYLIST.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        if (index === 0) item.classList.add('active');
        item.innerText = track;
        item.onclick = () => {
            currentTrackIndex = index;
            playTrack();
        };
        playlistContainer.appendChild(item);
    });

    widget.appendChild(header);
    widget.appendChild(playlistContainer);
    document.body.appendChild(widget);

    if (typeof feather !== 'undefined') feather.replace();

    // 2. Logic
    audioObj.volume = 0.3; 
    
    const updateUI = () => {
        songName.innerText = PLAYLIST[currentTrackIndex];
        
        if (isPlaying) {
            playBtn.innerHTML = `<i data-feather="pause"></i>`;
            widget.classList.add('playing');
        } else {
            playBtn.innerHTML = `<i data-feather="play"></i>`;
            widget.classList.remove('playing');
        }
        
        const items = playlistContainer.querySelectorAll('.playlist-item');
        items.forEach((item, idx) => {
            if (idx === currentTrackIndex) item.classList.add('active');
            else item.classList.remove('active');
        });

        if (typeof feather !== 'undefined') feather.replace();
    };

    const playTrack = async () => {
        const fileName = PLAYLIST[currentTrackIndex];
        audioObj.src = `${MUSIC_FOLDER}${fileName}.mp3`;
        
        try {
            await audioObj.play();
            isPlaying = true;
        } catch (err) {
            console.warn("Autoplay blocked", err);
            isPlaying = false;
        }
        updateUI();
    };

    disc.onclick = () => {
        if (!audioObj.src) { playTrack(); return; }
        if (isPlaying) { audioObj.pause(); isPlaying = false; }
        else { audioObj.play(); isPlaying = true; }
        updateUI();
    };

    playBtn.onclick = (e) => {
        e.stopPropagation();
        if (isPlaying) { audioObj.pause(); isPlaying = false; }
        else {
            if (!audioObj.src) { playTrack(); return; }
            audioObj.play(); isPlaying = true;
        }
        updateUI();
    };

    nextBtn.onclick = (e) => {
        e.stopPropagation();
        currentTrackIndex = (currentTrackIndex + 1) % PLAYLIST.length;
        playTrack();
    };

    audioObj.onended = () => {
        currentTrackIndex = (currentTrackIndex + 1) % PLAYLIST.length;
        playTrack();
    };

    playTrack();
}

// --- DUMMY DATA GENERATOR ---
async function addDummyReaders() {
    if (!currentUser) {
        alert("Waiting for connection...");
        return;
    }

    const names = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "Gandalf", "Hermione"];
    const books = ["The Great Gatsby", "Dune", "1984", "The Hobbit", "Project Hail Mary", "Neuromancer"];
    const colors = ['blue', 'purple', 'green', 'pink', 'orange'];
    const moods = ['happy', 'curious', 'nerdy', 'sleepy'];
    const accessories = ['none', 'hat', 'sparkles'];

    for(let i=0; i<5; i++) {
        const uid = `dummy_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        const name = names[Math.floor(Math.random() * names.length)];
        const book = books[Math.floor(Math.random() * books.length)];
        
        const dummyData = {
            userId: uid,
            displayName: `${name} (Bot)`,
            bookTitle: book,
            avatarConfig: {
                color: colors[Math.floor(Math.random() * colors.length)],
                mood: moods[Math.floor(Math.random() * moods.length)],
                accessory: accessories[Math.floor(Math.random() * accessories.length)]
            },
            lastSeen: serverTimestamp(),
            page: Math.floor(Math.random() * 200)
        };

        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_readers', uid), dummyData);
            console.log(`Added dummy: ${name}`);
        } catch (e) {
            console.error("Error adding dummy:", e);
        }
    }
}

// --- REMOVE DUMMY READERS ---
async function removeDummyReaders() {
    if (!currentUser) return;
    
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'active_readers'));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let count = 0;
    
    snapshot.forEach((docSnap) => {
        if (docSnap.id.startsWith('dummy_')) {
            batch.delete(docSnap.ref);
            count++;
        }
    });

    if (count > 0) {
        try {
            await batch.commit();
            console.log(`Removed ${count} bots.`);
        } catch (e) {
            console.error("Error clearing bots:", e);
            alert("Failed to clear bots.");
        }
    } else {
        alert("No bots found to clear.");
    }
}

function createGhost(data) {
    const el = document.createElement('div');
    el.className = 'floating-avatar';
    
    const startX = 10 + Math.random() * 80;
    const startY = 10 + Math.random() * 70;
    el.style.left = startX + '%';
    el.style.top = startY + '%';

    const img = document.createElement('img');
    try {
        img.src = generateGhostAvatar(data.avatarConfig);
    } catch (e) {
        console.warn("Avatar gen failed, using fallback", e);
        img.src = 'https://placehold.co/100x100?text=?';
    }
    el.appendChild(img);

    const tooltip = document.createElement('div');
    tooltip.className = 'avatar-tooltip';
    tooltip.innerHTML = `
        <strong>${data.displayName}</strong>
        Reading: <br>
        <em>${data.bookTitle || 'A Mystery Book'}</em>
        <div style="font-size:0.75rem; color:#aaa; margin-top:2px;">(Click to Join)</div>
    `;
    el.appendChild(tooltip);

    // --- CLICK HANDLER TO JOIN BOOK ---
    el.addEventListener('click', async (e) => {
        e.stopPropagation(); // Stop moving for a sec or just handle click
        
        // Don't do anything if no book title
        if (!data.bookTitle) return;

        try {
            // Find the book in the Public Library
            const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
            // Query by exact title
            const q = query(booksRef, where('title', '==', data.bookTitle), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const bookDoc = querySnapshot.docs[0];
                const bookData = bookDoc.data();
                
                // Add essential flags so reader.js knows it's a public book
                bookData.firestoreId = bookDoc.id; 
                bookData.isPublicView = true;

                // Save to localStorage so reader.html can pick it up
                localStorage.setItem('generatedBook', JSON.stringify(bookData));
                
                // Redirect
                window.location.href = 'reader.html';
            } else {
                // If the book doesn't exist (e.g. Dummy data or deleted book)
                alert(`"${data.bookTitle}" is currently not available in the public library.`);
            }
        } catch (error) {
            console.error("Error fetching book:", error);
            alert("Could not open book info.");
        }
    });

    if (playground) playground.appendChild(el);
    activeGhosts.set(data.userId, el);

    moveGhostRandomly(el);
}

function updateGhost(userId, data) {
    const el = activeGhosts.get(userId);
    if (!el) return;

    const tooltip = el.querySelector('.avatar-tooltip');
    if (tooltip) {
        tooltip.innerHTML = `
            <strong>${data.displayName}</strong>
            Reading: <br>
            <em>${data.bookTitle || 'A Mystery Book'}</em>
            <div style="font-size:0.75rem; color:#aaa; margin-top:2px;">(Click to Join)</div>
        `;
    }
}

function removeGhost(userId) {
    const el = activeGhosts.get(userId);
    if (el) {
        el.style.transition = 'opacity 0.5s';
        el.style.opacity = '0';
        setTimeout(() => {
            if(el.parentNode) el.parentNode.removeChild(el);
        }, 500);
        activeGhosts.delete(userId);
    }
}

function moveGhostRandomly(element) {
    if (!element.parentNode) return;

    const newX = 10 + Math.random() * 80; 
    const newY = 10 + Math.random() * 70; 

    // LAG FIX: Move much slower (15s to 25s per movement)
    const durationSec = 15 + Math.random() * 10; 

    element.style.transition = `left ${durationSec}s ease-in-out, top ${durationSec}s ease-in-out`;
    
    element.style.left = newX + '%';
    element.style.top = newY + '%';

    setTimeout(() => {
        moveGhostRandomly(element);
    }, durationSec * 1000);
}