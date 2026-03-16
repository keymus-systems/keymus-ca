// Membership page translation support
document.addEventListener('DOMContentLoaded', () => {
  const authData = requireAuth();
  if (!authData) {
    return; // requireAuth will handle redirect
  }
  
  // Initialize i18next if not already initialized
  if (typeof initI18next === 'function') {
    initI18next().then(() => {
      updateMembershipTranslations();
    });
  } else {
    console.warn('i18next initialization function not found');
  }

  // Set up the language switcher
  const langSwitcher = document.getElementById('language-switcher');
  if (langSwitcher) {
    // Set initial value based on stored preference or default to English
    langSwitcher.value = localStorage.getItem('preferredLanguage') || 'en';
    
    // Add change event listener
    langSwitcher.addEventListener('change', (e) => {
      if (typeof setLanguage === 'function') {
        setLanguage(e.target.value);
      } else {
        console.warn('setLanguage function not available');
      }
    });
  }
});

// Function to update translations on the membership page
function updateMembershipTranslations() {
  // Only run if i18next is available and initialized
  if (window.i18next && window.i18next.isInitialized) {
    // Call the global updateContent function from i18n.js
    if (typeof updateContent === 'function') {
      updateContent();
      console.log('Updated membership page translations');
    } else {
      console.warn('updateContent function not available');
    }
  } else {
    console.warn('i18next not initialized yet for membership page');
  }
}

// Listen for language changes
document.addEventListener('languageChanged', () => {
  updateMembershipTranslations();
});
