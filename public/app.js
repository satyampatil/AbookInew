// --- DEFINE ALL BOOKS AS CONSTANTS ---
const romeoAndJulietBook = { 
    title: "Romeo and Juliet", 
    description: "", // Description removed as per our simplified hero
    coverUrl: "books/romeo-and-juliet/romeo-and-juliet.jpg",
    readUrl: "books/romeo-and-juliet/romeo-and-juliet.html"
};
const MobyDick = { 
    title: "Moby Dick; Or, The Whale", 
    description: "A sailor's obsessive quest for revenge on a giant white whale.",
    coverUrl: "books/Moby-Dick/Moby-Dick.jpg",
    readUrl: "books/Moby-Dick/Moby-Dick.html"
};
const PrideandPrejudice = { // This is the correct spelling
    title: "Pride and Prejudice", 
    description: "A classic romance about manners, marriage, and misconceptions.",
    coverUrl: "books/Pride-and-Prejudice/Pride-and-Prejudice.jpg",
    readUrl: "books/Pride-and-Prejudice/Pride-and-Prejudice.html"
};
const AdventuresinWonderland = { 
    title: "Alice's Adventures in Wonderland", 
    description: "A young girl falls down a rabbit hole into a whimsical, nonsensical world.",
    coverUrl: "books/Adventures-in-Wonderland/Adventures-in-Wonderland.jpg",
    readUrl: "books/Adventures-in-Wonderland/Adventures-in-Wonderland.html"
};

// --- LIST OF "NEW" BOOKS FOR THE NEW PAGE ---
const newReleasesList = [
    AdventuresinWonderland,
    PrideandPrejudice,
    MobyDick,
    romeoAndJulietBook
];

// --- DATA FOR NEW RELEASES PAGE ---
const bookDataNewReleases = [
    {
        category: "New Releases",
        books: newReleasesList
    }
];

// --- DATA FOR HOME PAGE ---
const bookDataHome = [
    {
        category: "Trending Now",
        books: [] // Will be populated by logic below
    },
    {
        category: "Classic Literature", 
        books: [
            { title: "Hamlet", coverUrl: "https://placehold.co/300x450/6c757d/FFFFFF?text=Hamlet", readUrl: null },
            { title: "Macbeth", coverUrl: "https://placehold.co/300x450/6c757d/FFFFFF?text=Macbeth", readUrl: null },
        ]
    },
    {
        category: "Fantasy Worlds",
        books: [
            { title: "Dragon's Peak", coverUrl: "https://placehold.co/300x450/5645E0/FFFFFF?text=Dragon's+Peak", readUrl: null },
            { title: "The Last Wizard", coverUrl: "https://placehold.co/300x450/62E49C/000000?text=The+Last+Wizard", readUrl: null },
            { title: "Shadow Gate", coverUrl: "https://placehold.co/300x450/9B27AF/FFFFFF?text=Shadow+Gate", readUrl: null },
            { title: "Elven Crown", coverUrl: "https://placehold.co/300x450/E50914/FFFFFF?text=Elven+Crown", readUrl: null },
            { title: "Sky Kingdom", coverUrl: "httpsG://placehold.co/300x450/F8A00F/000000?text=Sky+Kingdom", readUrl: null },
            { title: "Shadow Gate", coverUrl: "https://placehold.co/300x450/9B27AF/FFFFFF?text=Shadow+Gate", readUrl: null },
        ]
    },
    {
        category: "Mystery & Thrillers",
        books: [
            { title: "The Silent Witness", coverUrl: "https://placehold.co/300x450/333333/FFFFFF?text=The+Silent+Witness", readUrl: null },
            { title: "Gone by Dawn", coverUrl: "https://placehold.co/300x450/A0A0A0/000000?text=Gone+by+Dawn", readUrl: null },
            { title: "Echo Park", coverUrl: "https://placehold.co/300x450/454545/FFFFFF?text=Echo+Park", readUrl: null },
            { title: "The Deep End", coverUrl: "https://placehold.co/300x450/C0C0C0/000000?text=The+Deep+End", readUrl: null },
        ]
    }
];

// --- Populate Home Page Data ---
bookDataHome[0].books.unshift(romeoAndJulietBook);
bookDataHome[1].books.unshift(romeoAndJulietBook);
bookDataHome[0].books.unshift(MobyDick);
bookDataHome[1].books.unshift(MobyDick);
bookDataHome[0].books.unshift(PrideandPrejudice);
bookDataHome[1].books.unshift(PrideandPrejudice);
bookDataHome[0].books.unshift(AdventuresinWonderland);
bookDataHome[2].books.unshift(AdventuresinWonderland);


