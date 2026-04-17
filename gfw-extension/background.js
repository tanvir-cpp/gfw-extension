// ── Background Service Worker ──────────────────────────────────────
// Handles badge count, local-midnight resets, and nuclear mode alarms.

importScripts('shared.js');

const {
  DEFAULT_SITES,
  getDateKey,
  getNextLocalMidnightTimestamp,
  getPreviousDateKey,
  normalizeSiteList
} = self.GFW_SHARED;

// ── Install / Startup ──────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['blockedSites'], (data) => {
    if (!data.blockedSites) {
      chrome.storage.sync.set({ blockedSites: DEFAULT_SITES.slice() });
      return;
    }

    chrome.storage.sync.set({ blockedSites: normalizeSiteList(data.blockedSites) });
  });

  resetDailyStatsIfNeeded();
  scheduleDailyResetAlarm();
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  resetDailyStatsIfNeeded();
  scheduleDailyResetAlarm();
  updateBadge();
});

// ── Alarms ─────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    resetDailyStatsIfNeeded();
    scheduleDailyResetAlarm();
  }
  if (alarm.name === 'nuclearEnd') {
    chrome.storage.sync.remove('nuclearUntil');
  }
});

// ── Message Handling from content / popup ──────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'blocked') {
    incrementBlockCount();
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'getBadge') {
    chrome.storage.local.get(['todayBlocks'], (data) => {
      sendResponse({ count: data.todayBlocks || 0 });
    });
    return true; // async
  }

  return false;
});

// ── Helpers ─────────────────────────────────────────────────────────
function incrementBlockCount() {
  chrome.storage.local.get(['todayBlocks', 'totalBlocks', 'todayDate', 'streakDays', 'streakDate'], (data) => {
    const today = getDateKey();
    const yesterday = getPreviousDateKey();
    let todayBlocks = data.todayDate === today ? Number(data.todayBlocks) || 0 : 0;
    todayBlocks++;

    let streakDays = Number(data.streakDays) || 0;
    if (data.streakDate === today) {
      streakDays = Math.max(streakDays, 1);
    } else if (data.streakDate === yesterday) {
      streakDays++;
    } else {
      streakDays = 1;
    }

    chrome.storage.local.set({
      todayBlocks,
      totalBlocks: (Number(data.totalBlocks) || 0) + 1,
      todayDate: today,
      streakDate: today,
      streakDays
    }, () => {
      updateBadge();
    });
  });
}

function resetDailyStatsIfNeeded() {
  chrome.storage.local.get(['todayDate', 'streakDate', 'streakDays'], (data) => {
    const today = getDateKey();
    const yesterday = getPreviousDateKey();
    const updates = {};

    if (data.todayDate !== today) {
      updates.todayBlocks = 0;
      updates.todayDate = today;
    }

    if (data.streakDate && data.streakDate !== today && data.streakDate !== yesterday) {
      updates.streakDays = 0;
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates, () => {
        updateBadge();
      });
      return;
    }

    updateBadge();
  });
}

function scheduleDailyResetAlarm() {
  chrome.alarms.create('dailyReset', { when: getNextLocalMidnightTimestamp() });
}

function updateBadge() {
  chrome.storage.local.get(['todayBlocks'], (data) => {
    const count = data.todayBlocks || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    chrome.action.setBadgeTextColor({ color: '#ffffff' });
  });
}
