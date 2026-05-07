// popup.js - v3.1 - Added Persona Selector

document.addEventListener("DOMContentLoaded", () => {
  // --- Get Elements ---
  const upgradeButton = document.getElementById("upgradeButton");
  const toggleSwitch = document.getElementById("toggleSwitch");
  const tierInfo = document.getElementById("tierInfo");
  const usageCounter = document.getElementById("usageCounter");
  const licenseSection = document.getElementById("licenseSection");
  const licenseKeyInput = document.getElementById("licenseKeyInput");
  const verifyLicenseButton = document.getElementById("verifyLicenseButton");
  const licenseStatus = document.getElementById("licenseStatus");
  const customAnalysisText = document.getElementById("customAnalysisText");
  const outputLanguageSelect = document.getElementById("outputLanguageSelect");
  const personaSelect = document.getElementById("personaSelect"); // [NEW] Get Persona Dropdown
  const summarizePageButton = document.getElementById("summarizePageButton"); // [NEW] Get Page Summary Button
  const analyzeSentimentCustom = document.getElementById("analyzeSentimentCustom");
  const analyzeSummaryCustom = document.getElementById("analyzeSummaryCustom");
  const analyzeKeywordsCustom = document.getElementById("analyzeKeywordsCustom");
  const analyzeTranslateCustom = document.getElementById("analyzeTranslateCustom");
  const analyzeExplainCustom = document.getElementById("analyzeExplainCustom");
  const analyzeSimplifyCustom = document.getElementById("analyzeSimplifyCustom");
  const analyzeSearchCustom = document.getElementById("analyzeSearchCustom");
  const customAnalysisStatus = document.getElementById("customAnalysisStatus");

  const appName = chrome.runtime.getManifest().name;
  let statusLabel = document.getElementById("statusLabel"); // [UPDATED] Try to get if exists


  const linksContainer = document.createElement('div');

  // --- State ---
  let isPremium = false;

  // --- Helper Functions ---

  function updateStatusLabel(isEnabled) {
    if (statusLabel) statusLabel.textContent = isEnabled ? "On" : "Off";
  }

  function updateTierInfo(premiumStatus) {
    isPremium = premiumStatus;
    const premiumStatusTopBarElement = document.getElementById('premiumStatusTopBar');
    const revenueSection = document.getElementById('revenueSection');

    if (premiumStatus) {
      if (tierInfo) tierInfo.textContent = "Premium Tier";
      if (usageCounter) usageCounter.style.display = 'none';
      if (upgradeButton) upgradeButton.style.display = 'none';
      if (licenseSection) licenseSection.style.display = 'none';
      if (revenueSection) revenueSection.style.display = 'none'; // [NEW] Hide the entire top pill box
      
      if (tierInfo) {
        tierInfo.style.display = 'none';
        tierInfo.style.marginBottom = '0';
      }
      if (usageCounter) {
        usageCounter.style.marginBottom = '0';
      }
      if (premiumStatusTopBarElement) {
        premiumStatusTopBarElement.style.display = 'inline-block'; // [NEW] Show sleek header badge
      }
    } else {
      if (tierInfo) {
        tierInfo.textContent = "Free Tier (10 Actions/Day)";
        tierInfo.style.display = 'block';
        tierInfo.style.marginBottom = '';
      }
      if (usageCounter) {
        usageCounter.style.display = 'none';
      }
      if (upgradeButton) {
        upgradeButton.style.display = 'block';
      }
      if (licenseSection) {
        licenseSection.style.display = 'block';
      }
      if (revenueSection) {
        revenueSection.style.display = 'flex'; // [NEW] Show if free tier
      }
      if (premiumStatusTopBarElement) {
        premiumStatusTopBarElement.style.display = 'none'; // [NEW] Hide badge if free
      }
    }
  }

  function updatePopupUIEnabledState(isEnabled) {
    const elementsToControl = [
      upgradeButton,
      licenseKeyInput,
      verifyLicenseButton,
      customAnalysisText,
      outputLanguageSelect,
      personaSelect, // [NEW] Add to list
      summarizePageButton, // [NEW] Add to list
      analyzeSentimentCustom,
      analyzeSummaryCustom,
      analyzeKeywordsCustom,
      analyzeTranslateCustom,
      analyzeExplainCustom,
      analyzeSimplifyCustom,
      analyzeSearchCustom
    ];
    const containersToControl = [licenseSection];

    elementsToControl.forEach(el => {
      if (el) {
        el.disabled = !isEnabled;
        el.style.cursor = isEnabled ? 'pointer' : 'not-allowed';
      }
    });

    containersToControl.forEach(el => {
      if (el) { isEnabled ? el.classList.remove('disabled-styling') : el.classList.add('disabled-styling'); }
    });

    document.querySelectorAll('.disabled-styling .toggle-label-small, .disabled-styling .setting-label')
      .forEach(label => { if (label) label.style.opacity = '0.6'; });
    document.querySelectorAll(':not(.disabled-styling) .toggle-label-small, :not(.disabled-styling) .setting-label')
      .forEach(label => { if (label) label.style.opacity = '1'; });

    if (customAnalysisStatus) {
      customAnalysisStatus.textContent = '';
    }

    updateTierInfo(isPremium);
  }

  function sendMessageToBackground(message, callback) {
    console.log("Popup: Sending message:", message);
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error(`Popup: Msg Err (${message.action || message.message}):`, chrome.runtime.lastError.message);
        if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("Popup: Received response:", response);
        if (callback) callback(response);
      }
    });
  }

  function displayAnimatedLoading(element, text) {
    if (!element) return;
    element.innerHTML = '';
    element.style.color = 'var(--primary-neon-blue)';
    for (let i = 0; i < text.length; i++) {
      const charSpan = document.createElement('span');
      charSpan.textContent = text[i];
      charSpan.classList.add('glowing-letter');
      charSpan.style.animationDelay = `${i * 0.1}s`;
      element.appendChild(charSpan);
    }
  }

  // [REMOVED] Legacy Injections Purged


  // --- Load all settings on popup open ---
  chrome.storage.sync.get(
    ["extensionEnabled", "isPremium", "licenseKey", "userPersona", "customPersonas"], // [MODIFIED] Get custom personas
    (data) => {
      // createTopBar(); // [REMOVED] Using static HTML

      if (chrome.runtime.lastError) {
        console.error("Popup: Load settings err:", chrome.runtime.lastError);
        if (tierInfo) tierInfo.textContent = "Error loading";
        return;
      }
      const isEnabled = data.extensionEnabled !== false;

      if (toggleSwitch) {
        toggleSwitch.checked = isEnabled;
        toggleSwitch.addEventListener("change", handleToggleChange);
      }
      updateStatusLabel(isEnabled);

      isPremium = data.isPremium === true;
      updateTierInfo(isPremium);

      // --- [MODIFIED] Persona Dropdown Population ---
      if (personaSelect) {
        // 1. Clear existing options (except defaults if they were hardcoded, but they are in HTML)
        // Let's clear all and rebuild for consistency.
        personaSelect.innerHTML = `
          <option value="default">Default</option>
          <option value="sales_rep">Sales Rep</option>
          <option value="marketer">Marketer</option>
          <option value="student">Student</option>
          <option value="developer">Developer</option>
        `;

        // 2. Add custom personas
        const customPersonas = data.customPersonas || [];
        if (customPersonas.length > 0) {
          const optGroup = document.createElement('optgroup');
          optGroup.label = 'My Personas';
          customPersonas.forEach(p => {
            const option = document.createElement('option');
            // The value will be the custom prompt itself
            option.value = p.prompt;
            option.textContent = p.name;
            optGroup.appendChild(option);
          });
          personaSelect.appendChild(optGroup);
        }

        // 3. Set the selected value
        if (data.userPersona) {
          personaSelect.value = data.userPersona;
        }

        // 4. Add listener to save persona on change
        personaSelect.addEventListener("change", (e) => {
          const newPersona = e.target.value;
          console.log(`Popup: Persona changed to ${newPersona}. Saving...`);
          chrome.storage.sync.set({ userPersona: newPersona });
        });
      }

      // createTopBar();
      // createExternalLinks();
      // displayVersionNumber();
      
      // Ensure UI state matches toggle
      if (toggleSwitch) {
        updatePopupUIEnabledState(toggleSwitch.checked);
      }
    }
  );

  // --- Event Listeners ---

  function handleToggleChange() {
    const isEnabled = toggleSwitch.checked;
    updateStatusLabel(isEnabled);
    chrome.storage.sync.set({ extensionEnabled: isEnabled }, () => { if (chrome.runtime.lastError) console.error("Popup: Err save toggle:", chrome.runtime.lastError); });
    sendMessageToBackground({ message: "updateState", enabled: isEnabled });
    updatePopupUIEnabledState(isEnabled);
  }

  if (upgradeButton) {
    upgradeButton.addEventListener("click", () => {
      if (toggleSwitch && toggleSwitch.checked) {
        console.log("Upgrade clicked.");
        chrome.tabs.create({ url: "https://noosai.co.uk" });
      }
    });
  }

  if (verifyLicenseButton) {
    verifyLicenseButton.addEventListener("click", () => {
      if (toggleSwitch && !toggleSwitch.checked) {
        if (licenseStatus) {
          licenseStatus.textContent = "Enable extension first.";
          licenseStatus.style.color = 'orange';
          setTimeout(() => { if (licenseStatus) licenseStatus.textContent = ''; licenseStatus.style.color = 'var(--primary-neon-blue)'; }, 2500);
        }
        return;
      }
      const key = licenseKeyInput ? licenseKeyInput.value.trim() : '';
      if (!key) {
        if (licenseStatus) {
          licenseStatus.textContent = "Please enter a key.";
          licenseStatus.style.color = 'red';
        }
        setTimeout(() => { if (licenseStatus) { licenseStatus.textContent = ''; licenseStatus.style.color = 'var(--primary-neon-blue)'; } }, 2000);
        return;
      }
      if (licenseStatus) {
        licenseStatus.textContent = "Verifying...";
        licenseStatus.style.color = '#aaa';
      }
      sendMessageToBackground({ action: "verifyLicenseKey", licenseKey: key }, (response) => {
        if (!licenseStatus) return;
        if (chrome.runtime.lastError) {
          console.error("Popup: Verify Msg Err:", chrome.runtime.lastError);
          licenseStatus.textContent = "Verification error.";
          licenseStatus.style.color = 'red';
        } else if (response?.success && response?.isPremium) {
          licenseStatus.textContent = "Premium Activated!";
          licenseStatus.style.color = 'var(--primary-neon-blue)';

          chrome.storage.sync.set({ isPremium: true, licenseKey: key, totalFreeTierUsageCount: 0 }, () => {
            if (chrome.runtime.lastError) {
              console.error("Popup: CRITICAL: Failed to save premium status & license key:", chrome.runtime.lastError);
              licenseStatus.textContent = "Activated, but failed to save. Please retry.";
              licenseStatus.style.color = 'orange';
            } else {
              console.log("Popup: Premium status and license key saved successfully.");
            }

            updateTierInfo(true);
            if (toggleSwitch) updatePopupUIEnabledState(toggleSwitch.checked);
          });

        } else {
          licenseStatus.textContent = response?.message || "Invalid or inactive key.";
          licenseStatus.style.color = 'red';
        }
        setTimeout(() => { if (licenseStatus && licenseStatus.textContent !== "") { licenseStatus.textContent = ''; licenseStatus.style.color = 'var(--primary-neon-blue)'; } }, 4000);
      });
    });
  } else {
    console.warn("License verify button not found.");
  }

  // --- Custom Text Analysis Button Listeners ---
  function handleCustomAnalysis(analysisType) {
    if (toggleSwitch && !toggleSwitch.checked) {
      if (customAnalysisStatus) { customAnalysisStatus.textContent = "Enable extension first."; customAnalysisStatus.style.color = 'orange'; }
      setTimeout(() => { if (customAnalysisStatus) customAnalysisStatus.textContent = ''; }, 2500);
      return;
    }
    const text = customAnalysisText ? customAnalysisText.value.trim() : "";
    const targetLanguage = outputLanguageSelect ? outputLanguageSelect.value : "auto";

    // [MODIFIED] Get persona. If it's one of the default values, send the value.
    // If it's a custom one, the value *is* the prompt. The backend needs to handle this.
    // The backend already uses the value as the persona instruction if it's not a known key.
    // Let's adjust the server-side logic to handle this. The value sent will be the prompt itself for custom personas.
    const persona = personaSelect ? personaSelect.value : "default";

    if (!text) {
      if (customAnalysisStatus) { customAnalysisStatus.textContent = "Please enter text to analyze."; customAnalysisStatus.style.color = 'red'; }
      setTimeout(() => { if (customAnalysisStatus) customAnalysisStatus.textContent = ''; }, 2000);
      return;
    }

    if (analysisType === 'translate' && targetLanguage === 'auto') {
      if (customAnalysisStatus) { customAnalysisStatus.textContent = "Please select a specific target language for translation."; customAnalysisStatus.style.color = 'orange'; }
      setTimeout(() => { if (customAnalysisStatus) customAnalysisStatus.textContent = ''; }, 3000);
      return;
    }

    displayAnimatedLoading(customAnalysisStatus, "Processing...");

    sendMessageToBackground({
      action: "analyzeCustomText",
      text: text,
      analysisType: analysisType,
      targetLanguage: targetLanguage,
      persona: persona // [NEW] Send persona
    }, (response) => {
      if (customAnalysisStatus) {
        customAnalysisStatus.innerHTML = '';
        customAnalysisStatus.textContent = response?.success ? "Request sent!" : (response?.error || "Error sending request.");
        customAnalysisStatus.style.color = response?.success ? 'var(--primary-neon-blue)' : 'red';

        setTimeout(() => { if (customAnalysisStatus) customAnalysisStatus.textContent = ''; }, 2000);
      }
      if (response?.success) setTimeout(() => window.close(), 250);
    });
  }

  // [NEW] Add listener for the "Summarize Current Page" button
  if (summarizePageButton) {
    summarizePageButton.addEventListener("click", () => {
      console.log("Popup: Summarize Page button clicked.");
      sendMessageToBackground({ action: "summarizePage" }, (response) => {
        // The background script handles showing the panel, so we just close the popup.
        window.close();
      });
    });
  }


  if (analyzeSentimentCustom) analyzeSentimentCustom.addEventListener("click", () => handleCustomAnalysis("sentiment"));
  if (analyzeSummaryCustom) analyzeSummaryCustom.addEventListener("click", () => handleCustomAnalysis("summarize"));
  if (analyzeKeywordsCustom) analyzeKeywordsCustom.addEventListener("click", () => handleCustomAnalysis("keywords"));
  if (analyzeTranslateCustom) analyzeTranslateCustom.addEventListener("click", () => handleCustomAnalysis("translate"));
  if (analyzeExplainCustom) analyzeExplainCustom.addEventListener("click", () => handleCustomAnalysis("explain"));
  if (analyzeSimplifyCustom) analyzeSimplifyCustom.addEventListener("click", () => handleCustomAnalysis("simplify"));
  if (analyzeSearchCustom) analyzeSearchCustom.addEventListener("click", () => handleCustomAnalysis("search"));

});