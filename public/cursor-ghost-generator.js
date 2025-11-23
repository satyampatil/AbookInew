// --- CURSOR CHASING GHOST GENERATOR ---
// Updated: Ghost now faces RIGHT (towards cursor) with tail trailing left

const COLORS = {
    'blue':   { main: '#40c4ff', dark: '#0d47a1', light: '#a7ffff', glow: '#80d8ff' },
    'purple': { main: '#b388ff', dark: '#6200ea', light: '#d1c4e9', glow: '#d500f9' },
    'green':  { main: '#69f0ae', dark: '#00c853', light: '#b9f6ca', glow: '#00e676' },
    'pink':   { main: '#ff80ab', dark: '#c51162', light: '#ffc1e3', glow: '#ff4081' },
    'orange': { main: '#ffb74d', dark: '#ef6c00', light: '#ffe0b2', glow: '#ff9100' },
    'white':  { main: '#e0e0e0', dark: '#424242', light: '#ffffff', glow: '#ffffff' },
};

const MOODS = {
    // Shifted Eyes RIGHT (+10px from center) to face the cursor
    'happy': { 
        eyes: (id) => `<ellipse cx="58" cy="55" rx="5.5" ry="8" fill="#002f6c"/><ellipse cx="85" cy="55" rx="5.5" ry="8" fill="#002f6c"/>`, 
        mouth: `<path d="M 68 62 Q 71.5 68 75 62" stroke="#002f6c" stroke-width="2" fill="none" stroke-linecap="round"/>` 
    },
    'curious': { 
        eyes: (id) => `<circle cx="58" cy="55" r="6" fill="#002f6c"/><circle cx="85" cy="55" r="6" fill="#002f6c"/>`, 
        mouth: `<circle cx="71" cy="65" r="3" fill="#002f6c"/>` 
    },
    'sleepy': { 
        eyes: (id) => `<path d="M 52 55 Q 58 60 64 55" fill="none" stroke="#002f6c" stroke-width="2.5" stroke-linecap="round"/><path d="M 80 55 Q 86 60 92 55" fill="none" stroke="#002f6c" stroke-width="2.5" stroke-linecap="round"/>`, 
        mouth: `<path d="M 70 62 Q 72 60 74 62" fill="none" stroke="#002f6c" stroke-width="1.5" stroke-linecap="round"/>` 
    },
    'nerdy': {
        eyes: (id) => `
            <circle cx="58" cy="55" r="5" fill="#002f6c"/><circle cx="85" cy="55" r="5" fill="#002f6c"/>
            <g stroke="#333" stroke-width="2" fill="rgba(255,255,255,0.2)">
                <circle cx="58" cy="55" r="10"/><circle cx="85" cy="55" r="10"/>
                <line x1="68" y1="55" x2="75" y2="55" stroke-width="2"/>
            </g>`,
        mouth: `<path d="M 68 65 Q 72 68 76 65" fill="none" stroke="#002f6c" stroke-width="2" stroke-linecap="round"/>`
    }
};

const ACCESSORIES = {
    'none': '',
    // Hat shifted right to match head tilt
    'hat': `
        <g transform="translate(30, -10) rotate(10)">
            <ellipse cx="60" cy="25" rx="25" ry="8" fill="#3e2723"/>
            <path d="M 40 25 L 80 25 L 72 5 L 48 5 Z" fill="#5d4037"/>
            <rect x="35" y="24" width="50" height="4" fill="#3e2723" rx="1"/>
        </g>`,
    'sparkles': `
        <g fill="#fff" filter="url(#outerGlow)">
            <!-- Sparkles moved to right (leading edge) -->
            <circle cx="110" cy="20" r="3" opacity="0.9"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle>
            <circle cx="90" cy="10" r="2" opacity="0.7"/>
        </g>`,
    'runes': `
        <g fill="rgba(255,255,255,0.6)" font-family="monospace" font-weight="bold">
            <text x="100" y="40" font-size="12">∑</text>
            <text x="20" y="20" font-size="10">?</text>
        </g>`
};

