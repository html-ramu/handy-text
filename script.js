// --- STATE MANAGEMENT ---
let activePrompts = [];
let trashPrompts = [];
let currentView = 'all';

// Modal State Variables
let currentTemplateText = '';
let currentTriggerButton = null;

function loadData() {
    const loadedActive = JSON.parse(localStorage.getItem('handyTextActivePrompts'));
    const loadedTrash = JSON.parse(localStorage.getItem('handyTextTrashPrompts'));
    activePrompts = loadedActive || [];
    trashPrompts = loadedTrash || [];
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

// Modal Elements
const variableModal = document.getElementById('variableModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const dynamicInputsContainer = document.getElementById('dynamicInputsContainer');
const generateCopyBtn = document.getElementById('generateCopyBtn');

// --- INITIALIZATION ---
function init() {
    loadData();
    
    navAll.addEventListener('click', () => switchView('all'));
    navFavorites.addEventListener('click', () => switchView('favorites'));
    navPinned.addEventListener('click', () => switchView('pinned'));
    navTrash.addEventListener('click', () => switchView('trash'));
    
    searchInput.addEventListener('input', updateUI);
    categoryFilter.addEventListener('change', updateUI);
    cancelBtn.addEventListener('click', resetForm);
    
    // Modal Listeners
    closeModalBtn.addEventListener('click', closeVariableModal);
    generateCopyBtn.addEventListener('click', processAndCopyTemplate);
    
    updateUI();
}

// --- VIEW NAVIGATION & UI ---
function switchView(view) {
    currentView = view;
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
        formSection.classList.add('hidden');
        viewHeader.style.display = 'block';
        viewTitle.innerText = '★ Favorite Prompts';
        viewSubtitle.innerText = 'Your most loved prompts.';
    } else if (view === 'pinned') {
        navPinned.classList.add('active');
        viewMain.classList.remove('hidden');
        viewTrash.classList.add('hidden');
        formSection.classList.add('hidden');
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
    if (currentView !== 'trash') renderActivePrompts();
    else renderTrashPrompts();
    updateCategoryFilter();
    trashCount.innerText = trashPrompts.length;
}

// --- RENDERING CARDS ---
function renderActivePrompts() {
    promptGrid.innerHTML = '';
    const filterText = searchInput.value.toLowerCase();
    const filterCat = categoryFilter.value;

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
                <button class="icon-btn ${prompt.isPinned ? 'active-pin' : ''}" onclick="togglePin('${prompt.id}')">📌</button>
                <button class="icon-btn ${prompt.isFavorite ? 'active-fav' : ''}" onclick="toggleFavorite('${prompt.id}')">★</button>
            </div>`;
        actionButtons = `
            <button class="btn-small btn-use" onclick="handleUsePrompt('${prompt.id}', this)">Use / Copy</button>
            <button class="btn-small btn-edit" onclick="editPrompt('${prompt.id}')">Edit</button>
            <button class="btn-small btn-delete" onclick="moveToTrash('${prompt.id}')">Delete</button>
        `;
    } else {
        actionButtons = `
            <button class="btn-small btn-restore" onclick="restorePrompt('${prompt.id}')">Restore</button>
            <button class="btn-small btn-delete-perm" onclick="deletePermanently('${prompt.id}')">Delete Perm</button>
        `;
    }

    // Highlight variables visually in the preview (optional UI enhancement)
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

// Regex Explanation: 
// /\{\{        -> Matches exactly "{{"
// \s*          -> Allows optional spaces before the variable name
// ([^}]+?)     -> Captures everything that is NOT a "}" (this is the variable name itself)
// \s*          -> Allows optional spaces after the variable name
// \}\}/g       -> Matches exactly "}}" globally across the whole text
const variableRegex = /\{\{\s*([^}]+?)\s*\}\}/g;

function handleUsePrompt(id, btnElement) {
    const prompt = activePrompts.find(p => p.id === id);
    if (!prompt) return;

    // Find all variables in the text
    const matches = [...prompt.content.matchAll(variableRegex)];
    
    if (matches.length > 0) {
        // Extract unique variable names (e.g., if {{name}} appears twice, only ask once)
        const uniqueVars = [...new Set(matches.map(m => m[1].trim()))];
        openVariableModal(prompt.content, uniqueVars, btnElement);
    } else {
        // If no variables, just copy directly like standard behavior
        executeCopy(prompt.content, btnElement);
    }
}

function openVariableModal(textTemplate, variables, btnElement) {
    currentTemplateText = textTemplate;
    currentTriggerButton = btnElement;
    dynamicInputsContainer.innerHTML = ''; // Clear old inputs

    // Generate HTML inputs for each variable
    variables.forEach(varName => {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        // Format variable name for label (e.g., brand_name -> Brand Name)
        const cleanLabel = varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        div.innerHTML = `
            <label for="var_${varName}">${cleanLabel}</label>
            <input type="text" id="var_${varName}" data-var="${varName}" class="dynamic-var-input" placeholder="Enter ${cleanLabel}..." required>
        `;
        dynamicInputsContainer.appendChild(div);
    });

    variableModal.classList.remove('hidden');
    // Auto-focus first input
    setTimeout(() => document.querySelector('.dynamic-var-input').focus(), 100);
}

function closeVariableModal() {
    variableModal.classList.add('hidden');
    currentTemplateText = '';
    currentTriggerButton = null;
}

function processAndCopyTemplate() {
    let finalPrompt = currentTemplateText;
    const inputs = document.querySelectorAll('.dynamic-var-input');
    
    // Replace all variables in the template with user inputs
    inputs.forEach(input => {
        const varName = input.getAttribute('data-var');
        const userValue = input.value || `[${varName}]`; // fallback if left empty
        
        // Dynamically build a regex to replace THIS specific variable globally
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

// --- STANDARD CRUD ACTIONS ---
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = promptIdInput.value;
    const newPrompt = {
        id: id || Date.now().toString(),
        title: titleInput.value.trim(),
        category: categoryInput.value.trim(),
        content: contentInput.value.trim(),
        isFavorite: false, 
        isPinned: false
    };

    if (id) {
        const existing = activePrompts.find(p => p.id === id);
        if (existing) { newPrompt.isFavorite = existing.isFavorite; newPrompt.isPinned = existing.isPinned; }
        const index = activePrompts.findIndex(p => p.id === id);
        activePrompts[index] = newPrompt;
    } else {
        activePrompts.unshift(newPrompt);
    }
    saveData();
    resetForm();
});

function editPrompt(id) {
    const p = activePrompts.find(p => p.id === id);
    if (!p) return;
    promptIdInput.value = p.id; titleInput.value = p.title; categoryInput.value = p.category; contentInput.value = p.content;
    switchView('all');
    formTitle.innerText = 'Edit Prompt'; submitBtn.innerText = 'Update Prompt'; cancelBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function moveToTrash(id) {
    const index = activePrompts.findIndex(p => p.id === id);
    if (index > -1) { trashPrompts.unshift(activePrompts.splice(index, 1)[0]); saveData(); }
}
function restorePrompt(id) {
    const index = trashPrompts.findIndex(p => p.id === id);
    if (index > -1) { activePrompts.unshift(trashPrompts.splice(index, 1)[0]); saveData(); }
}
function deletePermanently(id) {
    if (confirm('Permanently delete?')) { trashPrompts = trashPrompts.filter(p => p.id !== id); saveData(); }
}
function toggleFavorite(id) {
    const p = activePrompts.find(p => p.id === id); if (p) { p.isFavorite = !p.isFavorite; saveData(); }
}
function togglePin(id) {
    const p = activePrompts.find(p => p.id === id); if (p) { p.isPinned = !p.isPinned; saveData(); }
}

// --- UTILITIES ---
function updateCategoryFilter() {
    const sourceArray = currentView === 'trash' ? trashPrompts : activePrompts;
    const categories = [...new Set(sourceArray.map(p => p.category))];
    const currentVal = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`);
    if (categories.includes(currentVal)) categoryFilter.value = currentVal;
}

function resetForm() {
    form.reset(); promptIdInput.value = ''; formTitle.innerText = 'Add New Prompt'; submitBtn.innerText = 'Save Prompt'; cancelBtn.classList.add('hidden');
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t]));
}

// Start App
init();