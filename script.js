   // API Setup
      const API_KEY = "AIzaSyBjv-eGcDOS1D2-Ly556tbQx_oFAiBuz2k";
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

      // Refined insertCodeWithTypingAnimation function
function insertCodeWithTypingAnimation(editor, code, speed = 2, onChunkTypedCallback = null, chunkSize = 50) {
    return new Promise((resolve) => {
        // If editor has selection, it will be replaced. Otherwise, types at cursor.
        let i = 0;
        let charsTypedInChunk = 0;

        function typeNextChar() {
            if (i < code.length) {
                const charToInsert = code.charAt(i);
                const currentCursorPos = editor.getCursor(); // Get current cursor before insertion

                if (charToInsert === '\n') {
                    editor.replaceRange('\n', currentCursorPos);
                } else {
                    editor.replaceRange(charToInsert, currentCursorPos);
                }
                // CodeMirror automatically moves the cursor after replaceRange

                i++;
                charsTypedInChunk++;

                if (onChunkTypedCallback && (charsTypedInChunk >= chunkSize || charToInsert === '\n' || i === code.length)) {
                    if (typeof onChunkTypedCallback === 'function') {
                        onChunkTypedCallback();
                    }
                    charsTypedInChunk = 0;
                }
                setTimeout(typeNextChar, speed);
            } else {
                if (onChunkTypedCallback && typeof onChunkTypedCallback === 'function') { // Final update
                    onChunkTypedCallback();
                }
                resolve(); // Resolve the promise when typing is done
            }
        }
        editor.focus(); // Focus the editor before starting to type
        typeNextChar();
    });
}


// --- Image to App Feature ---

function initializeImageToApp() {
    const imageToAppBtn = document.getElementById('imageToAppBtn');
    const imageToAppInput = document.getElementById('imageToAppInput');

    if (imageToAppBtn) {
        imageToAppBtn.addEventListener('click', () => {
            if (imageToAppInput) {
                imageToAppInput.click();
            }
        });
    }

    if (imageToAppInput) {
        imageToAppInput.addEventListener('change', handleImageToAppUpload);
    }
}

function handleImageToAppUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (!file.type.startsWith('image/')) {
        showNotification('error', 'Invalid File', 'Please upload an image file.');
        if (event.target) event.target.value = null; // Reset input
        return;
    }

    const reader = new FileReader();
    reader.onloadend = function() {
        const base64ImageData = reader.result.split(',')[1]; // Get base64 part
        sendImageToAiForAppGeneration(base64ImageData, file.type);
    }
    reader.onerror = function() {
        showNotification('error', 'File Error', 'Could not read the image file.');
        if (event.target) event.target.value = null;
    }
    reader.readAsDataURL(file);
    if (event.target) event.target.value = null; // Reset input for same file selection
}

async function sendImageToAiForAppGeneration(base64ImageData, mimeType) {
    showNotification('info', 'AI Processing...', 'AI is analyzing the image and generating code. This may take some time. Please wait.', 60000); // Extended timeout for notification

     const prompt = `You are an expert web developer. Analyze the provided UI image and generate the complete HTML, CSS, and JavaScript code to replicate it as a web application.
The HTML should be well-structured, semantic, and include ARIA attributes for accessibility where appropriate (e.g., roles for navigation, landmarks, button labels).
The CSS should accurately reflect the styling (colors, fonts, layout, spacing, dimensions, and component appearance) visible in the image.
Employ modern CSS practices:
  - Use CSS Flexbox or Grid for layout creation.
  - Use CSS variables (custom properties) for managing colors, fonts, or spacing if a consistent theme is apparent.
  - Ensure responsive design principles are considered if the UI implies different states or adaptability.
The JavaScript should implement any visible interactive elements (e.g., buttons, menus, forms, carousels, tabs) with functional, albeit basic, logic.
  - Use modern JavaScript (ES6+) syntax.
  - Attach event listeners appropriately.
  - Perform necessary DOM manipulations.
  - If complex behavior is implied but not fully clear, create a functional placeholder that logs to the console or shows an alert, clearly indicating what it's supposed to do.
If specific images (like logos, icons, background images) are used in the UI, use descriptive placeholder image URLs from services like 'https://via.placeholder.com/{width}x{height}.png?text={description}' (e.g., https://via.placeholder.com/150x50.png?text=Logo) or 'https://picsum.photos/{width}/{height}' and ensure the 'alt' attributes are descriptive.
If text content is clearly visible, include it. For generic text, use "Lorem ipsum..." or descriptive placeholders like "Sample Title".
Provide the output ONLY as a single valid JSON object with three keys: "html", "css", and "javascript". Each key's value should be a string containing the respective code. Do not include any other text, explanations, or markdown formatting (like \`\`\`json) outside of this JSON object.
Ensure the generated code is clean, well-commented where necessary for complex parts, and adheres to common best practices.

Example JSON structure:
{
  "html": "<!DOCTYPE html>\\n<html lang=\\"en\\">\\n<head>...</head>\\n<body>...</body>\\n</html>",
  "css": "body { \\n  font-family: sans-serif; \\n}\\n...",
  "javascript": "document.addEventListener(\\"DOMContentLoaded\\", function() {\\n  // Your JS code here\\n});"
}
`;

    try {
        const response = await fetch(API_URL, { // Ensure API_URL is correctly defined globally
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64ImageData
                            }
                        }
                    ]
                }],
                 "generationConfig": { // It's good to specify some config
                   "temperature": 0.4, // Lower temperature for more deterministic code generation
                   "maxOutputTokens": 8192, // Maximize output tokens for potentially large code
                   "responseMimeType": "application/json", // Request JSON output directly
                 }
            })
        });

        // Hide the "AI Processing..." notification once response is received or error occurs
        hideNotification('infoNotification');


        if (!response.ok) {
            const errorText = await response.text(); // Get raw error text
            let errorDetails = `Status: ${response.status}.`;
            try {
                const errorData = JSON.parse(errorText);
                errorDetails += ` ${errorData?.error?.message || 'Unknown API error'}`;
            } catch (e) {
                errorDetails += ` Non-JSON response: ${errorText.substring(0, 200)}`;
            }
            console.error('AI API Error Response:', errorText);
            showNotification('error', 'AI Error', `Failed to generate code. ${errorDetails}`);
            return;
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
            let aiResponseText = data.candidates[0].content.parts[0].text;
            
            try {
                // The model should directly return JSON if responseMimeType is set.
                // If not, manual cleaning might be needed (though less likely with responseMimeType).
                // aiResponseText = aiResponseText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

                const codes = JSON.parse(aiResponseText); // This should now directly parse if model respects responseMimeType
                
                if (codes && typeof codes.html === 'string' && typeof codes.css === 'string' && typeof codes.javascript === 'string') {
                    showNotification('success', 'Code Generated', 'AI has generated the code. Typing into editors...');
                    await typeCodeIntoEditorsAndPreview(codes.html, codes.css, codes.javascript);
                } else {
                    console.error("AI response is not in the expected JSON format:", codes);
                    showNotification('error', 'AI Error', 'AI response format is incorrect. Expected JSON with html, css, javascript string keys.');
                }
            } catch (e) {
                console.error('Error parsing AI JSON response:', e, "Raw response text:", aiResponseText);
                showNotification('error', 'AI Error', 'Failed to parse AI response. The response was not valid JSON.');
            }
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
             console.error("AI request blocked:", data.promptFeedback);
             showNotification('error', 'AI Error', `Request blocked: ${data.promptFeedback.blockReason}. ${data.promptFeedback.blockReasonMessage || ''}`);
        }
         else {
            console.error("Unexpected AI response structure:", data);
            showNotification('error', 'AI Error', 'Could not extract code from AI response. The response structure was unexpected.');
        }

    } catch (error) {
        hideNotification('infoNotification');
        console.error('AI API request failed:', error);
        showNotification('error', 'AI Error', `Failed to connect to AI service for code generation. ${error.message}`);
    }
}