// ---
// ===============================================
//   BOOKFLIX PAGE LOGIC (Home & New Releases)
// ===============================================
// ---

// --- BUILD HERO FUNCTION ---
function buildHero(book) {
    const heroSection = document.querySelector('.hero-section');
    const heroContent = document.querySelector('.hero-content');
    if (!heroSection || !heroContent) return; 

    heroSection.style.backgroundImage = `
        linear-gradient(to right, 
            rgba(var(--bg-color-rgb), 0.9) 20%, 
            rgba(var(--bg-color-rgb), 0.6) 50%, 
            rgba(var(--bg-color-rgb), 0) 100%
        ),
        url('${book.coverUrl}')
    `;
    
    const heroHtml = `
        <h1 class="hero-title">${book.title}</h1>
        <p class="hero-description">${book.description || ''}</p>
        <div class="hero-buttons">
            <a href="${book.readUrl}" target="_blank" class="btn btn-primary">
                <i data-feather="play" class="btn-icon"></i> Read Now
            </a>
            <button class="btn btn-secondary">
                <i data-feather="plus" class="btn-icon"></i> Add to List
            </button>
        </div>
    `;

    heroContent.innerHTML = heroHtml;

    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// --- BUILD SHELVES FUNCTION ---
function buildShelves(data) {
    const shelvesContainer = document.getElementById('book-shelves-container');
    if (!shelvesContainer) return; 

    let allShelvesHtml = '';

    data.forEach(category => {
        let booksHtml = '';
        category.books.forEach(book => {
            const readUrlAttr = book.readUrl ? `data-read-url="${book.readUrl}"` : '';
            const clickableClass = book.readUrl ? 'clickable' : '';

            booksHtml += `
                <div class="book-card ${clickableClass}" ${readUrlAttr}>
                    <img src="${book.coverUrl}" alt="${book.title}">
                    <div class="book-card-info">
                        <h3 class="book-card-title">${book.title}</h3>
                    </div>
                </div>
            `;
        });

        allShelvesHtml += `
            <div class="category-shelf">
                <h2 class="category-title">${category.category}</h2>
                <div class="book-scroll-container">
                    ${booksHtml}
                </div>
            </div>
        `;
    });

    shelvesContainer.innerHTML = allShelvesHtml;

    document.querySelectorAll('.book-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-read-url');
            if (url) {
                window.open(url, '_blank');
            }
        });
    });
}

