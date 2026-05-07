// background.js - v3.4 - Gemini 3.1 Migration & CSS Isolation Improvements

// --- Constants ---
const BACKEND_ANALYZE_URL = "https://sentiment-analyzer-service-872183226779.us-central1.run.app/analyze";
const BACKEND_VERIFY_URL = "https://sentiment-analyzer-service-872183226779.us-central1.run.app/verify-license";
const VERIFY_LICENSE_SECRET = "4TheFuture2030@";
const NOTION_API_URL_BASE = "https://api.notion.com/v1/blocks/"; // [NEW]
const NOTION_VERSION = "2022-06-28"; // [NEW]

// --- Context Menu IDs ---
const CONTEXT_MENU_ID_SENTIMENT = "noosai_sentiment";
const CONTEXT_MENU_ID_SUMMARIZE = "noosai_summarize";
const CONTEXT_MENU_ID_KEYWORDS = "noosai_keywords";
const CONTEXT_MENU_ID_PAGE_SUMMARIZE = "noosai_summarize_page";
const CONTEXT_MENU_ID_EXPLAIN = "noosai_explain";
const CONTEXT_MENU_ID_SIMPLIFY = "noosai_simplify";
const CONTEXT_MENU_ID_REWRITE = "noosai_rewrite";
const CONTEXT_MENU_ID_REPLY = "noosai_reply";
const CONTEXT_MENU_ID_SEARCH = "noosai_search_selection";

// --- Helper: Create Context Menus ---
function setupContextMenus() {
    // ... (This function is unchanged) ...
    chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
            console.error("BG: Error removing existing context menus:", chrome.runtime.lastError.message);
        }
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_SEARCH, title: "NoosAI: AI Search Selection", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create AI Search menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_REWRITE, title: "NoosAI: Rewrite & Improve", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Rewrite menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_REPLY, title: "NoosAI: Draft Reply", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Reply menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_EXPLAIN, title: "NoosAI: Explain Selection", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Explain menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_SIMPLIFY, title: "NoosAI: Simplify Selection", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Simplify menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_SENTIMENT, title: "NoosAI: Analyze Sentiment", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Sentiment menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_SUMMARIZE, title: "NoosAI: Summarize Selection", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Summarize menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_KEYWORDS, title: "NoosAI: Extract Keywords", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Keywords menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_PAGE_SUMMARIZE, title: "NoosAI: Summarize Page", contexts: ["page"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Page Summarize menu:", chrome.runtime.lastError.message); });
        console.log("BG: Context menus created/updated.");
    });
}

// --- Initialization ---
chrome.runtime.onInstalled.addListener((details) => {
    // ... (This function is unchanged) ...
    setupContextMenus();

    chrome.storage.sync.get(['userId', 'userPersona'], (data) => {
        const toSet = {};
        if (!data.userId) {
            toSet.userId = crypto.randomUUID();
            console.log(`BG: No userId found. Creating new one: ${toSet.userId}`);
        } else {
            console.log(`BG: Existing userId found: ${data.userId}`);
        }

        if (!data.userPersona) {
            toSet.userPersona = 'default';
            console.log(`BG: Setting default persona.`);
        }

        chrome.storage.sync.set(toSet);
    });

    chrome.storage.sync.set({
        extensionEnabled: true,
        isPremium: false,
        enableNegativeAnimation: true,
        enablePositiveAnimation: true
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("BG: Error setting default values:", chrome.runtime.lastError);
        } else {
            console.log("BG: Default values set on install.");
        }
    });
});