async function typeCodeIntoEditorsAndPreview(htmlCode, cssCode, jsCode) {
    const userConfirmation = confirm("The AI has generated code based on the image. This will replace the current content in the editors. Do you want to proceed?");
    if (!userConfirmation) {
        showNotification('info', 'Cancelled', 'Image to App operation cancelled by user.');
        return;
    }

     const typingSpeed = 15; // අකුරු type වීමේ වේගය (delay in ms - වැඩි අගයකින් සෙමින් type වේ)
    const chunkSizeForPreview = 30; // Update preview more frequently for smaller chunks

    try {
        showNotification('info', 'Typing HTML...', 'HTML code is being typed into the editor.', 30000);
        editors.html.setValue(''); // Clear HTML editor
        await insertCodeWithTypingAnimation(editors.html, htmlCode, typingSpeed, () => {
            safeUpdatePreview(); // Update preview after each chunk
        }, chunkSizeForPreview);
        hideNotification('infoNotification'); // Hide after HTML is done or next step starts

        showNotification('info', 'Typing CSS...', 'CSS code is being typed into the editor.', 30000);
        editors.css.setValue(''); // Clear CSS editor
        await insertCodeWithTypingAnimation(editors.css, cssCode, typingSpeed, () => {
            safeUpdatePreview();
        }, chunkSizeForPreview);
        hideNotification('infoNotification');

        showNotification('info', 'Typing JavaScript...', 'JavaScript code is being typed into the editor.', 30000);
        editors.js.setValue(''); // Clear JS editor
        await insertCodeWithTypingAnimation(editors.js, jsCode, typingSpeed, () => {
            safeUpdatePreview();
        }, chunkSizeForPreview);
        hideNotification('infoNotification');

        showNotification('success', 'Done!', 'Code generation and typing complete! Final preview updated.', 5000);
        safeUpdatePreview(); // Final preview update
    } catch (e) {
        console.error("Error during typing or preview update:", e);
        showNotification('error', 'Operation Error', 'An error occurred during the code typing process.');
    }
}


      
      // Modal controls
      function toggleTheme() {
          document.body.classList.toggle('light-theme');
          const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
          document.getElementById('themeSelect').value = theme;
          
          // Update CodeMirror theme
          const cmTheme = theme === 'dark' ? 'dracula' : 'default';
          editors.html.setOption('theme', cmTheme);
          editors.css.setOption('theme', cmTheme);
          editors.js.setOption('theme', cmTheme);
      }
        
      function showAbout() {
          showModal('aboutModal');
      }

      function showSettings() {
          showModal('settingsModal');
      }

      function showHelp() {
          showModal('helpModal');
      }

      function showModal(modalId) {
          document.getElementById(modalId).classList.add('show');
      }

      function closeModal(modalId) {
          document.getElementById(modalId).classList.remove('show');
      }

      
          document.querySelector('.status-indicator').addEventListener('click', function() {
              if (lastErrorType) {
                  showErrorModal(lastErrorMessage, lastErrorDetails);
              }
          });

          (function() {
  const btn = document.getElementById('supportPopupBtn');
  const card = document.getElementById('supportPopupCard');
  const close = document.getElementById('supportPopupClose');
  const typingText = document.getElementById('supportTypingText');
  const typingCursor = document.getElementById('supportTypingCursor');
  const form = document.getElementById('supportPopupForm');
  const nameInput = document.getElementById('supportName');
  const msgInput = document.getElementById('supportMsg');
  const agree = document.getElementById('supportAgree');
  const sendBtn = document.getElementById('supportSendBtn');
  const successDiv = document.getElementById('supportPopupSuccess');

  // Typing animation
  const typingMsg = "ඔබේ ගැටලු සහ අදහස් යොජනා අපිට කියන්න ⁣";
  let typingIdx = 0, typingInterval;
  function startTyping() {
    typingText.textContent = "";
    typingIdx = 0;
    typingCursor.style.display = "inline-block";
    clearInterval(typingInterval);
    typingInterval = setInterval(() => {
      if (typingIdx <= typingMsg.length) {
        typingText.textContent = typingMsg.slice(0, typingIdx);
        typingIdx++;
      } else {
        clearInterval(typingInterval);
        typingCursor.style.display = "none";
      }
    }, 55);
  }

  // Show/hide popup
  btn.onclick = () => {
    card.classList.add('show');
    startTyping();
    form.style.display = '';
    successDiv.style.display = 'none';
    nameInput.value = '';
    msgInput.value = '';
    agree.checked = false;
    sendBtn.disabled = true;
    sendBtn.classList.remove('enabled');
  };
  close.onclick = () => card.classList.remove('show');

  // Enable send button only if agree checked and fields filled
  function updateSendBtn() {
    if (nameInput.value.trim() && msgInput.value.trim() && agree.checked) {
      sendBtn.disabled = false;
      sendBtn.classList.add('enabled');
    } else {
      sendBtn.disabled = true;
      sendBtn.classList.remove('enabled');
    }
  }
  nameInput.oninput = msgInput.oninput = agree.onchange = updateSendBtn;

  // Form submit
  form.onsubmit = function(e) {
    e.preventDefault();
    if (sendBtn.disabled) return;
    const name = nameInput.value.trim();
    const msg = msgInput.value.trim();
    // WhatsApp API
    const waMsg = encodeURIComponent(`Name: ${name}\nMessage: ${msg}`);
    const waUrl = `https://wa.me/94702001859?text=${waMsg}`;
    window.open(waUrl, '_blank');
    // Show success
    form.style.display = 'none';
    successDiv.style.display = 'flex';
    setTimeout(() => {
      card.classList.remove('show');
    }, 2500);
  };
})();
          
          // ---- Main application code ----
          // Global state variables
          let currentTheme = 'dark'; // dark or light
          let activeTab = 'html';
          
          let errorInfo = { type: null, line: null, message: null, details: null };
          let projectFiles = [
              { name: 'index.html', type: 'html', content: '' },
              { name: 'styles.css', type: 'css', content: '' },
              { name: 'script.js', type: 'js', content: '' }
          ];
          let missingResources = { images: [], files: [] };
          let autoSaveEnabled = true;
          let autoSaveInterval = null;
          let typingAnimationActive = false;
          let editorSettings = {
              theme: 'dracula',
              fontSize: 14,
              tabSize: 2,
              wordWrap: true
          };
          
          let lastErrorType = null; // "css" | "js" | "html"
          let lastErrorMessage = '';
          let lastErrorDetails = '';
          let projects = {};
          let currentProject = 'default';
          let editors = {
              html: null,
              css: null,
              js: null
          };
          let currentTab = 'html'; // <-- Add this line to track the current active tab
          let isSidebarCollapsed = false; // Track sidebar state
          let isPreviewFullscreen = false; // Track preview fullscreen state
          
          // AI Assistant variables
          let isAiAssistantOpen = false;
          let aiMessages = [];
          let aiTypingTimeout = null;
          let aiTypingAnimationActive = false;
          let aiLastMessage = '';
          let aiMessageId = 0;
          let selectedCodeForAi = null;
          let aiContextMenuTarget = null;
          let aiCodeCompletionActive = false;
          let aiErrorFixActive = false;
          let aiErrorFixSuggestion = null;
          
          // For CSS Color Picker
          const cssColorPicker = document.getElementById('cssColorPickerInput');
          let activeColorMarkerInfo = null;
          let activeColorPicker = null;
          let colorPickerSwatch = null;
          let colorPickerSwatchTimeout = null;
          let colorPickerSwatchDebounceTimeout = null;
          let colorPickerSwatchDebounceDelay = 300;
          let colorPickerSwatchActive = false;
          
          // For AI Code Selection Highlight
          let aiCodeSelectionActive = false;
          let aiCodeSelectionMarkers = [];
          let aiCodeSelectionStart = null;
          let aiCodeSelectionEnd = null;
          
          // Error tracking
          let jsErrorInPreviewOccurred = false;
          let jsErrorInPreviewMessage = '';
          let jsErrorInPreviewDetails = '';
          let jsErrorInPreviewLine = null;
          
          // Use a WeakMap to store markers per editor instance
          const editorColorMarkers = new WeakMap();

          // --- File Data Structure Example ---
let files = [
  { name: "index.html", type: "html", content: "" },
  { name: "styles.css", type: "css", content: "" },
  { name: "script.js", type: "js", content: "" }
];
let currentFileIndex = 0;

// --- New File ---
function newFile() {
  showFileActionModal({
    title: "Create New File",
    body: "",
    showInput: true,
    inputPlaceholder: "Enter file name (e.g. newfile.html)",
    onConfirm: function(fileName) {
      if (!fileName) return;
      // Check for duplicate file name
      if (files.some(f => f.name === fileName)) {
        alert("A file with that name already exists!");
        return;
      }
       const ext = fileName.split('.').pop().toLowerCase();
      let type = "txt";
      if (ext === "html") type = "html";
      else if (ext === "css") type = "css";
      else if (ext === "js") type = "js";
      files.push({ name: fileName, type, content: "" });
      currentFileIndex = files.length - 1;
      renderFileExplorer();
      selectTabByFileName(fileName); // <-- මෙය අනිවාර්යයි!
    }
  });
}
function newFolder() {
  showFileActionModal({
    title: "Create New Folder",
    body: "<div style='color:#888;font-size:0.95em;'>Folder support is not implemented yet.</div>",
    confirmText: "OK",
    onConfirm: function() {}
  });
}

function renameSelectedFile() {
  if (files.length === 0) return;
  const idx = currentFileIndex;
  const file = files[idx];
  showFileActionModal({
    title: "Rename File",
    showInput: true,
    inputValue: file.name,
    inputPlaceholder: "Enter new file name",
    onConfirm: function(newName) {
      if (newName && newName !== file.name) {
        file.name = newName;
        renderFileExplorer();
      }
    }
  });
}

function deleteSelectedFile() {
  if (files.length === 0) return;
  const idx = currentFileIndex;
  const file = files[idx];
  showFileActionModal({
    title: "Delete File",
    body: `<div>Are you sure you want to delete <b>${file.name}</b>?</div>`,
    confirmText: "Delete",
    confirmDanger: true,
    onConfirm: function() {
      files.splice(idx, 1);
      if (currentFileIndex >= files.length) currentFileIndex = files.length - 1;
      renderFileExplorer();
      if (files.length > 0) selectTabByFileName(files[currentFileIndex].name);
    }
  });
}

// --- Select Tab by File Name ---
function selectTabByFileName(fileName) {
  const idx = files.findIndex(f => f.name === fileName);
  if (idx !== -1) {
    currentFileIndex = idx;
    selectTab(files[idx].type, fileName);
  }
}
function selectTab(type, fileName) {
  // Hide all editors
  document.querySelectorAll('.editor-panel .CodeMirror').forEach(cm => {
    cm.style.display = 'none';
  });

  // Remove active class from all tabs and file items
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));

  // Fallback if unsupported type
  let editorType = type;
  if (!editors[type]) editorType = 'html';

  // Show the selected editor
  if (editors[editorType]) {
    editors[editorType].getWrapperElement().style.display = 'block';
    editors[editorType].refresh();
  }
  
  // Highlight the selected tab (if exists)
  const tabEl = document.querySelector(`.tab[data-tab="${editorType}"]`);
  if (tabEl) tabEl.classList.add('active');

  // Highlight the selected file in explorer
  const fileItems = document.querySelectorAll('.file-item');
  fileItems.forEach(item => {
    if (item.querySelector('.file-name')?.textContent === fileName) {
      item.classList.add('active');
    }
  });

  currentTab = editorType;
  updateStatusBar && updateStatusBar();
}


