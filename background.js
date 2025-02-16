// background.js
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "gemini-extend",
        title: "Extend with Gemini",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "gemini-simplify",
        title: "Simplify with Gemini",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "gemini-custom",
        title: "Gemini: Custom Prompt",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId.startsWith("gemini-")) {
        const selectedText = info.selectionText;
        let prompt = "";

        if (info.menuItemId === "gemini-extend") {
            prompt = `Extend the following text, making it more detailed and elaborate, while maintaining the original meaning: "${selectedText}"`;
        } else if (info.menuItemId === "gemini-simplify") {
            prompt = `Simplify the following text, making it easier to understand, while maintaining the original meaning: "${selectedText}"`;
        } else if (info.menuItemId === "gemini-custom") {
            const { customPrompt } = await chrome.storage.sync.get("customPrompt");
            prompt = (customPrompt || "Summarize the following:") + `"${selectedText}"`;
        }

        if (prompt) {
            try {
                const apiKey = (await chrome.storage.sync.get('apiKey')).apiKey; // Changed variable name to be more generic
                if (!apiKey) {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: () => {
                            alert("Please set your API key in the extension options.");
                        }
                    });
                    chrome.runtime.openOptionsPage();
                    return;
                }

                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: preparePageForInjection,
                });

                const geminiResponse = await getGeminiResponse(prompt, apiKey); // Changed function name

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: insertText,
                    args: [geminiResponse, selectedText] // Changed variable name
                });

            } catch (error) {
                console.error("Error processing text with Gemini:", error);
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: showError,
                    args: [error.message]
                });
            }
        }
    }
});

// Function to make the API call to Gemini
async function getGeminiResponse(prompt, apiKey) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey; // Updated URL

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    {text: prompt}
                ]
            }]
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Gemini's error structure might be different. Adapt as needed.
        throw new Error(`Gemini API Error: ${response.status} - ${errorData.error.message || errorData.error}`);
    }

    const data = await response.json();
     // Check if the response has the expected structure and handle potential errors
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text.trim();
    } else {
        // Handle cases where the response is not as expected.  This is CRUCIAL.
        throw new Error("Gemini API returned an unexpected response format.");
    }
}


// Function to prepare the page (content script - no changes needed here)
function preparePageForInjection() {
  if (!document.getElementById('originalSelectedText')) {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'originalSelectedText';
      document.body.appendChild(hiddenInput);
  }
}

// Function to insert text (content script - minor change for variable name)
function insertText(geminiResponse, selectedText) { // Changed variable name
    const hiddenInput = document.getElementById('originalSelectedText');
    hiddenInput.value = selectedText;

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.border = '1px solid black';
    modal.style.padding = '20px';
    modal.style.zIndex = '10000';
    modal.style.maxWidth = '80%';
    modal.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    modal.innerHTML = `
        <p><strong>Original Text:</strong> <span id="originalTextDisplay">${selectedText}</span></p>
        <p><strong>Gemini Response:</strong></p>
        <textarea id="geminiResponseArea" style="width: 95%; height: 150px; margin-bottom: 10px;">${geminiResponse}</textarea>
        <div>
            <button id="replaceButton">Replace Original</button>
            <button id="insertBeforeButton">Insert Before</button>
            <button id="insertAfterButton">Insert After</button>
            <button id="closeButton">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('replaceButton').addEventListener('click', () => {
      replaceSelectedText(document.getElementById('geminiResponseArea').value); // Changed ID
      modal.remove();
    });

    document.getElementById('insertBeforeButton').addEventListener('click', () => {
      insertAtSelection(document.getElementById('geminiResponseArea').value, true);  // Changed ID
        modal.remove();
    });

    document.getElementById('insertAfterButton').addEventListener('click', () => {
       insertAtSelection(document.getElementById('geminiResponseArea').value, false); // Changed ID
        modal.remove();
    });

    document.getElementById('closeButton').addEventListener('click', () => {
      modal.remove();
    });

     function replaceSelectedText(replacementText) {
        let sel = window.getSelection();
        if (sel.rangeCount) {
            let range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(replacementText));
        }
    }

    function insertAtSelection(textToInsert, insertBefore) {
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const nodeToInsert = document.createTextNode(textToInsert);

        if (insertBefore) {
          range.insertNode(nodeToInsert);
        } else {
            range.collapse(false);
            range.insertNode(nodeToInsert);
        }
        range.setStartAfter(nodeToInsert);
        range.setEndAfter(nodeToInsert);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}
}
function showError(message) {
    alert("Gemini Text Helper Error:\n\n" + message); // Updated error message
}