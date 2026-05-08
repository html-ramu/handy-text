// --- FIREBASE IMPORTS ---
// Using modular CDN approach (no bundlers required)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
// You get this from Firebase Console > Project Settings > Your Apps
const firebaseConfig = {
    apiKey: "AIzaSyCkMxoG1D5J63TNyMQaVOA-SCvojTzUPoI",
    authDomain: "handy-text.firebaseapp.com",
    projectId: "handy-text",
    storageBucket: "handy-text.firebasestorage.app",
    messagingSenderId: "1048754691801",
    appId: "1:1048754691801:web:7717d49781e03ef451a8c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- STATE MANAGEMENT ---
let currentUser = null;
let activePrompts = [];
let trashPrompts = [];
let currentView = 'all';
let currentTemplateText = '';
let currentTriggerButton = null;

// --- DOM ELEMENTS ---
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// View Elements
const viewMain = document.getElementById('viewMain');
const viewTrash = document.getElementById('viewTrash');
const formSection = document.getElementById('formSection');
const viewHeader = document.getElementById('viewHeader');
const viewTitle = document.getElementById('viewTitle');
const viewSubtitle = document.getElementById('viewSubtitle');

// Nav Elements
const navAll = document.getElementById('navAll');
const navFavorites = document.getElementById('navFavorites');
const navPinned = document.getElementById('navPinned');
const navTrash = document.getElementById('navTrash');
const trashCount = document.getElementById('trashCount');

// Form Elements
const form = document.getElementById('promptForm');
const promptIdInput = document.getElementById('promptId');
const titleInput = document.getElementById('title');
const categoryInput = document.getElementById('category');
const contentInput = document.getElementById('content');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Grid & Search
const promptGrid = document.getElementById('promptGrid');
const trashGrid = document.getElementById('trashGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Modal Elements
const variableModal = document.getElementById('variableModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const dynamicInputsContainer = document.getElementById('dynamicInputsContainer');
const generateCopyBtn = document.getElementById('generateCopyBtn');


// --- AUTHENTICATION & SYNC ---

// Listen for Auth State Changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if(loginScreen) loginScreen.classList.add('hidden');
        if(appContainer) appContainer.classList.remove('hidden');
        if(userEmailDisplay) userEmailDisplay.innerText = user.email;
        
        await migrateLocalDataToFirebase();
        setupRealtimeSync();
    } else {
        currentUser = null;
        if(loginScreen) loginScreen.classList.remove('hidden');
        if(appContainer) appContainer.classList.add('hidden');
    }
});

if(loginBtn) loginBtn.addEventListener('click', () => signInWithPopup(auth, provider));
if(logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

// Migration: Move localStorage data to Cloud safely
async function migrateLocalDataToFirebase() {
    const localActive = JSON.parse(localStorage.getItem('handyTextActivePrompts'));
    const localTrash = JSON.parse(localStorage.getItem('handyTextTrashPrompts'));
    
    // If local data exists, merge it to Firebase and delete local
    if (localActive || localTrash) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        
        let combinedActive = docSnap.exists() ? docSnap.data().activePrompts || [] : [];
        let combinedTrash = docSnap.exists() ? docSnap.data().trashPrompts || [] : [];

        if (localActive) combinedActive = [...localActive, ...combinedActive];
        if (localTrash) combinedTrash = [...localTrash, ...combinedTrash];

        // Push to cloud
        await setDoc(userDocRef, { activePrompts: combinedActive, trashPrompts: combinedTrash }, { merge: true });
        
        // Clean up local storage so migration doesn't happen again
        localStorage.removeItem('handyTextActivePrompts');
        localStorage.removeItem('handyTextTrashPrompts');
        console.log("Local Data Migrated to Firebase Successfully!");
    }
}

// Real-time Cloud Sync
function setupRealtimeSync() {
    const userDocRef = doc(db, 'users', currentUser.uid);
    
    // onSnapshot listens for cloud changes instantly across tabs/devices
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            activePrompts = docSnap.data().activePrompts || [];
            trashPrompts = docSnap.data().trashPrompts || [];
        } else {
            activePrompts = [];
            trashPrompts = [];
        }
        updateUI();
    });
}

