// --- Shared Navigation Logic ---
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"; 
import { generateGhostAvatar } from "./avatar-generator.js"; 

/**
 * Updates the navigation profile icon based on auth state.
 * @param {Object|null} user - The Firebase User object or null.
 */
export async function updateNavUser(user) {
    const navProfileContainer = document.querySelector('.nav-profile');
    if (!navProfileContainer) return;

    if (user) {
        // User is logged in
        let avatarHtml = `<i data-feather="user" style="color: #E50914;"></i>`; 
        
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

        // --- UPDATED DROPDOWN STRUCTURE ---
        // Added Link to feedback.html
        navProfileContainer.innerHTML = `
            <a href="profile.html" class="nav-profile-link">
                ${avatarHtml}
            </a>
            <div class="nav-dropdown">
                <a href="profile.html" class="dropdown-item">Profile</a>
                <a href="feedback.html" class="dropdown-item">Community Feedback</a>
                <a href="support.html" class="dropdown-item" style="color: #FFD700;">Support Us</a>
                <a href="settings.html" class="dropdown-item">Settings</a>
                <a href="#" class="dropdown-item" id="nav-logout-btn">Log Out</a>
            </div>
        `;
        
        const logoutBtn = navProfileContainer.querySelector('#nav-logout-btn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const auth = getAuth();
                auth.signOut().then(() => window.location.href = 'login.html');
            });
        }

    } else {
        // User is logged out
        navProfileContainer.innerHTML = `
            <a href="login.html" class="nav-profile-link">
                <i data-feather="user"></i>
            </a>
        `;
    }

    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}