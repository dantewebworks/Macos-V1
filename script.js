// ==================== GLOBAL & SYSTEM ====================
// Cache DOM elements for better performance
const domCache = {};
function getCached(id) {
    if (!domCache[id]) {
        domCache[id] = document.getElementById(id);
    }
    return domCache[id];
}

// Get Dock dimensions and calculate usable screen area
const MENU_BAR_HEIGHT = 28;
const DOCK_MARGIN = 8; // bottom margin of dock

function getDockBounds() {
    const dock = document.getElementById('dock');
    if (!dock) return { height: 70, top: window.innerHeight - 70 };
    const rect = dock.getBoundingClientRect();
    return {
        height: rect.height + DOCK_MARGIN,
        top: rect.top - DOCK_MARGIN,
        left: rect.left,
        right: rect.right,
        width: rect.width
    };
}

function getUsableScreenArea() {
    const dockBounds = getDockBounds();
    return {
        top: MENU_BAR_HEIGHT,
        left: 0,
        right: window.innerWidth,
        bottom: dockBounds.top,
        width: window.innerWidth,
        height: dockBounds.top - MENU_BAR_HEIGHT
    };
}

// ==================== WINDOW STATE MANAGEMENT ====================
// Window states: 'open', 'minimized', 'closed'
const windowStates = {};

// Window to Dock app mapping
const windowToDockApp = {
    'calculator': 'calculator',
    'fruitNinja': 'fruitninja',
    'folderWindow': 'finder',
    'imageEditor': 'imageeditor',
    'notesApp': 'notes',
    'settingsApp': 'settings',
    'gramfinderApp': 'gramfinder'
};

// Initialize window state
function initWindowState(windowId) {
    if (!windowStates[windowId]) {
        const windowEl = document.getElementById(windowId);
        windowStates[windowId] = {
            state: 'closed',
            prevBounds: null,
            zIndex: 100
        };
    }
    return windowStates[windowId];
}

// Get dock icon position for animation target
function getDockIconPosition(appId) {
    const dockIcon = document.querySelector(`.dock-icon[data-app="${appId}"]`);
    if (!dockIcon) return { x: window.innerWidth / 2, y: window.innerHeight - 40 };
    const rect = dockIcon.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

// Minimize window with animation
function minimizeWindow(windowId) {
    const windowEl = document.getElementById(windowId);
    if (!windowEl) return;

    const state = initWindowState(windowId);
    const appId = windowToDockApp[windowId];
    const dockPos = getDockIconPosition(appId);
    const windowRect = windowEl.getBoundingClientRect();

    // Save current bounds
    state.prevBounds = {
        left: windowEl.style.left,
        top: windowEl.style.top,
        width: windowEl.style.width,
        height: windowEl.style.height,
        display: windowEl.style.display
    };

    // Calculate transform to dock icon
    const scaleX = 48 / windowRect.width;
    const scaleY = 48 / windowRect.height;
    const scale = Math.min(scaleX, scaleY);
    const translateX = dockPos.x - (windowRect.left + windowRect.width / 2);
    const translateY = dockPos.y - (windowRect.top + windowRect.height / 2);

    // Apply minimize animation
    windowEl.classList.add('window-minimizing');
    windowEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    windowEl.style.opacity = '0';

    state.state = 'minimized';
    activeWindow = null;

    // After animation, hide the window
    setTimeout(() => {
        windowEl.classList.remove('window-minimizing');
        windowEl.style.display = 'none';
        windowEl.style.transform = '';
        windowEl.style.opacity = '';
        updateDockIndicators();
    }, 500);
}

// Restore window with animation
function restoreWindow(windowId) {
    const windowEl = document.getElementById(windowId);
    if (!windowEl) return;

    const state = windowStates[windowId];
    if (!state || state.state !== 'minimized') return;

    const appId = windowToDockApp[windowId];
    const dockPos = getDockIconPosition(appId);

    // Start from dock position
    const prevBounds = state.prevBounds || {};
    const tempLeft = parseFloat(prevBounds.left) || 100;
    const tempTop = parseFloat(prevBounds.top) || 100;
    const windowWidth = parseFloat(prevBounds.width) || 400;
    const windowHeight = parseFloat(prevBounds.height) || 300;

    const scaleX = 48 / windowWidth;
    const scaleY = 48 / windowHeight;
    const scale = Math.min(scaleX, scaleY);
    const translateX = dockPos.x - (tempLeft + windowWidth / 2);
    const translateY = dockPos.y - (tempTop + windowHeight / 2);

    // Position at dock first
    windowEl.style.left = prevBounds.left || '100px';
    windowEl.style.top = prevBounds.top || '100px';
    windowEl.style.width = prevBounds.width || '400px';
    windowEl.style.height = prevBounds.height || '300px';
    windowEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    windowEl.style.opacity = '0';
    windowEl.style.display = prevBounds.display || 'block';

    // Force reflow
    windowEl.offsetHeight;

    // Animate to restored position
    windowEl.classList.add('window-restoring');
    windowEl.style.transform = '';
    windowEl.style.opacity = '1';

    state.state = 'open';
    bringToFront(windowEl);

    setTimeout(() => {
        windowEl.classList.remove('window-restoring');
        updateDockIndicators();
    }, 400);
}

// Update dock indicator dots
function updateDockIndicators() {
    // Remove existing indicators
    document.querySelectorAll('.dock-icon-indicator').forEach(el => el.remove());

    // Check each window state and add indicators
    Object.entries(windowToDockApp).forEach(([windowId, appId]) => {
        const state = windowStates[windowId];
        const dockIcon = document.querySelector(`.dock-icon[data-app="${appId}"]`);
        if (!dockIcon) return;

        // Make sure dock icon has relative positioning
        dockIcon.style.position = 'relative';

        if (state && (state.state === 'open' || state.state === 'minimized')) {
            let indicator = dockIcon.querySelector('.dock-icon-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'dock-icon-indicator';
                dockIcon.appendChild(indicator);
            }

            indicator.innerHTML = '';
            const dot = document.createElement('div');
            dot.className = 'dock-indicator-dot' + (state.state === 'minimized' ? ' minimized' : '');
            indicator.appendChild(dot);
        }
    });
}

// Handle dock icon click - restore if minimized
function handleDockIconClick(appId) {
    // Find window for this app
    const windowId = Object.entries(windowToDockApp).find(([wId, aId]) => aId === appId)?.[0];
    if (!windowId) return false;

    const state = windowStates[windowId];
    if (state && state.state === 'minimized') {
        restoreWindow(windowId);
        return true;
    }
    return false;
}

// ==================== DOCK CONFIGURATION ====================
let dockConfig = {
    icons: ['launchpad', 'finder', 'calculator', 'fruitninja', 'imageeditor', 'notes', 'settings', 'gramfinder', 'trash'],
    userApps: [],
    order: null
};

// Load dock configuration from localStorage
function loadDockConfig() {
    try {
        const saved = localStorage.getItem('dockConfig');
        if (saved) {
            dockConfig = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading dock config:', e);
    }
}

// Save dock configuration to localStorage
function saveDockConfig() {
    try {
        localStorage.setItem('dockConfig', JSON.stringify(dockConfig));
    } catch (e) {
        console.error('Error saving dock config:', e);
    }
}

// Setup dock icon dragging for reordering
function setupDockDragging() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    let draggedIcon = null;
    let draggedIndex = -1;

    dock.querySelectorAll('.dock-icon').forEach((icon, index) => {
        icon.setAttribute('draggable', 'true');

        icon.addEventListener('dragstart', (e) => {
            // Don't allow dragging trash
            if (icon.dataset.app === 'trash') {
                e.preventDefault();
                return;
            }
            draggedIcon = icon;
            draggedIndex = index;
            icon.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        icon.addEventListener('dragend', () => {
            if (draggedIcon) {
                draggedIcon.classList.remove('dragging');
            }
            dock.querySelectorAll('.dock-icon').forEach(i => {
                i.classList.remove('drag-over', 'drag-over-left');
            });
            draggedIcon = null;
            updateDockOrder();
        });

        icon.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedIcon || draggedIcon === icon) return;
            if (icon.dataset.app === 'trash') return;

            const rect = icon.getBoundingClientRect();
            const midX = rect.left + rect.width / 2;

            icon.classList.remove('drag-over', 'drag-over-left');
            if (e.clientX < midX) {
                icon.classList.add('drag-over-left');
            } else {
                icon.classList.add('drag-over');
            }
        });

        icon.addEventListener('dragleave', () => {
            icon.classList.remove('drag-over', 'drag-over-left');
        });

        icon.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedIcon || draggedIcon === icon) return;
            if (icon.dataset.app === 'trash') return;

            const rect = icon.getBoundingClientRect();
            const midX = rect.left + rect.width / 2;

            if (e.clientX < midX) {
                dock.insertBefore(draggedIcon, icon);
            } else {
                dock.insertBefore(draggedIcon, icon.nextSibling);
            }

            icon.classList.remove('drag-over', 'drag-over-left');
        });
    });
}

// Update dock order in config
function updateDockOrder() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    dockConfig.order = [];
    dock.querySelectorAll('.dock-icon').forEach(icon => {
        if (icon.dataset.app) {
            dockConfig.order.push(icon.dataset.app);
        }
    });
    saveDockConfig();
}

// Optimized clock update - only update when minute changes
let lastMinute = -1;
function updateClock() {
    const now = new Date();
    const currentMinute = now.getMinutes();

    // Only update DOM if minute changed
    if (currentMinute !== lastMinute) {
        lastMinute = currentMinute;
        const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
        const clockEl = getCached('clock');
        if (clockEl) clockEl.textContent = now.toLocaleString('en-US', options);
    }
}
updateClock();
setInterval(updateClock, 5000); // Check every 5 seconds instead of 1

function updateMenuAppName(name) {
    const el = document.getElementById('menuAppName');
    if (el) el.textContent = name;
}

let activeWindow = null;
let maxZIndex = 100;

