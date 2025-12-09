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

        // --- REAL AI GENERATION ---
        const apiKey = ""; // Fixed: Use empty string for secure environment injection
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const textPrompt = `You are a creative author. Write a 10-page mini-book based on these details. Return ONLY JSON.
        Genre: ${formData.genre}
        Title: ${formData.title}
        Core Idea: ${formData.idea}
        
        You must return ONLY a single JSON object matching this schema:
        {
          "title": "The Book Title",
          "genre": "${formData.genre}",
          "description": "A short, one-sentence compelling logline or description for the book.",
          "image_prompt": "A detailed, vivid 5-10 word prompt for an image generator (e.g., 'A detective on the moon, film noir, digital art').",
          "cover_hex_bg": "A 6-digit hex color code (no '#') for the book cover background, based on the theme.",
          "cover_hex_text": "A 6-digit hex color code (no '#') for the text that contrasts well with the background color.",
          "pages": [
            "Page 1 text...",
            "Page 2 text...",
            "Page 3 text...",
            "Page 4 text...",
            "Page 5 text...",
            "Page 6 text...",
            "Page 7 text...",
            "Page 8 text...",
            "Page 9 text...",
            "Page 10 text..."
          ]
        }`;
    
        const textPayload = {
          contents: [{ parts: [{ text: textPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    genre: { type: "STRING" },
                    description: { type: "STRING" },
                    image_prompt: { type: "STRING" },
                    cover_hex_bg: { type: "STRING" }, 
                    cover_hex_text: { type: "STRING" }, 
                    pages: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: [
                    "title", "genre", "description", "image_prompt", 
                    "cover_hex_bg", "cover_hex_text", "pages"
                ]
            }
          }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(textPayload)
            });

            if (!response.ok) {
                let errorMsg = "An unknown error occurred.";
                try {
                    const errorBody = await response.json();
                    errorMsg = errorBody.error.message;
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
            
            if (error.message.includes("blocked") || error.message.includes("referer")) {
                alert("API KEY ERROR: Check referer restrictions.");
            } else {
                alert("Sorry, something went wrong while generating the book: " + error.message);
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
                alert("You must be logged in to save books to the cloud library!");
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

                saveNewBookBtn.innerHTML = '<i data-feather="check" class="btn-icon"></i> Saved to Cloud!';
                feather.replace();

            } catch (error) {
                console.error("Error saving book to Firebase:", error);
                alert("There was an error saving your book to the cloud: " + error.message);
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