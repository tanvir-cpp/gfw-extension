// ── Background Service Worker ──────────────────────────────────────
// Handles badge count, daily stats reset, and nuclear mode alarms.

const DEFAULT_SITES = [
  'facebook.com', 'twitter.com', 'x.com', 'youtube.com',
  'instagram.com', 'reddit.com', 'tiktok.com', 'twitch.tv',
  'netflix.com', 'discord.com'
];

const CATEGORY_PRESETS = {
  'Social Media': ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'snapchat.com', 'threads.net'],
  'Entertainment': ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'primevideo.com'],
  'News & Forums': ['reddit.com', 'news.ycombinator.com', 'buzzfeed.com', 'cnn.com', 'bbc.com'],
  'Messaging': ['discord.com', 'web.whatsapp.com', 'web.telegram.org', 'messenger.com']
};

// ── Install / Startup ──────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['blockedSites'], (data) => {
    if (!data.blockedSites) {
      chrome.storage.sync.set({ blockedSites: DEFAULT_SITES });
    }
  });
  // Initialize daily stats
  resetDailyStatsIfNeeded();
  // Create alarm for daily reset (fires every 24 hours)
  chrome.alarms.create('dailyReset', { periodInMinutes: 1440 });
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  resetDailyStatsIfNeeded();
  updateBadge();
});

// ── Alarms ─────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    resetDailyStatsIfNeeded();
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
  }
  if (msg.type === 'getBadge') {
    chrome.storage.local.get(['todayBlocks'], (data) => {
      sendResponse({ count: data.todayBlocks || 0 });
    });
    return true; // async
  }
  if (msg.type === 'getPresets') {
    sendResponse({ presets: CATEGORY_PRESETS });
    return true;
  }
});

// ── Helpers ─────────────────────────────────────────────────────────
function incrementBlockCount() {
  chrome.storage.local.get(['todayBlocks', 'totalBlocks', 'todayDate'], (data) => {
    const today = new Date().toDateString();
    let todayBlocks = data.todayDate === today ? (data.todayBlocks || 0) : 0;
    todayBlocks++;
    const totalBlocks = (data.totalBlocks || 0) + 1;
    chrome.storage.local.set({ todayBlocks, totalBlocks, todayDate: today }, () => {
      updateBadge();
    });
  });
}

function resetDailyStatsIfNeeded() {
  chrome.storage.local.get(['todayDate'], (data) => {
    const today = new Date().toDateString();
    if (data.todayDate !== today) {
      chrome.storage.local.set({ todayBlocks: 0, todayDate: today });
      updateBadge();
    }
  });
}

function updateBadge() {
  chrome.storage.local.get(['todayBlocks'], (data) => {
    const count = data.todayBlocks || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    chrome.action.setBadgeTextColor({ color: '#ffffff' });
  });
}