function bringToFront(element) {
    if (!element) return;
    maxZIndex++;
    element.style.zIndex = maxZIndex;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `position: fixed; top: 50px; left: 50%; transform: translateX(-50%); background: rgba(0, 122, 255, 0.9); color: white; padding: 12px 24px; border-radius: 8px; font-size: 14px; z-index: 3000; animation: fadeInOut 2s ease forwards;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    if (!document.getElementById('notificationStyle')) {
        const style = document.createElement('style');
        style.id = 'notificationStyle';
        style.textContent = `@keyframes fadeInOut { 0% { opacity: 0; transform: translateX(-50%) translateY(-10px); } 15% { opacity: 1; transform: translateX(-50%) translateY(0); } 85% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); } }`;
        document.head.appendChild(style);
    }
    setTimeout(() => notification.remove(), 2000);
}

// ==================== CALCULATOR ====================
let currentValue = '0';
let previousValue = '';
let operator = null;
let shouldResetDisplay = false;

function updateDisplay() {
    const display = document.getElementById('display');
    if (!display) return;
    let displayValue = currentValue;
    if (displayValue.length > 9) {
        const num = parseFloat(displayValue);
        if (Math.abs(num) >= 1e9 || (Math.abs(num) < 1e-6 && num !== 0)) {
            displayValue = num.toExponential(2);
        } else {
            displayValue = displayValue.substring(0, 9);
        }
    }
    display.textContent = displayValue;
}

function appendNumber(num) {
    if (shouldResetDisplay) {
        currentValue = num;
        shouldResetDisplay = false;
    } else {
        if (currentValue === '0' && num !== '.') {
            currentValue = num;
        } else if (currentValue.replace(/[^0-9]/g, '').length < 9) {
            currentValue += num;
        }
    }
    updateDisplay();
}

function appendDecimal() {
    if (shouldResetDisplay) {
        currentValue = '0.';
        shouldResetDisplay = false;
    } else if (!currentValue.includes('.')) {
        currentValue += '.';
    }
    updateDisplay();
}

function clearAll() {
    currentValue = '0';
    previousValue = '';
    operator = null;
    shouldResetDisplay = false;
    updateDisplay();
}

function toggleSign() {
    if (currentValue !== '0') {
        currentValue = currentValue.startsWith('-') ? currentValue.substring(1) : '-' + currentValue;
    }
    updateDisplay();
}

function percentage() {
    currentValue = (parseFloat(currentValue) / 100).toString();
    updateDisplay();
}

function setOperator(op) {
    if (operator && !shouldResetDisplay) calculate();
    previousValue = currentValue;
    operator = op;
    shouldResetDisplay = true;
}

function calculate() {
    if (!operator || shouldResetDisplay) return;
    const prev = parseFloat(previousValue);
    const current = parseFloat(currentValue);
    let result;
    switch (operator) {
        case '+': result = prev + current; break;
        case '-': result = prev - current; break;
        case '*': result = prev * current; break;
        case '/': result = current === 0 ? 'Error' : prev / current; break;
        default: return;
    }
    currentValue = result === 'Error' ? 'Error' : parseFloat(result.toPrecision(12)).toString();
    operator = null;
    previousValue = '';
    shouldResetDisplay = true;
    updateDisplay();
}

function openCalculator() {
    const el = document.getElementById('calculator');
    const state = initWindowState('calculator');

    // If minimized, restore instead
    if (state.state === 'minimized') {
        restoreWindow('calculator');
        return;
    }

    el.style.display = 'block';
    state.state = 'open';
    activeWindow = 'calculator';
    bringToFront(el);
    updateMenuAppName('Calculator');
    hideContextMenu();
    updateDockIndicators();
}

function closeCalculator() {
    const state = initWindowState('calculator');
    document.getElementById('calculator').style.display = 'none';
    state.state = 'closed';
    activeWindow = null;
    updateDockIndicators();
}

function minimizeCalculator() {
    minimizeWindow('calculator');
}

function maximizeCalculator() {
    const calc = document.getElementById('calculator');
    const screen = getUsableScreenArea();
    if (calc.classList.contains('maximized')) {
        calc.classList.remove('maximized');
        calc.style.width = '260px';
        calc.style.height = 'auto';
        calc.style.top = '100px';
        calc.style.left = '50px';
    } else {
        calc.classList.add('maximized');
        calc.style.width = '350px';
        calc.style.height = Math.min(500, screen.height - 20) + 'px';
        calc.style.top = screen.top + 'px';
    }
}

// Calculator keyboard support
document.addEventListener('keydown', (e) => {
    if (activeWindow === 'fruitNinja' || activeWindow === 'imageEditor' || activeWindow === 'notes') return;
    if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
    else if (e.key === '.') appendDecimal();
    else if (e.key === '+') setOperator('+');
    else if (e.key === '-') setOperator('-');
    else if (e.key === '*') setOperator('*');
    else if (e.key === '/') { e.preventDefault(); setOperator('/'); }
    else if (e.key === 'Enter' || e.key === '=') calculate();
    else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') clearAll();
    else if (e.key === 'Backspace') {
        if (currentValue.length > 1) currentValue = currentValue.slice(0, -1);
        else currentValue = '0';
        updateDisplay();
    }
});

// ==================== FRUIT NINJA ====================
const canvas = document.getElementById('gameCanvas');
let ctx = null; // Will be initialized when game starts
let gameRunning = false;
let score = 0;
let lives = 3;
let fruits = [];
let particles = [];
let sliceTrail = [];
let isSlicing = false;
let lastMousePos = { x: 0, y: 0 };
let spawnInterval = null;
let animationId = null;

const fruitTypes = [
    { emoji: '🍎', color: '#ff4444' },
    { emoji: '🍊', color: '#ff8844' },
    { emoji: '🍋', color: '#ffff44' },
    { emoji: '🍉', color: '#ff4488' },
    { emoji: '🍇', color: '#8844ff' },
    { emoji: '🍓', color: '#ff2288' },
    { emoji: '🍑', color: '#ffaa88' },
    { emoji: '🥝', color: '#88ff44' }
];

class Fruit {
    constructor(x, y, vx, vy, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.radius = 30;
        this.sliced = false;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.gravity = 0.15;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        context.font = '50px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.type.emoji, 0, 0);
        context.restore();
    }

    isOffScreen() {
        return this.y > canvas.height + 50;
    }

    // FIX: Returns the distance to the slice line
    getDistanceToSlice(x, y, prevX, prevY) {
        if (this.sliced) return Infinity;
        const A = x - prevX;
        const B = y - prevY;
        const C = this.x - x;
        const D = this.y - y;
        const dot = A * C + B * D;
        const lenSq = A * A + B * B;
        let param = lenSq !== 0 ? dot / lenSq : -1;
        let xx, yy;
        if (param < 0) { xx = x; yy = y; }
        else if (param > 1) { xx = prevX; yy = prevY; }
        else { xx = x + param * A; yy = y + param * B; }
        return Math.sqrt((this.x - xx) ** 2 + (this.y - yy) ** 2);
    }
}

class Bomb extends Fruit {
    constructor(x, y, vx, vy) {
        super(x, y, vx, vy, { emoji: '💣', color: '#333' });
        this.radius = 35;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 2;
        this.color = color;
        this.radius = Math.random() * 4 + 2;
        this.life = 1;
        this.gravity = 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= 0.02;
    }

    draw(context) {
        context.save();
        context.globalAlpha = this.life;
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    const gameWindow = document.getElementById('fruitNinja');
    canvas.width = container.clientWidth;
    canvas.height = gameWindow.clientHeight - 38;
}

function spawnFruit() {
    if (!gameRunning) return;
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = canvas.height + 30;
    const vx = (Math.random() - 0.5) * 4;
    const vy = -(Math.random() * 6 + 10);
    if (Math.random() < 0.15) {
        fruits.push(new Bomb(x, y, vx, vy));
    } else {
        const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
        fruits.push(new Fruit(x, y, vx, vy, type));
    }
}

function createSplode(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function sliceFruit(fruit, index) {
    fruits.splice(index, 1);
    fruit.sliced = true;
    score += 10;
    document.getElementById('score').textContent = score;
    createSplode(fruit.x, fruit.y, fruit.type.color);
    for (let i = 0; i < 2; i++) {
        const half = new Particle(
            fruit.x + (Math.random() - 0.5) * 20,
            fruit.y + (Math.random() - 0.5) * 20,
            fruit.type.color
        );
        half.radius = 15;
        half.vx = (Math.random() - 0.5) * 6;
        half.vy = (Math.random() - 0.5) * 6;
        particles.push(half);
    }
}

function hitBomb() {
    gameRunning = false;
    clearInterval(spawnInterval);
    cancelAnimationFrame(animationId);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').classList.add('show');
}

function loseLife() {
    lives--;
    if (lives < 3) {
        document.getElementById(`life${3 - lives}`).classList.add('lost');
    }
    if (lives <= 0) {
        gameRunning = false;
        clearInterval(spawnInterval);
        cancelAnimationFrame(animationId);
        document.getElementById('finalScore').textContent = score;
        document.getElementById('gameOverScreen').classList.add('show');
    }
}

function gameLoop() {
    if (!gameRunning || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw slice trail
    if (sliceTrail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(sliceTrail[0].x, sliceTrail[0].y);
        for (let i = 1; i < sliceTrail.length; i++) {
            ctx.lineTo(sliceTrail[i].x, sliceTrail[i].y);
        }
        ctx.strokeStyle = 'rgba(255,255,255, 0.8)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // Update and draw fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i];
        fruit.update();
        fruit.draw(ctx);
        if (fruit.isOffScreen()) {
            if (!fruit.sliced && !(fruit instanceof Bomb)) loseLife();
            fruits.splice(i, 1);
        }
    }

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.update();
        particle.draw(ctx);
        if (particle.life <= 0) particles.splice(i, 1);
    }

    // Clean old trail points
    sliceTrail = sliceTrail.filter((point) => Date.now() - point.time < 100);

    animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    // FIX: Initialize canvas context here
    ctx = canvas.getContext('2d');
    resizeCanvas();
    score = 0;
    lives = 3;
    fruits = [];
    particles = [];
    sliceTrail = [];
    gameRunning = true;
    document.getElementById('score').textContent = '0';
    document.getElementById('life1').classList.remove('lost');
    document.getElementById('life2').classList.remove('lost');
    document.getElementById('life3').classList.remove('lost');
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').classList.remove('show');
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnFruit, 800);
    gameLoop();
}

// Canvas mouse events
if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
        isSlicing = true;
        const rect = canvas.getBoundingClientRect();
        lastMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        sliceTrail = [{ x: lastMousePos.x, y: lastMousePos.y, time: Date.now() }];
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isSlicing || !gameRunning) return;
        const rect = canvas.getBoundingClientRect();
        const currentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        sliceTrail.push({ x: currentPos.x, y: currentPos.y, time: Date.now() });

        // FIX: Check each fruit with proper distance comparison
        for (let i = fruits.length - 1; i >= 0; i--) {
            const fruit = fruits[i];
            const distance = fruit.getDistanceToSlice(currentPos.x, currentPos.y, lastMousePos.x, lastMousePos.y);
            // FIX: Compare distance to radius to determine if sliced
            if (distance < fruit.radius) {
                if (fruit instanceof Bomb) {
                    hitBomb();
                    return;
                } else if (!fruit.sliced) {
                    sliceFruit(fruit, i);
                }
            }
        }
        // FIX: This line was inside the for loop - moved outside
        lastMousePos = currentPos;
    });

    canvas.addEventListener('mouseup', () => {
        isSlicing = false;
        sliceTrail = [];
    });

    canvas.addEventListener('mouseleave', () => {
        isSlicing = false;
        sliceTrail = [];
    });
}

function openFruitNinja() {
    const state = initWindowState('fruitNinja');

    if (state.state === 'minimized') {
        restoreWindow('fruitNinja');
        setTimeout(() => resizeCanvas(), 50);
        return;
    }

    document.getElementById('fruitNinja').style.display = 'block';
    state.state = 'open';
    activeWindow = 'fruitNinja';
    bringToFront(document.getElementById('fruitNinja'));
    updateMenuAppName('Fruit Ninja');
    setTimeout(() => resizeCanvas(), 10);
    hideContextMenu();
    updateDockIndicators();
}

function closeFruitNinja() {
    const state = initWindowState('fruitNinja');
    gameRunning = false;
    if (spawnInterval) clearInterval(spawnInterval);
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('fruitNinja').style.display = 'none';
    state.state = 'closed';
    activeWindow = null;
    updateDockIndicators();
}

function minimizeFruitNinja() {
    gameRunning = false;
    if (spawnInterval) clearInterval(spawnInterval);
    if (animationId) cancelAnimationFrame(animationId);
    minimizeWindow('fruitNinja');
}

function maximizeFruitNinja() {
    const game = document.getElementById('fruitNinja');
    const screen = getUsableScreenArea();
    const maxHeight = screen.height - 20;
    if (game.style.width === '700px') {
        game.style.width = '500px';
        game.style.height = '400px';
    } else {
        game.style.width = '700px';
        game.style.height = Math.min(550, maxHeight) + 'px';
        game.style.top = screen.top + 'px';
    }
    setTimeout(() => resizeCanvas(), 50);
}

// ==================== FOLDER SYSTEM ====================
let desktopItems = [];
let folders = {};
let currentFolder = null;
let folderCounter = 0;
let imageCounter = 0;

function initDesktop() {
    addDesktopItem('folder', 'Documents');
    addDesktopItem('folder', 'Pictures');
    addDesktopItem('folder', 'Downloads');
    renderDesktop();
}

function addDesktopItem(type, name, content = null) {
    const id = type === 'folder' ? `folder_${folderCounter++}` : `image_${imageCounter++}`;
    const item = { id, type, name, content };
    desktopItems.push(item);
    if (type === 'folder') folders[id] = { name, items: [] };
    return item;
}

function renderDesktop() {
    const container = document.getElementById('desktopItems');
    container.innerHTML = '';
    desktopItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'desktop-item';
        div.onclick = () => {
            document.querySelectorAll('.desktop-item').forEach(el => el.style.background = '');
            div.style.background = 'rgba(0, 122, 255, 0.4)';
        };
        div.ondblclick = () => {
            if (item.type === 'folder') openFolder(item.id);
            else if (item.type === 'image') openImageEditorWithImage(item.content, item.name);
        };
        let iconHtml = item.type === 'folder'
            ? `<div class="folder-icon"></div>`
            : `<img src="${item.content}" class="folder-item-img">`;
        div.innerHTML = `<div class="desktop-item-icon">${iconHtml}</div><div class="desktop-item-name">${item.name}</div>`;
        container.appendChild(div);
    });
}

function openFolder(folderId) {
    const folder = folders[folderId];
    if (!folder) return;

    const state = initWindowState('folderWindow');

    if (state.state === 'minimized') {
        restoreWindow('folderWindow');
        currentFolder = folderId;
        document.getElementById('folderTitle').textContent = folder.name;
        renderFolderContent();
        return;
    }

    currentFolder = folderId;
    document.getElementById('folderTitle').textContent = folder.name;
    const folderWindow = document.getElementById('folderWindow');
    folderWindow.style.display = 'block';
    state.state = 'open';
    activeWindow = 'folder';
    bringToFront(folderWindow);
    updateMenuAppName(folder.name);
    renderFolderContent();
    hideContextMenu();
    updateDockIndicators();
}

function renderFolderContent() {
    const container = document.getElementById('folderContent');
    container.innerHTML = '';
    const folder = folders[currentFolder];
    if (!folder) return;
    if (folder.items.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align: center; color: rgba(255,255,255,0.5); padding-top: 80px;">
            <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 10px;"></i>
            <p>This folder is empty</p>
        </div>`;
        return;
    }
    folder.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.onclick = () => {
            if (item.type === 'image') openImageEditorWithImage(item.content, item.name);
        };
        div.innerHTML = item.type === 'folder'
            ? `<div class="folder-item-icon"><i class="fas fa-folder" style="color: #5fc9f8;"></i></div><div class="folder-item-name">${item.name}</div>`
            : `<img src="${item.content}" class="folder-item-img"><div class="folder-item-name">${item.name}</div>`;
        container.appendChild(div);
    });
}

