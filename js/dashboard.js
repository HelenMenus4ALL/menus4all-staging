/**
 * Dashboard JavaScript
 * Handles menu display, filtering, and management actions
 */

// State management
let allMenus = {};
let currentFilter = 'all';
let currentSearch = '';
let currentCity = '';

// DOM elements
const loading = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const statusMessage = document.getElementById('status-message');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const cityFilter = document.getElementById('city-filter');
const refreshBtn = document.getElementById('refresh-btn');
const modal = document.getElementById('action-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    setupTabNavigation();
    setupEventListeners();
    setupKeyboardShortcuts();
    await loadMenus();
});

/**
 * Load all menus from Firebase
 */
async function loadMenus() {
    try {
        showLoading(true);
        announceToScreenReader('Loading menus...');
        
        allMenus = await getAllStagingMenus();
        
        updateCityFilter();
        renderAllViews();
        updateCounts();
        checkForUpdatesNeeded();
        
        showLoading(false);
        announceToScreenReader(`Loaded ${Object.keys(allMenus).length} menus`);
    } catch (error) {
        console.error('Error loading menus:', error);
        showError('Failed to load menus. Please refresh the page.');
        showLoading(false);
    }
}

/**
 * Render all tab views
 */
function renderAllViews() {
    renderMenuList('all-menus-list', allMenus);
    renderMenuList('needs-review-list', filterByStatus(allMenus, 'ready-for-review'));
    renderMenuList('in-progress-list', filterByStatus(allMenus, 'draft'));
    renderMenuList('live-list', filterByStatus(allMenus, 'live'));
    
    // Special handling for update due
    const updateDueMenus = filterNeedingUpdate(allMenus);
    renderMenuList('update-due-list', updateDueMenus);
}

/**
 * Render menu list
 */
function renderMenuList(containerId, menus) {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    // Apply search and city filters
    const filteredMenus = filterMenus(menus);
    const menuArray = Object.entries(filteredMenus);
    
    if (menuArray.length === 0) {
        container.innerHTML = '<p class="no-results">No menus found.</p>';
        return;
    }
    
    container.innerHTML = menuArray.map(([id, menu]) => createMenuCard(id, menu)).join('');
    
    // Set up event listeners on cards
    setupCardEventListeners(container);
}

/**
 * Create menu card HTML
 */
function createMenuCard(menuId, menu) {
    const status = menu.status || 'draft';
    const statusClass = getStatusClass(status);
    const statusLabel = getStatusLabel(status);
    
    const lastUpdated = menu.lastUpdated ? new Date(menu.lastUpdated).toLocaleDateString() : 'Never';
    const nextUpdate = menu.nextUpdateDue ? new Date(menu.nextUpdateDue).toLocaleDateString() : 'N/A';
    const daysUntilUpdate = menu.nextUpdateDue ? getDaysUntil(menu.nextUpdateDue) : null;
    
    const needsUpdate = daysUntilUpdate !== null && daysUntilUpdate <= 0;
    const updateWarning = needsUpdate ? '<span class="badge badge-warning" role="status">Update Due!</span>' : '';
    
    return `
        <article class="menu-card" data-menu-id="${menuId}" tabindex="0" role="article" aria-label="${menu.restaurantName}, ${menu.city}">
            <header class="card-header">
                <h3 class="card-title">${escapeHtml(menu.restaurantName)}</h3>
                <span class="badge ${statusClass}" role="status" aria-label="Status: ${statusLabel}">${statusLabel}</span>
                ${updateWarning}
            </header>
            
            <div class="card-body">
                <dl class="card-details">
                    <dt>City:</dt>
                    <dd>${escapeHtml(menu.city)}</dd>
                    
                    <dt>Address:</dt>
                    <dd>${escapeHtml(menu.address || 'N/A')}</dd>
                    
                    <dt>Last Updated:</dt>
                    <dd><time datetime="${menu.lastUpdated}">${lastUpdated}</time></dd>
                    
                    ${menu.status === 'live' ? `
                        <dt>Next Update:</dt>
                        <dd><time datetime="${menu.nextUpdateDue}">${nextUpdate}</time> 
                            ${daysUntilUpdate !== null ? `<span aria-label="${daysUntilUpdate} days">(${daysUntilUpdate} days)</span>` : ''}
                        </dd>
                    ` : ''}
                    
                    ${menu.assignedTo ? `
                        <dt>Assigned To:</dt>
                        <dd>${escapeHtml(menu.assignedTo)}</dd>
                    ` : ''}
                </dl>
            </div>
            
            <footer class="card-actions">
                ${getActionButtons(menuId, status)}
            </footer>
        </article>
    `;
}

