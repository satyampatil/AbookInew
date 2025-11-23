// --- MY LIST PAGE LOGIC (WITH PUBLIC/PRIVATE TOGGLE) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, orderBy, serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

function initializeMyList() {
    const container = document.getElementById('book-shelves-container');
    if (!container) return;

    // Wait for Auth to confirm user identity
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            container.innerHTML = `
                <div class="empty-list-message" style="text-align:center; padding: 2rem;">
                    <p>Please log in to view your cloud library.</p>
                    <a href="index.html" class="btn-primary" style="display:inline-block; margin-top:10px;">Go to Login</a>
                </div>`;
            return;
        }

        container.innerHTML = '<p class="loading-text">Loading your library...</p>';

        try {
            // Fetch books from Firestore
            const booksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'books');
            const q = query(booksRef); 
            const querySnapshot = await getDocs(q);

            const myList = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                myList.push({ ...data, firestoreId: doc.id });
            });

            renderShelves(container, myList, user.uid);

        } catch (error) {
            console.error("Error fetching books:", error);
            container.innerHTML = `<p class="error-text">Error loading library: ${error.message}</p>`;
        }
    });
}

function renderShelves(container, myList, userId) {
    if (myList.length === 0) {
        container.innerHTML = `<p class="empty-list-message">Your cloud library is empty. Go generate some books on the 'AIBOOK' page!</p>`;
        return;
    }

    // --- 1. Group Books by Genre ---
    const groupedByGenre = {};
    myList.forEach(book => {
        const genre = book.genre || "Uncategorized";
        if (!groupedByGenre[genre]) {
            groupedByGenre[genre] = [];
        }
        groupedByGenre[genre].push(book);
    });

    // --- 2. Build Shelves HTML ---
    let allShelvesHtml = '';
    const genres = Object.keys(groupedByGenre).sort(); 

    genres.forEach(genre => {
        allShelvesHtml += `
            <div class="category-shelf">
                <h2 class="category-title">${genre}</h2>
                <div class="book-scroll-container">
        `;

        const booksInGenre = groupedByGenre[genre];
        
        let booksHtml = ''; 
        booksInGenre.reverse().forEach(book => {
            const firestoreId = book.firestoreId;
            const isPublic = !!book.publicId; 
            const publicClass = isPublic ? 'is-public' : '';
            const publicIcon = isPublic ? 'globe' : 'lock';
            const publicTitle = isPublic ? 'Make Private' : 'Make Public (Publish)';
            const publicBtnStyle = isPublic ? 'background-color: #4CAF50; color: white;' : '';

            booksHtml += `
                <div class="book-card clickable" data-firestore-id="${firestoreId}">
                    
                    <img src="${book.coverUrl}" alt="${book.title}" onerror="this.src='https://placehold.co/300x450/1a1a1a/f5f5f5?text=Image+Error&font=inter'">
                    <div class="book-card-info">
                        <h3 class="book-card-title">${book.title}</h3>
                    </div>
                    
                    <!-- Action Buttons Container -->
                    <div class="book-card-actions">
                        <!-- RENAMED CLASS: list-public-btn -->
                        <button class="btn-icon-round list-public-btn ${publicClass}" 
                                title="${publicTitle}"
                                style="${publicBtnStyle}"
                                data-firestore-id="${firestoreId}"
                                data-public-id="${book.publicId || ''}">
                            <i data-feather="${publicIcon}"></i>
                        </button>

                        <!-- RENAMED CLASS: list-delete-btn -->
                        <button class="btn-icon-round list-delete-btn" 
                                title="Delete Book"
                                data-firestore-id="${firestoreId}"
                                data-public-id="${book.publicId || ''}">
                            <i data-feather="x"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        allShelvesHtml += booksHtml; 
        allShelvesHtml += `</div></div>`;
    });

    container.innerHTML = allShelvesHtml;
    if (typeof feather !== 'undefined') feather.replace(); 

    // --- 3. Event Listeners ---
    container.addEventListener('click', async (e) => {
        // UPDATED LISTENERS TO MATCH NEW CLASSES
        const deleteButton = e.target.closest('.list-delete-btn');
        const publicButton = e.target.closest('.list-public-btn');
        const card = e.target.closest('.book-card.clickable');

        // Stop propagation for buttons
        if (deleteButton || publicButton) {
            e.stopPropagation();
        }

        // --- A. DELETE LOGIC ---
        if (deleteButton) {
            if(!confirm("Are you sure you want to delete this book? This cannot be undone.")) return;

            const docId = deleteButton.getAttribute('data-firestore-id');
            const publicId = deleteButton.getAttribute('data-public-id');
            const cardElement = deleteButton.closest('.book-card');

            try {
                cardElement.style.opacity = '0.5';
                
                // 1. Delete Private Doc
                await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'books', docId));

                // 2. Delete Public Doc (if exists)
                if (publicId) {
                     await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', publicId));
                }

                initializeMyList(); 
            } catch (err) {
                console.error("Error deleting book:", err);
                alert("Could not delete book: " + err.message);
                cardElement.style.opacity = '1';
            }
        } 
        
        // --- B. TOGGLE PUBLIC/PRIVATE LOGIC ---
        else if (publicButton) {
            const docId = publicButton.getAttribute('data-firestore-id');
            const publicId = publicButton.getAttribute('data-public-id');

            // Find data in memory
            const bookData = myList.find(b => b.firestoreId === docId);
            if (!bookData) return;

            publicButton.disabled = true;

            try {
                if (publicId) {
                    // --- CASE 1: MAKE PRIVATE ---
                    if(!confirm("Remove from New Releases?")) {
                         publicButton.disabled = false; return;
                    }

                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', publicId));

                    await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'books', docId), {
                        publicId: null
                    });
                    
                    alert("Book is now Private.");
                } else {
                    // --- CASE 2: MAKE PUBLIC ---
                    if(!confirm("Publish this book to 'New Releases'? Everyone will be able to see it.")) {
                        publicButton.disabled = false; return;
                    }

                    const publicBookData = {
                        title: bookData.title,
                        description: bookData.description,
                        genre: bookData.genre,
                        coverUrl: bookData.coverUrl,
                        pages: bookData.pages,
                        cover_hex_bg: bookData.cover_hex_bg || '#333',
                        cover_hex_text: bookData.cover_hex_text || '#fff',
                        authorName: auth.currentUser.displayName || 'Anonymous',
                        userId: userId,
                        createdAt: serverTimestamp()
                    };

                    const publicRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'books'), publicBookData);

                    await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'books', docId), {
                        publicId: publicRef.id
                    });

                    alert("Book Published to New Releases!");
                }
                
                initializeMyList(); 
            } catch (err) {
                console.error("Error toggling privacy:", err);
                alert("Action failed: " + err.message);
                publicButton.disabled = false;
            }
        }

        // --- C. READ LOGIC ---
        else if (card) {
            const docId = card.getAttribute('data-firestore-id');
            const bookToRead = myList.find(b => b.firestoreId === docId);

            if (bookToRead) {
                localStorage.setItem('generatedBook', JSON.stringify(bookToRead));
                window.location.href = 'reader.html';
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'mylist') {
        initializeMyList();
    }
});