function closeFolder() {
    const state = initWindowState('folderWindow');
    document.getElementById('folderWindow').style.display = 'none';
    state.state = 'closed';
    currentFolder = null;
    activeWindow = null;
    updateDockIndicators();
}

function minimizeFolder() {
    minimizeWindow('folderWindow');
}

function maximizeFolder() {
    const folder = document.getElementById('folderWindow');
    const screen = getUsableScreenArea();
    if (folder.classList.contains('maximized')) {
        folder.classList.remove('maximized');
        folder.style.width = '600px';
        folder.style.height = '450px';
        folder.style.top = '50px';
        folder.style.left = '200px';
    } else {
        folder.classList.add('maximized');
        folder.style.width = Math.min(900, screen.width - 40) + 'px';
        folder.style.height = Math.min(650, screen.height - 20) + 'px';
        folder.style.top = screen.top + 'px';
        folder.style.left = 'calc(50% - ' + Math.min(450, (screen.width - 40) / 2) + 'px)';
    }
}

function openFinder() {
    if (desktopItems.length > 0 && desktopItems[0].type === 'folder') {
        openFolder(desktopItems[0].id);
    }
}

function showNewFolderModal() {
    document.getElementById('newFolderModal').classList.add('show');
    document.getElementById('folderNameInput').value = '';
    document.getElementById('folderNameInput').focus();
    hideContextMenu();
}

function hideNewFolderModal() {
    document.getElementById('newFolderModal').classList.remove('show');
}

function confirmNewFolder() {
    const name = document.getElementById('folderNameInput').value.trim() || 'Untitled Folder';
    addDesktopItem('folder', name);
    renderDesktop();
    hideNewFolderModal();
}

function triggerUpload() {
    document.getElementById('fileInput').click();
    hideContextMenu();
}

function handleFileUpload(event) {
    const files = event.target.files;
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = { type: 'image', name: file.name, content: e.target.result };
                if (currentFolder && folders[currentFolder]) {
                    folders[currentFolder].items.push(item);
                    renderFolderContent();
                } else {
                    addDesktopItem('image', file.name, e.target.result);
                    renderDesktop();
                }
            };
            reader.readAsDataURL(file);
        }
    }
    event.target.value = '';
}

// Drag and drop handling
document.addEventListener('dragover', (e) => { e.preventDefault(); });
document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.target.closest('#folderWindow')) return;
    const files = e.dataTransfer.files;
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const item = { type: 'image', name: file.name, content: evt.target.result };
                if (currentFolder && folders[currentFolder]) {
                    folders[currentFolder].items.push(item);
                    renderFolderContent();
                } else {
                    addDesktopItem('image', file.name, evt.target.result);
                    renderDesktop();
                }
            };
            reader.readAsDataURL(file);
        }
    }
});

// ==================== IMAGE EDITOR ====================
let editorCanvas = null;
let editorCtx = null;
let originalImageData = null;

function initImageEditor() {
    editorCanvas = document.getElementById('editorCanvas');
    editorCtx = editorCanvas.getContext('2d');
}

function openImageEditor() {
    const state = initWindowState('imageEditor');

    if (state.state === 'minimized') {
        restoreWindow('imageEditor');
        return;
    }

    document.getElementById('imageEditor').style.display = 'block';
    state.state = 'open';
    activeWindow = 'imageEditor';
    bringToFront(document.getElementById('imageEditor'));
    updateMenuAppName('Image Editor');
    initImageEditor();
    hideContextMenu();
    updateDockIndicators();
}

function openImageEditorWithImage(imageSrc, name) {
    openImageEditor();
    loadImageToCanvas(imageSrc);
    document.getElementById('editorTitle').textContent = name;
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('editorCanvas').style.display = 'block';
    document.getElementById('editorToolbar').style.display = 'flex';
}

function loadImageToCanvas(imageSrc) {
    const img = new Image();
    img.onload = () => {
        let width = img.width, height = img.height, maxSize = 600;
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
            } else {
                width = (width / height) * maxSize;
                height = maxSize;
            }
        }
        editorCanvas.width = width;
        editorCanvas.height = height;
        editorCtx.drawImage(img, 0, 0, width, height);
        originalImageData = editorCtx.getImageData(0, 0, width, height);
        document.getElementById('brightnessSlider').value = 100;
        document.getElementById('contrastSlider').value = 100;
    };
    img.src = imageSrc;
}

function rotateImage(degrees) {
    if (!originalImageData) return;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = editorCanvas.height;
    tempCanvas.height = editorCanvas.width;
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(degrees * Math.PI / 180);
    const img = new Image();
    img.onload = () => {
        tempCtx.drawImage(img, -editorCanvas.width / 2, -editorCanvas.height / 2);
        editorCanvas.width = tempCanvas.width;
        editorCanvas.height = tempCanvas.height;
        editorCtx.drawImage(tempCanvas, 0, 0);
    };
    img.src = editorCanvas.toDataURL();
}

function flipImage(direction) {
    if (!originalImageData) return;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = editorCanvas.width;
    tempCanvas.height = editorCanvas.height;
    if (direction === 'horizontal') {
        tempCtx.translate(editorCanvas.width, 0);
        tempCtx.scale(-1, 1);
    } else {
        tempCtx.translate(0, editorCanvas.height);
        tempCtx.scale(1, -1);
    }
    const img = new Image();
    img.onload = () => {
        tempCtx.drawImage(img, 0, 0);
        editorCtx.drawImage(tempCanvas, 0, 0);
    };
    img.src = editorCanvas.toDataURL();
}

function applyFilters() {
    if (!originalImageData) return;
    const brightness = document.getElementById('brightnessSlider').value / 100;
    const contrast = document.getElementById('contrastSlider').value / 100;
    editorCtx.putImageData(originalImageData, 0, 0);
    const imageData = editorCtx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] *= brightness;
        data[i + 1] *= brightness;
        data[i + 2] *= brightness;
        data[i] = ((data[i] / 255 - 0.5) * contrast + 0.5) * 255;
        data[i + 1] = ((data[i + 1] / 255 - 0.5) * contrast + 0.5) * 255;
        data[i + 2] = ((data[i + 2] / 255 - 0.5) * contrast + 0.5) * 255;
        data[i] = Math.max(0, Math.min(255, data[i]));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }
    editorCtx.putImageData(imageData, 0, 0);
}

function resetFilters() {
    if (!originalImageData) return;
    document.getElementById('brightnessSlider').value = 100;
    document.getElementById('contrastSlider').value = 100;
    editorCtx.putImageData(originalImageData, 0, 0);
}

