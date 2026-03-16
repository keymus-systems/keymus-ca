/*
* I18N System - COMPLETELY DISABLED
* 
* This system has been disabled in favor of using fallback text conversion.
* All `data-i18n` attributes will display readable text converted from the key names.
* 
* How it works:
* - `convertKeyToText()` function converts camelCase keys to readable text
* - Example: "withdrawalsPageTitle" → "Withdrawals Page"
* - Example: "makeWithdrawalTitle" → "Make Withdrawal"
* - Example: "footerHomeLink" → "Footer Home"
* 
* Usage:
* Simply add `data-i18n="keyName"` attributes to HTML elements and they will automatically display converted text.
*/

// Function to set the language - DISABLED
function setLanguage(lang) {
    // I18N DISABLED - Just store the preference but don't change anything
    localStorage.setItem('preferredLanguage', lang);
    updateContent();
    // Update the language switcher to reflect the current language
    const langSwitcher = document.getElementById('language-switcher');
    if (langSwitcher) {
        langSwitcher.value = lang;
    }
}

// Function to update all elements with data-i18n attributes - USING FALLBACK TEXT ONLY
function updateContent() {
    // I18N DISABLED - Using fallback text conversion only
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        
        // Convert key to readable text
        const fallbackText = convertKeyToText(key);

        // For input placeholders, we need to set the placeholder attribute
        if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
            element.placeholder = fallbackText;
        } else {
            element.innerHTML = fallbackText;
        }
    });
    
    // Update page title with fallback
    const titleElement = document.querySelector('title');
    if (titleElement) {
        const pageTitleKey = titleElement.getAttribute('data-i18n-title');
        if (pageTitleKey) {
            document.title = convertKeyToText(pageTitleKey);
        }
    }
}

// Convert camelCase/key to readable text
function convertKeyToText(key) {
    // Enhanced conversion from camelCase to readable text with improved prefix/suffix removal
    return key
        // Handle special cases first (exact matches)
        .replace(/^loginHeader$/i, 'Login')
        .replace(/^noAccountHeader$/i, 'No Account?')
        .replace(/^signUpPrompt$/i, 'Don\'t have an account?')
        .replace(/^emailOrUsernameLabel$/i, 'Email or Username')
        .replace(/^passwordLabel$/i, 'Password')
        .replace(/^loginButton$/i, 'Login')
        .replace(/^forgotPasswordLink$/i, 'Forgot Password?')
        .replace(/^signUpButton$/i, 'Sign Up')
        .replace(/^registerHeader$/i, 'Create Account')
        .replace(/^alreadyHaveAccountPrompt$/i, 'Already have an account?')
        
        // Remove common prefixes (case insensitive)
        .replace(/^footer/i, '') // Remove "footer" prefix 
        .replace(/^sidebar/i, '') // Remove "sidebar" prefix  
        .replace(/^nav/i, '') // Remove "nav" prefix 
        .replace(/^menu/i, '') // Remove "menu" prefix 
        .replace(/^page/i, '') // Remove "page" prefix
        .replace(/^login/i, 'Login') // Special case: keep "Login" but clean it up
        .replace(/^signup/i, 'Sign Up') // Special case: convert "signup" to "Sign Up"
        .replace(/^signin/i, 'Sign In') // Special case: convert "signin" to "Sign In"
        
        // Add space before capital letters for camelCase conversion
        .replace(/([A-Z])/g, ' $1')
        
        // Capitalize first letter
        .replace(/^./, str => str.toUpperCase())
        
        // Remove common suffixes (more comprehensive)
        .replace(/\s+Header$/i, '') // Remove "Header" suffix with spaces
        .replace(/\s+Link$/i, '') // Remove "Link" suffix with spaces
        .replace(/\s+Title$/i, '') // Remove "Title" suffix with spaces
        .replace(/\s+Label$/i, '') // Remove "Label" suffix with spaces
        .replace(/\s+Page$/i, '') // Remove "Page" suffix with spaces
        .replace(/\s+Button$/i, '') // Remove "Button" suffix with spaces
        .replace(/\s+Text$/i, '') // Remove "Text" suffix with spaces
        .replace(/\s+Message$/i, '') // Remove "Message" suffix with spaces
        .replace(/\s+Prompt$/i, '') // Remove "Prompt" suffix with spaces
        .replace(/\s+Error$/i, '') // Remove "Error" suffix with spaces
        .replace(/\s+Placeholder$/i, '') // Remove "Placeholder" suffix with spaces
        .replace(/\s+Option$/i, '') // Remove "Option" suffix with spaces
        
        // Clean up multiple spaces and trim
        .replace(/\s+/g, ' ')
        .trim()
        
        // Handle special cases for better readability
        .replace(/^No Account$/, 'No Account?')
        .replace(/^Email Or Username$/, 'Email or Username')
        .replace(/^Repeat Password$/, 'Repeat Password')
        .replace(/^Referral Code$/, 'Referral Code (Optional)')
        .replace(/^Field Required$/, 'This field is required')
        .replace(/^Forgot Password$/, 'Forgot Password?')
        .replace(/^Continue$/, 'Continue')
        .replace(/^Sign Up$/, 'Sign Up');
}

// Simple initialization - NO i18next dependency
function initI18n() {
    console.log('i18n system initialized (DISABLED - using fallback text only)');
    
    // Apply fallback text to all elements immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateContent);
    } else {
        updateContent();
    }
    
    // Dispatch a global event when i18n is ready
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('i18nReady'));
    }, 100);
}

// Call initialization when the script loads
initI18n();

// Set up language switcher (even though it doesn't do anything now)
document.addEventListener('DOMContentLoaded', () => {
    const langSwitcher = document.getElementById('language-switcher');
    if (langSwitcher) {
        langSwitcher.value = localStorage.getItem('preferredLanguage') || 'en';
        langSwitcher.addEventListener('change', (event) => {
            setLanguage(event.target.value);
        });
    }
});

// Make updateContent globally available for dynamic content
window.updateContent = updateContent;

// Add a global function to force update all translations
window.forceUpdateTranslations = function() {
    console.log('Force updating all text conversions...');
    updateContent();
    console.log('Text conversions updated successfully');
};

// Make other functions globally available if needed
window.setLanguage = setLanguage;
window.convertKeyToText = convertKeyToText;
