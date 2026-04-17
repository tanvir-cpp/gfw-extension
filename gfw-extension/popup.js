// ── Popup Controller ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const { CATEGORY_PRESETS, DEFAULT_SITES, normalizeSiteList, pad } = window.GFW_SHARED;

  // ── DOM refs ──────────────────────────────────────────────────────
  const sitesList = document.getElementById('sitesList');
  const blockCurrentTabBtn = document.getElementById('blockCurrentTabBtn');
  const saveBtn = document.getElementById('saveBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseOptions = document.getElementById('pauseOptions');
  const nuclearBtn = document.getElementById('nuclearBtn');
  const enableToggle = document.getElementById('enableToggle');
  const scheduleToggle = document.getElementById('scheduleToggle');
  const scheduleStart = document.getElementById('scheduleStart');
  const scheduleEnd = document.getElementById('scheduleEnd');
  const categoryChips = document.getElementById('categoryChips');
  const toast = document.getElementById('toast');

  // Stat elements
  const statToday = document.getElementById('statToday');
  const statTotal = document.getElementById('statTotal');
  const statStreak = document.getElementById('statStreak');

  // Render category chips
  Object.keys(CATEGORY_PRESETS).forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const currentSites = parseSites(sitesList.value);
      const presetSites = CATEGORY_PRESETS[cat];
      if (chip.classList.contains('active')) {
        // Add preset sites not already in list
        presetSites.forEach(s => {
          if (!currentSites.includes(s)) currentSites.push(s);
        });
      } else {
        // Remove preset sites from list
        presetSites.forEach(s => {
          const idx = currentSites.indexOf(s);
          if (idx !== -1) currentSites.splice(idx, 1);
        });
      }
      sitesList.value = currentSites.join('\n');
    });
    categoryChips.appendChild(chip);
  });

  // ── Load saved data ───────────────────────────────────────────────
  chrome.storage.sync.get(
    ['blockedSites', 'pauseUntil', 'nuclearUntil', 'enabled', 'schedule'],
    (data) => {
      const sites = Array.isArray(data.blockedSites)
        ? normalizeSiteList(data.blockedSites)
        : DEFAULT_SITES.slice();
      sitesList.value = sites.join('\n');

      // Master toggle
      enableToggle.checked = data.enabled !== false;

      // Pause state
      updatePauseUI(data.pauseUntil);

      // Nuclear state
      updateNuclearUI(data.nuclearUntil);

      // Schedule
      if (data.schedule) {
        scheduleToggle.checked = data.schedule.active || false;
        if (data.schedule.startHour !== undefined) {
          scheduleStart.value = pad(data.schedule.startHour) + ':' + pad(data.schedule.startMinute || 0);
        }
        if (data.schedule.endHour !== undefined) {
          scheduleEnd.value = pad(data.schedule.endHour) + ':' + pad(data.schedule.endMinute || 0);
        }
        if (data.schedule.days) {
          document.querySelectorAll('.day-pill').forEach(pill => {
            pill.classList.toggle('active', data.schedule.days.includes(pill.dataset.day));
          });
        }
      }

      // Highlight active category chips
      highlightChips(sites);
    }
  );

  // Load stats
  refreshStats();

  blockCurrentTabBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const [tab] = tabs || [];
      const currentSite = tab && typeof tab.url === 'string'
        ? normalizeSiteList([tab.url])[0]
        : '';

      if (!currentSite) {
        showToast('Current tab cannot be blocked');
        return;
      }

      const sites = parseSites(sitesList.value);
      if (sites.includes(currentSite)) {
        showToast('Current tab already blocked');
        return;
      }

      sites.push(currentSite);
      sitesList.value = sites.join('\n');
      highlightChips(sites);

      chrome.storage.sync.set({ blockedSites: sites }, () => {
        showToast(`Blocked ${currentSite}`);
      });
    });
  });

  // ── Save ──────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    const sites = parseSites(sitesList.value);

    // Build schedule
    const startParts = scheduleStart.value.split(':');
    const endParts = scheduleEnd.value.split(':');
    const activeDays = [];
    document.querySelectorAll('.day-pill.active').forEach(p => activeDays.push(p.dataset.day));

    const schedule = {
      active: scheduleToggle.checked,
      startHour: parseInt(startParts[0], 10),
      startMinute: parseInt(startParts[1], 10),
      endHour: parseInt(endParts[0], 10),
      endMinute: parseInt(endParts[1], 10),
      days: activeDays
    };

    chrome.storage.sync.set({
      blockedSites: sites,
      enabled: enableToggle.checked,
      schedule: schedule
    }, () => {
      showToast('Saved!');
    });
  });

  // ── Pause ─────────────────────────────────────────────────────────
  pauseBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['pauseUntil', 'nuclearUntil'], (data) => {
      const now = Date.now();
      // Block pause if nuclear mode is active
      if (data.nuclearUntil && data.nuclearUntil > now) {
        showToast('Nuclear mode active!');
        return;
      }
      if (data.pauseUntil && data.pauseUntil > now) {
        // Unpause
        chrome.storage.sync.remove('pauseUntil', () => {
          updatePauseUI(null);
          pauseOptions.classList.remove('visible');
        });
      } else {
        // Show pause duration options
        pauseOptions.classList.toggle('visible');
      }
    });
  });

  // Pause duration buttons
  document.querySelectorAll('.pause-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.minutes, 10);
      const pauseTime = Date.now() + mins * 60 * 1000;
      chrome.storage.sync.set({ pauseUntil: pauseTime }, () => {
        updatePauseUI(pauseTime);
        pauseOptions.classList.remove('visible');
        showToast(`Paused for ${mins} min`);
      });
    });
  });

  // ── Nuclear Mode ──────────────────────────────────────────────────
  nuclearBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['nuclearUntil'], (data) => {
      const now = Date.now();
      if (data.nuclearUntil && data.nuclearUntil > now) {
        showToast('Cannot disable nuclear mode!');
        return;
      }
      if (confirm('Activate NUCLEAR MODE for 1 hour? This CANNOT be undone.')) {
        const nuclearTime = now + 60 * 60 * 1000;
        chrome.storage.sync.set({ nuclearUntil: nuclearTime }, () => {
          // Also clear any pause
          chrome.storage.sync.remove('pauseUntil');
          // Set alarm in background
          chrome.alarms.create('nuclearEnd', { when: nuclearTime });
          updateNuclearUI(nuclearTime);
          showToast('NUCLEAR MODE ACTIVATED');
        });
      }
    });
  });

  // ── Day pill toggles ──────────────────────────────────────────────
  document.querySelectorAll('.day-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────
  function parseSites(text) {
    return normalizeSiteList(text);
  }

  function updatePauseUI(pauseUntil) {
    const now = Date.now();
    if (pauseUntil && pauseUntil > now) {
      const mins = Math.ceil((pauseUntil - now) / 60000);
      pauseBtn.textContent = `Resume (${mins}m left)`;
      pauseBtn.classList.add('paused');
    } else {
      pauseBtn.textContent = 'Pause';
      pauseBtn.classList.remove('paused');
    }
  }

  function updateNuclearUI(nuclearUntil) {
    const now = Date.now();
    if (nuclearUntil && nuclearUntil > now) {
      const mins = Math.ceil((nuclearUntil - now) / 60000);
      nuclearBtn.textContent = `☢ NUCLEAR ACTIVE — ${mins}m LEFT`;
      nuclearBtn.classList.add('active');
    } else {
      nuclearBtn.textContent = '☢ NUCLEAR MODE — 1 HOUR';
      nuclearBtn.classList.remove('active');
    }
  }

  function highlightChips(sites) {
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
      const cat = chip.textContent;
      const presetSites = CATEGORY_PRESETS[cat];
      if (presetSites && presetSites.every(s => sites.includes(s))) {
        chip.classList.add('active');
        return;
      }

      chip.classList.remove('active');
    });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  function refreshStats() {
    chrome.storage.local.get(['todayBlocks', 'totalBlocks', 'streakDays'], (data) => {
      statToday.textContent = data.todayBlocks || 0;
      statTotal.textContent = data.totalBlocks || 0;
      statStreak.textContent = data.streakDays || 0;
    });
  }

  // Auto-refresh pause/nuclear UI
  setInterval(() => {
    chrome.storage.sync.get(['pauseUntil', 'nuclearUntil'], (data) => {
      updatePauseUI(data.pauseUntil);
      updateNuclearUI(data.nuclearUntil);
    });
    refreshStats();
  }, 5000);
});