// --- Render File Explorer ---
function renderFileExplorer() {
  const fileTree = document.getElementById('fileTree');
  if (!fileTree) return;
  fileTree.innerHTML = '';
  files.forEach((file, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="file-item${idx === currentFileIndex ? ' active' : ''}" 
           data-file-type="${file.type}" 
           data-file-index="${idx}" 
           onclick="selectTabByFileName('${file.name}')">
        <span class="file-icon">
          <i class="fab fa-${file.type === 'html' ? 'html5' : file.type === 'css' ? 'css3-alt' : file.type === 'js' ? 'js' : 'file'}"></i>
        </span>
        <span class="file-name">${file.name}</span>
      </div>
    `;
    fileTree.appendChild(li);
  });
}

let contextFileIndex = null;
function showFileContextMenu(e, idx) {
  e.preventDefault();
  contextFileIndex = idx;
  const menu = document.getElementById('fileContextMenu');
  menu.style.display = 'block';
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  document.addEventListener('click', hideFileContextMenu);
}
function hideFileContextMenu() {
  document.getElementById('fileContextMenu').style.display = 'none';
  document.removeEventListener('click', hideFileContextMenu);
}

function renameFileDirect(idx) {
  const file = files[idx];
  showFileActionModal({
    title: "Rename File",
    showInput: true,
    inputValue: file.name,
    inputPlaceholder: "Enter new file name",
    onConfirm: function(newName) {
      if (newName && newName !== file.name) {
        file.name = newName;
        renderFileExplorer();
      }
    }
  });
}

function deleteFileDirect(idx) {
  const file = files[idx];
  showFileActionModal({
    title: "Delete File",
    body: `<div>Are you sure you want to delete <b>${file.name}</b>?</div>`,
    confirmText: "Delete",
    confirmDanger: true,
    onConfirm: function() {
      files.splice(idx, 1);
      if (currentFileIndex >= files.length) currentFileIndex = files.length - 1;
      renderFileExplorer();
      if (files.length > 0) selectTabByFileName(files[currentFileIndex].name);
    }
  });
}

// --- Download Project as ZIP ---
function downloadProjectZip() {
  // Requires JSZip library
  const zip = new JSZip();
  files.forEach(file => {
    zip.file(file.name, file.content);
  });
  zip.generateAsync({ type: "blob" }).then(function(content) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = "project.zip";
    a.click();
  });
}

function showFileActionModal({title, body, onConfirm, confirmText = "OK", showInput = false, inputValue = "", inputPlaceholder = "", confirmDanger = false}) {
  const modal = document.getElementById('fileActionModal');
  document.getElementById('fileActionModalTitle').innerText = title;
  document.getElementById('fileActionModalBody').innerHTML = showInput
    ? `<input id="fileActionModalInput" class="modal-input" type="text" value="${inputValue}" placeholder="${inputPlaceholder}" style="width:100%;padding:8px;font-size:1em;">`
    : body || "";
  document.getElementById('fileActionModalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="hideFileActionModal()">Cancel</button>
    <button class="btn${confirmDanger ? ' btn-danger' : ''}" id="fileActionModalConfirmBtn">${confirmText}</button>
  `;
  modal.style.display = "block";
  setTimeout(() => {
    const btn = document.getElementById('fileActionModalConfirmBtn');
    if (btn) btn.onclick = function() {
      let val = showInput ? document.getElementById('fileActionModalInput').value : undefined;
      hideFileActionModal();
      onConfirm && onConfirm(val);
    };
    if (showInput) {
      document.getElementById('fileActionModalInput').focus();
      document.getElementById('fileActionModalInput').select();
    }
  }, 50);
}
function hideFileActionModal() {
  document.getElementById('fileActionModal').style.display = "none";
} 


// --- On Load ---
document.addEventListener('DOMContentLoaded', function() {
  renderFileExplorer();
  // ...other init code...
});

          // Debounce function
          function debounce(func, delay) {
              let timeout;
              return function(...args) {
                  const context = this;
                  clearTimeout(timeout);
                  timeout = setTimeout(() => func.apply(context, args), delay);
              };
          }

          // Helper to convert any CSS color to HEX for the input type=color
          function colorStringToHex(colorString) {
              const tempEl = document.createElement('div');
              tempEl.style.color = colorString;
              document.body.appendChild(tempEl);
              const computedColor = window.getComputedStyle(tempEl).color;
              document.body.removeChild(tempEl);
              const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
              return match ? `#${parseInt(match[1]).toString(16).padStart(2, '0')}${parseInt(match[2]).toString(16).padStart(2, '0')}${parseInt(match[3]).toString(16).padStart(2, '0')}` : '#000000';
          }

          // Initialize CodeMirror editors
          function initializeEditors() {
              // Common editor options
              const commonOptions = {
                  lineNumbers: true,
                  theme: 'dracula',
                  indentUnit: 4,
                  lineWrapping: true,
                  matchBrackets: true,
                  styleActiveLine: true,
                  extraKeys: {
                      "Ctrl-Space": "autocomplete",
                      'Ctrl-S': saveFile,
                      'Ctrl-Enter': safeUpdatePreview,
                      'Ctrl-O': openFile,
                      'Ctrl-N': newFile,
                      'Ctrl-B': toggleSidebar,
                      'Ctrl-P': togglePreviewFullscreen,
                      'Ctrl-K': toggleTheme,
                      'Ctrl-J': function() { toggleAiAssistant(true); }
                  },
                  hintOptions: { completeSingle: false }
              };
              
              editors.html = CodeMirror.fromTextArea(document.getElementById('htmlEditor'), {
                  ...commonOptions,
                  mode: 'htmlmixed'
              });

              editors.css = CodeMirror.fromTextArea(document.getElementById('cssEditor'), {
                  ...commonOptions,
                  mode: 'css'
              });

              editors.js = CodeMirror.fromTextArea(document.getElementById('jsEditor'), {
                  ...commonOptions,
                  mode: 'javascript'
              });
              {

    // ======= මෙහිදී ඔබේ code block එක add කරන්න =======
    editors.html.on('inputRead', function(cm, change) {
        if (change.text[0] && /[a-zA-Z0-9_.]/.test(change.text[0])) {
            cm.showHint();
        }
    });
    editors.css.on('inputRead', function(cm, change) {
        if (change.text[0] && /[a-zA-Z0-9_.#-]/.test(change.text[0])) {
            cm.showHint();
        }
    });
    editors.js.on('inputRead', function(cm, change) {
        if (change.text[0] && /[a-zA-Z0-9_.]/.test(change.text[0])) {
            cm.showHint();
        }
    });

     // ==== මෙහිදී files array එකේ content initialize කරන්න ====
    files[0].content = editors.html.getValue();
    files[1].content = editors.css.getValue();
    files[2].content = editors.js.getValue();  

    // ================================================
    editors.html.on('change', function(cm) {
      if (files[currentFileIndex] && files[currentFileIndex].type === 'html') {
        files[currentFileIndex].content = cm.getValue();
      }
    });
    editors.css.on('change', function(cm) {
      if (files[currentFileIndex] && files[currentFileIndex].type === 'css') {
        files[currentFileIndex].content = cm.getValue();
      }
    });
    editors.js.on('change', function(cm) {
      if (files[currentFileIndex] && files[currentFileIndex].type === 'js') {
        files[currentFileIndex].content = cm.getValue();
      }
    });

}

              // Add selection event for AI code selection feature
              editors.html.on('cursorActivity', handleCodeSelection);
              editors.css.on('cursorActivity', handleCodeSelection);
              editors.js.on('cursorActivity', handleCodeSelection);

              // Set up change events
              editors.html.on('change', debounce(() => {
                  document.getElementById('errorModal').classList.remove('show');
                  updateStatusBar();
                  safeUpdatePreview();
                  updateCssColorSwatches(editors.html);
                  checkCodeForAiAssistance(editors.html);
              }, 300));
              
              editors.css.on('change', debounce(() => {
                  document.getElementById('errorModal').classList.remove('show');
                  updateStatusBar();
                  safeUpdatePreview();
                  updateCssColorSwatches(editors.css);
                  checkCodeForAiAssistance(editors.css);
              }, 300));
              
              editors.js.on('change', debounce(() => {
                  document.getElementById('errorModal').classList.remove('show');
                  updateStatusBar();
                  safeUpdatePreview();
                  updateCssColorSwatches(editors.js);
                  checkCodeForAiAssistance(editors.js);
              }, 300));

              // Initialize file explorer
              renderFileExplorer();

              selectTab('html');
              safeUpdatePreview();
              updateCssColorSwatches(editors.html);
              updateCssColorSwatches(editors.css);
              updateCssColorSwatches(editors.js);
              
              // Set up context menu for AI features
              setupAiContextMenu();
          }
          
          // Set up AI context menu
          function setupAiContextMenu() {
              // Close context menu on click outside
              document.addEventListener('click', function(e) {
                  const contextMenu = document.getElementById('aiContextMenu');
                  if (contextMenu.style.display === 'block' && !contextMenu.contains(e.target)) {
                      contextMenu.style.display = 'none';
                  }
              });
              
              // Show context menu on right-click in editor
              editors.html.getWrapperElement().addEventListener('contextmenu', showAiContextMenu);
              editors.css.getWrapperElement().addEventListener('contextmenu', showAiContextMenu);
              editors.js.getWrapperElement().addEventListener('contextmenu', showAiContextMenu);
              
              // Prevent default context menu in editors
              editors.html.getWrapperElement().addEventListener('contextmenu', preventDefault);
              editors.css.getWrapperElement().addEventListener('contextmenu', preventDefault);
              editors.js.getWrapperElement().addEventListener('contextmenu', preventDefault);
          }
          
          function preventDefault(e) {
              e.preventDefault();
          }
          
          function showAiContextMenu(e) {
              e.preventDefault();
              const contextMenu = document.getElementById('aiContextMenu');
              contextMenu.style.display = 'block';
              contextMenu.style.left = e.pageX + 'px';
              contextMenu.style.top = e.pageY + 'px';
              
              // Store current editor for context menu actions
              aiContextMenuTarget = getCurrentEditor();
          }
          
          function aiContextAction(action) {
              const contextMenu = document.getElementById('aiContextMenu');
              contextMenu.style.display = 'none';
              
              if (!aiContextMenuTarget) return;
              
              const selectedCode = aiContextMenuTarget.getSelection();
              if (!selectedCode.trim()) {
                  showNotification('error', 'Error', 'Please select some code first.');
                  return;
              }
              
              switch (action) {
                  case 'explain':
                      explainSelectedCode(selectedCode);
                      break;
                  case 'fix':
                      fixSelectedCode(selectedCode);
                      break;
                  case 'optimize':
                      optimizeSelectedCode(selectedCode);
                      break;
                  case 'run':
                      runSelectedCode(selectedCode);
                      break;
                  case 'comment':
                      commentSelectedCode(selectedCode);
                      break;
                  case 'translate':
                      translateSelectedCode(selectedCode);
                      break;
                  case 'generate':
                      generateSelectedCode(selectedCode);
                      break;
                  case 'debug':
                      debugSelectedCode(selectedCode);
                      break;
                  case 'refactor':
                      refactorSelectedCode(selectedCode);
                      break;
                  case 'complete':
                      completeSelectedCode(selectedCode);
                      break;
                  default:
                      showNotification('error', 'Error', 'Unknown action.');
                      break;
              }
          }
          
          // Show Error Modal
          function showErrorModal(errorMessage, errorDetails) {
              document.getElementById('errorMessage').textContent = errorMessage || "An error occurred.";
              document.getElementById('errorDetails').textContent = errorDetails || "";
              
              let location = "Unknown";
              if (lastErrorType === "css" && lastErrorDetails) {
                  const lineMatch = lastErrorDetails.match(/Line: (\d+)/i);
                  if (lineMatch && lineMatch[1]) location = `Line ${lineMatch[1]}`;
              } else if (lastErrorType === "js" && lastErrorDetails) {
                  const lineMatch = lastErrorDetails.match(/Row: (\d+)/i);
                  if (lineMatch && lineMatch[1]) location = `Row ${lineMatch[1]}`;
              } else if (lastErrorType === "html" && lastErrorDetails) {
                  const lineMatch = lastErrorDetails.match(/Row (\d+)/i);
                  if (lineMatch && lineMatch[1]) location = `Row ${lineMatch[1]}`;
              }
              document.getElementById('errorLocation').textContent = location;
              document.getElementById('errorModal').classList.add('show');
              
              // Check if AI Error Fixing is enabled
              if (document.getElementById('aiErrorFixingToggle').checked) {
                  // Get error information for AI
                  const errorInfo = {
                      type: lastErrorType,
                      message: lastErrorMessage,
                      details: lastErrorDetails,
                      location: location
                  };
                  
                  // Suggest AI fix
                  setTimeout(() => suggestAiErrorFix(errorInfo), 500);
              }
          }
          function toggleAiAssistantFullscreen() {
    const aiAssistant = document.getElementById('aiAssistant');
    aiAssistant.classList.toggle('fullscreen');
    // Change icon if needed
    const btn = aiAssistant.querySelector('.fa-expand, .fa-compress');
    if (btn) {
        btn.classList.toggle('fa-expand');
        btn.classList.toggle('fa-compress');
    }
}
window.toggleAiAssistantFullscreen = toggleAiAssistantFullscreen;
          
          // AI Error Fixing
          function suggestAiErrorFix(errorInfo) {
              if (!errorInfo.type || !errorInfo.message) return;
              
              const editor = errorInfo.type === 'html' ? editors.html :
                            errorInfo.type === 'css' ? editors.css :
                            errorInfo.type === 'js' ? editors.js : null;
              
              if (!editor) return;
              
              const code = editor.getValue();
              const prompt = `Fix this ${errorInfo.type.toUpperCase()} code error. 
Error: ${errorInfo.message}
Details: ${errorInfo.details}
Location: ${errorInfo.location}

Only show the fixed code without any explanation. Here's the code:

${code}`;
              
              // Send to AI
              aiFixError(prompt, errorInfo.type);
          }
          
          // Apply AI error fix
          function applyAiErrorFix() {
              if (!aiErrorFixSuggestion) return;
              
              const editor = aiErrorFixSuggestion.type === 'html' ? editors.html :
                            aiErrorFixSuggestion.type === 'css' ? editors.css :
                            aiErrorFixSuggestion.type === 'js' ? editors.js : null;
              
              if (!editor) return;
              
              editor.setValue(aiErrorFixSuggestion.fixedCode);
              hideAiErrorSuggestion();
              showNotification('success', 'Fix Applied', 'AI fix has been applied to the code.');
              document.getElementById('errorModal').classList.remove('show');
          }
          
          function hideAiErrorSuggestion() {
              document.getElementById('aiErrorSuggestion').style.display = 'none';
              aiErrorFixSuggestion = null;
          }
          
          // AI functions for error fixing
          function aiFixError(prompt, type) {
    if (!prompt) {
        if (!lastErrorType || !lastErrorMessage) {
            showNotification('error', 'Error', 'No error information available.');
            return;
        }
        let code = '';
        if (lastErrorType === 'html') {
            code = editors.html.getValue();
        } else if (lastErrorType === 'css') {
            // Try CSS panel, else extract from HTML panel
            code = editors.css.getValue().trim();
            if (!code) code = extractTagContent(editors.html.getValue(), 'style');

        } else if (lastErrorType === 'js') {
            // Try JS panel, else extract from HTML panel
            code = editors.js.getValue().trim();
            if (!code) code = extractTagContent(editors.html.getValue(), 'script');
        }
        if (!code) {
            showNotification('error', 'Error', 'No code available to fix.');
            return;
        }
        prompt = `Fix this ${lastErrorType.toUpperCase()} code error. 
Error: ${lastErrorMessage}
Details: ${lastErrorDetails}
Location: ${document.getElementById('errorLocation').textContent}

Only show the fixed code without any explanation. Here's the code:

${code}`;
        type = lastErrorType;
    }
              
              // Show loading state
              showNotification('info', 'AI Working', 'AI is analyzing and fixing your code...');
              
              // Send to AI API
              fetch(API_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      contents: [{ parts: [{ text: prompt }] }]
                  })
              })
              .then(response => response.json())
              .then(data => {
                  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                      const aiResponse = data.candidates[0].content.parts[0].text;
                      
                      // Extract code from response (strip any markdown code blocks)
                      let fixedCode = aiResponse.replace(/```[\w]*\n/g, '').replace(/```/g, '').trim();
                      
                      // Store the fix suggestion
                      aiErrorFixSuggestion = {
                          type: type,
                          fixedCode: fixedCode
                      };
                      
                      // Show the suggestion
                      document.getElementById('aiErrorMessage').textContent = `Error in ${type.toUpperCase()}: ${lastErrorMessage}`;
                      document.getElementById('aiErrorFix').textContent = fixedCode;
                      document.getElementById('aiErrorSuggestion').style.display = 'block';
                      
                      hideNotification('infoNotification');
                  } else {
                      showNotification('error', 'AI Error', 'Could not generate fix suggestion.');
                  }
              })
              .catch(error => {
                  console.error('AI API error:', error);
                  showNotification('error', 'AI Error', 'Failed to connect to AI service.');
              });
          }
         function formatAiMessage(message, showFixBtn = false) {
    // Split code blocks and explanations
    let parts = [];
    let regex = /```([a-z]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(message)) !== null) {
        // Explanation before code
        if (match.index > lastIndex) {
            parts.push({
                type: 'explanation',
                text: message.substring(lastIndex, match.index)
            });
        }
        // Code block
        parts.push({
            type: 'code',
            language: match[1] || '',
            code: match[2].trim()
        });
        lastIndex = regex.lastIndex;
    }
    // Remaining explanation
    if (lastIndex < message.length) {
        parts.push({
            type: 'explanation',
            text: message.substring(lastIndex)
        });
    }
    // Build HTML
    let html = '';
    parts.forEach(part => {
        if (part.type === 'explanation') {
            // Explanations as normal text
            html += `<div class="ai-explanation" style="margin-bottom:0.5em;">${part.text.replace(/`([^`]+)`/g, '<code>$1</code>')}</div>`;
        } else if (part.type === 'code') {
            // Code block with syntax highlighting using CodeMirror run mode
            const codeId = 'ai-code-' + Math.random().toString(36).substr(2, 9);
            html += `
<div class="code-block" style="position:relative;margin-bottom:0.5em;">
    <pre id="${codeId}" class="cm-s-${part.language || 'default'}"></pre>
    <div style="display:flex;gap:0.5em; margin-top:0.5em;">
        <button class="btn btn-secondary" onclick="applyGeneratedCode(this.closest('.code-block'))"><i class="fas fa-code"></i> Apply</button>
        <button class="btn btn-secondary" onclick="copyToClipboard(this.closest('.code-block').innerText)"><i class="fas fa-copy"></i> Copy</button>
        ${showFixBtn ? `<button class="btn btn-secondary" onclick="aiFixError()"><i class="fas fa-wrench"></i> Fix Error</button>` : ''}
    </div>
</div>
<script>
if(window.CodeMirror && CodeMirror.runMode){
    setTimeout(function(){
        CodeMirror.runMode(${JSON.stringify(part.code)}, "${part.language || 'text'}", document.getElementById("${codeId}"));
    }, 0);
}
<\/script>
`;
        }
    });
    return html;
}

