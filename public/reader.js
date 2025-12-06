// --- READER PAGE LOGIC (WITH PRESENCE SYSTEM) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
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
// FIX: Attach to window to prevent Chrome garbage collection bug
window.currentUtterance = null;
let isSpeaking = false;
let activeHighlight = null; 
let activeParagraphHighlight = null; // New: Track active paragraph for fallback

// Track Reading State
let currentParagraphIndex = 0;
let paragraphsElements = []; // Store paragraph DOM elements

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
            background-color: #FFD700 !important;
            color: #000 !important;
            border-radius: 3px;
            box-shadow: 0 0 0 2px #FFD700;
            transition: background-color 0.1s;
            z-index: 10;
            position: relative;
            display: inline-block;
        }
        [data-theme="dark"] .word-highlight {
            background-color: #E50914 !important;
            color: #fff !important;
            box-shadow: 0 0 0 2px #E50914;
        }
        /* NEW: Fallback Paragraph Highlight */
        .active-paragraph {
            background-color: rgba(255, 215, 0, 0.15);
            border-radius: 8px;
            transition: background-color 0.3s;
        }
        [data-theme="dark"] .active-paragraph {
            background-color: rgba(255, 255, 255, 0.05);
        }
    `;
    document.head.appendChild(style);

    let currentUser = null;
    let savedBookDocId = null;
    let bookData = null;
    let currentPage = 0; 

    // --- 1. SETUP UI ELEMENTS (Define these first so functions can use them) ---
    const titleEl = document.getElementById('reader-title');
    const contentEl = document.getElementById('reader-content');
    const pageIndicator = document.getElementById('page-indicator');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    const dropdownContainer = document.getElementById('reader-actions-dropdown');
    const menuTrigger = document.querySelector('.reader-menu-trigger');
    
    if (!dropdownContainer || !menuTrigger) return;

    // Setup Menu UI
    menuTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContainer.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.reader-menu-container')) {
            dropdownContainer.classList.remove('show');
        }
    });
    
    dropdownContainer.innerHTML = '';

    const audioBtn = document.createElement('button');
    audioBtn.className = 'reader-menu-btn';
    audioBtn.id = 'audio-btn';
    audioBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="headphones"></i></span><span class="reader-menu-text">Listen</span>`;

    const saveListBtn = document.createElement('button');
    saveListBtn.className = 'reader-menu-btn';
    saveListBtn.id = 'save-list-btn';
    saveListBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="bookmark"></i></span><span class="reader-menu-text">Save to List</span>`;
    
    const saveCloudBtn = document.createElement('button');
    saveCloudBtn.className = 'reader-menu-btn';
    saveCloudBtn.id = 'save-cloud-btn';
    saveCloudBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="cloud"></i></span><span class="reader-menu-text">Publish to Cloud</span>`;

    dropdownContainer.appendChild(audioBtn);
    dropdownContainer.appendChild(saveListBtn);
    dropdownContainer.appendChild(saveCloudBtn);


    // --- 2. DEFINE HELPER FUNCTIONS (Before they are called) ---

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


    // --- 3. AUTH LISTENER (Now safe to call functions) ---
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


    // --- 4. LOAD BOOK DATA ---
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

    // --- 5. AUDIO & PAGE LOGIC ---

    if (synthesis.onvoiceschanged !== undefined) {
        synthesis.onvoiceschanged = () => {
             console.log("Voices loaded:", synthesis.getVoices().length);
        };
    }

    function stopAudio() {
        if (synthesis.speaking) {
            synthesis.cancel();
        }
        isSpeaking = false;
        currentParagraphIndex = 0; 
        
        if (activeHighlight) {
            activeHighlight.classList.remove('word-highlight');
            activeHighlight = null;
        }

        // Remove paragraph highlight
        if (activeParagraphHighlight) {
            activeParagraphHighlight.classList.remove('active-paragraph');
            activeParagraphHighlight = null;
        }
        
        audioBtn.classList.remove('speaking');
        audioBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="headphones"></i></span><span class="reader-menu-text">Listen</span>`;
        if (typeof feather !== 'undefined') feather.replace();
    }

    function playAudio(startFromIndex = 0) {
        if (synthesis.speaking) synthesis.cancel();
        
        isSpeaking = true;
        currentParagraphIndex = startFromIndex;
        
        audioBtn.classList.add('speaking');
        audioBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="mic-off"></i></span><span class="reader-menu-text">Stop Speaking</span>`;
        if (typeof feather !== 'undefined') feather.replace();

        speakNextParagraph();
    }

    function speakNextParagraph() {
        if (!isSpeaking) return;

        if (currentParagraphIndex >= paragraphsElements.length) {
            stopAudio();
            return;
        }

        const p = paragraphsElements[currentParagraphIndex];
        
        // --- PARAGRAPH HIGHLIGHT (RESET) ---
        // Clean up previous paragraph highlight
        if (activeParagraphHighlight) {
            activeParagraphHighlight.classList.remove('active-paragraph');
            activeParagraphHighlight = null;
        }

        const spans = Array.from(p.querySelectorAll('.read-word'));
        
        if (spans.length === 0) {
            currentParagraphIndex++;
            speakNextParagraph();
            return;
        }

        let textToRead = "";
        const spanMap = [];
        let cursor = 0;

        // Optimized Map Builder: Trims text to ensure index matching
        spans.forEach(span => {
            const text = span.textContent.trim(); 
            if (!text) return; 

            if (textToRead.length > 0) {
                textToRead += " ";
                cursor++; 
            }

            const start = cursor;
            const end = cursor + text.length;
            spanMap.push({ start, end, element: span });
            textToRead += text;
            cursor = end;
        });

        // Use global window variable to prevent GC
        window.currentUtterance = new SpeechSynthesisUtterance(textToRead);
        const utterance = window.currentUtterance;
        utterance.rate = 1.0;
        
        // --- VOICE SELECTION UPDATE ---
        const voices = synthesis.getVoices();
        let voice = null;
        
        // 1. Try to load user preference
        try {
            const prefsJson = localStorage.getItem('abooki_reader_prefs');
            if (prefsJson) {
                const prefs = JSON.parse(prefsJson);
                if (prefs.voiceURI) {
                    voice = voices.find(v => v.voiceURI === prefs.voiceURI);
                }
            }
        } catch (e) { console.error("Error reading voice pref", e); }

        // 2. Fallback if no preference or voice not found
        if (!voice) {
            voice = voices.find(v => v.name.includes("Google US English") && v.localService);
            if (!voice) voice = voices.find(v => v.name.includes("Google US English"));
            if (!voice) voice = voices.find(v => v.lang.startsWith("en") && v.localService);
            if (!voice) voice = voices.find(v => v.lang.startsWith("en"));
        }
        
        if (voice) {
            utterance.voice = voice;
            console.log("Using voice:", voice.name);
            
            // CONDITIONAL FALLBACK:
            // Only highlight the paragraph if the voice is NOT local (Network voice)
            if (!voice.localService) {
                console.warn("Using Network voice. Switching to Paragraph-level highlighting.");
                if (p) {
                    activeParagraphHighlight = p;
                    p.classList.add('active-paragraph');
                }
            }
        }
        
        utterance.onboundary = (event) => {
            // Check for valid boundary event
            if (typeof event.charIndex === 'number') {
                const charIndex = event.charIndex;
                const match = spanMap.find(m => charIndex >= m.start && charIndex < m.end + 2);
                
                if (match) {
                    highlightElement(match.element);
                }
            }
        };

        utterance.onend = () => {
            if (isSpeaking) {
                currentParagraphIndex++;
                speakNextParagraph();
            }
        };

        utterance.onerror = (e) => {
            if (e.error === 'interrupted' || e.error === 'canceled') return;
            console.error("TTS Error:", e);
            stopAudio();
        };

        synthesis.speak(utterance);
        
        if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function highlightElement(el) {
        if (activeHighlight) {
            activeHighlight.classList.remove('word-highlight');
        }
        activeHighlight = el;
        activeHighlight.classList.add('word-highlight');
    }

    audioBtn.addEventListener('click', () => {
        if (isSpeaking) {
            stopAudio();
        } else {
            playAudio(0);
        }
    });

    function updatePage() {
        stopAudio(); 

        if (!bookData) return;
        const totalPages = bookData.pages.length + 1; 
        titleEl.textContent = bookData.title;
        paragraphsElements = []; 

        if (currentPage === 0) {
            const titleHtml = wrapWords(bookData.title);
            const descHtml = wrapWords(bookData.description);
            
            contentEl.innerHTML = `
                <div class="reader-paragraph"><h1 style="text-align: center; margin-top: 4rem; font-size: 2.5rem; color: var(--reader-text);">${titleHtml}</h1></div>
                <div class="reader-paragraph"><p style="text-align: center; font-size: 1.2rem; font-style: italic; margin-top: 1rem;">A ${bookData.genre || 'Story'}</p></div>
                <div class="reader-paragraph"><p style="text-align: center; opacity: 0.8; max-width: 600px; margin: 2rem auto 0 auto;">${descHtml}</p></div>
                <div class="reader-paragraph"><p style="text-align: center; opacity: 0.8; margin-top: 6rem;">Click "Next" to begin.</p></div>
            `;
        } else {
            const pageText = bookData.pages[currentPage - 1];
            const rawParagraphs = pageText.split('\n');
            const pHTML = rawParagraphs.map(p => `<div class="reader-paragraph"><p>${wrapWords(p)}</p></div>`).join('');
            contentEl.innerHTML = pHTML;
        }
        
        paragraphsElements = Array.from(contentEl.querySelectorAll('.reader-paragraph'));

        pageIndicator.textContent = `Page ${currentPage} of ${totalPages - 1}`;
        prevBtn.disabled = (currentPage === 0);
        nextBtn.disabled = (currentPage === totalPages - 1);
    }

    function wrapWords(text) {
        if(!text) return '';
        return text.split(/\s+/).filter(w => w.length > 0).map(word => `<span class="read-word">${word}</span>`).join(' ');
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

    // 6. --- CLEAN UP ---
    window.addEventListener('beforeunload', () => {
        stopPresenceHeartbeat();
        stopAudio(); 
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'reader') {
        initializeReader();
    }
});