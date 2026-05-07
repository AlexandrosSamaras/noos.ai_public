// c:\Users\alexa\OneDrive\Υπολογιστής\noos.ai v1.7\content.js
// content.js - v5.0 - Added Conversational Follow-up

// --- Variables ---
let resultPanel = null;
let hidePanelTimeoutId = null;
const PANEL_FADE_DURATION = 250;
let panelJustShown = false;
let panelHistory = []; // [NEW] Array to store result history
let historyIndex = -1;   // [NEW] Current position in the history
let isNavigatingHistory = false; // [NEW] Flag to prevent re-adding history items

window.extensionEnabled = true;
let allowNegativeAnimation = true;
let allowPositiveAnimation = true;

const DISABLED_DOMAINS = ["buy.stripe.com"];

console.log("NoosAI Content Script: Initializing (v5.0)...");

// --- Initialization ---
function initializeExtensionState() { console.log("CS: Init state..."); chrome.storage.sync.get(['extensionEnabled', 'enableNegativeAnimation', 'enablePositiveAnimation'], (data) => { if (chrome.runtime.lastError) { console.error("CS: Error loading state", chrome.runtime.lastError); } else { window.extensionEnabled = data.extensionEnabled !== !1; allowNegativeAnimation = data.enableNegativeAnimation !== !1; allowPositiveAnimation = data.enablePositiveAnimation !== !1; console.log("CS: State loaded."); } console.log("CS: Current state:", { enabled: window.extensionEnabled, negAnim: allowNegativeAnimation, posAnim: allowPositiveAnimation }); }); }

function checkExtentionRunAnalysis() { const host = window.location.hostname; if (DISABLED_DOMAINS.includes(host)) return false; return window.extensionEnabled; }

// --- Utility: Inject CSS ---
function injectStyles() {
    if (document.getElementById('noosai-styles')) return;
    const link = document.createElement('link');
    link.id = 'noosai-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('content.css');
    (document.head || document.documentElement).appendChild(link);
    console.log("CS: Injected content.css");
}

