// content.js - v4.6 - Debugging Data Display in Panel + Draggable Panel

// --- Variables ---
let resultPanel = null;
let hidePanelTimeoutId = null;
const PANEL_FADE_DURATION = 250;
// REMOVED Auto-Hide Timeout

window.extensionEnabled = true;
let allowNegativeAnimation = true;
let allowPositiveAnimation = true;

const DISABLED_DOMAINS = ["buy.stripe.com"];

console.log("NoosAI Content Script: Initializing (v4.6)...");

// --- Initialization ---
function initializeExtensionState() { console.log("CS: Init state..."); chrome.storage.sync.get(['extensionEnabled','enableNegativeAnimation','enablePositiveAnimation'],(data)=>{ if(chrome.runtime.lastError){console.error("CS: Error loading state", chrome.runtime.lastError);}else{window.extensionEnabled=data.extensionEnabled!==!1;allowNegativeAnimation=data.enableNegativeAnimation!==!1;allowPositiveAnimation=data.enablePositiveAnimation!==!1;console.log("CS: State loaded.");} console.log("CS: Current state:",{enabled:window.extensionEnabled,negAnim:allowNegativeAnimation,posAnim:allowPositiveAnimation});}); }

function checkExtentionRunAnalysis() { const host=window.location.hostname; if(DISABLED_DOMAINS.includes(host))return false; return window.extensionEnabled;}