function applyAIFilter() {
    if (!originalImageData) return;
    const prompt = document.getElementById('aiPrompt').value.toLowerCase();
    if (!prompt) return;
    const imageData = editorCtx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
    const data = imageData.data;
    if (prompt.includes('grayscale') || prompt.includes('black and white') || prompt.includes('bw')) {
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }
    }
    if (prompt.includes('sepia') || prompt.includes('vintage') || prompt.includes('old')) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
            data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
            data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
    }
    if (prompt.includes('invert') || prompt.includes('negative')) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
    }
    editorCtx.putImageData(imageData, 0, 0);
    document.getElementById('aiPrompt').value = '';
}

function downloadImage() {
    if (!editorCanvas) return;
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = editorCanvas.toDataURL('image/png');
    link.click();
}

function closeImageEditor() {
    document.getElementById('imageEditor').style.display = 'none';
    activeWindow = null;
}

function minimizeImageEditor() {
    document.getElementById('imageEditor').style.display = 'none';
    activeWindow = null;
}

function maximizeImageEditor() {
    const editor = document.getElementById('imageEditor');
    const screen = getUsableScreenArea();
    if (editor.classList.contains('maximized')) {
        editor.classList.remove('maximized');
        editor.style.width = '700px';
        editor.style.height = 'auto';
        editor.style.top = '60px';
        editor.style.left = '150px';
    } else {
        editor.classList.add('maximized');
        editor.style.width = Math.min(1000, screen.width - 40) + 'px';
        editor.style.height = Math.min(700, screen.height - 20) + 'px';
        editor.style.top = screen.top + 'px';
        editor.style.left = 'calc(50% - ' + Math.min(500, (screen.width - 40) / 2) + 'px)';
    }
}

// ==================== NOTES APP ====================
let notes = [];
let currentNoteId = null;
let noteCounter = 0;
let folderStates = { all: true, favorites: true, personal: true };
let autoSaveTimeout = null;

function initNotes() {
    createNote('Welcome to Notes', '<h1>👋 Welcome to Notes!</h1><p>This is your new note-taking app with AI-powered features.</p><h2>Features:</h2><ul><li><strong>Rich Text Editing</strong></li><li><strong>AI Summarize</strong></li></ul>', 'personal');
    renderNotesList();
    if (notes.length > 0) selectNote(notes[0].id);
}

function createNote(title = 'Untitled Note', content = '', category = 'personal') {
    const note = {
        id: ++noteCounter,
        title: title,
        content: content,
        category: category,
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    notes.push(note);
    renderNotesList();
    return note;
}

function createNewNote() {
    const note = createNote();
    selectNote(note.id);
    document.getElementById('noteTitle').focus();
    updateMenuAppName('Notes');
}

function selectNote(id) {
    currentNoteId = id;
    const note = notes.find(n => n.id === id);
    if (!note) return;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteEditor').innerHTML = note.content;
    updateFavoriteButton();
    renderNotesList();
}

function getCurrentNote() {
    return notes.find(n => n.id === currentNoteId);
}

function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        const note = getCurrentNote();
        if (note) {
            note.title = document.getElementById('noteTitle').value || 'Untitled Note';
            note.content = document.getElementById('noteEditor').innerHTML;
            note.updatedAt = new Date();
            renderNotesList();
        }
    }, 500);
}

function deleteCurrentNote() {
    if (!currentNoteId) return;
    const index = notes.findIndex(n => n.id === currentNoteId);
    if (index > -1) {
        notes.splice(index, 1);
        currentNoteId = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteEditor').innerHTML = '';
        renderNotesList();
        if (notes.length > 0) selectNote(notes[0].id);
    }
}

// FIX: This function was missing its closing brace
function deleteNote(id) {
    const index = notes.findIndex(n => n.id === id);
    if (index > -1) {
        notes.splice(index, 1);
        if (currentNoteId === id) {
            currentNoteId = null;
            document.getElementById('noteTitle').value = '';
            document.getElementById('noteEditor').innerHTML = '';
            if (notes.length > 0) selectNote(notes[0].id);
        }
        renderNotesList();
    }
} // <-- This was missing!

function toggleFavorite() {
    const note = getCurrentNote();
    if (note) {
        note.favorite = !note.favorite;
        updateFavoriteButton();
        renderNotesList();
    }
}

function updateFavoriteButton() {
    const note = getCurrentNote();
    const btn = document.getElementById('favoriteBtn');
    if (note && note.favorite) {
        btn.innerHTML = '<i class="fas fa-star" style="color: #ffcc00;"></i>';
    } else {
        btn.innerHTML = '<i class="far fa-star"></i>';
    }
}

function renderNotesList() {
    const searchTerm = document.getElementById('notesSearch').value.toLowerCase();
    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(searchTerm) ||
        n.content.toLowerCase().includes(searchTerm)
    );
    document.getElementById('allNotesCount').textContent = filteredNotes.length;
    document.getElementById('favoritesCount').textContent = filteredNotes.filter(n => n.favorite).length;
    document.getElementById('personalCount').textContent = filteredNotes.filter(n => n.category === 'personal').length;
    renderNoteList(filteredNotes, 'allNotesList', () => true);
    renderNoteList(filteredNotes, 'favoritesList', n => n.favorite);
    renderNoteList(filteredNotes, 'personalList', n => n.category === 'personal');
}

function renderNoteList(notesArr, containerId, filterFn) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const filtered = notesArr.filter(filterFn);
    filtered.forEach(note => {
        const div = document.createElement('div');
        div.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
        div.innerHTML = `
            <span class="note-item-icon"><i class="far fa-file-alt"></i></span>
            <span class="note-item-title">${note.title}</span>
            <span class="note-item-delete" onclick="event.stopPropagation();deleteNote(${note.id})">
                <i class="fas fa-trash"></i>
            </span>
        `;
        div.onclick = () => { selectNote(note.id); };
        container.appendChild(div);
    });
}

function searchNotes() {
    renderNotesList();
}

function toggleFolder(header, folder) {
    folderStates[folder] = !folderStates[folder];
    header.classList.toggle('collapsed', !folderStates[folder]);
}

function formatText(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('noteEditor').focus();
}

function openNotes() {
    document.getElementById('notesApp').style.display = 'flex';
    activeWindow = 'notes';
    bringToFront(document.getElementById('notesApp'));
    updateMenuAppName('Notes');
    if (notes.length === 0) initNotes();
    hideContextMenu();
}

function closeNotes() {
    document.getElementById('notesApp').style.display = 'none';
    activeWindow = null;
}

function minimizeNotes() {
    document.getElementById('notesApp').style.display = 'none';
    activeWindow = null;
}

function maximizeNotes() {
    const notesEl = document.getElementById('notesApp');
    const screen = getUsableScreenArea();
    if (notesEl.style.width === '1200px') {
        notesEl.style.width = '1000px';
        notesEl.style.height = '650px';
    } else {
        notesEl.style.width = Math.min(1200, screen.width - 40) + 'px';
        notesEl.style.height = Math.min(750, screen.height - 20) + 'px';
        notesEl.style.top = screen.top + 'px';
    }
}

function toggleNotesSidebar() {
    const sidebar = document.getElementById('notesSidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
}

function aiSummarize() {
    const note = getCurrentNote();
    if (!note) return;
    const plainText = note.content.replace(/<[^>]*>/g, ' ').trim();
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, Math.min(3, sentences.length)).join('. ') + '.';
    const summaryContent = `<h2>📝 Summary</h2><p>${summary}</p><hr><p><em>Original note content preserved above.</em></p>`;
    document.getElementById('noteEditor').innerHTML = note.content + summaryContent;
    autoSave();
}

function aiExpand() {
    const note = getCurrentNote();
    if (!note) return;
    const expansion = '\n\n<h3>💡 Additional Thoughts</h3><p>Consider exploring this topic further.</p>';
    document.getElementById('noteEditor').innerHTML = note.content + expansion;
    autoSave();
}

function findConnections() {
    const note = getCurrentNote();
    if (!note) return;
    const keywords = note.content.replace(/<[^>]*>/g, '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const connections = notes.filter(n => n.id !== note.id && keywords.some(k => n.content.toLowerCase().includes(k)));
    const panel = document.getElementById('connectionsPanel');
    const list = document.getElementById('connectionsList');
    if (connections.length === 0) {
        list.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">No related notes found</p>';
    } else {
        list.innerHTML = connections.map(c => `
            <div class="connection-item" onclick="selectNote(${c.id}); closeConnections();">
                <div class="connection-icon"><i class="fas fa-file-alt" style="color: white;"></i></div>
                <div class="connection-info">
                    <div class="connection-note">${c.title}</div>
                    <div class="connection-preview">${c.content.replace(/<[^>]*>/g, '').substring(0, 40)}...</div>
                </div>
            </div>
        `).join('');
    }
    panel.classList.add('show');
}

function closeConnections() {
    document.getElementById('connectionsPanel').classList.remove('show');
}

function handleAIChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendAIMessage();
    }
}

function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    if (!message) return;
    const messagesContainer = document.getElementById('aiChatMessages');
    messagesContainer.innerHTML += `<div class="ai-message ai-message-user"><div class="ai-message-bubble">${message}</div></div>`;
    input.value = '';
    messagesContainer.innerHTML += `<div class="ai-message ai-message-ai" id="typingIndicator"><div class="ai-message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div></div>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    setTimeout(() => {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
        let response = '';
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('summarize')) {
            const note = getCurrentNote();
            response = note
                ? `Here's a summary of your note "${note.title}":\n\n${note.content.replace(/<[^>]*>/g, ' ').substring(0, 150)}...`
                : 'Please select a note first.';
        } else {
            response = 'I can help you summarize, expand, or find connections in your notes.';
        }
        messagesContainer.innerHTML += `<div class="ai-message ai-message-ai"><div class="ai-message-bubble">${response.replace(/\n/g, '<br>')}</div></div>`;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
}

// Notes keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (activeWindow !== 'notes') return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNewNote();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const search = document.getElementById('notesSearch');
        if (search) search.focus();
    }
});

// ==================== DRAGGABLE WINDOWS ====================
function makeDraggable(windowId, titleBarId) {
    const titleBar = document.getElementById(titleBarId);
    const windowEl = document.getElementById(windowId);
    if (!titleBar || !windowEl) return;
    let isDragging = false;
    let startX, startY, initialX, initialY;
    let rafId = null;
    let targetX, targetY;

    titleBar.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('window-btn')) return;
        isDragging = true;
        bringToFront(windowEl);
        startX = e.clientX;
        startY = e.clientY;
        const rect = windowEl.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        targetX = initialX;
        targetY = initialY;
        windowEl.style.position = 'fixed';
        windowEl.style.margin = '0';
        windowEl.style.willChange = 'left, top';
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const screen = getUsableScreenArea();
        const windowWidth = windowEl.offsetWidth;
        const windowHeight = windowEl.offsetHeight;

        targetX = initialX + (e.clientX - startX);
        targetY = initialY + (e.clientY - startY);

        // Constrain to usable screen area (above Dock, below menu bar)
        targetX = Math.max(0, Math.min(targetX, screen.right - windowWidth));
        targetY = Math.max(screen.top, Math.min(targetY, screen.bottom - windowHeight));

        // Use RAF for smoother updates
        if (!rafId) {
            rafId = requestAnimationFrame(() => {
                windowEl.style.left = targetX + 'px';
                windowEl.style.top = targetY + 'px';
                rafId = null;
            });
        }
    }, { passive: true });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        windowEl.style.willChange = 'auto';
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }, { passive: true });
}

