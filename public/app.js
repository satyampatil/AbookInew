// --- HOME PAGE LOGIC (DYNAMIC) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { updateNavUser } from "./nav.js";

// Firebase Config
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

// Store all books for client-side search
let allBooksCache = [];
let defaultShelvesData = [];

// --- HELPER: Calculate Ratings ---
function getRatingStats(ratings) {
    if (!ratings) return { avg: 0, count: 0 };
    const values = Array.isArray(ratings) ? ratings : Object.values(ratings);
    if (values.length === 0) return { avg: 0, count: 0 };
    
    const sum = values.reduce((a, b) => a + b, 0);
    return {
        avg: sum / values.length,
        count: values.length
    };
}

// --- HELPER: Safe JSON Escape for HTML Attributes ---
function safeEscape(obj) {
    return JSON.stringify(obj)
        .replace(/"/g, '&quot;')
        .replace(/'/g, "&#39;");
}

// --- MAIN FETCH LOGIC ---
async function loadHomePage() {
    const heroContent = document.querySelector('.hero-content');
    
    // Initial Loading State
    if (heroContent) heroContent.innerHTML = '<h1>Curating Best Books...</h1>';

    try {
        const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
        const querySnapshot = await getDocs(booksRef);

        allBooksCache = []; // Reset cache
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const stats = getRatingStats(data.ratings);
            allBooksCache.push({
                ...data,
                firestoreId: doc.id,
                avgRating: stats.avg,
                ratingCount: stats.count,
                timestamp: data.createdAt?.seconds || 0
            });
        });

        if (allBooksCache.length === 0) {
            if (heroContent) heroContent.innerHTML = `
                <h1 class="hero-title">Welcome to Abooki</h1>
                <p class="hero-description">The library is empty. Be the first to write history!</p>
                <div class="hero-buttons">
                    <a href="aibook.html" class="btn btn-primary">Create Book</a>
                </div>
            `;
            return;
        }

        // --- FILTERING CATEGORIES ---
        const topRated = [...allBooksCache]
            .filter(b => b.avgRating >= 4.0)
            .sort((a, b) => {
                if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
                return b.ratingCount - a.ratingCount;
            });

        const mostPopular = [...allBooksCache]
            .sort((a, b) => b.ratingCount - a.ratingCount)
            .slice(0, 8);

        const newArrivals = [...allBooksCache]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 8);

        // --- BUILD HERO SECTION ---
        // Prioritize top rated, otherwise newest
        const heroBook = topRated.length > 0 ? topRated[0] : newArrivals[0];
        buildHero(heroBook);

        // --- PREPARE DEFAULT SHELVES ---
        defaultShelvesData = [];
        if (topRated.length > 0) defaultShelvesData.push({ category: "⭐ 5-Star Masterpieces", books: topRated.slice(0, 8) });
        if (mostPopular.length > 0) defaultShelvesData.push({ category: "🔥 Community Hits", books: mostPopular });
        if (newArrivals.length > 0) defaultShelvesData.push({ category: "✨ Fresh Arrivals", books: newArrivals });

        buildShelves(defaultShelvesData);
        
        // Setup Search Listener
        setupSearch();
        
        // Setup Continue Reading
        checkContinueReading();

    } catch (error) {
        console.error("Error loading home:", error);
        if (heroContent) heroContent.innerHTML = `<h1>System Offline</h1><p>Could not load library data.</p>`;
    }
}

// --- SEARCH FUNCTIONALITY ---
function setupSearch() {
    const input = document.getElementById('home-search-input');
    if (!input) return;

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        if (!term) {
            buildShelves(defaultShelvesData);
            return;
        }

        const results = allBooksCache.filter(book => 
            book.title.toLowerCase().includes(term) || 
            (book.authorName && book.authorName.toLowerCase().includes(term))
        );

        if (results.length > 0) {
            buildShelves([{ category: `Search Results (${results.length})`, books: results }]);
        } else {
            const container = document.getElementById('book-shelves-container');
            container.innerHTML = `<div style="text-align:center; padding:3rem; color:#666;">No books found matching "${term}"</div>`;
        }
    });
}

// --- CONTINUE READING LOGIC ---
function checkContinueReading() {
    const container = document.getElementById('continue-reading-container');
    if (!container) return;

    try {
        const savedBook = localStorage.getItem('generatedBook');
        if (savedBook) {
            const bookData = JSON.parse(savedBook);
            
            // Only show if we have a title (valid book)
            if (bookData.title) {
                container.innerHTML = `
                    <div class="continue-card">
                        <div class="continue-info">
                            <h3>Continue Reading</h3>
                            <p>${bookData.title}</p>
                        </div>
                        <a href="reader.html" class="btn btn-primary continue-btn">
                            Jump Back In <i data-feather="arrow-right" style="margin-left:5px; width:16px;"></i>
                        </a>
                    </div>
                `;
                if (typeof feather !== 'undefined') feather.replace();
                container.style.display = 'block';
            }
        }
    } catch (e) {
        console.log("No valid continue reading data found.");
    }
}

