// c:\Users\alexa\OneDrive\Υπολογιστής\noos.ai v1.7\background.js
// background.js - v1.9 - Correct Error Messages for Panel + Translate Existing Text

// --- Constants ---
const BACKEND_ANALYZE_URL = "https://sentiment-analyzer-service-872183226779.us-central1.run.app/analyze";
const BACKEND_VERIFY_URL = "https://sentiment-analyzer-service-872183226779.us-central1.run.app/verify-license";
const EXTENSION_SECRET = "4TheFuture2030@"; // CHANGE LATER!

// --- Context Menu IDs ---
const CONTEXT_MENU_ID_SENTIMENT = "noosai_sentiment";
const CONTEXT_MENU_ID_SUMMARIZE = "noosai_summarize";
const CONTEXT_MENU_ID_KEYWORDS = "noosai_keywords";
const CONTEXT_MENU_ID_PAGE_SUMMARIZE = "noosai_summarize_page";
const CONTEXT_MENU_ID_EXPLAIN = "noosai_explain";
const CONTEXT_MENU_ID_SIMPLIFY = "noosai_simplify";
const CONTEXT_MENU_ID_SEARCH = "noosai_search_selection";

// --- Helper: Create Context Menus ---
function setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
            console.error("BG: Error removing existing context menus:", chrome.runtime.lastError.message);
        }

        // Reordered to somewhat match popup button sequence (Search, Explain, Simplify first)
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_SEARCH, title: "NoosAI: AI Search Selection", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create AI Search menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_EXPLAIN, title: "NoosAI: Explain Selection", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Explain menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_SIMPLIFY, title: "NoosAI: Simplify Selection", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Simplify menu:", chrome.runtime.lastError.message); });
        
        // Core features
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_SENTIMENT, title: "NoosAI: Analyze Sentiment", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Sentiment menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_SUMMARIZE, title: "NoosAI: Summarize Selection", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Summarize menu:", chrome.runtime.lastError.message); });
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_KEYWORDS, title: "NoosAI: Extract Keywords", contexts: ["selection"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Keywords menu:", chrome.runtime.lastError.message); });

        // Page-level action (Translate is not in context menu, so it's skipped here)
        chrome.contextMenus.create({ id: CONTEXT_MENU_ID_PAGE_SUMMARIZE, title: "NoosAI: Summarize Page", contexts: ["page"] }, () => { if (chrome.runtime.lastError) console.error("BG: Err create Page Summarize menu:", chrome.runtime.lastError.message); });

        console.log("BG: Context menus created/updated.");
    });
}

// --- Initialization ---
chrome.runtime.onInstalled.addListener((details) => { /* ... same as before ... */ setupContextMenus(); chrome.storage.sync.set({extensionEnabled:!0,isPremium:!1,totalFreeTierUsageCount:0,enableNegativeAnimation:!0,enablePositiveAnimation:!0},()=>{/*...*/}); });

// --- Listener for Context Menu Clicks ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("BG: Context menu clicked:", info);
    if (!tab?.id) {
        console.error("BG: No Tab ID for context menu action.");
        return;
    }
    const tabId = tab.id;
    const positionInfo = { type: "contextMenu" }; // To inform content script where to show panel

    // Handle page-level actions first
    if (info.menuItemId === CONTEXT_MENU_ID_PAGE_SUMMARIZE) {
        triggerPageSummary(tabId, positionInfo);
        return;
    }

    // For selection-based actions
    if (!info.selectionText || info.selectionText.trim().length === 0) {
        console.log("BG: No text selected for menu item:", info.menuItemId);
        // Optionally, you could inform the user via a panel message if this is desired.
        // For now, it returns silently as per the original partial logic.
        return;
    }

    const selectedText = info.selectionText.trim();
    let action = "";
    let requiresPremium = false;

    switch (info.menuItemId) {
        case CONTEXT_MENU_ID_SENTIMENT: action = "sentiment"; requiresPremium = false; break;
        case CONTEXT_MENU_ID_SUMMARIZE: action = "summarize"; requiresPremium = true; break;
        case CONTEXT_MENU_ID_KEYWORDS: action = "keywords"; requiresPremium = true; break;
        case CONTEXT_MENU_ID_EXPLAIN: action = "explain"; requiresPremium = true; break;
        case CONTEXT_MENU_ID_SIMPLIFY: action = "simplify"; requiresPremium = true; break;
        case CONTEXT_MENU_ID_SEARCH: action = "search"; requiresPremium = true; break;
        default:
            console.warn("BG: Unknown context menu item for selected text:", info.menuItemId);
            return; // Unknown action for selected text
    }

    console.log(`BG: Context action: ${action}, Premium: ${requiresPremium}, Text length: ${selectedText.length}`);
    performAnalysisAction(tabId, selectedText, action, requiresPremium, positionInfo);
    // targetLanguage will default to "auto" in performAnalysisAction, which is suitable for context menu actions.
});

