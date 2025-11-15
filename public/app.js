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

    if (!titleEl) return; // Exit if we're not on the reader page

    let bookData = null;
    let currentPage = 0; // 0 is the title page

    try {
        // 1. Get Book from localStorage
        const bookJson = localStorage.getItem('generatedBook');
        if (!bookJson) {
            throw new Error("No book data found. Please generate a book first.");
        }
        
        bookData = JSON.parse(bookJson);
        if (!bookData || !bookData.title || !bookData.pages) {
             throw new Error("Invalid book data in storage.");
        }

        // 2. Initialize Reader
        updatePage();
        feather.replace(); // Render icons on buttons

    } catch (error) {
        console.error("Error loading book:", error);
        titleEl.textContent = "Error";
        contentEl.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
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
                <p style="text-align: center; color: #555; margin-top: 8rem;">Click "Next" to begin.</p>
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
    }
});