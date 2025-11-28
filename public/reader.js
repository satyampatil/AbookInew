// --- READER PAGE LOGIC (WITH FIREBASE) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { updateNavUser } from "./nav.js";

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
    let currentUser = null;
    let savedBookDocId = null; 

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNavUser(user);
        if (user) {
            checkIfSaved(user); 
        }
        updateButtonsState(); 
    });

    const titleEl = document.getElementById('reader-title');
    const contentEl = document.getElementById('reader-content');
    const pageIndicator = document.getElementById('page-indicator');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    const readerContainer = document.querySelector('.reader-container');
    const oldBtn = document.getElementById('reader-save-btn');
    if (oldBtn) oldBtn.remove();

    // Create Action Bar
    let actionBar = document.querySelector('.reader-action-bar');
    if (!actionBar) {
        actionBar = document.createElement('div');
        actionBar.className = 'reader-action-bar';
        actionBar.style.cssText = `
            position: absolute; 
            top: 1.5rem; 
            right: 1.5rem; 
            display: flex; 
            gap: 15px; 
            z-index: 10;
            align-items: center;
        `;
        if (readerContainer) readerContainer.appendChild(actionBar);
    } else {
        actionBar.innerHTML = ''; 
    }
    
    // 1. Save/Remove Button
    const saveListBtn = document.createElement('button');
    saveListBtn.className = 'reader-save-button';
    saveListBtn.id = 'save-list-btn';
    saveListBtn.style.position = 'relative'; 
    saveListBtn.style.top = 'auto';
    saveListBtn.style.right = 'auto';
    saveListBtn.innerHTML = `
        <span class="reader-save-icon"><i data-feather="bookmark"></i></span>
        <span class="reader-save-text">Save to List</span>
    `;
    
    // 2. Publish Button
    const saveCloudBtn = document.createElement('button');
    saveCloudBtn.className = 'reader-save-button';
    saveCloudBtn.id = 'save-cloud-btn';
    saveCloudBtn.style.position = 'relative';
    saveCloudBtn.style.top = 'auto';
    saveCloudBtn.style.right = 'auto';
    saveCloudBtn.innerHTML = `
        <span class="reader-save-icon"><i data-feather="cloud"></i></span>
        <span class="reader-save-text">Publish to Cloud</span>
    `;

    actionBar.appendChild(saveListBtn);
    actionBar.appendChild(saveCloudBtn);

    let bookData = null;
    let currentPage = 0; 

    try {
        const bookJson = localStorage.getItem('generatedBook');
        if (!bookJson) throw new Error("No book data found.");
        bookData = JSON.parse(bookJson);
        if (!bookData || !bookData.title || !bookData.pages) throw new Error("Invalid book data.");

        updatePage();
        if (typeof feather !== 'undefined') feather.replace();

    } catch (error) {
        console.error("Error loading book:", error);
        if(titleEl) titleEl.textContent = "Error";
        if(contentEl) contentEl.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
    }

    // --- CHECK FIREBASE STATUS ---
    async function checkIfSaved(user) {
        if (!bookData) return;
        try {
            const q = query(
                collection(db, 'artifacts', appId, 'users', user.uid, 'books'),
                where('title', '==', bookData.title),
                where('description', '==', bookData.description)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                savedBookDocId = snapshot.docs[0].id; 
                setSaveButtonState(true);
            } else {
                savedBookDocId = null;
                setSaveButtonState(false);
            }
        } catch (err) {
            console.error("Error checking save status:", err);
        }
    }

    function setSaveButtonState(isSaved) {
        if (isSaved) {
            saveListBtn.innerHTML = `<span class="reader-save-icon"><i data-feather="check"></i></span><span class="reader-save-text">In Library</span>`;
            saveListBtn.classList.add('saved'); 
            saveListBtn.style.backgroundColor = '#4CAF50';
            saveListBtn.style.color = 'white';
            saveListBtn.style.borderColor = '#4CAF50';
        } else {
            saveListBtn.innerHTML = `<span class="reader-save-icon"><i data-feather="bookmark"></i></span><span class="reader-save-text">Save to List</span>`;
            saveListBtn.classList.remove('saved');
            saveListBtn.style.backgroundColor = '';
            saveListBtn.style.color = '';
            saveListBtn.style.borderColor = '';
        }
        if (typeof feather !== 'undefined') feather.replace();
    }

    function updateButtonsState() {
        if (!bookData) return;

        // Cloud Button Logic
        if (bookData.isPublicView || bookData.publicId) {
            saveCloudBtn.innerHTML = `<span class="reader-save-icon"><i data-feather="globe"></i></span><span class="reader-save-text">Public (Cloud)</span>`;
            saveCloudBtn.classList.add('saved');
            saveCloudBtn.style.backgroundColor = '#4CAF50';
            saveCloudBtn.style.color = 'white';
            saveCloudBtn.disabled = true;
        } else {
            const isPrivateCopyOwner = currentUser && (bookData.userId === currentUser.uid || !bookData.userId);
            // --- FIX: Check Original Authorship ---
            // If originalUserId exists, current user MUST match it.
            // If it doesn't exist, we assume the current user generated it or it's a legacy book.
            const isOriginalAuthor = !bookData.originalUserId || (currentUser && bookData.originalUserId === currentUser.uid);

            if (isPrivateCopyOwner && isOriginalAuthor) {
                saveCloudBtn.disabled = false;
                saveCloudBtn.innerHTML = `<span class="reader-save-icon"><i data-feather="upload-cloud"></i></span><span class="reader-save-text">Publish</span>`;
                saveCloudBtn.style.display = 'flex';
            } else {
                saveCloudBtn.style.display = 'none'; // Hide if not original author
            }
        }
        if (typeof feather !== 'undefined') feather.replace();
    }

    function updatePage() {
        if (!bookData) return;
        const totalPages = bookData.pages.length + 1; 
        titleEl.textContent = bookData.title;

        if (currentPage === 0) {
            contentEl.innerHTML = `
                <h1 style="text-align: center; margin-top: 4rem; font-size: 2.5rem; color: #333;">${bookData.title}</h1>
                <p style="text-align: center; font-size: 1.2rem; font-style: italic; margin-top: 1rem;">A ${bookData.genre || 'Story'}</p>
                <p style="text-align: center; font-size: 1rem; color: #555; max-width: 600px; margin: 2rem auto 0 auto;">${bookData.description}</p>
                <p style="text-align: center; color: #555; margin-top: 6rem;">Click "Next" to begin.</p>
            `;
        } else {
            const pageText = bookData.pages[currentPage - 1];
            contentEl.innerHTML = pageText.split('\n').map(p => `<p>${p}</p>`).join('');
        }
        
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages - 1}`;
        prevBtn.disabled = (currentPage === 0);
        nextBtn.disabled = (currentPage === totalPages - 1);
    }

    if(prevBtn) prevBtn.addEventListener('click', () => {
        if (currentPage > 0) { currentPage--; updatePage(); }
    });

    if(nextBtn) nextBtn.addEventListener('click', () => {
        if (bookData && currentPage < bookData.pages.length) { currentPage++; updatePage(); }
    });

    // --- CLICK: SAVE / REMOVE TOGGLE ---
    saveListBtn.addEventListener('click', async () => {
        if (!currentUser) { alert("Please log in."); return; }
        
        if (saveListBtn.disabled) return;
        saveListBtn.disabled = true;

        try {
            if (savedBookDocId) {
                // REMOVE
                await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', savedBookDocId));
                savedBookDocId = null; 
                setSaveButtonState(false); 
            } else {
                // SAVE
                const { firestoreId, publicId, isPublicView, isLibraryView, ...cleanData } = bookData;
                if (!cleanData.coverUrl) {
                    const titleQuery = encodeURIComponent(cleanData.title);
                    cleanData.coverUrl = `https://placehold.co/300x450/333/FFF?text=${titleQuery}&font=inter`;
                }

                // --- FIX: Track Original Author ---
                // If the book already has an originalUserId, preserve it.
                // If not, and it has a userId (from another author), use that.
                // Otherwise (fresh gen), use current user.
                let originId = cleanData.originalUserId;
                if (!originId) {
                    originId = cleanData.userId || currentUser.uid;
                }

                const bookToSave = {
                    ...cleanData,
                    createdAt: serverTimestamp(),
                    userId: currentUser.uid,
                    originalUserId: originId // Store origin
                };

                const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', currentUser.uid, 'books'), bookToSave);
                savedBookDocId = docRef.id; 
                setSaveButtonState(true); 
            }
        } catch (error) {
            console.error(error);
            alert("Action failed: " + error.message);
        } finally {
            saveListBtn.disabled = false;
        }
    });

    // --- CLICK: PUBLISH ---
    saveCloudBtn.addEventListener('click', async () => {
        if (!currentUser) { alert("Please log in."); return; }
        if (bookData.userId && bookData.userId !== currentUser.uid) {
            alert("You can only publish your own books.");
            return;
        }

        try {
            saveCloudBtn.innerHTML = 'Publishing...';
            
            const { firestoreId, publicId, isPublicView, isLibraryView, ...cleanData } = bookData;
            
            const publicBook = {
                ...cleanData,
                createdAt: serverTimestamp(),
                userId: currentUser.uid,
                authorName: currentUser.displayName || 'Anonymous',
                ratings: {},
                originalUserId: currentUser.uid // Ensure public record marks ownership
            };

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'books'), publicBook);

            saveCloudBtn.innerHTML = `<span class="reader-save-icon"><i data-feather="globe"></i></span><span class="reader-save-text">Published!</span>`;
            saveCloudBtn.classList.add('saved');
            saveCloudBtn.style.backgroundColor = '#4CAF50';
            saveCloudBtn.style.color = 'white';
            feather.replace();

        } catch (error) {
            console.error(error);
            alert("Error publishing: " + error.message);
            saveCloudBtn.innerHTML = `<span class="reader-save-icon"><i data-feather="upload-cloud"></i></span><span class="reader-save-text">Publish</span>`;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'reader') {
        initializeReader();
    }
});