// options.js - v2.0 - Saves all extension settings

document.addEventListener('DOMContentLoaded', () => {
  console.log("Options page loaded.");

  // --- Get Elements ---
  const negAnimCheckbox = document.getElementById('enableNegativeAnimationOptions');
  const posAnimCheckbox = document.getElementById('enablePositiveAnimationOptions');
  const magicPointerCheckbox = document.getElementById('enableMagicPointerOptions');
  const notionApiKeyInput = document.getElementById('notionApiKey');
  const notionPageIdInput = document.getElementById('notionPageId');
  const saveButton = document.getElementById('saveOptionsButton');
  const statusEl = document.getElementById('status');
  // [NEW] Persona Manager Elements
  const personasContainer = document.getElementById('customPersonasContainer');
  const addPersonaButton = document.getElementById('addPersonaButton');
  const newPersonaNameInput = document.getElementById('newPersonaName');
  const newPersonaPromptInput = document.getElementById('newPersonaPrompt');
  const personaProUpsell = document.getElementById('personaProUpsell');
  const personaLimitBadge = document.getElementById('personaLimitBadge');

  // Plan Banner Elements
  const optionsPlanBadge = document.getElementById('optionsPlanBadge');
  const optionsPlanTitle = document.getElementById('optionsPlanTitle');
  const optionsPlanDesc = document.getElementById('optionsPlanDesc');
  const optionsUpgradeBtn = document.getElementById('optionsUpgradeBtn');
  const voiceProLockNotice = document.getElementById('voiceProLockNotice');

  // [NEW] State for personas & premium status
  let customPersonas = [];
  let isPremiumUser = false;

  function updatePlanUI() {
    if (isPremiumUser) {
      if (optionsPlanBadge) {
        optionsPlanBadge.textContent = 'PRO PLAN ACTIVE';
        optionsPlanBadge.classList.add('pro-active');
      }
      if (optionsPlanTitle) {
        optionsPlanTitle.textContent = 'Unlimited Pro Access & Cloud Sync Active';
      }
      if (optionsPlanDesc) {
        optionsPlanDesc.textContent = 'You have full access to Unlimited AI Actions, Inline Ghost Writer, AI Voice Cloning, 1-Click Notion Export, and Cloud-Synced Personas.';
      }
      if (optionsUpgradeBtn) {
        optionsUpgradeBtn.classList.add('hidden');
      }
      if (personaLimitBadge) {
        personaLimitBadge.textContent = 'Unlimited Pro Cloud Sync';
      }
      if (personaProUpsell) {
        personaProUpsell.classList.add('hidden');
      }
      if (voiceProLockNotice) {
        voiceProLockNotice.classList.add('hidden');
      }
    } else {
      if (customPersonas.length >= 1 && personaProUpsell) {
        personaProUpsell.classList.remove('hidden');
      }
    }
  }

  // --- Load Settings ---
  function loadSettings() {
    // Load all settings from storage
    chrome.storage.sync.get(
      ['enableNegativeAnimation', 'enablePositiveAnimation', 'enableMagicPointer', 'notionApiKey', 'notionPageId', 'customPersonas', 'isPremium', 'licenseKey'],
      (data) => {
        if (chrome.runtime.lastError) {
          console.error("Options: Error loading settings:", chrome.runtime.lastError);
          if (statusEl) {
            statusEl.textContent = "Error loading settings.";
            statusEl.style.color = "#dc3545"; // Error red
          }
          return;
        }

        isPremiumUser = !!data.isPremium;

        // Set checkbox states (default to true if undefined)
        if (negAnimCheckbox) negAnimCheckbox.checked = data.enableNegativeAnimation !== false;
        if (posAnimCheckbox) posAnimCheckbox.checked = data.enablePositiveAnimation !== false;
        if (magicPointerCheckbox) magicPointerCheckbox.checked = data.enableMagicPointer !== false;

        // Set Notion fields (default to empty string)
        if (notionApiKeyInput) notionApiKeyInput.value = data.notionApiKey || '';
        if (notionPageIdInput) notionPageIdInput.value = data.notionPageId || '';

        // [NEW] Load and render custom personas
        customPersonas = data.customPersonas || [];
        renderPersonas();
        updatePlanUI();

        console.log("Options: Settings loaded.");
      }
    );
  }

  // --- [NEW] Persona Management Functions ---
  function renderPersonas() {
    if (!personasContainer) return;
    personasContainer.innerHTML = ''; // Clear existing list

    if (customPersonas.length === 0) {
      personasContainer.innerHTML = '<p class="note">No custom personas yet. Create your first custom AI persona below (1 included free!).</p>';
      if (personaProUpsell) personaProUpsell.classList.add('hidden');
      return;
    }

    const personaList = document.createElement('ul');
    personaList.className = 'persona-list';
    customPersonas.forEach((persona, index) => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
        <div class="persona-details">
          <strong>${escapeHTML(persona.name)}</strong>
          <p>${escapeHTML(persona.prompt)}</p>
        </div>
        <button class="delete-persona-btn" data-index="${index}" title="Delete Persona">&times;</button>
      `;
      personaList.appendChild(listItem);
    });
    personasContainer.appendChild(personaList);

    if (!isPremiumUser && customPersonas.length >= 1 && personaProUpsell) {
      personaProUpsell.classList.remove('hidden');
    } else if (personaProUpsell) {
      personaProUpsell.classList.add('hidden');
    }
  }

  function addPersona() {
    if (!newPersonaNameInput || !newPersonaPromptInput) return;

    // Freemium Lure: 1st Custom Persona is free! 2+ requires Pro.
    if (!isPremiumUser && customPersonas.length >= 1) {
      if (personaProUpsell) {
        personaProUpsell.classList.remove('hidden');
        personaProUpsell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (confirm("Free Plan includes 1 Custom Persona.\n\nUpgrade to Noos.AI Pro ($5/mo) to create Unlimited Custom Personas, sync them with Web Studio, and unlock AI Voice Cloning + Ghost Writer!\n\nWould you like to view Pro plans now?")) {
        window.open('https://noosai.co.uk/#pricing', '_blank');
      }
      return;
    }

    const name = newPersonaNameInput.value.trim();
    const prompt = newPersonaPromptInput.value.trim();

    if (!name || !prompt) {
      alert("Please enter both a name and instructions for the new persona.");
      return;
    }

    customPersonas.push({ name, prompt });
    savePersonas();
    newPersonaNameInput.value = '';
    newPersonaPromptInput.value = '';
  }

  function deletePersona(index) {
    if (index >= 0 && index < customPersonas.length) {
      customPersonas.splice(index, 1);
      savePersonas();
    }
  }

  // --- Voice Training Logic ---
  const analyzeVoiceButton = document.getElementById('analyzeVoiceButton');
  const voiceResultDiv = document.getElementById('voiceAnalysisResult');
  const detectedStyleText = document.getElementById('detectedStyleText');
  const detectedStyleEdit = document.getElementById('detectedStyleEdit');
  const editVoiceButton = document.getElementById('editVoiceButton');
  const saveVoiceEditButton = document.getElementById('saveVoiceEditButton');
  const cancelVoiceEditButton = document.getElementById('cancelVoiceEditButton');
  const removeVoiceButton = document.getElementById('removeVoiceButton');

  function showVoiceStyle(style) {
    if (voiceResultDiv && detectedStyleText) {
      voiceResultDiv.classList.remove('hidden');
      detectedStyleText.textContent = style;
      detectedStyleText.classList.remove('hidden');
      detectedStyleEdit.classList.add('hidden');

      if (!isPremiumUser && voiceProLockNotice) {
        voiceProLockNotice.classList.remove('hidden');
      } else if (voiceProLockNotice) {
        voiceProLockNotice.classList.add('hidden');
      }

      // Reset buttons
      editVoiceButton.classList.remove('hidden');
      removeVoiceButton.classList.remove('hidden');
      saveVoiceEditButton.classList.add('hidden');
      cancelVoiceEditButton.classList.add('hidden');
    }
  }

  if (analyzeVoiceButton) {
    analyzeVoiceButton.addEventListener('click', () => {
      const s1 = document.getElementById('voiceSample1').value;
      const s2 = document.getElementById('voiceSample2').value;
      const s3 = document.getElementById('voiceSample3').value;

      if (!s1 && !s2 && !s3) {
        alert("Please provide at least one writing sample to analyze your writing DNA.");
        return;
      }

      const samples = [s1, s2, s3].filter(s => s && s.trim().length > 0).join("\n---\n");
      const btn = document.getElementById('analyzeVoiceButton');

      btn.textContent = "Analyzing Your Writing DNA...";
      btn.disabled = true;

      // Send to background for analysis
      chrome.runtime.sendMessage({
        action: "performGhostAction",
        text: samples,
        prompt: "Analyze the writing style of the following text samples. Output a concise set of instructions (max 50 words) that describe the tone, sentence structure, and vocabulary, starting with 'You write with...'. Do not include the samples in the output."
      }, (response) => {
        btn.textContent = "Analyze & Train My Voice";
        btn.disabled = false;

        if (response && response.success && response.rewrittenText) {
          const style = response.rewrittenText;

          // Save the style so if they upgrade to Pro, it's immediately ready!
          chrome.storage.sync.set({ userVoiceStyle: style }, () => {
            showVoiceStyle(style);
            if (isPremiumUser) {
              alert("Voice DNA analyzed and activated across Ghost Writer & Rewriter!");
            } else {
              // Freemium hook: show them the awesome result, then invite to Pro
              if (voiceProLockNotice) voiceProLockNotice.classList.remove('hidden');
            }
          });
        } else {
          alert(response?.error || "Analysis failed. Please check your daily quota or try again.");
          console.error(response?.error);
        }
      });
    });
  }

  // Load saved voice style
  chrome.storage.sync.get(['userVoiceStyle', 'isPremium'], (data) => {
    isPremiumUser = !!data.isPremium;
    if (data.userVoiceStyle) {
      showVoiceStyle(data.userVoiceStyle);
    }
  });

  // Edit Button Click
  if (editVoiceButton) {
    editVoiceButton.addEventListener('click', () => {
      const currentStyle = detectedStyleText.textContent;
      detectedStyleEdit.value = currentStyle;

      detectedStyleText.classList.add('hidden');
      detectedStyleEdit.classList.remove('hidden');

      editVoiceButton.classList.add('hidden');
      removeVoiceButton.classList.add('hidden');
      saveVoiceEditButton.classList.remove('hidden');
      cancelVoiceEditButton.classList.remove('hidden');
    });
  }

  // Save Edit Button Click
  if (saveVoiceEditButton) {
    saveVoiceEditButton.addEventListener('click', () => {
      const newStyle = detectedStyleEdit.value.trim();
      if (newStyle) {
        chrome.storage.sync.set({ userVoiceStyle: newStyle }, () => {
          showVoiceStyle(newStyle);
          alert("Voice style updated!");
        });
      } else {
        alert("Voice style cannot be empty.");
      }
    });
  }

  // Cancel Edit Button Click
  if (cancelVoiceEditButton) {
    cancelVoiceEditButton.addEventListener('click', () => {
      // Just revert UI without saving
      showVoiceStyle(detectedStyleText.textContent);
    });
  }

  // Remove Button Click
  if (removeVoiceButton) {
    removeVoiceButton.addEventListener('click', () => {
      if (confirm("Are you sure you want to remove your saved voice style? You will need to re-analyze your writing samples to get it back.")) {
        chrome.storage.sync.remove('userVoiceStyle', () => {
          voiceResultDiv.classList.add('hidden');
          detectedStyleText.textContent = "";
          alert("Voice style removed.");
        });
      }
    });
  }

  // --- Save Settings ---
  function saveSettings() {
    if (!saveButton || !statusEl) return;

    // Get values from all inputs
    const settingsToSave = {
      enableNegativeAnimation: negAnimCheckbox ? negAnimCheckbox.checked : true,
      enablePositiveAnimation: posAnimCheckbox ? posAnimCheckbox.checked : true,
      enableMagicPointer: magicPointerCheckbox ? magicPointerCheckbox.checked : true,
      notionApiKey: notionApiKeyInput ? notionApiKeyInput.value.trim() : '',
      notionPageId: notionPageIdInput ? notionPageIdInput.value.trim() : ''
    };
    const personaInputEl = document.getElementById('userPersona');
    if (personaInputEl) {
      settingsToSave.userPersona = personaInputEl.value;
    }

    // Save them to chrome.storage.sync
    chrome.storage.sync.set(settingsToSave, () => {
      if (chrome.runtime.lastError) {
        console.error("Options: Error saving settings:", chrome.runtime.lastError);
        statusEl.textContent = "Error saving settings.";
        statusEl.style.color = "#dc3545"; // Error red
      } else {
        console.log("Options: Settings saved successfully.");
        statusEl.textContent = "Settings saved & synced to cloud!";
        statusEl.style.color = "#00ffff";

        // Sync Notion & Persona settings to Noos.AI Cloud Backend for Web Studio parity
        chrome.runtime.sendMessage({
          action: "syncCloudSettings",
          notionApiKey: settingsToSave.notionApiKey,
          notionPageId: settingsToSave.notionPageId
        });

        // Also broadcast animation setting changes to any open tabs
        chrome.runtime.sendMessage({
          message: "updateAnimationSetting",
          setting: "negative",
          enabled: settingsToSave.enableNegativeAnimation
        });
        chrome.runtime.sendMessage({
          message: "updateAnimationSetting",
          setting: "positive",
          enabled: settingsToSave.enablePositiveAnimation
        });
        chrome.runtime.sendMessage({
          message: "updateMagicPointerSetting",
          enabled: settingsToSave.enableMagicPointer
        });
      }

      // Clear the status message after a bit
      setTimeout(() => {
        if (statusEl) statusEl.textContent = "";
      }, 3000);
    });
  }

  // --- [NEW] Save Personas ---
  function savePersonas() {
    chrome.storage.sync.set({ customPersonas: customPersonas }, () => {
      if (chrome.runtime.lastError) {
        console.error("Options: Error saving personas:", chrome.runtime.lastError);
        statusEl.textContent = "Error saving personas.";
        statusEl.style.color = "#dc3545";
      } else {
        console.log("Options: Personas saved successfully.");
        renderPersonas(); // Re-render the list
      }
    });
  }

  // --- [NEW] Helper to escape HTML ---
  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // --- Add Listeners ---
  if (saveButton) {
    saveButton.addEventListener('click', saveSettings);
  } else {
    console.error("Options: Save button not found!");
  }

  if (addPersonaButton) {
    addPersonaButton.addEventListener('click', addPersona);
  }

  if (personasContainer) {
    personasContainer.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('delete-persona-btn')) {
        const index = parseInt(e.target.getAttribute('data-index'), 10);
        deletePersona(index);
      }
    });
  }

  // --- Initial Load ---
  loadSettings();
});