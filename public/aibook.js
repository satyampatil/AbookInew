// ---
// ===============================================
//   AIBOOK PAGE LOGIC (UPDATED)
// ===============================================
// ---
async function initializeAIGenerator() {
    const generatorForm = document.getElementById('generator-form');
    const formSection = document.getElementById('generator-form-section');
    const loadingSection = document.getElementById('loading-section');
    const revealSection = document.getElementById('reveal-section');
    
    // --- NEW: Get reveal section elements ---
    const newBookTitle = document.getElementById('new-book-title');
    const newBookDescription = document.getElementById('new-book-description');
    const newBookCover = document.getElementById('new-book-cover');
    const saveNewBookBtn = document.getElementById('save-new-book-btn');
    const createNewBtn = document.getElementById('create-new-btn');
    
    // Keep track of the currently generated book
    let currentBookData = null;

    if (!generatorForm) return; // Exit if we're not on the right page

    // --- 1. Handle Genre Tag Selection ---
    // ... (this logic is unchanged) ...
    const genreTags = document.querySelectorAll('.genre-tags .tag');
    const genreInput = document.getElementById('genre');
    let selectedGenre = "Fantasy"; // Default
    
    // Set 'Fantasy' as selected by default
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

        // Reset button state on new generation
        saveNewBookBtn.disabled = false;
        saveNewBookBtn.innerHTML = '<i data-feather="plus" class="btn-icon"></i> Save to My Library';

        console.log("Generating text-only book with:", formData);

        formSection.style.display = 'none';
        loadingSection.style.display = 'block';
        revealSection.style.display = 'none';

        // --- REAL AI GENERATION ---
        
        // --- !!! PASTE YOUR API KEY HERE !!! ---
        const apiKey = "AIzaSyD88KgN1TibCC6VTvtC1ZFdelMnXA-tw7g"; 
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        // --- PROMPT UPDATED (Added hex colors) ---
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
    
        // --- PAYLOAD UPDATED (Added hex colors to schema) ---
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
                    cover_hex_bg: { type: "STRING" }, // <-- NEW
                    cover_hex_text: { type: "STRING" }, // <-- NEW
                    pages: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: [
                    "title", "genre", "description", "image_prompt", 
                    "cover_hex_bg", "cover_hex_text", "pages" // <-- NEW
                ]
            }
          }
        };

        try {
            if (apiKey === "PASTE_YOUR_API_KEY_HERE") {
                throw new Error("API Key is not set. Please add your API key to app.js.");
            }
            
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

            // --- THIS IS THE UPDATED (FIXED) LINE ---
            const titleQuery = encodeURIComponent(bookData.title);
            const hexBg = bookData.cover_hex_bg.replace('#', '');
            const hexText = bookData.cover_hex_text.replace('#', '');
            
            bookData.coverUrl = `https://placehold.co/300x450/${hexBg}/${hexText}?text=${titleQuery}&font=inter`;
            
            // --- Store book data globally for the save button ---
            currentBookData = bookData;

            // Save to localStorage for the reader page
            localStorage.setItem('generatedBook', JSON.stringify(bookData));

            // --- Show Success & Populate New Fields ---
            loadingSection.style.display = 'none';
            revealSection.style.display = 'block';
            
            // Populate the new template
            newBookTitle.textContent = bookData.title;
            newBookDescription.textContent = bookData.description;
            newBookCover.src = bookData.coverUrl;
            newBookCover.alt = bookData.title;
            
            // Link the "Read Now" button to the reader page
            document.getElementById('read-new-book-btn').href = 'reader.html';

            feather.replace(); // Rerender icons

        } catch (error) {
            console.error("Error generating book:", error);
            alert("Sorry, something went wrong while generating the book: " + error.message);
            // Reset the form
            formSection.style.display = 'block';
            loadingSection.style.display = 'none';
        }
        // --- END REAL AI GENERATION ---
    });

    // --- 3. Handle "Start a New Book" button ---
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            revealSection.style.display = 'none';
            formSection.style.display = 'block';
            generatorForm.reset();
            genreTags.forEach(t => t.classList.remove('selected'));
            // Reselect default
            const defaultTag = document.querySelector('.tag[data-genre="Fantasy"]');
            if(defaultTag) defaultTag.classList.add('selected');
        });
    }
    
    // --- 4. NEW: Handle "Save to My Library" button ---
    if (saveNewBookBtn) {
        saveNewBookBtn.addEventListener('click', () => {
            if (!currentBookData) return; // No book data to save

            try {
                // Get existing list or create new one
                const myListJson = localStorage.getItem('myBookList');
                let myList = [];
                if (myListJson) {
                    myList = JSON.parse(myListJson);
                }

                // Check if book (by title AND description) is already in the list
                const isAlreadySaved = myList.some(book => 
                    book.title === currentBookData.title && 
                    book.description === currentBookData.description
                );

                if (!isAlreadySaved) {
                    // Add the current bookData object to the list
                    myList.push(currentBookData);
                    localStorage.setItem('myBookList', JSON.stringify(myList));
                }

                // Provide feedback
                saveNewBookBtn.innerHTML = '<i data-feather="check" class="btn-icon"></i> Saved!';
                saveNewBookBtn.disabled = true;
                feather.replace(); // Rerender the new 'check' icon

            } catch (error) {
                console.error("Error saving book to list:", error);
                alert("There was an error saving your book.");
            }
        });
    }
}

// ---
// ===============================================
//   MAIN PAGE ROUTER (Runs on Load)
// ===============================================
// ---
// This file only needs to initialize the AI generator.
// The main app.js will handle the other pages.
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