// --- Function to be injected to get page content ---
function getPageContentForSummary() { return document.body.innerText || ''; }

// --- Helper Function for Page Summary ---
function triggerPageSummary(tabId, positionInfo) {
     chrome.storage.sync.get("isPremium", (settings) => {
        if (chrome.runtime.lastError) { console.error("BG: Page Summary Err get settings:",chrome.runtime.lastError.message); chrome.tabs.sendMessage(tabId,{action:"showResult",resultType:"error",data:{error:"Error checking status"},position:positionInfo}).catch(e=>console.warn("BG Err send:",e.message)); return; }
        const isPremium = settings.isPremium === true; // Page summary is premium
        if (!isPremium) {
            console.log("BG: Page Summary requires Premium.");
            // *** Send Specific Premium Required Error via showResult ***
            chrome.tabs.sendMessage(tabId, {
                action: "showResult",
                resultType: "error", // Mark as error type
                data: { error: "Page Summary requires Premium upgrade. Please activate a license key." }, // Specific message in data.error
                position: positionInfo
            }).catch(e => console.warn("BG Err send msg:", e.message));
            return;
        }
        console.log("BG: Premium user for page summary. Injecting script...");
        chrome.scripting.executeScript({ target:{tabId:tabId}, func:getPageContentForSummary }, (injectionResults) => {
             if(chrome.runtime.lastError||!injectionResults||injectionResults.length===0){ console.error('BG: Failed inject/execute script page summary:',chrome.runtime.lastError?.message||'No result'); chrome.tabs.sendMessage(tabId,{action:"showResult",resultType:"error",data:{error:"Could not read page content."},position:positionInfo}).catch(e=>console.warn("Err send msg:",e.message)); return; }
             const pageText = injectionResults[0].result;
             if (pageText && pageText.trim().length > 0) {
                console.log(`BG: Extracted page text (first 100): ${pageText.substring(0, 100)}...`);
                // For page summary, targetLanguage can default to "auto" or a sensible default like "en"
                // Since it's a general page summary, "auto" (match input language) makes sense.
                performAnalysisAction(tabId, pageText, "summarize", true, positionInfo, "auto");
            }
             else { console.warn("BG: Extracted page text empty."); chrome.tabs.sendMessage(tabId,{action:"showResult",resultType:"error",data:{error:"Page has no readable text."},position:positionInfo}).catch(e=>console.warn("Err send msg:",e.message)); }
        });
     });
}


