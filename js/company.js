// Company Profile page translation handling
document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18next if available
    if (typeof initI18next === 'function') {
        initI18next().then(() => {
            updateCompanyTranslations();
        });
    }
    
    // Set up language switcher
    const langSwitcher = document.getElementById('language-switcher');
    if (langSwitcher) {
        langSwitcher.value = localStorage.getItem('preferredLanguage') || 'en';
        langSwitcher.addEventListener('change', (e) => {
            if (typeof setLanguage === 'function') {
                setLanguage(e.target.value);
            }
        });
    }
});

// Function to update translations specifically for the company page
function updateCompanyTranslations() {
    // This function can be expanded to update any specific dynamic content
    // that's not covered by the standard data-i18n attributes
    document.title = i18next.t('companyProfileTitle');
}