// Function to trigger save to Firebase (replaces localStorage.setItem)
async function syncToCloud() {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, { activePrompts, trashPrompts }, { merge: true });
}


// --- INITIALIZATION ---
function init() {
    if(navAll) navAll.addEventListener('click', () => switchView('all'));
    if(navFavorites) navFavorites.addEventListener('click', () => switchView('favorites'));
    if(navPinned) navPinned.addEventListener('click', () => switchView('pinned'));
    if(navTrash) navTrash.addEventListener('click', () => switchView('trash'));
    
    if(searchInput) searchInput.addEventListener('input', updateUI);
    if(categoryFilter) categoryFilter.addEventListener('change', updateUI);
    if(cancelBtn) cancelBtn.addEventListener('click', resetForm);
    
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeVariableModal);
    if(generateCopyBtn) generateCopyBtn.addEventListener('click', processAndCopyTemplate);
}


// --- VIEW NAVIGATION & UI ---
function switchView(view) {
    currentView = view;
    [navAll, navFavorites, navPinned, navTrash].forEach(btn => {
        if(btn) btn.classList.remove('active');
    });
    
    if (view === 'all') {
        if(navAll) navAll.classList.add('active'); 
        if(viewMain) viewMain.classList.remove('hidden'); 
        if(viewTrash) viewTrash.classList.add('hidden'); 
        if(formSection) formSection.classList.remove('hidden'); 
        if(viewHeader) viewHeader.style.display = 'none';
    } else if (view === 'favorites') {
        if(navFavorites) navFavorites.classList.add('active'); 
        if(viewMain) viewMain.classList.remove('hidden'); 
        if(viewTrash) viewTrash.classList.add('hidden'); 
        if(formSection) formSection.classList.add('hidden'); 
        if(viewHeader) {
            viewHeader.style.display = 'block'; 
            if(viewTitle) viewTitle.innerText = '★ Favorite Prompts'; 
            if(viewSubtitle) viewSubtitle.innerText = 'Your most loved prompts.';
        }
    } else if (view === 'pinned') {
        if(navPinned) navPinned.classList.add('active'); 
        if(viewMain) viewMain.classList.remove('hidden'); 
        if(viewTrash) viewTrash.classList.add('hidden'); 
        if(formSection) formSection.classList.add('hidden'); 
        if(viewHeader) {
            viewHeader.style.display = 'block'; 
            if(viewTitle) viewTitle.innerText = '📌 Pinned Prompts'; 
            if(viewSubtitle) viewSubtitle.innerText = 'Prompts kept at the top for quick access.';
        }
    } else if (view === 'trash') {
        if(navTrash) navTrash.classList.add('active'); 
        if(viewMain) viewMain.classList.add('hidden'); 
        if(viewTrash) viewTrash.classList.remove('hidden');
    }
    updateUI();
}

function updateUI() {
    if (currentView !== 'trash') {
        renderActivePrompts();
    } else {
        renderTrashPrompts();
    }
    updateCategoryFilter();
    if(trashCount) trashCount.innerText = trashPrompts.length;
}


// --- RENDERING CARDS ---
function renderActivePrompts() {
    if(!promptGrid) return;
    promptGrid.innerHTML = '';
    const filterText = searchInput ? searchInput.value.toLowerCase() : '';
    const filterCat = categoryFilter ? categoryFilter.value : 'all';

    let filtered = activePrompts.filter(p => 
        (p.title.toLowerCase().includes(filterText) || p.category.toLowerCase().includes(filterText)) &&
        (filterCat === 'all' || p.category === filterCat)
    );

    if (currentView === 'favorites') filtered = filtered.filter(p => p.isFavorite);
    else if (currentView === 'pinned') filtered = filtered.filter(p => p.isPinned);

    filtered.sort((a, b) => {
        if (a.isPinned === b.isPinned) return 0;
        return a.isPinned ? -1 : 1;
    });

    if (filtered.length === 0) {
        promptGrid.innerHTML = `<p style="color: var(--text-muted);">No prompts found.</p>`; 
        return;
    }
    filtered.forEach(prompt => promptGrid.appendChild(createCardHTML(prompt, 'active')));
}

