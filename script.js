// --- STATE MANAGEMENT & MIGRATION ---
let activePrompts = [];
let trashPrompts = [];
let currentView = 'all'; // can be 'all', 'favorites', 'pinned', 'trash'

function loadAndMigrateData() {
    const loadedActive = JSON.parse(localStorage.getItem('handyTextActivePrompts'));
    const loadedTrash = JSON.parse(localStorage.getItem('handyTextTrashPrompts'));

    // Migrate active prompts to ensure they have the new Pin/Favorite properties
    if (loadedActive) {
        activePrompts = loadedActive.map(p => ({
            ...p,
            isFavorite: p.isFavorite || false, // Add default false if missing
            isPinned: p.isPinned || false      // Add default false if missing
        }));
    } else {
        activePrompts = [];
    }

    trashPrompts = loadedTrash || [];
    saveData(); 
}

function saveData() {
    localStorage.setItem('handyTextActivePrompts', JSON.stringify(activePrompts));
    localStorage.setItem('handyTextTrashPrompts', JSON.stringify(trashPrompts));
    updateUI();
}

// --- DOM ELEMENTS ---
const viewMain = document.getElementById('viewMain');
const viewTrash = document.getElementById('viewTrash');
const formSection = document.getElementById('formSection');
const viewHeader = document.getElementById('viewHeader');
const viewTitle = document.getElementById('viewTitle');
const viewSubtitle = document.getElementById('viewSubtitle');

const navAll = document.getElementById('navAll');
const navFavorites = document.getElementById('navFavorites');
const navPinned = document.getElementById('navPinned');
const navTrash = document.getElementById('navTrash');
const trashCount = document.getElementById('trashCount');

const form = document.getElementById('promptForm');
const promptIdInput = document.getElementById('promptId');
const titleInput = document.getElementById('title');
const categoryInput = document.getElementById('category');
const contentInput = document.getElementById('content');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');

const promptGrid = document.getElementById('promptGrid');
const trashGrid = document.getElementById('trashGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// --- INITIALIZATION ---
function init() {
    loadAndMigrateData();
    
    // Setup View Event Listeners
    navAll.addEventListener('click', () => switchView('all'));
    navFavorites.addEventListener('click', () => switchView('favorites'));
    navPinned.addEventListener('click', () => switchView('pinned'));
    navTrash.addEventListener('click', () => switchView('trash'));
    
    // Setup Search/Filter Listeners
    searchInput.addEventListener('input', updateUI);
    categoryFilter.addEventListener('change', updateUI);
    cancelBtn.addEventListener('click', resetForm);
    
    updateUI();
}

// --- VIEW NAVIGATION ---
function switchView(view) {
    currentView = view;
    
    // Update Navigation Active States
    [navAll, navFavorites, navPinned, navTrash].forEach(btn => btn.classList.remove('active'));
    
    if (view === 'all') {
        navAll.classList.add('active');
        viewMain.classList.remove('hidden');
        viewTrash.classList.add('hidden');
        formSection.classList.remove('hidden');
        viewHeader.style.display = 'none';
    } else if (view === 'favorites') {
        navFavorites.classList.add('active');
        viewMain.classList.remove('hidden');
        viewTrash.classList.add('hidden');
        formSection.classList.add('hidden'); // Hide form to focus on favorites
        viewHeader.style.display = 'block';
        viewTitle.innerText = '★ Favorite Prompts';
        viewSubtitle.innerText = 'Your most loved prompts.';
    } else if (view === 'pinned') {
        navPinned.classList.add('active');
        viewMain.classList.remove('hidden');
        viewTrash.classList.add('hidden');
        formSection.classList.add('hidden'); // Hide form to focus on pins
        viewHeader.style.display = 'block';
        viewTitle.innerText = '📌 Pinned Prompts';
        viewSubtitle.innerText = 'Prompts kept at the top for quick access.';
    } else if (view === 'trash') {
        navTrash.classList.add('active');
        viewMain.classList.add('hidden');
        viewTrash.classList.remove('hidden');
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
    trashCount.innerText = trashPrompts.length;
}

// --- RENDER LOGIC ---
function renderActivePrompts() {
    promptGrid.innerHTML = '';
    const filterText = searchInput.value.toLowerCase();
    const filterCat = categoryFilter.value;

    // 1. Filter by Search & Category
    let filtered = activePrompts.filter(prompt => {
        const matchesSearch = prompt.title.toLowerCase().includes(filterText) || 
                              prompt.category.toLowerCase().includes(filterText);
        const matchesCat = filterCat === 'all' || prompt.category === filterCat;
        return matchesSearch && matchesCat;
    });

    // 2. Filter by View State (Favorites / Pinned)
    if (currentView === 'favorites') {
        filtered = filtered.filter(p => p.isFavorite);
    } else if (currentView === 'pinned') {
        filtered = filtered.filter(p => p.isPinned);
    }

    // 3. Sort: Always put Pinned prompts at the top
    filtered.sort((a, b) => {
        if (a.isPinned === b.isPinned) return 0; // Maintain natural order if same
        return a.isPinned ? -1 : 1;              // Pinned comes first
    });

    if (filtered.length === 0) {
        promptGrid.innerHTML = `<p style="color: var(--text-muted);">No prompts found in ${currentView} view.</p>`;
        return;
    }

    filtered.forEach(prompt => {
        const card = createCardHTML(prompt, 'active');
        promptGrid.appendChild(card);
    });
}

function renderTrashPrompts() {
    trashGrid.innerHTML = '';
    
    if (trashPrompts.length === 0) {
        trashGrid.innerHTML = '<p style="color: var(--text-muted);">Trash is empty.</p>';
        return;
    }

    trashPrompts.forEach(prompt => {
        const card = createCardHTML(prompt, 'trash');
        trashGrid.appendChild(card);
    });
}

function createCardHTML(prompt, type) {
    const card = document.createElement('div');
    card.className = `prompt-card ${prompt.isPinned ? 'is-pinned' : ''}`;
    
    let headerIcons = '';
    let actionButtons = '';

    if (type === 'active') {
        // Only show Pin/Star toggles if not in trash
        headerIcons = `
            <div class="card-toggles">
                <button class="icon-btn ${prompt.isPinned ? 'active-pin' : ''}" onclick="togglePin('${prompt.id}')" title="Pin Prompt">📌</button>
                <button class="icon-btn ${prompt.isFavorite ? 'active-fav' : ''}" onclick="toggleFavorite('${prompt.id}')" title="Favorite Prompt">★</button>
            </div>
        `;
        actionButtons = `
            <button class="btn-small btn-copy" onclick="copyText('${prompt.id}', this)">Copy</button>
            <button class="btn-small btn-edit" onclick="editPrompt('${prompt.id}')">Edit</button>
            <button class="btn-small btn-delete" onclick="moveToTrash('${prompt.id}')">Delete</button>
        `;
    } else {
        actionButtons = `
            <button class="btn-small btn-restore" onclick="restorePrompt('${prompt.id}')">Restore</button>
            <button class="btn-small btn-delete-perm" onclick="deletePermanently('${prompt.id}')">Delete Permanently</button>
        `;
    }

    card.innerHTML = `
        <div class="prompt-header">
            <div class="title-group">
                <h3>${escapeHTML(prompt.title)}</h3>
                <span class="prompt-category">${escapeHTML(prompt.category)}</span>
            </div>
            ${headerIcons}
        </div>
        <div class="prompt-text">${escapeHTML(prompt.content)}</div>
        <div class="prompt-actions">
            ${actionButtons}
        </div>
    `;
    return card;
}

// --- NEW TOGGLE ACTIONS ---
function toggleFavorite(id) {
    const prompt = activePrompts.find(p => p.id === id);
    if (prompt) {
        prompt.isFavorite = !prompt.isFavorite;
        saveData();
    }
}

function togglePin(id) {
    const prompt = activePrompts.find(p => p.id === id);
    if (prompt) {
        prompt.isPinned = !prompt.isPinned;
        saveData();
    }
}

// --- PROMPT ACTIONS (HOME) ---
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = promptIdInput.value;
    const newPrompt = {
        id: id ? id : Date.now().toString(),
        title: titleInput.value.trim(),
        category: categoryInput.value.trim(),
        content: contentInput.value.trim(),
        isFavorite: false, // New prompts default to false
        isPinned: false    // New prompts default to false
    };

    if (id) {
        // Preserve existing pin/fav state when editing
        const existingPrompt = activePrompts.find(p => p.id === id);
        if (existingPrompt) {
            newPrompt.isFavorite = existingPrompt.isFavorite;
            newPrompt.isPinned = existingPrompt.isPinned;
        }
        
        const index = activePrompts.findIndex(p => p.id === id);
        activePrompts[index] = newPrompt;
    } else {
        activePrompts.unshift(newPrompt);
    }

    saveData();
    resetForm();
});