// ---
// ===============================================
//   NEW: READER PAGE LOGIC
// ===============================================
// ---
function initializeReader() {
    const titleEl = document.getElementById('reader-title');
    const contentEl = document.getElementById('reader-content');
    const pageIndicator = document.getElementById('page-indicator');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    // --- NEW: Get the Add to List button ---
    const addToListBtn = document.getElementById('add-to-list-btn');

    if (!titleEl || !addToListBtn) return; // Exit if we're not on the reader page

    let bookData = null;
    let currentPage = 0; // 0 is the title page

    try {
        // 1. Get Book from localStorage
        const bookJson = localStorage.getItem('generatedBook');
        if (!bookJson) {
            throw new Error("No book data found. Please generate a book first.");
        }
        
        bookData = JSON.parse(bookJson);
        // --- UPDATED: Check for new description field ---
        if (!bookData || !bookData.title || !bookData.pages || !bookData.description) {
             throw new Error("Invalid book data in storage. Please try generating a new book.");
        }

        // --- NEW: Check if book is already in My List ---
        const myListJson = localStorage.getItem('myBookList');
        if (myListJson) {
            const myList = JSON.parse(myListJson);
            // Check by title AND description to be safer (in case of duplicate titles)
            const isAlreadySaved = myList.some(book => book.title === bookData.title && book.description === bookData.description);
            if (isAlreadySaved) {
                addToListBtn.innerHTML = '<i data-feather="check" class="btn-icon"></i> Saved!';
                addToListBtn.disabled = true;
            }
        }
        // --- END OF NEW CHECK ---

        // 2. Initialize Reader
        updatePage();
        feather.replace(); // Render icons on buttons

    } catch (error) {
        console.error("Error loading book:", error);
        titleEl.textContent = "Error";
        contentEl.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        // Disable all buttons on error
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(addToListBtn) addToListBtn.disabled = true;
    }

    // 3. Page turning logic
    function updatePage() {
        if (!bookData) return;

        const totalPages = bookData.pages.length + 1; // +1 for title page

        titleEl.textContent = bookData.title;

        if (currentPage === 0) {
            // --- TITLE PAGE UPDATED ---
            contentEl.innerHTML = `
                <h1 style="text-align: center; margin-top: 4rem; font-size: 2.5rem; color: #333;">${bookData.title}</h1>
                <p style="text-align: center; font-size: 1.2rem; font-style: italic; margin-top: 1rem;">A ${bookData.genre || 'Story'}</p>
                
                <p style="text-align: center; font-size: 1rem; color: #555; max-width: 600px; margin: 2rem auto 0 auto;">
                    ${bookData.description}
                </p>
                <p style="text-align: center; color: #555; margin-top: 6rem;">Click "Next" to begin.</p>
            `;
            // --- END OF TITLE PAGE UPDATE ---
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

    // --- 5. Add to List logic ---
    addToListBtn.addEventListener('click', () => {
        if (!bookData) return; // No book data to save

        try {
            // Get existing list or create new one
            const myListJson = localStorage.getItem('myBookList');
            let myList = [];
            if (myListJson) {
                myList = JSON.parse(myListJson);
            }

            // Check if book (by title AND description) is already in the list
            const isAlreadySaved = myList.some(book => book.title === bookData.title && book.description === bookData.description);

            if (!isAlreadySaved) {
                
                // Create a placeholder cover URL if one doesn't exist
                if (!bookData.coverUrl) {
                    // Use the user's requested Unsplash method
                    const genreQuery = bookData.genre.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    bookData.coverUrl = `https://source.unsplash.com/300x450/?${genreQuery}`;
                }
                
                // Add the current bookData object to the list
                myList.push(bookData);
                localStorage.setItem('myBookList', JSON.stringify(myList));
            }

            // Provide feedback
            addToListBtn.innerHTML = '<i data-feather="check" class="btn-icon"></i> Saved!';
            addToListBtn.disabled = true;
            feather.replace(); // Rerender the new 'check' icon

        } catch (error) {
            console.error("Error saving book to list:", error);
            alert("There was an error saving your book.");
        }
    });
    // --- END OF NEW LOGIC ---
}

// ---
// ===============================================
//   NEW: MY LIST PAGE LOGIC
// ===============================================
// ---
function initializeMyList() {
    const container = document.getElementById('mylist-grid-container');
    if (!container) return;

    const myListJson = localStorage.getItem('myBookList');
    const myList = JSON.parse(myListJson || '[]');

    if (myList.length === 0) {
        container.innerHTML = `<p class="empty-list-message">Your list is empty. Go generate some books on the 'AIBOOK' page!</p>`;
        return;
    }

    let booksHtml = '';
    myList.forEach((book, index) => {
        // AI books don't have descriptions, so we'll just show the title.
        // We gave them a coverUrl when saving.
        booksHtml += `
            <div class="book-card clickable" data-index="${index}">
                <img src="${book.coverUrl}" alt="${book.title}">
                <div class="book-card-info">
                    <h3 class="book-card-title">${book.title}</h3>
                </div>
            </div>
        `;
    });

    container.innerHTML = booksHtml;

    // Add event listeners to each card
    container.querySelectorAll('.book-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
            const index = card.getAttribute('data-index');
            const bookToRead = myList[index];

            if (bookToRead) {
                // Set this book as the one to read
                localStorage.setItem('generatedBook', JSON.stringify(bookToRead));
                // Go to the reader page
                window.location.href = 'reader.html';
            }
        });
    });
}


// ---
// ===============================================
//   MAIN PAGE ROUTER (Runs on Load)
// ===============================================
// ---
document.addEventListener('DOMContentLoaded', () => {
    // Check the 'data-page' attribute on the <body> tag
    const page = document.body.dataset.page;

    if (page === 'home') {
        // --- This is the HOME page ---
        try {
            const featuredBook = bookDataHome[0].books[0]; 
            buildHero(featuredBook); 
        } catch (e) {
            console.error("Error building hero section:", e);
        }
        try {
            buildShelves(bookDataHome); 
        } catch (e) {
            console.error("Error building shelves:", e);
        }

    } else if (page === 'new-releases') {
        // --- This is the NEW RELEASES page ---
        try {
            const featuredBook = newReleasesList[0]; 
            buildHero(featuredBook);
        } catch (e) {
            console.error("Error building hero section:", e);
        }
        try {
            buildShelves(bookDataNewReleases); 
        } catch (e) {
            console.error("Error building shelves:", e);
        }
    } else if (page === 'reader') {
        // --- This is the new READER page ---
        try {
            initializeReader();
        } catch(e) {
            console.error("Error initializing reader:", e);
        }
    } else if (page === 'mylist') {
        // --- This is the new MY LIST page ---
        try {
            initializeMyList();
        } catch(e) {
            console.error("Error initializing my list:", e);
        }
    }
});

