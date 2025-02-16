// popup.js
document.getElementById('optionsButton').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Add event listener for the Close button
  document.getElementById('closeButton').addEventListener('click', () => {
    window.close(); // Close the popup window
  });