// --- Utility: Create Result Panel ---
function createResultPanel() {
    if (resultPanel) return;
    console.log("CS: Creating panel");

    injectStyles(); // Ensure CSS is loaded

    try {
        resultPanel = document.createElement('div');
        resultPanel.id = 'noosai-result-panel';
        resultPanel.classList.add('panel-hidden');

        // Header
        const header = document.createElement('div');

        // --- History Navigation ---
        const historyNavContainer = document.createElement('div');
        historyNavContainer.style.display = 'flex';
        historyNavContainer.style.gap = '8px';

        const backButton = document.createElement('button');
        backButton.id = 'noosai-panel-back-button';
        backButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
        backButton.title = 'Previous Result';
        backButton.classList.add('noosai-nav-btn');

        const forwardButton = document.createElement('button');
        forwardButton.id = 'noosai-panel-forward-button';
        forwardButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;
        forwardButton.title = 'Next Result';
        forwardButton.classList.add('noosai-nav-btn');

        historyNavContainer.appendChild(backButton);
        historyNavContainer.appendChild(forwardButton);

        const title = document.createElement('span');
        title.id = 'noosai-panel-title';
        title.textContent = 'NoosAI';

        const closeButton = document.createElement('button');
        closeButton.id = 'noosai-panel-close-button';
        closeButton.innerHTML = '×';

        header.appendChild(historyNavContainer);
        header.appendChild(title);
        header.appendChild(closeButton);

        // Content Area
        const contentArea = document.createElement('div');
        contentArea.id = 'noosai-panel-content';

        // Translate Summary Container (Hidden by default)
        const translateSummaryContainer = document.createElement('div');
        translateSummaryContainer.id = 'noosai-translate-summary-container';
        // Keep functional styles inline or move to CSS (moving to CSS preferred, but keeping minimal here for logic safety if CSS fails)
        translateSummaryContainer.style.display = 'none';
        translateSummaryContainer.style.marginTop = '15px';
        translateSummaryContainer.style.padding = '10px 16px'; // Added side padding
        translateSummaryContainer.style.borderTop = '1px solid rgba(255,255,255,0.1)';

        const translateSummaryLabel = document.createElement('label');
        translateSummaryLabel.textContent = 'Translate this summary to:';
        translateSummaryLabel.style.display = 'block';
        translateSummaryLabel.style.marginBottom = '8px';
        translateSummaryLabel.style.fontSize = '12px';
        translateSummaryLabel.style.opacity = '0.7';

        const translateSummarySelect = document.createElement('select');
        translateSummarySelect.id = 'noosai-translate-summary-select';
        translateSummarySelect.className = 'noosai-select'; // Use CSS class
        // Removed inline styles to use .noosai-select in CSS

        const languages = [
            { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' }, { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' },
            { code: 'zh', name: 'Chinese' }, { code: 'ja', name: 'Japanese' }, { code: 'ru', name: 'Russian' },
            { code: 'el', name: 'Greek' }
        ];

        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            translateSummarySelect.appendChild(option);
        });

        translateSummaryContainer.appendChild(translateSummaryLabel);
        translateSummaryContainer.appendChild(translateSummarySelect);

        // Follow Up Area
        const followUpInputContainer = document.createElement('div');
        followUpInputContainer.id = 'noosai-followup-container';
        Object.assign(followUpInputContainer.style, {
            display: 'none', marginTop: '15px', paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.1)', flexDirection: 'column', gap: '8px',
            padding: '10px 16px' // Added side padding
        });

        const followUpInput = document.createElement('input');
        followUpInput.type = 'text';
        followUpInput.id = 'noosai-followup-input';
        followUpInput.placeholder = 'Ask a follow-up question...';
        Object.assign(followUpInput.style, {
            width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '13px', outline: 'none',
            boxSizing: 'border-box' // Fix overflow
        });

        const followUpButton = document.createElement('button');
        followUpButton.id = 'noosai-followup-button';
        followUpButton.textContent = 'Send';
        followUpButton.className = 'noosai-action-btn'; // Use CSS class
        followUpButton.style.alignSelf = 'flex-end'; // Specific layout tweak

        followUpInputContainer.appendChild(followUpInput);
        followUpInputContainer.appendChild(followUpButton);


        // --- [NEW] Share Button & Dropdown ---
        const shareContainer = document.createElement('div');
        Object.assign(shareContainer.style, { position: 'relative', display: 'inline-block' });

        const shareButton = document.createElement('button');
        shareButton.id = 'noosai-panel-share-button';
        shareButton.className = 'noosai-icon-btn'; // Use new CSS class
        shareButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>`;

        // Removed inline styles and mouseover/out handlers for glow to rely on CSS

        const shareDropdown = document.createElement('div');
        shareDropdown.id = 'noosai-share-dropdown';
        Object.assign(shareDropdown.style, {
            display: 'none', position: 'absolute', bottom: '100%', right: '0', marginBottom: '5px',
            backgroundColor: 'rgba(30, 41, 59, 0.97)', border: '1px solid var(--primary-neon-blue, #00ffff)',
            borderRadius: '6px', boxShadow: '0 0 8px rgba(0, 255, 255, 0.5)', zIndex: '10', minWidth: '180px', overflow: 'hidden'
        });

        const clockIconSpan = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#778899" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; vertical-align: middle; opacity: 0.8;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

        shareDropdown.innerHTML = `
            <a id="noosai-share-email" style="display: block; padding: 10px 15px; color: #e7f1fd; text-decoration: none; font-size: 13px; cursor: pointer;">Draft in Email</a>
            <a id="noosai-share-docs" style="display: block; padding: 10px 15px; color: #e7f1fd; text-decoration: none; font-size: 13px; cursor: pointer;">Draft in Docs ${clockIconSpan}</a>
            <a id="noosai-share-notion" style="display: block; padding: 10px 15px; color: #e7f1fd; text-decoration: none; font-size: 13px; cursor: pointer;">Send to Notion</a>
            <div style="height: 1px; background-color: #334155; margin: 0 10px;"></div>
            <div style="padding: 8px 15px 4px; font-size: 11px; color: #b5c8e4; text-transform: uppercase; font-weight: 500;">Send to LLM</div>
            <a id="noosai-share-chatgpt" style="display: block; padding: 8px 15px; color: #e7f1fd; text-decoration: none; font-size: 13px; cursor: pointer;">ChatGPT ${clockIconSpan}</a>
            <a id="noosai-share-gemini" style="display: block; padding: 8px 15px; color: #e7f1fd; text-decoration: none; font-size: 13px; cursor: pointer;">Gemini ${clockIconSpan}</a>
            <a id="noosai-share-claude" style="display: block; padding: 8px 15px; color: #e7f1fd; text-decoration: none; font-size: 13px; cursor: pointer;">Claude ${clockIconSpan}</a>
        `;

        shareContainer.appendChild(shareButton);
        shareContainer.appendChild(shareDropdown);

        shareDropdown.querySelectorAll('a').forEach(link => {
            link.onmouseover = () => link.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
            link.onmouseout = () => link.style.backgroundColor = 'transparent';
        });
        // --- [END NEW] ---

        // Footer (Action Buttons)
        const footer = document.createElement('div');
        footer.className = 'noosai-footer'; // Use CSS class
        footer.id = 'noosai-panel-footer';
        footer.style.display = 'none'; // Hidden by default, shown when needed
        footer.style.gap = '8px';
        footer.style.justifyContent = 'flex-end';
        footer.style.display = 'flex'; // Reset to flex to match CSS assumption, but control visibility via class later

        const copyButton = document.createElement('button');
        copyButton.id = 'noosai-panel-copy-button';
        copyButton.textContent = 'Copy';
        copyButton.className = 'noosai-action-btn';

        const summarizeResultButton = document.createElement('button');
        summarizeResultButton.id = 'noosai-summarize-result-button';
        summarizeResultButton.textContent = 'Summarize Result';
        summarizeResultButton.className = 'noosai-action-btn';
        summarizeResultButton.style.display = 'none';

        const translateSummaryButton = document.createElement('button');
        translateSummaryButton.id = 'noosai-translate-summary-button';
        translateSummaryButton.textContent = 'Translate Summary';
        translateSummaryButton.className = 'noosai-action-btn';
        translateSummaryButton.style.display = 'none';

        const translateSearchResultButton = document.createElement('button');
        translateSearchResultButton.id = 'noosai-translate-search-result-button';
        translateSearchResultButton.textContent = 'Translate Result';
        translateSearchResultButton.className = 'noosai-action-btn';
        translateSearchResultButton.style.display = 'none';

        const exportButton = document.createElement('button');
        exportButton.id = 'noosai-panel-export-button';
        exportButton.textContent = 'Save to Notion';
        exportButton.className = 'noosai-action-btn';

        footer.appendChild(summarizeResultButton);
        footer.appendChild(translateSummaryButton);
        footer.appendChild(translateSearchResultButton);
        footer.appendChild(shareContainer);
        footer.appendChild(copyButton);
        footer.appendChild(exportButton);

        // Assemble
        resultPanel.appendChild(header);
        resultPanel.appendChild(contentArea);
        resultPanel.appendChild(translateSummaryContainer); // Append inside panel, but maybe separate from contentArea

        // [NEW] Add Search Result Translation Container
        const translateSearchResultContainer = document.createElement('div');
        translateSearchResultContainer.id = 'noosai-translate-search-result-container';
        Object.assign(translateSearchResultContainer.style, { display: 'none', flexShrink: '0', marginTop: '15px', padding: '10px 16px', borderTop: '1px solid #334155' });
        const translateSearchResultLabel = document.createElement('label');
        translateSearchResultLabel.textContent = 'Translate this result to:';
        Object.assign(translateSearchResultLabel.style, { display: 'block', marginBottom: '8px', fontSize: '13px', color: '#b5c8e4 !important', textAlign: 'left', fontFamily: 'inherit' });
        const translateSearchResultSelect = document.createElement('select');
        translateSearchResultSelect.id = 'noosai-translate-search-result-language';
        translateSearchResultSelect.className = 'noosai-select'; // Use CSS class
        // Reuse languages logic or clone
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            if (lang.code === 'en') option.selected = true;
            translateSearchResultSelect.appendChild(option);
        });
        // Removed inline styles to use .noosai-select in CSS
        translateSearchResultContainer.appendChild(translateSearchResultLabel);
        translateSearchResultContainer.appendChild(translateSearchResultSelect);

        resultPanel.appendChild(translateSearchResultContainer);

        resultPanel.appendChild(followUpInputContainer);
        resultPanel.appendChild(footer);

        document.body.appendChild(resultPanel);

        // Event Listeners
        document.getElementById('noosai-panel-close-button')?.addEventListener('click', hideResultPanel);
        document.getElementById('noosai-panel-copy-button')?.addEventListener('click', copyPanelContent);
        document.getElementById('noosai-panel-export-button')?.addEventListener('click', () => { exportResultText('txt'); });

        document.getElementById('noosai-translate-summary-button')?.addEventListener('click', handleTranslateSummaryClick);
        document.getElementById('noosai-summarize-result-button')?.addEventListener('click', handleSummarizeResultClick);
        document.getElementById('noosai-translate-search-result-button')?.addEventListener('click', handleTranslateSearchResultClick);
        document.getElementById('noosai-panel-share-button')?.addEventListener('click', handleShareButtonClick);

        // Share options listeners
        document.getElementById('noosai-share-email')?.addEventListener('click', () => handleShareOptionClick('email'));
        document.getElementById('noosai-share-docs')?.addEventListener('click', () => handleShareOptionClick('docs'));
        document.getElementById('noosai-share-notion')?.addEventListener('click', () => handleShareOptionClick('notion'));
        document.getElementById('noosai-share-chatgpt')?.addEventListener('click', () => handleShareOptionClick('chatgpt'));
        document.getElementById('noosai-share-gemini')?.addEventListener('click', () => handleShareOptionClick('gemini'));
        document.getElementById('noosai-share-claude')?.addEventListener('click', () => handleShareOptionClick('claude'));

        makeElementDraggable(resultPanel, header);

        // -- History Listeners --
        backButton.addEventListener('click', () => navigateHistoryBack());
        forwardButton.addEventListener('click', () => navigateHistoryForward());

        // -- Translate Listener --
        translateSummarySelect.addEventListener('change', (e) => {
            const targetLang = e.target.value;
            if (currentActionType === 'summarize' && currentResultData) {
                handleTranslateSummary(targetLang);
            }
        });

        // -- Follow Up Listener --
        followUpButton.addEventListener('click', handleFollowUpSend);
        followUpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleFollowUpSend();
        });

        console.log("CS: Result Panel Created (Glassmorphism Mode).");
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
    // --- [NEW] History Management ---
    if (!isNavigatingHistory && resultType !== 'processing') {
        // If we are not currently browsing history and this is a final result, add it.
        // If we were in the middle of history, new action creates a new branch.
        if (historyIndex < panelHistory.length - 1) {
            panelHistory = panelHistory.slice(0, historyIndex + 1);
        }
        panelHistory.push({ titleText, resultData, resultType });
        historyIndex = panelHistory.length - 1;
        console.log(`CS: Added to history. Index: ${historyIndex}, Total: ${panelHistory.length}`);
    }
    isNavigatingHistory = false; // Reset flag after potential use
    // --- [END NEW] ---

    createResultPanel();
    if (resultPanel) {
        if (resultType === 'processing') {
            resultPanel.classList.add('is-processing');
        } else {
            resultPanel.classList.remove('is-processing');
        }
    }

    if (!resultPanel) { console.error("CS: showResultPanel - panel element not found."); return; }
    console.log(`CS: showResultPanel - Type: ${resultType}, Title: ${titleText}, IsError: ${isError}, Data:`, resultData);

    const panelTitle = document.getElementById('noosai-panel-title');
    const contentArea = document.getElementById('noosai-panel-content');
    const copyButton = document.getElementById('noosai-panel-copy-button');
    const summarizeResultButton = document.getElementById('noosai-summarize-result-button');
    const translateSummaryButton = document.getElementById('noosai-translate-summary-button');
    const translateSummaryContainer = document.getElementById('noosai-translate-summary-container');
    const translateSearchResultButton = document.getElementById('noosai-translate-search-result-button');
    const translateSearchResultContainer = document.getElementById('noosai-translate-search-result-container');
    const shareButton = document.getElementById('noosai-panel-share-button'); // [NEW]
    const followupContainer = document.getElementById('noosai-followup-container'); // [NEW]
    const followupInput = document.getElementById('noosai-followup-input'); // [NEW]

    // [MODIFIED] Added shareButton to the check
    if (!contentArea || !panelTitle || !copyButton || !summarizeResultButton || !translateSummaryContainer || !translateSummaryButton || !translateSearchResultButton || !translateSearchResultContainer || !shareButton || !followupContainer || !followupInput) { console.error("CS: Panel sub-elements not found for showResultPanel."); return; }


    panelTitle.textContent = titleText;
    panelTitle.style.color = '#e7f1fd !important';

    let originalSummaryTextForTranslation = "";
    let originalSearchResultTextForTranslation = "";
    let formattedContent = '';
    let plainTextForCopy = '';
    let showFollowUp = false; // [NEW] Flag to control follow-up bar

    try {
        if (resultType === 'processing') {
            formattedContent = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0;">
                    <p style="color: #00ffff; font-size: 14px; letter-spacing: 1px; font-weight: 500; text-transform: uppercase;">Processing...</p>
                </div>`;
            plainTextForCopy = resultData?.message || 'Working...';
        } else if (resultType === 'error') {
            formattedContent = `<p style="color: #ffaaaa;">${escapeHTML(resultData?.error || resultData?.details || 'An error occurred.')}</p>`;
            plainTextForCopy = resultData?.error || resultData?.details || 'Error';
            isError = true;
        } else if (resultType === 'sentiment') {
            const sentiment = resultData?.sentiment || 'Unknown';
            const score = resultData?.score; // 0-100 confidence
            const sentimentScore = resultData?.sentimentScore; // 1-10 intensity [NEW]
            const reasoning = resultData?.reasoning; // [NEW]
            const dominantEmotion = resultData?.dominantEmotion || "N/A";
            const secondaryEmotions = Array.isArray(resultData?.secondaryEmotions) ? resultData.secondaryEmotions : [];
            const primaryDriver = resultData?.primaryDriverPhrase || "";
            const secondaryDriver = resultData?.secondaryDriverPhrase || "";

            // Score Display
            let scoreDisplay = '';
            if (sentimentScore) {
                // visual bar/circle or just text? Text for now.
                scoreDisplay = ` <span style="font-size: 0.8em; opacity: 0.8;">(Intensity: ${sentimentScore}/10)</span>`;
            } else if (score !== null && score !== undefined) {
                scoreDisplay = ` <span style="font-size: 0.8em; opacity: 0.8;">(${score}%)</span>`;
            }

            formattedContent = `<p style="font-size: 1.2em; font-weight: 600; margin-bottom: 8px; color: #e7f1fd !important;">${escapeHTML(sentiment)}${scoreDisplay}</p>`;

            if (reasoning) {
                const reasoningHtml = parseMarkdown(reasoning);
                formattedContent += `<div class="noosai-markdown-content" style="font-size: 0.95em; color: #b5c8e4 !important; margin-bottom: 12px; font-style: italic; border-left: 2px solid rgba(0, 255, 255, 0.4); padding-left: 10px;">${reasoningHtml}</div>`;
            }

            if (dominantEmotion && dominantEmotion !== "N/A") {
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
            plainTextForCopy = `Sentiment: ${sentiment} (${sentimentScore || score})\nReasoning: ${reasoning || ''}\nDominant: ${dominantEmotion}`;

        } else if (resultType === 'summarize') {
            const summaryText = resultData?.summary || '(No summary generated)';
            // Use parseMarkdown
            const htmlContent = parseMarkdown(summaryText);
            formattedContent = `<div class="noosai-markdown-content">${htmlContent}</div>`;
            originalSummaryTextForTranslation = summaryText;
            plainTextForCopy = summaryText;
            showFollowUp = true;

        } else if (resultType === 'keywords') {
            const keywordsArray = Array.isArray(resultData?.keywords) ? resultData.keywords : [];
            formattedContent = keywordsArray.length > 0 ? '<ul style="list-style-type: none; padding-left: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px;">' + keywordsArray.map(k => `<li style="padding: 4px 8px; background-color: rgba(255,255,255,0.1); border-radius: 6px; color: #e7f1fd !important; font-size: 13px; font-weight: 400 !important; border: 1px solid rgba(255,255,255,0.05);">${escapeHTML(k)}</li>`).join('') + '</ul>' : `<p style="color: #b5c8e4 !important;">(None found)</p>`;
            plainTextForCopy = keywordsArray.join(', ');

        } else if (resultType === 'translate') {
            const translatedText = resultData?.translation || '(No translation generated)';
            const htmlContent = parseMarkdown(translatedText);
            formattedContent = `<p style="font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important;"><strong>Translation:</strong></p><div class="noosai-markdown-content">${htmlContent}</div>`;
            plainTextForCopy = translatedText;
            showFollowUp = true;

        } else if (resultType === 'explain') {
            const explanationText = resultData?.explanation || '(No explanation generated)';
            const htmlContent = parseMarkdown(explanationText);
            formattedContent = `<div class="noosai-markdown-content">${htmlContent}</div>`;
            plainTextForCopy = explanationText;
            showFollowUp = true;

        } else if (resultType === 'simplify') {
            const simplifiedText = resultData?.simplifiedText || '(No simplified text generated)';
            const htmlContent = parseMarkdown(simplifiedText);
            formattedContent = `<p style="font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important;"><strong>Simplified:</strong></p><div class="noosai-markdown-content">${htmlContent}</div>`;
            plainTextForCopy = simplifiedText;
            showFollowUp = true;

        } else if (resultType === 'search') {
            const searchResultText = resultData?.searchResult || '(No search result generated)';
            const htmlContent = parseMarkdown(searchResultText);
            formattedContent = `<div class="noosai-markdown-content">${htmlContent}</div>`;
            originalSearchResultTextForTranslation = searchResultText;
            plainTextForCopy = searchResultText;
            showFollowUp = true;

        } else if (resultType === 'rewrite') {
            const rewrittenText = resultData?.rewrittenText || '(No rewritten text generated)';
            const htmlContent = parseMarkdown(rewrittenText);
            formattedContent = `<p style="font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important;"><strong>Rewritten Text:</strong></p><div class="noosai-markdown-content">${htmlContent}</div>`;
            plainTextForCopy = rewrittenText;
            showFollowUp = true;

        } else if (resultType === 'reply') {
            const replyText = resultData?.replyText || '(No reply generated)';
            const htmlContent = parseMarkdown(replyText);
            formattedContent = `<p style="font-weight: 500; margin-bottom: 8px; color: #e7f1fd !important;"><strong>Draft Reply:</strong></p><div class="noosai-markdown-content">${htmlContent}</div>`;

            // [NEW] Show RAG Metadata (Confidence & Sources)
            if (resultData?.confidenceScore) {
                const score = resultData.confidenceScore;
                let color = '#4ade80'; // Green
                if (score < 80) color = '#facc15'; // Yellow
                if (score < 50) color = '#f87171'; // Red
                formattedContent += `<div style="margin-top: 10px; font-size: 0.8em; color: #b5c8e4; border-top: 1px solid #334155; padding-top: 5px;">
                    <strong>Confidence Score:</strong> <span style="color: ${color}; font-weight: bold;">${score}%</span>
                </div>`;
            }

            if (resultData?.relevantKnowledge && resultData.relevantKnowledge.length > 0) {
                formattedContent += `<div style="margin-top: 5px; font-size: 0.8em; color: #b5c8e4;">
                    <strong>Sources Used:</strong>
                    <ul style="padding-left: 15px; margin: 5px 0 0 0;">`;
                resultData.relevantKnowledge.forEach(source => {
                    formattedContent += `<li>${escapeHTML(source.title || 'Knowledge Article')}</li>`;
                });
                formattedContent += `</ul></div>`;
            }

            plainTextForCopy = replyText;
            showFollowUp = true;

        } else if (resultType === 'followUp') { // [NEW] Handle follow-up results
            const followUpText = resultData?.followUpResult || '(No response generated)';
            const htmlContent = parseMarkdown(followUpText);
            formattedContent = `<div class="noosai-markdown-content">${htmlContent}</div>`;
            plainTextForCopy = followUpText;
            showFollowUp = true; // [NEW] Show follow-up so conversation can continue

        } else {
            console.warn(`CS ShowPanel: Unknown result type '${resultType}'. Displaying raw data.`);
            const rawDataString = JSON.stringify(resultData, null, 2);
            formattedContent = `<p>Unexpected result type.</p><pre style="font-size:0.8em; color: #aaa;">${escapeHTML(rawDataString)}</pre>`;
            plainTextForCopy = rawDataString;
            isError = true;
        }

        // Add AI Level (if it exists) to all non-error types
        const aiLevel = resultData?.aiLevel;
        if (aiLevel && !isError) {
            formattedContent += `<p style="font-size: 0.75em; color: #8694a6 !important; text-align: right; margin-top: 8px; margin-bottom: -5px; font-style: italic;">${escapeHTML(aiLevel)}</p>`;
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
    contentArea.setAttribute('data-original-summary', originalSummaryTextForTranslation);
    contentArea.setAttribute('data-original-search-result', originalSearchResultTextForTranslation);
    contentArea.setAttribute('data-followup-context', plainTextForCopy); // [NEW] Store current result for next follow-up

    // Style based on error flag
    // resultPanel.style.backgroundColor = isError ? 'rgba(70, 20, 30, 0.97)' : 'rgba(15, 23, 42, 0.97)'; // [REMOVED] Let CSS handle glass background
    copyButton.style.display = (resultType === 'processing' || isError) ? 'none' : 'block';
    shareButton.style.display = (resultType === 'processing' || isError) ? 'none' : 'block'; // [NEW]

    // --- Visibility for action buttons and translate UI sections ---
    summarizeResultButton.style.display = (resultType === 'search' && !isError) ? 'inline-block' : 'none';

    if (resultType === 'summarize' && !isError) {
        translateSummaryContainer.style.display = 'block';
        translateSummaryButton.style.display = 'inline-block';
        translateSummaryButton.disabled = false;
        if (translateSummaryButton.textContent.includes('Translating')) translateSummaryButton.textContent = 'Translate Summary';
    } else {
        translateSummaryContainer.style.display = 'none';
        translateSummaryButton.style.display = 'none';
    }

    if (resultType === 'search' && !isError) {
        translateSearchResultContainer.style.display = 'block';
        translateSearchResultButton.style.display = 'inline-block';
        if (translateSearchResultButton.textContent.includes('Translating')) translateSearchResultButton.textContent = 'Translate Result';
    } else {
        translateSearchResultContainer.style.display = 'none';
        translateSearchResultButton.style.display = 'none';
    }

    // --- [NEW] Show/Hide Follow-up Bar ---
    if (showFollowUp && !isError) {
        followupContainer.style.display = 'flex'; // Show the bar
        followupInput.value = ''; // Clear old input
    } else {
        followupContainer.style.display = 'none'; // Hide the bar
    }
    // --- [END NEW] ---

    // Show panel
    console.log("CS ShowPanel: Setting panel to visible.");
    resultPanel.classList.remove('panel-hidden');
    panelJustShown = true;
    resultPanel.classList.add('panel-visible');
}


// --- [NEW] History Navigation Functions ---
function navigateHistoryBack() {
    if (historyIndex > 0) {
        historyIndex--;
        isNavigatingHistory = true; // Set flag
        const { titleText, resultData, resultType } = panelHistory[historyIndex];
        showResultPanel(titleText, resultData, resultType, resultType === 'error');
    }
}

function navigateHistoryForward() {
    if (historyIndex < panelHistory.length - 1) {
        historyIndex++;
        isNavigatingHistory = true; // Set flag
        const { titleText, resultData, resultType } = panelHistory[historyIndex];
        showResultPanel(titleText, resultData, resultType, resultType === 'error');
    }
}
// --- [END NEW] ---




// --- Utility: Hide Panel ---
function hideResultPanel() {
    if (resultPanel && resultPanel.classList.contains('panel-visible')) {
        console.log("CS: Hiding Result Panel...");
        resultPanel.classList.remove('panel-visible');
        resultPanel.classList.add('panel-hidden');
    }
    hideShareDropdown(); // [NEW] Hide dropdown when panel hides
    if (hidePanelTimeoutId) {
        clearTimeout(hidePanelTimeoutId);
        hidePanelTimeoutId = null;
    }
}

// --- Utility: Copy Content ---
function copyPanelContent() {
    console.log("CS: Copy button clicked.");
    const area = document.getElementById('noosai-panel-content');
    const btn = document.getElementById('noosai-panel-copy-button');
    const text = area ? area.getAttribute('data-copy-text') : '';

    if (text && btn) {
        navigator.clipboard.writeText(text).then(() => {
            console.log("CS: Copied to clipboard");
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
            btn.classList.add('copy-success');
            
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('copy-success');
                }
            }, 2000);
        }).catch(err => {
            console.error('CS: Copy Failed:', err);
            const originalText = btn.textContent;
            btn.textContent = 'Error!';
            setTimeout(() => { if (btn) btn.textContent = originalText; }, 1500);
        });
    }
}
// --- Message Listener ---

