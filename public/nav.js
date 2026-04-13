// --- Shared Navigation Logic ---
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; 
import { generateGhostAvatar } from "./avatar-generator.js"; 

/**
 * Updates the navigation profile icon based on auth state.
 * @param {Object|null} user - The Firebase User object or null.
 */
export async function updateNavUser(user) {
    const isSignedIn = Boolean(user && !user.isAnonymous);
    document.body.classList.toggle('user-signed-in', isSignedIn);
    document.body.classList.add('nav-auth-resolved');
    document.querySelectorAll('a[href="mylist.html"]').forEach((link) => {
        const navItem = link.closest('li') || link;
        navItem.classList.add('nav-mylist-item', 'nav-auth-placeholder');
    });

    const profileContainers = document.querySelectorAll('.nav-profile');
    if (profileContainers.length === 0) return;

    if (isSignedIn) {
        let avatarHtml = `<i data-feather="user" style="color: var(--text-color); width:18px;"></i>`; 
        
        try {
            const auth = getAuth(); 
            const db = getFirestore(auth.app); 
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().avatarConfig) {
                const config = docSnap.data().avatarConfig;
                const avatarUrl = generateGhostAvatar(config);
                avatarHtml = `<img src="${avatarUrl}" class="profile-avatar" alt="Profile">`;
            } else if (user.photoURL) {
                avatarHtml = `<img src="${user.photoURL}" class="profile-avatar" alt="Profile">`;
            }
        } catch (error) {
            console.error("Nav Update Error:", error);
        }

        profileContainers.forEach((container) => {
            if (container.classList.contains('mobile-profile-container')) {
                container.innerHTML = `
                    ${avatarHtml}
                    <div class="mobile-profile-actions">
                        <a href="profile.html" class="mobile-profile-link">Profile</a>
                        <a href="#" id="mobile-logout-btn" class="btn-outline">Log Out</a>
                    </div>
                `;
                const logoutBtn = container.querySelector('#mobile-logout-btn');
                if(logoutBtn) logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const auth = getAuth();
                    auth.signOut().then(() => window.location.href = 'login.html');
                });
            } else {
                container.innerHTML = `
                    <a href="profile.html" style="display:flex; width:100%; height:100%; align-items:center; justify-content:center;">
                        ${avatarHtml}
                    </a>
                    <div class="nav-dropdown">
                        <a href="profile.html" class="dropdown-item">Profile</a>
                        <a href="feedback.html" class="dropdown-item">Community Feedback</a>
                        <a href="support.html" class="dropdown-item" style="color: var(--accent-gold);">Support Us</a>
                        <a href="settings.html" class="dropdown-item">Settings</a>
                        <a href="#" class="dropdown-item" id="nav-logout-btn">Log Out</a>
                    </div>
                `;
                const logoutBtn = container.querySelector('#nav-logout-btn');
                if(logoutBtn) logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const auth = getAuth();
                    auth.signOut().then(() => window.location.href = 'login.html');
                });
            }
        });
    } else {
        profileContainers.forEach((container) => {
            if (container.classList.contains('mobile-profile-container')) {
                container.innerHTML = `<a href="login.html" class="btn-outline">Sign In / Register</a>`;
            } else {
                container.innerHTML = `
                    <a href="login.html" style="display:flex; width:100%; height:100%; align-items:center; justify-content:center;">
                        <i data-feather="user" style="color:var(--text-color); width:18px;"></i>
                    </a>
                `;
            }
        });
    }

    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function setupMobileNav() {
    const mobileHeader = document.querySelector('.mobile-header-wrapper');
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    const mobileProfileContainer = document.querySelector('.mobile-profile-container');
    if (!mobileHeader || !mobileToggle || !mobileMenu) return;

    function closeMobileMenu() {
        mobileToggle.classList.remove('open');
        mobileMenu.classList.remove('active');
        mobileHeader.classList.remove('menu-open');
        document.body.style.overflow = 'auto';
    }

    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('open');
        mobileMenu.classList.toggle('active');
        mobileHeader.classList.toggle('menu-open');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : 'auto';
    });

    mobileLinks.forEach(link => link.addEventListener('click', closeMobileMenu));
    if (mobileProfileContainer) {
        mobileProfileContainer.addEventListener('click', (e) => {
            if(e.target.tagName === 'A' || e.target.closest('a')) closeMobileMenu();
        });
    }
}

function initElasticFooter() {
    const footerEl = document.querySelector('.premium-footer');
    if (!footerEl || footerEl.dataset.elasticReady === 'true') return;
    footerEl.dataset.elasticReady = 'true';

    let stretchValue = 0;
    let isTouching = false;
    let touchStartY = 0;
    let wheelTimeout;

    const applyStretch = (val) => {
        const stretch = Math.min(val / 2.5, 120);
        footerEl.style.paddingBottom = `calc(2rem + ${stretch}px)`;
    };

    const resetStretch = () => {
        stretchValue = 0;
        footerEl.style.transition = 'padding-bottom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        footerEl.style.paddingBottom = '2rem';
    };

    window.addEventListener('wheel', (e) => {
        const isAtBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 5;
        if (isAtBottom && e.deltaY > 0) {
            footerEl.style.transition = 'none';
            stretchValue += e.deltaY;
            if (stretchValue > 300) stretchValue = 300;
            applyStretch(stretchValue);

            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(resetStretch, 150);
        }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
        const isAtBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 5;
        if (isAtBottom) {
            isTouching = true;
            touchStartY = e.touches[0].clientY;
            footerEl.style.transition = 'none';
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isTouching) return;
        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;

        if (deltaY > 0) {
            stretchValue = deltaY * 1.5;
            applyStretch(stretchValue);
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        if (isTouching) {
            isTouching = false;
            resetStretch();
        }
    });
}

function setupSharedPageInteractions() {
    setupMobileNav();
    initElasticFooter();
}

if (document.readyState !== 'loading') setupSharedPageInteractions();
else document.addEventListener('DOMContentLoaded', setupSharedPageInteractions);
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
