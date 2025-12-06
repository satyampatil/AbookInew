// --- READER PAGE LOGIC (WITH PRESENCE SYSTEM) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
// ADDED: updateDoc to imports
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, where, getDocs, setDoc, getDoc } 
    from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { updateNavUser } from "./nav.js";

// Firebase Configuration
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

let presenceInterval = null;
let synthesis = window.speechSynthesis;
let utterance = null;
let isSpeaking = false;
let wordSpans = []; // Store references to word elements

// --- NEW: APPLY SETTINGS ---
function applyPreferences() {
    const prefsJson = localStorage.getItem('abooki_reader_prefs');
    if (!prefsJson) return; 

    try {
        const prefs = JSON.parse(prefsJson);
        const readerBody = document.body;
        const readerRoot = document.documentElement;

        if (prefs.theme) readerBody.setAttribute('data-theme', prefs.theme);
        if (prefs.font) readerBody.setAttribute('data-font', prefs.font);
        if (prefs.fontSize) readerRoot.style.setProperty('--reader-base-size', `${prefs.fontSize}px`);

    } catch (e) {
        console.error("Error applying preferences", e);
    }
}

function initializeReader() {
    applyPreferences();
    
    // Inject Highlight Styles
    const style = document.createElement('style');
    style.innerHTML = `
        .word-highlight {
            background-color: #FFD700;
            color: #000;
            border-radius: 2px;
            transition: background-color 0.1s;
        }
        [data-theme="dark"] .word-highlight {
            background-color: #E50914;
            color: #fff;
        }
    `;
    document.head.appendChild(style);

    let currentUser = null;
    let savedBookDocId = null; 

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNavUser(user);
        if (user) {
            checkIfSaved(user);
            startPresenceHeartbeat(user);
        } else {
            stopPresenceHeartbeat();
        }
        updateButtonsState(); 
    });

    // Clean up
    window.addEventListener('beforeunload', () => {
        stopPresenceHeartbeat();
        stopAudio(); // Stop talking if tab closes
    });

    const titleEl = document.getElementById('reader-title');
    const contentEl = document.getElementById('reader-content');
    const pageIndicator = document.getElementById('page-indicator');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    // Updated: Select the dropdown container
    const dropdownContainer = document.getElementById('reader-actions-dropdown');
    // NEW: Select the trigger button
    const menuTrigger = document.querySelector('.reader-menu-trigger');
    
    if (!dropdownContainer || !menuTrigger) {
        console.error("Dropdown container or trigger not found!");
        return;
    }

    // Toggle menu on click
    menuTrigger.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing immediately
        dropdownContainer.classList.toggle('show');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.reader-menu-container')) {
            dropdownContainer.classList.remove('show');
        }
    });
    
    dropdownContainer.innerHTML = ''; // Clear previous

    // 1. Audio Button
    const audioBtn = document.createElement('button');
    audioBtn.className = 'reader-menu-btn';
    audioBtn.id = 'audio-btn';
    audioBtn.innerHTML = `
        <span class="reader-menu-icon"><i data-feather="headphones"></i></span>
        <span class="reader-menu-text">Listen</span>
    `;

    // 2. Save/Remove Button
    const saveListBtn = document.createElement('button');
    saveListBtn.className = 'reader-menu-btn';
    saveListBtn.id = 'save-list-btn';
    saveListBtn.innerHTML = `
        <span class="reader-menu-icon"><i data-feather="bookmark"></i></span>
        <span class="reader-menu-text">Save to List</span>
    `;
    
    // 3. Publish Button
    const saveCloudBtn = document.createElement('button');
    saveCloudBtn.className = 'reader-menu-btn';
    saveCloudBtn.id = 'save-cloud-btn';
    saveCloudBtn.innerHTML = `
        <span class="reader-menu-icon"><i data-feather="cloud"></i></span>
        <span class="reader-menu-text">Publish to Cloud</span>
    `;

    dropdownContainer.appendChild(audioBtn);
    dropdownContainer.appendChild(saveListBtn);
    dropdownContainer.appendChild(saveCloudBtn);

    let bookData = null;
    let currentPage = 0; 

    try {
        const bookJson = localStorage.getItem('generatedBook');
        if (!bookJson) throw new Error("No book data found.");
        bookData = JSON.parse(bookJson);
        if (!bookData || !bookData.title || !bookData.pages) throw new Error("Invalid book data.");

        updatePage();
        if (typeof feather !== 'undefined') feather.replace();

    } catch (error) {
        console.error("Error loading book:", error);
        if(titleEl) titleEl.textContent = "Error";
        if(contentEl) contentEl.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
    }

    // --- AUDIO LOGIC ---
    function stopAudio() {
        if (synthesis.speaking) {
            synthesis.cancel();
        }
        isSpeaking = false;
        
        // Remove highlights
        document.querySelectorAll('.word-highlight').forEach(el => el.classList.remove('word-highlight'));
        
        audioBtn.classList.remove('speaking');
        audioBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="headphones"></i></span><span class="reader-menu-text">Listen</span>`;
        if (typeof feather !== 'undefined') feather.replace();
    }

    function playAudio(text) {
        stopAudio(); // clear previous
        if (!text) return;

        // Reset word spans map for highlighting logic (simple approach)
        // Note: Exact word mapping with onboundary is complex because speech engines vary.
        // We will try a best-effort mapping using text index.

        utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        const voices = synthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                highlightWordAtIndex(event.charIndex, text);
            }
        };

        utterance.onend = () => {
            stopAudio();
        };

        synthesis.speak(utterance);
        isSpeaking = true;
        
        audioBtn.classList.add('speaking');
        audioBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="mic-off"></i></span><span class="reader-menu-text">Stop Speaking</span>`;
        if (typeof feather !== 'undefined') feather.replace();
    }

    function highlightWordAtIndex(charIndex, fullText) {
        // Clear previous highlight
        const prev = document.querySelector('.word-highlight');
        if (prev) prev.classList.remove('word-highlight');

        // Robust highlighting: Find span that starts closest to charIndex
        let currentIdx = 0;
        
        for (let i = 0; i < wordSpans.length; i++) {
            const span = wordSpans[i];
            const word = span.textContent;
            
            // Advance currentIdx to match the start of this word in fullText
            // This handles whitespace/punctuation discrepancies
            const wordStartInText = fullText.indexOf(word, currentIdx);
            
            if (wordStartInText === -1) continue; // word not found? skip
            
            const wordEndInText = wordStartInText + word.length;
            
            // If the TTS charIndex falls within or right before this word
            // We use a small tolerance because 'onboundary' sometimes fires slightly before/after
            if (charIndex >= wordStartInText && charIndex < wordEndInText + 2) {
                span.classList.add('word-highlight');
                span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return; // Found it
            }
            
            // Update current index to start searching for next word after this one
            currentIdx = wordEndInText;
        }
    }

    audioBtn.addEventListener('click', () => {
        if (isSpeaking) {
            stopAudio();
        } else {
            // Get text from visible spans to ensure synchronization
            let textToRead = "";
            if (wordSpans.length > 0) {
                textToRead = wordSpans.map(span => span.textContent).join(' ');
            } else if (currentPage === 0) {
                textToRead = `${bookData.title}. A ${bookData.genre || 'Story'}. ${bookData.description}`;
            } else {
                textToRead = bookData.pages[currentPage - 1];
            }
            playAudio(textToRead);
        }
    });

    // --- PRESENCE SYSTEM ---
    async function startPresenceHeartbeat(user) {
        const prefsJson = localStorage.getItem('abooki_reader_prefs');
        if (prefsJson) {
            const prefs = JSON.parse(prefsJson);
            if (prefs.ghostMode) return;
        }

        if (!bookData || !user) return;

        let avatarConfig = { color: 'blue', mood: 'happy', accessory: 'none' }; 
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().avatarConfig) {
                avatarConfig = userDoc.data().avatarConfig;
            }
        } catch (e) { console.log("Avatar fetch error", e); }

        const report = async () => {
            try {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_readers', user.uid), {
                    userId: user.uid,
                    displayName: user.displayName || 'Anonymous Reader',
                    bookTitle: bookData.title,
                    avatarConfig: avatarConfig,
                    lastSeen: serverTimestamp(),
                    page: currentPage + 1
                });
            } catch (err) { console.error(err); }
        };

        report();
        presenceInterval = setInterval(report, 60000);
    }

    function stopPresenceHeartbeat() {
        if (presenceInterval) {
            clearInterval(presenceInterval);
            presenceInterval = null;
        }
    }

    // --- CHECK FIREBASE STATUS ---
    async function checkIfSaved(user) {
        if (!bookData) return;
        try {
            const q = query(
                collection(db, 'artifacts', appId, 'users', user.uid, 'books'),
                where('title', '==', bookData.title),
                where('description', '==', bookData.description)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                savedBookDocId = snapshot.docs[0].id; 
                setSaveButtonState(true);
            } else {
                savedBookDocId = null;
                setSaveButtonState(false);
            }
        } catch (err) { console.error(err); }
    }

    function setSaveButtonState(isSaved) {
        if (isSaved) {
            saveListBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="check"></i></span><span class="reader-menu-text">In Library</span>`;
            saveListBtn.classList.add('saved'); 
        } else {
            saveListBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="bookmark"></i></span><span class="reader-menu-text">Save to List</span>`;
            saveListBtn.classList.remove('saved');
        }
        if (typeof feather !== 'undefined') feather.replace();
    }

    function updateButtonsState() {
        if (!bookData) return;
        if (bookData.isPublicView || bookData.publicId) {
            saveCloudBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="globe"></i></span><span class="reader-menu-text">Public (Cloud)</span>`;
            saveCloudBtn.classList.add('saved');
            saveCloudBtn.disabled = true;
        } else {
            const isPrivateCopyOwner = currentUser && (bookData.userId === currentUser.uid || !bookData.userId);
            const isOriginalAuthor = !bookData.originalUserId || (currentUser && bookData.originalUserId === currentUser.uid);

            if (isPrivateCopyOwner && isOriginalAuthor) {
                saveCloudBtn.disabled = false;
                saveCloudBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="upload-cloud"></i></span><span class="reader-menu-text">Publish</span>`;
                saveCloudBtn.style.display = 'flex';
            } else {
                saveCloudBtn.style.display = 'none'; 
            }
        }
        if (typeof feather !== 'undefined') feather.replace();
    }

    function updatePage() {
        stopAudio(); // Stop speaking when page turns

        if (!bookData) return;
        const totalPages = bookData.pages.length + 1; 
        titleEl.textContent = bookData.title;
        wordSpans = []; // Reset spans

        if (currentPage === 0) {
            // We need to wrap text in spans for highlighting
            const titleHtml = wrapWords(bookData.title);
            const descHtml = wrapWords(bookData.description);
            
            contentEl.innerHTML = `
                <h1 style="text-align: center; margin-top: 4rem; font-size: 2.5rem; color: var(--reader-text);">${titleHtml}</h1>
                <p style="text-align: center; font-size: 1.2rem; font-style: italic; margin-top: 1rem;">A ${bookData.genre || 'Story'}</p>
                <p style="text-align: center; opacity: 0.8; max-width: 600px; margin: 2rem auto 0 auto;">${descHtml}</p>
                <p style="text-align: center; opacity: 0.8; margin-top: 6rem;">Click "Next" to begin.</p>
            `;
        } else {
            const pageText = bookData.pages[currentPage - 1];
            // Split by newlines first to keep paragraph structure
            const paragraphs = pageText.split('\n');
            const pHTML = paragraphs.map(p => `<p>${wrapWords(p)}</p>`).join('');
            contentEl.innerHTML = pHTML;
        }
        
        // Cache the span references in order
        wordSpans = Array.from(contentEl.querySelectorAll('.read-word'));

        pageIndicator.textContent = `Page ${currentPage} of ${totalPages - 1}`;
        prevBtn.disabled = (currentPage === 0);
        nextBtn.disabled = (currentPage === totalPages - 1);
    }

    function wrapWords(text) {
        if(!text) return '';
        // Split by space but keep structure
        return text.split(' ').map(word => `<span class="read-word">${word}</span>`).join(' ');
    }

    if(prevBtn) prevBtn.addEventListener('click', () => {
        if (currentPage > 0) { currentPage--; updatePage(); }
    });

    if(nextBtn) nextBtn.addEventListener('click', () => {
        if (bookData && currentPage < bookData.pages.length) { currentPage++; updatePage(); }
    });

    // --- CLICK: SAVE / REMOVE TOGGLE ---
    saveListBtn.addEventListener('click', async () => {
        if (!currentUser) { alert("Please log in."); return; }
        
        if (saveListBtn.disabled) return;
        saveListBtn.disabled = true;

        try {
            if (savedBookDocId) {
                await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', savedBookDocId));
                savedBookDocId = null; 
                setSaveButtonState(false); 
            } else {
                const { firestoreId, publicId, isPublicView, isLibraryView, ...cleanData } = bookData;
                
                if (!cleanData.coverUrl) {
                    const titleQuery = encodeURIComponent(cleanData.title);
                    cleanData.coverUrl = `https://placehold.co/300x450/333/FFF?text=${titleQuery}&font=inter`;
                }

                let originId = cleanData.originalUserId || cleanData.userId || currentUser.uid;

                const bookToSave = {
                    ...cleanData,
                    createdAt: serverTimestamp(),
                    userId: currentUser.uid,
                    originalUserId: originId 
                };

                if (isPublicView) bookToSave.publicId = firestoreId;
                else if (publicId) bookToSave.publicId = publicId;

                const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', currentUser.uid, 'books'), bookToSave);
                savedBookDocId = docRef.id; 
                setSaveButtonState(true); 
            }
        } catch (error) {
            console.error(error);
            alert("Action failed: " + error.message);
        } finally {
            saveListBtn.disabled = false;
        }
    });

    // --- CLICK: PUBLISH ---
    saveCloudBtn.addEventListener('click', async () => {
        if (!currentUser) { alert("Please log in."); return; }
        if (bookData.userId && bookData.userId !== currentUser.uid) {
            alert("You can only publish your own books.");
            return;
        }

        try {
            saveCloudBtn.innerHTML = 'Publishing...';
            const { firestoreId, publicId, isPublicView, isLibraryView, ...cleanData } = bookData;
            
            const publicBook = {
                ...cleanData,
                createdAt: serverTimestamp(),
                userId: currentUser.uid,
                authorName: currentUser.displayName || 'Anonymous',
                ratings: {},
                originalUserId: currentUser.uid 
            };

            // 1. ADD TO PUBLIC
            const publicDocRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'books'), publicBook);

            // 2. UPDATE PRIVATE COPY (Important fix!)
            if (savedBookDocId) {
                const privateBookRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'books', savedBookDocId);
                await updateDoc(privateBookRef, { publicId: publicDocRef.id });
            }
            
            // 3. Update Local State
            bookData.publicId = publicDocRef.id;
            bookData.isPublicView = true;

            saveCloudBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="globe"></i></span><span class="reader-menu-text">Published!</span>`;
            saveCloudBtn.classList.add('saved');
            saveCloudBtn.disabled = true;
            feather.replace();

        } catch (error) {
            console.error(error);
            alert("Error publishing: " + error.message);
            saveCloudBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="upload-cloud"></i></span><span class="reader-menu-text">Publish</span>`;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'reader') {
        initializeReader();
    }
});