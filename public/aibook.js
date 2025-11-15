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

    if (!generatorForm) return; // Exit if we're not on the right page

    // --- 1. Handle Genre Tag Selection ---
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

        console.log("Generating text-only book with:", formData);

        formSection.style.display = 'none';
        loadingSection.style.display = 'block';
        revealSection.style.display = 'none';

        // --- REAL AI GENERATION ---
        
        // --- !!! PASTE YOUR API KEY HERE !!! ---
        const apiKey = "AIzaSyD88KgN1TibCC6VTvtC1ZFdelMnXA-tw7g"; 
        // Get your key from Google AI Studio
        
        // --- API URL UPDATED (as requested) ---
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        // --- PROMPT UPDATED (Added image_prompt) ---
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
    
        // --- PAYLOAD UPDATED (Added image_prompt to schema) ---
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
                    image_prompt: { type: "STRING" }, // <-- NEW
                    pages: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["title", "genre", "description", "image_prompt", "pages"] // <-- NEW
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
            
            // --- PARSING UPDATED ---
            // With JSON mode, the text is already clean JSON
            const rawText = result.candidates[0].content.parts[0].text;
            const bookData = JSON.parse(rawText);

            // --- THIS IS THE UPDATED (FIXED) LINE ---
            // Format the new image_prompt and genre to be URL-friendly
            const imageQuery = encodeURIComponent(`${bookData.image_prompt},${bookData.genre}`);
            // Use Unsplash to get a random 300x450 photo. 
            // This query uses the specific prompt AND the general genre, making it more robust.
            bookData.coverUrl = `https://source.unsplash.com/300x450/?${imageQuery}`;
            // --- END OF UPDATE ---

            // Save to localStorage for the reader page
            localStorage.setItem('generatedBook', JSON.stringify(bookData));

            // --- Show Success ---
            loadingSection.style.display = 'none';
            revealSection.style.display = 'block';
            document.getElementById('new-book-title').textContent = bookData.title;
            
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
    const createNewBtn = document.getElementById('create-new-btn');
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