// ... (Top of app.js remains the same) ...

// ---
// ===============================================
//   NEW: MY LIST PAGE LOGIC
// ===============================================
// ---
function initializeMyList() {
    const container = document.getElementById('mylist-grid-container');
    if (!container) return;

    const myListJson = localStorage.getItem('myBookList');
    const myList = JSON.parse(myListJson || '[]');

    if (myList.length === 0) {
        container.innerHTML = `<p class="empty-list-message">Your list is empty. Go generate some books on the 'AIBOOK' page!</p>`;
        return;
    }

    let booksHtml = '';
    myList.forEach((book, index) => {
        // --- UPDATED HTML to include delete button ---
        booksHtml += `
            <div class="book-card clickable" data-index="${index}">
                <img src="${book.coverUrl}" alt="${book.title}">
                <div class="book-card-info">
                    <h3 class="book-card-title">${book.title}</h3>
                </div>
                <button class="btn-icon-round delete-book-btn" data-index="${index}" title="Delete Book">
                    <i data-feather="x"></i>
                </button>
            </div>
        `;
        // --- END OF UPDATE ---
    });

    container.innerHTML = booksHtml;
    feather.replace(); // Render the new 'x' icons

    // --- UPDATED Event Listener Logic (Event Delegation) ---
    container.addEventListener('click', (e) => {
        // Find the clicked element or its parent that is the button or card
        const deleteButton = e.target.closest('.delete-book-btn');
        const card = e.target.closest('.book-card');

        if (deleteButton) {
            // --- DELETE LOGIC ---
            e.stopPropagation(); // Stop the card click from firing
            const index = deleteButton.getAttribute('data-index');
            
            // Remove the book from the array
            myList.splice(index, 1);
            
            // Update localStorage
            localStorage.setItem('myBookList', JSON.stringify(myList));
            
            // Refresh the list display (simple way is to re-run the function)
            initializeMyList();

        } else if (card) {
            // --- READ BOOK LOGIC ---
            const index = card.getAttribute('data-index');
            const bookToRead = myList[index];

            if (bookToRead) {
                // Set this book as the one to read
                localStorage.setItem('generatedBook', JSON.stringify(bookToRead));
                // Go to the reader page
                window.location.href = 'reader.html';
            }
        }
    });
    // --- END OF UPDATED LOGIC ---
}


// ---
// ===============================================
//   MAIN PAGE ROUTER (Runs on Load)
// ===============================================
// ---
// ... (The router logic remains exactly the same as before) ...
document.addEventListener('DOMContentLoaded', () => {
    // Check the 'data-page' attribute on the <body> tag
    const page = document.body.dataset.page;

    if (page === 'home') {
        // --- This is the HOME page ---
        try {
            const featuredBook = bookDataHome[0].books[0]; 
            buildHero(featuredBook); 
        } catch (e) {
            console.error("Error building hero section:", e);
        }
        try {
            buildShelves(bookDataHome); 
        } catch (e) {
            console.error("Error building shelves:", e);
        }

    } else if (page === 'new-releases') {
        // --- This is the NEW RELEASES page ---
        try {
            const featuredBook = newReleasesList[0]; 
            buildHero(featuredBook);
        } catch (e) {
            console.error("Error building hero section:", e);
        }
        try {
            buildShelves(bookDataNewReleases); 
        } catch (e) {
            console.error("Error building shelves:", e);
        }
    } else if (page === 'reader') {
        // --- This is the new READER page ---
        try {
            initializeReader();
        } catch(e) {
            console.error("Error initializing reader:", e);
        }
    } else if (page === 'mylist') {
        // --- This is the new MY LIST page ---
        try {
            initializeMyList();
        } catch(e) {
            console.error("Error initializing my list:", e);
        }
    }
});