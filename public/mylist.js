// --- MY LIST PAGE LOGIC (GENRE SORTED & INFORMATIVE & REAL-TIME & GAMIFICATION) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
// Added imports for Gamification (increment, arrayUnion, setDoc)
import { getFirestore, collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, where, serverTimestamp, getDoc, onSnapshot, increment, arrayUnion, setDoc } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-book-app';

let currentUser = null;
let currentPrivateBooks = [];
let currentCreatedBooks = [];
let activeGenreFilter = 'all'; 
let privateUnsubscribe = null; 

// --- GAMIFICATION CONFIG ---
const BADGES = {
    books_published: {
        1: { id: 'author_1', name: 'Debut Author', icon: '✍️', desc: 'Publish your first book' },
        5: { id: 'author_5', name: 'Storyteller', icon: '🌟', desc: 'Publish 5 books' },
        20: { id: 'author_20', name: 'Bestseller', icon: '🏆', desc: 'Publish 20 books' }
    }
};

function initializeMyList() {
    const container = document.getElementById('book-shelves-container');
    if (!container) return;

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateNavUser(user);

        if (!user) {
            if(privateUnsubscribe) privateUnsubscribe();
            container.innerHTML = `
                <div class="empty-list-message" style="text-align:center; padding: 2rem;">
                    <p>Please log in to view your cloud library.</p>
                    <a href="index.html" class="btn-primary" style="display:inline-block; margin-top:10px;">Go to Login</a>
                </div>`;
            return;
        }
        setupRealtimeListeners();
    });

    container.addEventListener('click', handleContainerClick);
    
    const filterContainer = document.getElementById('genre-filters');
    if(filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            if(e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                const genre = e.target.dataset.filter;
                applyGenreFilter(genre);
            }
        });
    }
}

function setupRealtimeListeners() {
    const container = document.getElementById('book-shelves-container');
    if (!currentUser) return;

    container.innerHTML = '<p class="loading-text">Loading your library...</p>';

    const privateRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'books');
    
    if (privateUnsubscribe) privateUnsubscribe(); 

    privateUnsubscribe = onSnapshot(privateRef, async (snapshot) => {
        const validPrivateBooks = [];
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const book = { ...data, firestoreId: docSnap.id, _source: 'private' };
            validPrivateBooks.push(book);
        }

        currentPrivateBooks = validPrivateBooks;
        await refreshPublicBooks(); 
        updateLibraryUI();
        
    }, (error) => {
        console.error("Error fetching private books:", error);
        container.innerHTML = `<p class="error-text">Error loading library: ${error.message}</p>`;
    });
}

async function refreshPublicBooks() {
    try {
        const publicRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
        const qPublic = query(publicRef, where('userId', '==', currentUser.uid));
        const publicSnap = await getDocs(qPublic);
        
        currentCreatedBooks = [];
        publicSnap.forEach((doc) => {
            currentCreatedBooks.push({ ...doc.data(), firestoreId: doc.id, _source: 'public' });
        });
    } catch (e) {
        console.error("Error loading created books", e);
    }
}

