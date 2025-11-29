/**
 * Menus4ALL - Global Header/Footer Loader and Navigation Handler
 * This file loads the header and footer components and initializes the accessible mobile navigation
 */

// ============================================
// LOAD HEADER AND FOOTER COMPONENTS
// ============================================

function loadComponent(elementId, filePath) {
    return fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = html;
            } else {
                console.error(`Element with id '${elementId}' not found`);
            }
        })
        .catch(error => {
            console.error('Error loading component:', error);
        });
}

// Load header and footer when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Load header and footer
    Promise.all([
        loadComponent('header-placeholder', '/header.html'),
        loadComponent('footer-placeholder', '/footer.html')
    ]).then(() => {
        // Initialize navigation after header is loaded
        initializeNavigation();
        
        // Initialize text resizing if functions exist
        if (typeof restoreTextSize === 'function') {
            restoreTextSize();
        }
    });
});

// ============================================
// ACCESSIBLE MOBILE NAVIGATION SYSTEM
// ============================================

function initializeNavigation() {
    console.log('Initializing navigation...');
    
    const menuToggle = document.getElementById('menuToggle');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const mobileNavContainer = document.getElementById('mobileNavContainer');
    const mobileNav = document.getElementById('mobileNav');
    const sentinelStart = document.querySelector('.focus-sentinel-start');
    const sentinelEnd = document.querySelector('.focus-sentinel-end');
    
    console.log('Navigation elements found:', {
        menuToggle: !!menuToggle,
        closeMenuBtn: !!closeMenuBtn,
        mobileNavContainer: !!mobileNavContainer,
        mobileNav: !!mobileNav
    });
    
    if (!menuToggle || !closeMenuBtn || !mobileNavContainer || !mobileNav) {
        console.error('Navigation elements not found. Make sure header.html loaded correctly.');
        return;
    }
    
    // Focusable elements for focus trap
    let focusableElements = [];
    let firstFocusable = null;
    let lastFocusable = null;
    
    // Store the element that opened the menu
    let menuTrigger = null;
    
    function updateFocusableElements() {
        // Get all focusable elements EXCEPT the sentinels
        focusableElements = Array.from(
            mobileNav.querySelectorAll(
                'button:not(.focus-sentinel-start):not(.focus-sentinel-end), a, input, select, textarea, [tabindex]:not([tabindex="-1"]):not(.focus-sentinel-start):not(.focus-sentinel-end)'
            )
        ).filter(el => !el.disabled && !el.classList.contains('focus-sentinel-start') && !el.classList.contains('focus-sentinel-end'));
        
        firstFocusable = focusableElements[0];
        lastFocusable = focusableElements[focusableElements.length - 1];
    }
    
    // Handle focus on start sentinel - redirect to last focusable element
    if (sentinelStart) {
        sentinelStart.addEventListener('focus', function() {
            if (mobileNavContainer.getAttribute('data-visible') === 'true' && lastFocusable) {
                lastFocusable.focus();
            }
        });
    }
    
    // Handle focus on end sentinel - redirect to first focusable element
    if (sentinelEnd) {
        sentinelEnd.addEventListener('focus', function() {
            if (mobileNavContainer.getAttribute('data-visible') === 'true' && firstFocusable) {
                firstFocusable.focus();
            }
        });
    }
    
    function openMenu() {
        console.log('Opening menu...');
        // Store trigger for return focus
        menuTrigger = document.activeElement;
        
        // Update state
        menuToggle.setAttribute('aria-expanded', 'true');
        mobileNavContainer.setAttribute('data-visible', 'true');
        mobileNavContainer.setAttribute('aria-hidden', 'false');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Hide all content outside menu from screen readers
        const mainContent = document.getElementById('main-content');
        const heroSection = document.querySelector('.hero-banner');
        const ctaButtons = document.querySelector('.cta-buttons');
        const footer = document.querySelector('.site-footer');
        const header = document.querySelector('.site-header');
        
        // Store original aria-hidden states
        if (mainContent) {
            mainContent.setAttribute('data-original-hidden', mainContent.getAttribute('aria-hidden') || 'false');
            mainContent.setAttribute('aria-hidden', 'true');
            mainContent.setAttribute('inert', '');
        }
        if (heroSection) {
            heroSection.setAttribute('data-original-hidden', heroSection.getAttribute('aria-hidden') || 'false');
            heroSection.setAttribute('aria-hidden', 'true');
            heroSection.setAttribute('inert', '');
        }
        if (ctaButtons) {
            ctaButtons.setAttribute('data-original-hidden', ctaButtons.getAttribute('aria-hidden') || 'false');
            ctaButtons.setAttribute('aria-hidden', 'true');
            ctaButtons.setAttribute('inert', '');
        }
        if (footer) {
            footer.setAttribute('data-original-hidden', footer.getAttribute('aria-hidden') || 'false');
            footer.setAttribute('aria-hidden', 'true');
            footer.setAttribute('inert', '');
        }
        if (header) {
            header.setAttribute('data-original-hidden', header.getAttribute('aria-hidden') || 'false');
            header.setAttribute('aria-hidden', 'true');
            header.setAttribute('inert', '');
        }
        
        // Update focusable elements
        updateFocusableElements();
        
        // Move focus to FIRST focusable element (close X button)
        setTimeout(() => {
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
        
        // Announce to screen readers
        announceToScreenReader('Navigation menu opened. Swipe to navigate menu items. Double-tap close button or press Escape to close.');
    }
    
    function closeMenu() {
        console.log('Closing menu...');
        // Update state
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileNavContainer.setAttribute('data-visible', 'false');
        mobileNavContainer.setAttribute('aria-hidden', 'true');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Restore aria-hidden on background content
        const mainContent = document.getElementById('main-content');
        const heroSection = document.querySelector('.hero-banner');
        const ctaButtons = document.querySelector('.cta-buttons');
        const footer = document.querySelector('.site-footer');
        const header = document.querySelector('.site-header');
        
        if (mainContent) {
            const originalHidden = mainContent.getAttribute('data-original-hidden');
            if (originalHidden === 'false') {
                mainContent.removeAttribute('aria-hidden');
            } else {
                mainContent.setAttribute('aria-hidden', originalHidden);
            }
            mainContent.removeAttribute('data-original-hidden');
            mainContent.removeAttribute('inert');
        }
        if (heroSection) {
            const originalHidden = heroSection.getAttribute('data-original-hidden');
            if (originalHidden === 'false') {
                heroSection.removeAttribute('aria-hidden');
            } else {
                heroSection.setAttribute('aria-hidden', originalHidden);
            }
            heroSection.removeAttribute('data-original-hidden');
            heroSection.removeAttribute('inert');
        }
        if (ctaButtons) {
            const originalHidden = ctaButtons.getAttribute('data-original-hidden');
            if (originalHidden === 'false') {
                ctaButtons.removeAttribute('aria-hidden');
            } else {
                ctaButtons.setAttribute('aria-hidden', originalHidden);
            }
            ctaButtons.removeAttribute('data-original-hidden');
            ctaButtons.removeAttribute('inert');
        }
        if (footer) {
            const originalHidden = footer.getAttribute('data-original-hidden');
            if (originalHidden === 'false') {
                footer.removeAttribute('aria-hidden');
            } else {
                footer.setAttribute('aria-hidden', originalHidden);
            }
            footer.removeAttribute('data-original-hidden');
            footer.removeAttribute('inert');
        }
        if (header) {
            const originalHidden = header.getAttribute('data-original-hidden');
            if (originalHidden === 'false') {
                header.removeAttribute('aria-hidden');
            } else {
                header.setAttribute('aria-hidden', originalHidden);
            }
            header.removeAttribute('data-original-hidden');
            header.removeAttribute('inert');
        }
        
        // Return focus to trigger
        if (menuTrigger) {
            menuTrigger.focus();
            menuTrigger = null;
        }
        
        // Announce to screen readers
        announceToScreenReader('Navigation menu closed');
    }
    
    // Open menu - handle both click and touch
    if (menuToggle) {
        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Menu button clicked!');
            openMenu();
        });
        
        menuToggle.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Menu button touched!');
            openMenu();
        });
        
        // Also make function globally available as backup
        window.openMobileMenu = openMenu;
        console.log('Menu toggle button ready for clicks and touches');
    }
    
    // Close menu button
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', closeMenu);
        closeMenuBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            closeMenu();
        });
    }
    
    // Close menu when clicking overlay (not the menu content itself)
    mobileNavContainer.addEventListener('click', function(e) {
        if (e.target === mobileNavContainer) {
            closeMenu();
        }
    });
    
    // Close menu with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileNavContainer && mobileNavContainer.getAttribute('data-visible') === 'true') {
            closeMenu();
        }
    });
    
    // Monitor focus to ensure it stays within menu when open (for VoiceOver)
    document.addEventListener('focusin', function(e) {
        // Only monitor when menu is open
        if (!mobileNavContainer || mobileNavContainer.getAttribute('data-visible') !== 'true') {
            return;
        }
        
        // Check if focus is outside the mobile nav
        if (!mobileNav.contains(e.target) && e.target !== menuToggle) {
            // Focus escaped - bring it back to first element
            e.preventDefault();
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    });
    
    // Focus trap inside mobile menu
    mobileNav.addEventListener('keydown', function(e) {
        if (e.key !== 'Tab') return;
        
        // Update focusable elements in case DOM changed
        updateFocusableElements();
        
        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    });
    
    // Close menu when a navigation link is clicked
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
    
    console.log('Navigation initialized successfully!');
}

