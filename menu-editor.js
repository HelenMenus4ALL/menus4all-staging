/**
 * Menu Editor JavaScript
 * Handles form validation, auto-save, and menu creation/editing
 */

// State
let currentMenuId = null;
let autoSaveTimer = null;
let hasUnsavedChanges = false;
let isLoading = false;

// DOM elements
const form = document.getElementById('menu-form');
const saveStatusText = document.getElementById('save-status-text');
const saveBtn = document.getElementById('save-btn');
const saveDraftBtn = document.getElementById('save-draft-btn');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check if editing existing menu
    const urlParams = new URLSearchParams(window.location.search);
    currentMenuId = urlParams.get('id');
    
    if (currentMenuId) {
        await loadMenu(currentMenuId);
    }
    
    setupFormListeners();
    setupFilePreview();
    setupValidation();
});

/**
 * Load existing menu
 */
async function loadMenu(menuId) {
    try {
        isLoading = true;
        updateSaveStatus('Loading menu...');
        
        const menu = await getMenuById(menuId);
        
        if (!menu) {
            alert('Menu not found');
            window.location.href = 'index.html';
            return;
        }
        
        populateForm(menu);
        updateSaveStatus('Loaded');
        isLoading = false;
    } catch (error) {
        console.error('Error loading menu:', error);
        alert('Failed to load menu');
        window.location.href = 'index.html';
    }
}

/**
 * Populate form with menu data
 */