function handleSummarizeResultClick() {
    console.log("CS: Summarize Result button clicked.");
    const contentArea = document.getElementById('noosai-panel-content');
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
        action: "summarizeExistingText",
        textToSummarize: textToSummarize,
        targetLanguage: "auto"
    });
}

function handleTranslateSummaryClick() {
    console.log("CS: Translate Summary button clicked.");
    const contentArea = document.getElementById('noosai-panel-content');
    const summaryText = contentArea ? contentArea.getAttribute('data-original-summary') : '';
    const targetLangSelect = document.getElementById('noosai-translate-summary-select'); // Fixed ID
    const translateButton = document.getElementById('noosai-translate-summary-button');

    if (!summaryText) {
        console.error("CS: No summary text found to translate.");
        if (translateButton) translateButton.textContent = 'Error: No summary';
        setTimeout(() => { if (translateButton) translateButton.textContent = 'Translate Summary'; }, 2000);
        return;
    }
    if (!targetLangSelect) {
        console.error("CS: Target language select not found (ID mismatch fixed).");
        return;
    }
    const targetLanguage = targetLangSelect.value;

    if (translateButton) {
        translateButton.textContent = 'Translating...';
        translateButton.disabled = true;
    }

    chrome.runtime.sendMessage({ action: "translateExistingText", textToTranslate: summaryText, targetLanguage: targetLanguage });
}