function addAiMessage(message, isTyping = true, showFixBtn = false) {
    const aiMessages = document.getElementById('aiMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message assistant';

    // Split message into parts (explanation/code)
    let parts = [];
    let regex = /```([a-z]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(message)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: 'explanation',
                text: message.substring(lastIndex, match.index)
            });
        }
        parts.push({
            type: 'code',
            language: match[1] || '',
            code: match[2].trim()
        });
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < message.length) {
        parts.push({
            type: 'explanation',
            text: message.substring(lastIndex)
        });
    }

    // Typing effect only for explanations, code blocks show instantly
    function typeExplanation(text, container, cursor, speed = 8, cb) {
        let i = 0;
        function type() {
            if (i < text.length) {
                if (text.charAt(i) === '<') {
                    const tagEnd = text.indexOf('>', i);
                    if (tagEnd !== -1) {
                        container.innerHTML += text.substring(i, tagEnd + 1);
                        i = tagEnd + 1;
                    } else {
                        container.innerHTML += text.charAt(i);
                        i++;
                    }
                } else {
                    container.innerHTML += text.charAt(i);
                    i++;
                }
                aiMessages.scrollTop = aiMessages.scrollHeight;
                setTimeout(type, speed);
            } else {
                if (cursor) cursor.remove();
                if (cb) cb();
            }
        }
        type();
    }

    let partIndex = 0;
    function showNextPart() {
        if (partIndex >= parts.length) return;
        const part = parts[partIndex];
        if (part.type === 'explanation') {
            const expDiv = document.createElement('div');
            expDiv.className = 'ai-explanation';
            expDiv.style.margin = '0.5em 0 0.5em 0';
            messageDiv.appendChild(expDiv);

            if (isTyping && document.getElementById('aiTypingAnimationToggle')?.checked) {
                const cursor = document.createElement('span');
                cursor.className = 'typing-cursor';
                expDiv.appendChild(cursor);
                typeExplanation(
                    part.text.replace(/`([^`]+)`/g, '<code>$1</code>'),
                    expDiv,
                    cursor,
                    8,
                    () => {
                        partIndex++;
                        showNextPart();
                    }
                );
            } else {
                expDiv.innerHTML = part.text.replace(/`([^`]+)`/g, '<code>$1</code>');
                partIndex++;
                showNextPart();
            }
        } else if (part.type === 'code') {
            // Code block with syntax highlighting
            const codeId = 'ai-code-' + Math.random().toString(36).substr(2, 9);
            const codeBlock = document.createElement('div');
            codeBlock.className = 'ai-advanced-code-block';
            codeBlock.style.position = 'relative';
            codeBlock.style.margin = '1em 0';

            codeBlock.innerHTML = `
<div class="ai-code-toolbar">
    <span class="ai-code-lang">${part.language ? part.language.toUpperCase() : 'CODE'}</span>
    <button class="btn btn-secondary" onclick="copyToClipboard(document.getElementById('${codeId}').innerText)"><i class="fas fa-copy"></i> Copy</button>
    <button class="btn btn-secondary" onclick="applyGeneratedCode(this.closest('.ai-advanced-code-block'))"><i class="fas fa-code"></i> Apply</button>
    ${showFixBtn ? `<button class="btn btn-secondary" onclick="aiFixError()"><i class="fas fa-wrench"></i> Fix Error</button>` : ''}
</div>
<pre id="${codeId}" class="cm-s-${part.language || 'default'} ai-code-content"></pre>
`;
            messageDiv.appendChild(codeBlock);
            setTimeout(function () {
                if (window.CodeMirror && CodeMirror.runMode) {
                    CodeMirror.runMode(part.code, part.language || 'text', document.getElementById(codeId));
                } else {
                    document.getElementById(codeId).textContent = part.code;
                }
            }, 0);
            partIndex++;
            showNextPart();
        }
    }

    aiMessages.appendChild(messageDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    showNextPart();
}
function extractTagContent(html, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let result = '';
    let match;
    while ((match = regex.exec(html)) !== null) {
        result += match[1] + '\n';
    }
    return result.trim();
}
// Handle code selection for AI
          function handleCodeSelection(cm) {
              if (!cm) return;
              
              // Clear previous selection highlights
              clearAiCodeHighlights();
              
              // Get the current selection
              const selection = cm.getSelection();
              if (!selection || selection.trim() === '') return;
              
              // Create selection markers with custom styling
              const from = cm.getCursor('from');
              const to = cm.getCursor('to');
              
              // Only add highlighting markers if there's a significant selection (more than a few chars)
              if (selection.length > 5) {
                  const marker = cm.markText(from, to, {
                      className: 'cm-ai-selection',
                      title: 'Right-click for AI options'
                  });
                  
                  aiCodeSelectionMarkers.push(marker);
                  aiCodeSelectionActive = true;
                  
                  // Store selection info
                  selectedCodeForAi = {
                      code: selection,
                      editor: getCurrentEditorName(),
                      from: from,
                      to: to
                  };
                  
                  // Show code hint (tooltip)
                  showCodeHint('Right-click for AI options or use AI panel', cm);
              }
          }
          
          // Show code hint tooltip
          function showCodeHint(message, cm) {
              const selection = cm.getSelection();
              if (!selection || selection.trim() === '') return;
              
              const hintEl = document.getElementById('codeHint');
              hintEl.textContent = message;
              
              // Position the hint near the selection
              const cursor = cm.getCursor('head');
              const cursorCoords = cm.cursorCoords(cursor, 'window');
              
              hintEl.style.left = (cursorCoords.left + 10) + 'px';
              hintEl.style.top = (cursorCoords.top - 30) + 'px';
              hintEl.style.display = 'block';
              
              // Hide after 2 seconds
              setTimeout(() => {
                  hintEl.style.display = 'none';
              }, 2000);
          }
          
          // Clear AI code highlights
          function clearAiCodeHighlights() {
              // Clear all markers
              aiCodeSelectionMarkers.forEach(marker => marker.clear());
              aiCodeSelectionMarkers = [];
              aiCodeSelectionActive = false;
              
              // Hide code hint
              document.getElementById('codeHint').style.display = 'none';
          }
          
          // Navigate to error

function navigateToError() {
    let cm = null;
    let line = null;
    let fileName = null;

    // Detect error line and file
    if (lastErrorType === "css" && lastErrorDetails) {
        const lineMatch = lastErrorDetails.match(/Line: (\d+)/i);
        if (lineMatch && lineMatch[1]) line = parseInt(lineMatch[1], 10) - 1;
        fileName = 'styles.css';
        selectTab('css', fileName);
        cm = editors.css;
    } else if (lastErrorType === "js" && lastErrorDetails) {
        const lineMatch = lastErrorDetails.match(/Row: (\d+)/i);
        if (lineMatch && lineMatch[1]) line = parseInt(lineMatch[1], 10) - 1;
        fileName = 'script.js';
        selectTab('js', fileName);
        cm = editors.js;
    } else if (lastErrorType === "html" && lastErrorDetails) {
        const lineMatch = lastErrorDetails.match(/Row (\d+)/i);
        if (lineMatch && lineMatch[1]) line = parseInt(lineMatch[1], 10) - 1;
        fileName = 'index.html';
        selectTab('html', fileName);
        cm = editors.html;
    }

    // Fallback: try to find error line in error message if not found
    if (line === null && lastErrorMessage) {
        const lineMatch = lastErrorMessage.match(/(?:Line|Row)[^\d]*(\d+)/i);
        if (lineMatch && lineMatch[1]) line = parseInt(lineMatch[1], 10) - 1;
    }

    // --- Debugging ---
    console.log({
        lastErrorType,
        lastErrorDetails,
        lastErrorMessage,
        line,
        cm,
        lineCount: cm ? cm.lineCount() : null,
        fileName
    });
    // -----------------

    // Highlight line if valid
    if (cm && line !== null && line >= 0 && line < cm.lineCount()) {
        cm.focus();
        cm.setCursor({ line, ch: 0 });

        // Remove previous error highlight if any
        if (typeof window._lastErrorLineHandle === 'number') {
            cm.removeLineClass(window._lastErrorLineHandle, 'background', 'error-line');
            window._lastErrorLineHandle = null;
        }

        window._lastErrorLineHandle = line;
        cm.addLineClass(line, 'background', 'error-line');

        setTimeout(() => {
            if (typeof window._lastErrorLineHandle === 'number') {
                cm.removeLineClass(window._lastErrorLineHandle, 'background', 'error-line');
                window._lastErrorLineHandle = null;
            }
        }, 2000);
    } else {
        showNotification('error', 'Go to Error', 'Cannot find error line to highlight!');
    }
}

          // Construct HTML for preview or new tab
          function constructPreviewHtml(htmlContent, cssContent, jsContent) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(htmlContent, 'text/html');

              // Check for parser errors
              const parserErrorNode = doc.querySelector('parsererror');
              if (parserErrorNode) {
                  let errorMessage = "HTML parsing ERROR.";
                  let errorLine = null;
                  const detailsText = parserErrorNode.textContent || parserErrorNode.innerText;

                  const lineMatch = detailsText.match(/line (\d+)/i);
                  if (lineMatch) {
                      errorLine = lineMatch[1];
                  }
                  
                  const messageMatch = detailsText.match(/Error: (.*)$/m) || detailsText.match(/error on line \d+ at column \d+: (.*)$/m);
                  if (messageMatch && messageMatch[1]) {
                      errorMessage = messageMatch[1].trim();
                  } else if (detailsText.trim()) {
                      errorMessage = detailsText.trim().split('\n')[0];
                  }
                  
                  let fullErrorMessage = `HTML ERROR: ${errorMessage}`;
                  if (errorLine) fullErrorMessage += ` (Row ${errorLine} Nearby)`;
                  console.warn("HTML parsing error detected by DOMParser:", detailsText, "Formatted:", fullErrorMessage);
                  throw new Error(fullErrorMessage);
              }
              
              // head and body are guaranteed to exist by DOMParser for 'text/html'
              const head = doc.head;
              const body = doc.body;
              
              // Add styles from CSS editor
              // Remove previously injected style tag to prevent duplication
              const oldInjectedStyle = head.querySelector('style#preview-injected-styles');
              if (oldInjectedStyle) {
                  oldInjectedStyle.remove();
              }
              
              if (cssContent.trim() !== '') {
                  const styleElement = doc.createElement('style');
                  styleElement.id = 'preview-injected-styles';
                  styleElement.textContent = cssContent;
                  head.appendChild(styleElement);
              }
              
              // Add script from JS editor
              // Remove previously injected script tag
              const oldInjectedScript = body.querySelector('script#preview-injected-script');
              if (oldInjectedScript) {
                  oldInjectedScript.remove();
              }
              
              if (jsContent.trim() !== '') {
                  const scriptElement = doc.createElement('script');
                  scriptElement.id = 'preview-injected-script';
                  scriptElement.textContent = jsContent;
                  body.appendChild(scriptElement);
              }
              
              return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
          }
          
          // This function will be called from the preview iframe on error
          window.handlePreviewError = function(message, source, lineno, colno, errorObject) {
    // If JS Editor is empty, ignore JS errors from preview
              return true;
          };

// Add this object at a suitable place, e.g., near the top of script.js
// It should store the initial content of your editors to compare against.
const initialEditorContent = {
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>Welcome to the VS Code-inspired editor!</p>
  <button id="demo-button">Click Me</button>
</body>
</html>`,
    css: `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

h1 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2980b9;
}`,
    js: `// JavaScript code
document.addEventListener('DOMContentLoaded', function() {
  const button = document.getElementById('demo-button');
  
  if (button) {
    button.addEventListener('click', function() {
      alert('Button clicked!');
    });
  }
  
  console.log('Script loaded successfully!');
});`
};

