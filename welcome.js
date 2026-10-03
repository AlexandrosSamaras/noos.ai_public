document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      // If running inside Chrome extension context, cleanly close current tab
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.getCurrent) {
        chrome.tabs.getCurrent((tab) => {
          if (tab?.id) {
            chrome.tabs.remove(tab.id);
          } else {
            window.close();
          }
        });
      } else {
        window.close();
      }
    });
  }

  // Interactive Alt-key detection in sandbox for tactile feedback
  const sandboxHint = document.querySelector('.sandbox-hint');
  if (sandboxHint) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Alt') {
        sandboxHint.textContent = '🔥 ALT KEY DETECTED! Now click & drag a box over either demo card:';
        sandboxHint.style.background = 'rgba(0, 255, 255, 0.3)';
        sandboxHint.style.borderColor = '#00ffff';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt') {
        sandboxHint.textContent = '⚡ HOLD "ALT" & DRAG A BOX OVER EITHER DEMO CARD BELOW:';
        sandboxHint.style.background = 'rgba(0, 255, 255, 0.15)';
        sandboxHint.style.borderColor = 'rgba(0, 255, 255, 0.4)';
      }
    });
  }
});
