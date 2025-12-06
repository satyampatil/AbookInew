import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { updateNavUser } from "./nav.js";
import { generateGhostAvatar } from "./avatar-generator.js";

// Firebase Config
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

let currentUser = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Listener
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateNavUser(user);
        updateInputAvatar(user);
        
        // Reload comments to update "Delete" buttons based on new auth state
        loadComments(); 

        const btn = document.getElementById('post-comment-btn');
        if (btn) {
            if (!user) {
                btn.textContent = 'Log in to Comment';
            } else {
                btn.textContent = 'Comment';
            }
        }
    });

    // 2. Setup Input Interaction
    setupInputArea();
});

// --- UI LOGIC ---
function setupInputArea() {
    const textarea = document.getElementById('feedback-text');
    const actions = document.getElementById('input-actions');
    const cancelBtn = document.getElementById('cancel-comment-btn');
    const postBtn = document.getElementById('post-comment-btn');

    if (!textarea) return;

    // Auto-expand textarea
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        if (this.value.trim().length > 0) {
            postBtn.disabled = false;
        } else {
            postBtn.disabled = true;
        }
    });

    // Show actions on focus
    textarea.addEventListener('focus', () => {
        actions.style.display = 'flex';
    });

    // Cancel Button
    cancelBtn.addEventListener('click', () => {
        textarea.value = '';
        textarea.style.height = 'auto';
        actions.style.display = 'none';
    });

    // Post Button
    postBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert("Please log in to post feedback.");
            window.location.href = 'login.html';
            return;
        }

        const text = textarea.value.trim();
        if (!text) return;

        postBtn.textContent = 'Posting...';
        postBtn.disabled = true;

        try {
            await postComment(text);
            textarea.value = '';
            textarea.style.height = 'auto';
            actions.style.display = 'none'; // Hide actions after post
            postBtn.textContent = 'Comment';
        } catch (error) {
            console.error(error);
            alert("Failed to post: " + error.message);
            postBtn.textContent = 'Comment';
            postBtn.disabled = false;
        }
    });
}

async function updateInputAvatar(user) {
    const avatarContainer = document.querySelector('.current-user-avatar');
    if (!avatarContainer) return;

    if (!user) {
        avatarContainer.innerHTML = `<i data-feather="user"></i>`;
        feather.replace();
        return;
    }

    let avatarSrc = user.photoURL;

    // Try to get custom avatar
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().avatarConfig) {
            avatarSrc = generateGhostAvatar(userDoc.data().avatarConfig);
        }
    } catch (e) {
        // ignore
    }

    if (avatarSrc) {
        avatarContainer.innerHTML = `<img src="${avatarSrc}" alt="User">`;
    } else {
        avatarContainer.innerHTML = `<i data-feather="user"></i>`;
        feather.replace();
    }
}

// --- FIRESTORE FUNCTIONS ---

async function postComment(text) {
    // Determine avatar URL to save with comment (snapshot of current avatar)
    let avatarUrl = currentUser.photoURL;
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists() && userDoc.data().avatarConfig) {
            avatarUrl = generateGhostAvatar(userDoc.data().avatarConfig);
        }
    } catch (e) { console.log("Error fetching avatar for comment", e); }

    const commentData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous User',
        userAvatar: avatarUrl || null,
        text: text,
        timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'site_feedback'), commentData);
}

// Setup real-time listener variable so we can unsubscribe if needed
let unsubscribeComments = null;

function loadComments() {
    const list = document.getElementById('comments-list');
    if (!list) return;

    // Unsubscribe previous listener if it exists (prevents duplicate listeners on auth change)
    if (unsubscribeComments) {
        unsubscribeComments();
    }

    const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'site_feedback'),
        orderBy('timestamp', 'desc')
    );

    unsubscribeComments = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            list.innerHTML = '<p style="color:#777; font-style:italic;">No comments yet. Be the first!</p>';
            return;
        }

        list.innerHTML = ''; // Clear current list
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : 'Just now';
            
            // Avatar Fallback
            const avatarHtml = data.userAvatar 
                ? `<img src="${data.userAvatar}" alt="${data.userName}">`
                : `<i data-feather="user" style="width:20px; color:#ccc;"></i>`;

            // Check if current user is owner
            let deleteBtnHtml = '';
            if (currentUser && data.userId === currentUser.uid) {
                deleteBtnHtml = `
                    <button class="delete-comment-btn" data-id="${docSnap.id}" title="Delete Comment">
                        <i data-feather="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                `;
            }

            const item = document.createElement('div');
            item.className = 'comment-item';
            item.innerHTML = `
                <div class="comment-avatar">
                    ${avatarHtml}
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${data.userName}</span>
                        <span class="comment-date">${date}</span>
                        ${deleteBtnHtml}
                    </div>
                    <div class="comment-body">${escapeHtml(data.text)}</div>
                </div>
            `;
            list.appendChild(item);
        });
        
        if (typeof feather !== 'undefined') feather.replace();

        // Attach Delete Events
        const deleteBtns = list.querySelectorAll('.delete-comment-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                deleteComment(id);
            });
        });
    });
}

async function deleteComment(commentId) {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_feedback', commentId));
        // The onSnapshot listener will automatically remove it from the UI
    } catch (error) {
        console.error("Error deleting comment:", error);
        alert("Could not delete comment.");
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}