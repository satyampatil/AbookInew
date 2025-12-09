// --- READER PAGE LOGIC (WITH PRESENCE SYSTEM) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
// ADDED: updateDoc to imports
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, increment, arrayUnion, serverTimestamp, query, where, getDocs, setDoc, getDoc } 
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
let activeParagraphHighlight = null; 

// Track Reading State
let currentParagraphIndex = 0;
let paragraphsElements = []; 
// NEW: Track if we've already counted this read session
let bookFinishedThisSession = false;

// --- GAMIFICATION CONFIG ---
const BADGES = {
    books_read: {
        1: { id: 'reader_1', name: 'First Chapter', icon: '📖', desc: 'Finish your first book' },
        5: { id: 'reader_5', name: 'Bookworm', icon: '🐛', desc: 'Finish 5 books' },
        10: { id: 'reader_10', name: 'Bibliophile', icon: '📚', desc: 'Finish 10 books' },
        50: { id: 'reader_50', name: 'Library Legend', icon: '👑', desc: 'Finish 50 books' }
    },
    books_published: {
        1: { id: 'author_1', name: 'Debut Author', icon: '✍️', desc: 'Publish your first book' },
        5: { id: 'author_5', name: 'Storyteller', icon: '🌟', desc: 'Publish 5 books' },
        20: { id: 'author_20', name: 'Bestseller', icon: '🏆', desc: 'Publish 20 books' }
    }
};

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
        .active-paragraph {
            background-color: rgba(255, 215, 0, 0.15);
            border-radius: 8px;
            transition: background-color 0.3s;
        }
        [data-theme="dark"] .active-paragraph {
            background-color: rgba(255, 255, 255, 0.05);
        }
        
        /* BADGE NOTIFICATION STYLES */
        .badge-toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: linear-gradient(135deg, #1a1a1a, #333);
            border: 1px solid #FFD700;
            border-radius: 12px;
            padding: 15px 25px;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 9999;
            pointer-events: none;
        }
        .badge-toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        .badge-icon {
            font-size: 2.5rem;
            filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
        }
        .badge-info h4 {
            margin: 0;
            color: #FFD700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .badge-info h3 {
            margin: 2px 0 0 0;
            color: #fff;
            font-size: 1.2rem;
        }
        .badge-info p {
            margin: 2px 0 0 0;
            color: #ccc;
            font-size: 0.85rem;
        }
    `;
    document.head.appendChild(style);

    let currentUser = null;
    let savedBookDocId = null;
    let bookData = null;
    let currentPage = 0; 

    // --- 1. SETUP UI ELEMENTS ---
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

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'reader-menu-btn';
    pdfBtn.id = 'pdf-btn';
    pdfBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="download"></i></span><span class="reader-menu-text">Download PDF</span>`;

    const saveListBtn = document.createElement('button');
    saveListBtn.className = 'reader-menu-btn';
    saveListBtn.id = 'save-list-btn';
    saveListBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="bookmark"></i></span><span class="reader-menu-text">Save to List</span>`;
    
    const saveCloudBtn = document.createElement('button');
    saveCloudBtn.className = 'reader-menu-btn';
    saveCloudBtn.id = 'save-cloud-btn';
    saveCloudBtn.innerHTML = `<span class="reader-menu-icon"><i data-feather="cloud"></i></span><span class="reader-menu-text">Publish to Cloud</span>`;

    dropdownContainer.appendChild(audioBtn);
    dropdownContainer.appendChild(pdfBtn); // Add to menu
    dropdownContainer.appendChild(saveListBtn);
    dropdownContainer.appendChild(saveCloudBtn);


    // --- 2. HELPER FUNCTIONS ---

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

    // --- GAMIFICATION HELPERS ---
    async function trackGamificationAction(actionType, changeAmount = 1) {
        if (!currentUser) return;

        try {
            // 1. Update Stats
            const statsRef = doc(db, "users", currentUser.uid, "gamification", "stats");
            
            await setDoc(statsRef, {
                [actionType]: increment(changeAmount),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // 2. Fetch new total
            const statsSnap = await getDoc(statsRef);
            const currentCount = statsSnap.data()[actionType] || 0;

            console.log(`Gamification: ${actionType} count is now ${currentCount}`);

            // 3. Check for Badge (Only on positive increments)
            if (changeAmount > 0) {
                const badgeMap = BADGES[actionType];
                if (badgeMap && badgeMap[currentCount]) {
                    const badge = badgeMap[currentCount];
                    await unlockBadge(badge);
                }
            }

        } catch (e) {
            console.error("Gamification Error:", e);
        }
    }

    async function unlockBadge(badge) {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, {
            badges: arrayUnion({
                id: badge.id,
                name: badge.name,
                icon: badge.icon,
                desc: badge.desc,
                dateEarned: new Date().toISOString()
            })
        }, { merge: true });

        showBadgeNotification(badge);
    }

    function showBadgeNotification(badge) {
        const div = document.createElement('div');
        div.className = 'badge-toast';
        div.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-info">
                <h4>Badge Unlocked!</h4>
                <h3>${badge.name}</h3>
                <p>${badge.desc}</p>
            </div>
        `;
        document.body.appendChild(div);

        // Animate
        requestAnimationFrame(() => div.classList.add('show'));

        // Remove
        setTimeout(() => {
            div.classList.remove('show');
            setTimeout(() => div.remove(), 500);
        }, 4000);
    }


    // --- 3. AUTH LISTENER ---
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

        window.currentUtterance = new SpeechSynthesisUtterance(textToRead);
        const utterance = window.currentUtterance;
        utterance.rate = 1.0;
        
        const voices = synthesis.getVoices();
        let voice = null;
        
        try {
            const prefsJson = localStorage.getItem('abooki_reader_prefs');
            if (prefsJson) {
                const prefs = JSON.parse(prefsJson);
                if (prefs.voiceURI) {
                    voice = voices.find(v => v.voiceURI === prefs.voiceURI);
                }
            }
        } catch (e) { console.error("Error reading voice pref", e); }

        if (!voice) {
            voice = voices.find(v => v.name.includes("Google US English") && v.localService);
            if (!voice) voice = voices.find(v => v.name.includes("Google US English"));
            if (!voice) voice = voices.find(v => v.lang.startsWith("en") && v.localService);
            if (!voice) voice = voices.find(v => v.lang.startsWith("en"));
        }
        
        if (voice) {
            utterance.voice = voice;
            
            if (!voice.localService) {
                if (p) {
                    activeParagraphHighlight = p;
                    p.classList.add('active-paragraph');
                }
            }
        }
        
        utterance.onboundary = (event) => {
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

    // --- PDF GENERATION LOGIC ---
    pdfBtn.addEventListener('click', () => {
        if (!bookData) return;
        
        const originalText = pdfBtn.innerHTML;
        pdfBtn.innerHTML = 'Generating...';
        pdfBtn.disabled = true;

        // 1. Create a temporary container for the full book
        const tempContainer = document.createElement('div');
        tempContainer.style.padding = '40px';
        tempContainer.style.fontFamily = "'Lora', serif";
        tempContainer.style.color = '#000';
        tempContainer.style.background = '#fff';
        
        // Add Title Page
        let htmlContent = `
            <div style="text-align:center; page-break-after: always; padding-top: 50px;">
                <h1 style="font-size: 3em; margin-bottom: 20px;">${bookData.title}</h1>
                <p style="font-size: 1.2em; font-style: italic;">A ${bookData.genre || 'Story'}</p>
                <div style="margin-top: 50px; border-top: 1px solid #ccc; width: 50%; margin-left: auto; margin-right: auto;"></div>
                <p style="margin-top: 20px; color: #666;">Generated by: &copy; 2025 abooki</p>
                <p style="font-size: 0.9em; margin-top: 10px;">${bookData.authorName ? 'Author: ' + bookData.authorName : ''}</p>
            </div>
        `;

        // Add Pages
        bookData.pages.forEach((pageText, index) => {
            // Replace newlines with <br> or <p>
            const formattedText = pageText.split('\n').map(p => `<p style="margin-bottom: 1em; line-height: 1.6; font-size: 14px;">${p}</p>`).join('');
            
            htmlContent += `
                <div class="pdf-page" style="page-break-after: always;">
                    <div style="font-size: 0.8em; color: #999; text-align: center; margin-bottom: 20px;">Chapter ${index + 1}</div>
                    ${formattedText}
                    <div style="font-size: 0.8em; color: #ccc; text-align: center; margin-top: 30px;">- ${index + 1} -</div>
                </div>
            `;
        });

        // Add About/Credits Page (Last Page)
        htmlContent += `
            <div class="pdf-page" style="padding-top: 50px; text-align: center;">
                <h2 style="font-size: 2em; margin-bottom: 20px;">About Abooki</h2>
                <p style="font-size: 1em; line-height: 1.6; color: #333; max-width: 80%; margin: 0 auto 30px auto;">
                    Abooki is an experimental platform exploring the intersection of AI and creative writing. 
                    It serves as a dynamic library where stories are generated, read, and shared instantly.
                </p>
                
                <div style="margin-top: 40px; border-top: 1px solid #eee; width: 60%; margin-left: auto; margin-right: auto; padding-top: 30px;">
                    <h3 style="font-size: 1.5em; margin-bottom: 10px;">About the Creator</h3>
                    <p style="font-size: 1em; color: #555; margin-bottom: 5px;"><strong>Satyam Patil</strong></p>
                    <p style="font-size: 0.9em; color: #666; margin-bottom: 20px;">
                        Passionate developer building innovative web experiences.
                    </p>
                    <p style="font-size: 0.9em; color: #0077b5;">
                        LinkedIn: linkedin.com/in/satyampatil
                    </p>
                </div>
                
                <div style="margin-top: 50px; font-size: 0.8em; color: #999;">
                    Generated on ${new Date().toLocaleDateString()}
                </div>
            </div>
        `;

        tempContainer.innerHTML = htmlContent;
        
        // Settings for html2pdf
        const opt = {
            margin:       1,
            filename:     `${bookData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Generate
        html2pdf().from(tempContainer).set(opt).save().then(() => {
            pdfBtn.innerHTML = originalText;
            pdfBtn.disabled = false;
        }).catch(err => {
            console.error("PDF Error:", err);
            alert("Could not generate PDF.");
            pdfBtn.innerHTML = originalText;
            pdfBtn.disabled = false;
        });
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
        
        // --- GAMIFICATION TRACKER: BOOK FINISHED ---
        if (currentPage === totalPages - 1 && !bookFinishedThisSession) {
            bookFinishedThisSession = true;
            trackGamificationAction('books_read', 1);
        }
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

            // 2. UPDATE PRIVATE COPY
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
            
            // --- GAMIFICATION TRIGGER: BOOK PUBLISHED ---
            trackGamificationAction('books_published', 1);

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