function handleTranslateSearchResultClick() {
    console.log("CS: Translate Search Result button clicked.");
    const contentArea = document.getElementById('noosai-panel-content');
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
}

// --- [NEW] Handle Follow-up Send ---
function handleFollowUpSend() {
    const contentArea = document.getElementById('noosai-panel-content');
    const input = document.getElementById('noosai-followup-input');
    const sendButton = document.getElementById('noosai-followup-button'); // Fixed ID

    if (!contentArea || !input || !sendButton) {
        console.error("CS: Follow-up UI elements not found (ID mismatch fixed).");
        return;
    }

    const contextText = contentArea.getAttribute('data-followup-context');
    const promptText = input.value.trim();

    if (!promptText) {
        console.warn("CS: Follow-up prompt is empty.");
        return;
    }

    if (!contextText) {
        console.error("CS: No context text found for follow-up.");
        return;
    }

    console.log("CS: Sending follow-up request.");

    // Show processing state
    showResultPanel("Processing follow-up...", { message: "Working on your request..." }, 'processing', false);

    // Get target language from one of the dropdowns (they are identical)
    // This ensures the follow-up stays in the desired language
    const langSelect = document.getElementById('noosai-translate-summary-language');
    const targetLanguage = langSelect ? langSelect.value : 'auto';

    chrome.runtime.sendMessage({
        action: "performFollowUp",
        context: contextText, // The previous AI response
        prompt: promptText,   // The new user prompt
        targetLanguage: targetLanguage
    });

    input.value = ''; // Clear input
}
// --- [END NEW] ---

