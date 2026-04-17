(function (global) {
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

  const DEFAULT_SCHEDULE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function normalizeSiteEntry(value) {
    if (typeof value !== 'string') {
      return '';
    }

    const raw = value.trim().toLowerCase();
    if (!raw) {
      return '';
    }

    let hostname = raw;

    try {
      const candidate = /^[a-z][a-z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
      hostname = new URL(candidate).hostname.toLowerCase();
    } catch (_) {
      hostname = raw
        .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
        .split('/')[0]
        .split('?')[0]
        .split('#')[0];
    }

    return hostname
      .replace(/^www\./, '')
      .replace(/\.+$/, '')
      .split(':')[0];
  }

  function normalizeSiteList(entries) {
    const list = Array.isArray(entries) ? entries : String(entries || '').split(/\r?\n/);
    const normalized = [];
    const seen = new Set();

    for (const entry of list) {
      const site = normalizeSiteEntry(entry);
      if (!site || seen.has(site)) {
        continue;
      }

      seen.add(site);
      normalized.push(site);
    }

    return normalized;
  }

  function hostnameMatches(hostname, blockedSite) {
    const normalizedHost = normalizeSiteEntry(hostname);
    const normalizedSite = normalizeSiteEntry(blockedSite);

    if (!normalizedHost || !normalizedSite) {
      return false;
    }

    return normalizedHost === normalizedSite || normalizedHost.endsWith(`.${normalizedSite}`);
  }

  function getDateKey(date) {
    const value = date instanceof Date ? date : new Date();
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  function getPreviousDateKey(date) {
    const previous = date instanceof Date ? new Date(date) : new Date();
    previous.setDate(previous.getDate() - 1);
    return getDateKey(previous);
  }

  function getNextLocalMidnightTimestamp(date) {
    const next = date instanceof Date ? new Date(date) : new Date();
    next.setHours(24, 0, 0, 0);
    return next.getTime();
  }

  function isWithinSchedule(schedule, now) {
    if (!schedule || !schedule.active) {
      return true;
    }

    const current = now instanceof Date ? now : new Date();
    const activeDays = Array.isArray(schedule.days) && schedule.days.length > 0
      ? schedule.days
      : DEFAULT_SCHEDULE_DAYS;
    const today = DAY_NAMES[current.getDay()];

    if (!activeDays.includes(today)) {
      return false;
    }

    const startHour = Number(schedule.startHour);
    const startMinute = Number(schedule.startMinute || 0);
    const endHour = Number(schedule.endHour);
    const endMinute = Number(schedule.endMinute || 0);

    if (
      !Number.isFinite(startHour) ||
      !Number.isFinite(startMinute) ||
      !Number.isFinite(endHour) ||
      !Number.isFinite(endMinute)
    ) {
      return false;
    }

    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes === endMinutes) {
      return true;
    }

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  global.GFW_SHARED = {
    CATEGORY_PRESETS,
    DEFAULT_SCHEDULE_DAYS,
    DEFAULT_SITES,
    getDateKey,
    getNextLocalMidnightTimestamp,
    getPreviousDateKey,
    hostnameMatches,
    isWithinSchedule,
    normalizeSiteEntry,
    normalizeSiteList,
    pad
  };
})(typeof self !== 'undefined' ? self : window);