// Function to get and process content from editors
function getEditorContentDetails() {
    // Ensure htmlCodeMirror, cssCodeMirror, jsCodeMirror are accessible
    if (!editors.html || !editors.css || !editors.js) {
        console.error("CodeMirror instances not found.");
        return {
            html: { text: "", lines: 0, chars: 0 },
            css: { text: "", lines: 0, chars: 0 },
            js: { text: "", lines: 0, chars: 0 }
        };
    }

    let htmlFullContent = editors.html.getValue();
    let cssFullContent = editors.css.getValue();
    let jsFullContent = editors.js.getValue();

    // const isHtmlDefaultOrEmpty = htmlFullContent.trim() === '' || htmlFullContent.trim() === initialEditorContent.html.trim();
    // const isCssDefaultOrEmpty = cssFullContent.trim() === '' || cssFullContent.trim() === initialEditorContent.css.trim();
    // const isJsDefaultOrEmpty = jsFullContent.trim() === '' || jsFullContent.trim() === initialEditorContent.js.trim();

    let activeHtmlText = htmlFullContent;
    let activeCssText = cssFullContent;
    let activeJsText = jsFullContent;

    let htmlLineCount = htmlFullContent.trim() === '' ? 0 : editors.html.lineCount();
    let cssLineCount = cssFullContent.trim() === '' ? 0 : editors.css.lineCount();
    let jsLineCount = jsFullContent.trim() === '' ? 0 : editors.js.lineCount();

    // Single Page Application (SPA) like scenario: CSS/JS might be in HTML editor
    if (activeCssText === "" && activeJsText === "" && activeHtmlText !== "") {
        let extractedCss = "";
        const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        let matchStyle;
        let tempHtmlForStyle = activeHtmlText;
        while ((matchStyle = styleRegex.exec(tempHtmlForStyle)) !== null) {
            extractedCss += matchStyle[1];
        }

        let extractedJs = "";
        const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
        let matchScript;
        let tempHtmlForScript = activeHtmlText;
        while ((matchScript = scriptRegex.exec(tempHtmlForScript)) !== null) {
            extractedJs += matchScript[1];
        }

        if (extractedCss.trim() !== "" || extractedJs.trim() !== "") {
            activeCssText = extractedCss.trim();
            activeJsText = extractedJs.trim();
            
            let pureHtml = activeHtmlText;
            pureHtml = pureHtml.replace(styleRegex, ''); 
            pureHtml = pureHtml.replace(scriptRegex, '');
            activeHtmlText = pureHtml.trim();

            cssLineCount = (activeCssText.match(/\n/g) || []).length + (activeCssText.length > 0 ? 1 : 0);
            jsLineCount = (activeJsText.match(/\n/g) || []).length + (activeJsText.length > 0 ? 1 : 0);
            htmlLineCount = (activeHtmlText.match(/\n/g) || []).length + (activeHtmlText.length > 0 ? 1 : 0);
        }
    }

    return {
        html: { text: activeHtmlText, lines: activeHtmlText ? htmlLineCount : 0, chars: activeHtmlText.length },
        css: { text: activeCssText, lines: activeCssText ? cssLineCount : 0, chars: activeCssText.length },
        js: { text: activeJsText, lines: activeJsText ? jsLineCount : 0, chars: activeJsText.length }
    };
}