// --- Utility: Create Result Panel ---
function createResultPanel() {
    if (resultPanel) return;
    console.log("CS: Creating panel");
    try {
        resultPanel = document.createElement('div');
        resultPanel.id = 'noosai-result-panel';
        resultPanel.classList.add('noosai-panel', 'panel-hidden');
        Object.assign(resultPanel.style, { position: 'fixed', top: '20px', right: '20px', width: '360px', maxWidth: '90vw', maxHeight: '85vh', backgroundColor: 'rgba(15, 23, 42, 0.97)', border: '1px solid #00ffff', borderRadius: '8px', boxShadow: '0 0 10px rgba(0, 255, 255, 0.5), 0 4px 15px rgba(0,0,0,0.2)', zIndex: '2147483647', padding: '0', overflow: 'hidden', fontFamily: " 'Google Sans', sans-serif", color: '#e7f1fd' });

        const header = document.createElement('div');
        Object.assign(header.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #334155', background: '#1e293b' });

        const title = document.createElement('span');
        title.id = 'noosai-panel-title';
        title.textContent = 'NoosAI';
        Object.assign(title.style, { fontWeight: '500', fontSize: '14px', fontFamily: "'Google Sans', sans-serif", color: '#e7f1fd' });

        const closeButton = document.createElement('button');
        closeButton.id = 'noosai-panel-close-button';
        closeButton.textContent = '×';
        Object.assign(closeButton.style, { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#b5c8e4', padding: '0 5px', lineHeight: '1', marginLeft: '10px' });
        closeButton.onmouseover = () => { closeButton.style.color = '#e7f1fd'; };
        closeButton.onmouseout = () => { closeButton.style.color = '#b5c8e4'; };

        header.appendChild(title);
        header.appendChild(closeButton);

        const contentArea = document.createElement('div');
        contentArea.id = 'noosai-panel-content';
        Object.assign(contentArea.style, { padding: '15px', maxHeight: 'calc(85vh - 95px)', overflowY: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '14px', lineHeight: '1.6', color: '#e7f1fd' });
        contentArea.style.setProperty('--link-color', '#00ffff');
        contentArea.innerHTML = '<style>#noosai-panel-content a{color:var(--link-color);text-decoration:underline;}#noosai-panel-content a:hover{color:#fff;}</style>';

        const footer = document.createElement('div');
        Object.assign(footer.style, { padding: '10px 15px', borderTop: '1px solid #334155', textAlign: 'right', background: '#1e293b' });

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy Text';
        copyButton.id = 'noosai-panel-copy-button';
        Object.assign(copyButton.style, { fontSize: '12px', padding: '6px 12px', cursor: 'pointer', border: '1px solid var(--primary-neon-blue,#00ffff)', borderRadius: '15px', backgroundColor: 'transparent', color: 'var(--primary-neon-blue,#00ffff)', transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease' });
        copyButton.onmouseover = () => { copyButton.style.backgroundColor = 'rgba(0,255,255,0.1)'; copyButton.style.color = '#fff'; copyButton.style.boxShadow = 'var(--neon-blue-glow-subtle,0 0 5px #00ffff)'; };
        copyButton.onmouseout = () => { if (!copyButton.textContent.includes('Copied')) { copyButton.style.backgroundColor = 'transparent'; copyButton.style.color = 'var(--primary-neon-blue,#00ffff)'; copyButton.style.boxShadow = 'none'; } };

        footer.appendChild(copyButton);

        resultPanel.appendChild(header);
        resultPanel.appendChild(contentArea);
        resultPanel.appendChild(footer);

        document.body.appendChild(resultPanel);

        document.getElementById('noosai-panel-close-button')?.addEventListener('click', hideResultPanel);
        document.getElementById('noosai-panel-copy-button')?.addEventListener('click', copyPanelContent);

        // --- Make the panel draggable ---
        makeElementDraggable(resultPanel, header);

        console.log("CS: Result Panel Created & Listeners Attached.");
    } catch (error) {
        console.error("CS: Error creating panel:", error);
        resultPanel = null;
    }
}

// --- Utility: Show Panel (Simplified Data Handling) ---
function showResultPanel(titleText, resultData, resultType = 'info', isError = false) {
    createResultPanel();
    if (!resultPanel) { console.error("CS: showResultPanel - panel element not found."); return; }
    console.log(`CS: showResultPanel - Type: ${resultType}, Title: ${titleText}, IsError: ${isError}, Data:`, resultData);

    const panelTitle = document.getElementById('noosai-panel-title');
    const contentArea = document.getElementById('noosai-panel-content');
    const copyButton = document.getElementById('noosai-panel-copy-button');
    if (!contentArea || !panelTitle || !copyButton) { console.error("CS: Panel sub-elements not found."); return; }

    panelTitle.textContent = titleText;

    let formattedContent = ''; let plainTextForCopy = '';

    try { // Add try-catch around formatting logic
        if (resultType === 'processing') {
            formattedContent = `<p style="color: #b5c8e4;">${resultData?.message || 'Working...'}</p>`;
            plainTextForCopy = resultData?.message || 'Working...';
        } else if (resultType === 'error') {
            formattedContent = `<p style="color: #ffaaaa;">${resultData?.error || resultData?.details || 'An error occurred.'}</p>`;
            plainTextForCopy = resultData?.error || resultData?.details || 'Error';
            isError = true; // Ensure error flag is set
        } else if (resultType === 'sentiment') {
            const sentiment = resultData?.sentiment || 'Unknown'; // Use default if missing
            const score = resultData?.score; // Get score (can be null)
            const emotions = Array.isArray(resultData?.emotions) ? resultData.emotions : [];
            const keyPhrase = resultData?.keyPhrase || "";

            const scoreText = score !== null && score !== undefined ? ` (${score}%)` : ''; // Check for null/undefined
            console.log(`CS ShowPanel: Sentiment=${sentiment}, Score=${score}, Emotions=${emotions.join(', ')}, KeyPhrase="${keyPhrase}"`);

            // Build richer HTML
            formattedContent = `<p style="font-size: 1.1em; font-weight: 500; margin-bottom: 8px;"><strong>${sentiment}${scoreText}</strong></p>`;
            if (emotions.length > 0) {
                formattedContent += `<p style="font-size: 0.9em; color: #b5c8e4; margin-bottom: 8px;"><strong>Emotions:</strong> ${emotions.join(', ')}</p>`;
            }
            if (keyPhrase) {
                 formattedContent += `<p style="font-size: 0.9em; color: #b5c8e4; margin-bottom: 0; border-left: 3px solid var(--primary-neon-blue, #00ffff); padding-left: 8px; font-style: italic;">"${keyPhrase.replace(/</g, "<").replace(/>/g, ">")}"</p>`;
            }

            plainTextForCopy = `${sentiment}${scoreText}`;
        } else if (resultType === 'summarize') {
            const summaryText = resultData?.summary || '(No summary generated)';
            console.log(`CS ShowPanel: Summary Text Length=${summaryText.length}`); // Log summary length
            formattedContent = `<p>${summaryText.replace(/</g, "<").replace(/>/g, ">").replace(/\n/g, '<br>')}</p>`;
            plainTextForCopy = summaryText;
        } else if (resultType === 'keywords') {
            const keywordsArray = Array.isArray(resultData?.keywords) ? resultData.keywords : [];
            console.log(`CS ShowPanel: Keywords Array=`, keywordsArray); // Log keywords array
            formattedContent = keywordsArray.length > 0 ? '<ul style="list-style-type: none; padding-left: 0; margin: 0;">' + keywordsArray.map(k => `<li style="margin-bottom: 5px; padding: 3px 6px; background-color: #1e293b; border-radius: 4px; display: inline-block; margin-right: 5px;">${k.replace(/</g, "<").replace(/>/g, ">")}</li>`).join('') + '</ul>' : '<p style="color: #b5c8e4; font-style: italic;">(None found)</p>';
            plainTextForCopy = keywordsArray.join(', ');
        } else {
            console.warn(`CS ShowPanel: Unknown result type '${resultType}'. Displaying raw data.`);
            formattedContent = `<p>Unexpected result type.</p><pre style="font-size:0.8em; color: #aaa;">${JSON.stringify(resultData, null, 2).replace(/</g, "<")}</pre>`;
            plainTextForCopy = JSON.stringify(resultData);
            isError = true; // Treat unknown as error
        }
    } catch (formatError) {
        console.error("CS ShowPanel: Error formatting content:", formatError);
        formattedContent = `<p style="color: #ffaaaa;">Error displaying result.</p>`;
        plainTextForCopy = "Display Error";
        isError = true;
    }

    console.log("CS ShowPanel: Setting contentArea.innerHTML");
    contentArea.innerHTML = formattedContent;
    contentArea.setAttribute('data-copy-text', plainTextForCopy);

    // Style based on error flag
    resultPanel.style.backgroundColor = isError ? 'rgba(70, 20, 30, 0.97)' : 'rgba(15, 23, 42, 0.97)';
    copyButton.style.display = (resultType === 'processing' || isError) ? 'none' : 'block';

    // Show panel
    console.log("CS ShowPanel: Setting panel to visible.");
    resultPanel.classList.remove('panel-hidden');
    resultPanel.classList.add('panel-visible');
}


// --- Utility: Hide Panel ---
function hideResultPanel() { /* ... remains the same ... */ if (resultPanel && resultPanel.classList.contains('panel-visible')) { console.log("CS: Hiding Result Panel..."); resultPanel.classList.remove('panel-visible'); resultPanel.classList.add('panel-hidden'); } if (hidePanelTimeoutId) { clearTimeout(hidePanelTimeoutId); hidePanelTimeoutId = null; } }

// --- Utility: Copy Content ---
function copyPanelContent() { /* ... remains the same ... */ console.log("CS: Copy button clicked."); const area=document.getElementById('noosai-panel-content');const btn=document.getElementById('noosai-panel-copy-button');const text=area?area.getAttribute('data-copy-text'):'';if(text&&btn){navigator.clipboard.writeText(text).then(()=>{const oT=btn.textContent;btn.textContent='Copied!';btn.disabled=true;btn.style.color='#aaa';setTimeout(()=>{if(btn){btn.textContent=oT;btn.disabled=false;btn.style.color='var(--primary-neon-blue,#00ffff)';}},1500);}).catch(err=>{console.error('CS:Copy Fail:',err);if(btn)btn.textContent='Error';setTimeout(()=>{if(btn)btn.textContent='Copy Text';},1500);});}}

// --- Message Listener ---
try {
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log("CS: Message listener invoked, Request:", request);
            const currentHostname = window.location.hostname;
            if (DISABLED_DOMAINS.includes(currentHostname)){ return false; }

            // Handle state updates
            if (request.message === "updateState") { window.extensionEnabled = request.enabled; if (!request.enabled) hideResultPanel(); sendResponse({ received: true }); return true; }
            else if (request.message === "updateAnimationSetting") { if (request.setting === "negative") allowNegativeAnimation = request.enabled; else if (request.setting === "positive") allowPositiveAnimation = request.enabled; sendResponse({ received: true }); return true; }
            else if (request.action === "hideTooltip") { hideResultPanel(); }

            // Display ALL feedback in the panel
            else if (request.action === "showProcessing") {
                 console.log("CS Listener: Handling showProcessing");
                 showResultPanel("Processing...", request.message || 'Working...', 'processing', false);
            }
            else if (request.action === "showError") {
                 console.log("CS Listener: Handling showError");
                 showResultPanel("Error", request.message || 'An unknown error occurred.', 'error', true);
            }
            else if (request.action === "showResult") {
                console.log("CS Listener: Handling showResult. Data:", request.data);
                // Hide any previous panel state immediately before showing new one? Maybe not necessary.
                // hideResultPanel();
                const rawResultData = request.data || {}; // Ensure data exists
                const resultType = rawResultData.action || (rawResultData.error ? 'error' : 'unknown'); // Determine type
                let panelTitle = "Result";
                let panelContentData = {}; // Data object to pass to showResultPanel
                let sentimentForAnimation = null;
                let isErrorResult = !!rawResultData.error || resultType === 'error';

                // --- Prepare Data for showResultPanel ---
                if (isErrorResult) {
                    panelContentData = { error: rawResultData.error || rawResultData.details || "An unexpected error occurred." }; // Prioritize .error
                } else {
                    panelContentData = rawResultData; // Pass the whole data object for non-error types
                }

                // Determine Title based on Type
                if (!isErrorResult) {
                    switch (resultType) {
                        case 'sentiment': panelTitle = "Sentiment Analysis"; sentimentForAnimation = rawResultData.sentiment; break;
                        case 'summarize': panelTitle = "Summary"; break;
                        case 'keywords': panelTitle = "Keywords"; break;
                        default: panelTitle = "Unknown Result"; isErrorResult = true; break;
                    }
                } else { panelTitle = "Error"; }

                // Show the panel - passing the data object itself
                showResultPanel(panelTitle, panelContentData, isErrorResult ? 'error' : resultType, isErrorResult); // Ensure resultType is 'error' if it's an error

                // Conditional Animations
                if (!isErrorResult && sentimentForAnimation) {
                    if (allowNegativeAnimation && sentimentForAnimation === "Negative") { document.body.classList.add("shake-negative"); setTimeout(() => { document.body.classList.remove("shake-negative"); }, 500); }
                    else if (allowPositiveAnimation && sentimentForAnimation === "Positive") { console.log("Positive sentiment - animation enabled."); }
                }
            }
             return false; // Default response
        } // End listener function
    ); // End addListener
    console.log("Content Script: Message listener successfully added.");
} catch(error) { console.error("Content Script: ERROR setting up message listener:", error); }

// --- Utility: Make Element Draggable ---
function makeElementDraggable(elmnt, dragHandle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (dragHandle) {
        // if present, the header is where you move the DIV from:
        dragHandle.style.cursor = 'move'; // Indicate it's draggable
        dragHandle.onmousedown = dragMouseDown;
        console.log("CS: Drag handle assigned.");
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        // elmnt.onmousedown = dragMouseDown; // Less common for panels like this
        console.warn("CS: No drag handle provided for draggable element.");
    }

    function dragMouseDown(e) {
        e = e || window.event;
        // Prevent default dragging of selected text or images
        if (e.target !== dragHandle && e.target !== elmnt.querySelector('#noosai-panel-title')) {
             console.log("CS: Drag mousedown on non-handle element, ignoring.");
             return; // Only allow drag start on the handle itself or title
        }
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
        console.log("CS: Drag started.");
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.right = 'auto'; // Important: Override 'right' if it was set initially
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
        console.log("CS: Drag ended.");
    }
}

// --- Event Listeners ---
// Mousedown Listener (Hide panel ONLY if clicking outside)
try { /* ... Mousedown listener remains the same ... */ document.addEventListener('mousedown',(e)=>{console.log("CS: Mousedown");if(resultPanel&&resultPanel.classList.contains('panel-visible')){const inside=resultPanel.contains(e.target);console.log("CS: Click inside?",inside);if(!inside){hideResultPanel();}}},true); console.log("CS: Mousedown listener added."); } catch(error) { console.error("CS: Error mousedown listener:", error); }

// --- CSS Injection ---
try { /* ... CSS remains the same ... */ const css=`#noosai-result-panel{z-index:2147483647 !important;}.noosai-panel{display:block;opacity:0;transform:translateX(20px);transition:opacity 0.25s ease-out,transform 0.25s ease-out;pointer-events:none;}.noosai-panel.panel-visible{opacity:1 !important;transform:translateX(0) !important;pointer-events:auto !important;}.noosai-panel.panel-hidden{display:none !important;}#noosai-result-panel ::-webkit-scrollbar{width:8px;}#noosai-result-panel ::-webkit-scrollbar-track{background:#1e293b;border-radius:4px;}#noosai-result-panel ::-webkit-scrollbar-thumb{background:#555;border-radius:4px;}#noosai-result-panel ::-webkit-scrollbar-thumb:hover{background:#777;}@keyframes shake{0%{transform:translateX(0)}25%{transform:translateX(-5px)}50%{transform:translateX(5px)}75%{transform:translateX(-5px)}100%{transform:translateX(0)}}.shake-negative{animation:shake 0.5s;}`;const styleElement=document.createElement('style');styleElement.textContent=css;document.head.appendChild(styleElement);console.log("CS: Styles injected."); } catch (error) { console.error("Content Script: Error injecting CSS:", error); }

// --- Initialization Call ---
initializeExtensionState();
console.log("NoosAI Content Script: Initialization finished (v4.6)");