function renderTrashPrompts() {
    if(!trashGrid) return;
    trashGrid.innerHTML = '';
    if (trashPrompts.length === 0) {
        trashGrid.innerHTML = '<p style="color: var(--text-muted);">Trash is empty.</p>'; 
        return;
    }
    trashPrompts.forEach(prompt => trashGrid.appendChild(createCardHTML(prompt, 'trash')));
}

function createCardHTML(prompt, type) {
    const card = document.createElement('div');
    card.className = `prompt-card ${prompt.isPinned ? 'is-pinned' : ''}`;
    
    let headerIcons = '';
    let actionButtons = '';

    if (type === 'active') {
        headerIcons = `
            <div class="card-toggles">
                <button class="icon-btn ${prompt.isPinned ? 'active-pin' : ''}" onclick="window.togglePin('${prompt.id}')">📌</button>
                <button class="icon-btn ${prompt.isFavorite ? 'active-fav' : ''}" onclick="window.toggleFavorite('${prompt.id}')">★</button>
            </div>`;
        actionButtons = `
            <button class="btn-small btn-use" onclick="window.handleUsePrompt('${prompt.id}', this)">Use / Copy</button>
            <button class="btn-small btn-edit" onclick="window.editPrompt('${prompt.id}')">Edit</button>
            <button class="btn-small btn-delete" onclick="window.moveToTrash('${prompt.id}')">Delete</button>
        `;
    } else {
        actionButtons = `
            <button class="btn-small btn-restore" onclick="window.restorePrompt('${prompt.id}')">Restore</button>
            <button class="btn-small btn-delete-perm" onclick="window.deletePermanently('${prompt.id}')">Delete Perm</button>
        `;
    }

    const highlightedContent = escapeHTML(prompt.content).replace(/\{\{(.*?)\}\}/g, '<strong style="color:var(--primary-color)">{{$1}}</strong>');

    card.innerHTML = `
        <div class="prompt-header">
            <div class="title-group">
                <h3>${escapeHTML(prompt.title)}</h3>
                <span class="prompt-category">${escapeHTML(prompt.category)}</span>
            </div>
            ${headerIcons}
        </div>
        <div class="prompt-text">${highlightedContent}</div>
        <div class="prompt-actions">${actionButtons}</div>
    `;
    return card;
}


// --- DYNAMIC VARIABLE SYSTEM ---
const variableRegex = /\{\{\s*([^}]+?)\s*\}\}/g;

window.handleUsePrompt = function(id, btnElement) {
    const prompt = activePrompts.find(p => p.id === id);
    if (!prompt) return;
    
    const matches = [...prompt.content.matchAll(variableRegex)];
    if (matches.length > 0) {
        const uniqueVars = [...new Set(matches.map(m => m[1].trim()))];
        openVariableModal(prompt.content, uniqueVars, btnElement);
    } else {
        executeCopy(prompt.content, btnElement);
    }
}

function openVariableModal(textTemplate, variables, btnElement) {
    currentTemplateText = textTemplate; 
    currentTriggerButton = btnElement; 
    if(!dynamicInputsContainer) return;
    dynamicInputsContainer.innerHTML = '';
    
    variables.forEach(varName => {
        const div = document.createElement('div'); 
        div.className = 'form-group';
        const cleanLabel = varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        div.innerHTML = `
            <label for="var_${varName}">${cleanLabel}</label>
            <input type="text" id="var_${varName}" data-var="${varName}" class="dynamic-var-input" placeholder="Enter ${cleanLabel}..." required>
        `;
        dynamicInputsContainer.appendChild(div);
    });
    
    if(variableModal) variableModal.classList.remove('hidden');
    setTimeout(() => {
        const firstInput = document.querySelector('.dynamic-var-input');
        if(firstInput) firstInput.focus();
    }, 100);
}

function closeVariableModal() {
    if(variableModal) variableModal.classList.add('hidden'); 
    currentTemplateText = ''; 
    currentTriggerButton = null;
}