function populateForm(menu) {
    document.getElementById('menu-id').value = menu.id || '';
    document.getElementById('restaurant-name').value = menu.restaurantName || '';
    document.getElementById('address').value = menu.address || '';
    document.getElementById('city').value = menu.city || '';
    document.getElementById('state').value = menu.state || '';
    document.getElementById('latitude').value = menu.latitude || '';
    document.getElementById('longitude').value = menu.longitude || '';
    document.getElementById('phone').value = menu.phoneNumber || '';
    document.getElementById('hours').value = menu.hours || '';
    
    // Average meal price
    if (menu.averageMealPrice) {
        const priceRadio = document.querySelector(`input[name="averageMealPrice"][value="${menu.averageMealPrice}"]`);
        if (priceRadio) priceRadio.checked = true;
    }
    
    document.getElementById('hero-image-path').value = menu.heroImagePath || '';
    document.getElementById('hero-image-caption').value = menu.heroImageCaption || '';
    document.getElementById('website-urls').value = menu.websiteURLs || '';
    
    // Menu type
    if (menu.menuType) {
        const typeRadio = document.querySelector(`input[name="menuType"][value="${menu.menuType}"]`);
        if (typeRadio) typeRadio.checked = true;
    }
    
    // General menu notes
    if (menu.generalMenuNotes && Array.isArray(menu.generalMenuNotes)) {
        menu.generalMenuNotes.forEach(note => {
            const checkbox = document.querySelector(`input[name="generalMenuNotes"][value="${note}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    document.getElementById('menu-notes-additional').value = menu.menuNotesAdditional || '';
    document.getElementById('disclaimer').value = menu.disclaimer || '';
    
    // Cuisine types
    if (menu.cuisineTypes && Array.isArray(menu.cuisineTypes)) {
        menu.cuisineTypes.forEach(type => {
            const checkbox = document.querySelector(`input[name="cuisineTypes"][value="${type}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    document.getElementById('cuisine-other').value = menu.cuisineOther || '';
    
    // Dietary options
    if (menu.dietaryOptions && Array.isArray(menu.dietaryOptions)) {
        menu.dietaryOptions.forEach(option => {
            const checkbox = document.querySelector(`input[name="dietaryOptions"][value="${option}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    document.getElementById('technical-notes').value = menu.technicalNotes || '';
    document.getElementById('section-details').value = menu.sectionDetails || '';
    
    // Status
    if (menu.status) {
        const statusRadio = document.querySelector(`input[name="status"][value="${menu.status}"]`);
        if (statusRadio) statusRadio.checked = true;
    }
    
    document.getElementById('assigned-to').value = menu.assignedTo || '';
    document.getElementById('requested-by').value = menu.requestedBy || '';
}

/**
 * Setup form listeners for auto-save
 */
function setupFormListeners() {
    // Auto-save on input change
    form.addEventListener('input', () => {
        if (!isLoading) {
            hasUnsavedChanges = true;
            scheduleAutoSave();
        }
    });
    
    // Save button
    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await saveMenu(false);
    });
    
    // Save draft button
    saveDraftBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        document.getElementById('status-draft').checked = true;
        await saveMenu(true);
    });
    
    // Warn on unload if unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

/**
 * Schedule auto-save
 */
function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    updateSaveStatus('Unsaved changes...');
    
    autoSaveTimer = setTimeout(async () => {
        await autoSave();
    }, 3000); // Auto-save after 3 seconds of no typing
}

/**
 * Auto-save menu
 */
async function autoSave() {
    if (!hasUnsavedChanges) return;
    
    try {
        updateSaveStatus('Saving...');
        
        const formData = getFormData();
        
        // Create ID if new menu
        if (!currentMenuId) {
            currentMenuId = generateMenuId();
            document.getElementById('menu-id').value = currentMenuId;
        }
        
        await saveMenuToStaging(currentMenuId, formData);
        
        hasUnsavedChanges = false;
        const now = new Date().toLocaleTimeString();
        updateSaveStatus(`Saved at ${now}`);
    } catch (error) {
        console.error('Auto-save error:', error);
        updateSaveStatus('Save failed');
    }
}

/**
 * Save menu
 */
async function saveMenu(isDraft) {
    if (!validateForm()) {
        alert('Please fix the errors in the form before saving.');
        return;
    }
    
    try {
        updateSaveStatus('Saving...');
        saveBtn.disabled = true;
        saveDraftBtn.disabled = true;
        
        const formData = getFormData();
        
        // Handle file uploads
        if (document.getElementById('hero-image').files[0]) {
            const heroImageURL = await uploadHeroImage(
                document.getElementById('hero-image').files[0],
                currentMenuId || generateMenuId()
            );
            formData.heroImageURL = heroImageURL;
        }
        
        // Create ID if new menu
        if (!currentMenuId) {
            currentMenuId = generateMenuId();
            formData.id = currentMenuId;
        }
        
        await saveMenuToStaging(currentMenuId, formData);
        
        hasUnsavedChanges = false;
        updateSaveStatus('Saved successfully');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Save error:', error);
        updateSaveStatus('Save failed');
        alert('Failed to save menu: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveDraftBtn.disabled = false;
    }
}

/**
 * Get form data
 */
function getFormData() {
    const formData = {
        restaurantName: document.getElementById('restaurant-name').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        latitude: document.getElementById('latitude').value.trim(),
        longitude: document.getElementById('longitude').value.trim(),
        phoneNumber: document.getElementById('phone').value.trim(),
        hours: document.getElementById('hours').value.trim(),
        averageMealPrice: document.querySelector('input[name="averageMealPrice"]:checked')?.value || '',
        heroImagePath: document.getElementById('hero-image-path').value.trim(),
        heroImageCaption: document.getElementById('hero-image-caption').value.trim(),
        websiteURLs: document.getElementById('website-urls').value.trim(),
        menuType: document.querySelector('input[name="menuType"]:checked')?.value || '',
        generalMenuNotes: Array.from(document.querySelectorAll('input[name="generalMenuNotes"]:checked'))
            .map(el => el.value),
        menuNotesAdditional: document.getElementById('menu-notes-additional').value.trim(),
        disclaimer: document.getElementById('disclaimer').value.trim(),
        cuisineTypes: Array.from(document.querySelectorAll('input[name="cuisineTypes"]:checked'))
            .map(el => el.value),
        cuisineOther: document.getElementById('cuisine-other').value.trim(),
        dietaryOptions: Array.from(document.querySelectorAll('input[name="dietaryOptions"]:checked'))
            .map(el => el.value),
        technicalNotes: document.getElementById('technical-notes').value.trim(),
        sectionDetails: document.getElementById('section-details').value.trim(),
        status: document.querySelector('input[name="status"]:checked')?.value || 'draft',
        assignedTo: document.getElementById('assigned-to').value.trim(),
        requestedBy: document.getElementById('requested-by').value.trim()
    };
    
    return formData;
}

/**
 * Validate form
 */
function validateForm() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
    
    // Required fields
    const requiredFields = [
        { id: 'restaurant-name', name: 'Restaurant name' },
        { id: 'address', name: 'Address' },
        { id: 'city', name: 'City' },
        { id: 'state', name: 'State' },
        { id: 'latitude', name: 'Latitude' },
        { id: 'longitude', name: 'Longitude' },
        { id: 'website-urls', name: 'Website URLs' },
        { id: 'requested-by', name: 'Requested by' }
    ];
    
    requiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (!input.value.trim()) {
            showError(input, `${field.name} is required`);
            isValid = false;
        }
    });
    
    // Average meal price required
    if (!document.querySelector('input[name="averageMealPrice"]:checked')) {
        const fieldset = document.querySelector('fieldset:has(input[name="averageMealPrice"])');
        showError(fieldset.querySelector('.error-message'), 'Please select average meal price');
        isValid = false;
    }
    
    // Menu type required
    if (!document.querySelector('input[name="menuType"]:checked')) {
        const fieldset = document.querySelector('fieldset:has(input[name="menuType"])');
        showError(fieldset.querySelector('.error-message'), 'Please select menu type');
        isValid = false;
    }
    
    // Latitude/Longitude format
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    
    if (latInput.value && !isValidLatitude(latInput.value)) {
        showError(latInput, 'Invalid latitude format');
        isValid = false;
    }
    
    if (lonInput.value && !isValidLongitude(lonInput.value)) {
        showError(lonInput, 'Invalid longitude format');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Show error message
 */
function showError(element, message) {
    let errorElement;
    
    if (element.classList && element.classList.contains('error-message')) {
        errorElement = element;
    } else {
        errorElement = element.parentElement.querySelector('.error-message');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
        element.setAttribute('aria-invalid', 'true');
    }
}

/**
 * Validation helpers
 */
function isValidLatitude(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= -90 && num <= 90;
}

function isValidLongitude(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= -180 && num <= 180;
}

/**
 * Setup file preview
 */
function setupFilePreview() {
    const heroImage = document.getElementById('hero-image');
    const heroPreview = document.getElementById('hero-image-preview');
    
    heroImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                heroPreview.innerHTML = `<img src="${e.target.result}" alt="Hero image preview" style="max-width: 300px;">`;
                heroPreview.hidden = false;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // CSV preview
    const csvUpload = document.getElementById('csv-upload');
    const csvPreview = document.getElementById('csv-preview');
    
    csvUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            csvPreview.innerHTML = `<p>✓ ${file.name} (${(file.size / 1024).toFixed(2)} KB)</p>`;
            csvPreview.hidden = false;
        }
    });
    
    // JSON preview
    const jsonUpload = document.getElementById('json-upload');
    const jsonPreview = document.getElementById('json-preview');
    
    jsonUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            jsonPreview.innerHTML = `<p>✓ ${file.name} (${(file.size / 1024).toFixed(2)} KB)</p>`;
            jsonPreview.hidden = false;
        }
    });
}

/**
 * Setup validation
 */
function setupValidation() {
    // Real-time validation for lat/long
    document.getElementById('latitude').addEventListener('blur', function() {
        if (this.value && !isValidLatitude(this.value)) {
            showError(this, 'Latitude must be between -90 and 90');
        }
    });
    
    document.getElementById('longitude').addEventListener('blur', function() {
        if (this.value && !isValidLongitude(this.value)) {
            showError(this, 'Longitude must be between -180 and 180');
        }
    });
}

/**
 * Update save status
 */
function updateSaveStatus(message) {
    saveStatusText.textContent = message;
}