// --- [NEW] Share Functionality ---
function handleShareButtonClick() {
    const dropdown = document.getElementById('noosai-share-dropdown');
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    }
}

function hideShareDropdown() {
    const dropdown = document.getElementById('noosai-share-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function showTemporaryLinkState(linkId, tempText = 'Copied!', duration = 1500) {
    const link = document.getElementById(linkId);
    if (!link) return;

    const originalText = link.textContent;
    const originalPointerEvents = link.style.pointerEvents;
    const originalOpacity = link.style.opacity;

    link.textContent = tempText;
    link.style.pointerEvents = 'none';
    link.style.opacity = '0.7';

    setTimeout(() => {
        if (link) {
            link.textContent = originalText;
            link.style.pointerEvents = originalPointerEvents;
            link.style.opacity = originalOpacity;
        }
    }, duration);
}


async function handleShareOptionClick(option) { // [MODIFIED] Convert to async function
    const contentArea = document.getElementById('noosai-panel-content');
    const panelTitle = document.getElementById('noosai-panel-title');

    if (!contentArea || !panelTitle) {
        console.error("CS: Cannot share, panel elements not found.");
        hideShareDropdown();
        return;
    }

    const textToShare = contentArea.getAttribute('data-copy-text');
    const subject = panelTitle.textContent;

    if (!textToShare) { console.warn("CS: No text to share."); hideShareDropdown(); return; }

    switch (option) {
        case 'email':
            // [MODIFIED] Robust Email Handling: Copy body to clipboard, open mailto with SUBJECT ONLY.
            // This avoids URL length limits that break mailto links with long bodies.
            try {
                await navigator.clipboard.writeText(textToShare);
                console.log(`CS: Email body copied to clipboard.`);
                showTemporaryLinkState('noosai-share-email', 'Copied! Paste in email.', 2500);

                // Open email client with just the subject.
                const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}`;
                window.open(mailtoLink, '_blank');
            } catch (err) {
                console.error(`CS: Could not copy text for email:`, err);
                showTemporaryLinkState('noosai-share-email', 'Copy Error!', 2000);
            }
            break;

        case 'notion':
            // [NEW] Handle sending content to Notion
            showTemporaryLinkState('noosai-share-notion', 'Sending...', 99999); // Show indefinite sending message

            // Notion's API has a 2000-character limit per rich_text item.
            // We'll split the text into multiple paragraph blocks if it's too long.
            const notionBlocks = [];
            // 1. Add the title as a heading
            notionBlocks.push({
                "object": "block", "type": "heading_2",
                "heading_2": { "rich_text": [{ "type": "text", "text": { "content": subject } }] }
            });

            // 2. Split content into chunks of 2000 chars and add as paragraphs
            for (let i = 0; i < textToShare.length; i += 2000) {
                const chunk = textToShare.substring(i, i + 2000);
                notionBlocks.push({
                    "object": "block", "type": "paragraph",
                    "paragraph": { "rich_text": [{ "type": "text", "text": { "content": chunk } }] }
                });
            }

            chrome.runtime.sendMessage({ action: "sendToNotion", blocks: notionBlocks }, (response) => {
                if (response?.success) {
                    console.log("CS: Successfully sent to Notion. URL:", response.url);
                    // [MODIFIED] Make the success message a clickable link
                    const notionLink = document.getElementById('noosai-share-notion');
                    if (notionLink && response.url) {
                        const originalHTML = notionLink.innerHTML;
                        const originalOnClick = notionLink.onclick;

                        notionLink.innerHTML = `Sent! <span style="text-decoration: underline;">Click to open</span>`;
                        notionLink.style.pointerEvents = 'auto';
                        notionLink.style.opacity = '1';
                        notionLink.onclick = (e) => {
                            e.preventDefault();
                            window.open(response.url, '_blank');
                        };

                        // Revert back after a few seconds
                        setTimeout(() => {
                            if (notionLink) {
                                notionLink.innerHTML = originalHTML;
                                notionLink.onclick = originalOnClick;
                            }
                        }, 4000);
                    } else {
                        showTemporaryLinkState('noosai-share-notion', 'Sent!', 2500);
                    }
                } else {
                    console.error("CS: Failed to send to Notion:", response?.error);
                    // Display the specific error message from the background script
                    const errorMessage = response?.error || 'Failed!';
                    showTemporaryLinkState('noosai-share-notion', errorMessage, 4000);
                }
            });
            break;
        case 'docs':
        case 'chatgpt':
        case 'claude':
        case 'gemini':
            // [MODIFIED] Send message to background to handle opening and pasting
            chrome.runtime.sendMessage({
                action: "openLLM",
                target: option,
                text: textToShare
            });
            showTemporaryLinkState(`noosai-share-${option}`, 'Opening...', 2000);
            break;
    }

    // Hide the dropdown after an option is clicked
    hideShareDropdown();
    return; // Explicit return
}


try {
    let currentStreamingAction = null;

    // --- [NEW] Replace Selection Function ---
    function replaceSelectedText(text, targetElement = null) {
        const activeElement = targetElement || document.activeElement;

        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const val = activeElement.value;

            // If no selection, replace all (Ghost Input behavior)
            if (start === end) {
                activeElement.value = text;
            } else {
                // Insert text
                activeElement.value = val.slice(0, start) + text + val.slice(end);
            }

            // Move cursor to end of inserted text
            activeElement.selectionStart = activeElement.selectionEnd = (start === end) ? text.length : start + text.length;

            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (activeElement && activeElement.isContentEditable) {
            // For contenteditable (Gmail, etc.)
            // If specific element passed, ensure it has focus
            if (targetElement) {
                targetElement.focus();
            }

            // If no selection range, we might need to select all content first to replace it
            // But execCommand 'insertText' usually inserts at cursor.
            // For Ghost Input "Rewrite", we usually want to replace the current block or all text.
            // For now, let's assume 'insertText' replaces selection or inserts at cursor.
            // To replace ALL, we'd need to select all first.

            document.execCommand('insertText', false, text);
        } else {
            console.warn("CS: No suitable active element found to replace text. Trying fallback.");
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                console.log("CS: Text copied to clipboard as fallback.");
                showResultPanel("Copied to Clipboard", { message: "Could not auto-replace. Text copied." }, 'success', false);
            });
        }
    }

    // --- Ghost Input Feature Removed ---


    // --- CSS Injection ---
    // (Existing CSS injection code...)
    // --- [END NEW] ---

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            console.log("CS: Message listener invoked, Request:", request);
            const currentHostname = window.location.hostname;
            if (DISABLED_DOMAINS.includes(currentHostname)) { return false; }

            if (request.message === "updateState") { window.extensionEnabled = request.enabled; if (!request.enabled) hideResultPanel(); sendResponse({ received: true }); return true; }
            else if (request.message === "updateAnimationSetting") { if (request.setting === "negative") allowNegativeAnimation = request.enabled; else if (request.setting === "positive") allowPositiveAnimation = request.enabled; sendResponse({ received: true }); return true; }
            else if (request.action === "hideTooltip") { hideResultPanel(); }
            else if (request.action === "replaceSelection") { // [NEW] Handle replacement
                replaceSelectedText(request.text);
                sendResponse({ received: true }); return true;
            }

            else if (request.action === "initializeStreamPanel") {
                console.log("CS Listener: Handling initializeStreamPanel. Data:", request.data);
                currentStreamingAction = request.data.action;

                let panelTitle = "Processing...";
                let initialContentMessage = '<p style="color: #b5c8e4; text-align: center; padding-top: 20px;">Processing request...</p>';

                if (currentStreamingAction === 'search') {
                    panelTitle = "AI Search";
                    initialContentMessage = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0;">
                            <p style="color: #00ffff; font-size: 14px; letter-spacing: 1px; font-weight: 500; text-transform: uppercase;">Searching the Web...</p>
                        </div>`;
                }

                // If panel is already open and showing the same message, don't reset it
                if (resultPanel && resultPanel.classList.contains('panel-visible')) {
                    const contentArea = document.getElementById('noosai-panel-content');
                    if (contentArea && contentArea.innerHTML.includes("Searching the web") && currentStreamingAction === 'search') {
                        console.log("CS: Panel already showing search loading state. Skipping reset.");
                        sendResponse({ received: true });
                        return true;
                    }
                }

                createResultPanel();
                const titleEl = document.getElementById('noosai-panel-title');
                const contentArea = document.getElementById('noosai-panel-content');
                const copyButton = document.getElementById('noosai-panel-copy-button');
                const summarizeResultButton = document.getElementById('noosai-summarize-result-button');
                const translateSummaryButton = document.getElementById('noosai-translate-summary-button');
                const translateSummaryContainer = document.getElementById('noosai-translate-summary-container');
                const translateSearchResultButton = document.getElementById('noosai-translate-search-result-button');
                const translateSearchResultContainer = document.getElementById('noosai-translate-search-result-container');
                const shareButton = document.getElementById('noosai-panel-share-button');
                const followupContainer = document.getElementById('noosai-followup-container');

                if (titleEl) titleEl.textContent = panelTitle;
                if (summarizeResultButton) summarizeResultButton.style.display = 'none';
                if (contentArea) contentArea.innerHTML = initialContentMessage;
                if (copyButton) copyButton.style.display = 'none';
                if (shareButton) shareButton.style.display = 'none';
                if (translateSummaryButton) translateSummaryButton.style.display = 'none';
                if (translateSummaryContainer) translateSummaryContainer.style.display = 'none';
                if (translateSearchResultButton) translateSearchResultButton.style.display = 'none';
                if (translateSearchResultContainer) translateSearchResultContainer.style.display = 'none';
                if (followupContainer) followupContainer.style.display = 'none';

                if (resultPanel) {
                    resultPanel.classList.remove('panel-hidden');
                    resultPanel.classList.add('panel-visible');
                    resultPanel.classList.add('is-processing'); // Ensure processing style is on
                    panelJustShown = true;
                    // resultPanel.style.backgroundColor = 'rgba(15, 23, 42, 0.97)'; // [REMOVED] Let CSS handle glass background
                }
                sendResponse({ received: true }); return true;
            }
            else if (request.action === "appendResultChunk") {
                const contentArea = document.getElementById('noosai-panel-content');
                if (contentArea && request.data) {
                    if (currentStreamingAction === 'search' && contentArea.innerHTML.includes("Searching the web")) {
                        contentArea.innerHTML = '';
                    }
                    const textNode = document.createTextNode(request.data);
                    contentArea.appendChild(textNode);
                    contentArea.scrollTop = contentArea.scrollHeight;
                }
                sendResponse({ received: true }); return true;
            }
            else if (request.action === "displayCitations") {
                console.log("CS Listener: Handling displayCitations. Data:", request.data);
                const contentArea = document.getElementById('noosai-panel-content');
                const citations = request.data?.citations;
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
                    titleEl.textContent = "AI Search - Results";
                }
                finalizePanelUIUpdates(request.data.fullTextForCopy, currentStreamingAction);
                currentStreamingAction = null;
                sendResponse({ received: true }); return true;
            }

            else if (request.action === "showProcessing") {
                console.log("CS Listener: Handling showProcessing");
                showResultPanel("Processing...", { message: request.message || 'Working...' }, 'processing', false);
            }
            else if (request.action === "showError") {
                console.log("CS Listener: Handling showError");
                showResultPanel("Error", { error: request.message || 'An unknown error occurred.' }, 'error', true); // Pass as object
            }
            else if (request.action === "showResult") {
                console.log("CS Listener: Handling showResult. Data:", request.data);
                if (currentStreamingAction) currentStreamingAction = null;

                const rawResultData = request.data || {};
                const resultType = rawResultData.action || (rawResultData.error ? 'error' : 'unknown');
                let panelTitle = "Result";
                let panelContentData = {};
                let sentimentForAnimation = null;
                let isErrorResult = !!rawResultData.error || resultType === 'error';

                if (isErrorResult) {
                    panelContentData = { error: rawResultData.error || rawResultData.details || "An unexpected error occurred." };
                } else {
                    panelContentData = rawResultData;
                }

                if (!isErrorResult) {
                    switch (resultType) {
                        case 'sentiment': panelTitle = "Sentiment Analysis"; sentimentForAnimation = rawResultData.sentiment; break;
                        case 'summarize': panelTitle = "Summary"; break;
                        case 'keywords': panelTitle = "Keywords"; break;
                        case 'translate': panelTitle = "Translation"; break;
                        case 'explain': panelTitle = "Explanation"; break;
                        case 'simplify': panelTitle = "Simplified Text"; break;
                        case 'search': panelTitle = "Search Result"; break;
                        case 'followUp': panelTitle = "Follow-up Response"; break; // [NEW]
                        default: panelTitle = "Unknown Result"; isErrorResult = true; break;
                    }
                } else { panelTitle = "Error"; }

                showResultPanel(panelTitle, panelContentData, isErrorResult ? 'error' : resultType, isErrorResult);

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
                    if (translateSummaryBtn.textContent.includes('Translating')) { translateSummaryBtn.textContent = 'Translate Summary'; translateSummaryBtn.disabled = false; }
                }
                if (translateSearchResultBtn && (resultType !== 'search' || isErrorResult)) {
                    if (translateSearchResultBtn.textContent.includes('Translating')) {
                        translateSearchResultBtn.textContent = 'Translate Result';
                        translateSearchResultBtn.disabled = false;
                    }
                }
                    // [REMOVED] Positive animation (particles/confetti)
            }
            return false;
        }
    );
    console.log("Content Script: Message listener successfully added.");
} catch (error) { console.error("Content Script: ERROR setting up message listener:", error); }