export function generateCursorGhost(config = {}) {
    const uniqueId = Math.floor(Math.random() * 10000);
    
    const colorKey = config.color || 'blue';
    const moodKey = config.mood || 'happy';
    const accKey = config.accessory || 'none';

    const theme = COLORS[colorKey] || COLORS['blue'];
    const mood = MOODS[moodKey] || MOODS['happy'];
    const accessorySvg = ACCESSORIES[accKey] || '';

    const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 150" width="140" height="150" overflow="visible">`;
    const svgFooter = `</svg>`;

    const defs = `
        <defs>
            <linearGradient id="bodyBlender${uniqueId}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="20%" stop-color="${theme.light}" stop-opacity="1"/>
                <stop offset="60%" stop-color="${theme.main}" stop-opacity="0.8"/>
                <stop offset="95%" stop-color="${theme.dark}" stop-opacity="0.1"/> 
            </linearGradient>

            <radialGradient id="inkBaseGrad${uniqueId}" cx="50%" cy="100%" r="80%" fx="50%" fy="100%">
                 <stop offset="40%" stop-color="#000a12" stop-opacity="1"/>
                 <stop offset="100%" stop-color="${theme.dark}" stop-opacity="0.8"/>
            </radialGradient>

            <filter id="outerGlow${uniqueId}" height="300%" width="300%" x="-75%" y="-75%">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            <filter id="textGlow${uniqueId}">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
    `;

    // --- The Deep Ink Tail Base (Flipped to trail left) ---
    // M 120 90 start point (right side)
    const inkBase = `
        <path d="M 120 100 
                 Q 135 115 130 130 
                 C 125 145 105 140 95 135
                 C 85 130 90 115 100 115
                 C 90 115 75 135 55 130
                 C 35 125 25 105 40 90
                 L 120 90 Z" 
              fill="url(#inkBaseGrad${uniqueId})" 
        />
        <path d="M 115 110 Q 125 125 115 135 Q 100 125 105 110" fill="#000a12" opacity="0.6"/>
    `;

    // --- The Main Ghost Body (Tilted Right) ---
    // Curves modified to lean towards x=80/90
    const ghostBody = `
        <g filter="url(#outerGlow${uniqueId})">
            <path d="M 80 15
                     C 110 15 125 50 115 85 
                     C 110 105 90 115 65 110
                     C 40 105 25 80 30 50
                     C 35 25 55 15 80 15 Z" 
                  fill="url(#bodyBlender${uniqueId})" 
            />
            <!-- Highlight moved right -->
            <ellipse cx="90" cy="30" rx="12" ry="6" fill="white" opacity="0.4" transform="rotate(25 90 30)"/>
        </g>
    `;

    // --- Face Group (Using updated MOOD coordinates) ---
    const face = `
        <g>
            ${typeof mood.eyes === 'function' ? mood.eyes(uniqueId) : mood.eyes}
            ${mood.mouth}
        </g>
    `;

    // --- The Book (Held on the right) ---
    // Rotated +15 deg to tilt with the body
    const book = `
        <g transform="translate(90, 75) rotate(15)">
            <path d="M 5 15 L 35 15 L 30 22 L 10 22 Z" fill="#fff3e0"/>
            <line x1="11" y1="17" x2="29" y2="17" stroke="#d7ccc8" stroke-width="1"/>
            <line x1="12" y1="19" x2="28" y2="19" stroke="#d7ccc8" stroke-width="1"/>

            <path d="M 0 0 L 20 15 L 18 18 L -2 3 Z" fill="#5d4037" stroke="#3e2723" stroke-width="1"/>
            <path d="M 40 0 L 20 15 L 22 18 L 42 3 Z" fill="#5d4037" stroke="#3e2723" stroke-width="1"/>
            
            <path d="M 18 18 L 20 15 L 15 16 Z" fill="#ffb300"/>
            <path d="M 22 18 L 20 15 L 25 16 Z" fill="#ffb300"/>
            
            <!-- Right Hand holding book -->
            <circle cx="35" cy="5" r="5" fill="${theme.main}"/>
        </g>
        <!-- Left Hand (separate to look natural) -->
        <circle cx="40" cy="85" r="5" fill="${theme.main}" stroke="${theme.dark}" stroke-width="1"/>
    `;

    // --- Floating Magic Letters (Trailing left) ---
    const letters = `
        <g font-family="Georgia, serif" font-weight="bold" fill="${theme.light}" font-size="10" filter="url(#textGlow${uniqueId})">
            <!-- Letters moving backwards (left) as ghost moves right -->
            <text x="30" y="65">R <animate attributeName="x" values="30;10" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="3s"/></text>
            <text x="40" y="85" font-size="12">A <animate attributeName="x" values="40;20" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="4s"/></text>
            
            <text x="10" y="50">I <animate attributeName="y" values="50;40" dur="3s" repeatCount="indefinite"/></text>
        </g>
    `;

    // --- Motion Trails (Behind on the LEFT) ---
    const motionTrails = `
        <g stroke="${theme.main}" stroke-width="2" stroke-linecap="round" opacity="0.6">
            <path d="M 35 60 L 25 60" opacity="0.5">
                 <animate attributeName="d" values="M 35 60 L 25 60; M 30 60 L 20 60; M 35 60 L 25 60" dur="1s" repeatCount="indefinite"/>
            </path>
            <path d="M 40 80 L 28 85" opacity="0.4">
                 <animate attributeName="opacity" values="0.4; 0.1; 0.4" dur="1.5s" repeatCount="indefinite"/>
            </path>
        </g>
    `;

    const fullSvg = svgHeader + defs + inkBase + ghostBody + face + accessorySvg + book + letters + motionTrails + svgFooter;

    return "data:image/svg+xml;base64," + btoa(fullSvg);
}