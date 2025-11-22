// --- 3D LIQUID GHOST AVATAR GENERATOR ---

const COLORS = {
    'blue':   { main: '#4fc3f7', dark: '#0288d1', light: '#b3e5fc', glow: '#00e5ff' },
    'purple': { main: '#b388ff', dark: '#651fff', light: '#d1c4e9', glow: '#d500f9' },
    'green':  { main: '#69f0ae', dark: '#00c853', light: '#b9f6ca', glow: '#00e676' },
    'pink':   { main: '#ff80ab', dark: '#c51162', light: '#ffc1e3', glow: '#ff4081' },
    'orange': { main: '#ffb74d', dark: '#ef6c00', light: '#ffe0b2', glow: '#ff9100' },
    'white':  { main: '#e0e0e0', dark: '#9e9e9e', light: '#ffffff', glow: '#ffffff' },
};

const MOODS = {
    'happy': { 
        eyes: (id) => `<ellipse cx="45" cy="55" rx="4.5" ry="6.5" fill="url(#eyeGrad${id})"/><ellipse cx="75" cy="55" rx="4.5" ry="6.5" fill="url(#eyeGrad${id})"/>`, 
        mouth: `<path d="M 55 66 Q 60 71 65 66" fill="none" stroke="#0d1b2a" stroke-width="2.5" stroke-linecap="round"/>` 
    },
    'curious': { 
        eyes: (id) => `<circle cx="45" cy="55" r="5.5" fill="url(#eyeGrad${id})"/><circle cx="75" cy="55" r="5.5" fill="url(#eyeGrad${id})"/>`, 
        mouth: `<circle cx="60" cy="68" r="2.5" fill="#0d1b2a"/>` 
    },
    'sleepy': { 
        eyes: (id) => `<path d="M 40 55 Q 45 59 50 55" fill="none" stroke="#0d1b2a" stroke-width="2.5" stroke-linecap="round"/><path d="M 70 55 Q 75 59 80 55" fill="none" stroke="#0d1b2a" stroke-width="2.5" stroke-linecap="round"/>`, 
        mouth: `<path d="M 58 66 Q 60 63 62 66" fill="none" stroke="#0d1b2a" stroke-width="1.5" stroke-linecap="round"/>` 
    },
    'nerdy': {
        eyes: (id) => `
            <circle cx="45" cy="55" r="4.5" fill="url(#eyeGrad${id})"/><circle cx="75" cy="55" r="4.5" fill="url(#eyeGrad${id})"/>
            <g stroke="#333" stroke-width="2" fill="rgba(255,255,255,0.2)">
                <circle cx="45" cy="55" r="9"/><circle cx="75" cy="55" r="9"/>
                <line x1="54" y1="55" x2="66" y2="55" stroke-width="2"/>
            </g>`,
        mouth: `<path d="M 55 68 Q 60 71 65 68" fill="none" stroke="#0d1b2a" stroke-width="2" stroke-linecap="round"/>`
    }
};

const ACCESSORIES = {
    'none': '',
    'hat': `
        <g transform="translate(0, -2)">
            <ellipse cx="60" cy="25" rx="25" ry="8" fill="#3e2723"/>
            <path d="M 40 25 L 80 25 L 72 5 L 48 5 Z" fill="#5d4037"/>
            <rect x="35" y="24" width="50" height="4" fill="#3e2723" rx="1"/>
        </g>`,
    'sparkles': `
        <g fill="#fff" filter="url(#glowFilter)">
            <circle cx="20" cy="30" r="2" opacity="0.9"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle>
            <path d="M 100 40 L 102 35 L 104 40 L 109 42 L 104 44 L 102 49 L 100 44 L 95 42 Z" opacity="0.8"><animate attributeName="transform" attributeType="XML" type="rotate" from="0 102 42" to="360 102 42" dur="4s" repeatCount="indefinite"/></path>
            <circle cx="15" cy="80" r="1.5" opacity="0.7"/>
        </g>`,
    'runes': `
        <g fill="rgba(255,255,255,0.7)" font-family="monospace" font-weight="bold">
            <text x="15" y="40" font-size="12">∑</text>
            <text x="95" y="30" font-size="10">?</text>
            <text x="90" y="90" font-size="14">#</text>
        </g>`
};

