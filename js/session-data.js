// This file defines session management functions for task.js

/**
 * Saves current session data in localStorage
 * @param {object} data - Data to save for current session
 */
function saveCurrentSessionData(data) {
  const existingData = getCurrentSessionData() || {};
  const mergedData = { ...existingData, ...data };
  localStorage.setItem('current_drive_session', JSON.stringify(mergedData));
}

/**
 * Gets current session data from localStorage
 * @returns {object} The stored session data or null if none exists
 */
function getCurrentSessionData() {
  const data = localStorage.getItem('current_drive_session');
  return data ? JSON.parse(data) : null;
}

/**
 * Clears stored session data when drive is complete or reset
 */
function clearSessionData() {
  localStorage.removeItem('current_drive_session');
}
