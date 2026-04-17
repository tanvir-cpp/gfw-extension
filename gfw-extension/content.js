// ── Content Script ─────────────────────────────────────────────────
// Redirect blocked pages into the packaged block screen.

(function () {
  const { DEFAULT_SITES, hostnameMatches, isWithinSchedule, normalizeSiteList } = window.GFW_SHARED;

  chrome.storage.sync.get(
    ['blockedSites', 'pauseUntil', 'nuclearUntil', 'schedule', 'enabled'],
    (data) => {
      if (data.enabled === false) {
        return;
      }

      const now = Date.now();
      const isNuclear = data.nuclearUntil && data.nuclearUntil > now;

      if (!isNuclear && data.pauseUntil && data.pauseUntil > now) {
        return;
      }

      if (!isWithinSchedule(data.schedule)) {
        return;
      }

      const hostname = window.location.hostname.toLowerCase();
      if (!hostname) {
        return;
      }

      const blockedSites = normalizeSiteList(
        Array.isArray(data.blockedSites) ? data.blockedSites : DEFAULT_SITES
      );

      if (!blockedSites.some((site) => hostnameMatches(hostname, site))) {
        return;
      }

      try {
        chrome.runtime.sendMessage({ type: 'blocked' });
      } catch (_) {}

      const blockedUrl = new URL(chrome.runtime.getURL('blocked.html'));
      blockedUrl.searchParams.set('site', hostname);
      window.location.replace(blockedUrl.toString());
    }
  );
})();