function finalizePanelUIUpdates(fullTextForCopy, actionType) {
    console.log(`%cCS: finalizePanelUIUpdates CALLED%c Action Type: %c${actionType}%c`, 'color: yellow; font-weight: bold;', 'color: inherit;', 'color: cyan;', 'color: inherit;');

    const contentArea = document.getElementById('noosai-panel-content');
    const copyButton = document.getElementById('noosai-panel-copy-button');
    const summarizeResultButton = document.getElementById('noosai-summarize-result-button');
    const translateSummaryButton = document.getElementById('noosai-translate-summary-button');
    const translateSummaryContainer = document.getElementById('noosai-translate-summary-container');
    const translateSearchResultButton = document.getElementById('noosai-translate-search-result-button');
    const translateSearchResultContainer = document.getElementById('noosai-translate-search-result-container');
    const shareButton = document.getElementById('noosai-panel-share-button'); // [NEW]
    const followupContainer = document.getElementById('noosai-followup-container'); // [NEW]

    if (!resultPanel) {
        console.error("CS: finalizePanelUIUpdates - resultPanel is NULL. Cannot update UI.");
        return;
    }
    const isError = resultPanel.style.backgroundColor.includes('70, 20, 30');

    if (contentArea && fullTextForCopy) {
        contentArea.setAttribute('data-copy-text', fullTextForCopy);
        contentArea.setAttribute('data-followup-context', fullTextForCopy); // [NEW] Store context
        if (actionType === 'summarize' && !isError) {
            contentArea.setAttribute('data-original-summary', fullTextForCopy);
        }
        if (actionType === 'search' && !isError) {
            contentArea.setAttribute('data-original-search-result', fullTextForCopy);
        }
    }
    if (copyButton) {
        const newCopyDisplay = !isError ? 'block' : 'none';
        copyButton.style.display = newCopyDisplay;
    } else {
        console.warn("CS: finalizePanelUIUpdates - copyButton NOT FOUND.");
    }
    if (shareButton) { // [NEW]
        const newShareDisplay = !isError ? 'block' : 'none';
        shareButton.style.display = newShareDisplay;
    }

    // --- [NEW] Show/Hide Follow-up Bar ---
    if (actionType === 'search' && !isError && followupContainer) { // Only show for search stream for now
        followupContainer.style.display = 'flex';
    } else if (followupContainer) {
        followupContainer.style.display = 'none';
    }

    if (actionType === 'search' && !isError) {
        console.log("CS: finalizePanelUIUpdates - Condition MET: actionType is 'search' AND not an error.");
        if (summarizeResultButton) {
            summarizeResultButton.style.display = 'inline-block';
            if (summarizeResultButton.textContent.includes('Summarizing')) summarizeResultButton.textContent = 'Summarize Result';
        }
        if (translateSearchResultButton) translateSearchResultButton.style.display = 'inline-block';
        if (translateSearchResultContainer) translateSearchResultContainer.style.display = 'block';
        if (translateSummaryButton) translateSummaryButton.style.display = 'none';
        if (translateSummaryContainer) translateSummaryContainer.style.display = 'none';

    } else if (actionType === 'summarize' && !isError) {
        console.log("CS: finalizePanelUIUpdates - Condition MET: actionType is 'summarize' AND not an error.");
        if (summarizeResultButton) {
            summarizeResultButton.style.display = 'none';
        }
        if (translateSummaryButton) translateSummaryButton.style.display = 'inline-block';
        if (translateSummaryContainer) translateSummaryContainer.style.display = 'block';
        if (translateSearchResultButton) translateSearchResultButton.style.display = 'none';
        if (translateSearchResultContainer) translateSearchResultContainer.style.display = 'none';
    } else {
        console.log(`CS: finalizePanelUIUpdates - Condition MET: Default or Error case. (actionType: ${actionType}, isError: ${isError})`);
        if (summarizeResultButton) {
            summarizeResultButton.style.display = 'none';
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
        dragHandle.style.cursor = 'move';
        dragHandle.onmousedown = dragMouseDown;
        console.log("CS: Drag handle assigned.");
    } else {
        console.warn("CS: No drag handle provided for draggable element.");
    }

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.target !== dragHandle && e.target !== elmnt.querySelector('#noosai-panel-title')) {
            console.log("CS: Drag mousedown on non-handle element, ignoring.");
            return;
        }
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        console.log("CS: Drag started.");
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.right = 'auto';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        console.log("CS: Drag ended.");
    }
}

