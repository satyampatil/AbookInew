// --- NEW RELEASES PAGE LOGIC ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc } 
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
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-book-app';

async function initializeNewReleases() {
    const heroContent = document.querySelector('.hero-content');
    const shelvesContainer = document.getElementById('book-shelves-container');

    if (!shelvesContainer) return;

    if (heroContent) heroContent.innerHTML = '<h1>Loading New Releases...</h1>';
    
    try {
        const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
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

        const featuredBook = publicBooks[0];
        if (heroContent) buildHero(featuredBook);

        buildShelves(shelvesContainer, publicBooks);

    } catch (error) {
        console.error("Error loading public books:", error);
        if (heroContent) heroContent.innerHTML = `<h1>Error Loading</h1><p>${error.message}</p>`;
    }
}

function getRatingValues(ratingsData) {
    if (!ratingsData) return [];
    if (Array.isArray(ratingsData)) return ratingsData; 
    return Object.values(ratingsData); 
}

function safeEscape(obj) {
    return JSON.stringify(obj).replace(/"/g, '&quot;').replace(/'/g, "&#39;");
}

// --- ANIMATION HELPER ---
function triggerStarAnimation(cardElement, ratingValue) {
    const overlay = document.createElement('div');
    overlay.className = 'star-celebration-overlay';
    
    // Position configuration for a rounder arc
    // tx: horizontal translate, ty: vertical translate (positive is down)
    const positions = {
        1: { tx: '-70px', ty: '40px', rot: '-30deg' }, // Far Left
        2: { tx: '-35px', ty: '10px', rot: '-15deg' }, // Mid Left
        3: { tx: '0px',   ty: '0px',  rot: '0deg' },   // Center (Pop only)
        4: { tx: '35px',  ty: '10px', rot: '15deg' },  // Mid Right
        5: { tx: '70px',  ty: '40px', rot: '30deg' }   // Far Right
    };

    // Determine active stars based on rating
    let activeIndices = [];
    switch (ratingValue) {
        case 1: activeIndices = [3]; break;
        case 2: activeIndices = [2, 4]; break;          // Mid-Left, Mid-Right (Skip center)
        case 3: activeIndices = [2, 3, 4]; break;
        case 4: activeIndices = [1, 2, 4, 5]; break;    // Outer/Mid Left & Right (Skip center)
        case 5: activeIndices = [1, 2, 3, 4, 5]; break;
        default: activeIndices = [3];
    }

    let html = '';
    // Loop through all potential 5 positions
    for(let i=1; i<=5; i++) {
        if (activeIndices.includes(i)) {
            // Only pop the middle star (index 3) if it is active
            let animClass = (i === 3) ? 'pop' : 'emerge';
            
            // For even ratings (2, 4), index 3 is NOT active, so all active stars use 'emerge'
            // This looks nicer as they fan out without a center anchor
            
            const pos = positions[i];
            // Inject CSS vars for the specific trajectory
            const style = `--tx: ${pos.tx}; --ty: ${pos.ty}; --rot: ${pos.rot};`;
            
            html += `<i data-feather="star" class="anim-star ${animClass}" style="${style}"></i>`;
        }
    }
    overlay.innerHTML = html;
    
    cardElement.appendChild(overlay);
    
    if (typeof feather !== 'undefined') feather.replace();
    
    setTimeout(() => { overlay.remove(); }, 2000);
}

function buildHero(book) {
    const heroSection = document.querySelector('.hero-section');
    const heroContent = document.querySelector('.hero-content');
    
    if (heroSection) {
        heroSection.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0, 0.9) 20%, rgba(0,0,0, 0.7) 50%, rgba(0,0,0, 0.2) 100%), url('${book.coverUrl}')`;
    }

    const descriptionShort = book.description ? (book.description.length > 150 ? book.description.substring(0, 150) + '...' : book.description) : 'No description available.';
    const safeData = safeEscape(book);
    const ratingValues = getRatingValues(book.ratings);
    const avgRating = ratingValues.length > 0 ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) : 0;
    const starCount = Math.round(avgRating);
    
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        const isFilled = i <= starCount;
        const style = `width:20px; height:20px; margin-right:2px; ${isFilled ? 'fill: #FFD700; color: #FFD700;' : 'color: #888;'}`;
        starsHtml += `<i data-feather="star" style="${style}" class="hero-star"></i>`;
    }

    const heroRatingHtml = `
        <div class="rating-container" 
             data-firestore-id="${book.firestoreId}" 
             style="margin-bottom: 1.5rem; justify-content: flex-start; cursor: default;">
            ${starsHtml}
            <span class="rating-text" style="font-size: 1rem; color: #ddd;">(${ratingValues.length} votes)</span>
        </div>
    `;

    heroContent.innerHTML = `
        <span class="badge">Featured Release</span>
        <h1 class="hero-title">${book.title}</h1>
        <p class="hero-description">${descriptionShort}</p>
        ${heroRatingHtml}
        <p class="hero-author">By ${book.authorName || 'Unknown Author'}</p>
        <div class="hero-buttons">
            <button class="btn btn-primary read-public-btn" data-book-json='${safeData}'>
                <i data-feather="book-open" class="btn-icon"></i> Read Now
            </button>
        </div>
    `;
    
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
    let html = `<div class="category-shelf"><h2 class="category-title">${title}</h2><div class="book-grid">`;

    books.forEach(book => {
        const safeData = safeEscape(book);
        const ratingValues = getRatingValues(book.ratings);
        const avgRating = ratingValues.length > 0 ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) : 0;
        const starCount = Math.round(avgRating);
        
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const starClass = i <= starCount ? 'filled' : 'empty';
            starsHtml += `<i data-feather="star" class="rate-star ${starClass}" data-value="${i}"></i>`;
        }

        html += `
            <div class="book-card clickable read-public-card" data-book-json='${safeData}'>
                <img src="${book.coverUrl}" alt="${book.title}" onerror="this.src='https://placehold.co/300x450/1a1a1a/f5f5f5?text=Image+Error&font=inter'">
                <div class="book-card-info">
                    <h3 class="book-card-title">${book.title}</h3>
                    <p style="font-size:0.8rem; color:#888; margin-bottom:5px;">${book.genre || 'Story'}</p>
                    <div class="rating-container" data-firestore-id="${book.firestoreId}" title="${ratingValues.length} votes">
                        ${starsHtml}
                        <span class="rating-text">(${ratingValues.length})</span>
                    </div>
                </div>
            </div>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();

    const cards = container.querySelectorAll('.read-public-card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.rating-container')) return;
            const json = card.getAttribute('data-book-json');
            if (json) {
                localStorage.setItem('generatedBook', json);
                window.location.href = 'reader.html';
            }
        });
    });

    const starContainers = container.querySelectorAll('.rating-container');
    starContainers.forEach((starContainer, idx) => {
        const book = books[idx]; 
        const stars = starContainer.querySelectorAll('.rate-star');
        const firestoreId = starContainer.dataset.firestoreId;

        // --- HOVER LOGIC FOR STARS ---
        stars.forEach(star => {
            const starValue = parseInt(star.dataset.value);

            // Hover In: Fill up to this star
            star.addEventListener('mouseover', () => {
                stars.forEach((s, index) => {
                    if (index < starValue) {
                        s.classList.add('filled'); s.classList.remove('empty');
                        s.style.fill = '#FFD700'; s.style.color = '#FFD700';
                    } else {
                        s.classList.remove('filled'); s.classList.add('empty');
                        s.style.fill = 'none'; s.style.color = '#666';
                    }
                });
            });
        });

        // Hover Out: Reset to actual rating
        starContainer.addEventListener('mouseleave', () => {
            const currentRatingValues = getRatingValues(book.ratings);
            const currentAvg = currentRatingValues.length > 0 ? (currentRatingValues.reduce((a, b) => a + b, 0) / currentRatingValues.length) : 0;
            const currentStarCount = Math.round(currentAvg);

            stars.forEach((s, index) => {
                if (index < currentStarCount) {
                    s.classList.add('filled'); s.classList.remove('empty');
                    s.style.fill = '#FFD700'; s.style.color = '#FFD700';
                } else {
                    s.classList.remove('filled'); s.classList.add('empty');
                    s.style.fill = 'none'; s.style.color = '#666';
                }
            });
        });

        // Click: Submit Rating
        stars.forEach(star => {
            star.addEventListener('click', async (e) => {
                e.stopPropagation(); 
                const user = auth.currentUser;
                if (!user) { alert("Please log in to rate books."); return; }
                
                const ratingValue = parseInt(star.dataset.value);
                if (!book.ratings) book.ratings = {};
                if (!Array.isArray(book.ratings)) book.ratings[user.uid] = ratingValue;
                
                // --- TRIGGER ANIMATION ---
                const cardElement = starContainer.closest('.book-card');
                if (cardElement) triggerStarAnimation(cardElement, ratingValue);

                const updateVisuals = (containerElement, value, count) => {
                    const containerStars = containerElement.querySelectorAll('i'); 
                    containerStars.forEach((s, index) => {
                        if (index < value) {
                            s.classList.add('filled'); s.classList.remove('empty');
                            s.style.fill = '#FFD700'; s.style.color = '#FFD700';
                        } else {
                            s.classList.remove('filled'); s.classList.add('empty');
                            s.style.fill = 'none'; s.style.color = '#666';
                        }
                    });
                    const textSpan = containerElement.querySelector('.rating-text');
                    if (textSpan) textSpan.textContent = `(${count} votes)`; 
                };

                const currentCount = Array.isArray(book.ratings) ? book.ratings.length : Object.keys(book.ratings).length;
                updateVisuals(starContainer, ratingValue, currentCount);

                const heroContainer = document.querySelector('.hero-content .rating-container');
                if (heroContainer && heroContainer.dataset.firestoreId === firestoreId) {
                    // Update hero too if it matches
                    updateVisuals(heroContainer, ratingValue, Object.keys(book.ratings).length);
                }

                try {
                    const bookRef = doc(db, 'artifacts', appId, 'public', 'data', 'books', firestoreId);
                    const updateData = {};
                    updateData[`ratings.${user.uid}`] = ratingValue;
                    await updateDoc(bookRef, updateData);
                } catch (err) {
                    console.error("Error rating book:", err);
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'new-releases') initializeNewReleases();
});