// --- Listener for Context Menu Clicks ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
    // ... (This function is unchanged) ...
    console.log("BG: Context menu clicked:", info);
    if (!tab?.id) {
        console.error("BG: No Tab ID for context menu action.");
        return;
    }
    const tabId = tab.id;
    const positionInfo = { type: "contextMenu" };

    if (info.menuItemId === CONTEXT_MENU_ID_PAGE_SUMMARIZE) {
        triggerPageSummary(tabId, positionInfo);
        return;
    }

    if (!info.selectionText || info.selectionText.trim().length === 0) {
        console.log("BG: No text selected for menu item:", info.menuItemId);
        return;
    }

    const selectedText = info.selectionText.trim();
    let action = "";

    switch (info.menuItemId) {
        case CONTEXT_MENU_ID_SENTIMENT: action = "sentiment"; break;
        case CONTEXT_MENU_ID_SUMMARIZE: action = "summarize"; break;
        case CONTEXT_MENU_ID_KEYWORDS: action = "keywords"; break;
        case CONTEXT_MENU_ID_REWRITE: action = "rewrite"; break;
        case CONTEXT_MENU_ID_REPLY: action = "reply"; break;
        case CONTEXT_MENU_ID_EXPLAIN: action = "explain"; break;
        case CONTEXT_MENU_ID_SIMPLIFY: action = "simplify"; break;
        case CONTEXT_MENU_ID_SEARCH: action = "search"; break;
        default:
            console.warn("BG: Unknown context menu item for selected text:", info.menuItemId);
            return;
    }

    console.log(`BG: Context action: ${action}, Text length: ${selectedText.length}`);
    chrome.storage.sync.get("userPersona", (data) => {
        const options = {
            targetLanguage: "auto",
            persona: data.userPersona || "default"
        };
        performAnalysisAction(tabId, selectedText, action, positionInfo, options);
    });
});

// --- Function to be injected to get page content ---
function getPageContentForSummary() { return document.body.innerText || ''; }

// --- Helper Function for Page Summary ---
function triggerPageSummary(tabId, positionInfo) {
    // ... (This function is unchanged) ...
    console.log("BG: Page summary triggered. Injecting script...");
    chrome.scripting.executeScript({ target: { tabId: tabId }, func: getPageContentForSummary }, (injectionResults) => {
        if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) { console.error('BG: Failed inject/execute script page summary:', chrome.runtime.lastError?.message || 'No result'); chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: "error", data: { error: "Could not read page content." }, position: positionInfo }).catch(e => console.warn("Err send msg:", e.message)); return; }
        const pageText = injectionResults[0].result;
        if (pageText && pageText.trim().length > 0) {
            console.log(`BG: Extracted page text (first 100): ${pageText.substring(0, 100)}...`);
            chrome.storage.sync.get("userPersona", (data) => {
                const options = {
                    targetLanguage: "auto",
                    persona: data.userPersona || "default"
                };
                performAnalysisAction(tabId, pageText, "summarize", positionInfo, options);
            });
        }
        else { console.warn("BG: Extracted page text empty."); chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: "error", data: { error: "Page has no readable text." }, position: positionInfo }).catch(e => console.warn("Err send msg:", e.message)); }
    });
}


