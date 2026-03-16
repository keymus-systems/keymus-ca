// notifications-i18n.js - Handle multilingual functionality for notifications page
document.addEventListener('DOMContentLoaded', () => {
  // Initialize i18next if it's not already initialized
  if (typeof initI18next === 'function') {
    initI18next().then(() => {
      updateNotificationsTranslations();
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

// Function to update notifications-specific translations
function updateNotificationsTranslations() {
  // This function will be called when the page loads and when the language changes
  // It can contain any notification-specific translation logic
  
  // Since we're using data-i18n attributes for static content, those will be handled by updateContent()
  // We need to handle dynamically generated content (like notification messages) here
  
  // Example: If we have custom notifications displayed in our tabs
  translateGeneralNotifications();
  translateUserNotifications();
  translateModalContent();
}

// Function to translate general notifications
function translateGeneralNotifications() {
  // If your general notifications need special translation handling
  // For example, if you need to translate parts of generated notifications
  // but that doesn't appear to be necessary based on the code review
}

// Function to translate user notifications
function translateUserNotifications() {
  // If your user notifications need special translation handling
  // For example, updating notification messages that were loaded from the server
}

// Function to translate modal content
function translateModalContent() {
  // Handle any dynamic translation needed for the notification detail modal
  // This is called when translations are updated
}

// Hook into the existing notification display functions to add translation support
// This will be executed when the notifications.js script runs
(function patchNotificationFunctions() {
  // We'll wait for the DOM to be fully loaded and for the original scripts to execute
  window.addEventListener('load', () => {
    // If we need to patch or extend the existing notification functions to add translation,
    // we can do that here. But based on the code review, these functions are already i18n-ready.
    
    // Example: If the createGeneralNotificationElement function exists and needs patching
    if (typeof window.createGeneralNotificationElement === 'function') {
      const originalCreateFn = window.createGeneralNotificationElement;
      window.createGeneralNotificationElement = function(notification) {
        // Check if the message is a translation key and translate it
        if (window.i18next && window.i18next.exists(notification.message)) {
          notification.message = window.i18next.t(notification.message);
        }
        return originalCreateFn(notification);
      };
    }
  });
})();