function updateLibraryUI() {
    const container = document.getElementById('book-shelves-container');
    
    const linkedPublicIds = new Set();
    currentPrivateBooks.forEach(b => {
        if (b.publicId) linkedPublicIds.add(b.publicId);
    });

    const uniquePublicBooks = currentCreatedBooks.filter(b => !linkedPublicIds.has(b.firestoreId));
    const uniqueBooksForStats = [...currentPrivateBooks, ...uniquePublicBooks];
    
    const totalCount = uniqueBooksForStats.length;
    
    const genres = new Set();
    uniqueBooksForStats.forEach(b => {
        if(b.genre) genres.add(b.genre);
    });

    const filterContainer = document.getElementById('genre-filters');
    if (filterContainer) {
        let filterHtml = `<button class="filter-btn active" data-filter="all">All</button>`;
        Array.from(genres).sort().forEach(g => {
            filterHtml += `<button class="filter-btn" data-filter="${g}">${g}</button>`;
        });
        filterContainer.innerHTML = filterHtml;
    }

    const statsContainer = document.getElementById('library-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <span class="stat-item">Books: <b>${totalCount}</b></span>
            <span class="stat-item">Genres: <b>${genres.size}</b></span>
        `;
    }

    renderDualShelves(container, currentPrivateBooks, currentCreatedBooks);
    
    if (activeGenreFilter !== 'all') {
        applyGenreFilter(activeGenreFilter);
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter === activeGenreFilter) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }
}

function applyGenreFilter(genre) {
    activeGenreFilter = genre;
    const cards = document.querySelectorAll('.book-card');
    cards.forEach(card => {
        const cardGenre = card.dataset.genre;
        if (genre === 'all' || cardGenre === genre) {
            card.style.display = 'flex'; 
        } else {
            card.style.display = 'none'; 
        }
    });
}

function renderDualShelves(container, privateBooks, createdBooks) {
    if (privateBooks.length === 0 && createdBooks.length === 0) {
        container.innerHTML = `<p class="empty-list-message">Your library is empty. Go generate some books!</p>`;
        return;
    }

    let html = '';

    if (privateBooks.length > 0) {
        html += `<div class="section-header"><h2 class="mylist-page-title" style="margin-bottom:0.5rem; font-size:1.8rem;">Saved Books (Private)</h2></div>`;
        html += renderBookGrid(privateBooks, true); 
    }

    if (createdBooks.length > 0) {
        html += `<div class="section-header" style="margin-top:3rem;"><h2 class="mylist-page-title" style="margin-bottom:0.5rem; font-size:1.8rem;">My Published Works</h2></div>`;
        html += renderBookGrid(createdBooks, false); 
    }

    container.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace(); 
}

function renderBookGrid(books, isPrivateSection) {
    if (!books || books.length === 0) return '<p style="padding:0 2rem; color:#666;">No books found.</p>';

    let html = '<div class="book-scroll-container">';
    
    const sortedBooks = [...books].sort((a, b) => {
        const ta = a.createdAt ? a.createdAt.seconds : 0;
        const tb = b.createdAt ? b.createdAt.seconds : 0;
        return tb - ta; 
    });

    sortedBooks.forEach(book => {
        const isPublic = !!book.publicId;
        const isMyWork = !book.originalUserId || (book.originalUserId === currentUser.uid);

        let ribbonClass = '';
        let ribbonTitle = '';

        if (!isMyWork) {
            ribbonClass = 'is-golden';
            ribbonTitle = 'Saved Community Book (Read Only)';
        } else if (!isPrivateSection || isPublic) {
            ribbonClass = 'is-public';
            ribbonTitle = 'Public (Click to Unpublish)';
        } else {
            ribbonClass = 'is-private';
            ribbonTitle = 'Private (Click to Publish)';
        }

        const safeGenre = book.genre || 'Unknown';
        const displayAuthor = book.authorName || 'Me';
        
        html += `
            <div class="book-card clickable" 
                 data-firestore-id="${book.firestoreId}" 
                 data-source="${book._source}"
                 data-genre="${safeGenre}">
                 
                <img src="${book.coverUrl}" alt="${book.title}" onerror="this.src='https://placehold.co/300x450/1a1a1a/f5f5f5?text=Image+Error&font=inter'">
                
                <div class="book-card-info">
                    <h3 class="book-card-title">${book.title}</h3>
                    
                    <div class="book-meta">
                        <span class="genre-badge">${safeGenre}</span>
                        <span class="author-name">${isMyWork ? 'By Me' : displayAuthor}</span>
                    </div>
                </div>
                
                ${isPrivateSection ? `
                <div class="bookmark-ribbon ${ribbonClass}" 
                     title="${ribbonTitle}"
                     data-firestore-id="${book.firestoreId}"
                     data-public-id="${book.publicId || ''}"
                     data-is-mine="${isMyWork}">
                </div>` : ''}

                <button class="list-delete-btn" 
                        title="Delete Book"
                        data-firestore-id="${book.firestoreId}"
                        data-source="${book._source}">
                    <i data-feather="x"></i>
                </button>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

// --- GAMIFICATION HELPERS ---
async function trackGamificationAction(actionType, changeAmount = 1) {
    if (!currentUser) return;

    try {
        const statsRef = doc(db, "users", currentUser.uid, "gamification", "stats");
        
        await setDoc(statsRef, {
            [actionType]: increment(changeAmount),
            lastUpdated: serverTimestamp()
        }, { merge: true });

        // Fetch new total
        const statsSnap = await getDoc(statsRef);
        const currentCount = statsSnap.data()[actionType] || 0;

        // Sync Badges (Lock/Unlock based on count)
        await syncBadges(actionType, currentCount);

    } catch (e) {
        console.error("Gamification Error:", e);
    }
}

async function syncBadges(actionType, currentCount) {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    let currentBadges = userSnap.data().badges || [];
    
    const badgeMap = BADGES[actionType];
    if (!badgeMap) return;

    let badgesChanged = false;
    const earnedBadgeIds = new Set(currentBadges.map(b => b.id));

    // 1. Check for Unlocks (Count >= Threshold)
    for (const [threshold, badgeDef] of Object.entries(badgeMap)) {
        if (currentCount >= parseInt(threshold)) {
            if (!earnedBadgeIds.has(badgeDef.id)) {
                // Award Badge
                currentBadges.push({
                    id: badgeDef.id,
                    name: badgeDef.name,
                    icon: badgeDef.icon,
                    desc: badgeDef.desc,
                    dateEarned: new Date().toISOString()
                });
                earnedBadgeIds.add(badgeDef.id);
                badgesChanged = true;
                showBadgeNotification(badgeDef); // Show popup for new unlock
            }
        } else {
            // 2. Check for Locks (Count < Threshold)
            // If they have the badge but count dropped below threshold -> Remove it
            if (earnedBadgeIds.has(badgeDef.id)) {
                currentBadges = currentBadges.filter(b => b.id !== badgeDef.id);
                earnedBadgeIds.delete(badgeDef.id);
                badgesChanged = true;
                console.log(`Badge Locked: ${badgeDef.name}`);
            }
        }
    }

    if (badgesChanged) {
        await updateDoc(userRef, { badges: currentBadges });
    }
}

async function unlockBadge(badge) {
    // ... existing code ... (This function is replaced by syncBadges logic but kept if needed by other files, though trackGamificationAction now uses syncBadges)
    // For safety, we can keep it or remove it. trackGamificationAction calls syncBadges now.
    // I will remove the old unlockBadge call inside trackGamificationAction and use syncBadges instead.
}

function showBadgeNotification(badge) {
    const div = document.createElement('div');
    div.className = 'badge-toast';
    div.innerHTML = `
        <div class="badge-icon">${badge.icon}</div>
        <div class="badge-info">
            <h4>Badge Unlocked!</h4>
            <h3>${badge.name}</h3>
            <p>${badge.desc}</p>
        </div>
    `;
    document.body.appendChild(div);

    requestAnimationFrame(() => div.classList.add('show'));

    setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 500);
    }, 4000);
}


