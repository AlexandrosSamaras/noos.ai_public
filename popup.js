// popup.js - FINAL VERSION with Page Summary Button & UI Disable Logic

document.addEventListener("DOMContentLoaded", () => {
  // --- Get All Elements ---
  const toggleSwitch = document.getElementById("toggleSwitch");
  const statusLabel = document.querySelector(".status-label");
  const upgradeButton = document.getElementById("upgradeButton");
  const tierInfo = document.getElementById("tierInfo");
  const usageCounter = document.getElementById("usageCounter");
  const negAnimCheckbox = document.getElementById("enableNegativeAnimationPopup");
  const posAnimCheckbox = document.getElementById("enablePositiveAnimationPopup");
  const optionsLink = document.getElementById("openOptionsLink");
  const licenseSection = document.querySelector(".license-section");
  const licenseKeyInput = document.getElementById("licenseKeyInput");
  const verifyLicenseButton = document.getElementById("verifyLicenseButton");
  const licenseStatus = document.getElementById("licenseStatus");
  const summarizePageButton = document.getElementById("summarizePageButton");
  const animationSettingsSection = document.querySelector('.settings-section');

  // --- State & Constants ---
  let isPremium = false;
  const FREE_TIER_LIMIT = 5;

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
      const elementsToControl = [ negAnimCheckbox, posAnimCheckbox, upgradeButton, optionsLink, licenseKeyInput, verifyLicenseButton, summarizePageButton ];
      const containersToControl = [ animationSettingsSection, licenseSection ]; // Containers to dim

      elementsToControl.forEach(el => {
          if(el) { el.disabled = !isEnabled; el.style.cursor = isEnabled ? 'pointer' : 'not-allowed'; }
      });

      containersToControl.forEach(el => {
           if (el) { isEnabled ? el.classList.remove('disabled-styling') : el.classList.add('disabled-styling'); }
      });

       // Also toggle labels opacity within dimmed containers
       document.querySelectorAll('.disabled-styling .toggle-label-small, .disabled-styling .setting-label')
           .forEach(label => label.style.opacity = '0.6');
       document.querySelectorAll(':not(.disabled-styling) .toggle-label-small, :not(.disabled-styling) .setting-label')
           .forEach(label => label.style.opacity = '1');


      // Re-apply display none/block based on premium status AFTER setting enabled/disabled
      updateTierInfo(isPremium, parseInt(usageCounter?.textContent?.split(' ')[1] || '0'));
  }

  // Helper function to send messages
  function sendMessageToBackground(message, callback) { console.log("Popup: Sending message:", message); chrome.runtime.sendMessage(message, (response)=>{ if(chrome.runtime.lastError){console.error(`Popup: Msg Err (${message.action||message.message}):`, chrome.runtime.lastError.message); if(callback)callback({success:!1, error:chrome.runtime.lastError.message});}else{console.log("Popup: Received response:", response); if(callback)callback(response);}}); }

  // --- Load all settings on popup open ---
  chrome.storage.sync.get(
    ["extensionEnabled", "isPremium", "totalFreeTierUsageCount", "enableNegativeAnimation", "enablePositiveAnimation"],
    (data) => { if(chrome.runtime.lastError){console.error("Popup: Load settings err:",chrome.runtime.lastError);if(tierInfo)tierInfo.textContent="Error loading";return;} const isEnabled=data.extensionEnabled!==!1; toggleSwitch.checked=isEnabled; updateStatusLabel(isEnabled); updateTierInfo(data.isPremium===!0, data.totalFreeTierUsageCount||0); negAnimCheckbox.checked=data.enableNegativeAnimation!==!1; posAnimCheckbox.checked=data.enablePositiveAnimation!==!1; updatePopupUIEnabledState(isEnabled); }
  );


  // --- Event Listeners ---

  // Main Extension Toggle
  toggleSwitch.addEventListener("change", () => { const isEnabled=toggleSwitch.checked; updateStatusLabel(isEnabled); chrome.storage.sync.set({extensionEnabled:isEnabled},()=>{if(chrome.runtime.lastError)console.error("Popup: Err save toggle:",chrome.runtime.lastError);}); sendMessageToBackground({message:"updateState",enabled:isEnabled}); updatePopupUIEnabledState(isEnabled); });

  // Animation Toggles
  negAnimCheckbox.addEventListener("change", () => { const isChecked=negAnimCheckbox.checked; chrome.storage.sync.set({enableNegativeAnimation:isChecked},()=>{if(chrome.runtime.lastError)console.error("Popup: Err save neg anim:",chrome.runtime.lastError);}); sendMessageToBackground({message:"updateAnimationSetting",setting:"negative",enabled:isChecked}); });
  posAnimCheckbox.addEventListener("change", () => { const isChecked=posAnimCheckbox.checked; chrome.storage.sync.set({enablePositiveAnimation:isChecked},()=>{if(chrome.runtime.lastError)console.error("Popup: Err save pos anim:",chrome.runtime.lastError);}); sendMessageToBackground({message:"updateAnimationSetting",setting:"positive",enabled:isChecked}); });

  // Upgrade Button
  upgradeButton.addEventListener("click", () => { if(toggleSwitch.checked){console.log("Upgrade clicked.");chrome.tabs.create({url:"https://noosai.co.uk"});}});

  // License Key Verification Button
  if (verifyLicenseButton) { verifyLicenseButton.addEventListener("click", () => { if(!toggleSwitch.checked){if(licenseStatus){licenseStatus.textContent="Enable extension first.";licenseStatus.style.color='orange';setTimeout(()=>{if(licenseStatus)licenseStatus.textContent='';licenseStatus.style.color='var(--primary-neon-blue)';},2500);}return;} const key=licenseKeyInput?licenseKeyInput.value.trim():''; if(!key){if(licenseStatus){licenseStatus.textContent="Please enter a key.";licenseStatus.style.color='red';} setTimeout(()=>{if(licenseStatus){licenseStatus.textContent='';licenseStatus.style.color='var(--primary-neon-blue)';}},2000);return;} if(licenseStatus){licenseStatus.textContent="Verifying...";licenseStatus.style.color='#aaa';} sendMessageToBackground({action:"verifyLicenseKey",licenseKey:key},(response)=>{ if(!licenseStatus)return; if(chrome.runtime.lastError){console.error("Popup: Verify Msg Err:",chrome.runtime.lastError);licenseStatus.textContent="Verification error.";licenseStatus.style.color='red';}else if(response?.success&&response?.isPremium){licenseStatus.textContent="Premium Activated!";licenseStatus.style.color='var(--primary-neon-blue)';chrome.storage.sync.get("totalFreeTierUsageCount",(data)=>{updateTierInfo(!0,data.totalFreeTierUsageCount||0);updatePopupUIEnabledState(!0);});}else{licenseStatus.textContent=response?.message||"Invalid or inactive key.";licenseStatus.style.color='red';} setTimeout(()=>{if(licenseStatus&&licenseStatus.textContent!==""){licenseStatus.textContent='';licenseStatus.style.color='var(--primary-neon-blue)';}},4000);});}); }
  else { console.warn("License verify button not found."); }

  // Page Summary Button Listener
  if (summarizePageButton) { summarizePageButton.addEventListener("click", () => { if (!toggleSwitch.checked) { if (licenseStatus) { licenseStatus.textContent = "Enable extension first."; licenseStatus.style.color = 'orange'; setTimeout(() => { if(licenseStatus) licenseStatus.textContent = ''; }, 2500); } return; } console.log("Popup: Sending summarizePage msg."); const oText=summarizePageButton.textContent; summarizePageButton.textContent="Processing..."; summarizePageButton.disabled = true; sendMessageToBackground({ action: "summarizePage" }, (response) => { setTimeout(() => { if(summarizePageButton) { summarizePageButton.textContent = oText; summarizePageButton.disabled = !toggleSwitch.checked; }}, 1000); }); setTimeout(() => window.close(), 100); }); }
  else { console.warn("Summarize Page button not found."); }

  // Options Link
  optionsLink.addEventListener("click", (event) => { event.preventDefault();if(chrome.runtime.openOptionsPage){chrome.runtime.openOptionsPage();}else{window.open(chrome.runtime.getURL('options.html'));}});

}); // End DOMContentLoaded