/**
 * Container Width Lock for Text Scaling
 * Prevents container from changing width when text size is adjusted
 */

(function() {
  'use strict';
  
  // Configuration
  const CONTAINER_SELECTORS = [
    '.elementor-section-boxed > .elementor-container',
    '.main-container',
    '.site-main',
    '.content-area'
  ];
  
  const BASE_MAX_WIDTH = 1200; // Your design width in pixels
  
  // Store original widths
  let originalWidths = new Map();
  let isInitialized = false;
  
  /**
   * Initialize container width locking
   */
  function initContainerLock() {
    if (isInitialized) return;
    
    // Find all containers and store their widths at 100% scale
    CONTAINER_SELECTORS.forEach(selector => {
      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        // Get computed width at base scale
        const computedStyle = window.getComputedStyle(container);
        const currentWidth = container.offsetWidth;
        const maxWidth = computedStyle.maxWidth;
        
        // Store original max-width
        originalWidths.set(container, {
          maxWidth: maxWidth !== 'none' ? maxWidth : `${BASE_MAX_WIDTH}px`,
          width: currentWidth
        });
        
        // Apply fixed max-width
        container.style.maxWidth = `${BASE_MAX_WIDTH}px`;
        container.style.width = '100%';
        container.style.marginLeft = 'auto';
        container.style.marginRight = 'auto';
      });
    });
    
    isInitialized = true;
    console.log('Container width lock initialized');
  }
  
  /**
   * Lock container widths when text scaling changes
   */
  function lockContainerWidths() {
    CONTAINER_SELECTORS.forEach(selector => {
      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        const original = originalWidths.get(container);
        if (original) {
          container.style.maxWidth = original.maxWidth;
          container.style.width = '100%';
          container.style.marginLeft = 'auto';
          container.style.marginRight = 'auto';
          container.style.boxSizing = 'border-box';
        }
      });
    });
  }
  
  /**
   * Observer for text scaling changes
   */
  function observeTextScaling() {
    // Watch for changes to the HTML element's font-size or custom property
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          lockContainerWidths();
        }
      });
    });
    
    // Observe the HTML element for style changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // Also observe body
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  /**
   * Watch for clicks on text size buttons
   */
  function watchTextSizeButtons() {
    // Find your text size control buttons
    const textSizeButtons = document.querySelectorAll('[class*="text-size"], [class*="font-size"], .a-plus, .a-minus, [data-action*="text"]');
    
    textSizeButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Wait for text size change to apply, then lock widths
        setTimeout(() => {
          lockContainerWidths();
        }, 50);
      });
    });
  }
  
  /**
   * Force container width maintenance
   */
  function enforceContainerWidth() {
    // Apply to main page wrapper
    const pageWrapper = document.querySelector('.site-content, #content, main');
    if (pageWrapper) {
      pageWrapper.style.width = '100%';
      pageWrapper.style.overflowX = 'hidden';
    }
    
    // Lock all containers
    lockContainerWidths();
  }
  
  /**
   * Initialize on DOM ready
   */
  function init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    // Initialize after a short delay to ensure Elementor is loaded
    setTimeout(() => {
      initContainerLock();
      observeTextScaling();
      watchTextSizeButtons();
      enforceContainerWidth();
      
      // Re-enforce on window resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          enforceContainerWidth();
        }, 250);
      });
      
      // Re-check periodically (backup)
      setInterval(() => {
        if (document.documentElement.style.fontSize || 
            document.body.style.fontSize) {
          lockContainerWidths();
        }
      }, 1000);
    }, 500);
  }
  
  // Start initialization
  init();
  
})();
