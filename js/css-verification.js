/**
 * CSS Verification Script for task.html
 * Verifies that external CSS files are properly loaded
 */

// Function to check if CSS file is loaded
function checkCSSLoaded(filename) {
    const stylesheets = Array.from(document.styleSheets);
    return stylesheets.some(sheet => {
        try {
            return sheet.href && sheet.href.includes(filename);
        } catch (e) {
            return false;
        }
    });
}

// Function to check if specific CSS rules exist
function checkCSSRule(selector, property) {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return false;
    
    const computedStyle = window.getComputedStyle(elements[0]);
    return computedStyle.getPropertyValue(property) !== '';
}

// Verification function for task page CSS
function verifyTaskCSS() {
    const results = {
        cssFiles: {},
        cssRules: {},
        overall: true
    };
    
    console.log('🔍 Verifying Task Page CSS...');
    
    // Check CSS files are loaded
    const cssFiles = ['task.css', 'task-account-styles.css', 'drive-unified-styles.css'];
    cssFiles.forEach(file => {
        const loaded = checkCSSLoaded(file);
        results.cssFiles[file] = loaded;
        if (!loaded) {
            console.error(`❌ CSS file not loaded: ${file}`);
            results.overall = false;
        } else {
            console.log(`✅ CSS file loaded: ${file}`);
        }
    });
    
    // Check specific CSS rules from task.css
    const cssRules = [
        { selector: '#debug-section', property: 'border', description: 'Debug section styling' },
        { selector: '.purchase-popup-overlay', property: 'position', description: 'Purchase popup positioning' },
        { selector: '.debug-info', property: 'color', description: 'Debug info color' },
        { selector: '.purchase-success-icon', property: 'margin-bottom', description: 'Purchase success icon spacing' }
    ];
    
    cssRules.forEach(rule => {
        // Create temporary element to test
        const tempElement = document.createElement('div');
        tempElement.className = rule.selector.replace(/^[#.]/, '');
        if (rule.selector.startsWith('#')) {
            tempElement.id = rule.selector.replace('#', '');
        }
        tempElement.style.display = 'none';
        document.body.appendChild(tempElement);
        
        const hasRule = checkCSSRule(rule.selector, rule.property);
        results.cssRules[rule.selector] = hasRule;
        
        if (!hasRule) {
            console.warn(`⚠️ CSS rule missing or not applied: ${rule.selector} (${rule.description})`);
        } else {
            console.log(`✅ CSS rule found: ${rule.selector} (${rule.description})`);
        }
        
        // Clean up
        document.body.removeChild(tempElement);
    });
    
    // Overall result
    if (results.overall) {
        console.log('🎉 All critical CSS files loaded successfully!');
    } else {
        console.error('❌ Some CSS files failed to load. Check network and file paths.');
    }
    
    return results;
}

// Auto-run verification when DOM is loaded (if in development mode)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for all CSS to load
        setTimeout(() => {
            console.log('🔧 Development mode detected - running CSS verification...');
            window.taskCSSVerification = verifyTaskCSS();
        }, 1000);
    });
}

// Make verification function globally available
window.verifyTaskCSS = verifyTaskCSS;
