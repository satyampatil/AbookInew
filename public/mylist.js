// --- MY LIST PAGE LOGIC ---

function initializeMyList() {
    // Use the container ID from mylist.html
    const container = document.getElementById('book-shelves-container');
    if (!container) return;

    const myListJson = localStorage.getItem('myBookList');
    const myList = JSON.parse(myListJson || '[]');

    // Handle Empty List
    if (myList.length === 0) {
        container.innerHTML = `<p class="empty-list-message">Your list is empty. Go generate some books on the 'AIBOOK' page!</p>`;
        return;
    }

    // --- 1. Group Books by Genre ---
    const groupedByGenre = {};
    myList.forEach(book => {
        const genre = book.genre || "Uncategorized"; // Fallback genre
        if (!groupedByGenre[genre]) {
            groupedByGenre[genre] = [];
        }
        groupedByGenre[genre].push(book);
    });

    // --- 2. Build Shelves HTML ---
    let allShelvesHtml = '';
    // Get genres and sort them alphabetically
    const genres = Object.keys(groupedByGenre).sort(); 

    genres.forEach(genre => {
        allShelvesHtml += `
            <div class="category-shelf">
                <h2 class="category-title">${genre}</h2>
                <div class="book-scroll-container">
        `;

        // Get the books for this genre and REVERSE them to show newest first
        const booksInGenre = groupedByGenre[genre];
        let booksHtml = ''; 
        booksInGenre.reverse().forEach(book => {
            // Use title and description as unique IDs for matching
            const safeTitle = book.title.replace(/"/g, '&quot;');
            const safeDesc = book.description.replace(/"/g, '&quot;');

            booksHtml += `
                <div class="book-card clickable" 
                     data-book-title="${safeTitle}" 
                     data-book-description="${safeDesc}">
                    
                    <img src="${book.coverUrl}" alt="${book.title}" onerror="this.src='https://placehold.co/300x450/1a1a1a/f5f5f5?text=Image+Error&font=inter'">
                    <div class="book-card-info">
                        <h3 class="book-card-title">${book.title}</h3>
                    </div>
                    
                    <button class="btn-icon-round delete-book-btn" 
                            title="Delete Book"
                            data-book-title="${safeTitle}" 
                            data-book-description="${safeDesc}">
                        <i data-feather="x"></i>
                    </button>
                </div>
            `;
        });

        allShelvesHtml += booksHtml; // Add this genre's books
        allShelvesHtml += `</div></div>`; // Close scroll-container and category-shelf
    });

    container.innerHTML = allShelvesHtml;
    
    // Run Feather icons for the new 'x' buttons
    if (typeof feather !== 'undefined') {
        feather.replace(); 
    }

    // --- 3. Add Event Listeners ---
    container.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-book-btn');
        const card = e.target.closest('.book-card.clickable');

        // Get the full list from localStorage again for accuracy
        const currentMyListJson = localStorage.getItem('myBookList');
        let currentMyList = JSON.parse(currentMyListJson || '[]');

        if (deleteButton) {
            // --- DELETE LOGIC ---
            e.stopPropagation(); // Stop the card click from firing
            const title = deleteButton.getAttribute('data-book-title');
            const description = deleteButton.getAttribute('data-book-description');

            // Find the index of the book to delete
            const indexToDelete = currentMyList.findIndex(book => 
                book.title === title && book.description === description
            );

            if (indexToDelete > -1) {
                currentMyList.splice(indexToDelete, 1);
                localStorage.setItem('myBookList', JSON.stringify(currentMyList));
                initializeMyList(); // Re-render the list recursively
            }

        } else if (card) {
            // --- READ BOOK LOGIC ---
            const title = card.getAttribute('data-book-title');
            const description = card.getAttribute('data-book-description');
            
            const bookToRead = currentMyList.find(book => 
                book.title === title && book.description === description
            );

            if (bookToRead) {
                // Set this book as the one to read
                localStorage.setItem('generatedBook', JSON.stringify(bookToRead));
                // Go to the reader page
                window.location.href = 'reader.html';
            }
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'mylist') {
        initializeMyList();
    }
});