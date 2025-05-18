// popup.js - FINAL VERSION with Page Summary Button & UI Disable Logic

document.addEventListener("DOMContentLoaded", () => {
  // --- Get All Elements ---
  const toggleSwitch = document.getElementById("toggleSwitch");
  const statusLabel = document.querySelector(".status-label");
  const upgradeButton = document.getElementById("upgradeButton");
  const tierInfo = document.getElementById("tierInfo");
  const usageCounter = document.getElementById("usageCounter");
  const licenseSection = document.querySelector(".license-section");
  const licenseKeyInput = document.getElementById("licenseKeyInput");
  const verifyLicenseButton = document.getElementById("verifyLicenseButton");
  const licenseStatus = document.getElementById("licenseStatus");
  // New custom text analysis elements
  const customAnalysisText = document.getElementById("customAnalysisText");
  const outputLanguageSelect = document.getElementById("outputLanguageSelect");
  const analyzeSentimentCustom = document.getElementById("analyzeSentimentCustom");
  const analyzeSummaryCustom = document.getElementById("analyzeSummaryCustom");
  const analyzeKeywordsCustom = document.getElementById("analyzeKeywordsCustom");
  const analyzeTranslateCustom = document.getElementById("analyzeTranslateCustom");
  const analyzeExplainCustom = document.getElementById("analyzeExplainCustom"); 
  const analyzeSimplifyCustom = document.getElementById("analyzeSimplifyCustom"); 
  const analyzeSearchCustom = document.getElementById("analyzeSearchCustom"); 
  const customAnalysisStatus = document.getElementById("customAnalysisStatus");

  // Removed: negAnimCheckbox, posAnimCheckbox, animationSettingsSection, summarizePageButton, optionsLink
  // as these elements are no longer in popup.html or their functionality is managed elsewhere.

  // --- State & Constants ---
  let isPremium = false;
  const FREE_TIER_LIMIT = 5; // This is also defined in background.js, ensure they are consistent or derived from one source

  // --- Helper Functions ---

  function updateStatusLabel(isEnabled) {
      if (statusLabel) statusLabel.textContent = isEnabled ? "On" : "Off";
  }

  function updateTierInfo(premiumStatus, count) {
    isPremium = premiumStatus;
    if (premiumStatus) {
      if (tierInfo) tierInfo.textContent = "Premium Tier";
      if (usageCounter) usageCounter.style.display = 'none';
      if (upgradeButton) upgradeButton.style.display = 'none';
      if (licenseSection) licenseSection.classList.add('hidden');
    } else {
      if (tierInfo) tierInfo.textContent = "Free Tier";
      if (usageCounter) { usageCounter.textContent = `Used: ${count} / ${FREE_TIER_LIMIT}`; usageCounter.style.display = 'block'; }
      if (upgradeButton) upgradeButton.style.display = 'block';
      if (licenseSection) licenseSection.classList.remove('hidden');
      if (licenseStatus) licenseStatus.textContent = '';
    }
  }

  function updatePopupUIEnabledState(isEnabled) {
      const elementsToControl = [ 
        upgradeButton, 
        licenseKeyInput, 
        verifyLicenseButton, 
        customAnalysisText, 
        outputLanguageSelect, 
        analyzeSentimentCustom, 
        analyzeSummaryCustom, 
        analyzeKeywordsCustom, 
        analyzeTranslateCustom, 
        analyzeExplainCustom, 
        analyzeSimplifyCustom, 
        analyzeSearchCustom 
      ];
      const containersToControl = [ licenseSection ]; // Only licenseSection remains from original list

      elementsToControl.forEach(el => {
          if(el) { 
            el.disabled = !isEnabled; 
            el.style.cursor = isEnabled ? 'pointer' : 'not-allowed'; 
          }
      });

      containersToControl.forEach(el => {
           if (el) { isEnabled ? el.classList.remove('disabled-styling') : el.classList.add('disabled-styling'); }
      });

       // Also toggle labels opacity within dimmed containers
       document.querySelectorAll('.disabled-styling .toggle-label-small, .disabled-styling .setting-label')
           .forEach(label => { if(label) label.style.opacity = '0.6'; });
       document.querySelectorAll(':not(.disabled-styling) .toggle-label-small, :not(.disabled-styling) .setting-label')
           .forEach(label => { if(label) label.style.opacity = '1'; });

      // Clear custom analysis status if present
      if (customAnalysisStatus) {
        customAnalysisStatus.textContent = '';
      }

      // Re-apply display none/block based on premium status AFTER setting enabled/disabled
      let currentUsage = 0;
      if (usageCounter && usageCounter.textContent) {
        const parts = usageCounter.textContent.split(' ');
        if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
            currentUsage = parseInt(parts[1]);
        }
      }
      updateTierInfo(isPremium, currentUsage);
  }

  // Helper function to send messages
  function sendMessageToBackground(message, callback) { 
    console.log("Popup: Sending message:", message); 
    chrome.runtime.sendMessage(message, (response)=>{ 
      if(chrome.runtime.lastError){
        console.error(`Popup: Msg Err (${message.action||message.message}):`, chrome.runtime.lastError.message); 
        if(callback)callback({success:false, error:chrome.runtime.lastError.message});
      } else {
        console.log("Popup: Received response:", response); 
        if(callback)callback(response);
      }
    }); 
  }

  // --- Load all settings on popup open ---
  chrome.storage.sync.get(
    ["extensionEnabled", "isPremium", "totalFreeTierUsageCount"], // Removed "enableNegativeAnimation", "enablePositiveAnimation"
    (data) => { 
      if(chrome.runtime.lastError){
        console.error("Popup: Load settings err:",chrome.runtime.lastError);
        if(tierInfo)tierInfo.textContent="Error loading";
        return;
      } 
      const isEnabled=data.extensionEnabled!==false; 
      if (toggleSwitch) toggleSwitch.checked=isEnabled; 
      updateStatusLabel(isEnabled); 
      updateTierInfo(data.isPremium===true, data.totalFreeTierUsageCount||0); 
      // Removed: negAnimCheckbox.checked, posAnimCheckbox.checked
      updatePopupUIEnabledState(isEnabled); 
    }
  );


  // --- Event Listeners ---

  // Main Extension Toggle
  if (toggleSwitch) {
    toggleSwitch.addEventListener("change", () => { 
      const isEnabled=toggleSwitch.checked; 
      updateStatusLabel(isEnabled); 
      chrome.storage.sync.set({extensionEnabled:isEnabled},()=>{if(chrome.runtime.lastError)console.error("Popup: Err save toggle:",chrome.runtime.lastError);}); 
      sendMessageToBackground({message:"updateState",enabled:isEnabled}); 
      updatePopupUIEnabledState(isEnabled); 
    });
  }

  // Animation Toggles - Removed, as they are in options.js now

  // Upgrade Button
  if (upgradeButton) {
    upgradeButton.addEventListener("click", () => { 
      if(toggleSwitch && toggleSwitch.checked){
        console.log("Upgrade clicked.");
        chrome.tabs.create({url:"https://noosai.co.uk"});
      }
    });
  }

  // License Key Verification Button
  if (verifyLicenseButton) { 
    verifyLicenseButton.addEventListener("click", () => { 
      if(toggleSwitch && !toggleSwitch.checked){
        if(licenseStatus){
          licenseStatus.textContent="Enable extension first.";
          licenseStatus.style.color='orange';
          setTimeout(()=>{if(licenseStatus)licenseStatus.textContent='';licenseStatus.style.color='var(--primary-neon-blue)';},2500);
        }
        return;
      } 
      const key=licenseKeyInput?licenseKeyInput.value.trim():''; 
      if(!key){
        if(licenseStatus){
          licenseStatus.textContent="Please enter a key.";
          licenseStatus.style.color='red';
        } 
        setTimeout(()=>{if(licenseStatus){licenseStatus.textContent='';licenseStatus.style.color='var(--primary-neon-blue)';}},2000);
        return;
      } 
      if(licenseStatus){
        licenseStatus.textContent="Verifying...";
        licenseStatus.style.color='#aaa';
      } 
      sendMessageToBackground({action:"verifyLicenseKey",licenseKey:key},(response)=>{ 
        if(!licenseStatus)return; 
        if(chrome.runtime.lastError){
          console.error("Popup: Verify Msg Err:",chrome.runtime.lastError);
          licenseStatus.textContent="Verification error.";
          licenseStatus.style.color='red';
        } else if(response?.success&&response?.isPremium){
          licenseStatus.textContent="Premium Activated!";
          licenseStatus.style.color='var(--primary-neon-blue)';
          chrome.storage.sync.get("totalFreeTierUsageCount",(data)=>{
            updateTierInfo(true,data.totalFreeTierUsageCount||0);
            if (toggleSwitch) updatePopupUIEnabledState(toggleSwitch.checked);
          });
        } else {
          licenseStatus.textContent=response?.message||"Invalid or inactive key.";
          licenseStatus.style.color='red';
        } 
        setTimeout(()=>{if(licenseStatus&&licenseStatus.textContent!==""){licenseStatus.textContent='';licenseStatus.style.color='var(--primary-neon-blue)';}},4000);
      });
    }); 
  } else { 
    console.warn("License verify button not found."); 
  }

  // Page Summary Button Listener - Removed, as button is no longer in popup.html

  // Options Link - Removed, as link is no longer in popup.html

  // --- Custom Text Analysis Button Listeners ---
  function handleCustomAnalysis(analysisType) {
    if (toggleSwitch && !toggleSwitch.checked) {
      if(customAnalysisStatus) { customAnalysisStatus.textContent = "Enable extension first."; customAnalysisStatus.style.color = 'orange'; }
      setTimeout(() => { if(customAnalysisStatus) customAnalysisStatus.textContent = ''; }, 2500);
      return;
    }
    const text = customAnalysisText ? customAnalysisText.value.trim() : "";
    const targetLanguage = outputLanguageSelect ? outputLanguageSelect.value : "auto";

    if (!text) {
      if(customAnalysisStatus) { customAnalysisStatus.textContent = "Please enter text to analyze."; customAnalysisStatus.style.color = 'red'; }
      setTimeout(() => { if(customAnalysisStatus) customAnalysisStatus.textContent = ''; }, 2000);
      return;
    }

    // Special check for translate action with "auto" language
    if (analysisType === 'translate' && targetLanguage === 'auto') {
        if(customAnalysisStatus) { customAnalysisStatus.textContent = "Please select a specific target language for translation."; customAnalysisStatus.style.color = 'orange'; }
        setTimeout(() => { if(customAnalysisSstatus) customAnalysisStatus.textContent = ''; }, 3000);
        return;
    }

    if(customAnalysisStatus) { customAnalysisStatus.textContent = "Processing..."; customAnalysisStatus.style.color = '#aaa'; }

    sendMessageToBackground({
      action: "analyzeCustomText",
      text: text,
      analysisType: analysisType, 
      targetLanguage: targetLanguage
    }, (response) => {
      if (customAnalysisStatus) {
        customAnalysisStatus.textContent = response?.success ? "Request sent!" : (response?.error || "Error sending request.");
        customAnalysisStatus.style.color = response?.success ? 'var(--primary-neon-blue)' : 'red';
        setTimeout(() => { if(customAnalysisStatus) customAnalysisStatus.textContent = ''; }, 2000);
      }
      if (response?.success) setTimeout(() => window.close(), 250); 
    });
  }

  if(analyzeSentimentCustom) analyzeSentimentCustom.addEventListener("click", () => handleCustomAnalysis("sentiment"));
  if(analyzeSummaryCustom) analyzeSummaryCustom.addEventListener("click", () => handleCustomAnalysis("summarize"));
  if(analyzeKeywordsCustom) analyzeKeywordsCustom.addEventListener("click", () => handleCustomAnalysis("keywords"));
  if(analyzeTranslateCustom) analyzeTranslateCustom.addEventListener("click", () => handleCustomAnalysis("translate"));
  if(analyzeExplainCustom) analyzeExplainCustom.addEventListener("click", () => handleCustomAnalysis("explain"));
  if(analyzeSimplifyCustom) analyzeSimplifyCustom.addEventListener("click", () => handleCustomAnalysis("simplify"));
  if(analyzeSearchCustom) analyzeSearchCustom.addEventListener("click", () => handleCustomAnalysis("search"));

}); // End DOMContentLoaded