export function generateGhostAvatar(config = {}) {
    const colorKey = config.color || 'blue';
    const moodKey = config.mood || 'happy';
    const accKey = config.accessory || 'none';

    const theme = COLORS[colorKey] || COLORS['blue'];
    const isWhite = colorKey === 'white'; 
    const themeMain = isWhite ? '#f5f5f5' : theme.main;
    const themeDark = isWhite ? '#bdbdbd' : theme.dark;
    const themeLight = isWhite ? '#ffffff' : theme.light;

    const mood = MOODS[moodKey] || MOODS['happy'];
    const accessorySvg = ACCESSORIES[accKey] || '';
    const uniqueId = Math.floor(Math.random() * 10000); 

    const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">`;
    const svgFooter = `</svg>`;

    // --- DEFINITIONS ---
    const defs = `
        <defs>
            <radialGradient id="bodyGrad${uniqueId}" cx="35%" cy="35%" r="85%" fx="25%" fy="25%">
                <stop offset="0%" stop-color="${themeLight}" stop-opacity="0.95"/>
                <stop offset="50%" stop-color="${themeMain}" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="${themeDark}" stop-opacity="1"/>
            </radialGradient>
            
            <radialGradient id="eyeGrad${uniqueId}" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stop-color="#263238"/>
                <stop offset="100%" stop-color="#000000"/>
            </radialGradient>

            <linearGradient id="bookCoverGrad${uniqueId}" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#5d4037"/>
                <stop offset="50%" stop-color="#8d6e63"/>
                <stop offset="100%" stop-color="#5d4037"/>
            </linearGradient>

            <filter id="glowFilter${uniqueId}">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            <filter id="dropShadow${uniqueId}" x="-20%" y="-20%" width="140%" height="140%">
                 <feGaussianBlur in="SourceAlpha" stdDeviation="2"/> 
                 <feOffset dx="0" dy="4" result="offsetblur"/>
                 <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
                 <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
    `;

    const shadowBlob = `<ellipse cx="60" cy="105" rx="35" ry="6" fill="#000" opacity="0.15"/>`;

    // --- 2. 3D Ghost Body ---
    const bodyPath = `
        <path d="M 30 95 
                 C 20 95 15 70 15 50 
                 C 15 20 35 5 60 5 
                 C 85 5 105 20 105 50 
                 C 105 70 100 95 90 95 
                 C 80 95 80 85 70 90
                 C 60 95 60 95 50 90
                 C 40 85 40 95 30 95 Z" 
              fill="url(#bodyGrad${uniqueId})" 
              stroke="${themeDark}" stroke-width="1"
              filter="url(#dropShadow${uniqueId})"
        />
    `;

    // --- 3. Liquid Droplets Animation (OUTSIDE BODY) ---
    const droplets = `
        <g fill="${themeMain}" stroke="${themeDark}" stroke-width="0.5" opacity="0.8">
            <!-- Left Side Large Droplet -->
            <path d="M 12 85 Q 8 80 12 75 Q 16 80 12 85 Z">
                <animateTransform attributeName="transform" type="translate" values="0 0; -5 -40" dur="4s" repeatCount="indefinite" begin="0s" keyTimes="0;1"/>
                <animateTransform attributeName="transform" type="scale" values="1; 0.5" dur="4s" repeatCount="indefinite" begin="0s" additive="sum"/>
                <animate attributeName="opacity" values="0.8;0" dur="4s" repeatCount="indefinite" begin="0s"/>
            </path>
            <!-- Right Side Bubble -->
            <circle cx="108" cy="70" r="3.5">
                <animate attributeName="cy" values="70; 30" dur="5.5s" repeatCount="indefinite" begin="1s"/>
                <animate attributeName="cx" values="108; 112; 108" dur="3s" repeatCount="indefinite" begin="1s"/>
                <animate attributeName="r" values="3.5; 1" dur="5.5s" repeatCount="indefinite" begin="1s"/>
                <animate attributeName="opacity" values="0.8; 0" dur="5.5s" repeatCount="indefinite" begin="1s"/>
            </circle>
            <!-- Top Left Mist -->
            <circle cx="20" cy="30" r="2">
                <animate attributeName="cy" values="30; 10" dur="3s" repeatCount="indefinite" begin="2.5s"/>
                <animate attributeName="r" values="2; 0.5" dur="3s" repeatCount="indefinite" begin="2.5s"/>
                <animate attributeName="opacity" values="0.6; 0" dur="3s" repeatCount="indefinite" begin="2.5s"/>
            </circle>
        </g>
    `;

    // --- 4. Highlights ---
    const highlights = `
        <ellipse cx="40" cy="25" rx="12" ry="6" fill="white" opacity="0.3" transform="rotate(-15 40 25)"/>
        <path d="M 20 40 Q 18 60 22 80" fill="none" stroke="white" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
    `;

    // --- 5. Book & Alphabets ---
    // Move Alphabets INSIDE the Book Group so they originate relative to the book
    const bookGroup = `
        <g transform="translate(35, 75)">
            
            <!-- Hands holding book -->
            <circle cx="-2" cy="10" r="6" fill="${themeMain}" stroke="${themeDark}" stroke-width="1"/>
            <circle cx="52" cy="10" r="6" fill="${themeMain}" stroke="${themeDark}" stroke-width="1"/>
            
            <!-- 1. Back Cover (Thickness) -->
            <!-- Fixed: Spine is now bottom-center (25, 18) so it looks open towards viewer -->
            <path d="M 0 8 L 25 18 L 50 8 L 50 15 L 25 25 L 0 15 Z" fill="#3e2723" stroke="#271c19" stroke-width="0.5"/>

            <!-- 2. Pages Block (White) -->
            <path d="M 2 8 L 25 16 L 48 8 L 48 12 L 25 20 L 2 12 Z" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="0.5"/>

            <!-- 3. Front Cover (Open V-Shape) -->
            <!-- Top edge: Left(0,8) -> Spine(25,18) -> Right(50,8) -->
            <path d="M 0 8 Q 25 18 50 8" fill="none" stroke="#5d4037" stroke-width="2" stroke-linecap="round"/>

            <!-- 4. Page Flip Animation -->
            <!-- Starts flat on right, flips up and over to left -->
            <path fill="#fff" stroke="#ccc" stroke-width="0.5" opacity="0.9">
                <animate attributeName="d" 
                    values="M 25 16 Q 36 12 48 8 L 25 16;
                            M 25 16 Q 25 5 25 5 L 25 16;
                            M 25 16 Q 14 12 2 8 L 25 16"
                    dur="2.5s" repeatCount="indefinite" keyTimes="0; 0.5; 1"/>
                <animate attributeName="opacity" values="1; 1; 0" dur="2.5s" repeatCount="indefinite"/>
            </path>
            
            <!-- 5. Floating Alphabets (Emerging from Book) -->
            <g font-family="serif" font-weight="bold" fill="#fff" stroke="${themeDark}" stroke-width="0.2">
                <!-- 'A' from left page -->
                <text x="10" y="10" font-size="10" opacity="0">
                    A
                    <animate attributeName="y" values="10; -20" dur="3s" repeatCount="indefinite" begin="0s"/>
                    <animate attributeName="x" values="10; 5" dur="3s" repeatCount="indefinite" begin="0s"/>
                    <animate attributeName="opacity" values="0; 1; 0" dur="3s" repeatCount="indefinite" begin="0s"/>
                </text>
                <!-- '?' from right page -->
                <text x="35" y="10" font-size="12" opacity="0">
                    ?
                    <animate attributeName="y" values="10; -25" dur="4s" repeatCount="indefinite" begin="1.5s"/>
                    <animate attributeName="x" values="35; 40" dur="4s" repeatCount="indefinite" begin="1.5s"/>
                    <animate attributeName="opacity" values="0; 1; 0" dur="4s" repeatCount="indefinite" begin="1.5s"/>
                </text>
                <!-- 'B' from center -->
                <text x="22" y="15" font-size="9" opacity="0">
                    B
                    <animate attributeName="y" values="15; -15" dur="3.5s" repeatCount="indefinite" begin="0.8s"/>
                    <animate attributeName="opacity" values="0; 0.8; 0" dur="3.5s" repeatCount="indefinite" begin="0.8s"/>
                </text>
            </g>

            <!-- Spine Fold -->
            <path d="M 25 16 L 25 20" stroke="#000" stroke-width="1" opacity="0.2"/>
        </g>
    `;

    const eyesSvg = typeof mood.eyes === 'function' ? mood.eyes(uniqueId) : mood.eyes;
    const fullSvg = svgHeader + defs + shadowBlob + bodyPath + droplets + highlights + eyesSvg + mood.mouth + accessorySvg + bookGroup + svgFooter;
    
    return "data:image/svg+xml;base64," + btoa(fullSvg);
}