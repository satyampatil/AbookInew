// --- CURSOR CHASING GHOST GENERATOR ---
// Updated: Realistic Open Book with Page Flip Animation

const COLORS = {
    'blue':   { main: '#40c4ff', dark: '#0d47a1', light: '#a7ffff', glow: '#80d8ff' },
    'purple': { main: '#b388ff', dark: '#6200ea', light: '#d1c4e9', glow: '#d500f9' },
    'green':  { main: '#69f0ae', dark: '#00c853', light: '#b9f6ca', glow: '#00e676' },
    'pink':   { main: '#ff80ab', dark: '#c51162', light: '#ffc1e3', glow: '#ff4081' },
    'orange': { main: '#ffb74d', dark: '#ef6c00', light: '#ffe0b2', glow: '#ff9100' },
    'white':  { main: '#e0e0e0', dark: '#424242', light: '#ffffff', glow: '#ffffff' },
};

const MOODS = {
    'happy': { 
        eyes: (id) => `<ellipse cx="73" cy="55" rx="5.5" ry="8" fill="#002f6c"/><ellipse cx="100" cy="55" rx="5.5" ry="8" fill="#002f6c"/>`, 
        mouth: `<path d="M 83 62 Q 86.5 68 90 62" stroke="#002f6c" stroke-width="2" fill="none" stroke-linecap="round"/>` 
    },
    'curious': { 
        eyes: (id) => `<circle cx="73" cy="55" r="6" fill="#002f6c"/><circle cx="100" cy="55" r="6" fill="#002f6c"/>`, 
        mouth: `<circle cx="86" cy="65" r="3" fill="#002f6c"/>` 
    },
    'sleepy': { 
        eyes: (id) => `<path d="M 67 55 Q 73 60 79 55" fill="none" stroke="#002f6c" stroke-width="2.5" stroke-linecap="round"/><path d="M 95 55 Q 101 60 107 55" fill="none" stroke="#002f6c" stroke-width="2.5" stroke-linecap="round"/>`, 
        mouth: `<path d="M 85 62 Q 87 60 89 62" fill="none" stroke="#002f6c" stroke-width="1.5" stroke-linecap="round"/>` 
    },
    'nerdy': {
        eyes: (id) => `
            <circle cx="73" cy="55" r="5" fill="#002f6c"/><circle cx="100" cy="55" r="5" fill="#002f6c"/>
            <g stroke="#333" stroke-width="2" fill="rgba(255,255,255,0.2)">
                <circle cx="73" cy="55" r="10"/><circle cx="100" cy="55" r="10"/>
                <line x1="83" y1="55" x2="90" y2="55" stroke-width="2"/>
            </g>`,
        mouth: `<path d="M 83 65 Q 87 68 91 65" fill="none" stroke="#002f6c" stroke-width="2" stroke-linecap="round"/>`
    }
};