function editPrompt(id) {
    const prompt = activePrompts.find(p => p.id === id);
    if (!prompt) return;

    promptIdInput.value = prompt.id;
    titleInput.value = prompt.title;
    categoryInput.value = prompt.category;
    contentInput.value = prompt.content;

    // Switch to 'All' view to ensure form is visible
    switchView('all');

    formTitle.innerText = 'Edit Prompt';
    submitBtn.innerText = 'Update Prompt';
    cancelBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function moveToTrash(id) {
    const index = activePrompts.findIndex(p => p.id === id);
    if (index > -1) {
        const [deletedPrompt] = activePrompts.splice(index, 1);
        trashPrompts.unshift(deletedPrompt); 
        saveData();
    }
}

// --- PROMPT ACTIONS (TRASH) ---
function restorePrompt(id) {
    const index = trashPrompts.findIndex(p => p.id === id);
    if (index > -1) {
        const [restoredPrompt] = trashPrompts.splice(index, 1);
        activePrompts.unshift(restoredPrompt); 
        saveData();
    }
}

function deletePermanently(id) {
    if (confirm('Permanently delete this prompt? This cannot be undone.')) {
        trashPrompts = trashPrompts.filter(p => p.id !== id);
        saveData();
    }
}

// --- UTILITIES ---
async function copyText(id, btnElement) {
    // Find in both arrays just in case, though usually called from active
    let prompt = activePrompts.find(p => p.id === id) || trashPrompts.find(p => p.id === id);
    if (!prompt) return;

    try {
        await navigator.clipboard.writeText(prompt.content);
        const originalText = btnElement.innerText;
        btnElement.innerText = 'Copied!';
        btnElement.style.backgroundColor = '#059669'; 
        
        setTimeout(() => {
            btnElement.innerText = originalText;
            btnElement.style.backgroundColor = ''; 
        }, 2000);
    } catch (err) {
        alert('Failed to copy text.');
    }
}

function updateCategoryFilter() {
    const sourceArray = currentView === 'trash' ? trashPrompts : activePrompts;
    const categories = [...new Set(sourceArray.map(p => p.category))];
    const currentValue = categoryFilter.value;
    
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });

    if (categories.includes(currentValue)) {
        categoryFilter.value = currentValue;
    }
}

function resetForm() {
    form.reset();
    promptIdInput.value = '';
    formTitle.innerText = 'Add New Prompt';
    submitBtn.innerText = 'Save Prompt';
    cancelBtn.classList.add('hidden');
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag])
    );
}

// Start App
init();