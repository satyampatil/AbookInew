// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Get All Form Elements ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupButton = document.getElementById('show-signup');
    const showLoginButton = document.getElementById('show-login');

    // --- Get All Book Animation Elements ---
    const bookContainer = document.getElementById('book-anim-container');
    const allPages = document.querySelectorAll('.page');
    const writingPen = document.getElementById('writing-pen'); // NEW: Get the pen
    
    // --- Get Form Inputs ---
    const loginInputs = [
        document.getElementById('login-email'),
        document.getElementById('login-password')
    ];
    const signupInputs = [
        document.getElementById('signup-name'),
        document.getElementById('signup-email'),
        document.getElementById('signup-password')
    ];
    // Combine all inputs for easy event handling
    const allInputs = [...loginInputs, ...signupInputs];

    // --- Helper Function: Flip a specific page ---
    function flipPage(pageIndex) {
        if (allPages[pageIndex]) {
            allPages[pageIndex].classList.add('page-flipped');
        }
        // Flip preceding pages too, just in case
        for (let i = 0; i < pageIndex; i++) {
            if (allPages[i]) allPages[i].classList.add('page-flipped');
        }
    }

    // --- Helper Function: Unflip all pages ---
    function unflipAllPages() {
        allPages.forEach(page => {
            page.classList.remove('page-flipped');
        });
    }

    // --- NEW: Pen Animation Helper Functions ---
    let writingTimeout = null;

    function showPen() {
        if (writingPen) {
            writingPen.classList.add('visible');
        }
    }

    function startWriting() {
        if (!writingPen) return;
        writingPen.classList.add('is-writing');
        
        // Clear any existing timer
        if (writingTimeout) {
            clearTimeout(writingTimeout);
        }

        // Set a timer to stop writing after 500ms
        writingTimeout = setTimeout(stopWriting, 500);
    }

    function stopWriting(force = false) {
        if (writingTimeout || force) {
            clearTimeout(writingTimeout);
            writingTimeout = null;
            writingPen?.classList.remove('is-writing');
        }
    }
    // --- END: Pen Animation Helper Functions ---


    // --- 1. Form Toggle Logic ---
    if (loginForm && signupForm && showSignupButton && showLoginButton) {
        
        showSignupButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            unflipAllPages(); // Flip pages back
            stopWriting(true); // Hide pen
        });

        showLoginButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
            unflipAllPages(); // Flip pages back
            stopWriting(true); // Hide pen
        });
    }

    // --- 2. Book Animation Logic ---
    if (bookContainer && loginForm && signupForm && allPages.length > 0) {
        
        // On Page Load: Pop up and open the book
        setTimeout(() => {
            bookContainer.classList.add('loaded');
        }, 100);

        // Add page flip listeners to inputs
        loginInputs[0]?.addEventListener('focus', () => { flipPage(0); showPen(); });
        loginInputs[1]?.addEventListener('focus', () => { flipPage(1); showPen(); });
        
        signupInputs[0]?.addEventListener('focus', () => { flipPage(0); showPen(); });
        signupInputs[1]?.addEventListener('focus', () => { flipPage(1); showPen(); });
        signupInputs[2]?.addEventListener('focus', () => { flipPage(2); showPen(); });

        // NEW: Add writing listeners to all inputs
        allInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', startWriting);
            }
        });

        // On Submit: Play the "closing" animation
        function playCloseAnimation(event) {
            event.preventDefault();
            
            // Stop pen animation
            stopWriting(true);

            // Add the .closing class to trigger the CSS animations
            bookContainer.classList.add('closing');

            // Wait for the animation to finish
            setTimeout(() => {
                event.target.submit();
            }, 1800); 
        }

        loginForm.addEventListener('submit', playCloseAnimation);
        signupForm.addEventListener('submit', playCloseAnimation);
    }

    // Run Feather icons to render any icons on this page
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});