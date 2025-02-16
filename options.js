// options.js
document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    const customPrompt = document.getElementById('customPrompt').value;
    chrome.storage.sync.set({ apiKey, customPrompt }, () => {
       // Use a visual confirmation instead of alert
      const confirmationMessage = document.createElement('div');
      confirmationMessage.textContent = 'Options saved!';
      confirmationMessage.style.marginTop = '10px';
      confirmationMessage.style.color = 'green';
      document.body.appendChild(confirmationMessage);
  
      // Optional: Remove the message after a few seconds
      setTimeout(() => {
        confirmationMessage.remove();
      }, 3000);
    });
  });
  
  // Load saved options
  chrome.storage.sync.get(['apiKey', 'customPrompt'], (result) => {
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
    if (result.customPrompt) {
        document.getElementById('customPrompt').value = result.customPrompt;
      }
  });