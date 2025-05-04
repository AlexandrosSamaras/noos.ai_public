// background.js - v1.9 - Correct Error Messages for Panel

// --- Constants ---
const BACKEND_ANALYZE_URL = "https://sentiment-analyzer-service-872183226779.us-central1.run.app/analyze";
const BACKEND_VERIFY_URL = "https://sentiment-analyzer-service-872183226779.us-central1.run.app/verify-license";
const EXTENSION_SECRET = "4TheFuture2030@"; // CHANGE LATER!
const FREE_TIER_LIMIT = 5;

// --- Context Menu IDs ---
const CONTEXT_MENU_ID_SENTIMENT = "noosai_sentiment";
const CONTEXT_MENU_ID_SUMMARIZE = "noosai_summarize";
const CONTEXT_MENU_ID_KEYWORDS = "noosai_keywords";
const CONTEXT_MENU_ID_PAGE_SUMMARIZE = "noosai_summarize_page";

// --- Helper: Create Context Menus ---
function setupContextMenus() { /* ... same as before ... */ chrome.contextMenus.removeAll(()=>{if(chrome.runtime.lastError)console.error("BG: Err remove menus:",chrome.runtime.lastError.message);chrome.contextMenus.create({id:CONTEXT_MENU_ID_SENTIMENT,title:"NoosAI: Analyze Sentiment",contexts:["selection"]},()=>{/*...*/});chrome.contextMenus.create({id:CONTEXT_MENU_ID_SUMMARIZE,title:"NoosAI: Summarize Selection",contexts:["selection"]},()=>{/*...*/});chrome.contextMenus.create({id:CONTEXT_MENU_ID_KEYWORDS,title:"NoosAI: Extract Keywords",contexts:["selection"]},()=>{/*...*/});chrome.contextMenus.create({id:CONTEXT_MENU_ID_PAGE_SUMMARIZE,title:"NoosAI: Summarize Page",contexts:["page"]},()=>{/*...*/});console.log("BG: Menus created.");}); }

// --- Initialization ---
chrome.runtime.onInstalled.addListener((details) => { /* ... same as before ... */ setupContextMenus(); chrome.storage.sync.set({extensionEnabled:!0,isPremium:!1,totalFreeTierUsageCount:0,enableNegativeAnimation:!0,enablePositiveAnimation:!0},()=>{/*...*/}); });

// --- Listener for Context Menu Clicks ---
chrome.contextMenus.onClicked.addListener((info, tab) => { /* ... same basic logic ... */ console.log("BG: Context menu clicked:",info);if(!tab?.id){console.error("BG: No Tab ID");return;} const tabId=tab.id;const positionInfo={type:"contextMenu"};if(info.menuItemId===CONTEXT_MENU_ID_PAGE_SUMMARIZE){triggerPageSummary(tabId,positionInfo);return;} if(!info.selectionText||info.selectionText.trim().length===0){console.log("BG: No text selected");return;} const selectedText=info.selectionText.trim();let action="";let requiresPremium=!1;switch(info.menuItemId){case CONTEXT_MENU_ID_SENTIMENT:action="sentiment";requiresPremium=!1;break;case CONTEXT_MENU_ID_SUMMARIZE:action="summarize";requiresPremium=!0;break;case CONTEXT_MENU_ID_KEYWORDS:action="keywords";requiresPremium=!0;break;default:console.warn("BG: Unknown menu item:",info.menuItemId);return;} console.log(`BG: Context action:${action}, Premium:${requiresPremium}`);performAnalysisAction(tabId,selectedText,action,requiresPremium,positionInfo);});

// --- Function to be injected to get page content ---
function getPageContentForSummary() { return document.body.innerText || ''; }

// --- Helper Function for Page Summary ---
function triggerPageSummary(tabId, positionInfo) {
     chrome.storage.sync.get("isPremium", (settings) => {
        if (chrome.runtime.lastError) { console.error("BG: Page Summary Err get settings:",chrome.runtime.lastError.message); chrome.tabs.sendMessage(tabId,{action:"showResult",resultType:"error",data:{error:"Error checking status"},position:positionInfo}).catch(e=>console.warn("BG Err send:",e.message)); return; }
        const isPremium = settings.isPremium === true;
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
             if (pageText && pageText.trim().length > 0) { console.log(`BG: Extracted page text (first 100): ${pageText.substring(0, 100)}...`); performAnalysisAction(tabId, pageText, "summarize", true, positionInfo); }
             else { console.warn("BG: Extracted page text empty."); chrome.tabs.sendMessage(tabId,{action:"showResult",resultType:"error",data:{error:"Page has no readable text."},position:positionInfo}).catch(e=>console.warn("Err send msg:",e.message)); }
        });
     });
}


// --- Central Function to Perform Analysis Actions ---
function performAnalysisAction(tabId, textToAnalyze, action, requiresPremium, position) {
    console.log(`BG: Performing action '${action}' for tab ${tabId}. Premium required: ${requiresPremium}`);

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
        // Free Tier Limit Check
        if (action === 'sentiment' && !isPremium) {
            if (currentUsageCount >= FREE_TIER_LIMIT) {
                console.log("BG: Free tier limit reached:", currentUsageCount);
                 // *** Send Specific Limit Reached Error via showResult ***
                 chrome.tabs.sendMessage(tabId, {
                     action: "showResult", resultType: "error",
                     data: { error: `Free analysis limit (${FREE_TIER_LIMIT}) reached. Please upgrade.` }, // Specific message
                     position: position
                    }).catch(e => console.warn("BG: Error sending limit message:", e.message)); return;
            }
            currentUsageCount++; console.log("BG: Incrementing free tier usage to:", currentUsageCount);
            chrome.storage.sync.set({ totalFreeTierUsageCount: currentUsageCount }, () => { if(chrome.runtime.lastError) console.error("BG: Error saving usage count:", chrome.runtime.lastError.message); else console.log("BG: Usage count saved."); });
        }

        // --- Call Backend Service ---
        console.log(`BG: Sending action '${action}' to backend...`);
        fetch(BACKEND_ANALYZE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Extension-Secret': EXTENSION_SECRET }, body: JSON.stringify({ action: action, text: textToAnalyze }) })
        .then(response => { if (!response.ok) { return response.text().then(text => { throw new Error(`Service Error (${response.status}) ${text.substring(0,100)}`); }); } return response.json(); })
        .then(data => {
             if (!data || !data.action) { throw new Error("Invalid response format from analysis service."); }
             console.log("BG: Received successful data from backend:", data);
             chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: data.action, data: data, position: position }).catch(e => console.warn("BG: Error sending final result message:", e.message));
         })
        .catch(error => {
             console.error(`BG: Error during backend fetch/processing for action ${action}:`, error);
             chrome.tabs.sendMessage(tabId, { action: "showResult", resultType: "error", data: { error: `Error: ${error.message || 'Unknown backend error.'}` }, position: position }).catch(e => console.warn("BG: Error sending fetch error message:", e.message));
         });
    }); // End storage.get callback
} // End performAnalysisAction


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

        console.warn("BG: Runtime message type not handled:", request);
        return false;
    }
); // End of onMessage listener