makeDraggable('calculator', 'calcTitleBar');
makeDraggable('fruitNinja', 'fruitTitleBar');
makeDraggable('folderWindow', 'folderTitleBar');
makeDraggable('imageEditor', 'editorTitleBar');
makeDraggable('notesApp', 'notesTitleBar');
makeDraggable('settingsApp', 'settingsTitleBar');
makeDraggable('gramfinderApp', 'gramfinderTitleBar');

function setupWindowResizing() {
    const handles = document.querySelectorAll('.resize-handle');
    handles.forEach(handle => { handle.addEventListener('mousedown', startResize); });

    function startResize(e) {
        e.preventDefault();
        const handle = e.target;
        const windowId = handle.dataset.window;
        const windowEl = document.getElementById(windowId);
        if (!windowEl) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = windowEl.offsetWidth;
        const startHeight = windowEl.offsetHeight;
        const startLeft = windowEl.offsetLeft;
        const startTop = windowEl.offsetTop;
        const direction = handle.className.split(' ').find(cls => cls.startsWith('resize-handle-'))?.replace('resize-handle-', '');

        let rafId = null;
        let targetWidth = startWidth, targetHeight = startHeight, targetLeft = startLeft, targetTop = startTop;

        windowEl.style.willChange = 'width, height, left, top';

        function onMouseMove(e) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const minWidth = 300;
            const minHeight = 200;
            const screen = getUsableScreenArea();

            targetWidth = startWidth;
            targetHeight = startHeight;
            targetLeft = startLeft;
            targetTop = startTop;

            if (direction.includes('e')) targetWidth = Math.max(minWidth, startWidth + dx);
            if (direction.includes('w')) { targetWidth = Math.max(minWidth, startWidth - dx); targetLeft = startLeft + (startWidth - targetWidth); }
            if (direction.includes('s')) {
                targetHeight = Math.max(minHeight, startHeight + dy);
                // Constrain south resizing to not go below Dock
                const maxHeight = screen.bottom - startTop;
                targetHeight = Math.min(targetHeight, maxHeight);
            }
            if (direction.includes('n')) { targetHeight = Math.max(minHeight, startHeight - dy); targetTop = startTop + (startHeight - targetHeight); }

            // Constrain left edge
            targetLeft = Math.max(0, targetLeft);
            // Constrain top edge to menu bar
            targetTop = Math.max(screen.top, targetTop);

            if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    windowEl.style.width = targetWidth + 'px';
                    windowEl.style.height = targetHeight + 'px';
                    windowEl.style.left = targetLeft + 'px';
                    windowEl.style.top = targetTop + 'px';
                    rafId = null;
                });
            }
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            windowEl.style.willChange = 'auto';
            if (rafId) cancelAnimationFrame(rafId);
            if (windowId === 'fruitNinja') setTimeout(() => resizeCanvas(), 50);
        }

        document.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('mouseup', onMouseUp, { passive: true });
    }
}

// ==================== CONTEXT MENU ====================
function hideContextMenu() {
    document.getElementById('contextMenu').classList.remove('show');
    document.getElementById('dockContextMenu').classList.remove('show');
}

// Right-click context menu handler
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    // Check if right-clicking on a dock icon
    const dockIcon = e.target.closest('.dock-icon');
    if (dockIcon && dockIcon.dataset.app) {
        showDockContextMenu(e, dockIcon);
        return;
    }

    // Show regular context menu
    hideContextMenu();
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    contextMenu.classList.add('show');
});

// Close context menu on click elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
        hideContextMenu();
        if (!e.target.closest('.desktop-item')) {
            document.querySelectorAll('.desktop-item').forEach(el => el.style.background = '');
        }
    }
});

// Double-click on desktop to create folder
document.getElementById('desktopItems').addEventListener('dblclick', (e) => {
    if (!e.target.closest('.desktop-item')) {
        showNewFolderModal();
    }
});

// ==================== DOCK ICON CUSTOMIZATION ====================
let selectedDockIcon = null;

// Default icons for each app (to restore)
const defaultDockIcons = {
    launchpad: `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; padding: 8px;">
        <span style="width: 6px; height: 6px; background: #ff5f57; border-radius: 2px;"></span>
        <span style="width: 6px; height: 6px; background: #28c840; border-radius: 2px;"></span>
        <span style="width: 6px; height: 6px; background: #007aff; border-radius: 2px;"></span>
        <span style="width: 6px; height: 6px; background: #ffcc00; border-radius: 2px;"></span>
        <span style="width: 6px; height: 6px; background: #a855f7; border-radius: 2px;"></span>
        <span style="width: 6px; height: 6px; background: #ff9500; border-radius: 2px;"></span>
        <span style="width: 6px; height: 6px; background: #5fc9f8; border-radius: 2px;"></span>
        <span style="width: 6px; height: 6px; background: #4ade80; border-radius: 2px;"></span>
        <span style="width: 6px; height: 6px; background: #f472b6; border-radius: 2px;"></span>
    </div>`,
    finder: '<i class="fas fa-folder text-white text-xl"></i>',
    calculator: '<span class="text-white text-lg font-semibold">±</span>',
    fruitninja: '<span class="text-2xl">🍎</span>',
    imageeditor: '<i class="fas fa-image text-white text-lg"></i>',
    notes: '<i class="fas fa-sticky-note text-white text-lg"></i>',
    settings: '<i class="fas fa-cog text-white text-lg"></i>',
    gramfinder: '<i class="fas fa-search text-white text-lg"></i>',
    trash: '<i class="fas fa-recycle text-white text-xl"></i>'
};

// Show dock context menu
function showDockContextMenu(e, dockIcon) {
    hideContextMenu();
    selectedDockIcon = dockIcon;

    const dockContextMenu = document.getElementById('dockContextMenu');
    const appName = dockIcon.dataset.appName || 'App';

    // Update app name in menu
    document.querySelector('#dockAppName span').textContent = appName;

    // Position the menu
    dockContextMenu.style.left = e.clientX + 'px';
    dockContextMenu.style.top = (e.clientY - 100) + 'px'; // Position above cursor since dock is at bottom

    // Make sure menu stays on screen
    const menuRect = dockContextMenu.getBoundingClientRect();
    if (menuRect.top < 30) {
        dockContextMenu.style.top = '30px';
    }

    dockContextMenu.classList.add('show');
}

// Change dock icon
function changeDockIcon() {
    if (!selectedDockIcon) return;
    hideContextMenu();
    document.getElementById('iconInput').click();
}

// Handle icon upload
function handleIconUpload(event) {
    const file = event.target.files[0];
    if (!file || !selectedDockIcon) return;

    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        const appId = selectedDockIcon.dataset.app;

        // Update the dock icon
        updateDockIconImage(selectedDockIcon, imageData);

        // Save to localStorage
        saveDockIcon(appId, imageData);

        showNotification('Icon updated successfully!');
    };
    reader.readAsDataURL(file);

    // Reset the input
    event.target.value = '';
}

// Update dock icon with custom image
function updateDockIconImage(dockIcon, imageData) {
    const iconInner = dockIcon.querySelector('.dock-icon-inner');
    if (!iconInner) return;

    // Clear existing content
    iconInner.innerHTML = '';
    iconInner.classList.add('has-custom-icon');

    // Create and add the image
    const img = document.createElement('img');
    img.src = imageData;
    img.className = 'custom-icon';
    img.alt = dockIcon.dataset.appName || 'App Icon';
    iconInner.appendChild(img);
}

// Reset dock icon to default
function resetDockIcon() {
    if (!selectedDockIcon) return;
    hideContextMenu();

    const appId = selectedDockIcon.dataset.app;
    const iconInner = selectedDockIcon.querySelector('.dock-icon-inner');

    if (!iconInner || !defaultDockIcons[appId]) return;

    // Restore default icon
    iconInner.innerHTML = defaultDockIcons[appId];
    iconInner.classList.remove('has-custom-icon');

    // Remove from localStorage
    removeDockIcon(appId);

    showNotification('Icon reset to default');
}

// Save dock icon to localStorage
function saveDockIcon(appId, imageData) {
    try {
        const savedIcons = JSON.parse(localStorage.getItem('dockIcons') || '{}');
        savedIcons[appId] = imageData;
        localStorage.setItem('dockIcons', JSON.stringify(savedIcons));
    } catch (e) {
        console.error('Error saving dock icon:', e);
    }
}

// Remove dock icon from localStorage
function removeDockIcon(appId) {
    try {
        const savedIcons = JSON.parse(localStorage.getItem('dockIcons') || '{}');
        delete savedIcons[appId];
        localStorage.setItem('dockIcons', JSON.stringify(savedIcons));
    } catch (e) {
        console.error('Error removing dock icon:', e);
    }
}

// Load saved dock icons on startup
function loadSavedDockIcons() {
    try {
        const savedIcons = JSON.parse(localStorage.getItem('dockIcons') || '{}');

        for (const [appId, imageData] of Object.entries(savedIcons)) {
            const dockIcon = document.querySelector(`.dock-icon[data-app="${appId}"]`);
            if (dockIcon && imageData) {
                updateDockIconImage(dockIcon, imageData);
            }
        }
    } catch (e) {
        console.error('Error loading dock icons:', e);
    }
}

// ==================== VOICE COMMANDS ====================
let voiceEnabled = false;
let recognition = null;
let isListeningForCommand = false;
let voiceTimeout = null;
let commandBuffer = '';

// Keywords that trigger specific apps (more flexible matching)
const appKeywords = {
    calculator: ['calculator', 'calc', 'calculate', 'calculation', 'math'],
    notes: ['notes', 'note', 'notepad', 'notebook'],
    fruitninja: ['fruit', 'ninja', 'game', 'play', 'fruit ninja'],
    imageeditor: ['image', 'photo', 'editor', 'picture', 'edit', 'photos', 'images'],
    finder: ['finder', 'files', 'folder', 'folders', 'documents', 'document'],
    settings: ['settings', 'setting', 'preferences', 'wallpaper', 'customize', 'options'],
    launchpad: ['launchpad', 'launch pad', 'apps', 'all apps', 'applications', 'app drawer'],
    gramfinder: ['gram', '1gram', 'gram finder', 'one gram', 'lead finder', 'leads', 'search leads'],
    close: ['close', 'exit', 'quit', 'shut'],
    newfolder: ['new folder', 'create folder', 'make folder'],
    time: ['time', 'clock', 'what time']
};

// Wake word variations
const wakeWords = [
    'hey nextgen', 'hey next gen', 'a nextgen', 'hey nexgen',
    'hey next', 'nextgen', 'next gen', 'hey nex', 'henext',
    'hey nick', 'hey tex', 'hey text', 'hey necks'
];