// Screen reader announcements
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}

// ============================================
// TEXT RESIZING FUNCTIONS
// ============================================

const TEXT_SIZES = [100, 125, 150, 200];
let currentSizeIndex = 0;

function increaseTextSize() {
    if (currentSizeIndex < TEXT_SIZES.length - 1) {
        currentSizeIndex++;
        applyTextSize(TEXT_SIZES[currentSizeIndex]);
    }
}

function decreaseTextSize() {
    if (currentSizeIndex > 0) {
        currentSizeIndex--;
        applyTextSize(TEXT_SIZES[currentSizeIndex]);
    }
}

function resetTextSize() {
    currentSizeIndex = 0;
    applyTextSize(TEXT_SIZES[currentSizeIndex]);
}

function applyTextSize(percentage) {
    // Remove all existing text size classes
    TEXT_SIZES.forEach(size => {
        document.body.classList.remove(`text-size-${size}`);
    });
    
    // Add new class if not 100%
    if (percentage !== 100) {
        document.body.classList.add(`text-size-${percentage}`);
    }
    
    // Update display
    const currentSizeDisplay = document.getElementById('currentSize');
    if (currentSizeDisplay) {
        currentSizeDisplay.textContent = percentage + '%';
    }
    
    // Save preference
    localStorage.setItem('textSizePercentage', percentage);
}

function setTextSize(percentage) {
    currentSizeIndex = TEXT_SIZES.indexOf(percentage);
    if (currentSizeIndex === -1) currentSizeIndex = 0;
    applyTextSize(percentage);
}

// Restore saved text size on load
function restoreTextSize() {
    const textSizePercentage = localStorage.getItem('textSizePercentage');
    if (textSizePercentage) {
        setTextSize(parseInt(textSizePercentage));
    }
}

// ============================================
// FOOTER FORM HANDLER
// ============================================

function submitMenuSuggestion(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    console.log('Form submitted:', Object.fromEntries(formData));
    
    alert('Thank you for suggesting a new accessible menu! We will review your submission.');
    form.reset();
}

// Make functions globally available
window.increaseTextSize = increaseTextSize;
window.decreaseTextSize = decreaseTextSize;
window.resetTextSize = resetTextSize;
window.submitMenuSuggestion = submitMenuSuggestion;
