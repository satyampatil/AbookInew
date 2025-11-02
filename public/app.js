// --- DEFINE THE BOOK AS A REUSABLE OBJECT ---
// This makes it easy to move around
const romeoAndJulietBook = { 
    title: "Romeo and Juliet", 
    // --- UPDATED DESCRIPTION ---
    description: "",//`"Romeo and Juliet" by William Shakespeare is a tragedy likely written during the late 16th century. The play centers on the intense love affair between two young lovers, Romeo Montague and Juliet Capulet, whose families are embroiled in a bitter feud. Their love, while passionate and profound, is met with adversities that ultimately lead to tragic consequences. At the start of the play, a Prologue delivered by the Chorus sets the stage for the tale of forbidden love, revealing the familial conflict that surrounds Romeo and Juliet. The opening scenes depict a public brawl ignited by the feud between the Montagues and Capulets, showcasing the hostility that envelops their lives. As we are introduced to various characters such as Benvolio, Tybalt, and Mercutio, we learn of Romeo's unrequited love for Rosaline. However, this quickly changes when Romeo encounters Juliet at the Capulet ball, where they share a famous and romantic exchange, unwittingly falling in love with each other despite their families' bitter enmity. This initial encounter foreshadows the obstacles they will face as their love story unfolds amidst chaos and conflict.`,
    coverUrl: "books/romeo-and-juliet/romeo-and-juliet.jpg",
    readUrl: "books/romeo-and-juliet/romeo-and-juliet.html"
};
const MobyDick = { 
    title: "Moby Dick; Or, The Whale", 
    description: "A sailor's obsessive quest for revenge on a giant white whale.",
    coverUrl: "books/Moby-Dick/Moby-Dick.jpg",
    readUrl: "books/Moby-Dick/Moby-Dick.html"
};
const PrideandPrejudice = { 
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

// This object will hold all our "database"
const bookData = [
    {
        category: "Trending Now",
        books: [
            // --- IT WILL BE ADDED HERE BY THE CODE BELOW ---
        ]
    },
    {
        category: "Classic Literature", // Renamed from "Classic Tragedies"
        books: [
            { title: "Hamlet", coverUrl: "https://placehold.co/300x450/6c757d/FFFFFF?text=Hamlet" },
            { title: "Macbeth", coverUrl: "https://placehold.co/300x450/6c757d/FFFFFF?text=Macbeth" },
        ]
    },
    {
        category: "Fantasy Worlds",
        books: [
            { title: "Dragon's Peak", coverUrl: "https://placehold.co/300x450/5645E0/FFFFFF?text=Dragon's+Peak" },
            { title: "The Last Wizard", coverUrl: "https://placehold.co/300x450/62E49C/000000?text=The+Last+Wizard" },
            { title: "Shadow Gate", coverUrl: "https://placehold.co/300x450/9B27AF/FFFFFF?text=Shadow+Gate" },
            { title: "Elven Crown", coverUrl: "https://placehold.co/300x450/E50914/FFFFFF?text=Elven+Crown" },
            { title: "Sky Kingdom", coverUrl: "https://placehold.co/300x450/F8A00F/000000?text=Sky+Kingdom" },
            { title: "Shadow Gate", coverUrl: "https://placehold.co/300x450/9B27AF/FFFFFF?text=Shadow+Gate" },
        ]
    },
    {
        category: "Mystery & Thrillers",
        books: [
            { title: "The Silent Witness", coverUrl: "https://placehold.co/300x450/333333/FFFFFF?text=The+Silent+Witness" },
            { title: "Gone by Dawn", coverUrl: "https://placehold.co/300x450/A0A0A0/000000?text=Gone+by+Dawn" },
            { title: "Echo Park", coverUrl: "https://placehold.co/300x450/454545/FFFFFF?text=Echo+Park" },
            { title: "The Deep End", coverUrl: "https://placehold.co/300x450/C0C0C0/000000?text=The+Deep+End" },
        ]
    }
];

// --- ADD R&J TO THE START OF THE "TRENDING NOW" ARRAY ---
// bookData[0] is "Trending Now"
// .books is its list of books
// .unshift() adds an item to the beginning of the list
bookData[0].books.unshift(romeoAndJulietBook);
//keep it in classic tragedies category too
bookData[1].books.unshift(romeoAndJulietBook);
//book2
bookData[0].books.unshift(MobyDick);
bookData[1].books.unshift(MobyDick);
//book3
bookData[0].books.unshift(PrideandPrejudice);
bookData[1].books.unshift(PrideandPrejudice);
//book4
bookData[0].books.unshift(AdventuresinWonderland);
bookData[2].books.unshift(AdventuresinWonderland);


// --- NEW FUNCTION TO BUILD THE HERO SECTION ---
function buildHero(book) {
    const heroSection = document.querySelector('.hero-section');
    const heroContent = document.querySelector('.hero-content');
    if (!heroSection || !heroContent) return; // Safety check

    // Set the dynamic background image with a gradient
    // This uses the new CSS variable we'll add
    heroSection.style.backgroundImage = `
        linear-gradient(to right, 
            rgba(var(--bg-color-rgb), 0.9) 20%, 
            rgba(var(--bg-color-rgb), 0.6) 50%, 
            rgba(var(--bg-color-rgb), 0) 100%
        ),
        url('${book.coverUrl}')
    `;

    // Create the dynamic HTML content
    // We change the "Read Now" button to an <a> tag
    
    // --- Split the description for "Show More" ---
    const fullDesc = book.description;
    // Find the end of the second sentence to split
    const splitPoint = fullDesc.indexOf("a bitter feud.") + "a bitter feud.".length; 

    let heroHtml = '';

    if (splitPoint === -1 || fullDesc.length < 250) { // Safety check: if description is short, don't add "Show More"
        heroHtml = `
            <h1 class="hero-title">${book.title}</h1>
            <p class="hero-description">${fullDesc}</p>
        `;
    } else {
        const shortPart = fullDesc.substring(0, splitPoint);
        const morePart = fullDesc.substring(splitPoint);

        heroHtml = `
            <h1 class="hero-title">${book.title}</h1>
            <p class="hero-description" id="hero-desc">
                ${shortPart}<span class="more-desc">${morePart}</span>
            </p>
            <button class="btn-show-more" id="btn-desc-toggle">Show More</button>
        `;
    }

    // Add the buttons
    heroHtml += `
        <div class="hero-buttons">
            <a href="${book.readUrl}" target="_blank" class="btn btn-primary">
                <i data-feather="play" class="btn-icon"></i> Read Now
            </a>
            <button class="btn btn-secondary">
                <i data-feather="plus" class="btn-icon"></i> Add to List
            </button>
        </div>
    `;

    // Add the HTML to the page
    heroContent.innerHTML = heroHtml;

    // --- Add event listener for "Show More" button ---
    const descToggle = document.getElementById('btn-desc-toggle');
    const desc = document.getElementById('hero-desc');
    
    if (descToggle && desc) { // Only add listener if the button exists
        descToggle.addEventListener('click', () => {
            if (desc.classList.contains('expanded')) {
                desc.classList.remove('expanded');
                descToggle.textContent = 'Show More';
            } else {
                desc.classList.add('expanded');
                descToggle.textContent = 'Show Less';
            }
        });
    }

    // Re-run Feather icons to render the new icons in the button
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}
// --- END OF NEW FUNCTION ---


// This function runs when the page loads
function buildShelves() {
    const shelvesContainer = document.getElementById('book-shelves-container');
    if (!shelvesContainer) return; // Stop if the container isn't found

    let allShelvesHtml = '';

    // Loop through each category in our data
    bookData.forEach(category => {
        let booksHtml = '';
        
        // Loop through each book in the category
        category.books.forEach(book => {
            
            // We'll add the readUrl as a 'data-read-url' attribute
            // We'll also add a 'clickable' class if the book has a URL
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

        // Build the HTML for this entire category shelf
        allShelvesHtml += `
            <div class="category-shelf">
                <h2 class="category-title">${category.category}</h2>
                <div class="book-scroll-container">
                    ${booksHtml}
                </div>
            </div>
        `;
    });

    // Add all the generated HTML to the page at once
    shelvesContainer.innerHTML = allShelvesHtml;

    // Now that the HTML is on the page, add click listeners
    document.querySelectorAll('.book-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-read-url');
            if (url) {
                // Open the book's URL in a new tab
                window.open(url, '_blank');
            }
        });
    });
}

// Wait for the HTML document to be fully loaded before running our script
document.addEventListener('DOMContentLoaded', () => {
    // --- UPDATED TO BUILD BOTH SECTIONS ---
    try {
        // Get the first book from "Trending Now" to feature
        const featuredBook = bookData[0].books[0];
        buildHero(featuredBook); // Build the hero section
    } catch (e) {
        console.error("Error building hero section:", e);
    }
    
    try {
        buildShelves(); // Build the book shelves
    } catch (e) {
        console.error("Error building shelves:", e);
    }
});