// --- RENDER HERO ---
function buildHero(book) {
    const heroSection = document.querySelector('.hero-section');
    const heroContent = document.querySelector('.hero-content');
    if (!heroSection || !heroContent) return; 

    heroSection.style.backgroundImage = `
        linear-gradient(to right, 
            rgba(17, 17, 17, 0.95) 30%, 
            rgba(17, 17, 17, 0.7) 60%, 
            rgba(17, 17, 17, 0.2) 100%
        ),
        url('${book.coverUrl || 'https://placehold.co/1200x600/1a1a1a/FFF?text=No+Cover'}')
    `;
    
    // Safe Encode for HTML Attribute
    const safeData = safeEscape(book);

    const stars = Math.round(book.avgRating);
    let starsHtml = '';
    for(let i=0; i<5; i++) {
        starsHtml += `<i data-feather="star" style="width:18px; height:18px; fill:${i<stars?'#FFD700':'none'}; color:${i<stars?'#FFD700':'#666'}"></i>`;
    }

    const heroHtml = `
        <span class="badge" style="background:#FFD700; color:#000; margin-bottom:1rem; display:inline-block; padding:4px 8px; font-weight:bold; border-radius:4px;">
            Editor's Choice
        </span>
        <h1 class="hero-title" style="font-size:3.5rem; line-height:1.1;">${book.title}</h1>
        <div style="display:flex; align-items:center; gap:5px; margin: 10px 0 20px 0;">
            ${starsHtml}
            <span style="color:#888; font-size:0.9rem; margin-left:10px;">(${book.ratingCount} reviews)</span>
        </div>
        <p class="hero-description" style="font-size:1.1rem; color:#ccc; max-width:600px; line-height:1.6;">
            ${book.description ? (book.description.length > 150 ? book.description.substring(0,150)+'...' : book.description) : 'No description available.'}
        </p>
        <p style="color:#888; font-style:italic; margin-bottom:2rem;">By ${book.authorName || 'Unknown Author'}</p>
        
        <div class="hero-buttons">
            <button class="btn btn-primary read-book-btn" data-book='${safeData}'>
                <i data-feather="book-open" class="btn-icon"></i> Start Reading
            </button>
        </div>
    `;

    heroContent.innerHTML = heroHtml;
    
    const btn = heroContent.querySelector('.read-book-btn');
    if(btn) {
        btn.addEventListener('click', () => {
            try {
                const data = JSON.parse(btn.getAttribute('data-book'));
                // Force Public View flag
                data.isPublicView = true;
                localStorage.setItem('generatedBook', JSON.stringify(data));
                window.location.href = 'reader.html';
            } catch(e) {
                console.error("Error opening book", e);
                alert("Could not open this book.");
            }
        });
    }

    if (typeof feather !== 'undefined') feather.replace();
}

// --- RENDER SHELVES ---
function buildShelves(categories) {
    const shelvesContainer = document.getElementById('book-shelves-container');
    if (!shelvesContainer) return; 

    let html = '';

    categories.forEach(cat => {
        let booksHtml = '';
        cat.books.forEach(book => {
            
            const safeData = safeEscape(book);

            const stars = Math.round(book.avgRating);
            let starIcons = '';
            for(let i=0; i<1; i++) { 
                starIcons += `<i data-feather="star" style="width:12px; height:12px; fill:#FFD700; color:#FFD700"></i>`;
            }

            booksHtml += `
                <div class="book-card clickable read-book-card" data-book='${safeData}'>
                    <img src="${book.coverUrl}" alt="${book.title}" onerror="this.src='https://placehold.co/200x300/222/FFF?text=No+Image'">
                    <div class="book-card-info">
                        <h3 class="book-card-title">${book.title}</h3>
                        <p style="font-size:0.75rem; color:#aaa; margin-top:2px; font-style:italic;">By ${book.authorName || 'Unknown'}</p>
                        <div style="display:flex; align-items:center; gap:5px; margin-top:5px; font-size:0.8rem; color:#ccc;">
                            ${starIcons} <span>${book.avgRating.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="category-shelf">
                <h2 class="category-title">${cat.category}</h2>
                <div class="book-scroll-container">
                    ${booksHtml}
                </div>
            </div>
        `;
    });

    shelvesContainer.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();

    const cards = document.querySelectorAll('.read-book-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            try {
                const data = JSON.parse(card.getAttribute('data-book'));
                // Force Public View flag
                data.isPublicView = true;
                localStorage.setItem('generatedBook', JSON.stringify(data));
                window.location.href = 'reader.html';
            } catch(e) {
                console.error("Error opening book", e);
            }
        });
    });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;

    onAuthStateChanged(auth, (user) => {
        updateNavUser(user);
    });

    if (page === 'home') {
        loadHomePage();
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