async function handleContainerClick(e) {
    if (!currentUser) return;

    const deleteButton = e.target.closest('.list-delete-btn');
    const ribbonButton = e.target.closest('.bookmark-ribbon');
    const card = e.target.closest('.book-card.clickable');

    if (deleteButton || ribbonButton) e.stopPropagation();

    // --- A. DELETE ---
    if (deleteButton) {
        if(!confirm("Are you sure you want to delete this book?")) return;
        const docId = deleteButton.dataset.firestoreId;
        const source = deleteButton.dataset.source; 
        const cardElement = deleteButton.closest('.book-card');

        try {
            cardElement.style.opacity = '0.5';
            if (source === 'private') {
                await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', docId));
            } else if (source === 'public') {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', docId));
                refreshPublicBooks().then(updateLibraryUI);
            }
        } catch (err) {
            console.error(err);
            alert("Delete failed: " + err.message);
            cardElement.style.opacity = '1';
        }
    } 
    
    // --- B. TOGGLE (RIBBON) ---
    else if (ribbonButton) {
        if (ribbonButton.classList.contains('is-golden')) return;
        
        if (ribbonButton.dataset.processing === "true") return;
        ribbonButton.dataset.processing = "true";
        ribbonButton.style.opacity = '0.5';

        const docId = ribbonButton.dataset.firestoreId;
        const publicId = ribbonButton.dataset.publicId;
        
        const bookData = currentPrivateBooks.find(b => b.firestoreId === docId);
        
        if (!bookData) {
            ribbonButton.dataset.processing = "false";
            return;
        }

        if (!publicId && bookData.originalUserId && bookData.originalUserId !== currentUser.uid) {
            alert("You cannot publish books created by other users.");
            ribbonButton.style.opacity = '1';
            ribbonButton.dataset.processing = "false";
            return;
        }

        try {
            if (publicId) {
                // UNPUBLISH logic...
                if(!confirm("Unpublish this book? It will be removed from New Releases.")) {
                     ribbonButton.style.opacity = '1'; 
                     ribbonButton.dataset.processing = "false";
                     return;
                }
                const pubRef = doc(db, 'artifacts', appId, 'public', 'data', 'books', publicId);
                try {
                    const publicSnap = await getDoc(pubRef);
                    let ratingsToSave = {};
                    if (publicSnap.exists()) ratingsToSave = publicSnap.data().ratings || {};
                    
                    await deleteDoc(pubRef);
                    await updateDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', docId), { 
                        publicId: null,
                        ratings: ratingsToSave 
                    });
                    
                    // --- NEW: DECREMENT GAMIFICATION ---
                    await trackGamificationAction('books_published', -1);

                    await refreshPublicBooks();
                    alert("Unpublished.");
                } catch(innerErr) {
                    await updateDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', docId), { publicId: null });
                }
            } else {
                // PUBLISH
                if(!confirm("Publish to New Releases?")) {
                    ribbonButton.style.opacity = '1'; 
                    ribbonButton.dataset.processing = "false";
                    return;
                }
                const pubData = { 
                    ...bookData, 
                    userId: currentUser.uid, 
                    authorName: currentUser.displayName || 'Anonymous',
                    createdAt: serverTimestamp(), 
                    ratings: bookData.ratings || {},
                    originalUserId: currentUser.uid 
                };
                delete pubData.firestoreId; 
                delete pubData._source; 
                delete pubData.publicId;

                const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'books'), pubData);
                await updateDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', docId), { publicId: ref.id });
                
                // --- NEW: TRIGGER GAMIFICATION ---
                await trackGamificationAction('books_published', 1);

                await refreshPublicBooks();
                alert("Published!");
            }
        } catch (err) {
            console.error(err);
            alert("Action failed: " + err.message);
            ribbonButton.style.opacity = '1';
            ribbonButton.dataset.processing = "false";
        }
    }

    // --- C. READ ---
    else if (card) {
        const docId = card.dataset.firestoreId;
        const source = card.dataset.source;
        const bookToRead = (source === 'private' ? currentPrivateBooks : currentCreatedBooks).find(b => b.firestoreId === docId);

        if (bookToRead) {
            const storageData = { ...bookToRead, isLibraryView: true };
            localStorage.setItem('generatedBook', JSON.stringify(storageData));
            window.location.href = 'reader.html';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'mylist') {
        initializeMyList();
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