// Initialize voice recognition
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Speech recognition not supported');
        const voiceToggle = document.getElementById('voiceToggle');
        if (voiceToggle) voiceToggle.style.display = 'none';
        return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
        console.log('Voice recognition started');
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        const fullTranscript = (finalTranscript || interimTranscript).toLowerCase();
        console.log('Heard:', fullTranscript); // Debug logging

        // Check for wake word
        if (!isListeningForCommand) {
            const hasWakeWord = wakeWords.some(wake => fullTranscript.includes(wake));
            if (hasWakeWord) {
                console.log('Wake word detected!');
                activateCommandMode();
                // Also try to get command from same utterance
                if (finalTranscript) {
                    commandBuffer = finalTranscript;
                }
            }
        } else {
            // We're listening for a command
            commandBuffer = fullTranscript;
            updateVoiceCommand(fullTranscript);

            if (finalTranscript) {
                console.log('Processing command:', finalTranscript);
                processVoiceCommand(finalTranscript);
            }
        }
    };

    recognition.onerror = (event) => {
        console.log('Voice recognition error:', event.error);
        if (event.error === 'not-allowed') {
            showNotification('Microphone access denied. Please allow microphone access.');
            voiceEnabled = false;
            updateVoiceToggle();
        } else if (event.error === 'no-speech') {
            // This is normal, just means no speech detected
            console.log('No speech detected');
        }
    };

    recognition.onend = () => {
        console.log('Recognition ended, restarting...');
        // Restart if voice is still enabled
        if (voiceEnabled) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (e) {
                    console.log('Restart error:', e);
                }
            }, 100);
        }
    };

    return true;
}

// Toggle voice commands on/off
function toggleVoiceCommands() {
    voiceEnabled = !voiceEnabled;
    updateVoiceToggle();

    if (voiceEnabled) {
        if (!recognition) {
            if (!initVoiceRecognition()) {
                showNotification('Voice commands not supported in this browser');
                voiceEnabled = false;
                updateVoiceToggle();
                return;
            }
        }
        try {
            recognition.start();
            showNotification('Voice commands ON! Say "Hey NextGen" then your command');
        } catch (e) {
            console.log('Start error:', e);
        }
    } else {
        if (recognition) {
            recognition.stop();
        }
        hideVoiceIndicator();
        showNotification('Voice commands disabled');
    }
}

// Update the toggle button appearance
function updateVoiceToggle() {
    const toggle = document.getElementById('voiceToggle');
    if (!toggle) return;

    toggle.classList.toggle('active', voiceEnabled);
    toggle.classList.toggle('listening', isListeningForCommand);
}

// Activate command listening mode
function activateCommandMode() {
    if (isListeningForCommand) return; // Already listening

    isListeningForCommand = true;
    commandBuffer = '';
    updateVoiceToggle();
    showVoiceIndicator();
    updateVoiceStatus('Listening... say your command');
    updateVoiceCommand('');

    // Play activation sound (visual feedback)
    const indicator = document.getElementById('voiceIndicator');
    indicator.classList.add('listening');

    // Timeout after 6 seconds
    clearTimeout(voiceTimeout);
    voiceTimeout = setTimeout(() => {
        if (isListeningForCommand) {
            // Try to process whatever we have
            if (commandBuffer.length > 3) {
                processVoiceCommand(commandBuffer);
            } else {
                deactivateCommandMode();
                updateVoiceStatus('No command heard');
                const indicator = document.getElementById('voiceIndicator');
                indicator.classList.remove('listening');
                indicator.classList.add('error');
                setTimeout(hideVoiceIndicator, 1500);
            }
        }
    }, 6000);
}

// Deactivate command mode
function deactivateCommandMode() {
    isListeningForCommand = false;
    commandBuffer = '';
    updateVoiceToggle();
    clearTimeout(voiceTimeout);
}

// Show voice indicator
function showVoiceIndicator() {
    const indicator = document.getElementById('voiceIndicator');
    indicator.classList.remove('success', 'error');
    indicator.classList.add('show');
}

// Hide voice indicator
function hideVoiceIndicator() {
    const indicator = document.getElementById('voiceIndicator');
    indicator.classList.remove('show', 'listening', 'success', 'error');
}

// Update voice status text
function updateVoiceStatus(text) {
    const status = document.getElementById('voiceStatus');
    if (status) status.textContent = text;
}

// Update voice command text
function updateVoiceCommand(text) {
    const command = document.getElementById('voiceCommand');
    if (command) command.textContent = `"${text}"`;
}

// Find which app the command is for
function findAppFromCommand(command) {
    // Remove wake words first
    let cleanCommand = command;
    wakeWords.forEach(wake => {
        cleanCommand = cleanCommand.replace(wake, '');
    });
    cleanCommand = cleanCommand.trim();

    console.log('Clean command:', cleanCommand);

    // Check each app's keywords
    for (const [app, keywords] of Object.entries(appKeywords)) {
        for (const keyword of keywords) {
            if (cleanCommand.includes(keyword)) {
                console.log(`Matched "${keyword}" to app: ${app}`);
                return { app, keyword };
            }
        }
    }

    return null;
}

// Process the voice command
function processVoiceCommand(transcript) {
    console.log('Processing:', transcript);

    const match = findAppFromCommand(transcript);

    if (match) {
        deactivateCommandMode();
        updateVoiceStatus('Opening...');
        updateVoiceCommand(match.keyword);

        const indicator = document.getElementById('voiceIndicator');
        indicator.classList.remove('listening');
        indicator.classList.add('success');

        // Execute the command
        setTimeout(() => {
            executeAppCommand(match.app);
            setTimeout(hideVoiceIndicator, 800);
        }, 300);
    } else if (transcript.length > 3) {
        // Unknown command
        deactivateCommandMode();
        updateVoiceStatus('Command not recognized');
        updateVoiceCommand(transcript);

        const indicator = document.getElementById('voiceIndicator');
        indicator.classList.remove('listening');
        indicator.classList.add('error');

        setTimeout(hideVoiceIndicator, 2000);
    }
}

// Execute the app command
function executeAppCommand(app) {
    console.log('Executing:', app);

    switch (app) {
        case 'calculator':
            openCalculator();
            showNotification('Opening Calculator');
            break;
        case 'notes':
            openNotes();
            showNotification('Opening Notes');
            break;
        case 'fruitninja':
            openFruitNinja();
            showNotification('Opening Fruit Ninja');
            break;
        case 'imageeditor':
            openImageEditor();
            showNotification('Opening Image Editor');
            break;
        case 'finder':
            openFinder();
            showNotification('Opening Finder');
            break;
        case 'settings':
            openSettings();
            showNotification('Opening Settings');
            break;
        case 'launchpad':
            openLaunchpad();
            showNotification('Opening Launchpad');
            break;
        case 'gramfinder':
            openGramFinder();
            showNotification('Opening 1Gram Finder');
            break;
        case 'close':
            closeActiveWindow();
            break;
        case 'newfolder':
            showNewFolderModal();
            showNotification('Creating new folder');
            break;
        case 'time':
            sayTime();
            break;
        default:
            showNotification(`Unknown app: ${app}`);
    }
}

// Close active window
function closeActiveWindow() {
    switch (activeWindow) {
        case 'calculator': closeCalculator(); showNotification('Closed Calculator'); break;
        case 'fruitNinja': closeFruitNinja(); showNotification('Closed Fruit Ninja'); break;
        case 'folder': closeFolder(); showNotification('Closed Folder'); break;
        case 'imageEditor': closeImageEditor(); showNotification('Closed Image Editor'); break;
        case 'notes': closeNotes(); showNotification('Closed Notes'); break;
        case 'settings': closeSettings(); showNotification('Closed Settings'); break;
        default: showNotification('No window to close');
    }
}

// Say the time
function sayTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    showNotification(`The time is ${timeStr}`);
}

// ==================== 1GRAM FINDER ====================
let gramfinderState = {
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    prevBounds: null
};

function openGramFinder() {
    const app = document.getElementById('gramfinderApp');
    if (!app) return;

    app.style.display = 'block';
    gramfinderState.isOpen = true;
    gramfinderState.isMinimized = false;
    bringToFront(app);
    setupWindowDragging(app);
    setupWindowResizing(app);

    // Reload iframe to ensure fresh content
    const iframe = document.getElementById('gramfinderFrame');
    if (iframe) {
        iframe.src = iframe.src;
    }
}

function closeGramFinder() {
    const app = document.getElementById('gramfinderApp');
    if (app) {
        app.style.display = 'none';
        gramfinderState.isOpen = false;
        gramfinderState.isMaximized = false;
    }
}

function minimizeGramFinder() {
    const app = document.getElementById('gramfinderApp');
    if (app) {
        app.style.display = 'none';
        gramfinderState.isMinimized = true;
    }
}

function maximizeGramFinder() {
    const app = document.getElementById('gramfinderApp');
    if (!app) return;
    const screen = getUsableScreenArea();

    if (gramfinderState.isMaximized) {
        // Restore previous size
        if (gramfinderState.prevBounds) {
            app.style.left = gramfinderState.prevBounds.left;
            app.style.top = gramfinderState.prevBounds.top;
            app.style.width = gramfinderState.prevBounds.width;
            app.style.height = gramfinderState.prevBounds.height;
        }
        gramfinderState.isMaximized = false;
    } else {
        // Save current bounds
        gramfinderState.prevBounds = {
            left: app.style.left,
            top: app.style.top,
            width: app.style.width,
            height: app.style.height
        };
        // Maximize within usable screen area
        app.style.left = '0px';
        app.style.top = screen.top + 'px';
        app.style.width = screen.width + 'px';
        app.style.height = screen.height + 'px';
        gramfinderState.isMaximized = true;
    }
}

