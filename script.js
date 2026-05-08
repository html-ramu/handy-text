// State Management
let prompts = JSON.parse(localStorage.getItem('handyTextPrompts')) || [];

// DOM Elements
const form = document.getElementById('promptForm');
const promptIdInput = document.getElementById('promptId');
const titleInput = document.getElementById('title');
const categoryInput = document.getElementById('category');
const contentInput = document.getElementById('content');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const promptGrid = document.getElementById('promptGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Initialization
function init() {
    renderPrompts();
    updateCategoryFilter();
}

// Save to LocalStorage
function savePrompts() {
    localStorage.setItem('handyTextPrompts', JSON.stringify(prompts));
    updateCategoryFilter();
}

// Render Prompts to UI
function renderPrompts(filterText = '', filterCategory = 'all') {
    promptGrid.innerHTML = '';

    const filteredPrompts = prompts.filter(prompt => {
        const matchesSearch = prompt.title.toLowerCase().includes(filterText.toLowerCase()) || 
                              prompt.category.toLowerCase().includes(filterText.toLowerCase());
        const matchesCategory = filterCategory === 'all' || prompt.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (filteredPrompts.length === 0) {
        promptGrid.innerHTML = '<p style="color: var(--text-muted);">No prompts found.</p>';
        return;
    }

    filteredPrompts.forEach(prompt => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        
        card.innerHTML = `
            <div class="prompt-header">
                <h3>${escapeHTML(prompt.title)}</h3>
                <span class="prompt-category">${escapeHTML(prompt.category)}</span>
            </div>
            <div class="prompt-text">${escapeHTML(prompt.content)}</div>
            <div class="prompt-actions">
                <button class="btn-small btn-copy" onclick="copyText('${prompt.id}', this)">Copy</button>
                <button class="btn-small btn-edit" onclick="editPrompt('${prompt.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deletePrompt('${prompt.id}')">Delete</button>
            </div>
        `;
        promptGrid.appendChild(card);
    });
}

// Add or Update Prompt
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
        // Update existing
        const index = prompts.findIndex(p => p.id === id);
        prompts[index] = newPrompt;
    } else {
        // Add new
        prompts.unshift(newPrompt); // Add to beginning of array
    }

    savePrompts();
    renderPrompts();
    resetForm();
});

// Edit Prompt (Populate Form)
function editPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;

    promptIdInput.value = prompt.id;
    titleInput.value = prompt.title;
    categoryInput.value = prompt.category;
    contentInput.value = prompt.content;

    formTitle.innerText = 'Edit Prompt';
    submitBtn.innerText = 'Update Prompt';
    cancelBtn.classList.remove('hidden');
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete Prompt
function deletePrompt(id) {
    if (confirm('Are you sure you want to delete this prompt?')) {
        prompts = prompts.filter(p => p.id !== id);
        savePrompts();
        renderPrompts(searchInput.value, categoryFilter.value);
    }
}

// Copy to Clipboard
async function copyText(id, btnElement) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;

    try {
        await navigator.clipboard.writeText(prompt.content);
        const originalText = btnElement.innerText;
        btnElement.innerText = 'Copied!';
        btnElement.style.backgroundColor = '#059669'; // Darker success color
        
        setTimeout(() => {
            btnElement.innerText = originalText;
            btnElement.style.backgroundColor = ''; // Reset to CSS class default
        }, 2000);
    } catch (err) {
        alert('Failed to copy text. Please copy manually.');
    }
}

// Dynamic Category Dropdown
function updateCategoryFilter() {
    const categories = [...new Set(prompts.map(p => p.category))];
    const currentValue = categoryFilter.value;
    
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });

    // Restore selected value if it still exists
    if (categories.includes(currentValue)) {
        categoryFilter.value = currentValue;
    }
}

// Event Listeners for Search and Filter
searchInput.addEventListener('input', (e) => renderPrompts(e.target.value, categoryFilter.value));
categoryFilter.addEventListener('change', (e) => renderPrompts(searchInput.value, e.target.value));
cancelBtn.addEventListener('click', resetForm);

// Reset Form State
function resetForm() {
    form.reset();
    promptIdInput.value = '';
    formTitle.innerText = 'Add New Prompt';
    submitBtn.innerText = 'Save Prompt';
    cancelBtn.classList.add('hidden');
}

// Utility: Escape HTML to prevent XSS (since we use innerHTML for card generation)
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