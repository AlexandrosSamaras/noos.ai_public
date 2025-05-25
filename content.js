// c:\Users\alexa\OneDrive\Υπολογιστής\noos.ai v1.7\content.js
// content.js - v4.6 - Debugging Data Display in Panel + Draggable Panel + Translate Summary

// --- Variables ---
let resultPanel = null;
let hidePanelTimeoutId = null;
const PANEL_FADE_DURATION = 250;
let panelJustShown = false; // Flag to handle immediate click-away after panel shows
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
        Object.assign(resultPanel.style, { position: 'fixed', top: '20px', right: '20px', width: '360px', maxWidth: '90vw', maxHeight: '85vh', backgroundColor: 'rgba(15, 23, 42, 0.97)', border: '1px solid #00ffff', borderRadius: '8px', zIndex: '2147483647', padding: '0', overflow: 'hidden', fontFamily: " 'Google Sans', sans-serif", color: '#e7f1fd !important', display: 'flex', flexDirection: 'column' });

        const header = document.createElement('div');
        Object.assign(header.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #334155', background: '#1e293b', flexShrink: '0' });

        const title = document.createElement('span');
        title.id = 'noosai-panel-title';
        title.textContent = 'NoosAI';
        Object.assign(title.style, { fontWeight: '500', fontSize: '14px', fontFamily: "'Google Sans', sans-serif", color: '#e7f1fd !important' });

        const closeButton = document.createElement('button');
        closeButton.id = 'noosai-panel-close-button';
        closeButton.textContent = '×';
        Object.assign(closeButton.style, { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#b5c8e4', padding: '0 5px', lineHeight: '1', marginLeft: '10px', fontFamily: 'inherit' });
        closeButton.onmouseover = () => { closeButton.style.color = '#e7f1fd'; };
        closeButton.onmouseout = () => { closeButton.style.color = '#b5c8e4'; };

        header.appendChild(title);
        header.appendChild(closeButton);

        const contentArea = document.createElement('div');
        contentArea.id = 'noosai-panel-content';
        Object.assign(contentArea.style, { padding: '15px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '14px', lineHeight: '1.6', color: '#e7f1fd !important', flex: '1 1 auto', minHeight: '0' /* Important for flex item with overflow */ });
        contentArea.style.setProperty('--link-color', '#00ffff');
        // Container for "Translate Summary" feature
        const translateSummaryContainer = document.createElement('div');
        translateSummaryContainer.id = 'noosai-translate-summary-container';
        Object.assign(translateSummaryContainer.style, { // Styles for the translate summary UI
            display: 'none', // Hidden by default
            flexShrink: '0',
            marginTop: '15px',
            paddingTop: '10px',
            borderTop: '1px solid #334155'
        });

        const translateSummaryLabel = document.createElement('label'); // Label for summary translation
        translateSummaryLabel.textContent = 'Translate this summary to:';
        Object.assign(translateSummaryLabel.style, { display: 'block', marginBottom: '8px', fontSize: '13px', color: '#b5c8e4 !important', textAlign: 'center', fontFamily: 'inherit' });

        const translateSummarySelect = document.createElement('select'); // Dropdown for summary translation
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
            backgroundSize: '12px',
            fontFamily: 'inherit'
        });

        translateSummaryContainer.appendChild(translateSummaryLabel);
        translateSummaryContainer.appendChild(translateSummarySelect);

        // --- NEW: Container for "Translate Search Result" feature ---
        const translateSearchResultContainer = document.createElement('div');
        translateSearchResultContainer.id = 'noosai-translate-search-result-container';
        Object.assign(translateSearchResultContainer.style, { // Styles for the translate search result UI
            display: 'none', // Hidden by default
            flexShrink: '0',
            marginTop: '15px',
            paddingTop: '10px',
            borderTop: '1px solid #334155'
        });

        const translateSearchResultLabel = document.createElement('label'); // Label for search result translation
        translateSearchResultLabel.textContent = 'Translate this result to:';
        Object.assign(translateSearchResultLabel.style, { display: 'block', marginBottom: '8px', fontSize: '13px', color: '#b5c8e4 !important', textAlign: 'center', fontFamily: 'inherit' });

        const translateSearchResultSelect = document.createElement('select'); // Dropdown for search result translation
        translateSearchResultSelect.id = 'noosai-translate-search-result-language';
        for (const code in languages) { // Reuse the same languages object
            const option = document.createElement('option');
            option.value = code;
            option.textContent = languages[code];
            if (code === "en") option.selected = true; // Default to English
            translateSearchResultSelect.appendChild(option);
        }
        Object.assign(translateSearchResultSelect.style, { // Same styling as translateSummarySelect
            display: 'block', width: 'calc(100% - 80px)', maxWidth: '260px', margin: '0 auto 15px auto',
            padding: '10px', border: '1px solid #334155', borderRadius: '20px',
            backgroundColor: '#1e293b !important', color: '#e7f1fd !important', fontSize: '13px',
            appearance: 'none',
            backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b5c8e4%22%20d%3D%22M287%2069.4a17.6%2017.6%0A%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '12px',
            fontFamily: 'inherit'
        });

        translateSearchResultContainer.appendChild(translateSearchResultLabel);
        translateSearchResultContainer.appendChild(translateSearchResultSelect);
        // --- END NEW: Translate Search Result UI ---


        contentArea.innerHTML = '<style>#noosai-panel-content a{color:var(--link-color);text-decoration:underline;}#noosai-panel-content a:hover{color:#fff;}</style>';

        const footer = document.createElement('div');
        Object.assign(footer.style, { padding: '8px 15px', borderTop: '1px solid #334155', background: '#1e293b', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', flexShrink: '0' });

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.id = 'noosai-panel-copy-button';
        Object.assign(copyButton.style, { fontSize: '12px', padding: '6px 12px', cursor: 'pointer', border: '1px solid var(--primary-neon-blue,#00ffff)', borderRadius: '15px', backgroundColor: 'transparent', color: 'var(--primary-neon-blue,#00ffff) !important', transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease', fontFamily: 'inherit', fontWeight: 'normal' });
        copyButton.onmouseover = () => { copyButton.style.backgroundColor = 'rgba(0,255,255,0.1)'; copyButton.style.color = '#fff !important'; copyButton.style.boxShadow = 'var(--neon-blue-glow-subtle,0 0 5px #00ffff)'; };
        copyButton.onmouseout = () => { if (!copyButton.textContent.includes('Copied')) { copyButton.style.backgroundColor = 'transparent'; copyButton.style.color = 'var(--primary-neon-blue,#00ffff) !important'; copyButton.style.boxShadow = 'none'; } };

        // Create Summarize Result Button
        const summarizeResultButton = document.createElement('button');
        summarizeResultButton.id = 'noosai-summarize-result-button';
        summarizeResultButton.textContent = 'Summarize Result';
        Object.assign(summarizeResultButton.style, {
            fontSize: '12px', padding: '6px 12px', cursor: 'pointer', border: '1px solid var(--primary-neon-blue,#00ffff)', borderRadius: '15px', backgroundColor: 'transparent', color: 'var(--primary-neon-blue,#00ffff) !important', transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease', display: 'none', fontFamily: 'inherit', fontWeight: 'normal' // Hidden by default
        });
        summarizeResultButton.onmouseover = () => { summarizeResultButton.style.backgroundColor = 'rgba(0,255,255,0.1)'; summarizeResultButton.style.color = '#fff !important'; };
        summarizeResultButton.onmouseout = () => { if (!summarizeResultButton.textContent.includes('Summarizing')) { summarizeResultButton.style.backgroundColor = 'transparent'; summarizeResultButton.style.color = 'var(--primary-neon-blue,#00ffff) !important'; }};

        // Create Translate Summary Button here to add to footer
        const translateSummaryButton = document.createElement('button');
        translateSummaryButton.id = 'noosai-translate-summary-button';
        translateSummaryButton.textContent = 'Translate Summary';
        Object.assign(translateSummaryButton.style, {
            fontSize: '12px', padding: '6px 12px', cursor: 'pointer', border: '1px solid var(--primary-neon-blue,#00ffff)', borderRadius: '15px', backgroundColor: 'transparent', color: 'var(--primary-neon-blue,#00ffff) !important', transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease', display: 'none', fontFamily: 'inherit', fontWeight: 'normal' // Hidden by default, shown when summary is present
        });
        translateSummaryButton.onmouseover = () => { translateSummaryButton.style.backgroundColor = 'rgba(0,255,255,0.1)'; translateSummaryButton.style.color = '#fff !important'; };
        translateSummaryButton.onmouseout = () => { if (!translateSummaryButton.textContent.includes('Translating')) { translateSummaryButton.style.backgroundColor = 'transparent'; translateSummaryButton.style.color = 'var(--primary-neon-blue,#00ffff) !important'; }};

        // Create Translate Search Result Button
        const translateSearchResultButton = document.createElement('button');
        translateSearchResultButton.id = 'noosai-translate-search-result-button';
        translateSearchResultButton.textContent = 'Translate Result'; // Different text
        Object.assign(translateSearchResultButton.style, { // Same styling as other footer buttons
            fontSize: '12px', padding: '6px 12px', cursor: 'pointer', border: '1px solid var(--primary-neon-blue,#00ffff)', borderRadius: '15px', backgroundColor: 'transparent', color: 'var(--primary-neon-blue,#00ffff) !important', transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease', display: 'none', fontFamily: 'inherit', fontWeight: 'normal'
        });
        translateSearchResultButton.onmouseover = () => { translateSearchResultButton.style.backgroundColor = 'rgba(0,255,255,0.1)'; translateSearchResultButton.style.color = '#fff !important'; };
        translateSearchResultButton.onmouseout = () => { if (!translateSearchResultButton.textContent.includes('Translating')) { translateSearchResultButton.style.backgroundColor = 'transparent'; translateSearchResultButton.style.color = 'var(--primary-neon-blue,#00ffff) !important'; }};
        
        footer.appendChild(summarizeResultButton); // Add new summarize button
        footer.appendChild(translateSummaryButton);
        footer.appendChild(translateSearchResultButton); // Add new translate search result button
        footer.appendChild(copyButton);
        resultPanel.appendChild(header);
        resultPanel.appendChild(contentArea);
        resultPanel.appendChild(translateSearchResultContainer); // Add the new container for search result translation
        resultPanel.appendChild(translateSummaryContainer); // Add the new container
        resultPanel.appendChild(footer);

        document.body.appendChild(resultPanel);

        document.getElementById('noosai-panel-close-button')?.addEventListener('click', hideResultPanel);
        document.getElementById('noosai-panel-copy-button')?.addEventListener('click', copyPanelContent);
        document.getElementById('noosai-translate-summary-button')?.addEventListener('click', handleTranslateSummaryClick);
        document.getElementById('noosai-summarize-result-button')?.addEventListener('click', handleSummarizeResultClick);
        document.getElementById('noosai-translate-search-result-button')?.addEventListener('click', handleTranslateSearchResultClick);


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
    // In showResultPanel, at the very beginning
if (resultPanel) {
    if (resultType === 'processing') {
        resultPanel.classList.add('is-processing');
    } else {
        resultPanel.classList.remove('is-processing');
    }
}

// In initializeStreamPanel, when setting initial message for search:
if (resultPanel) resultPanel.classList.add('is-processing');

// In finalizeStreamPanel, after updating content:
if (resultPanel) resultPanel.classList.remove('is-processing');
    if (!resultPanel) { console.error("CS: showResultPanel - panel element not found."); return; }
    console.log(`CS: showResultPanel - Type: ${resultType}, Title: ${titleText}, IsError: ${isError}, Data:`, resultData);

    const panelTitle = document.getElementById('noosai-panel-title');
    const contentArea = document.getElementById('noosai-panel-content');
    const copyButton = document.getElementById('noosai-panel-copy-button');
    const summarizeResultButton = document.getElementById('noosai-summarize-result-button');
    const translateSummaryButton = document.getElementById('noosai-translate-summary-button');
    const translateSummaryContainer = document.getElementById('noosai-translate-summary-container');
    // New elements for search result translation
    const translateSearchResultButton = document.getElementById('noosai-translate-search-result-button');
    const translateSearchResultContainer = document.getElementById('noosai-translate-search-result-container');

    if (!contentArea || !panelTitle || !copyButton || !summarizeResultButton || !translateSummaryContainer || !translateSummaryButton || !translateSearchResultButton || !translateSearchResultContainer) { console.error("CS: Panel sub-elements not found for showResultPanel."); return; }

    
    panelTitle.textContent = titleText;
    panelTitle.style.color = '#e7f1fd !important'; // Re-assert the color with !important

    let originalSummaryTextForTranslation = ""; // Store summary text if it's a summary
    let originalSearchResultTextForTranslation = ""; // Store search result text
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
            originalSearchResultTextForTranslation = searchResultText; // Store for translation
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
    contentArea.setAttribute('data-original-search-result', originalSearchResultTextForTranslation); // Store search result

    // Style based on error flag
    resultPanel.style.backgroundColor = isError ? 'rgba(70, 20, 30, 0.97)' : 'rgba(15, 23, 42, 0.97)';
    copyButton.style.display = (resultType === 'processing' || isError) ? 'none' : 'block';
    
    // --- Visibility for action buttons and translate UI sections ---
    summarizeResultButton.style.display = (resultType === 'search' && !isError) ? 'inline-block' : 'none';

    // Translate Summary UI
    if (resultType === 'summarize' && !isError) {
        translateSummaryContainer.style.display = 'block';
        translateSummaryButton.style.display = 'inline-block';
        translateSummaryButton.disabled = false; // Ensure button is enabled
        if (translateSummaryButton.textContent.includes('Translating')) translateSummaryButton.textContent = 'Translate Summary';
    } else {
        translateSummaryContainer.style.display = 'none';
        translateSummaryButton.style.display = 'none';
    }

    // Translate Search Result UI
    if (resultType === 'search' && !isError) {
        translateSearchResultContainer.style.display = 'block';
        translateSearchResultButton.style.display = 'inline-block';
        if (translateSearchResultButton.textContent.includes('Translating')) translateSearchResultButton.textContent = 'Translate Result';
    } else {
        translateSearchResultContainer.style.display = 'none';
        translateSearchResultButton.style.display = 'none';
    }

    // Show panel
    console.log("CS ShowPanel: Setting panel to visible.");
    resultPanel.classList.remove('panel-hidden');
    panelJustShown = true; // Set flag before making visible
    resultPanel.classList.add('panel-visible');
}


// --- Utility: Hide Panel ---
function hideResultPanel() { /* ... remains the same ... */ if (resultPanel && resultPanel.classList.contains('panel-visible')) { console.log("CS: Hiding Result Panel..."); resultPanel.classList.remove('panel-visible'); resultPanel.classList.add('panel-hidden'); } if (hidePanelTimeoutId) { clearTimeout(hidePanelTimeoutId); hidePanelTimeoutId = null; } }

// --- Utility: Copy Content ---
function copyPanelContent() {
    console.log("CS: Copy button clicked.");
    const area = document.getElementById('noosai-panel-content');
    const btn = document.getElementById('noosai-panel-copy-button');
    const text = area ? area.getAttribute('data-copy-text') : '';

    if (text && btn) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = btn.textContent;
            // Apply success styles and text
            btn.textContent = 'Copied!';
            btn.disabled = true; // Disable temporarily
            btn.style.backgroundColor = ' 0 0 6px rgba(0, 255, 255, 0.5)'; // Light green tint
            btn.style.color = '#fff'; // Bright white text
            btn.style.boxShadow = '0 0 8px 0 0 6px rgba(0, 255, 255, 0.5)'; // Green glow
            btn.style.transform = 'scale(1.05)'; // Slightly enlarge the button

            // Revert styles after a delay
            setTimeout(() => {
                if (btn) { // Check if button still exists
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.backgroundColor = 'transparent';
                    btn.style.color = 'var(--primary-neon-blue,#00ffff)'; // Revert to original neon blue
                    btn.style.boxShadow = 'none';
                    btn.style.transform = 'scale(1)'; // Revert scale
                }
            }, 1500); // 1.5 seconds

        }).catch(err => {
            console.error('CS: Copy Failed:', err);
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Error!';
                btn.disabled = true;
                btn.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'; // Red tint
                btn.style.color = '#fff'; // Bright white text
                btn.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.6)'; // Red glow
                setTimeout(() => {
                    if (btn) {
                        btn.textContent = originalText;
                        btn.disabled = false;
                        btn.style.backgroundColor = 'transparent';
                        btn.style.color = 'var(--primary-neon-blue,#00ffff)';
                        btn.style.boxShadow = 'none';
                    }
                }, 1500);
            }
        });
    }
}
// --- Message Listener ---

function handleSummarizeResultClick() {
    console.log("CS: Summarize Result button clicked.");
    const contentArea = document.getElementById('noosai-panel-content');
    // Get text from data-copy-text, which should hold the full search result
    const textToSummarize = contentArea ? contentArea.getAttribute('data-copy-text') : '';
    const summarizeButton = document.getElementById('noosai-summarize-result-button');

    if (!textToSummarize) {
        console.error("CS: No text found to summarize (from search result).");
        if (summarizeButton) summarizeButton.textContent = 'Error: No text';
        setTimeout(() => { if (summarizeButton) summarizeButton.textContent = 'Summarize Result'; }, 2000);
        return;
    }

    if (summarizeButton) {
        summarizeButton.textContent = 'Summarizing...';
        summarizeButton.disabled = true;
    }

    chrome.runtime.sendMessage({
        action: "summarizeExistingText", // New action for background.js
        textToSummarize: textToSummarize,
        targetLanguage: "auto" // Summarize in the language of the text by default
    });
    // Result will come back via "showResult" with type "summarize"
}

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

function handleTranslateSearchResultClick() {
    console.log("CS: Translate Search Result button clicked.");
    const contentArea = document.getElementById('noosai-panel-content');
    // Get text from data-original-search-result
    const searchResultText = contentArea ? contentArea.getAttribute('data-original-search-result') : '';
    const targetLangSelect = document.getElementById('noosai-translate-search-result-language');
    const translateButton = document.getElementById('noosai-translate-search-result-button');

    if (!searchResultText) {
        console.error("CS: No search result text found to translate.");
        if (translateButton) translateButton.textContent = 'Error: No result';
        setTimeout(() => { if (translateButton) translateButton.textContent = 'Translate Result'; }, 2000);
        return;
    }
    if (!targetLangSelect) {
        console.error("CS: Target language select for search result not found.");
        return;
    }
    const targetLanguage = targetLangSelect.value;

    if (translateButton) {
        translateButton.textContent = 'Translating...';
        translateButton.disabled = true;
    }

    chrome.runtime.sendMessage({ action: "translateExistingText", textToTranslate: searchResultText, targetLanguage: targetLanguage });
    // Result comes back via "showResult" with type "translate"
}


try {
    let currentStreamingAction = null; // Store the action type for streaming
    // let accumulatedStreamedText = ""; // Server sends fullTextForCopy, so client-side accumulation might not be strictly needed here

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log("CS: Message listener invoked, Request:", request);
            const currentHostname = window.location.hostname;
            if (DISABLED_DOMAINS.includes(currentHostname)){ return false; }

            // Handle state updates
            if (request.message === "updateState") { window.extensionEnabled = request.enabled; if (!request.enabled) hideResultPanel(); sendResponse({ received: true }); return true; }
            else if (request.message === "updateAnimationSetting") { if (request.setting === "negative") allowNegativeAnimation = request.enabled; else if (request.setting === "positive") allowPositiveAnimation = request.enabled; sendResponse({ received: true }); return true; }
            else if (request.action === "hideTooltip") { hideResultPanel(); }

            // --- Streaming Handlers (Primarily for Search) ---
            else if (request.action === "initializeStreamPanel") {
                console.log("CS Listener: Handling initializeStreamPanel. Data:", request.data);
                currentStreamingAction = request.data.action; // Should be 'search'

                let panelTitle = "Processing...";
                let initialContentMessage = '<p style="color: #b5c8e4; text-align: center; padding-top: 20px;">Processing request...</p>';

                if (currentStreamingAction === 'search') {
                    panelTitle = "AI Search";
                    initialContentMessage = '<p style="color: #b5c8e4; text-align: center; padding-top: 20px; padding-bottom: 20px;"><span class="noosai-loading-text-glow">Searching the web & synthesizing results...</span></p>';
                }
                // Add other cases if more actions become streaming in the future

                createResultPanel(); // Ensure panel exists
                const titleEl = document.getElementById('noosai-panel-title');
                const contentArea = document.getElementById('noosai-panel-content');
                const copyButton = document.getElementById('noosai-panel-copy-button');
                const summarizeResultButton = document.getElementById('noosai-summarize-result-button');
                const translateSummaryButton = document.getElementById('noosai-translate-summary-button');
                const translateSummaryContainer = document.getElementById('noosai-translate-summary-container');
                const translateSearchResultButton = document.getElementById('noosai-translate-search-result-button');
                const translateSearchResultContainer = document.getElementById('noosai-translate-search-result-container');

                if (titleEl) titleEl.textContent = panelTitle;
                if (summarizeResultButton) summarizeResultButton.style.display = 'none'; // Hide during init
                if (contentArea) contentArea.innerHTML = initialContentMessage; // Set initial message
                if (copyButton) copyButton.style.display = 'none';
                if (translateSummaryButton) translateSummaryButton.style.display = 'none';
                if (translateSummaryContainer) translateSummaryContainer.style.display = 'none';
                if (translateSearchResultButton) translateSearchResultButton.style.display = 'none';
                if (translateSearchResultContainer) translateSearchResultContainer.style.display = 'none';

                if (resultPanel) {
                    resultPanel.classList.remove('panel-hidden');
                    resultPanel.classList.add('panel-visible');
                    panelJustShown = true; // Also set flag here for streaming initialization
                    resultPanel.style.backgroundColor = 'rgba(15, 23, 42, 0.97)'; // Default non-error style
                }
                 sendResponse({ received: true }); return true;
            }
            else if (request.action === "appendResultChunk") {
                const contentArea = document.getElementById('noosai-panel-content');
                if (contentArea && request.data) { // request.data is the chunk string itself
                    // If it's the first chunk for a search, clear the "Searching..." message
                    if (currentStreamingAction === 'search' && contentArea.innerHTML.includes("Searching the web")) {
                        contentArea.innerHTML = '';
                    }
                    const textNode = document.createTextNode(request.data); // Append new chunk
                    contentArea.appendChild(textNode);
                    contentArea.scrollTop = contentArea.scrollHeight; // Auto-scroll
                }
                 sendResponse({ received: true }); return true;
            }
            else if (request.action === "displayCitations") {
                console.log("CS Listener: Handling displayCitations. Data:", request.data);
                const contentArea = document.getElementById('noosai-panel-content');
                const citations = request.data?.citations; // Expecting { citations: [...] }
                if (contentArea && citations && citations.length > 0) {
                    let citationsHtml = '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #334155;">';
                    citationsHtml += '<p style="font-weight: 500; margin-bottom: 5px; color: #b5c8e4;">Sources:</p><ul style="list-style-type: disc; padding-left: 20px; margin:0;">';
                    citations.forEach((citation) => {
                        if (citation.uri && citation.uri.trim() !== '') {
                            citationsHtml += `<li style="margin-bottom: 5px; font-size:0.9em;"><a href="${escapeHTML(citation.uri)}" target="_blank" rel="noopener noreferrer" style="color: var(--link-color);">${escapeHTML(citation.uri)}</a></li>`;
                        }
                    });
                    citationsHtml += '</ul></div>';
                    contentArea.insertAdjacentHTML('beforeend', citationsHtml);
                    contentArea.scrollTop = contentArea.scrollHeight;
                }
                 sendResponse({ received: true }); return true;
            }
            else if (request.action === "finalizeStreamPanel") {
                console.log("CS Listener: Handling finalizeStreamPanel. Data:", request.data);
                const titleEl = document.getElementById('noosai-panel-title');
                if (currentStreamingAction === 'search' && titleEl) {
                    titleEl.textContent = "AI Search - Results"; // Update title on completion
                }
                finalizePanelUIUpdates(request.data.fullTextForCopy, currentStreamingAction);
                currentStreamingAction = null; // Reset
                 sendResponse({ received: true }); return true;
            }

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
                // This handler is now primarily for non-streaming results or errors from stream.
                // If a stream was active and an error occurred, currentStreamingAction might still be set.
                // We reset it here to ensure panel state is correct.
                if (currentStreamingAction) currentStreamingAction = null;
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
                // Also reset summarize result button
                const summarizeButton = document.getElementById('noosai-summarize-result-button');
                const translateSummaryBtn = document.getElementById('noosai-translate-summary-button');
                const translateSearchResultBtn = document.getElementById('noosai-translate-search-result-button');
                
                if (summarizeButton && (resultType !== 'search' || isErrorResult)) {
                    if (summarizeButton.textContent.includes('Summarizing')) {
                        summarizeButton.textContent = 'Summarize Result';
                        summarizeButton.disabled = false;
                    }
                }
                if (translateSummaryBtn && (resultType !== 'summarize' || isErrorResult)) {
                    // Visibility is handled by showResultPanel, just reset text/state if needed
                    if (translateSummaryBtn.textContent.includes('Translating')) { translateSummaryBtn.textContent = 'Translate Summary'; translateSummaryBtn.disabled = false; }
                }
                if (translateSearchResultBtn && (resultType !== 'search' || isErrorResult)) {
                    // Visibility is handled by showResultPanel
                    if (translateSearchResultBtn.textContent.includes('Translating')) {
                        translateSearchResultBtn.textContent = 'Translate Result';
                        translateSearchResultBtn.disabled = false;
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

// Renamed from finalizePanel to avoid confusion with a potential generic panel finalizer
function finalizePanelUIUpdates(fullTextForCopy, actionType) {
    console.log(`%cCS: finalizePanelUIUpdates CALLED%c
    Action Type: %c${actionType}%c
    Full Text For Copy Length: %c${fullTextForCopy?.length || 0}%c`,
    'color: yellow; font-weight: bold;', 'color: inherit;', 'color: cyan;', 'color: inherit;', 'color: cyan;', 'color: inherit;');

    const contentArea = document.getElementById('noosai-panel-content');
    const copyButton = document.getElementById('noosai-panel-copy-button');
    const summarizeResultButton = document.getElementById('noosai-summarize-result-button');
    const translateSummaryButton = document.getElementById('noosai-translate-summary-button');
    const translateSummaryContainer = document.getElementById('noosai-translate-summary-container');
    const translateSearchResultButton = document.getElementById('noosai-translate-search-result-button');
    const translateSearchResultContainer = document.getElementById('noosai-translate-search-result-container');

    if (!resultPanel) {
        console.error("CS: finalizePanelUIUpdates - resultPanel is NULL. Cannot update UI.");
        return;
    }
    console.log("CS: finalizePanelUIUpdates - resultPanel found:", resultPanel ? 'Exists' : 'NULL');
    // Check if panel is in error state by looking at its background color
    // This is crucial because finalizePanelUIUpdates is called for successful streams.
    const isError = resultPanel.style.backgroundColor.includes('70, 20, 30');
    console.log(`CS: finalizePanelUIUpdates - Panel BG Color: '${resultPanel.style.backgroundColor}', isError determined as: %c${isError}`, isError ? 'color: red;' : 'color: green;');

    if (contentArea && fullTextForCopy) {
        contentArea.setAttribute('data-copy-text', fullTextForCopy);
        if (actionType === 'summarize' && !isError) {
            contentArea.setAttribute('data-original-summary', fullTextForCopy);
        }
        if (actionType === 'search' && !isError) { // Store original search result for translation
            contentArea.setAttribute('data-original-search-result', fullTextForCopy);
        }
    }
    if (copyButton) {
        const newCopyDisplay = !isError ? 'block' : 'none';
        console.log(`CS: finalizePanelUIUpdates - Setting copyButton display to: %c${newCopyDisplay}`, 'color: orange;');
        copyButton.style.display = newCopyDisplay;
    } else {
        console.warn("CS: finalizePanelUIUpdates - copyButton NOT FOUND.");
    }

    // Handle visibility of summarize and translate features based on actionType
    if (actionType === 'search' && !isError) {
        console.log("CS: finalizePanelUIUpdates - Condition MET: actionType is 'search' AND not an error.");
        if (summarizeResultButton) {
            console.log("CS: finalizePanelUIUpdates - Setting summarizeResultButton display to: %cinline-block%c (for search)", 'color: orange;', 'color: inherit;');
            summarizeResultButton.style.display = 'inline-block';
            if (summarizeResultButton.textContent.includes('Summarizing')) summarizeResultButton.textContent = 'Summarize Result'; // Reset text
        } else {
            console.warn("CS: finalizePanelUIUpdates - summarizeResultButton NOT FOUND (for search).");
        }
        // Show Translate Search Result UI
        if (translateSearchResultButton) translateSearchResultButton.style.display = 'inline-block';
        if (translateSearchResultContainer) translateSearchResultContainer.style.display = 'block';
        // Hide Translate Summary UI
        if (translateSummaryButton) translateSummaryButton.style.display = 'none';
        if (translateSummaryContainer) translateSummaryContainer.style.display = 'none';

    } else if (actionType === 'summarize' && !isError) { // This case is for non-streaming summarize
        console.log("CS: finalizePanelUIUpdates - Condition MET: actionType is 'summarize' AND not an error.");
        if (summarizeResultButton) {
            console.log("CS: finalizePanelUIUpdates - Setting summarizeResultButton display to: %cnone%c (for summarize action)", 'color: orange;', 'color: inherit;');
            summarizeResultButton.style.display = 'none';
        }
        // Show Translate Summary UI
        if (translateSummaryButton) translateSummaryButton.style.display = 'inline-block';
        if (translateSummaryContainer) translateSummaryContainer.style.display = 'block';
        // Hide Translate Search Result UI
        if (translateSearchResultButton) translateSearchResultButton.style.display = 'none';
        if (translateSearchResultContainer) translateSearchResultContainer.style.display = 'none';
    } else { // Default: hide both for other action types or if there's an error
        console.log(`CS: finalizePanelUIUpdates - Condition MET: Default or Error case. (actionType: ${actionType}, isError: ${isError})`);
        if (summarizeResultButton) {
            console.log("CS: finalizePanelUIUpdates - Setting summarizeResultButton display to: %cnone%c (default/error case)", 'color: orange;', 'color: inherit;');
            summarizeResultButton.style.display = 'none';
        } else {
            console.warn("CS: finalizePanelUIUpdates - summarizeResultButton NOT FOUND (default/error case).");
        }
        if (translateSummaryButton) translateSummaryButton.style.display = 'none';
        if (translateSummaryContainer) translateSummaryContainer.style.display = 'none';
        if (translateSearchResultButton) translateSearchResultButton.style.display = 'none';
        if (translateSearchResultContainer) translateSearchResultContainer.style.display = 'none';
    }
}

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
try {
    document.addEventListener('mousedown', (e) => {
        // console.log("CS: Mousedown event"); // Keep this for debugging if needed
        if (resultPanel && resultPanel.classList.contains('panel-visible')) {
            if (panelJustShown) { // Check the flag
                panelJustShown = false; // Consume the flag
                // console.log("CS: Panel just shown, ignoring this mousedown for hiding.");
                return; // Don't hide on the first click right after showing
            }
            const inside = resultPanel.contains(e.target);
            // console.log("CS: Click inside panel?", inside);
            if (!inside) {
                hideResultPanel();
            }
        }
    }, true); // Use capture phase
    console.log("CS: Mousedown listener (for hiding panel) added.");
} catch (error) {
    console.error("CS: Error adding mousedown listener:", error);
}

// --- CSS Injection ---
try {
    const css = `
        #noosai-result-panel {
            z-index: 2147483647 !important;
            /* Ensure panel itself doesn't inherit problematic text colors */
            color: #e7f1fd !important; 
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 4px 15px rgba(0,0,0,0.2); /* Base shadow */
        }
        #noosai-panel-title { /* Explicitly style the panel title */
            color: #e7f1fd !important;
        }
        #noosai-translate-summary-language { /* Style for the select dropdown in the panel */
            background-color: #1e293b !important;
            color: #e7f1fd !important;
        }
        #noosai-translate-search-result-language { /* Style for the new select dropdown in the panel */
            background-color: #1e293b !important; /* Ensure dark background */
            color: #e7f1fd !important; /* Ensure light text */
        }
        .noosai-panel { 
            display:block; 
            opacity:0; 
            transform:translateX(20px); 
            transition:opacity 0.25s ease-out,transform 0.25s ease-out; 
            pointer-events:none; 
        }
        .noosai-panel.panel-visible { 
            opacity:1 !important; 
            transform:translateX(0) !important; 
            pointer-events:auto !important; 
            animation: subtleGlow 0.6s ease-out; /* Added glow animation */
        }
        .noosai-panel.panel-hidden { display:none !important; }
        #noosai-result-panel ::-webkit-scrollbar { width:8px; }
        #noosai-result-panel ::-webkit-scrollbar-track { background:#1e293b; border-radius:4px; }
        #noosai-result-panel ::-webkit-scrollbar-thumb { background:#555; border-radius:4px; }
        #noosai-result-panel ::-webkit-scrollbar-thumb:hover { background:#777; }
        @keyframes shake { 0%{transform:translateX(0)} 25%{transform:translateX(-5px)} 50%{transform:translateX(5px)} 75%{transform:translateX(-5px)} 100%{transform:translateX(0)} }
        .shake-negative { animation:shake 0.5s; }
        @keyframes subtleGlow {
          0% {
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 4px 15px rgba(0,0,0,0.2);
          }
          50% {
            box-shadow: 0 0 20px 5px rgba(0, 255, 255, 0.7), 0 4px 15px rgba(0,0,0,0.2); /* Intensify cyan glow */
          }
          100% {
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 4px 15px rgba(0,0,0,0.2);
          }
        }
        .noosai-loading-text-glow {
          background-image: linear-gradient(
            to right,
            #b5c8e4 10%,      /* Base text color - start further left */
            #00ffff 35%,      /* Neon blue glow start - wider band */
            #00ffff 65%,      /* Neon blue glow end - wider band */
            #b5c8e4 90%       /* Base text color - end further right */
          );
          background-size: 300% auto; /* Make the gradient even wider to allow smooth sliding of the wider glow */
          color: transparent; /* Make original text transparent */
          -webkit-background-clip: text;
          background-clip: text;
          animation: loadingGlowAnimation 1.8s linear infinite; /* Slightly faster for a more active feel */
        }
        @keyframes loadingGlowAnimation {
          0% {
            background-position: -200% center; /* Start with gradient further off-screen to the left */
          }
          100% {
            background-position: 200% center;  /* End with gradient further off-screen to the right */
          }
        }
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