function processAndCopyTemplate() {
    let finalPrompt = currentTemplateText;
    const inputs = document.querySelectorAll('.dynamic-var-input');
    
    inputs.forEach(input => {
        const varName = input.getAttribute('data-var');
        const userValue = input.value || `[${varName}]`;
        const replaceRegex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
        finalPrompt = finalPrompt.replace(replaceRegex, userValue);
    });
    
    executeCopy(finalPrompt, currentTriggerButton);
    closeVariableModal();
}

async function executeCopy(textToCopy, btnElement) {
    try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = btnElement.innerText;
        btnElement.innerText = 'Copied!'; 
        btnElement.style.backgroundColor = '#059669'; 
        
        setTimeout(() => { 
            btnElement.innerText = originalText; 
            btnElement.style.backgroundColor = ''; 
        }, 2000);
    } catch (err) { 
        alert('Failed to copy. Please check browser permissions.'); 
    }
}


// --- STANDARD CRUD ACTIONS (Now Syncs to Cloud) ---
if(form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = promptIdInput ? promptIdInput.value : null;
        const newPrompt = {
            id: id || Date.now().toString(),
            title: titleInput ? titleInput.value.trim() : '', 
            category: categoryInput ? categoryInput.value.trim() : '', 
            content: contentInput ? contentInput.value.trim() : '',
            isFavorite: false, 
            isPinned: false
        };

        if (id) {
            const existing = activePrompts.find(p => p.id === id);
            if (existing) { 
                newPrompt.isFavorite = existing.isFavorite; 
                newPrompt.isPinned = existing.isPinned; 
            }
            const index = activePrompts.findIndex(p => p.id === id);
            activePrompts[index] = newPrompt;
        } else {
            activePrompts.unshift(newPrompt);
        }
        
        syncToCloud(); 
        resetForm();
    });
}

window.editPrompt = function(id) {
    const p = activePrompts.find(p => p.id === id);
    if (!p) return;
    
    if(promptIdInput) promptIdInput.value = p.id; 
    if(titleInput) titleInput.value = p.title; 
    if(categoryInput) categoryInput.value = p.category; 
    if(contentInput) contentInput.value = p.content;
    
    switchView('all'); 
    if(formTitle) formTitle.innerText = 'Edit Prompt'; 
    if(submitBtn) submitBtn.innerText = 'Update Prompt'; 
    if(cancelBtn) cancelBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.moveToTrash = function(id) {
    const index = activePrompts.findIndex(p => p.id === id);
    if (index > -1) { 
        trashPrompts.unshift(activePrompts.splice(index, 1)[0]); 
        syncToCloud(); 
    }
}

window.restorePrompt = function(id) {
    const index = trashPrompts.findIndex(p => p.id === id);
    if (index > -1) { 
        activePrompts.unshift(trashPrompts.splice(index, 1)[0]); 
        syncToCloud(); 
    }
}

window.deletePermanently = function(id) {
    if (confirm('Permanently delete?')) { 
        trashPrompts = trashPrompts.filter(p => p.id !== id); 
        syncToCloud(); 
    }
}

window.toggleFavorite = function(id) {
    const p = activePrompts.find(p => p.id === id); 
    if (p) { 
        p.isFavorite = !p.isFavorite; 
        syncToCloud(); 
    }
}

window.togglePin = function(id) {
    const p = activePrompts.find(p => p.id === id); 
    if (p) { 
        p.isPinned = !p.isPinned; 
        syncToCloud(); 
    }
}


// --- UTILITIES ---
function updateCategoryFilter() {
    if(!categoryFilter) return;
    const sourceArray = currentView === 'trash' ? trashPrompts : activePrompts;
    const categories = [...new Set(sourceArray.map(p => p.category))];
    const currentVal = categoryFilter.value;
    
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    
    if (categories.includes(currentVal)) {
        categoryFilter.value = currentVal;
    }
}

function resetForm() {
    if(form) form.reset(); 
    if(promptIdInput) promptIdInput.value = ''; 
    if(formTitle) formTitle.innerText = 'Add New Prompt'; 
    if(submitBtn) submitBtn.innerText = 'Save Prompt'; 
    if(cancelBtn) cancelBtn.classList.add('hidden');
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t]));
}

// Start App
init();