// --- Central Function to Perform Analysis Actions ---
function performAnalysisAction(tabId, textToAnalyze, action, position, options = {}) {
    // ... (This function is unchanged) ...
    const { targetLanguage = "auto", followUpPrompt = null, persona = "default" } = options;
    console.log(`BG: Performing action '${action}' for tab ${tabId}. Lang: ${targetLanguage}, Persona: ${persona}`);
    if (followUpPrompt) {
        console.log(`BG: Follow-up prompt received: ${followUpPrompt}`);
    }

    // [NEW] Immediate Feedback & Animation Timer
    const MIN_ANIMATION_TIME = 700; // Reduced from 1500ms for snappier feel
    const startTime = Date.now();

    // Customize processing message
    let processingMsg = "NoosAI is working its magic...";
    if (action === 'search') processingMsg = "Searching the web & synthesizing results...";
    if (action === 'rewrite') processingMsg = "Polishing your text...";
    if (action === 'translate') processingMsg = "Translating...";

    // Send immediate "Ack" to show the processing state
    chrome.tabs.sendMessage(tabId, {
        action: "showProcessing",
        message: processingMsg,
        position: position
    }).catch(e => console.warn("BG: Could not send processing message:", e.message));

    chrome.tabs.get(tabId, (tab) => {
        const pageContext = {
            url: tab ? tab.url : "",
            title: tab ? tab.title : ""
        };

        chrome.storage.sync.get(["isPremium", "licenseKey", "userId", "userVoiceStyle"], (settings) => {
            if (chrome.runtime.lastError) { console.error("BG: Error getting settings:", chrome.runtime.lastError.message); chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: "error", data: { error: "Error loading settings" }, position: position }).catch(e => console.warn("BG Err send:", e.message)); return; }

            const isPremium = settings.isPremium === true;
            const userLicenseKey = settings.licenseKey || null;
            const userId = settings.userId;
            const userVoiceStyle = settings.userVoiceStyle || null;

            if (!userId) {
                console.error("BG: CRITICAL - UserID not found in storage. This should not happen.");
                chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: "error", data: { error: "Extension error: UserID not found. Please reinstall." }, position: position }).catch(e => console.warn("BG Err send:", e.message));
                return;
            }

            // Combine persona with voice style if available
            let finalPersona = persona;
            if (userVoiceStyle && (action === 'rewrite' || action === 'followUp' || action === 'reply')) {
                finalPersona = userVoiceStyle; // Use voice style for writing-focused actions
                console.log(`BG: Using True Persona voice style for action '${action}'`);
            }

            console.log(`BG: Sending action '${action}' to backend... Context: ${pageContext.url}`);
            fetch(BACKEND_ANALYZE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action,
                    text: textToAnalyze,
                    targetLanguage: targetLanguage,
                    followUpPrompt: followUpPrompt,
                    persona: finalPersona,
                    licenseKey: isPremium ? userLicenseKey : null,
                    userId: userId,
                    pageContext: pageContext,
                    useKnowledgeBase: (action === 'reply') // [NEW] Enable RAG for replies
                })
            })
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 402 || response.status === 403) {
                            return response.json().then(errData => {
                                console.warn(`BG: Auth/Payment error from server: ${errData.details}`);
                                if (response.status === 403) {
                                    chrome.storage.sync.set({ isPremium: false, licenseKey: null });
                                }
                                throw new Error(errData.details || "An error occurred.");
                            });
                        }
                        return response.text().then(text => { throw new Error(`Service Error (${response.status}) ${text.substring(0, 100)}`); });
                    }
                    return response;
                })
                .then(response => {
                    const isStreamingAction = (action === 'search' || action === 'followUp') && response.headers.get("Content-Type")?.includes("application/jsonl");

                    if (isStreamingAction) {
                        // Streaming starts immediately, no artificial delay needed as the "typing" is the animation
                        console.log(`BG: Detected streaming response for action: ${action}`);
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let buffer = "";

                        function processStream() {
                            reader.read().then(({ done, value }) => {
                                if (done) {
                                    if (buffer.trim()) {
                                        try {
                                            const jsonObject = JSON.parse(buffer.trim());
                                            handleStreamObject(tabId, jsonObject, position, action);
                                        } catch (e) {
                                            console.error("BG: Error parsing final JSON object from stream buffer:", e, "Buffer:", buffer);
                                        }
                                    }
                                    console.log("BG: Stream finished for action:", action);
                                    return;
                                }
                                buffer += decoder.decode(value, { stream: true });
                                let lines = buffer.split('\n');
                                buffer = lines.pop();

                                lines.forEach(line => {
                                    if (line.trim()) {
                                        try {
                                            const jsonObject = JSON.parse(line);
                                            handleStreamObject(tabId, jsonObject, position, action);
                                        } catch (e) {
                                            console.error("BG: Error parsing JSON object from stream:", e, "Line:", line);
                                        }
                                    }
                                });
                                processStream();
                            }).catch(streamError => {
                                console.error(`BG: Error reading from stream for action ${action}:`, streamError);
                                const errorPayload = { type: 'error', payload: { message: 'Stream reading error', details: streamError.message } };
                                handleStreamObject(tabId, errorPayload, position, action);
                            });
                        }
                        processStream();
                    } else {
                        // Non-streaming: Apply the "Magical Delay"
                        console.log(`BG: Detected non-streaming response for action: ${action}`);
                        return response.json().then(data => {
                            if (!data || !data.action) { throw new Error("Invalid response format from analysis service."); }
                            console.log("BG: Received successful non-streaming data from backend:", data);

                            // Calculate remaining time to meet the minimum animation time
                            const elapsedTime = Date.now() - startTime;
                            const delay = Math.max(0, MIN_ANIMATION_TIME - elapsedTime);
                            console.log(`BG: Artificial delay for animation: ${delay}ms`);

                            setTimeout(() => {
                                if (data.action === 'rewrite' && data.rewrittenText) {
                                    // Special handling for rewrite: Replace text in-place
                                    chrome.tabs.sendMessage(tabId, {
                                        action: "replaceSelection",
                                        text: data.rewrittenText
                                    }).catch(e => {
                                        console.warn(`BG: Error sending replaceSelection to tab ${tabId}:`, e.message);
                                        // Fallback to showing result in panel if replacement fails
                                        chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: "rewrite", data: data, position: position });
                                    });
                                } else {
                                    let resultType = (action === 'followUp') ? 'followUp' : (data.action || action);
                                    console.log(`BG: Sending showResult to tab ${tabId}. ResultType: ${resultType}`);
                                    chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: resultType, data: data, position: position })
                                        .catch(e => {
                                            console.warn(`BG: Error sending final result message for action ${action} to tab ${tabId}:`, e.message);
                                        });
                                }
                            }, delay);
                        });
                    }
                })
                .catch(error => {
                    console.error(`BG: Error during backend fetch/processing for action ${action}:`, error);
                    chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: "error", data: { error: `${error.message || 'Unknown backend error.'}` }, position: position }).catch(e => console.warn("BG: Error sending fetch error message:", e.message));
                });
        });
    });
}

