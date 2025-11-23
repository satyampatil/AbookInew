// --- READER PAGE LOGIC (WITH FIREBASE) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2VtkohplpoihVUzlFncyxW6qi39r_IEU",
  authDomain: "studio-5978542726-e345b.firebaseapp.com",
  projectId: "studio-5978542726-e345b",
  storageBucket: "studio-5978542726-e345b.firebasestorage.app",
  messagingSenderId: "968782492427",
  appId: "1:968782492427:web:90108da3599e50bc2b680e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-book-app';

function initializeReader() {
    const titleEl = document.getElementById('reader-title');
    const contentEl = document.getElementById('reader-content');
    const pageIndicator = document.getElementById('page-indicator');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const addToListBtn = document.getElementById('reader-save-btn');

    if (!titleEl || !addToListBtn) return; 

    let bookData = null;
    let currentPage = 0; // 0 is the title page

    try {
        // 1. Get Book from localStorage (Passed from aibook.js or mylist.js)
        const bookJson = localStorage.getItem('generatedBook');
        if (!bookJson) {
            throw new Error("No book data found. Please generate a book first.");
        }
        
        bookData = JSON.parse(bookJson);
        
        // Basic validation
        if (!bookData || !bookData.title || !bookData.pages) {
             throw new Error("Invalid or outdated book data. Please generate a new book.");
        }

        // --- Check if this book is already "Saved" (Has a firestore ID) ---
        // If we opened this from My List, it already has an ID, so we disable the button
        if (bookData.firestoreId) {
            addToListBtn.innerHTML = `
                <span class="reader-save-icon"><i data-feather="check"></i></span>
                <span class="reader-save-text">In Library</span>
            `;
            addToListBtn.disabled = true;
            addToListBtn.classList.add('saved');
        }

        // 2. Initialize Reader UI
        updatePage();
        if (typeof feather !== 'undefined') feather.replace();

    } catch (error) {
        console.error("Error loading book:", error);
        titleEl.textContent = "Error";
        contentEl.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        addToListBtn.style.display = 'none';
    }

    // 3. Page turning logic
    function updatePage() {
        if (!bookData) return;

        const totalPages = bookData.pages.length + 1; // +1 for title page

        titleEl.textContent = bookData.title;

        if (currentPage === 0) {
            // Title Page
            contentEl.innerHTML = `
                <h1 style="text-align: center; margin-top: 4rem; font-size: 2.5rem; color: #333;">${bookData.title}</h1>
                <p style="text-align: center; font-size: 1.2rem; font-style: italic; margin-top: 1rem;">A ${bookData.genre || 'Story'}</p>
                
                <p style="text-align: center; font-size: 1rem; color: #555; max-width: 600px; margin: 2rem auto 0 auto;">
                    ${bookData.description}
                </p>

                <p style="text-align: center; color: #555; margin-top: 6rem;">Click "Next" to begin.</p>
            `;
        } else {
            // Story Page (currentPage is 1-based index for pages array)
            const pageText = bookData.pages[currentPage - 1];
            contentEl.innerHTML = pageText.split('\n').map(p => `<p>${p}</p>`).join('');
        }
        
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages - 1}`;
        prevBtn.disabled = (currentPage === 0);
        nextBtn.disabled = (currentPage === totalPages - 1);
    }

    // 4. Event Listeners
    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            updatePage();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (bookData && currentPage < bookData.pages.length) {
            currentPage++;
            updatePage();
        }
    });

    // --- 5. SAVE TO FIREBASE LOGIC ---
    addToListBtn.addEventListener('click', async () => {
        if (!bookData || addToListBtn.disabled) return; 

        const user = auth.currentUser;
            
        if (!user) {
            alert("You must be logged in to save books to the cloud library!");
            return;
        }

        try {
            // UI Feedback
            const originalHtml = addToListBtn.innerHTML;
            addToListBtn.innerHTML = 'Saving...';
            addToListBtn.disabled = true;

            // Ensure coverUrl exists
            if (!bookData.coverUrl) {
                const titleQuery = encodeURIComponent(bookData.title);
                const hexBg = (bookData.cover_hex_bg || '333').replace('#', '');
                const hexText = (bookData.cover_hex_text || 'FFF').replace('#', '');
                bookData.coverUrl = `https://placehold.co/300x450/${hexBg}/${hexText}?text=${titleQuery}&font=inter`;
            }

            // Prepare object for Firestore
            // We do NOT save the 'firestoreId' if it happened to be in there locally
            const { firestoreId, ...bookToSave } = bookData;
            
            bookToSave.createdAt = serverTimestamp();
            bookToSave.userId = user.uid;

            // Save to Firestore
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'books'), bookToSave);

            // Success Feedback
            addToListBtn.innerHTML = `
                <span class="reader-save-icon"><i data-feather="check"></i></span>
                <span class="reader-save-text">Saved to Cloud!</span>
            `;
            addToListBtn.classList.add('saved');
            if (typeof feather !== 'undefined') feather.replace(); 

        } catch (error) {
            console.error("Error saving book to list:", error);
            alert("Error saving to cloud: " + error.message);
            addToListBtn.disabled = false;
            addToListBtn.innerHTML = `
                <span class="reader-save-icon"><i data-feather="plus"></i></span>
                <span class="reader-save-text">Try Again</span>
            `;
            if (typeof feather !== 'undefined') feather.replace(); 
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'reader') {
        initializeReader();
    }
});