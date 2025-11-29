// ga-production.js
// Handles GA tracking (production only) and noindex (staging only)
// Add to all HTML files: <script src="js/ga-production.js"></script>

(function() {
  var isProduction = (window.location.hostname === 'menus4all.com' || 
                      window.location.hostname === 'www.menus4all.com');
  
  if (isProduction) {
    // Load Google Analytics on production only
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-VRLNP0ZCEC';
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-VRLNP0ZCEC');
    
  } else {
    // Add noindex meta tag on staging/dev to prevent search indexing
    var meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
  }
})();