// --- Central Function to Perform Analysis Actions ---
function performAnalysisAction(tabId, textToAnalyze, action, requiresPremium, position, targetLanguage = "auto") {
    console.log(`BG: Performing action '${action}' for tab ${tabId}. Premium: ${requiresPremium}, Lang: ${targetLanguage}`);

    // ** REMOVED showProcessing message **

    chrome.storage.sync.get(["isPremium", "totalFreeTierUsageCount"], (settings) => {
        if (chrome.runtime.lastError) { console.error("BG: Error getting settings:",chrome.runtime.lastError.message); chrome.tabs.sendMessage(tabId,{action:"showResult",resultType:"error",data:{error:"Error loading settings"},position:position}).catch(e=>console.warn("BG Err send:",e.message)); return; }

        const isPremium = settings.isPremium === true;
        let currentUsageCount = settings.totalFreeTierUsageCount || 0;
        console.log(`BG: Status for action ${action}: isPremium=${isPremium}, usageCount=${currentUsageCount}`);

        // Permission Check
        if (requiresPremium && !isPremium) {
            console.log(`BG: Premium action '${action}' requested, but user is not premium.`);
            // *** Send Specific Premium Required Error via showResult ***
            chrome.tabs.sendMessage(tabId, {
                action: "showResult", resultType: "error",
                data: { error: `This feature (${action}) requires a Premium upgrade.` }, // Specific message
                position: position
            }).catch(e => console.warn("BG: Error sending premium required message:", e.message)); return;
        }

        // --- Call Backend Service ---
        console.log(`BG: Sending action '${action}' to backend...`);
        fetch(BACKEND_ANALYZE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Extension-Secret': EXTENSION_SECRET },
            body: JSON.stringify({
                action: action,
                text: textToAnalyze,
                targetLanguage: targetLanguage // Pass the target language
            }) })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(`Service Error (${response.status}) ${text.substring(0, 100)}`); });
            }
            // Check content type for streaming (specifically for search)
            if (action === 'search' && response.headers.get("Content-Type")?.includes("application/jsonl")) {
                console.log(`BG: Detected streaming response for action: ${action}`);
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                function processStream() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            if (buffer.trim()) { // Process any remaining buffer content
                                try {
                                    const jsonObject = JSON.parse(buffer.trim());
                                    handleStreamObject(tabId, jsonObject, position, action);
                                } catch (e) {
                                    console.error("BG: Error parsing final JSON object from stream buffer:", e, "Buffer:", buffer);
                                }
                            }
                            console.log("BG: Stream finished for action:", action);
                            // Note: A final "streamComplete" type message is sent from server as 'streamEnd'
                            return;
                        }
                        buffer += decoder.decode(value, { stream: true });
                        let lines = buffer.split('\n');
                        buffer = lines.pop(); // Keep last partial line in buffer

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
                        processStream(); // Continue reading
                    }).catch(streamError => {
                        console.error(`BG: Error reading from stream for action ${action}:`, streamError);
                        // Send an error message to the content script
                        const errorPayload = { type: 'error', payload: { message: 'Stream reading error', details: streamError.message } };
                        handleStreamObject(tabId, errorPayload, position, action);
                    });
                }
                processStream(); // Start processing the stream
            } else {
                // Handle non-streaming JSON response (for actions other than search, or if search fails to stream)
                console.log(`BG: Detected non-streaming response for action: ${action}`);
                return response.json().then(data => {
                    if (!data || !data.action) { throw new Error("Invalid response format from analysis service."); }
                    console.log("BG: Received successful non-streaming data from backend:", data);
                    chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: data.action, data: data, position: position })
                        .catch(e => {
                            console.warn(`BG: Error sending final result message for action ${action} to tab ${tabId}:`, e.message);
                            if (e.message && e.message.includes("Could not establish connection. Receiving end does not exist.")) {
                                chrome.permissions.contains({ permissions: ["notifications"] }, (granted) => {
                                    if (granted) {
                                        chrome.notifications.create({ type: "basic", iconUrl: chrome.runtime.getURL("icons/icon48.png"), title: "NoosAI Analysis Error", message: `Could not display results on the current page. (Action: ${action})` });
                                    }
                                });
                            }
                        });
                });
            }
        })
        .catch(error => {
             console.error(`BG: Error during backend fetch/processing for action ${action}:`, error);
             chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: "error", data: { error: `Error: ${error.message || 'Unknown backend error.'}` }, position: position }).catch(e => console.warn("BG: Error sending fetch error message:", e.message));
         });
    }); // End storage.get callback
} // End performAnalysisAction

// --- Helper to Handle Stream Objects ---
function handleStreamObject(tabId, streamObject, position, originalAction) {
    // console.log("BG: Handling stream object:", streamObject.type, "for action:", originalAction, "Payload:", streamObject.payload);
    const messagePayload = { position: position, data: streamObject.payload }; 

    switch (streamObject.type) {
        case 'metadata': messagePayload.action = "initializeStreamPanel"; messagePayload.data = { action: streamObject.action }; break; // Pass original action from metadata
        case 'chunk': messagePayload.action = "appendResultChunk"; break;
        case 'citations': messagePayload.action = "displayCitations"; messagePayload.data = { citations: streamObject.payload }; break; // Ensure payload is correctly structured
        case 'streamEnd':
            messagePayload.action = "finalizeStreamPanel";
            // streamObject is { type: 'streamEnd', fullTextForCopy: "..." }
            messagePayload.data = { fullTextForCopy: streamObject.fullTextForCopy }; // Correctly package the data
            break;
        case 'error': // This will be handled by showResult in content.js
            messagePayload.action = "showResult";
            messagePayload.resultType = "error"; // Explicitly set resultType for error
            messagePayload.data = { error: streamObject.payload.message, details: streamObject.payload.details };
            break;
        default: console.warn("BG: Unknown stream object type:", streamObject.type); return; 
    }
    chrome.tabs.sendMessage(tabId, messagePayload).catch(e => console.warn(`BG: Error sending ${messagePayload.action} for ${originalAction}:`, e.message));
}

