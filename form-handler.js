// ============================================
// MENU SUGGESTION FORM HANDLER
// For static HTML site - uses Web3Forms API
// ============================================

function submitMenuSuggestion(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('.btn-submit');
    const originalButtonText = submitButton.textContent;
    
    // Disable submit button and show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    // Get form data
    const formData = new FormData(form);
    
    // Add Web3Forms access key (you'll need to get this from https://web3forms.com)
    // It's free and provides unlimited submissions
    formData.append('access_key', '1cbd93b6-31ed-406e-93d5-b8d8cc6aaa48');
    
    // Add subject line for the email
    formData.append('subject', 'New Menu Suggestion for Menus4ALL');
    
    // Add redirect URL (optional)
    formData.append('redirect', 'false');
    
    // Send to Web3Forms API
    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Show success message
            showFormMessage(form, 'Thank you! Your menu suggestion has been sent successfully. We will review it soon!', 'success');
            form.reset();
            
            // Announce to screen readers
            announceToScreenReader('Menu suggestion submitted successfully');
        } else {
            throw new Error(result.message || 'Submission failed');
        }
    })
    .catch(error => {
        console.error('Form submission error:', error);
        showFormMessage(form, 'Sorry, there was an error sending your suggestion. Please try again or email helen@menus4all.com directly.', 'error');
        
        // Announce error to screen readers
        announceToScreenReader('Form submission failed. Please try again.');
    })
    .finally(() => {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    });
}

function showFormMessage(form, message, type) {
    // Remove any existing messages
    const existingMessage = form.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message form-message-${type}`;
    messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');
    messageDiv.setAttribute('aria-live', 'polite');
    messageDiv.textContent = message;
    
    // Style the message
    messageDiv.style.cssText = `
        padding: 15px;
        margin: 15px 0;
        border-radius: 4px;
        font-weight: 600;
        ${type === 'success' ? 
            'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
            'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'}
    `;
    
    // Insert message after form
    form.parentNode.insertBefore(messageDiv, form.nextSibling);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function announceToScreenReader(message) {
    // Create or get live region for announcements
    let liveRegion = document.getElementById('sr-announcements');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-announcements';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
        liveRegion.textContent = '';
    }, 1