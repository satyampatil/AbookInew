// --- NEW RELEASES PAGE LOGIC ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit } 
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
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-book-app';

async function initializeNewReleases() {
    const heroContent = document.querySelector('.hero-content');
    const shelvesContainer = document.getElementById('book-shelves-container');

    if (!shelvesContainer) return;

    // Show loading state
    if (heroContent) heroContent.innerHTML = '<h1>Loading New Releases...</h1>';
    
    try {
        // Fetch Public Books
        const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
        
        // Fetch everything and sort in JavaScript to handle missing timestamps
        const querySnapshot = await getDocs(booksRef);

        const publicBooks = [];
        querySnapshot.forEach((doc) => {
            publicBooks.push({ ...doc.data(), firestoreId: doc.id });
        });

        // Sort: Newest First
        publicBooks.sort((a, b) => {
             const tA = a.createdAt?.seconds || 0;
             const tB = b.createdAt?.seconds || 0;
             return tB - tA;
        });

        if (publicBooks.length === 0) {
            if (heroContent) heroContent.innerHTML = '<h1>No Public Books Yet</h1><p>Be the first to publish one from your list!</p>';
            shelvesContainer.innerHTML = '';
            return;
        }

        // --- 1. Build Hero (First Book) ---
        const featuredBook = publicBooks[0];
        if (heroContent) buildHero(featuredBook);

        // --- 2. Build List (All Books) ---
        buildShelves(shelvesContainer, publicBooks);

    } catch (error) {
        console.error("Error loading public books:", error);
        if (heroContent) heroContent.innerHTML = `<h1>Error Loading</h1><p>${error.message}</p>`;
    }
}

// Helper to safely escape JSON for HTML attributes
function safeEscape(obj) {
    return JSON.stringify(obj)
        .replace(/"/g, '&quot;')
        .replace(/'/g, "&#39;");
}

function buildHero(book) {
    const heroSection = document.querySelector('.hero-section');
    const heroContent = document.querySelector('.hero-content');
    
    if (heroSection) {
        // Use cover as background
        heroSection.style.backgroundImage = `
            linear-gradient(to right, 
                rgba(0,0,0, 0.9) 20%, 
                rgba(0,0,0, 0.7) 50%, 
                rgba(0,0,0, 0.2) 100%
            ),
            url('${book.coverUrl}')
        `;
    }

    const descriptionShort = book.description ? 
        (book.description.length > 150 ? book.description.substring(0, 150) + '...' : book.description) 
        : 'No description available.';

    // Use safeEscape here
    const safeData = safeEscape(book);

    heroContent.innerHTML = `
        <span class="badge">Featured Release</span>
        <h1 class="hero-title">${book.title}</h1>
        <p class="hero-description">${descriptionShort}</p>
        <p class="hero-author">By ${book.authorName || 'Unknown Author'}</p>
        <div class="hero-buttons">
            <button class="btn btn-primary read-public-btn" 
                    data-book-json='${safeData}'>
                <i data-feather="book-open" class="btn-icon"></i> Read Now
            </button>
        </div>
    `;
    
    // Add event listener to the hero button
    const heroBtn = heroContent.querySelector('.read-public-btn');
    if(heroBtn) {
        heroBtn.addEventListener('click', () => {
            const json = heroBtn.getAttribute('data-book-json');
            if (json) {
                localStorage.setItem('generatedBook', json);
                window.location.href = 'reader.html';
            }
        });
    }

    if (typeof feather !== 'undefined') feather.replace();
}

function buildShelves(container, books) {
    const title = books.length > 1 ? `Community Creations (${books.length})` : "Community Creations";

    let html = `
        <div class="category-shelf">
            <h2 class="category-title">${title}</h2>
            <div class="book-grid">
    `;

    books.forEach(book => {
        // --- FIX: Escape BOTH single and double quotes ---
        // This prevents titles like "The Titan's Web" from breaking the HTML attribute
        const safeData = safeEscape(book);

        html += `
            <div class="book-card clickable read-public-card" data-book-json='${safeData}'>
                <img src="${book.coverUrl}" alt="${book.title}" onerror="this.src='https://placehold.co/300x450/1a1a1a/f5f5f5?text=Image+Error&font=inter'">
                <div class="book-card-info">
                    <h3 class="book-card-title">${book.title}</h3>
                    <p style="font-size:0.8rem; color:#888;">${book.genre || 'Story'}</p>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;

    // Add click listeners
    const cards = container.querySelectorAll('.read-public-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const json = card.getAttribute('data-book-json');
            if (json) {
                localStorage.setItem('generatedBook', json);
                window.location.href = 'reader.html';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'new-releases') {
        initializeNewReleases();
    }
});