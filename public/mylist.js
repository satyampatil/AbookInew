// --- MY LIST PAGE LOGIC (WITH FIREBASE) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, query, orderBy } 
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
            // Try to order by creation time, but might fail if index missing, so simple fetch first
            const q = query(booksRef); 
            const querySnapshot = await getDocs(q);

            const myList = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Add the Firestore ID so we can delete it later
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
    // Handle Empty List
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
        
        // Reverse to show newest added (visually)
        let booksHtml = ''; 
        booksInGenre.reverse().forEach(book => {
            const safeTitle = book.title.replace(/"/g, '&quot;');
            // Use firestoreId for deletion
            const firestoreId = book.firestoreId; 

            booksHtml += `
                <div class="book-card clickable" 
                     data-firestore-id="${firestoreId}">
                    
                    <img src="${book.coverUrl}" alt="${book.title}" onerror="this.src='https://placehold.co/300x450/1a1a1a/f5f5f5?text=Image+Error&font=inter'">
                    <div class="book-card-info">
                        <h3 class="book-card-title">${book.title}</h3>
                    </div>
                    
                    <button class="btn-icon-round delete-book-btn" 
                            title="Delete Book"
                            data-firestore-id="${firestoreId}">
                        <i data-feather="x"></i>
                    </button>
                </div>
            `;
        });

        allShelvesHtml += booksHtml; 
        allShelvesHtml += `</div></div>`;
    });

    container.innerHTML = allShelvesHtml;
    if (typeof feather !== 'undefined') feather.replace(); 

    // --- 3. Add Event Listeners ---
    container.addEventListener('click', async (e) => {
        const deleteButton = e.target.closest('.delete-book-btn');
        const card = e.target.closest('.book-card.clickable');

        if (deleteButton) {
            // --- DELETE LOGIC (FIRESTORE) ---
            e.stopPropagation();
            if(!confirm("Are you sure you want to delete this book from your cloud library?")) return;

            const docId = deleteButton.getAttribute('data-firestore-id');
            const cardElement = deleteButton.closest('.book-card');

            if (docId) {
                try {
                    cardElement.style.opacity = '0.5';
                    await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'books', docId));
                    // Remove from DOM strictly for visual feedback, or reload
                    // Re-fetching is safer to keep sync
                    initializeMyList(); 
                } catch (err) {
                    console.error("Error deleting book:", err);
                    alert("Could not delete book: " + err.message);
                    cardElement.style.opacity = '1';
                }
            }

        } else if (card) {
            // --- READ BOOK LOGIC ---
            const docId = card.getAttribute('data-firestore-id');
            
            // Find the full book object from our memory list
            const bookToRead = myList.find(b => b.firestoreId === docId);

            if (bookToRead) {
                // Save this specific book to localStorage for the reader page to pick up
                localStorage.setItem('generatedBook', JSON.stringify(bookToRead));
                window.location.href = 'reader.html';
            }
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'mylist') {
        initializeMyList();
    }
});