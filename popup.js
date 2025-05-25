// popup.js - FINAL VERSION with Page Summary Button & UI Disable Logic

document.addEventListener("DOMContentLoaded", () => {
  // --- Get Elements (excluding dynamically created ones) ---
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

  // For branding
  const appName = chrome.runtime.getManifest().name; // Used for alt text
  let toggleSwitch, statusLabel; // These will be created and assigned in createTopBar

  // New elements for links
  const linksContainer = document.createElement('div');

  // Removed: negAnimCheckbox, posAnimCheckbox, animationSettingsSection, summarizePageButton, optionsLink
  // as these elements are no longer in popup.html or their functionality is managed elsewhere.

  // --- State & Constants ---
  let isPremium = false;

  // --- Helper Functions ---

  function updateStatusLabel(isEnabled) {
    // Ensure statusLabel is defined before accessing textContent
      if (statusLabel) statusLabel.textContent = isEnabled ? "On" : "Off";
  }

  function updateTierInfo(premiumStatus, count) {
    isPremium = premiumStatus;
    const premiumStatusTopBarElement = document.getElementById('premiumStatusTopBar');

    if (premiumStatus) {
      if (tierInfo) tierInfo.textContent = "Premium Tier";
      if (usageCounter) usageCounter.style.display = 'none';
      if (upgradeButton) upgradeButton.style.display = 'none';
      if (licenseSection) licenseSection.classList.add('hidden');
       // Hide original tierInfo and usageCounter completely
      if (tierInfo) {
        tierInfo.style.display = 'none';
        tierInfo.style.marginBottom = '0'; // Remove margin
      }
      if (usageCounter) {
        usageCounter.style.marginBottom = '0'; // Remove margin
      }
      // Display "Premium Tier" in the top bar
      if (premiumStatusTopBarElement) {
        premiumStatusTopBarElement.textContent = 'Premium Tier';
        premiumStatusTopBarElement.style.display = 'inline'; // Or 'block' if styled that way
      }
    } else {
      if (tierInfo) tierInfo.textContent = "Free Tier";
      // Restore display of original tierInfo and usageCounter
      if (tierInfo) {
        tierInfo.style.display = 'block'; // Or its default display
        tierInfo.style.marginBottom = ''; // Restore default margin (let CSS handle)
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

  // New function to display animated loading text
  function displayAnimatedLoading(element, text) {
      if (!element) return;
      element.innerHTML = ''; // Clear existing text
      element.style.color = 'var(--primary-neon-blue)'; // Ensure neon blue color

      for (let i = 0; i < text.length; i++) { //
          const charSpan = document.createElement('span'); //
          charSpan.textContent = text[i]; //
          charSpan.classList.add('glowing-letter'); //
          // Stagger the animation delay for each letter
          charSpan.style.animationDelay = `${i * 0.1}s`; // Adjust 0.1s for speed
          element.appendChild(charSpan); //
      }
  }


  // --- Create and Prepend Top Bar (Logo & Name Left, Toggle Right) ---
  function createTopBar() {
    const topBarDiv = document.createElement('div');
    topBarDiv.className = 'popup-top-bar';

    // Left Group: Logo and App Name
    const leftGroup = document.createElement('div');
    leftGroup.className = 'top-bar-left-group';

    const logoImg = document.createElement('img');
    logoImg.id = 'popupLogo';
    logoImg.src = 'icon32.png'; // Ensure this path is correct
    logoImg.alt = `${appName} Logo`;

    const titleSpan = document.createElement('span');
    titleSpan.id = 'popupTitle';
    titleSpan.textContent = appName;

    leftGroup.appendChild(logoImg);
    leftGroup.appendChild(titleSpan);

    // Right Group: Toggle Switch and Status Label
    const rightGroup = document.createElement('div');
    rightGroup.className = 'top-bar-right-group'; // This can also use 'main-toggle' class if styles align

    // Premium Status element (initially hidden)
    const premiumStatusTopBar = document.createElement('span');
    premiumStatusTopBar.id = 'premiumStatusTopBar';
    premiumStatusTopBar.style.display = 'none'; // Hide by default
    rightGroup.appendChild(premiumStatusTopBar);


    const switchLabelElement = document.createElement('label');
    switchLabelElement.className = 'switch';

    toggleSwitch = document.createElement('input'); // Assign to variable in outer scope
    toggleSwitch.type = 'checkbox';
    toggleSwitch.id = 'toggleSwitch';

    const sliderSpan = document.createElement('span');
    sliderSpan.className = 'slider round';

    switchLabelElement.appendChild(toggleSwitch);
    switchLabelElement.appendChild(sliderSpan);

    statusLabel = document.createElement('span'); // Assign to variable in outer scope
    statusLabel.className = 'status-label';

    rightGroup.appendChild(switchLabelElement);
    rightGroup.appendChild(statusLabel);

    topBarDiv.appendChild(leftGroup);
    topBarDiv.appendChild(rightGroup);

    document.body.prepend(topBarDiv);
  }

  // --- Create and Append Links ---
  function createExternalLinks() {
    linksContainer.className = 'external-links-container';
    // Styles for linksContainer are now primarily in CSS
    // linksContainer.style.textAlign = 'center'; // Handled by CSS
    // linksContainer.style.marginTop = '15px'; // Handled by CSS etc.

    const manageSubscriptionLink = document.createElement('a');
    manageSubscriptionLink.href = 'https://billing.stripe.com/p/login/7sIdUUabQ2n79y0cMM';
    manageSubscriptionLink.textContent = 'Manage Subscription';
    manageSubscriptionLink.target = '_blank';
    manageSubscriptionLink.className = 'popup-link';

    const feedbackSupportLink = document.createElement('a');
    feedbackSupportLink.href = 'https://noosai.co.uk/#feedback-support';
    feedbackSupportLink.textContent = 'Feedback & Support';
    feedbackSupportLink.target = '_blank';
    feedbackSupportLink.className = 'popup-link feedback-link'; // Added specific class for potential margin

    const privacyPolicyLink = document.createElement('a');
    privacyPolicyLink.href = 'https://noosai.co.uk/privacy'; // Corrected link
    privacyPolicyLink.textContent = 'Privacy Policy';
    privacyPolicyLink.target = '_blank';
    privacyPolicyLink.className = 'popup-link privacy-link'; // Added specific class

    linksContainer.appendChild(manageSubscriptionLink);
    linksContainer.appendChild(feedbackSupportLink);
    linksContainer.appendChild(privacyPolicyLink); // Privacy link added here

    // Append to the main body of the popup, or a specific section if you have one
    document.body.appendChild(linksContainer); // Or document.getElementById('some-container-id').appendChild(linksContainer);
  }

  // --- Create and Append Version Number ---
  function displayVersionNumber() {
    const version = chrome.runtime.getManifest().version;
    const versionContainer = document.createElement('div');
    versionContainer.id = 'versionContainer';

    const versionElement = document.createElement('span');
    versionElement.id = 'extensionVersion';
    versionElement.textContent = `v${version}`;

    versionContainer.appendChild(versionElement);
    document.body.appendChild(versionContainer);
  }


  // --- Load all settings on popup open ---
  chrome.storage.sync.get(
    ["extensionEnabled", "isPremium", "totalFreeTierUsageCount"], // Removed "enableNegativeAnimation", "enablePositiveAnimation"
    (data) => {
      createTopBar(); // Create the top bar with logo and toggle

      if(chrome.runtime.lastError){
        console.error("Popup: Load settings err:",chrome.runtime.lastError);
        if(tierInfo)tierInfo.textContent="Error loading";
        return;
      }
      const isEnabled=data.extensionEnabled!==false;

      // Ensure toggleSwitch is defined (it should be after createTopBar)
      if (toggleSwitch) {
        toggleSwitch.checked=isEnabled;
        // Add event listener now that the element exists and state is known
        toggleSwitch.addEventListener("change", handleToggleChange);
      }
      updateStatusLabel(isEnabled); // Update "On"/"Off" text
      updateTierInfo(data.isPremium===true, data.totalFreeTierUsageCount||0);
      // Removed: negAnimCheckbox.checked, posAnimCheckbox.checked
      updatePopupUIEnabledState(isEnabled);
      createExternalLinks();    // Create and add the external links
      displayVersionNumber();   // Display version number at the bottom
    }
  );


  // --- Event Listeners ---

  // Main Extension Toggle Handler Function
  function handleToggleChange() {
    const isEnabled = toggleSwitch.checked;
    updateStatusLabel(isEnabled);
    chrome.storage.sync.set({ extensionEnabled: isEnabled }, () => { if (chrome.runtime.lastError) console.error("Popup: Err save toggle:", chrome.runtime.lastError); });
    sendMessageToBackground({ message: "updateState", enabled: isEnabled });
    updatePopupUIEnabledState(isEnabled);
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
        setTimeout(() => { if(customAnalysisStatus) customAnalysisStatus.textContent = ''; }, 3000);
        return;
    }

    displayAnimatedLoading(customAnalysisStatus, "Processing...");

    sendMessageToBackground({
      action: "analyzeCustomText",
      text: text,
      analysisType: analysisType,
      targetLanguage: targetLanguage
    }, (response) => {
      if (customAnalysisStatus) {
        customAnalysisStatus.innerHTML = ''; // Clear animated letters
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