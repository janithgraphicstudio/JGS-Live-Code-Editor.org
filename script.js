   // API Setup
      const API_KEY = "AIzaSyBjv-eGcDOS1D2-Ly556tbQx_oFAiBuz2k";
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
      
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
              function initializeEditors() {
    // ...existing code...
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
    // ================================================

    // ...rest of your initializeEditors code...
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
              const fileExplorer = document.getElementById('fileExplorer');
              fileExplorer.innerHTML = '';
              createFileExplorerItem('index.html', 'html', true);
              createFileExplorerItem('styles.css', 'css', true);
              createFileExplorerItem('script.js', 'js', true);

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
          // Select active tab
          function selectTab(tabName) {
              // Hide all editors
              document.querySelectorAll('.editor-panel .CodeMirror').forEach(cm => {
                  cm.style.display = 'none';
              });
              
              // Remove active class from all tabs
              document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
              document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));
              
              // Show selected editor
              editors[tabName].getWrapperElement().style.display = 'block';  
              
              // Add active class to selected tab
              document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
              
              // Add active class to corresponding file item in explorer
              const fileItems = document.querySelectorAll('.file-item');
              fileItems.forEach(item => {
                  if (item.dataset.fileType === tabName) {
                      item.classList.add('active');
                  }
              });

              currentTab = tabName;
              updateStatusBar();
              editors[tabName].refresh();
              
              // Clear any existing AI code highlights when switching tabs
              clearAiCodeHighlights();
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

              if (lastErrorType === "css" && editors.css && lastErrorDetails) {
                  const lineMatch = lastErrorDetails.match(/Line: (\d+)/i);
                  if (lineMatch && lineMatch[1]) {
                      line = parseInt(lineMatch[1], 10) - 1;
                      selectTab('css');
                      cm = editors.css;
                  }
              } else if (lastErrorType === "js" && editors.js && lastErrorDetails) {
                  const lineMatch = lastErrorDetails.match(/Row: (\d+)/i);
                  if (lineMatch && lineMatch[1]) {
                      line = parseInt(lineMatch[1], 10) - 1;
                      selectTab('js');
                      cm = editors.js;
                  }
              } else if (lastErrorType === "html" && editors.html && lastErrorDetails) {
                  const lineMatch = lastErrorDetails.match(/Row (\d+)/i);
                  if (lineMatch && lineMatch[1]) {
                      line = parseInt(lineMatch[1], 10) - 1;
                      selectTab('html');
                      cm = editors.html;
                  }
              }

              if (cm !== null && line !== null && line >= 0 && line < cm.lineCount()) {
                  cm.focus();
                  cm.setCursor({ line, ch: 0 });

                  // Remove previous error highlight if any
                  if (window._lastErrorLineHandle) {
                      cm.removeLineClass(window._lastErrorLineHandle, 'background', 'error-line');
                  }
                  
                  // Highlight the error line
                  window._lastErrorLineHandle = cm.addLineClass(line, 'background', 'error-line');

                  // Remove highlight after 2 seconds
                  setTimeout(() => {
                      if (window._lastErrorLineHandle) {
                          cm.removeLineClass(window._lastErrorLineHandle, 'background', 'error-line');
                          window._lastErrorLineHandle = null;
                      }
                  }, 2000);
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
    if (editors.js && editors.js.getValue().trim() === '') {
        return true; // Suppress error popup
    }
    jsErrorInPreviewOccurred = true;
    lastErrorType = "js";
    lastErrorMessage = message || "JavaScript Error";
              
              let errorDetails = `Row: ${lineno}, Column: ${colno}`;
              let sourceName = 'Inline Script';
              
              if (source && source !== window.location.href && source !== 'about:blank') {
                  try {
                      const url = new URL(source);
                      sourceName = url.pathname.substring(url.pathname.lastIndexOf('/') + 1) || 'External Script';
                  } catch (e) {
                      sourceName = source.substring(source.lastIndexOf('/') + 1) || 'Script';
                  }
              }
              
              errorDetails += `\nSource: ${sourceName}`;
              
              if (errorObject && errorObject.stack) {
                  const stackString = String(errorObject.stack);
                  errorDetails += `\n\nStack:\n${stackString.split('\n').slice(0, 4).join('\n')}`;
              }
              
              lastErrorDetails = errorDetails;
              const statusIndicator = document.querySelector('.status-indicator');
              statusIndicator.style.backgroundColor = 'var(--error)';
              statusIndicator.innerHTML = '<i class="fa-solid fa-bug"></i> JS error';
              
              // If AI error fixing is enabled, suggest a fix
              if (document.getElementById('aiErrorFixingToggle').checked) {
                  setTimeout(() => {
                      suggestAiErrorFix({
                          type: 'js',
                          message: lastErrorMessage,
                          details: errorDetails,
                          location: `Line ${lineno}`
                      });
                  }, 500);
              }
              
              return true;
          };

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
    if (htmlCode.trim() === '') {
        // HTML editor is empty, skip error checking
        return;
    }
    if (typeof HTMLHint !== 'undefined') {
        const htmlResults = HTMLHint.verify(htmlCode);
        if (htmlResults && htmlResults.length > 0) {
            const firstError = htmlResults[0];
            lastErrorType = "html";
            lastErrorMessage = firstError.message || "HTML Error";
            lastErrorDetails = `Row: ${firstError.line}, Col: ${firstError.col}\n${firstError.evidence || ''}`;
            statusIndicator.style.backgroundColor = 'var(--error)';
            statusIndicator.innerHTML = '<i class="fa-solid fa-bug"></i> HTML error';
            showErrorModal(lastErrorMessage, lastErrorDetails);
            return;
        }
    }

    // CSS Error Check (only if CSS editor has code)
    if (typeof CSSLint !== 'undefined' && editors.css) {
        const cssCode = editors.css.getValue();
        if (cssCode.trim() !== '') {
            const cssResults = CSSLint.verify(cssCode);
            if (cssResults.messages && cssResults.messages.length > 0) {
                let cssErrorMessages = cssResults.messages.filter(msg => msg.type === 'error');
                if (cssErrorMessages.length > 0) {
                    const firstError = cssErrorMessages[0];
                    lastErrorType = "css";
                    lastErrorMessage = firstError.message || "CSS Error";
                    lastErrorDetails = `Line: ${firstError.line}, Col: ${firstError.col}\n${firstError.evidence || ''}`;
                    statusIndicator.style.backgroundColor = 'var(--error)';
                    statusIndicator.innerHTML = '<i class="fa-solid fa-bug"></i> CSS error';
                    showErrorModal(lastErrorMessage, lastErrorDetails);
                    return;
                }
            }
        }
    }

    // JS Error Check (only if JS editor has code)
    if (editors.js && editors.js.getValue().trim() === '') {
        jsErrorInPreviewOccurred = false;
    }

    try {
        updatePreview();
        if (!jsErrorInPreviewOccurred) {
            statusIndicator.style.backgroundColor = 'var(--success)';
            statusIndicator.innerHTML = '<i class="fa-solid fa-play"></i> Live';
        }
    } catch (error) {
        lastErrorType = "html";
        lastErrorMessage = error.message || "HTML Error";
        lastErrorDetails = error.stack || "";
        statusIndicator.style.backgroundColor = 'var(--error)';
        statusIndicator.innerHTML = '<i class="fa-solid fa-bug"></i> HTML error';
        showErrorModal(lastErrorMessage, lastErrorDetails);
    }

    saveCurrentContent();
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

          // File operations
          function newFile() {
              const confirmed = confirm('Create a new project? Unsaved changes in the current view will be lost.');
              if (confirmed) {
                  editors.html.setValue(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Start coding here...</p>
</body>
</html>`);
                  editors.css.setValue(`/* CSS Styles */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}

h1 {
    color: #333;
    text-align: center;
}`);
                  editors.js.setValue(`// JavaScript Code
document.addEventListener('DOMContentLoaded', function() {
    console.log('Hello World!');
    // Your code here
});`);
                  
                  const fileExplorer = document.getElementById('fileExplorer');
                  fileExplorer.innerHTML = '';
                  createFileExplorerItem('index.html', 'html', true);
                  createFileExplorerItem('styles.css', 'css', true);
                  createFileExplorerItem('script.js', 'js', true);

                  selectTab('html');
                  safeUpdatePreview();
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
                  createFileExplorerItem(htmlFile.name, 'html', true); 
              } else { 
                  createFileExplorerItem('index.html', 'html', true); 
              }
              
              if (cssFile) { 
                  editors.css.setValue(await readFileContent(cssFile)); 
                  createFileExplorerItem(cssFile.name, 'css', true); 
              } else { 
                  createFileExplorerItem('styles.css', 'css', true); 
              }
              
              if (jsFile) { 
                  editors.js.setValue(await readFileContent(jsFile)); 
                  createFileExplorerItem(jsFile.name, 'js', true); 
              } else { 
                  createFileExplorerItem('script.js', 'js', true); 
              }

              Array.from(files)
                  .filter(f => f !== htmlFile && f !== cssFile && f !== jsFile)
                  .forEach(f => createFileExplorerItem(f.webkitRelativePath || f.name, getFileType(f.name), false));
              
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

              const finalHtml = constructPreviewHtml(htmlInput, cssInput, jsInput);
              
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
          function createFileExplorerItem(fileName, type, isEditableMainTab) {
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