// --- Main Message Listener ---
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("BG: Received runtime message:", request);

        if (request.message === "updateState" || request.message === "updateAnimationSetting") { /* ... relay ... */ return false; }
        else if (request.action === "verifyLicenseKey") {
            // --- License Verification Handler ---
             const key = request.licenseKey; console.log(`BG: Received verifyLicenseKey action...`);
             fetch(BACKEND_VERIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Extension-Secret': EXTENSION_SECRET }, body: JSON.stringify({ licenseKey: key }) })
             .then(response => { /* ... check ok ... */ if(!response.ok){return response.json().then(eD=>{throw new Error(eD.message||`V.Fail(${response.status})`)}).catch(()=>{throw new Error(`V.Fail(${response.status})`)})} return response.json(); })
             .then(data => { if (data?.valid && data?.isPremium) { chrome.storage.sync.set({ isPremium: true, totalFreeTierUsageCount: 0 }, () => { if(chrome.runtime.lastError){sendResponse({success:!1,message:"Storage err"})}else{sendResponse({success:!0,isPremium:!0})} }); } else { sendResponse({ success: false, message: data.message || "Invalid Key" }); } })
             .catch(error => { console.error("BG: Verify Error:", error); let eMsg="Verify failed"; if(error?.message) eMsg=error.message; sendResponse({ success: false, message: eMsg }); });
            return true; // Async fetch
        }
        else if (request.action === "summarizePage") {
            // --- Page Summary Handler ---
            console.log("BG: Received summarizePage request from popup.");
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) { console.error("BG: Could not get active tab:", chrome.runtime.lastError?.message||"No tab"); return; }
                triggerPageSummary(tabs[0].id, { type: "pageAction" }); // Use helper
            });
            return true; // Async operations inside
        }
        else if (request.action === "analyzeCustomText") {
            console.log("BG: Received analyzeCustomText request from popup:", request);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) {
                    console.error("BG: Could not get active tab for custom text analysis:", chrome.runtime.lastError?.message || "No tab");
                    sendResponse({ success: false, error: "Could not find active tab." });
                    return;
                }
                const tabId = tabs[0].id;
                let requiresPremium = false;
                if (["summarize", "keywords", "translate", "explain", "simplify", "search"].includes(request.analysisType)) {
                    requiresPremium = true;
                }
                performAnalysisAction(tabId, request.text, request.analysisType, requiresPremium, { type: "popupAction" }, request.targetLanguage);
                sendResponse({ success: true }); // Acknowledge receipt to popup
            });
            return true; // Async operations
        }
        else if (request.action === "translateExistingText") {
            console.log("BG: Received translateExistingText request from content script:", request);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) {
                    console.error("BG: Could not get active tab for translateExistingText:", chrome.runtime.lastError?.message || "No tab");
                    // No direct sendResponse needed here as the content script isn't waiting for a direct reply to this specific message
                    return;
                }
                const tabId = tabs[0].id;
                // Assume translating existing text is also a premium feature if general translation is.
                const requiresPremium = true;
                // The position isn't strictly necessary here as the panel is already open,
                // but we can pass a generic one or null.
                performAnalysisAction(tabId, request.textToTranslate, "translate", requiresPremium, { type: "panelAction" }, request.targetLanguage);
            });
            return false; // Not expecting a direct response to content.js for this specific message
        }
        else if (request.action === "summarizeExistingText") {
            console.log("BG: Received summarizeExistingText request from content script:", request);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0]?.id) {
                    console.error("BG: Could not get active tab for summarizeExistingText:", chrome.runtime.lastError?.message || "No tab");
                    return;
                }
                const tabId = tabs[0].id;
                const requiresPremium = true; // Summarization is premium
                // Position can be generic as panel is already open
                performAnalysisAction(tabId, request.textToSummarize, "summarize", requiresPremium, { type: "panelAction" }, request.targetLanguage || "auto");
            });
            return false; // Not expecting a direct response for this specific message, result comes via showResult
        }


        console.warn("BG: Runtime message type not handled:", request);
        return false;
    }
); // End of onMessage listener