// --- Helper to Handle Stream Objects ---
function handleStreamObject(tabId, streamObject, position, originalAction) {
    // ... (This function is unchanged) ...
    const messagePayload = { position: position, data: streamObject.payload };

    switch (streamObject.type) {
        case 'metadata':
            messagePayload.action = "initializeStreamPanel";
            messagePayload.data = { action: streamObject.action || originalAction };
            break;
        case 'chunk': messagePayload.action = "appendResultChunk"; break;
        case 'citations': messagePayload.action = "displayCitations"; messagePayload.data = { citations: streamObject.payload }; break;
        case 'streamEnd':
            messagePayload.action = "finalizeStreamPanel";
            messagePayload.originalAction = originalAction;
            messagePayload.data = { fullTextForCopy: streamObject.fullTextForCopy };
            break;
        case 'error':
            messagePayload.action = "showResult";
            messagePayload.resultType = "error";
            messagePayload.data = { error: streamObject.payload.message, details: streamObject.payload.details };
            break;
        default: console.warn("BG: Unknown stream object type:", streamObject.type); return;
    }
    chrome.tabs.sendMessage(tabId, messagePayload).catch(e => console.warn(`BG: Error sending ${messagePayload.action} for ${originalAction}:`, e.message));
}

// --- Main Message Listener ---
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log("BG: Received runtime message:", request);

        // --- [NEW] "sendToNotion" handler ---
        if (request.action === "sendToNotion") {
            console.log("BG: Received sendToNotion request.");
            // Get keys from storage
            chrome.storage.sync.get(['notionApiKey', 'notionPageId'], (data) => {
                if (chrome.runtime.lastError) {
                    console.error("BG: Error getting Notion keys from storage:", chrome.runtime.lastError);
                    sendResponse({ success: false, error: "Error retrieving Notion keys." });
                    return;
                }

                const { notionApiKey, notionPageId } = data;

                if (!notionApiKey || !notionPageId) {
                    let errorMsg = "Missing Notion API Key or Page ID. Please set them in the extension options page.";
                    if (!notionApiKey) errorMsg = "Missing Notion API Key. Please set it in the extension options page.";
                    else if (!notionPageId) errorMsg = "Missing Notion Page ID. Please set it in the extension options page.";
                    console.warn(`BG: Notion send failed: ${errorMsg}`);
                    sendResponse({ success: false, error: errorMsg });
                    return;
                }

                const url = `${NOTION_API_URL_BASE}${notionPageId}/children`;

                fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${notionApiKey}`,
                        'Content-Type': 'application/json',
                        'Notion-Version': NOTION_VERSION
                    },
                    body: JSON.stringify({
                        "children": request.blocks // Use the blocks from content.js
                    })
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(err => {
                                console.error("BG: Notion API error response:", err);
                                throw new Error(err.message || `Notion API Error (${response.status})`);
                            });
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log("BG: Successfully sent to Notion:", data);
                        const pageUrl = `https://www.notion.so/${notionPageId.replace(/-/g, '')}`;
                        sendResponse({ success: true, url: pageUrl });
                    })
                    .catch(error => {
                        console.error("BG: Error sending to Notion:", error);
                        sendResponse({ success: false, error: error.message || "Failed to send to Notion." });
                    });
            });
            return true; // Indicates an asynchronous response
        }
        // --- [END NEW] ---

        if (request.message === "updateState" || request.message === "updateAnimationSetting") {
            // ... (This logic is unchanged) ...
            if (request.message === "updateState") {
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        if (tab.id) chrome.tabs.sendMessage(tab.id, { message: "updateState", enabled: request.enabled }).catch(e => console.warn(`BG: Could not send updateState to tab ${tab.id}: ${e.message}`));
                    });
                });
            } else if (request.message === "updateAnimationSetting") {
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        if (tab.id) chrome.tabs.sendMessage(tab.id, { message: "updateAnimationSetting", setting: request.setting, enabled: request.enabled }).catch(e => console.warn(`BG: Could not send updateAnimationSetting to tab ${tab.id}: ${e.message}`));
                    });
                });
            }
            return false;
        }
        else if (request.action === "verifyLicenseKey") {
            // ... (This logic is unchanged) ...
            const key = request.licenseKey; console.log(`BG: Received verifyLicenseKey action...`);
            fetch(BACKEND_VERIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Extension-Secret': VERIFY_LICENSE_SECRET }, body: JSON.stringify({ licenseKey: key }) })
                .then(response => { if (!response.ok) { return response.json().then(eD => { throw new Error(eD.message || `V.Fail(${response.status})`) }).catch(() => { throw new Error(`V.Fail(${response.status})`) }) } return response.json(); })
                .then(data => {
                    if (data?.valid && data?.isPremium) {
                        sendResponse({ success: true, isPremium: true });
                    } else {
                        sendResponse({ success: false, message: data.message || "Invalid Key" });
                    }
                })
                .catch(error => { console.error("BG: Verify Error:", error); let eMsg = "Verify failed"; if (error?.message) eMsg = error.message; sendResponse({ success: false, message: eMsg }); });
            return true;
        }
        else if (request.action === "summarizePage") {
            // ... (This logic is unchanged) ...
            console.log("BG: Received summarizePage request from popup.");
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) { console.error("BG: Could not get active tab:", chrome.runtime.lastError?.message || "No tab"); return; }
                triggerPageSummary(tabs[0].id, { type: "pageAction" });
            });
            return true;
        }
        else if (request.action === "analyzeCustomText") {
            // ... (This logic is unchanged) ...
            console.log("BG: Received analyzeCustomText request from popup:", request);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) {
                    console.error("BG: Could not get active tab for custom text analysis:", chrome.runtime.lastError?.message || "No tab");
                    sendResponse({ success: false, error: "Could not find active tab." });
                    return;
                }
                const tabId = tabs[0].id;
                const options = {
                    targetLanguage: request.targetLanguage,
                    persona: request.persona || "default"
                };
                performAnalysisAction(tabId, request.text, request.analysisType, { type: "popupAction" }, options);
                sendResponse({ success: true });
            });
            return true;
        }
        else if (request.action === "translateExistingText") {
            // ... (This logic is unchanged) ...
            console.log("BG: Received translateExistingText request from content script:", request);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) {
                    console.error("BG: Could not get active tab for translateExistingText:", chrome.runtime.lastError?.message || "No tab");
                    return;
                }
                const tabId = tabs[0].id;
                chrome.storage.sync.get("userPersona", (data) => {
                    const options = {
                        targetLanguage: request.targetLanguage,
                        persona: data.userPersona || "default"
                    };
                    performAnalysisAction(tabId, request.textToTranslate, "translate", { type: "panelAction" }, options);
                });
            });
            return false;
        }
        else if (request.action === "summarizeExistingText") {
            // ... (This logic is unchanged) ...
            console.log("BG: Received summarizeExistingText request from content script:", request);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) {
                    console.error("BG: Could not get active tab for summarizeExistingText:", chrome.runtime.lastError?.message || "No tab");
                    return;
                }
                const tabId = tabs[0].id;
                chrome.storage.sync.get("userPersona", (data) => {
                    const options = {
                        targetLanguage: request.targetLanguage || "auto",
                        persona: data.userPersona || "default"
                    };
                    performAnalysisAction(tabId, request.textToSummarize, "summarize", { type: "panelAction" }, options);
                });
            });
            return false;
        }
        else if (request.action === "performFollowUp") {
            // ... (This logic is unchanged) ...
            console.log("BG: Received performFollowUp request from content script:", request);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) {
                    console.error("BG: Could not get active tab for performFollowUp:", chrome.runtime.lastError?.message || "No tab");
                    return;
                }
                const tabId = tabs[0].id;
                chrome.storage.sync.get("userPersona", (data) => {
                    performAnalysisAction(
                        tabId,
                        request.context,
                        "followUp",
                        { type: "panelAction" },
                        {
                            targetLanguage: request.targetLanguage || "auto",
                            followUpPrompt: request.prompt,
                            persona: data.userPersona || "default"
                        }
                    );
                });
            });
            return false;
        }

        else if (request.action === "performGhostAction") {
            console.log("BG: Received performGhostAction request:", request);

            chrome.storage.sync.get(["isPremium", "licenseKey", "userId", "userPersona", "userVoiceStyle"], (settings) => {
                const isPremium = settings.isPremium === true;
                const userLicenseKey = settings.licenseKey || null;
                const userId = settings.userId;
                const basePersona = settings.userPersona || "default";
                const userVoiceStyle = settings.userVoiceStyle || null;

                if (!userId) {
                    sendResponse({ success: false, error: "User ID missing." });
                    return;
                }

                // Use voice style if analyzing samples, otherwise use it for rewrite actions
                let finalPersona = basePersona;
                if (request.prompt && request.prompt.includes("Analyze the writing style")) {
                    // This is a voice analysis request, don't apply voice style to itself
                    finalPersona = "default";
                } else if (userVoiceStyle) {
                    // Use the voice style for all other Ghost actions (rewrite, fix grammar, etc.)
                    finalPersona = userVoiceStyle;
                    console.log("BG: Applying True Persona voice style to Ghost Action");
                }

                // Construct payload
                const payload = {
                    action: "rewrite", // Ghost actions are essentially rewrites
                    text: request.text,
                    targetLanguage: "auto",
                    followUpPrompt: request.prompt, // Pass the specific instruction (Fix Grammar, etc.)
                    persona: finalPersona,
                    licenseKey: isPremium ? userLicenseKey : null,
                    userId: userId,
                    pageContext: { url: "ghost-input", title: "Ghost Input" }
                };

                fetch(BACKEND_ANALYZE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            sendResponse({ success: false, error: data.error });
                        } else {
                            // The backend returns 'rewrittenText' for rewrite actions
                            sendResponse({ success: true, rewrittenText: data.rewrittenText || data.result });
                        }
                    })
                    .catch(error => {
                        console.error("BG: Ghost Action Fetch Error:", error);
                        sendResponse({ success: false, error: error.message });
                    });
            });
            return true; // Async response
        }

        else if (request.action === "openLLM") {
            console.log("BG: Received openLLM request:", request);
            const urls = {
                chatgpt: 'https://chatgpt.com',
                claude: 'https://claude.ai/new',
                gemini: 'https://gemini.google.com/app',
                docs: 'https://docs.new'
            };
            const targetUrl = urls[request.target];

            if (targetUrl) {
                // Use local storage for temporary data
                chrome.storage.local.set({
                    pendingLLMPaste: {
                        target: request.target,
                        text: request.text,
                        timestamp: Date.now()
                    }
                }, () => {
                    console.log(`BG: Stored pending paste for ${request.target}. Opening URL...`);
                    chrome.tabs.create({ url: targetUrl });
                });
            } else {
                console.warn("BG: Unknown LLM target:", request.target);
            }
            return false;
        }

        console.warn("BG: Runtime message type not handled:", request);
        return false;
    }
);