/**
 * Get action buttons based on status
 */
function getActionButtons(menuId, status) {
    const buttons = [];
    
    // Edit button - always available
    buttons.push(`
        <a href="menu-editor.html?id=${menuId}" 
           class="btn btn-small btn-secondary" 
           aria-label="Edit menu">
            Edit
        </a>
    `);
    
    // Status-specific buttons
    if (status === 'draft' || status === 'needs-update') {
        buttons.push(`
            <button class="btn btn-small btn-primary mark-ready-btn" 
                    data-menu-id="${menuId}"
                    aria-label="Mark as ready for review">
                Ready for Review
            </button>
        `);
    }
    
    if (status === 'ready-for-review') {
        buttons.push(`
            <button class="btn btn-small btn-success approve-btn" 
                    data-menu-id="${menuId}"
                    aria-label="Approve menu">
                Approve
            </button>
            <button class="btn btn-small btn-warning send-back-btn" 
                    data-menu-id="${menuId}"
                    aria-label="Send back for revision">
                Send Back
            </button>
        `);
    }
    
    if (status === 'approved') {
        buttons.push(`
            <button class="btn btn-small btn-primary push-live-btn" 
                    data-menu-id="${menuId}"
                    aria-label="Push to production">
                Push to Production
            </button>
        `);
    }
    
    // Delete button - always available
    buttons.push(`
        <button class="btn btn-small btn-danger delete-btn" 
                data-menu-id="${menuId}"
                aria-label="Delete menu">
            Delete
        </button>
    `);
    
    return buttons.join('');
}

/**
 * Setup event listeners on menu cards
 */
function setupCardEventListeners(container) {
    // Mark ready buttons
    container.querySelectorAll('.mark-ready-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAsReady(btn.dataset.menuId);
        });
    });
    
    // Approve buttons
    container.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            approveMenu(btn.dataset.menuId);
        });
    });
    
    // Send back buttons
    container.querySelectorAll('.send-back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            sendBackMenu(btn.dataset.menuId);
        });
    });
    
    // Push live buttons
    container.querySelectorAll('.push-live-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            pushToProduction(btn.dataset.menuId);
        });
    });
    
    // Delete buttons
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteMenu(btn.dataset.menuId);
        });
    });
    
    // Card keyboard navigation
    container.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const editLink = card.querySelector('a[href*="menu-editor"]');
                if (editLink) editLink.click();
            }
        });
    });
}

/**
 * Mark menu as ready for review
 */
async function markAsReady(menuId) {
    try {
        await updateMenuStatus(menuId, 'ready-for-review');
        showSuccess('Menu marked as ready for review');
        await loadMenus();
    } catch (error) {
        showError('Failed to update menu status');
    }
}

/**
 * Approve menu
 */
async function approveMenu(menuId) {
    try {
        await updateMenuStatus(menuId, 'approved');
        showSuccess('Menu approved');
        await loadMenus();
    } catch (error) {
        showError('Failed to approve menu');
    }
}

/**
 * Send menu back for revision
 */
async function sendBackMenu(menuId) {
    showModal(
        'Send Back for Revision',
        `
            <p>Add notes about what needs to be fixed:</p>
            <label for="review-notes" class="visually-hidden">Review notes</label>
            <textarea id="review-notes" 
                      class="modal-textarea" 
                      rows="4" 
                      aria-required="true"
                      placeholder="Enter your review notes here..."></textarea>
        `,
        async () => {
            const notes = document.getElementById('review-notes').value;
            if (!notes.trim()) {
                showError('Please enter review notes');
                return;
            }
            
            try {
                await updateMenuStatus(menuId, 'draft', notes);
                hideModal();
                showSuccess('Menu sent back with notes');
                await loadMenus();
            } catch (error) {
                showError('Failed to send back menu');
            }
        }
    );
}