// ==================== LAUNCHPAD ====================
const launchpadApps = [
    { id: 'finder', name: 'Finder', icon: '<i class="fas fa-folder"></i>', iconClass: 'lp-icon-finder', action: 'openFinder' },
    { id: 'gramfinder', name: '1Gram Finder', icon: '<i class="fas fa-search"></i>', iconClass: 'lp-icon-gramfinder', action: 'openGramFinder' },
    { id: 'calculator', name: 'Calculator', icon: '<span style="font-weight:600;">±</span>', iconClass: 'lp-icon-calculator', action: 'openCalculator' },
    { id: 'notes', name: 'Notes', icon: '<i class="fas fa-sticky-note"></i>', iconClass: 'lp-icon-notes', action: 'openNotes' },
    { id: 'fruitninja', name: 'Fruit Ninja', icon: '<span>🍎</span>', iconClass: 'lp-icon-fruitninja', action: 'openFruitNinja' },
    { id: 'imageeditor', name: 'Photos', icon: '<i class="fas fa-image"></i>', iconClass: 'lp-icon-imageeditor', action: 'openImageEditor' },
    { id: 'settings', name: 'Settings', icon: '<i class="fas fa-cog"></i>', iconClass: 'lp-icon-settings', action: 'openSettings' },
    { id: 'safari', name: 'Safari', icon: '<i class="fas fa-compass"></i>', iconClass: 'lp-icon-safari', action: 'showComingSoon' },
    { id: 'music', name: 'Music', icon: '<i class="fas fa-music"></i>', iconClass: 'lp-icon-music', action: 'showComingSoon' },
    { id: 'messages', name: 'Messages', icon: '<i class="fas fa-comment"></i>', iconClass: 'lp-icon-messages', action: 'showComingSoon' },
    { id: 'mail', name: 'Mail', icon: '<i class="fas fa-envelope"></i>', iconClass: 'lp-icon-mail', action: 'showComingSoon' },
    { id: 'calendar', name: 'Calendar', icon: '<i class="fas fa-calendar"></i>', iconClass: 'lp-icon-calendar', action: 'showComingSoon' },
    { id: 'maps', name: 'Maps', icon: '<i class="fas fa-map-marker-alt"></i>', iconClass: 'lp-icon-maps', action: 'showComingSoon' },
    { id: 'weather', name: 'Weather', icon: '<i class="fas fa-cloud-sun"></i>', iconClass: 'lp-icon-weather', action: 'showComingSoon' },
    { id: 'clock', name: 'Clock', icon: '<i class="fas fa-clock"></i>', iconClass: 'lp-icon-clock', action: 'showComingSoon' },
    { id: 'appstore', name: 'App Store', icon: '<i class="fas fa-store"></i>', iconClass: 'lp-icon-appstore', action: 'showComingSoon' },
    { id: 'terminal', name: 'Terminal', icon: '<i class="fas fa-terminal"></i>', iconClass: 'lp-icon-terminal', action: 'showComingSoon' }
];

let launchpadOpen = false;

function toggleLaunchpad() {
    if (launchpadOpen) {
        closeLaunchpad();
    } else {
        openLaunchpad();
    }
}

function openLaunchpad() {
    const launchpad = document.getElementById('launchpad');
    if (!launchpad) return;

    renderLaunchpadApps();
    launchpad.classList.add('show');
    launchpadOpen = true;

    // Focus search
    setTimeout(() => {
        const search = document.getElementById('launchpadSearch');
        if (search) search.focus();
    }, 100);

    hideContextMenu();
}

function closeLaunchpad() {
    const launchpad = document.getElementById('launchpad');
    if (!launchpad) return;

    launchpad.classList.remove('show');
    launchpadOpen = false;

    // Clear search
    const search = document.getElementById('launchpadSearch');
    if (search) search.value = '';
}

function renderLaunchpadApps() {
    const grid = document.getElementById('launchpadGrid');
    if (!grid) return;

    grid.innerHTML = launchpadApps.map((app, index) => `
        <div class="launchpad-app" data-app="${app.id}" onclick="launchApp('${app.action}')" style="animation-delay: ${index * 0.03}s">
            <div class="launchpad-app-icon ${app.iconClass}">
                ${app.icon}
            </div>
            <div class="launchpad-app-name">${app.name}</div>
        </div>
    `).join('');
}

function filterLaunchpadApps() {
    const search = document.getElementById('launchpadSearch');
    const query = search ? search.value.toLowerCase() : '';

    document.querySelectorAll('.launchpad-app').forEach(app => {
        const appId = app.dataset.app;
        const appData = launchpadApps.find(a => a.id === appId);
        if (appData) {
            const matches = appData.name.toLowerCase().includes(query) || appData.id.includes(query);
            app.classList.toggle('hidden', !matches);
        }
    });
}

function launchApp(action) {
    closeLaunchpad();

    // Small delay for animation
    setTimeout(() => {
        if (typeof window[action] === 'function') {
            window[action]();
        }
    }, 150);
}

function showComingSoon() {
    showNotification('🚧 This app is coming soon!');
}

// Close launchpad on click outside
document.addEventListener('click', (e) => {
    if (launchpadOpen && e.target.id === 'launchpad') {
        closeLaunchpad();
    }
});

// Close launchpad on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && launchpadOpen) {
        closeLaunchpad();
    }
});

// ==================== SETTINGS APP ====================
let currentSettings = {
    wallpaper: 'gradient-1',
    customWallpapers: [],
    accentColor: '#007aff',
    translucentMenuBar: true,
    animatedWallpaper: true,
    performanceMode: false,
    dockSize: 48,
    dockMagnification: true,
    dockPosition: 'bottom'
};

// Preset wallpapers (CSS gradients)
const presetWallpapers = [
    { id: 'gradient-1', name: 'Aurora', style: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #e94560 100%)' },
    { id: 'gradient-2', name: 'Ocean', style: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
    { id: 'gradient-3', name: 'Sunset', style: 'linear-gradient(135deg, #ee9ca7, #ffdde1, #ee9ca7)' },
    { id: 'gradient-4', name: 'Forest', style: 'linear-gradient(135deg, #134e5e, #71b280)' },
    { id: 'gradient-5', name: 'Night', style: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
    { id: 'gradient-6', name: 'Flamingo', style: 'linear-gradient(135deg, #ee0979, #ff6a00)' },
    { id: 'gradient-7', name: 'Lavender', style: 'linear-gradient(135deg, #c471f5, #fa71cd)' },
    { id: 'gradient-8', name: 'Mojave', style: 'linear-gradient(135deg, #1e3c72, #2a5298, #1e3c72)' },
    { id: 'gradient-9', name: 'Catalina', style: 'linear-gradient(180deg, #2c3e50, #3498db, #2c3e50)' },
    { id: 'gradient-10', name: 'Big Sur', style: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)' },
    { id: 'gradient-11', name: 'Monterey', style: 'linear-gradient(135deg, #4158d0, #c850c0, #ffcc70)' },
    { id: 'gradient-12', name: 'Ventura', style: 'linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef)' }
];

// Load settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem('nextgenSettings');
        if (saved) {
            currentSettings = { ...currentSettings, ...JSON.parse(saved) };
        }
        applyAllSettings();
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

// Save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem('nextgenSettings', JSON.stringify(currentSettings));
    } catch (e) {
        console.error('Error saving settings:', e);
    }
}

// Apply all settings
function applyAllSettings() {
    applyPerformanceMode();
    applyWallpaper();
    applyAccentColor();
    applyMenuBarStyle();
    applyWallpaperAnimation();
    applyDockSize();
    applyDockMagnification();
    applyDockPosition();
}

// Open Settings
function openSettings() {
    document.getElementById('settingsApp').style.display = 'block';
    activeWindow = 'settings';
    bringToFront(document.getElementById('settingsApp'));
    updateMenuAppName('Settings');
    hideContextMenu();
    initSettingsUI();
}

function closeSettings() {
    document.getElementById('settingsApp').style.display = 'none';
    activeWindow = null;
}

function minimizeSettings() {
    document.getElementById('settingsApp').style.display = 'none';
    activeWindow = null;
}

function maximizeSettings() {
    const settings = document.getElementById('settingsApp');
    const screen = getUsableScreenArea();
    if (settings.classList.contains('maximized')) {
        settings.classList.remove('maximized');
        settings.style.width = '700px';
        settings.style.height = '550px';
    } else {
        settings.classList.add('maximized');
        settings.style.width = Math.min(900, screen.width - 40) + 'px';
        settings.style.height = Math.min(650, screen.height - 20) + 'px';
        settings.style.top = screen.top + 'px';
    }
}

// Initialize Settings UI
function initSettingsUI() {
    renderWallpaperGrid();
    renderCustomWallpapers();
    updateSettingsControls();
}

// Show settings section
function showSettingsSection(section) {
    // Update nav items
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Show section
    document.querySelectorAll('.settings-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `section-${section}`);
    });
}

// Render wallpaper grid
function renderWallpaperGrid() {
    const grid = document.getElementById('wallpaperGrid');
    if (!grid) return;

    grid.innerHTML = presetWallpapers.map(wp => `
        <div class="wallpaper-item ${currentSettings.wallpaper === wp.id ? 'active' : ''}" 
             onclick="setWallpaper('${wp.id}')" title="${wp.name}">
            <div class="wallpaper-gradient" style="background: ${wp.style}; background-size: 400% 400%;"></div>
        </div>
    `).join('');
}

// Render custom wallpapers
function renderCustomWallpapers() {
    const group = document.getElementById('customWallpapersGroup');
    const grid = document.getElementById('customWallpaperGrid');
    if (!grid || !group) return;

    if (currentSettings.customWallpapers.length === 0) {
        group.style.display = 'none';
        return;
    }

    group.style.display = 'block';
    grid.innerHTML = currentSettings.customWallpapers.map((wp, index) => `
        <div class="wallpaper-item ${currentSettings.wallpaper === wp.id ? 'active' : ''}" 
             onclick="setWallpaper('${wp.id}')">
            <img src="${wp.data}" alt="Custom wallpaper">
            <div class="delete-wallpaper" onclick="event.stopPropagation(); deleteCustomWallpaper(${index})">
                <i class="fas fa-times"></i>
            </div>
        </div>
    `).join('');
}

// Set wallpaper
function setWallpaper(id) {
    console.log('Setting wallpaper to:', id);
    currentSettings.wallpaper = id;
    saveSettings();
    applyWallpaper();
    renderWallpaperGrid();
    renderCustomWallpapers();

    // Show feedback
    const preset = presetWallpapers.find(wp => wp.id === id);
    if (preset) {
        showNotification(`Wallpaper set to ${preset.name}`);
    } else {
        showNotification('Custom wallpaper applied');
    }
}

// Apply wallpaper
function applyWallpaper() {
    const body = document.body;

    // Check if it's a preset gradient
    const preset = presetWallpapers.find(wp => wp.id === currentSettings.wallpaper);
    if (preset) {
        // Clear any custom image first
        body.style.backgroundImage = 'none';
        // Apply the gradient
        body.style.background = preset.style;
        body.style.backgroundSize = '400% 400%';
        // Re-apply animation if enabled
        if (currentSettings.animatedWallpaper) {
            body.style.animation = 'gradientShift 15s ease infinite';
        }
        console.log('Applied preset wallpaper:', preset.name);
        return;
    }

    // Check if it's a custom wallpaper
    const custom = currentSettings.customWallpapers.find(wp => wp.id === currentSettings.wallpaper);
    if (custom) {
        // For custom images, disable animation and set the image
        body.style.animation = 'none';
        body.style.background = 'none';
        body.style.backgroundColor = '#1a1a2e';
        body.style.backgroundImage = `url(${custom.data})`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
        console.log('Applied custom wallpaper');
        return;
    }

    // Fallback to default
    console.log('Wallpaper not found, using default');
    body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #e94560 100%)';
    body.style.backgroundSize = '400% 400%';
    if (currentSettings.animatedWallpaper) {
        body.style.animation = 'gradientShift 15s ease infinite';
    }
}

// Handle wallpaper upload
function handleWallpaperUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const id = `custom-${Date.now()}`;
        currentSettings.customWallpapers.push({
            id: id,
            data: e.target.result
        });
        currentSettings.wallpaper = id;
        saveSettings();
        applyWallpaper();
        renderWallpaperGrid();
        renderCustomWallpapers();
        showNotification('Wallpaper added!');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