const ACCESSORIES = {
    'none': '',
    'hat': `
        <g transform="translate(45, -10) rotate(10)">
            <ellipse cx="60" cy="25" rx="25" ry="8" fill="#3e2723"/>
            <path d="M 40 25 L 80 25 L 72 5 L 48 5 Z" fill="#5d4037"/>
            <rect x="35" y="24" width="50" height="4" fill="#3e2723" rx="1"/>
        </g>`,
    'sparkles': `
        <g fill="#fff" filter="url(#outerGlow)">
            <circle cx="125" cy="20" r="3" opacity="0.9"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle>
            <circle cx="105" cy="10" r="2" opacity="0.7"/>
        </g>`,
    'runes': `
        <g fill="rgba(255,255,255,0.6)" font-family="monospace" font-weight="bold">
            <text x="115" y="40" font-size="12">∑</text>
            <text x="35" y="20" font-size="10">?</text>
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
                <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
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

    // --- The Main Ghost Body (Using Custom Ink Shape) ---
    const ghostBody = `
        <g transform="translate(10, 10) scale(6)" filter="url(#outerGlow${uniqueId})">
            <path d="M6 1M6 1C7 1 5 2 4 3M2 15c-2 0-2 3-1 3s1 1 1 1 0 1 1 1q2 0 3 1L4 18c-1-1-1 0-2-1s0-2 1-2m3 6c1 2 10 5 13-2S20-3 10 1C7 2 5 7 6 9q1 2 1 5c0 3-2 5-3 4M4 3Q4 1 6 1" 
                  fill="url(#bodyBlender${uniqueId})" />
            <ellipse cx="10" cy="5" rx="2" ry="1" fill="white" opacity="0.4" transform="rotate(25 10 5)"/>
        </g>
    `;

    // --- Face ---
    const face = `
        <g>
            ${typeof mood.eyes === 'function' ? mood.eyes(uniqueId) : mood.eyes}
            ${mood.mouth}
        </g>
    `;

    // --- The Book (Correct Orientation + Flipping) ---
    const book = `
        <g transform="translate(90, 75) rotate(15)">
            
            <!-- Hands holding from underneath -->
            <circle cx="-5" cy="15" r="5" fill="${theme.main}"/>
            <circle cx="35" cy="15" r="5" fill="${theme.main}"/>

            <!-- Back Cover (Dark Brown) -->
            <!-- Trapezoid shape to simulate open book angle -->
            <path d="M -10 5 L 15 15 L 40 5 L 40 8 L 15 20 L -10 8 Z" fill="#3e2723"/>

            <!-- Left Page Block (White) -->
            <path d="M -8 5 L 15 14 L 15 18 L -8 9 Z" fill="#f5f5f5"/>
            <!-- Right Page Block (White) -->
            <path d="M 15 14 L 38 5 L 38 9 L 15 18 Z" fill="#f5f5f5"/>

            <!-- Spine Line -->
            <path d="M 15 14 L 15 20" stroke="#3e2723" stroke-width="1" stroke-linecap="round"/>

            <!-- FAKE PAGE FLIP ANIMATION -->
            <!-- Path moves from Right Page -> Up (Arch) -> Left Page -->
            <path fill="#ffffff" stroke="#e0e0e0" stroke-width="0.5" opacity="0.9">
                <animate attributeName="d"
                    values="M 15 14 Q 26 10 38 5 L 15 14; 
                            M 15 14 Q 15 -5 15 -5 L 15 14; 
                            M 15 14 Q 4 10 -8 5 L 15 14"
                    dur="2.5s" 
                    repeatCount="indefinite"
                    keyTimes="0; 0.5; 1"
                    calcMode="spline" 
                    keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" 
                />
                <!-- Fade out slightly at the end of flip to blend -->
                <animate attributeName="opacity" values="1; 1; 0" dur="2.5s" repeatCount="indefinite"/>
            </path>
        </g>
    `;

    // --- Floating Magic Letters ---
    const letters = `
        <g font-family="Georgia, serif" font-weight="bold" fill="${theme.light}" font-size="10" filter="url(#textGlow${uniqueId})">
            <text x="30" y="130">R <animate attributeName="x" values="10;1" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="3s"/></text>
            <text x="40" y="140" font-size="12">A <animate attributeName="x" values="30;10" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="4s"/></text>
            <text x="5" y="120">I <animate attributeName="y" values="120;100" dur="3s" repeatCount="indefinite"/></text>
        </g>
    `;

    // --- Motion Trails ---
    const motionTrails = `
        <g stroke="${theme.main}" stroke-width="2" stroke-linecap="round" opacity="0.6">
            <path d="M 20 125 L 10 125" opacity="0.5">
                 <animate attributeName="d" values="M 20 125 L 10 125; M 25 125 L 15 125; M 20 125 L 10 125" dur="1s" repeatCount="indefinite"/>
            </path>
            <path d="M 25 135 L 15 140" opacity="0.4">
                 <animate attributeName="opacity" values="0.4; 0.1; 0.4" dur="1.5s" repeatCount="indefinite"/>
            </path>
        </g>
    `;

    const fullSvg = svgHeader + defs + ghostBody + face + accessorySvg + book + letters + motionTrails + svgFooter;

    return "data:image/svg+xml;base64," + btoa(fullSvg);
}