/**
 * Push menu to production
 */
async function pushToProduction(menuId) {
    const menu = allMenus[menuId];
    
    showModal(
        'Push to Production',
        `
            <p>Are you sure you want to push <strong>${escapeHtml(menu.restaurantName)}</strong> to production?</p>
            <p class="warning-text">This will make the menu visible on the live website.</p>
        `,
        async () => {
            try {
                await pushMenuToProduction(menuId);
                hideModal();
                showSuccess('Menu pushed to production successfully');
                await loadMenus();
            } catch (error) {
                showError('Failed to push menu to production: ' + error.message);
            }
        }
    );
}

/**
 * Delete menu
 */
async function deleteMenu(menuId) {
    const menu = allMenus[menuId];
    
    showModal(
        'Delete Menu',
        `
            <p>Are you sure you want to delete <strong>${escapeHtml(menu.restaurantName)}</strong>?</p>
            <p class="warning-text">This action cannot be undone.</p>
        `,
        async () => {
            try {
                await deleteMenuFromStaging(menuId);
                hideModal();
                showSuccess('Menu deleted successfully');
                await loadMenus();
            } catch (error) {
                showError('Failed to delete menu');
            }
        }
    );
}

/**
 * Filter menus by status
 */
function filterByStatus(menus, status) {
    const filtered = {};
    Object.keys(menus).forEach(id => {
        if (menus[id].status === status) {
            filtered[id] = menus[id];
        }
    });
    return filtered;
}

/**
 * Filter menus needing update
 */
function filterNeedingUpdate(menus) {
    const filtered = {};
    const now = Date.now();
    
    Object.keys(menus).forEach(id => {
        const menu = menus[id];
        if (menu.status === 'live' && menu.nextUpdateDue && menu.nextUpdateDue <= now) {
            filtered[id] = menu;
        }
    });
    
    return filtered;
}

/**
 * Filter menus by search and city
 */
function filterMenus(menus) {
    let filtered = { ...menus };
    
    // City filter
    if (currentCity) {
        filtered = Object.keys(filtered).reduce((acc, id) => {
            if (filtered[id].city === currentCity) {
                acc[id] = filtered[id];
            }
            return acc;
        }, {});
    }
    
    // Search filter
    if (currentSearch) {
        const search = currentSearch.toLowerCase();
        filtered = Object.keys(filtered).reduce((acc, id) => {
            const menu = filtered[id];
            const searchableText = `${menu.restaurantName} ${menu.city} ${menu.address}`.toLowerCase();
            if (searchableText.includes(search)) {
                acc[id] = menu;
            }
            return acc;
        }, {});
    }
    
    return filtered;
}

/**
 * Update city filter dropdown
 */
function updateCityFilter() {
    const cities = new Set();
    Object.values(allMenus).forEach(menu => {
        if (menu.city) cities.add(menu.city);
    });
    
    const options = Array.from(cities).sort().map(city => 
        `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`
    ).join('');
    
    cityFilter.innerHTML = '<option value="">All Cities</option>' + options;
}

/**
 * Update tab counts
 */
function updateCounts() {
    const counts = {
        all: Object.keys(allMenus).length,
        review: Object.keys(filterByStatus(allMenus, 'ready-for-review')).length,
        update: Object.keys(filterNeedingUpdate(allMenus)).length,
        progress: Object.keys(filterByStatus(allMenus, 'draft')).length,
        live: Object.keys(filterByStatus(allMenus, 'live')).length
    };
    
    document.querySelector('#all-menus-tab .count').textContent = `(${counts.all})`;
    document.querySelector('#needs-review-tab .count').textContent = `(${counts.review})`;
    document.querySelector('#update-due-tab .count').textContent = `(${counts.update})`;
    document.querySelector('#in-progress-tab .count').textContent = `(${counts.progress})`;
    document.querySelector('#live-tab .count').textContent = `(${counts.live})`;
}