function showMappingModal() {
    const content = getEditorContentDetails();

    const totalChars = content.html.chars + content.css.chars + content.js.chars;

    const htmlPercent = totalChars > 0 ? (content.html.chars / totalChars) * 100 : 0;
    const cssPercent = totalChars > 0 ? (content.css.chars / totalChars) * 100 : 0;
    const jsPercent = totalChars > 0 ? (content.js.chars / totalChars) * 100 : 0;

    document.getElementById('htmlPercentage').textContent = htmlPercent.toFixed(1);
    document.getElementById('htmlBar').style.width = htmlPercent + '%';
    document.getElementById('cssPercentage').textContent = cssPercent.toFixed(1);
    document.getElementById('cssBar').style.width = cssPercent + '%';
    document.getElementById('jsPercentage').textContent = jsPercent.toFixed(1);
    document.getElementById('jsBar').style.width = jsPercent + '%';

    // HTML Stats
    document.getElementById('htmlCharCount').textContent = content.html.chars;
    document.getElementById('htmlLineCount').textContent = content.html.lines;
    const htmlTagCount = (content.html.text.match(/<\w+(?:\s+[^>]*)?>/g) || []).length; // Counts opening tags
    document.getElementById('htmlTagCount').textContent = htmlTagCount;

    // CSS Stats
    document.getElementById('cssCharCount').textContent = content.css.chars;
    document.getElementById('cssLineCount').textContent = content.css.lines;
    const cssRuleCount = (content.css.text.match(/\{[\s\S]*?\}/g) || []).length; // Approx. counts rule blocks
    document.getElementById('cssRuleCount').textContent = cssRuleCount;

    // JavaScript Stats
    document.getElementById('jsCharCount').textContent = content.js.chars;
    document.getElementById('jsLineCount').textContent = content.js.lines;
    // A more inclusive regex for various function definitions
    const jsFuncRegex = /(function\s+\w*\s*\(|const\s+\w+\s*=\s*function\s*\(|let\s+\w+\s*=\s*function\s*\(|var\s+\w+\s*=\s*function\s*\(|\w+\s*:\s*function\s*\(|=>\s*\{|=\s*\([^)]*\)\s*=>|=\s*\w+\s*=>)/g;
    const jsFuncCount = (content.js.text.match(jsFuncRegex) || []).length;
    document.getElementById('jsFuncCount').textContent = jsFuncCount;
    
    showModal('mappingModal'); // Changed openModal to showModal
}

// Make sure you have a generic openModal and closeModal function like this:
// function openModal(modalId) {
//     const modal = document.getElementById(modalId);
//     if (modal) {
//         modal.style.display = 'flex'; // Or 'block' depending on your modal CSS
//     }
// }

// function closeModal(modalId) {
//     const modal = document.getElementById(modalId);
//     if (modal) {
//         modal.style.display = 'none';
//     }
// }

// Ensure CodeMirror instances are globally accessible, e.g., window.htmlCodeMirror
// This is often done in the editor initialization part of your script.
// Example:
// window.htmlCodeMirror = CodeMirror.fromTextArea(...);
// window.cssCodeMirror = CodeMirror.fromTextArea(...);
// window.jsCodeMirror = CodeMirror.fromTextArea(...);


function minimalJsSyntaxCheck(jsCode) {
    let open = 0, close = 0, lineNum = 1;
    for (let i = 0; i < jsCode.length; i++) {
        if (jsCode[i] === '{') open++;
        if (jsCode[i] === '}') close++;
        if (jsCode[i] === '\n') lineNum++;
    }
    if (open !== close) return `Unbalanced curly braces detected. Row: ${lineNum}`;
    return null;
}
function minimalCssSyntaxCheck(cssCode) {
    const lines = cssCode.split('\n');
    let open = 0, close = 0;
    for (let i = 0; i < lines.length; i++) {
        for (let char of lines[i]) {
            if (char === '{') open++;
            if (char === '}') close++;
        }
        if (open < close) {
            return `Unbalanced curly braces detected. Line: ${i + 1}`;
        }
    }
    if (open !== close) {
        return `Unbalanced curly braces detected. Line: ${lines.length}`;
    }
    return null;
}

          function updatePreview() {
              jsErrorInPreviewOccurred = false;
              const finalHtml = constructPreviewHtml(editors.html.getValue(), editors.css.getValue(), editors.js.getValue());
              
              const previewFrame = document.getElementById('previewFrame');
              if (!previewFrame || !previewFrame.contentWindow) {
                  console.error("Preview frame or its window is not accessible.");
                  const statusIndicator = document.querySelector('.status-indicator');
                  statusIndicator.style.backgroundColor = 'var(--error)';
                  statusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Preview error';
                  return;
              }
              
              const previewWindow = previewFrame.contentWindow;
              const previewDocument = previewWindow.document;

              previewDocument.open();
              
              // Inject the onerror handler into the iframe's content
              previewDocument.write(`
                  <script>
                      window.onerror = function(message, source, lineno, colno, error) {
                          if (window.parent && window.parent.handlePreviewError) {
                              window.parent.handlePreviewError(message, source, lineno, colno, error);
                          } else {
                              // Fallback if parent communication is somehow broken
                              if(document.body) document.body.innerHTML = '<div style="color:red; padding:10px; border:1px solid red; font-family:monospace;">JS Error: ' + message + ' at line ' + lineno + '</div>';
                          }
                          return true; // Suppress default browser error console
                      };
                  <\/script>
              `);
              
              previewDocument.write(finalHtml);
              previewDocument.close();
          }

          function refreshPreview() {
              safeUpdatePreview();
          }

          // Safe preview update with error handling
function safeUpdatePreview() {
    const statusIndicator = document.querySelector('.status-indicator');
    lastErrorType = null;
    lastErrorMessage = '';
    lastErrorDetails = '';

    // HTML Error Check (with HTMLHint)
    const htmlCode = editors.html.getValue();
    if (htmlCode.trim() === '') return;
    if (typeof HTMLHint !== 'undefined') {
        const htmlResults = HTMLHint.verify(htmlCode);
        if (htmlResults && htmlResults.length > 0) {
            // ...existing code...
        }
    }

    // ---- Minimal JS syntax check ----
    const jsCode = editors.js.getValue();
    const jsSyntaxError = minimalJsSyntaxCheck(jsCode);
    if (jsSyntaxError) {
        lastErrorType = "js";
        lastErrorMessage = jsSyntaxError;
        lastErrorDetails = "";
        statusIndicator.style.backgroundColor = 'var(--error)';
        statusIndicator.innerHTML = '<i class="fa-solid fa-bug"></i> JS error';
        showErrorModal(lastErrorMessage, lastErrorDetails);
        return;
    }

    try {
        updatePreview();
        statusIndicator.style.backgroundColor = 'var(--success)';
        statusIndicator.innerHTML = '<i class="fa-solid fa-play"></i> Live';
    } catch (error) {
        lastErrorType = "html";
        lastErrorMessage = error.message || "HTML Error";
        lastErrorDetails = error.stack || "";
        statusIndicator.style.backgroundColor = 'var(--error)';
        statusIndicator.innerHTML = '<i class="fa-solid fa-bug"></i> HTML error';
        showErrorModal(lastErrorMessage, lastErrorDetails);
    }
    // ---- Minimal CSS syntax check ----
const cssCode = editors.css.getValue();
const cssSyntaxError = minimalCssSyntaxCheck(cssCode);
if (cssSyntaxError) {
    lastErrorType = "css";
    lastErrorMessage = cssSyntaxError;
    lastErrorDetails = "";
    statusIndicator.style.backgroundColor = 'var(--error)';
    statusIndicator.innerHTML = '<i class="fa-solid fa-bug"></i> CSS error';
    showErrorModal(lastErrorMessage, lastErrorDetails);
    return;
}

    saveCurrentContent();
}

function mapLocalResourcesToBlobUrls(htmlContent, files) {
    // Map: filename -> Blob URL
    const blobMap = {};
    for (const file of files) {
        if (/\.(png|jpe?g|gif|bmp|svg|webp|pdf|mp3|mp4|wav|ogg|webm)$/i.test(file.name)) {
            blobMap[file.name] = URL.createObjectURL(file);
        }
    }
    // Replace <img src="..."> and <a href="..."> with Blob URLs if local
    htmlContent = htmlContent.replace(/<(img|a)[^>]+(src|href)=["']([^"']+)["'][^>]*>/gi, (match, tag, attr, val) => {
        const fileName = val.split('/').pop();
        if (blobMap[fileName]) {
            return match.replace(val, blobMap[fileName]);
        }
        return match;
    });
    return htmlContent;
}
          

          // Extract body content from HTML
          function extractBodyContent(htmlString) {
              const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
              if (bodyMatch && bodyMatch[1]) {
                  return bodyMatch[1].trim();
              }

              let content = htmlString;
              content = content.replace(/<!DOCTYPE[^>]*>/gi, '');
              content = content.replace(/<html[^>]*>/gi, '');
              content = content.replace(/<\/html>/gi, '');
              content = content.replace(/<head[^>]*>.*?<\/head>/gis, '');
              content = content.replace(/<body[^>]*>/gi, ''); 
              content = content.replace(/<\/body>/gi, '');
              return content.trim();
          }

          // Save current content to memory
          function saveCurrentContent() {
              const content = {
                  html: editors.html.getValue(),
                  css: editors.css.getValue(),
                  js: editors.js.getValue()
              };
              projects[currentProject] = content;
              document.getElementById('autoSaveStatus').textContent = 'Auto-saved';
          }

          // Load saved content from memory
          function loadSavedContent() {
              if (projects[currentProject]) {
                  const content = projects[currentProject];
                  editors.html.setValue(content.html || '');
                  editors.css.setValue(content.css || '');
                  editors.js.setValue(content.js || '');
              }
          }

          function openFile() {
              document.getElementById('fileInput').click();
          }

          function openFolder() {
              document.getElementById('folderInput').click();
          }

          async function handleFolderUpload(event) {
              const files = event.target.files;
              if (!files.length) return;

              editors.html.setValue('');
              editors.css.setValue('');
              editors.js.setValue('');

              let htmlFile, cssFile, jsFile;

              for (const file of files) {
                  const fileName = file.name.toLowerCase();
                  if (fileName === 'index.html' && !htmlFile) htmlFile = file;
                  else if ((fileName === 'style.css' || fileName === 'styles.css') && !cssFile) cssFile = file;
                  else if ((fileName === 'script.js' || fileName === 'main.js') && !jsFile) jsFile = file;
              }

              if (!htmlFile) htmlFile = Array.from(files).find(f => f.name.toLowerCase().endsWith('.html'));
              if (!cssFile) cssFile = Array.from(files).find(f => f.name.toLowerCase().endsWith('.css'));
              if (!jsFile) jsFile = Array.from(files).find(f => f.name.toLowerCase().endsWith('.js'));

              const readFileContent = (file) => new Promise((resolve, reject) => {
                  if (!file) { resolve(''); return; }
                  const reader = new FileReader();
                  reader.onload = (e) => resolve(e.target.result);
                  reader.onerror = reject;
                  reader.readAsText(file);
              });

              const fileExplorer = document.getElementById('fileExplorer');
              fileExplorer.innerHTML = '';

              if (htmlFile) { 
                  editors.html.setValue(await readFileContent(htmlFile)); 
                  createFileExplorer(htmlFile.name, 'html', true); 
              } else { 
                  createFileExplorer('index.html', 'html', true); 
              }
              
              if (cssFile) { 
                  editors.css.setValue(await readFileContent(cssFile)); 
                  createFileExplorer(cssFile.name, 'css', true); 
              } else { 
                  createFileExplorer('styles.css', 'css', true); 
              }
              
              if (jsFile) { 
                  editors.js.setValue(await readFileContent(jsFile)); 
                  createFileExplorer(jsFile.name, 'js', true); 
              } else { 
                  createFileExplorer('script.js', 'js', true); 
              }

              Array.from(files)
                  .filter(f => f !== htmlFile && f !== cssFile && f !== jsFile)
                  .forEach(f => createFileExplorer(f.webkitRelativePath || f.name, getFileType(f.name), false));
              
              selectTab('html');
              safeUpdatePreview();
          }

          function handleFileOpen(event) {
              const file = event.target.files[0];
              if (file) {
                  const reader = new FileReader();
                  reader.onload = function(e) {
                      const content = e.target.result;
                      const fileExtension = file.name.split('.').pop().toLowerCase();
                      
                      switch(fileExtension) {
                          case 'html':
                              editors.html.setValue(content);
                              selectTab('html');
                              break;
                          case 'css':
                              editors.css.setValue(content);
                              selectTab('css');
                              break;
                          case 'js':
                              editors.js.setValue(content);
                              selectTab('js');
                              break;
                          case 'txt':
                              editors[currentTab].setValue(content);
                              break;
                      }
                      safeUpdatePreview();
                  };
                  reader.readAsText(file);
              }
          }

          function saveFile() {
              const content = editors[currentTab].getValue();
              const fileName = prompt(`Save as (include extension):`, `file.${currentTab}`);
              
              if (fileName) {
                  downloadFile(content, fileName);
                  document.getElementById('autoSaveStatus').textContent = 'Saved';
              }
          }

          function combineAndExport() {
              const htmlBodyToEmbed = extractBodyContent(editors.html.getValue());
              const cssContent = editors.css.getValue();
              const jsContent = editors.js.getValue();
              
              const combinedContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Combined Document</title>
    <style>
${cssContent}
    </style>
</head>
<body>
${htmlBodyToEmbed}
    <script>
${jsContent}
    <\/script>
</body>
</html>`;
              
              const fileName = prompt('Save combined file as:', 'combined.html');
              if (fileName) {
                  downloadFile(combinedContent, fileName);
              }
          }

          function downloadFile(content, fileName) {
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              a.click();
              URL.revokeObjectURL(url);
          }

         function openPreviewInNewTab() {
    const htmlInput = editors.html.getValue();
    const cssInput = editors.css.getValue();
    const jsInput = editors.js.getValue();

    // ==== Get uploaded files from input[type="file"] ====
    const folderInput = document.getElementById('folderInput');
    const files = folderInput && folderInput.files ? Array.from(folderInput.files) : [];

    // ==== Map local images/files to Blob URLs ====
    const processedHtml = mapLocalResourcesToBlobUrls(htmlInput, files);

    // ==== මෙහිදී processedHtml යොදන්න ====
    const finalHtml = constructPreviewHtml(processedHtml, cssInput, jsInput);

    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(finalHtml);
        newWindow.document.close();
    } else {
        alert('Failed to open new tab. Please check your browser pop-up settings.');
    }
}

          // Theme management
          function changeTheme(theme) {
              currentTheme = theme;
              applyTheme(theme);
          }

          function applyTheme(theme) {
              document.body.classList.toggle('light-theme', theme === 'light');
              document.getElementById('themeSelect').value = theme;
              
              // Update CodeMirror theme
              const cmTheme = theme === 'dark' ? 'dracula' : 'default';
              editors.html.setOption('theme', cmTheme);
              editors.css.setOption('theme', cmTheme);
              editors.js.setOption('theme', cmTheme);
          }

          function changeEditorTheme(theme) {
              const themeMap = {
                  'default': 'default',
                  'dracula': 'dracula',
                  'material': 'material',
                  'monokai': 'monokai'
              };
              
              const cmTheme = themeMap[theme] || 'dracula';
              editors.html.setOption('theme', cmTheme);
              editors.css.setOption('theme', cmTheme);
              editors.js.setOption('theme', cmTheme);
          }

          function changeFontSize(size) {
             document.querySelectorAll('.CodeMirror').forEach(cmElem => {
                cmElem.style.fontSize = size + 'px';
             });
          }
          
          // UI controls
          function toggleSidebar() {
              document.getElementById('sidebar').classList.toggle('collapsed');
          }

          function togglePreviewFullscreen() {
              const previewPanel = document.querySelector('.preview-panel');
              const editorPanel = document.querySelector('.editor-panel');
              
              if (previewPanel.classList.contains('fullscreen')) {
                  previewPanel.classList.remove('fullscreen');
                  editorPanel.style.display = 'flex';
              } else {
                  previewPanel.classList.add('fullscreen');
                  editorPanel.style.display = 'none';
              }
          }
          
          // File explorer
          function createFileExplorer(fileName, type, isEditableMainTab) {
              const fileExplorer = document.getElementById('fileExplorer');
              const fileItem = document.createElement('div');
              fileItem.className = 'file-item';

              let icon = '<i class="fa-solid fa-laptop-code"></i>';
              if (type === 'html') icon = '<i class="fa-brands fa-html5"></i>';
              else if (type === 'css') icon = '<i class="fa-solid fa-file-code"></i>';
              else if (type === 'js') icon = '<i class="fa-brands fa-node-js"></i>';

              fileItem.innerHTML = `${icon} ${fileName.split('/').pop()}`;
              fileItem.title = fileName;
              fileItem.dataset.fileName = fileName;
              fileItem.dataset.fileType = type;

              if (isEditableMainTab && ['html', 'css', 'js'].includes(type)) {
                  fileItem.onclick = () => selectTab(type);
              } else {
                  fileItem.style.cursor = 'default';
              }
              fileExplorer.appendChild(fileItem);
          }

          function getFileType(fileName) {
              const extension = fileName.split('.').pop().toLowerCase();
              return ['html', 'css', 'js'].includes(extension) ? extension : 'html';
          }

          // Status bar
          function updateStatusBar() {
              const editor = editors[currentTab];
              const content = editor.getValue();
              const lines = content.split('\n').length;
              const chars = content.length;
              
              document.getElementById('lineCount').textContent = `📃 Lines: ${lines}`;
              document.getElementById('charCount').textContent = `🔢 Characters: ${chars}`;
              document.getElementById('currentLang').textContent = `🔣 Language: ${currentTab.toUpperCase()}`;
          }
          
          // Notifications
          function showNotification(type, title, message) {
              const notifId = type + 'Notification';
              const notif = document.getElementById(notifId) || document.getElementById('successNotification');
              
              if (notif) {
                  notif.querySelector('.notification-title').textContent = title;
                  notif.querySelector('.notification-message').textContent = message;
                  notif.classList.add('show');
                  
                  // Auto-hide after 3 seconds
                  setTimeout(() => {
                      hideNotification(notifId);
                  }, 3000);
              }
          }
          
          function hideNotification(notifId) {
              const notif = document.getElementById(notifId);
              if (notif) notif.classList.remove('show');
          }

          // Keyboard shortcuts
          function setupKeyboardShortcuts() {
              document.addEventListener('keydown', function(e) {
                  // Ctrl+S - Save
                  if (e.ctrlKey && e.key === 's') {
                      e.preventDefault();
                      saveFile();
                  }
                  // Ctrl+O - Open
                  else if (e.ctrlKey && e.key === 'o') {
                      e.preventDefault();
                      openFile();
                  }
                  // Ctrl+N - New
                  else if (e.ctrlKey && e.key === 'n') {
                      e.preventDefault();
                      newFile();
                  }
                  // Ctrl+Shift+C - Combine
                  else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                      e.preventDefault();
                      combineAndExport();
                  }
                  // Ctrl+L - Switch Theme
                  else if (e.ctrlKey && e.key === 'l') {
                      e.preventDefault();
                      toggleTheme();
                  }
                  // Ctrl+B - Toggle Sidebar
                  else if (e.ctrlKey && e.key === 'b') {
                      e.preventDefault();
                      toggleSidebar();
                  }
                  // Ctrl+J - Toggle AI Assistant
                  else if (e.ctrlKey && e.key === 'j') {
                      e.preventDefault();
                      toggleAiAssistant(true);
                  }
                  // F1 - Help
                  else if (e.key === 'F1') {
                      e.preventDefault();
                      showHelp();
                  }
              });
          }

          // Close modals when clicking outside
          window.addEventListener('click', function(e) {
              if (e.target.classList.contains('modal')) {
                  e.target.classList.remove('show');
              }
          });
          
          // AI Assistant Functions
          function toggleAiAssistant(focusInput = false) {
              const aiAssistant = document.getElementById('aiAssistant');
              const aiToggle = document.getElementById('aiToggle');
              
              if (aiAssistant.classList.contains('show')) {
                  aiAssistant.classList.remove('show');
                  aiToggle.classList.remove('active');
                  isAiAssistantOpen = false;
              } else {
                  aiAssistant.classList.add('show');
                  aiToggle.classList.add('active');
                  isAiAssistantOpen = true;
                  
                  if (focusInput) {
                      setTimeout(() => {
                          document.getElementById('aiInput').focus();
                      }, 300);
                  }
              }
          }
          window.toggleAiAssistant = toggleAiAssistant;
          
          function autoResizeTextarea(textarea) {
              textarea.style.height = 'auto';
              textarea.style.height = (textarea.scrollHeight) + 'px';
          }
          
          function aiAction(action) {
              // Get selected code if any
              const editor = getCurrentEditor();
              const selectedCode = editor ? editor.getSelection() : '';
              const editorType = getCurrentEditorName();
              
              switch (action) {
                  case 'explain':
                      explainSelectedCode(selectedCode || editor.getValue());
                      break;
                  case 'fix':
                      fixSelectedCode(selectedCode || editor.getValue());
                      break;
                  case 'optimize':
                      optimizeSelectedCode(selectedCode || editor.getValue());
                      break;
                  case 'generate':
                      showGenerateCodeDialog();
                      break;
                  case 'complete':
                      completeCurrentCode();
                      break;
              }
          }
          
          function explainSelectedCode(code) {
              if (!code.trim()) {
                  showNotification('error', 'Error', 'No code selected to explain.');
                  return;
              }
              
              // Open AI Assistant if not already open
              if (!isAiAssistantOpen) toggleAiAssistant();
              
              // Add the selected code to the AI chat
              addAiSelectedCodeMessage(code, 'Explain this code:');
              
              // Prepare the prompt
              const prompt = `Explain this ${getCurrentEditorName().toUpperCase()} code in detail:
${code}

Provide a clear and thorough explanation of what this code does, how it works, and highlight any important patterns or concepts used.`;
              
              // Send to AI
              sendAiMessage(prompt, true);
          }
          
          function fixSelectedCode(code) {
              if (!code.trim()) {
                  showNotification('error', 'Error', 'No code selected to fix.');
                  return;
              }
              
              // Open AI Assistant if not already open
              if (!isAiAssistantOpen) toggleAiAssistant();
              
              // Add the selected code to the AI chat
              addAiSelectedCodeMessage(code, 'Fix this code:');
              
              // Prepare the prompt
              const prompt = `Fix any bugs or issues in this ${getCurrentEditorName().toUpperCase()} code:
${code}

Identify any bugs, errors, or potential issues and provide the corrected version with explanations of what was wrong and how you fixed it.`;
              
              // Send to AI
              sendAiMessage(prompt, true);
          }
          
          function optimizeSelectedCode(code) {
              if (!code.trim()) {
                  showNotification('error', 'Error', 'No code selected to optimize.');
                  return;
              }
              
              // Open AI Assistant if not already open
              if (!isAiAssistantOpen) toggleAiAssistant();
              
              // Add the selected code to the AI chat
              addAiSelectedCodeMessage(code, 'Optimize this code:');
              
              // Prepare the prompt
              const prompt = `Optimize this ${getCurrentEditorName().toUpperCase()} code for better performance, readability, and best practices:
${code}

Provide an optimized version of the code with explanations of the improvements made.`;
              
              // Send to AI
              sendAiMessage(prompt, true);
          }
          
          function showGenerateCodeDialog() {
              const codeToGenerate = prompt('What kind of code would you like to generate?', 'A responsive navigation menu with dropdown');
              if (!codeToGenerate) return;
              
              // Open AI Assistant if not already open
              if (!isAiAssistantOpen) toggleAiAssistant();
              
              // Add the user request to the AI chat
              addUserMessage(`Generate code: ${codeToGenerate}`);
              
              // Prepare the prompt
              const prompt = `Generate ${getCurrentEditorName().toUpperCase()} code for: ${codeToGenerate}

Provide well-commented, clean code that follows best practices. Include a brief explanation of how the code works.`;
              
              // Send to AI
              sendAiMessage(prompt, true);
          }
          
          function completeCurrentCode() {
              const editor = getCurrentEditor();
              if (!editor) return;
              
              // Get code up to cursor
              const cursor = editor.getCursor();
              const codeUpToCursor = editor.getRange({line: 0, ch: 0}, cursor);
              
              if (!codeUpToCursor.trim()) {
                  showNotification('error', 'Error', 'Position your cursor where you want code completion.');
                  return;
              }
              
              // Open AI Assistant if not already open
              if (!isAiAssistantOpen) toggleAiAssistant();
              
              // Add the partial code to the AI chat
              addAiSelectedCodeMessage(codeUpToCursor, 'Complete this code:');
              
              // Prepare the prompt
              const prompt = `Complete this ${getCurrentEditorName().toUpperCase()} code:
${codeUpToCursor}

Continue the code from where it ends, maintaining the same style and functionality. Provide just the continuation code that would make sense here.`;
              
              // Send to AI
              sendAiMessage(prompt, true);
          }
          
          function getCurrentEditor() {
              return editors[currentTab];
          }
          
          function getCurrentEditorName() {
              return currentTab;
          }
          
          function addUserMessage(message) {
              const aiMessages = document.getElementById('aiMessages');
              const messageDiv = document.createElement('div');
              messageDiv.className = 'ai-message user';
              messageDiv.textContent = message;
              aiMessages.appendChild(messageDiv);
              aiMessages.scrollTop = aiMessages.scrollHeight;
          }
          
          function addAiSelectedCodeMessage(code, title) {
              const aiMessages = document.getElementById('aiMessages');
              
              // Create container for selected code
              const codeContainer = document.createElement('div');
              codeContainer.className = 'ai-selected-code';
              
              // Add header with title and actions
              const header = document.createElement('div');
              header.className = 'ai-selected-code-header';
              header.innerHTML = `
                  <span>${title}</span>
                  <div class="ai-code-actions">
                      <span class="ai-code-action" onclick="applyGeneratedCode(this.parentNode.parentNode.parentNode)">Apply</span>
                      <span class="ai-code-action" onclick="copyToClipboard(this.parentNode.parentNode.parentNode.textContent.trim())">Copy</span>
                  </div>
              `;
              
              // Add the code
              const codeContent = document.createElement('code');
              codeContent.textContent = code;
              
              // Assemble and add to messages
              codeContainer.appendChild(header);
              codeContainer.appendChild(codeContent);
              aiMessages.appendChild(codeContainer);
              aiMessages.scrollTop = aiMessages.scrollHeight;
              
              // Add user message about the selected code
              addUserMessage(`${title} ${code.length > 50 ? code.substring(0, 50) + '...' : code}`);
          }
          
          function formatAiMessage(message) {
              // Replace code blocks with styled divs
              let formattedMessage = message.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<div class="code-block"><pre>$2</pre></div>');
              
              // Handle inline code
              formattedMessage = formattedMessage.replace(/`([^`]+)`/g, '<code>$1</code>');
              
              return formattedMessage;
          }
          
          function simulateTyping(text, element, cursor, speed = 10) {
              let i = 0;
              aiTypingAnimationActive = true;
              
              function type() {
                  if (i < text.length) {
                      // Handle HTML tags in the formatted message
                      if (text.charAt(i) === '<') {
                          // Find the end of the tag
                          const tagEnd = text.indexOf('>', i);
                          if (tagEnd !== -1) {
                              element.innerHTML += text.substring(i, tagEnd + 1);
                              i = tagEnd + 1;
                          } else {
                              element.innerHTML += text.charAt(i);
                              i++;
                          }
                      } else {
                          element.innerHTML += text.charAt(i);
                          i++;
                      }
                      
                      // Scroll to bottom as typing occurs
                      const aiMessages = document.getElementById('aiMessages');
                      aiMessages.scrollTop = aiMessages.scrollHeight;
                      
                      // Continue typing
                      setTimeout(type, speed);
                  } else {
                      // Typing complete
                      cursor.remove();
                      aiTypingAnimationActive = false;
                  }
              }
              
              type();
          }
          
          function applyGeneratedCode(codeElement) {
    if (!codeElement) return;
    let code = '';
    const pre = codeElement.querySelector('pre');
    if (pre) code = pre.innerText;
    else if (codeElement.querySelector('code')) code = codeElement.querySelector('code').textContent;
    else return;

    const editor = getCurrentEditor();
    if (editor && code) {
        if (editor.somethingSelected()) {
            editor.replaceSelection(code);
        } else {
            const cursor = editor.getCursor();
            editor.replaceRange(code, cursor);
        }
        showNotification('success', 'Code Applied', 'Generated code has been applied to the editor.');
    }
}
          
          function copyToClipboard(text) {
              navigator.clipboard.writeText(text).then(
                  () => showNotification('success', 'Copied', 'Code copied to clipboard.'),
                  () => showNotification('error', 'Error', 'Failed to copy code.')
              );
          }
          
          function sendAiMessage(customPrompt = null, isSystem = false) {
              const inputEl = document.getElementById('aiInput');
              let message = customPrompt || inputEl.value.trim();
              
              if (!message) return;
              
              // Clear input if it's a user message
              if (!isSystem) {
                  addUserMessage(message);
                  inputEl.value = '';
                  inputEl.style.height = 'auto';
              }
              
              // Show loading state
              addAiMessage('Thinking...', false);
              
              // Prepare context if needed
              let contextInfo = '';
              if (!customPrompt) {
                  // Include current editor and code context for general questions
                  contextInfo = `
Current editor: ${getCurrentEditorName().toUpperCase()}
Current code sample: 
\`\`\`
${getCurrentEditor().getValue().substring(0, 500)}${getCurrentEditor().getValue().length > 500 ? '...' : ''}
\`\`\`
`;
              }
              
              // Send to AI API
              fetch(API_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      contents: [{ parts: [{ text: contextInfo + message }] }]
                  })
              })
              .then(response => response.json())
              .then(data => {
                  // Remove the "Thinking..." message
                   const aiMessages = document.getElementById('aiMessages');
        if (aiMessages.lastChild && aiMessages.lastChild.textContent === 'Thinking...') {
            aiMessages.removeChild(aiMessages.lastChild);
        }

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    const aiResponse = data.candidates[0].content.parts[0].text;
    const isFix = customPrompt && /fix/i.test(customPrompt);
            addAiMessage(aiResponse, true, isFix);
                      
                      // Check if response contains code we can insert
                      const codeBlocks = extractCodeBlocks(aiResponse);
                      if (codeBlocks.length > 0) {
                          // Get the longest code block as the main suggestion
                          const mainCodeBlock = codeBlocks.reduce((longest, current) => 
                              current.code.length > longest.code.length ? current : longest, codeBlocks[0]);
                          
                          // Create a button to apply the code
                          const applyBtn = document.createElement('button');
                          applyBtn.className = 'btn';
                          applyBtn.innerHTML = '<i class="fas fa-code"></i> Apply Code to Editor';
                          applyBtn.style.marginTop = '10px';
                          applyBtn.onclick = () => {
                              const editor = getCurrentEditor();
                              
                              // Apply with typing animation if enabled
                              if (document.getElementById('aiTypingAnimationToggle').checked) {
                                  insertCodeWithTypingAnimation(editor, mainCodeBlock.code);
                              } else {
                                  if (editor.somethingSelected()) {
                                      editor.replaceSelection(mainCodeBlock.code);
                                  } else {
                                      const cursor = editor.getCursor();
                                      editor.replaceRange(mainCodeBlock.code, cursor);
                                  }
                              }
                              
                              showNotification('success', 'Code Applied', 'AI generated code has been applied to the editor.');
                          };
                          
                          // Add the button to the message container
                          aiMessages.appendChild(applyBtn);
                          aiMessages.scrollTop = aiMessages.scrollHeight;
                      }
                  } else {
                      addAiMessage('Sorry, I encountered an error generating a response.', false);
                  }
              })
              .catch(error => {
                  // Remove the "Thinking..." message
                  const aiMessages = document.getElementById('aiMessages');
                  if (aiMessages.lastChild && aiMessages.lastChild.textContent === 'Thinking...') {
                      aiMessages.removeChild(aiMessages.lastChild);
                  }
                  
                  console.error('AI API error:', error);
                  addAiMessage('Sorry, there was an error connecting to the AI service. Please try again later.', false);
              });
          }
          
          function extractCodeBlocks(text) {
              const codeBlocks = [];
              const regex = /```([a-z]*)\n([\s\S]*?)```/g;
              let match;
              
              while ((match = regex.exec(text)) !== null) {
                  codeBlocks.push({
                      language: match[1] || 'text',
                      code: match[2].trim()
                  });
              }
              
              return codeBlocks;
          }
          
          function insertCodeWithTypingAnimation(editor, code, speed = 2) {
              // If there's a selection, replace it
              const hasSelection = editor.somethingSelected();
              const selectionRange = hasSelection ? 
                  { from: editor.getCursor('from'), to: editor.getCursor('to') } : 
                  { from: editor.getCursor(), to: editor.getCursor() };
              
              if (hasSelection) {
                  editor.replaceSelection('');
              }
              
              const cursor = editor.getCursor();
              let i = 0;
              
              function typeNextChar() {
                  if (i < code.length) {
                      // Handle special cases like newlines and tabs
                      if (code.charAt(i) === '\n') {
                          editor.replaceRange('\n', editor.getCursor());
                      } else if (code.charAt(i) === '\t') {
                          editor.replaceRange('    ', editor.getCursor()); // 4 spaces for a tab
                      } else {
                          editor.replaceRange(code.charAt(i), editor.getCursor());
                      }
                      
                      i++;
                      setTimeout(typeNextChar, speed);
                  }
              }
              
              typeNextChar();
          }
          
          function checkCodeForAiAssistance(editor) {
              // Skip if AI auto features are disabled
              if (!document.getElementById('aiAutoCompletionToggle').checked) return;
              
              // Get code and cursor position
              const cursor = editor.getCursor();
              const line = editor.getLine(cursor.line);
              const lineUpToCursor = line.substring(0, cursor.ch);
              
              // Detect if we should offer auto-completion
              // For example, if user has typed several characters of a function name
              const lastWord = lineUpToCursor.match(/[a-zA-Z0-9_]+$/);
              
              if (lastWord && lastWord[0].length >= 3) {
                  // Consider offering completion for longer words
                  // This is just a placeholder for where you'd implement more sophisticated completion logic
              }
          }
          
          // Initialize CSS Color Picker
          function initializeCssColorPicker() {
              cssColorPicker.addEventListener('input', (event) => {
                  if (activeColorMarkerInfo) {
                      const newColor = event.target.value; // This will be hex
                      const { cm, from, to, swatchElement } = activeColorMarkerInfo;
                      const cursor = cm.getCursor();
                      const scrollInfo = cm.getScrollInfo();

                      cm.replaceRange(newColor, from, to); // Update editor with new hex color
                      swatchElement.style.backgroundColor = newColor;

                      cm.setCursor(cursor); // Restore cursor
                      cm.scrollTo(scrollInfo.left, scrollInfo.top); // Restore scroll
                  }
              });

              cssColorPicker.addEventListener('change', () => { // When picker is closed
                  cssColorPicker.style.display = 'none';
                  activeColorMarkerInfo = null;
              });

              document.addEventListener('click', (e) => {
                  if (cssColorPicker.style.display === 'block' && e.target !== cssColorPicker && (!activeColorMarkerInfo || e.target !== activeColorMarkerInfo.swatchElement)) {
                      let isSwatchClick = false;
                      if (e.target.classList && e.target.classList.contains('cm-color-swatch')) {
                          isSwatchClick = true;
                      }
                      if (!isSwatchClick) {
                          cssColorPicker.style.display = 'none';
                          activeColorMarkerInfo = null;
                      }
                  }
              }, true);
          }

          function clearCssColorMarkers(cm) {
              const markers = editorColorMarkers.get(cm);
              if (markers) {
                  markers.forEach(marker => marker.clear());
              }
              editorColorMarkers.set(cm, []);
          }

          function addCssColorMarker(cm, marker) {
              if (!editorColorMarkers.has(cm)) {
                  editorColorMarkers.set(cm, []);
              }
              editorColorMarkers.get(cm).push(marker);
          }

          function updateCssColorSwatches(cm) {
              clearCssColorMarkers(cm);
              // Regex for hex, rgb(a), hsl(a), and common named colors
              const colorRegex = /(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\(\s*(?:\d{1,3}\s*,){2}\s*\d{1,3}\s*(?:,\s*[\d.]+\s*)?\)|hsla?\(\s*(?:\d+\s*(?:deg|rad|grad|turn)?\s*,)(?:\s*[\d.]+%){2}\s*(?:,\s*[\d.]+\s*)?\)|(?:transparent|red|blue|green|yellow|black|white|gray|orange|purple|pink|brown|cyan|magenta|lime|maroon|navy|olive|silver|teal|aqua|fuchsia|gold|indigo|violet|beige|ivory|khaki|plum|salmon|sienna|tan|turquoise|wheat)\b)/gi;
              const editorModeName = cm.getMode().name;

              for (let i = 0; i < cm.lineCount(); i++) {
                  const lineText = cm.getLine(i);
                  let match;
                  while ((match = colorRegex.exec(lineText)) !== null) {
                      const originalColor = match[0];
                      const matchFrom = { line: i, ch: match.index };
                      const matchTo = { line: i, ch: match.index + originalColor.length };

                      let inCssContext = false;
                      if (editorModeName === 'css') {
                          inCssContext = true;
                      } else if (editorModeName === 'htmlmixed') {
                          const modeAtMatch = cm.getModeAt(matchFrom);
                          if (modeAtMatch && modeAtMatch.name === 'css') {
                              inCssContext = true;
                          }
                      }

                      if (inCssContext) {
                          const swatchElement = document.createElement('span');
                          swatchElement.className = 'cm-color-swatch';
                          
                          try {
                              swatchElement.style.backgroundColor = originalColor;
                          } catch (e) {
                              console.warn("Invalid color for swatch:", originalColor, e);
                              continue;
                          }
                          
                          const marker = cm.setBookmark(matchFrom, { widget: swatchElement, insertLeft: true });
                          addCssColorMarker(cm, marker);

                          swatchElement.addEventListener('click', (event) => {
                              event.stopPropagation();
                              activeColorMarkerInfo = { cm, marker, from: matchFrom, to: matchTo, swatchElement, originalColor };
                              cssColorPicker.value = colorStringToHex(originalColor);
                              const rect = swatchElement.getBoundingClientRect();
                              cssColorPicker.style.left = `${rect.left + window.scrollX}px`;
                              cssColorPicker.style.top = `${rect.bottom + window.scrollY + 2}px`;
                              cssColorPicker.style.display = 'block';
                          });
                      }
                  }
              }
          }
          
          document.addEventListener('DOMContentLoaded', function() {
          // ---- Initialize everything ----
          initializeEditors();
          setupKeyboardShortcuts();
          initializeCssColorPicker();
            initializeImageToApp();
          updateStatusBar();
          safeUpdatePreview();
          setInterval(saveCurrentContent, 30000);

          // Set up AI Assistant input for Enter key
          document.getElementById('aiInput').addEventListener('keydown', function(e) {
              if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendAiMessage();
              }
          });

          // Responsive design
          function handleResize() {
              if (window.innerWidth <= 768) {
                  document.getElementById('sidebar').classList.add('collapsed');
              }
          }
          window.addEventListener('resize', handleResize);
          handleResize();

          // Expose functions to global scope for AI Assistant and other uses
          window.newFile = newFile;
          window.openFile = openFile;
          window.openFolder = openFolder;
          window.saveFile = saveFile;
          window.combineAndExport = combineAndExport;
          window.selectTab = selectTab;
          window.showSettings = showSettings;
          window.showAbout = showAbout;
          window.showHelp = showHelp;
          window.toggleTheme = toggleTheme;
          window.changeTheme = changeTheme;
          window.changeEditorTheme = changeEditorTheme;
          window.changeFontSize = changeFontSize;
          window.toggleSidebar = toggleSidebar;
          window.togglePreviewFullscreen = togglePreviewFullscreen;
          window.openPreviewInNewTab = openPreviewInNewTab;
          window.closeModal = closeModal;
          window.handleFileOpen = handleFileOpen;
          window.handleFolderUpload = handleFolderUpload;
          window.navigateToError = navigateToError;
          window.refreshPreview = refreshPreview;
          
          // AI Assistant functions
          
          window.sendAiMessage = sendAiMessage;
          window.aiAction = aiAction;
          window.autoResizeTextarea = autoResizeTextarea;
          window.aiContextAction = aiContextAction;
          window.applyGeneratedCode = applyGeneratedCode;
          window.copyToClipboard = copyToClipboard;
          window.hideAiAutocomplete = function() {
              document.getElementById('aiAutocomplete').style.display = 'none';
          };
          window.hideAiErrorSuggestion = hideAiErrorSuggestion;
          window.applyAiErrorFix = applyAiErrorFix;
          window.aiFixError = aiFixError;
          
          // Notifications
          window.showNotification = showNotification;
          window.hideNotification = hideNotification;
      });