// --- Event Listeners ---
try {
    document.addEventListener('mousedown', (e) => {
        if (resultPanel && resultPanel.classList.contains('panel-visible')) {
            if (panelJustShown) {
                panelJustShown = false;
                return;
            }
            const inside = resultPanel.contains(e.target);
            if (!inside) { // [MODIFIED] Hide dropdown as well
                hideResultPanel();
            }
        }
    }, true);
    console.log("CS: Mousedown listener (for hiding panel) added.");
} catch (error) {
    console.error("CS: Error adding mousedown listener:", error);
}

// --- Positive Animation Removed ---

// --- CSS Injection ---
try {
    // Dynamic overrides handled via content.css and injectStyles()
} catch (e) {}

// --- [NEW] Auto-Paste to LLM ---
function checkAndPerformLLMPaste() {
    chrome.storage.local.get('pendingLLMPaste', (data) => {
        const pending = data.pendingLLMPaste;
        if (!pending) return;

        // Check if the pending paste is recent (e.g., within last 60 seconds)
        if (Date.now() - pending.timestamp > 60000) {
            chrome.storage.local.remove('pendingLLMPaste');
            return;
        }

        const currentUrl = window.location.href;
        let isMatch = false;
        let selector = '';

        if (pending.target === 'chatgpt' && currentUrl.includes('chatgpt.com')) {
            isMatch = true;
            selector = '#prompt-textarea';
        } else if (pending.target === 'claude' && currentUrl.includes('claude.ai')) {
            isMatch = true;
            selector = 'div[contenteditable="true"]';
        } else if (pending.target === 'gemini' && currentUrl.includes('gemini.google.com')) {
            isMatch = true;
            selector = 'div[contenteditable="true"][role="textbox"]';
        } else if (pending.target === 'docs' && currentUrl.includes('docs.google.com')) {
            isMatch = true;
            // Google Docs is tricky. We target the editor iframe or the main editor div.
            // The most reliable way for Docs is often just waiting for focus and pasting.
            selector = '.docs-textevent-target-iframe';
        }

        if (isMatch) {
            console.log(`CS: Match found for ${pending.target}. Waiting for input field...`);

            const attemptPaste = (attemptsLeft) => {
                const inputField = document.querySelector(selector);
                if (inputField) {
                    console.log("CS: Input field found. Pasting text...");

                    // Focus the field
                    inputField.focus();

                    // Small delay to ensure focus is registered
                    setTimeout(() => {
                        if (pending.target === 'docs') {
                            // Google Docs specific handling
                            // We try to paste into the active element (usually the iframe)
                            const success = document.execCommand('insertText', false, pending.text);
                            if (!success) {
                                console.warn("CS: Docs paste failed via execCommand. User may need to paste manually.");
                                // Fallback: Copy to clipboard again just in case
                                navigator.clipboard.writeText(pending.text);
                            }
                        }
                        // For contenteditable divs (Claude, Gemini)
                        else if (inputField.isContentEditable) {
                            // Try execCommand first as it's most reliable for rich text editors
                            const success = document.execCommand('insertText', false, pending.text);

                            if (!success) {
                                // Fallback: Direct manipulation + events
                                console.log("CS: execCommand failed, trying fallback...");
                                inputField.textContent = pending.text;
                                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        } else {
                            // For textarea (ChatGPT)
                            inputField.value = pending.text;
                            inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            // Adjust height if needed
                            inputField.style.height = 'auto';
                            inputField.style.height = inputField.scrollHeight + 'px';
                        }

                        // Clear storage
                        chrome.storage.local.remove('pendingLLMPaste');
                    }, 100);

                } else if (attemptsLeft > 0) {
                    setTimeout(() => attemptPaste(attemptsLeft - 1), 500);
                } else {
                    console.warn("CS: Input field not found after retries.");
                }
            };

            // Start attempting to paste (try for 10 seconds)
            attemptPaste(20);
        }
    });
}

// --- Initialization Call ---
initializeExtensionState();
checkAndPerformLLMPaste(); // [NEW] Check for pending paste on load
console.log("NoosAI Content Script: Initialization finished (v5.0)");