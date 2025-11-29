/**
 * Mobile Menu Navigation System
 * Handles opening/closing mobile navigation overlay with focus management
 * Now waits for header to load before initializing
 */

// Store the element that triggered the menu to return focus on close
let menuTriggerElement = null;
let isInitialized = false;

/**
 * Opens the mobile navigation menu
 */
window.openMobileMenu = function() {
    console.log('openMobileMenu called');
    const container = document.getElementById('mobileNavContainer');
    const nav = document.getElementById('mobileNav');
    const menuToggle = document.getElementById('menuToggle');
    const closeBtn = document.getElementById('closeMenuBtn');
    
    if (!container || !nav) {
        console.error('Mobile menu elements not found', {
            container: !!container,
            nav: !!nav
        });
        return;
    }
    
    console.log('Opening mobile menu');
    
    // Store the trigger element for focus return
    menuTriggerElement = document.activeElement;
    
    // Show the menu
    container.setAttribute('data-visible', 'true');
    container.setAttribute('aria-hidden', 'false');
    
    // Update hamburger button
    if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', 'Close navigation menu');
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Focus the close button after a brief delay to ensure menu is visible
    setTimeout(() => {
        if (closeBtn) {
            closeBtn.focus();
        }
    }, 100);
};

/**
 * Closes the mobile navigation menu
 */
window.closeMobileMenu = function() {
    console.log('closeMobileMenu called');
    const container = document.getElementById('mobileNavContainer');
    const menuToggle = document.getElementById('menuToggle');
    
    if (!container) {
        console.error('Mobile menu container not found');
        return;
    }
    
    // Hide the menu
    container.setAttribute('data-visible', 'false');
    container.setAttribute('aria-hidden', 'true');
    
    // Update hamburger button
    if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation menu');
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Return focus to the element that opened the menu
    if (menuTriggerElement && menuTriggerElement.focus) {
        menuTriggerElement.focus();
        menuTriggerElement = null;
    }
};

/**
 * Initialize mobile menu when DOM is ready
 */
function initializeMobileMenu() {
    if (isInitialized) {
        console.log('Mobile menu already initialized, skipping');
        return true;
    }
    
    console.log('Attempting to initialize mobile menu...');
    
    const closeBtn = document.getElementById('closeMenuBtn');
    const container = document.getElementById('mobileNavContainer');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
    
    // Check if elements exist
    if (!closeBtn || !container) {
        console.log('Mobile menu elements not yet available, will retry...', {
            closeBtn: !!closeBtn,
            container: !!container
        });
        return false;
    }
    
    console.log('Mobile menu elements found, initializing...');
    
    // Close button click handler
    closeBtn.addEventListener('click', window.closeMobileMenu);
    console.log('Close button listener added');
    
    // Close menu when clicking outside the nav content
    container.addEventListener('click', function(e) {
        if (e.target === container) {
            window.closeMobileMenu();
        }
    });
    
    // Close menu when any navigation link is clicked
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            window.closeMobileMenu();
        });
    });
    
    // Handle Escape key to close menu
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && container.getAttribute('data-visible') === 'true') {
            window.closeMobileMenu();
        }
    });
    
    // Focus trap: Handle focus sentinels
    const sentinelStart = document.querySelector('.focus-sentinel-start');
    const sentinelEnd = document.querySelector('.focus-sentinel-end');
    
    if (sentinelStart && sentinelEnd) {
        // When focus reaches the start sentinel (user swiped backward from first element)
        sentinelStart.addEventListener('focus', function() {
            const container = document.getElementById('mobileNavContainer');
            if (container && container.getAttribute('data-visible') === 'true') {
                // Move focus to close button (last interactive element)
                const closeBtn = document.querySelector('.close-menu-btn-alt');
                if (closeBtn) {
                    closeBtn.focus();
                }
            }
        });
        
        // When focus reaches the end sentinel (user swiped forward from last element)
        sentinelEnd.addEventListener('focus', function() {
            const container = document.getElementById('mobileNavContainer');
            if (container && container.getAttribute('data-visible') === 'true') {
                // Move focus back to close button at top
                const closeBtn = document.getElementById('closeMenuBtn');
                if (closeBtn) {
                    closeBtn.focus();
                }
            }
        });
    }
    
    isInitialized = true;
    console.log('✅ Mobile menu successfully initialized!');
    return true;
}

/**
 * Wait for header to load, then initialize
 */
function waitForHeader() {
    console.log('Waiting for header to load...');
    
    // Try to initialize immediately
    if (initializeMobileMenu()) {
        return;
    }
    
    // If that didn't work, watch for the header to appear
    const observer = new MutationObserver(function(mutations) {
        console.log('DOM changed, checking for header elements...');
        if (initializeMobileMenu()) {
            observer.disconnect();
            console.log('Header loaded, observer disconnected');
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also set a timeout as a backup
    let attempts = 0;
    const maxAttempts = 20;
    const retryInterval = setInterval(function() {
        attempts++;
        console.log(`Retry attempt ${attempts}/${maxAttempts}`);
        
        if (initializeMobileMenu()) {
            clearInterval(retryInterval);
            observer.disconnect();
        } else if (attempts >= maxAttempts) {
            console.error('Failed to initialize mobile menu after maximum attempts');
            clearInterval(retryInterval);
            observer.disconnect();
        }
    }, 250);
}

// Start waiting for header
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForHeader);
} else {
    // DOM is already ready
    waitForHeader();
}
