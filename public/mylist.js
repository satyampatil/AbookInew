// --- MY LIST PAGE LOGIC (GENRE SORTED & INFORMATIVE) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, where, serverTimestamp, getDoc } 
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

function initializeMyList() {
    const container = document.getElementById('book-shelves-container');
    if (!container) return;

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateNavUser(user);

        if (!user) {
            container.innerHTML = `
                <div class="empty-list-message" style="text-align:center; padding: 2rem;">
                    <p>Please log in to view your cloud library.</p>
                    <a href="index.html" class="btn-primary" style="display:inline-block; margin-top:10px;">Go to Login</a>
                </div>`;
            return;
        }
        loadBooks();
    });

    container.addEventListener('click', handleContainerClick);
    
    // Setup Filter Click Listeners
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

async function loadBooks() {
    const container = document.getElementById('book-shelves-container');
    if (!currentUser || !container) return;

    container.innerHTML = '<p class="loading-text">Loading your library...</p>';

    try {
        // 1. Fetch ALL Private Books
        const privateRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'books');
        const privateSnap = await getDocs(privateRef);
        
        const validPrivateBooks = [];
        const checks = [];

        for (const docSnap of privateSnap.docs) {
            const data = docSnap.data();
            const book = { ...data, firestoreId: docSnap.id, _source: 'private' };

            // Logic: Check if saved public books are still valid
            if (book.originalUserId && book.originalUserId !== currentUser.uid && book.publicId) {
                const checkPromise = getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', book.publicId))
                    .then(async (publicSnap) => {
                        if (!publicSnap.exists()) {
                            console.log(`Removing stale book: ${book.title}`);
                            await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', docSnap.id));
                            return null; 
                        }
                        return book; 
                    });
                checks.push(checkPromise);
            } else {
                checks.push(Promise.resolve(book));
            }
        }

        const results = await Promise.all(checks);
        currentPrivateBooks = results.filter(b => b !== null);

        // 2. Fetch "My Published Creations"
        const publicRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
        const qPublic = query(publicRef, where('userId', '==', currentUser.uid));
        const publicSnap = await getDocs(qPublic);
        currentCreatedBooks = [];
        publicSnap.forEach((doc) => currentCreatedBooks.push({ ...doc.data(), firestoreId: doc.id, _source: 'public' }));

        updateLibraryUI();

    } catch (error) {
        console.error("Error fetching books:", error);
        container.innerHTML = `<p class="error-text">Error loading library: ${error.message}</p>`;
    }
}

function updateLibraryUI() {
    const container = document.getElementById('book-shelves-container');
    
    // --- UPDATED COUNT LOGIC (Fixing Duplicates) ---
    // 1. Create a Set of all Public IDs referenced by your Private books.
    //    (If a private book says "I am published at ID 123", we know 123 is accounted for).
    const linkedPublicIds = new Set();
    currentPrivateBooks.forEach(b => {
        if (b.publicId) linkedPublicIds.add(b.publicId);
    });

    // 2. Find "Orphan" Public books (Published books where you deleted the private copy).
    const uniquePublicBooks = currentCreatedBooks.filter(b => !linkedPublicIds.has(b.firestoreId));
    
    // 3. Combine Private List + Orphan Public List for the "Unique" view
    const uniqueBooksForStats = [...currentPrivateBooks, ...uniquePublicBooks];
    
    // 4. Calculate Stats based on Unique List
    const totalCount = uniqueBooksForStats.length;
    
    const genres = new Set();
    uniqueBooksForStats.forEach(b => {
        if(b.genre) genres.add(b.genre);
    });

    // Render Filters
    const filterContainer = document.getElementById('genre-filters');
    if (filterContainer) {
        let filterHtml = `<button class="filter-btn active" data-filter="all">All</button>`;
        Array.from(genres).sort().forEach(g => {
            filterHtml += `<button class="filter-btn" data-filter="${g}">${g}</button>`;
        });
        filterContainer.innerHTML = filterHtml;
    }

    // Render Stats
    const statsContainer = document.getElementById('library-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <span class="stat-item">Books: <b>${totalCount}</b></span>
            <span class="stat-item">Genres: <b>${genres.size}</b></span>
        `;
    }

    // Render Grid (We still pass the raw lists to render the shelves separately)
    renderDualShelves(container, currentPrivateBooks, currentCreatedBooks);
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
    
    [...books].reverse().forEach(book => {
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
            }
            loadBooks(); 
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
                // UNPUBLISH
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
                alert("Published!");
            }
            loadBooks(); 
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