// Delete custom wallpaper
function deleteCustomWallpaper(index) {
    const wp = currentSettings.customWallpapers[index];
    if (currentSettings.wallpaper === wp.id) {
        currentSettings.wallpaper = 'gradient-1';
    }
    currentSettings.customWallpapers.splice(index, 1);
    saveSettings();
    applyWallpaper();
    renderCustomWallpapers();
    showNotification('Wallpaper removed');
}

// Set accent color
function setAccentColor(color) {
    currentSettings.accentColor = color;
    saveSettings();
    applyAccentColor();

    // Update UI
    document.querySelectorAll('.accent-color').forEach(el => {
        el.classList.toggle('active', el.dataset.color === color);
    });
}

// Apply accent color
function applyAccentColor() {
    document.documentElement.style.setProperty('--accent-color', currentSettings.accentColor);
}

// Toggle translucent menu bar
function toggleTranslucentMenuBar() {
    currentSettings.translucentMenuBar = document.getElementById('translucentMenuBar').checked;
    saveSettings();
    applyMenuBarStyle();
}

// Apply menu bar style
function applyMenuBarStyle() {
    const menuBar = document.querySelector('.menu-bar');
    if (menuBar) {
        if (currentSettings.translucentMenuBar) {
            menuBar.style.background = 'rgba(30, 30, 30, 0.8)';
            menuBar.style.backdropFilter = 'blur(20px)';
        } else {
            menuBar.style.background = 'rgba(30, 30, 30, 1)';
            menuBar.style.backdropFilter = 'none';
        }
    }
}

// Toggle wallpaper animation
function toggleWallpaperAnimation() {
    currentSettings.animatedWallpaper = document.getElementById('animatedWallpaper').checked;
    saveSettings();
    applyWallpaperAnimation();
}

// Apply wallpaper animation
function applyWallpaperAnimation() {
    // Only animate if it's a gradient wallpaper (not a custom image)
    const isCustomImage = currentSettings.wallpaper.startsWith('custom-');
    if (isCustomImage || currentSettings.performanceMode) {
        document.body.style.animation = 'none';
    } else {
        document.body.style.animation = currentSettings.animatedWallpaper ? 'gradientShift 20s ease infinite' : 'none';
    }
}

// Toggle performance mode
function togglePerformanceMode() {
    currentSettings.performanceMode = document.getElementById('performanceMode').checked;
    saveSettings();
    applyPerformanceMode();
    showNotification(currentSettings.performanceMode ? 'Performance mode enabled' : 'Performance mode disabled');
}

// Apply performance mode
function applyPerformanceMode() {
    const style = document.getElementById('performanceModeStyle') || document.createElement('style');
    style.id = 'performanceModeStyle';

    if (currentSettings.performanceMode) {
        style.textContent = `
            .menu-bar,
            .dock,
            .context-menu,
            .folder-window,
            .image-editor-window,
            .notes-window,
            .settings-window,
            .calculator-window,
            .fruit-ninja-window,
            .modal-overlay .modal-content,
            .connections-panel,
            .voice-indicator {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            .menu-bar { background: rgba(30, 30, 30, 0.98) !important; }
            .dock { background: rgba(40, 40, 40, 0.95) !important; }
            body { animation: none !important; }
            * { transition-duration: 0.1s !important; }
        `;
    } else {
        style.textContent = '';
    }

    if (!document.getElementById('performanceModeStyle')) {
        document.head.appendChild(style);
    }

    // Also update animation
    applyWallpaperAnimation();
}

// Set dock size
function setDockSize(size) {
    currentSettings.dockSize = parseInt(size);
    saveSettings();
    applyDockSize();
}

// Apply dock size
function applyDockSize() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    const size = currentSettings.dockSize;
    dock.querySelectorAll('.dock-icon').forEach(icon => {
        icon.style.width = size + 'px';
        icon.style.height = size + 'px';
    });
    dock.querySelectorAll('.dock-icon-inner').forEach(inner => {
        inner.style.width = (size - 4) + 'px';
        inner.style.height = (size - 4) + 'px';
    });
}

// Toggle dock magnification
function toggleDockMagnification() {
    currentSettings.dockMagnification = document.getElementById('dockMagnification').checked;
    saveSettings();
    applyDockMagnification();
}

// Apply dock magnification
function applyDockMagnification() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    dock.querySelectorAll('.dock-icon').forEach(icon => {
        if (currentSettings.dockMagnification) {
            icon.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), margin 0.2s';
        } else {
            icon.style.transition = 'none';
        }
    });

    // Update CSS
    const style = document.getElementById('dockMagnificationStyle') || document.createElement('style');
    style.id = 'dockMagnificationStyle';
    style.textContent = currentSettings.dockMagnification ? `
        .dock-icon:hover {
            transform: scale(1.3) translateY(-10px) !important;
            margin: 0 8px !important;
        }
    ` : `
        .dock-icon:hover {
            transform: none !important;
            margin: 0 !important;
        }
    `;
    if (!document.getElementById('dockMagnificationStyle')) {
        document.head.appendChild(style);
    }
}

// Set dock position
function setDockPosition(position) {
    currentSettings.dockPosition = position;
    saveSettings();
    applyDockPosition();

    // Update UI
    document.querySelectorAll('.dock-position-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.position === position);
    });
}

// Apply dock position
function applyDockPosition() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    // Reset all position styles
    dock.style.bottom = '';
    dock.style.top = '';
    dock.style.left = '';
    dock.style.right = '';
    dock.style.transform = '';
    dock.style.flexDirection = '';

    switch (currentSettings.dockPosition) {
        case 'bottom':
            dock.style.bottom = '8px';
            dock.style.left = '50%';
            dock.style.transform = 'translateX(-50%)';
            dock.style.flexDirection = 'row';
            break;
        case 'left':
            dock.style.left = '8px';
            dock.style.top = '50%';
            dock.style.transform = 'translateY(-50%)';
            dock.style.flexDirection = 'column';
            break;
        case 'right':
            dock.style.right = '8px';
            dock.style.top = '50%';
            dock.style.transform = 'translateY(-50%)';
            dock.style.flexDirection = 'column';
            break;
    }
}

// Update settings controls to match current settings
function updateSettingsControls() {
    // Checkboxes
    const translucentCheck = document.getElementById('translucentMenuBar');
    const animatedCheck = document.getElementById('animatedWallpaper');
    const performanceCheck = document.getElementById('performanceMode');
    const magnificationCheck = document.getElementById('dockMagnification');
    const dockSizeSlider = document.getElementById('dockSize');

    if (translucentCheck) translucentCheck.checked = currentSettings.translucentMenuBar;
    if (animatedCheck) animatedCheck.checked = currentSettings.animatedWallpaper;
    if (performanceCheck) performanceCheck.checked = currentSettings.performanceMode;
    if (magnificationCheck) magnificationCheck.checked = currentSettings.dockMagnification;
    if (dockSizeSlider) dockSizeSlider.value = currentSettings.dockSize;

    // Accent colors
    document.querySelectorAll('.accent-color').forEach(el => {
        el.classList.toggle('active', el.dataset.color === currentSettings.accentColor);
    });

    // Dock position
    document.querySelectorAll('.dock-position-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.position === currentSettings.dockPosition);
    });
}

// Reset all settings
function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        localStorage.removeItem('nextgenSettings');
        localStorage.removeItem('dockIcons');
        currentSettings = {
            wallpaper: 'gradient-1',
            customWallpapers: [],
            accentColor: '#007aff',
            translucentMenuBar: true,
            animatedWallpaper: true,
            performanceMode: false,
            dockSize: 48,
            dockMagnification: true,
            dockPosition: 'bottom'
        };
        saveSettings();
        applyAllSettings();
        initSettingsUI();

        // Reset dock icons
        document.querySelectorAll('.dock-icon').forEach(icon => {
            const appId = icon.dataset.app;
            if (appId && defaultDockIcons[appId]) {
                const inner = icon.querySelector('.dock-icon-inner');
                if (inner) {
                    inner.innerHTML = defaultDockIcons[appId];
                    inner.classList.remove('has-custom-icon');
                }
            }
        });

        showNotification('All settings have been reset');
    }
}

// ==================== PWA & SERVICE WORKER ====================
let deferredPrompt = null;

// Register service worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('Service Worker registered:', registration.scope);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showUpdateNotification();
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
}

// Handle PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

// Show install button in dock or notification
function showInstallButton() {
    // Add install option to context menu
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu && !document.getElementById('installPWAItem')) {
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        divider.id = 'installPWADivider';

        const installItem = document.createElement('div');
        installItem.className = 'context-menu-item';
        installItem.id = 'installPWAItem';
        installItem.innerHTML = '<i class="fas fa-download" style="width: 16px;"></i> Install NextGen OS';
        installItem.onclick = installPWA;

        contextMenu.appendChild(divider);
        contextMenu.appendChild(installItem);
    }

    // Show notification about install
    setTimeout(() => {
        showNotification('💡 Tip: Right-click to install NextGen OS as an app!');
    }, 3000);
}

// Install PWA
function installPWA() {
    if (!deferredPrompt) {
        showNotification('App already installed or not available');
        return;
    }

    hideContextMenu();
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted PWA install');
            showNotification('🎉 NextGen OS installed successfully!');
            // Remove install button
            const installItem = document.getElementById('installPWAItem');
            const installDivider = document.getElementById('installPWADivider');
            if (installItem) installItem.remove();
            if (installDivider) installDivider.remove();
        } else {
            console.log('User dismissed PWA install');
        }
        deferredPrompt = null;
    });
}

// Show update notification
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(40, 40, 40, 0.95);
        backdrop-filter: blur(20px);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 14px;
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    `;
    notification.innerHTML = `
        <span>🔄 Update available!</span>
        <button onclick="location.reload()" style="
            background: #007aff;
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        ">Refresh</button>
        <button onclick="this.parentElement.remove()" style="
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.6);
            cursor: pointer;
            font-size: 16px;
        ">✕</button>
    `;
    document.body.appendChild(notification);
}

// Handle app installed event
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
});

// Check if running as PWA
function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

// Handle URL parameters for shortcuts
function handleURLParams() {
    const params = new URLSearchParams(window.location.search);
    const app = params.get('app');

    if (app) {
        setTimeout(() => {
            switch (app) {
                case 'calculator': openCalculator(); break;
                case 'notes': openNotes(); break;
                case 'fruitninja': openFruitNinja(); break;
                case 'imageeditor': openImageEditor(); break;
                case 'finder': openFinder(); break;
            }
        }, 500);
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Load settings first (applies wallpaper, accent color, etc.)
    loadSettings();

    initDesktop();
    setupWindowResizing();
    loadSavedDockIcons(); // Load custom dock icons

    // Initialize voice recognition (but don't start until user enables)
    initVoiceRecognition();

    // Handle URL parameters (for PWA shortcuts)
    handleURLParams();

    // Show PWA status if running as installed app
    if (isPWA()) {
        console.log('Running as installed PWA');
    }
});

// Register service worker
registerServiceWorker();