/**
 * Check for menus needing updates and update their status
 */
async function checkForUpdatesNeeded() {
    const now = Date.now();
    
    for (const [id, menu] of Object.entries(allMenus)) {
        if (menu.status === 'live' && menu.nextUpdateDue && menu.nextUpdateDue <= now) {
            // Optionally auto-update status to needs-update
            // await updateMenuStatus(id, 'needs-update');
        }
    }
}

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
    const tabs = document.querySelectorAll('[role="tab"]');
    const panels = document.querySelectorAll('[role="tabpanel"]');
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab, panels[index]));
        
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const currentIndex = Array.from(tabs).indexOf(tab);
                let nextIndex;
                
                if (e.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % tabs.length;
                } else {
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                }
                
                tabs[nextIndex].focus();
                activateTab(tabs[nextIndex], panels[nextIndex]);
            }
        });
    });
}

/**
 * Activate tab
 */
function activateTab(tab, panel) {
    // Deactivate all tabs
    document.querySelectorAll('[role="tab"]').forEach(t => {
        t.setAttribute('aria-selected', 'false');
        t.classList.remove('active');
    });
    
    // Hide all panels
    document.querySelectorAll('[role="tabpanel"]').forEach(p => {
        p.hidden = true;
        p.classList.remove('active');
    });
    
    // Activate selected tab and panel
    tab.setAttribute('aria-selected', 'true');
    tab.classList.add('active');
    panel.hidden = false;
    panel.classList.add('active');
    
    announceToScreenReader(`Switched to ${tab.textContent.trim()} tab`);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderAllViews();
    });
    
    // City filter
    cityFilter.addEventListener('change', (e) => {
        currentCity = e.target.value;
        renderAllViews();
        announceToScreenReader(`Filtered by ${currentCity || 'all cities'}`);
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', loadMenus);
    
    // Modal cancel
    modalCancel.addEventListener('click', hideModal);
    
    // Modal close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) {
            hideModal();
        }
    });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    const shortcutsLink = document.getElementById('keyboard-shortcuts-link');
    const shortcutsSection = document.getElementById('keyboard-shortcuts');
    const closeShortcuts = document.getElementById('close-shortcuts');
    
    shortcutsLink.addEventListener('click', (e) => {
        e.preventDefault();
        shortcutsSection.hidden = false;
        closeShortcuts.focus();
    });
    
    closeShortcuts.addEventListener('click', () => {
        shortcutsSection.hidden = true;
        shortcutsLink.focus();
    });
    
    // Ctrl/Cmd + F focuses search
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    loading.hidden = !show;
}

/**
 * Show modal
 */
function showModal(title, body, onConfirm) {
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    modal.hidden = false;
    
    modalConfirm.onclick = onConfirm;
    modalConfirm.focus();
    
    // Trap focus in modal
    trapFocus(modal);
}

/**
 * Hide modal
 */
function hideModal() {
    modal.hidden = true;
    modalConfirm.onclick = null;
}

/**
 * Trap focus within element
 */
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    });
}

/**
 * Announce to screen reader
 */
function announceToScreenReader(message) {
    statusMessage.textContent = message;
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 1000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    announceToScreenReader(message);
    // Could also show visual toast notification
}

/**
 * Show error message
 */
function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 5000);
}

/**
 * Utility functions
 */
function getStatusClass(status) {
    const classes = {
        'draft': 'badge-draft',
        'ready-for-review': 'badge-review',
        'approved': 'badge-approved',
        'live': 'badge-success',
        'needs-update': 'badge-warning'
    };
    return classes[status] || 'badge-draft';
}

function getStatusLabel(status) {
    const labels = {
        'draft': 'Draft',
        'ready-for-review': 'Ready for Review',
        'approved': 'Approved',
        'live': 'Live',
        'needs-update': 'Needs Update'
    };
    return labels[status] || 'Unknown';
}

function getDaysUntil(timestamp) {
    const now = Date.now();
    const diff = timestamp - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
