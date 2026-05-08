// --- STATE MANAGEMENT & MIGRATION ---
let activePrompts = [];
let trashPrompts = [];

function loadAndMigrateData() {
    // 1. Load data from the new separate keys
    const loadedActive = JSON.parse(localStorage.getItem('handyTextActivePrompts'));
    const loadedTrash = JSON.parse(localStorage.getItem('handyTextTrashPrompts'));

    // 2. Data Migration: If new keys don't exist, check for the old v1 key
    if (!loadedActive && !loadedTrash) {
        const oldData = JSON.parse(localStorage.getItem('handyTextPrompts'));
        if (oldData) {
            activePrompts = oldData; // Move old data to active array
            localStorage.removeItem('handyTextPrompts'); // Clean up old key
        }
    } else {
        // Normal loading
        activePrompts = loadedActive || [];
        trashPrompts = loadedTrash || [];
    }
    
    saveData(); // Ensure the new structure is saved immediately
}

function saveData() {
    localStorage.setItem('handyTextActivePrompts', JSON.stringify(activePrompts));
    localStorage.setItem('handyTextTrashPrompts', JSON.stringify(trashPrompts));
    updateUI();
}

// --- DOM ELEMENTS ---
const viewHome = document.getElementById('viewHome');
const viewTrash = document.getElementById('viewTrash');
const navHome = document.getElementById('navHome');
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
    navHome.addEventListener('click', () => switchView('home'));
    navTrash.addEventListener('click', () => switchView('trash'));
    
    // Setup Search/Filter Listeners
    searchInput.addEventListener('input', updateUI);
    categoryFilter.addEventListener('change', updateUI);
    cancelBtn.addEventListener('click', resetForm);
}

function updateUI() {
    renderActivePrompts();
    renderTrashPrompts();
    updateCategoryFilter();
    trashCount.innerText = trashPrompts.length; // Update the badge number
}

// --- VIEW NAVIGATION ---
function switchView(view) {
    if (view === 'home') {
        viewHome.classList.remove('hidden');
        viewTrash.classList.add('hidden');
        navHome.classList.add('active');
        navTrash.classList.remove('active');
    } else if (view === 'trash') {
        viewHome.classList.add('hidden');
        viewTrash.classList.remove('hidden');
        navHome.classList.remove('active');
        navTrash.classList.add('active');
    }
}

// --- RENDER LOGIC ---
function renderActivePrompts() {
    promptGrid.innerHTML = '';
    const filterText = searchInput.value.toLowerCase();
    const filterCat = categoryFilter.value;

    const filtered = activePrompts.filter(prompt => {
        const matchesSearch = prompt.title.toLowerCase().includes(filterText) || 
                              prompt.category.toLowerCase().includes(filterText);
        const matchesCat = filterCat === 'all' || prompt.category === filterCat;
        return matchesSearch && matchesCat;
    });

    if (filtered.length === 0) {
        promptGrid.innerHTML = '<p style="color: var(--text-muted);">No active prompts found.</p>';
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
    card.className = 'prompt-card';
    
    let actionButtons = '';
    if (type === 'active') {
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
            <h3>${escapeHTML(prompt.title)}</h3>
            <span class="prompt-category">${escapeHTML(prompt.category)}</span>
        </div>
        <div class="prompt-text">${escapeHTML(prompt.content)}</div>
        <div class="prompt-actions">
            ${actionButtons}
        </div>
    `;
    return card;
}

// --- PROMPT ACTIONS (HOME) ---
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = promptIdInput.value;
    const newPrompt = {
        id: id ? id : Date.now().toString(),
        title: titleInput.value.trim(),
        category: categoryInput.value.trim(),
        content: contentInput.value.trim()
    };

    if (id) {
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

    formTitle.innerText = 'Edit Prompt';
    submitBtn.innerText = 'Update Prompt';
    cancelBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Move to Trash (Soft Delete)
function moveToTrash(id) {
    const index = activePrompts.findIndex(p => p.id === id);
    if (index > -1) {
        const [deletedPrompt] = activePrompts.splice(index, 1);
        trashPrompts.unshift(deletedPrompt); // Add to beginning of trash
        saveData();
    }
}

// --- PROMPT ACTIONS (TRASH) ---
function restorePrompt(id) {
    const index = trashPrompts.findIndex(p => p.id === id);
    if (index > -1) {
        const [restoredPrompt] = trashPrompts.splice(index, 1);
        activePrompts.unshift(restoredPrompt); // Bring back to top of active list
        saveData();
    }
}

function deletePermanently(id) {
    if (confirm('Are you sure you want to permanently delete this prompt? This cannot be undone.')) {
        trashPrompts = trashPrompts.filter(p => p.id !== id);
        saveData();
    }
}

// --- UTILITIES ---
async function copyText(id, btnElement) {
    const prompt = activePrompts.find(p => p.id === id);
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
    const categories = [...new Set(activePrompts.map(p => p.category))];
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
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

// Start App
init();