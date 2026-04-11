// ---
// ===============================================
//   AIBOOK PAGE LOGIC (WITH FIREBASE)
// ===============================================
// ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { updateNavUser } from "./nav.js"; // --- IMPORT ---

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

function showSiteNotice(message, type = 'info') {
    let toast = document.getElementById('site-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'site-toast';
        toast.className = 'site-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }

    toast.className = `site-toast ${type}`;
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add('show'));

    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 4600);
}

async function initializeAIGenerator() {
    // --- NEW: LISTEN FOR AUTH ---
    onAuthStateChanged(auth, (user) => {
        updateNavUser(user);
    });

    const generatorForm = document.getElementById('generator-form');
    const formSection = document.getElementById('generator-form-section');
    const loadingSection = document.getElementById('loading-section');
    const revealSection = document.getElementById('reveal-section');
    
    const newBookTitle = document.getElementById('new-book-title');
    const newBookDescription = document.getElementById('new-book-description');
    const newBookCover = document.getElementById('new-book-cover');
    const saveNewBookBtn = document.getElementById('save-new-book-btn');
    const createNewBtn = document.getElementById('create-new-btn');
    
    let currentBookData = null;

    if (!generatorForm) return; 

    // --- 1. Handle Genre Tag Selection ---
    const genreTags = document.querySelectorAll('.genre-tags .tag');
    const genreInput = document.getElementById('genre');
    let selectedGenre = "Fantasy"; 
    
    genreTags.forEach(tag => {
        if (tag.dataset.genre === selectedGenre) {
            tag.classList.add('selected');
            genreInput.value = selectedGenre;
        }
    });

    genreTags.forEach(tag => {
        tag.addEventListener('click', () => {
            genreTags.forEach(t => t.classList.remove('selected'));
            tag.classList.add('selected');
            selectedGenre = tag.dataset.genre;
            genreInput.value = selectedGenre;
        });
    });
    
    // --- 2. Handle Form Submission ---
    generatorForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const formData = {
            genre: selectedGenre,
            title: document.getElementById('title').value || "My AI Story",
            idea: document.getElementById('idea').value || `A ${selectedGenre} story.`
        };

        saveNewBookBtn.disabled = false;
        saveNewBookBtn.innerHTML = '<i data-feather="plus" class="btn-icon"></i> Save to My Library';

        console.log("Generating text-only book with:", formData);

        formSection.style.display = 'none';
        loadingSection.style.display = 'block';
        revealSection.style.display = 'none';

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("Please log in before generating a book.");
            }

            const idToken = await user.getIdToken();

            const response = await fetch('/api/generateBook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                let errorMsg = "An unknown error occurred.";
                try {
                    const errorBody = await response.json();
                    errorMsg = errorBody.error?.message || errorBody.error || errorMsg;
                } catch (e) {
                    errorMsg = `API request failed with status: ${response.status}`;
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();
            
            const rawText = result.candidates[0].content.parts[0].text;
            const bookData = JSON.parse(rawText);

            const titleQuery = encodeURIComponent(bookData.title);
            const hexBg = bookData.cover_hex_bg.replace('#', '');
            const hexText = bookData.cover_hex_text.replace('#', '');
            
            bookData.coverUrl = `https://placehold.co/300x450/${hexBg}/${hexText}?text=${titleQuery}&font=inter`;
            
            currentBookData = bookData;

            localStorage.setItem('generatedBook', JSON.stringify(bookData));

            loadingSection.style.display = 'none';
            revealSection.style.display = 'block';
            
            newBookTitle.textContent = bookData.title;
            newBookDescription.textContent = bookData.description;
            newBookCover.src = bookData.coverUrl;
            newBookCover.alt = bookData.title;
            
            document.getElementById('read-new-book-btn').href = 'reader.html';

            feather.replace(); 

        } catch (error) {
            console.error("Error generating book:", error);
            
            if (error.message.includes("not configured")) {
                showSiteNotice("AI generation is not configured on the server yet.", "error");
            } else {
                showSiteNotice("Sorry, something went wrong while generating the book: " + error.message, "error");
            }

            formSection.style.display = 'block';
            loadingSection.style.display = 'none';
        }
    });

    // --- 3. Handle "Start a New Book" button ---
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            revealSection.style.display = 'none';
            formSection.style.display = 'block';
            generatorForm.reset();
            genreTags.forEach(t => t.classList.remove('selected'));
            const defaultTag = document.querySelector('.tag[data-genre="Fantasy"]');
            if(defaultTag) defaultTag.classList.add('selected');
        });
    }
    
    // --- 4. Handle "Save to My Library" button (FIREBASE EDITION) ---
    if (saveNewBookBtn) {
        saveNewBookBtn.addEventListener('click', async () => {
            if (!currentBookData) return;

            const user = auth.currentUser;
            
            if (!user) {
                showSiteNotice("Log in to save books to your cloud library.", "error");
                return;
            }

            try {
                saveNewBookBtn.innerHTML = 'Saving...';
                saveNewBookBtn.disabled = true;

                const bookToSave = {
                    ...currentBookData,
                    createdAt: serverTimestamp(),
                    userId: user.uid 
                };

                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'books'), bookToSave);

                saveNewBookBtn.innerHTML = '<i data-feather="check" class="btn-icon"></i> Saved to My List!';
                feather.replace();
                showSiteNotice("Saved to My List.", "success");

            } catch (error) {
                console.error("Error saving book to Firebase:", error);
                showSiteNotice("There was an error saving your book to the cloud: " + error.message, "error");
                saveNewBookBtn.disabled = false;
                saveNewBookBtn.innerHTML = '<i data-feather="plus" class="btn-icon"></i> Try Again';
                feather.replace();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'aibook') {
        try {
            initializeAIGenerator();
        } catch (e) {
            console.error("Error initializing AI generator:", e);
        }
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
