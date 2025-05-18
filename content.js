// c:\Users\alexa\OneDrive\Υπολογιστής\noos.ai v1.7\content.js
// content.js - v4.6 - Debugging Data Display in Panel + Draggable Panel + Translate Summary

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
        Object.assign(resultPanel.style, { position: 'fixed', top: '20px', right: '20px', width: '360px', maxWidth: '90vw', maxHeight: '85vh', backgroundColor: 'rgba(15, 23, 42, 0.97)', border: '1px solid #00ffff', borderRadius: '8px', boxShadow: '0 0 10px rgba(0, 255, 255, 0.5), 0 4px 15px rgba(0,0,0,0.2)', zIndex: '2147483647', padding: '0', overflow: 'hidden', fontFamily: " 'Google Sans', sans-serif", color: '#e7f1fd !important' });

        const header = document.createElement('div');
        Object.assign(header.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #334155', background: '#1e293b' });

        const title = document.createElement('span');
        title.id = 'noosai-panel-title';
        title.textContent = 'NoosAI';
        Object.assign(title.style, { fontWeight: '500', fontSize: '14px', fontFamily: "'Google Sans', sans-serif", color: '#e7f1fd !important' });

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
        Object.assign(contentArea.style, { padding: '15px', maxHeight: 'calc(85vh - 95px)', overflowY: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '14px', lineHeight: '1.6', color: '#e7f1fd !important' });
        contentArea.style.setProperty('--link-color', '#00ffff');
        // Container for "Translate Summary" feature
        const translateSummaryContainer = document.createElement('div');
        translateSummaryContainer.id = 'noosai-translate-summary-container';
        Object.assign(translateSummaryContainer.style, {
            display: 'none', // Hidden by default
            marginTop: '15px',
            paddingTop: '10px',
            borderTop: '1px solid #334155'
        });

        const translateSummaryLabel = document.createElement('label');
        translateSummaryLabel.textContent = 'Translate this summary to:';
        Object.assign(translateSummaryLabel.style, { display: 'block', marginBottom: '8px', fontSize: '13px', color: '#b5c8e4 !important', textAlign: 'center' });

        const translateSummarySelect = document.createElement('select');
        translateSummarySelect.id = 'noosai-translate-summary-language';
        // Populate with languages (ensure this matches your popup.html, excluding "auto")
        const languages = {
            ar: "Arabic", bg: "Bulgarian", zh: "Chinese", hr: "Croatian", cs: "Czech",
            da: "Danish", nl: "Dutch", en: "English", et: "Estonian", fi: "Finnish",
            fr: "French", de: "German", el: "Greek", hi: "Hindi", hu: "Hungarian",
            id: "Indonesian", it: "Italian", ja: "Japanese", ko: "Korean", lv: "Latvian",
            lt: "Lithuanian", no: "Norwegian", pl: "Polish", pt: "Portuguese", ro: "Romanian",
            ru: "Russian", sr: "Serbian", sk: "Slovak", sv: "Swedish", th: "Thai", tr: "Turkish"
            // Add more as needed, matching popup.html
        };
        for (const code in languages) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = languages[code];
            if (code === "en") option.selected = true; // Default to English
            translateSummarySelect.appendChild(option);
        }
        Object.assign(translateSummarySelect.style, {
            display: 'block', // Needed for margin auto to work for centering
            width: 'calc(100% - 80px)', // Make it narrower, leaving 40px on each side
            maxWidth: '260px', // Max width to prevent it from being too wide on very wide panels (if panel width changes)
            margin: '0 auto 15px auto', // Center it and add more bottom margin
            padding: '10px', // Match popup style
            border: '1px solid #334155', // Matches var(--border-color-dark)
            borderRadius: '20px', // Pill-like corners
            backgroundColor: '#1e293b !important', // Matches var(--background-medium)
            color: '#e7f1fd !important', // Matches var(--text-color-light)
            fontSize: '13px',
            appearance: 'none', // Remove default browser arrow
            backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b5c8e4%22%20d%3D%22M287%2069.4a17.6%2017.6%0A%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            backgroundSize: '12px'
        });

        translateSummaryContainer.appendChild(translateSummaryLabel);
        translateSummaryContainer.appendChild(translateSummarySelect);

        contentArea.innerHTML = '<style>#noosai-panel-content a{color:var(--link-color);text-decoration:underline;}#noosai-panel-content a:hover{color:#fff;}</style>';

        const footer = document.createElement('div');
        Object.assign(footer.style, { padding: '8px 15px', borderTop: '1px solid #334155', background: '#1e293b', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' });

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.id = 'noosai-panel-copy-button';
        Object.assign(copyButton.style, { fontSize: '12px', padding: '6px 12px', cursor: 'pointer', border: '1px solid var(--primary-neon-blue,#00ffff)', borderRadius: '15px', backgroundColor: 'transparent', color: 'var(--primary-neon-blue,#00ffff) !important', transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease' });
        copyButton.onmouseover = () => { copyButton.style.backgroundColor = 'rgba(0,255,255,0.1)'; copyButton.style.color = '#fff !important'; copyButton.style.boxShadow = 'var(--neon-blue-glow-subtle,0 0 5px #00ffff)'; };
        copyButton.onmouseout = () => { if (!copyButton.textContent.includes('Copied')) { copyButton.style.backgroundColor = 'transparent'; copyButton.style.color = 'var(--primary-neon-blue,#00ffff) !important'; copyButton.style.boxShadow = 'none'; } };

        // Create Translate Summary Button here to add to footer
        const translateSummaryButton = document.createElement('button');
        translateSummaryButton.id = 'noosai-translate-summary-button';
        translateSummaryButton.textContent = 'Translate Summary';
        Object.assign(translateSummaryButton.style, {
            fontSize: '12px', padding: '6px 12px', cursor: 'pointer', border: '1px solid var(--primary-neon-blue,#00ffff)', borderRadius: '15px', backgroundColor: 'transparent', color: 'var(--primary-neon-blue,#00ffff) !important', transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease', display: 'none' // Hidden by default, shown when summary is present
        });
        translateSummaryButton.onmouseover = () => { translateSummaryButton.style.backgroundColor = 'rgba(0,255,255,0.1)'; translateSummaryButton.style.color = '#fff !important'; };
        translateSummaryButton.onmouseout = () => { if (!translateSummaryButton.textContent.includes('Translating')) { translateSummaryButton.style.backgroundColor = 'transparent'; translateSummaryButton.style.color = 'var(--primary-neon-blue,#00ffff) !important'; }};


        footer.appendChild(translateSummaryButton); // Add translate button first if you want it on the left
        footer.appendChild(copyButton);
        resultPanel.appendChild(header);
        resultPanel.appendChild(contentArea);
        resultPanel.appendChild(translateSummaryContainer); // Add the new container
        resultPanel.appendChild(footer);

        document.body.appendChild(resultPanel);

        document.getElementById('noosai-panel-close-button')?.addEventListener('click', hideResultPanel);
        document.getElementById('noosai-panel-copy-button')?.addEventListener('click', copyPanelContent);
        document.getElementById('noosai-translate-summary-button')?.addEventListener('click', handleTranslateSummaryClick);


        // --- Make the panel draggable ---
        makeElementDraggable(resultPanel, header);

        console.log("CS: Result Panel Created & Listeners Attached.");
    } catch (error) {
        console.error("CS: Error creating panel:", error);
        resultPanel = null;
    }
}

// Helper function to safely escape HTML
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// --- Utility: Show Panel (Simplified Data Handling) ---
function showResultPanel(titleText, resultData, resultType = 'info', isError = false) {
    createResultPanel();
    if (!resultPanel) { console.error("CS: showResultPanel - panel element not found."); return; }
    console.log(`CS: showResultPanel - Type: ${resultType}, Title: ${titleText}, IsError: ${isError}, Data:`, resultData);

    const panelTitle = document.getElementById('noosai-panel-title');
    const contentArea = document.getElementById('noosai-panel-content');
    const copyButton = document.getElementById('noosai-panel-copy-button');
    const translateSummaryButton = document.getElementById('noosai-translate-summary-button');
    const translateSummaryContainer = document.getElementById('noosai-translate-summary-container');
    if (!contentArea || !panelTitle || !copyButton || !translateSummaryContainer || !translateSummaryButton) { console.error("CS: Panel sub-elements not found."); return; }

    
    panelTitle.textContent = titleText;
    panelTitle.style.color = '#e7f1fd !important'; // Re-assert the color with !important

    let originalSummaryTextForTranslation = ""; // Store summary text if it's a summary
    let formattedContent = ''; let plainTextForCopy = '';

    try { // Add try-catch around formatting logic
        if (resultType === 'processing') {
            formattedContent = `<p style="color: #b5c8e4;">${escapeHTML(resultData?.message || 'Working...')}</p>`;
            plainTextForCopy = resultData?.message || 'Working...';
        } else if (resultType === 'error') {
            formattedContent = `<p style="color: #ffaaaa;">${escapeHTML(resultData?.error || resultData?.details || 'An error occurred.')}</p>`;
            plainTextForCopy = resultData?.error || resultData?.details || 'Error';
            isError = true; // Ensure error flag is set
        } else if (resultType === 'sentiment') {
            const sentiment = resultData?.sentiment || 'Unknown';
            const score = resultData?.score;
            // New fields for enhanced sentiment
            const dominantEmotion = resultData?.dominantEmotion || "N/A";
            const secondaryEmotions = Array.isArray(resultData?.secondaryEmotions) ? resultData.secondaryEmotions : [];
            const primaryDriver = resultData?.primaryDriverPhrase || "";
            const secondaryDriver = resultData?.secondaryDriverPhrase || "";

            const scoreText = score !== null && score !== undefined ? ` (${score}%)` : '';
            console.log(`CS ShowPanel: Sentiment=${sentiment}, Score=${score}, Dominant Emotion=${dominantEmotion}, Secondary Emotions=${secondaryEmotions.join(', ')}, Primary Driver="${primaryDriver}", Secondary Driver="${secondaryDriver}"`);

            formattedContent = `<p style="font-size: 1.1em; font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important;"><strong>${escapeHTML(sentiment)}${escapeHTML(scoreText)}</strong></p>`;
            
            if (dominantEmotion && dominantEmotion !== "N/A" && dominantEmotion !== "Neutral" && dominantEmotion !== "Mixed") {
                formattedContent += `<p style="font-size: 0.95em; color: #e0e0e0 !important; margin-bottom: 6px;"><strong>Dominant Emotion:</strong> ${escapeHTML(dominantEmotion)}</p>`;
            }
            if (secondaryEmotions.length > 0) {
                formattedContent += `<p style="font-size: 0.9em; color: #b5c8e4 !important; margin-bottom: 8px;"><strong>Secondary Emotions:</strong> ${escapeHTML(secondaryEmotions.join(', '))}</p>`;
            }
            if (primaryDriver) {
                 formattedContent += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #4a5568;">
                                      <p style="font-size: 0.9em; color: #b5c8e4 !important; margin-bottom: 4px; font-weight: 500;">Primary Driver:</p>
                                      <p style="font-size: 0.9em; color: #e0e0e0 !important; margin-bottom: 0; border-left: 3px solid var(--primary-neon-blue, #00ffff); padding-left: 8px; font-style: italic;">"${escapeHTML(primaryDriver)}"</p>
                                    </div>`;
            }
            if (secondaryDriver) {
                 formattedContent += `<div style="margin-top: 6px;">
                                      <p style="font-size: 0.85em; color: #a0aec0 !important; margin-bottom: 4px; font-weight: 500;">Secondary Driver:</p>
                                      <p style="font-size: 0.85em; color: #b5c8e4 !important; margin-bottom: 0; border-left: 3px solid #718096; padding-left: 8px; font-style: italic;">"${escapeHTML(secondaryDriver)}"</p>
                                    </div>`;
            }

            const aiLevel = resultData?.aiLevel;
            if (aiLevel && !isError) { // Only show if not an error
                formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`;
            }

            plainTextForCopy = `Sentiment: ${sentiment}${scoreText}\nDominant Emotion: ${dominantEmotion}\nSecondary Emotions: ${secondaryEmotions.join(', ')}\nPrimary Driver: ${primaryDriver}\nSecondary Driver: ${secondaryDriver}`;
        } else if (resultType === 'summarize') {
            const summaryText = resultData?.summary || '(No summary generated)';
            console.log(`CS ShowPanel: Summary Text Length=${summaryText.length}`);
            formattedContent = `<p style="color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important; font-weight: 400 !important;">${escapeHTML(summaryText).replace(/\n/g, '<br>')}</p>`;
            originalSummaryTextForTranslation = summaryText;
            plainTextForCopy = summaryText;
            // Moved AI Level display logic to be consistently at the end of formattedContent for each result type
            const aiLevel = resultData?.aiLevel;
            if (aiLevel && !isError) {
                formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`;
            }
        } else if (resultType === 'keywords') {
            const keywordsArray = Array.isArray(resultData?.keywords) ? resultData.keywords : [];
            console.log(`CS ShowPanel: Keywords Array=`, keywordsArray);
            formattedContent = keywordsArray.length > 0 ? '<ul style="list-style-type: none; padding-left: 0; margin: 0;">' + keywordsArray.map(k => `<li style="margin-bottom: 5px; padding: 3px 6px; background-color: #1e293b; border-radius: 4px; display: inline-block; margin-right: 5px; color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important; font-weight: 400 !important;">${escapeHTML(k)}</li>`).join('') + '</ul>' : `<p style="color: #b5c8e4 !important; font-style: italic; font-family: 'Google Sans', sans-serif !important; font-weight: 400 !important;">(None found)</p>`;
            plainTextForCopy = keywordsArray.join(', ');
            // AI Level for keywords (if applicable, though less common to show for keywords)
            const aiLevel = resultData?.aiLevel;
            if (aiLevel && !isError) {
                formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`;
            }
        } else if (resultType === 'translate') {
            const translatedText = resultData?.translation || '(No translation generated)';
            console.log(`CS ShowPanel: Translated Text Length=${translatedText.length}`);
            formattedContent = `<p style="font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important;"><strong>Translation:</strong></p><p style="color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important; font-weight: 400 !important;">${escapeHTML(translatedText).replace(/\n/g, '<br>')}</p>`;
            plainTextForCopy = translatedText;
            // AI Level for translate
            const aiLevel = resultData?.aiLevel;
            if (aiLevel && !isError) {
                formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`;
            }
        } else if (resultType === 'explain') {
            const explanationText = resultData?.explanation || '(No explanation generated)';
            console.log(`CS ShowPanel: Explanation Text Length=${explanationText.length}`);
            formattedContent = `<p style="font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important;"><strong>Explanation:</strong></p><p style="color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important; font-weight: 400 !important;">${escapeHTML(explanationText).replace(/\n/g, '<br>')}</p>`;
            plainTextForCopy = explanationText;
            const aiLevel = resultData?.aiLevel;
            if (aiLevel && !isError) { formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`; }
        } else if (resultType === 'simplify') {
            const simplifiedText = resultData?.simplifiedText || '(No simplified text generated)';
            console.log(`CS ShowPanel: Simplified Text Length=${simplifiedText.length}`);
            formattedContent = `<p style="font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important;"><strong>Simplified Text:</strong></p><p style="color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important; font-weight: 400 !important;">${escapeHTML(simplifiedText).replace(/\n/g, '<br>')}</p>`;
            plainTextForCopy = simplifiedText;
            const aiLevel = resultData?.aiLevel;
            if (aiLevel && !isError) { formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`; }
        } else if (resultType === 'search') {
            const searchResultText = resultData?.searchResult || '(No search result generated)';
            console.log(`CS ShowPanel: Search Result Text Length=${searchResultText.length}`);
            formattedContent = `<p style="font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important;"><strong>Information:</strong></p><p style="color: #e7f1fd !important; font-family: 'Google Sans', sans-serif !important; font-weight: 400 !important;">${escapeHTML(searchResultText).replace(/\n/g, '<br>')}</p>`;
            plainTextForCopy = searchResultText;
            const aiLevel = resultData?.aiLevel;
            if (aiLevel && !isError) { formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`; }
        } else { // Handles 'unknown' or any other type (MUST BE LAST 'else')
            console.warn(`CS ShowPanel: Unknown result type '${resultType}'. Displaying raw data.`);
            const rawDataString = JSON.stringify(resultData, null, 2);
            formattedContent = `<p>Unexpected result type.</p><pre style="font-size:0.8em; color: #aaa;">${escapeHTML(rawDataString)}</pre>`;
            plainTextForCopy = rawDataString;
            isError = true; // Treat unknown as error
            // AI Level for unknown (if somehow present)
            const aiLevel = resultData?.aiLevel;
            if (aiLevel && !isError) { // Check !isError because this block sets isError=true for unknown
                 formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`;
            }
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
    contentArea.setAttribute('data-original-summary', originalSummaryTextForTranslation); // Store summary

    // Style based on error flag
    resultPanel.style.backgroundColor = isError ? 'rgba(70, 20, 30, 0.97)' : 'rgba(15, 23, 42, 0.97)';
    copyButton.style.display = (resultType === 'processing' || isError) ? 'none' : 'block';
    translateSummaryButton.style.display = (resultType === 'summarize' && !isError) ? 'inline-block' : 'none'; // Show/hide button

    // Show or hide the "Translate Summary" section
    if (resultType === 'summarize' && !isError) {
        translateSummaryContainer.style.display = 'block';
        translateSummaryButton.disabled = false; // Ensure button is enabled
    } else {
        translateSummaryContainer.style.display = 'none';
    }

    // Show panel
    console.log("CS ShowPanel: Setting panel to visible.");
    resultPanel.classList.remove('panel-hidden');
    resultPanel.classList.add('panel-visible');
}


// --- Utility: Hide Panel ---
function hideResultPanel() { /* ... remains the same ... */ if (resultPanel && resultPanel.classList.contains('panel-visible')) { console.log("CS: Hiding Result Panel..."); resultPanel.classList.remove('panel-visible'); resultPanel.classList.add('panel-hidden'); } if (hidePanelTimeoutId) { clearTimeout(hidePanelTimeoutId); hidePanelTimeoutId = null; } }

// --- Utility: Copy Content ---
function copyPanelContent() { /* ... remains the same ... */ console.log("CS: Copy button clicked."); const area=document.getElementById('noosai-panel-content');const btn=document.getElementById('noosai-panel-copy-button');const text=area?area.getAttribute('data-copy-text'):'';if(text&&btn){navigator.clipboard.writeText(text).then(()=>{const oT=btn.textContent;btn.textContent='Copied!';btn.disabled=true;btn.style.color='#aaa';setTimeout(()=>{if(btn){btn.textContent=oT;btn.disabled=false;btn.style.color='var(--primary-neon-blue,#00ffff)';}},1500);}).catch(err=>{console.error('CS:Copy Fail:',err);if(btn)btn.textContent='Error';setTimeout(()=>{if(btn)btn.textContent='Copy Text';},1500);});}}
/* Note: The 'Copied!' text color for copyButton is intentionally '#aaa' and doesn't need !important as it's temporary. Changed original button text to 'Copy' */
// --- Message Listener ---

function handleTranslateSummaryClick() {
    console.log("CS: Translate Summary button clicked.");
    const contentArea = document.getElementById('noosai-panel-content');
    const summaryText = contentArea ? contentArea.getAttribute('data-original-summary') : '';
    const targetLangSelect = document.getElementById('noosai-translate-summary-language');
    const translateButton = document.getElementById('noosai-translate-summary-button');

    if (!summaryText) {
        console.error("CS: No summary text found to translate.");
        if (translateButton) translateButton.textContent = 'Error: No summary';
        setTimeout(() => { if (translateButton) translateButton.textContent = 'Translate Summary'; }, 2000);
        return;
    }
    if (!targetLangSelect) {
        console.error("CS: Target language select not found.");
        return;
    }
    const targetLanguage = targetLangSelect.value;

    if (translateButton) {
        translateButton.textContent = 'Translating...';
        translateButton.disabled = true;
    } // The 'Translating...' text will inherit the button's base !important color

    chrome.runtime.sendMessage({ action: "translateExistingText", textToTranslate: summaryText, targetLanguage: targetLanguage });
    // The result will come back via the main message listener as a "showResult" with type "translate"
}

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
                        case 'translate': panelTitle = "Translation"; break;
                        case 'explain': panelTitle = "Explanation"; break;
                        case 'simplify': panelTitle = "Simplified Text"; break;
                        case 'search': panelTitle = "Search Result"; break;
                        default: panelTitle = "Unknown Result"; isErrorResult = true; break;
                    }
                } else { panelTitle = "Error"; }

                // Show the panel - passing the data object itself
                showResultPanel(panelTitle, panelContentData, isErrorResult ? 'error' : resultType, isErrorResult); // Ensure resultType is 'error' if it's an error

                // Reset translate summary button if the new result is not a summary or is an error
                const translateButton = document.getElementById('noosai-translate-summary-button');
                if (translateButton && (resultType !== 'summarize' || isErrorResult)) {
                    if (translateButton.textContent.includes('Translating')) {
                        translateButton.textContent = 'Translate Summary';
                        translateButton.disabled = false; // Color will revert due to onmouseout or base style
                    }
                }
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
try {
    const css = `
        #noosai-result-panel {
            z-index: 2147483647 !important;
            /* Ensure panel itself doesn't inherit problematic text colors */
            color: #e7f1fd !important;
        }
        #noosai-panel-title { /* Explicitly style the panel title */
            color: #e7f1fd !important;
        }
        #noosai-translate-summary-language { /* Style for the select dropdown in the panel */
            background-color: #1e293b !important;
            color: #e7f1fd !important;
        }
        .noosai-panel { display:block; opacity:0; transform:translateX(20px); transition:opacity 0.25s ease-out,transform 0.25s ease-out; pointer-events:none; }
        .noosai-panel.panel-visible { opacity:1 !important; transform:translateX(0) !important; pointer-events:auto !important; }
        .noosai-panel.panel-hidden { display:none !important; }
        #noosai-result-panel ::-webkit-scrollbar { width:8px; }
        #noosai-result-panel ::-webkit-scrollbar-track { background:#1e293b; border-radius:4px; }
        #noosai-result-panel ::-webkit-scrollbar-thumb { background:#555; border-radius:4px; }
        #noosai-result-panel ::-webkit-scrollbar-thumb:hover { background:#777; }
        @keyframes shake { 0%{transform:translateX(0)} 25%{transform:translateX(-5px)} 50%{transform:translateX(5px)} 75%{transform:translateX(-5px)} 100%{transform:translateX(0)} }
        .shake-negative { animation:shake 0.5s; }
    `;
    const styleElement = document.createElement('style');
    styleElement.textContent = css.replace(/\s\s+/g, ' ').trim(); // Minify slightly for injection
    document.head.appendChild(styleElement);
    console.log("CS: Styles injected.");
} catch (error) {
    console.error("Content Script: Error injecting CSS:", error);
}

// --- Initialization Call ---
initializeExtensionState();
console.log("NoosAI Content Script: Initialization finished (v4.6)");
