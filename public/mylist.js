// --- MY LIST PAGE LOGIC (WITH PUBLIC/PRIVATE TOGGLE) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, where, orderBy, serverTimestamp, getDoc } 
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
}

async function loadBooks() {
    const container = document.getElementById('book-shelves-container');
    if (!currentUser || !container) return;

    container.innerHTML = '<p class="loading-text">Loading your library...</p>';

    try {
        // 1. Fetch ALL Private Books first
        const privateRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'books');
        const privateSnap = await getDocs(privateRef);
        
        const validPrivateBooks = [];
        const checks = [];

        // 2. Filter & Cleanup Logic
        // We need to check if "Saved" books (that aren't mine) are still public.
        for (const docSnap of privateSnap.docs) {
            const data = docSnap.data();
            const book = { ...data, firestoreId: docSnap.id, _source: 'private' };

            // Logic: 
            // If I am NOT the original author AND it has a publicId...
            // It means I saved this from the public library.
            // We must verify if that public book still exists.
            if (book.originalUserId && book.originalUserId !== currentUser.uid && book.publicId) {
                const checkPromise = getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', book.publicId))
                    .then(async (publicSnap) => {
                        if (!publicSnap.exists()) {
                            // ORIGINAL AUTHOR UNPUBLISHED IT!
                            // Delete my private copy (Lazy Cleanup)
                            console.log(`Removing stale book: ${book.title}`);
                            await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', docSnap.id));
                            return null; // Exclude from list
                        }
                        return book; // Keep it
                    });
                checks.push(checkPromise);
            } else {
                // It's my own book or a draft, always keep.
                checks.push(Promise.resolve(book));
            }
        }

        // Wait for all verification checks
        const results = await Promise.all(checks);
        currentPrivateBooks = results.filter(b => b !== null);

        // 3. Fetch "My Published Creations" (Public books by me)
        const publicRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
        const qPublic = query(publicRef, where('userId', '==', currentUser.uid));
        const publicSnap = await getDocs(qPublic);
        currentCreatedBooks = [];
        publicSnap.forEach((doc) => currentCreatedBooks.push({ ...doc.data(), firestoreId: doc.id, _source: 'public' }));

        renderDualShelves(container, currentPrivateBooks, currentCreatedBooks);

    } catch (error) {
        console.error("Error fetching books:", error);
        container.innerHTML = `<p class="error-text">Error loading library: ${error.message}</p>`;
    }
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
        const ribbonClass = (!isPrivateSection || isPublic) ? 'is-public' : 'is-private';
        const ribbonTitle = isPrivateSection ? (isPublic ? 'Public (Click to Unpublish)' : 'Private (Click to Publish)') : 'Published';
        
        html += `
            <div class="book-card clickable" data-firestore-id="${book.firestoreId}" data-source="${book._source}">
                <img src="${book.coverUrl}" alt="${book.title}" onerror="this.src='https://placehold.co/300x450/1a1a1a/f5f5f5?text=Image+Error&font=inter'">
                <div class="book-card-info">
                    <h3 class="book-card-title">${book.title}</h3>
                </div>
                
                ${isPrivateSection ? `
                <div class="bookmark-ribbon ${ribbonClass}" 
                     title="${ribbonTitle}"
                     data-firestore-id="${book.firestoreId}"
                     data-public-id="${book.publicId || ''}">
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
    
    // --- B. TOGGLE ---
    else if (ribbonButton) {
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

        // Check Ownership before publishing
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
                    if (publicSnap.exists()) {
                        ratingsToSave = publicSnap.data().ratings || {};
                    }
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