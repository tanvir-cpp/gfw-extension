// ── Content Script ─────────────────────────────────────────────────
// Runs at document_start on every page.
// If the current site is blocked → render aggressive block screen inline.

(function () {
  const DEFAULT_SITES = [
    'facebook.com', 'twitter.com', 'x.com', 'youtube.com',
    'instagram.com', 'reddit.com', 'tiktok.com', 'twitch.tv',
    'netflix.com', 'discord.com'
  ];

  const MESSAGES = [
    "GO FUCKING WORK.",
    "WHAT THE FUCK ARE YOU DOING?",
    "STOP PROCRASTINATING.",
    "GET BACK TO FUCKING WORK.",
    "YOU HAVE DEADLINES. WORK.",
    "IS THIS WORK? NO.",
    "WHY ARE YOU LIKE THIS?",
    "CLOSE THIS TAB. NOW.",
    "NO DISTRACTIONS. WORK.",
    "YOU'RE WASTING YOUR LIFE.",
    "EVERY SECOND COUNTS.",
    "THIS ISN'T GOING TO WORK ITSELF."
  ];

  const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
    { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" }
  ];

  chrome.storage.sync.get(
    ['blockedSites', 'pauseUntil', 'nuclearUntil', 'schedule', 'enabled'],
    (data) => {
      // Extension disabled
      if (data.enabled === false) return;

      const now = Date.now();

      // Check nuclear vs pause
      const isNuclear = data.nuclearUntil && data.nuclearUntil > now;
      if (!isNuclear && data.pauseUntil && data.pauseUntil > now) {
        return;
      }

      // Check schedule
      if (data.schedule && data.schedule.active) {
        const d = new Date();
        const currentMinutes = d.getHours() * 60 + d.getMinutes();
        const startMin = data.schedule.startHour * 60 + (data.schedule.startMinute || 0);
        const endMin = data.schedule.endHour * 60 + (data.schedule.endMinute || 0);

        let insideSchedule;
        if (startMin <= endMin) {
          insideSchedule = currentMinutes >= startMin && currentMinutes < endMin;
        } else {
          insideSchedule = currentMinutes >= startMin || currentMinutes < endMin;
        }

        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const today = dayNames[d.getDay()];
        const activeDays = data.schedule.days || ['mon', 'tue', 'wed', 'thu', 'fri'];
        if (!activeDays.includes(today)) return;
        if (!insideSchedule) return;
      }

      // Check if current site is blocked
      const blockedSites = data.blockedSites || DEFAULT_SITES;
      const hostname = window.location.hostname.toLowerCase();

      if (blockedSites.some(site => hostname.includes(site))) {
        // Notify background to track stats
        try { chrome.runtime.sendMessage({ type: 'blocked' }); } catch (_) {}

        // Stop page load immediately
        window.stop();

        // Pick random message & quote
        const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

        // Render the full block screen
        renderBlockPage(msg, quote, hostname, isNuclear, data.nuclearUntil);

        // Prevent any site scripts from reverting it
        const observer = new MutationObserver(() => {
          const h1 = document.querySelector('h1.gfw-title');
          if (!h1 || !h1.textContent.includes(msg)) {
            renderBlockPage(msg, quote, hostname, isNuclear, data.nuclearUntil);
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
    }
  );

  function renderBlockPage(msg, quote, blockedHost, isNuclear, nuclearUntil) {
    document.documentElement.innerHTML = `
    <head>
      <title>GET BACK TO WORK</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(231,76,60,0.3); }
          50%      { text-shadow: 0 0 60px rgba(231,76,60,0.6), 0 0 120px rgba(231,76,60,0.2); }
        }
        @keyframes breathe {
          0%, 100% { transform: translate(-50%,-50%) scale(1);   opacity: 0.1; }
          50%      { transform: translate(-50%,-50%) scale(1.15); opacity: 0.25; }
        }
        @keyframes glitchTop {
          0%   { clip-path: inset(0 0 95% 0); transform: translate(0); }
          20%  { clip-path: inset(20% 0 60% 0); transform: translate(-4px,-2px); }
          40%  { clip-path: inset(50% 0 30% 0); transform: translate(3px,1px); }
          60%  { clip-path: inset(70% 0 10% 0); transform: translate(-2px,3px); }
          80%  { clip-path: inset(10% 0 80% 0); transform: translate(5px,-1px); }
          100% { clip-path: inset(0 0 95% 0); transform: translate(0); }
        }
        @keyframes glitchBottom {
          0%   { clip-path: inset(95% 0 0 0); transform: translate(0); }
          20%  { clip-path: inset(60% 0 20% 0); transform: translate(4px,2px); }
          40%  { clip-path: inset(30% 0 50% 0); transform: translate(-3px,-1px); }
          60%  { clip-path: inset(10% 0 70% 0); transform: translate(2px,-3px); }
          80%  { clip-path: inset(80% 0 10% 0); transform: translate(-5px,1px); }
          100% { clip-path: inset(95% 0 0 0); transform: translate(0); }
        }
        @keyframes grain {
          0%,100% { transform: translate(0,0); }
          10% { transform: translate(-5%,-10%); }
          30% { transform: translate(3%,-15%); }
          50% { transform: translate(12%,9%); }
          70% { transform: translate(9%,4%); }
          90% { transform: translate(-1%,7%); }
        }

        html, body {
          width: 100% !important; height: 100% !important;
          background: #0a0a0a !important; color: #fff !important;
          font-family: 'Inter', -apple-system, sans-serif !important;
          display: flex !important; justify-content: center !important;
          align-items: center !important; overflow: hidden !important;
          position: relative !important;
        }

        .gfw-grain {
          position: fixed; top: -50%; left: -50%; width: 200%; height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
          animation: grain 8s steps(10) infinite;
          pointer-events: none; z-index: 100;
        }

        .gfw-vignette {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.8) 100%);
          pointer-events: none; z-index: 99;
        }

        .gfw-ring {
          position: fixed; top: 50%; left: 50%;
          width: 600px; height: 600px; border-radius: 50%;
          border: 1px solid rgba(231,76,60,0.15);
          animation: breathe 6s ease-in-out infinite;
          pointer-events: none; z-index: 1;
        }

        .gfw-container {
          text-align: center; max-width: 800px; padding: 40px 20px;
          z-index: 10; position: relative;
        }

        .gfw-glitch-wrap { position: relative; display: inline-block; margin-bottom: 16px; }

        h1.gfw-title {
          font-size: clamp(2.5rem, 8vw, 6rem) !important;
          font-weight: 900 !important; text-transform: uppercase !important;
          letter-spacing: -3px !important; line-height: 1.05 !important;
          color: #fff !important; margin: 0 !important; padding: 0 !important;
          background: none !important; border: none !important;
          animation: fadeInUp 0.6s ease-out, pulseGlow 4s ease-in-out infinite;
          position: relative;
        }
        h1.gfw-title::before, h1.gfw-title::after {
          content: attr(data-text);
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          font-size: inherit; font-weight: inherit; text-transform: inherit;
          letter-spacing: inherit; line-height: inherit;
        }
        h1.gfw-title::before { color: #ff004c; animation: glitchTop 3s linear infinite; z-index: -1; }
        h1.gfw-title::after  { color: #00e5ff; animation: glitchBottom 2.5s linear infinite; z-index: -2; }

        .gfw-sub {
          font-size: 1rem !important; color: rgba(255,255,255,0.45) !important;
          margin-bottom: 40px !important; animation: fadeInUp 0.8s ease-out;
          font-weight: 400 !important;
        }

        .gfw-stats {
          display: flex; justify-content: center; align-items: center;
          gap: 24px; margin-bottom: 40px; animation: fadeInUp 1s ease-out;
        }
        .gfw-stat { display: flex; flex-direction: column; align-items: center; }
        .gfw-stat-num {
          font-size: 2rem; font-weight: 900; color: #e74c3c; line-height: 1;
        }
        .gfw-stat-label {
          font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px;
          color: rgba(255,255,255,0.35); margin-top: 4px;
        }
        .gfw-stat-div { width: 1px; height: 40px; background: rgba(255,255,255,0.1); }

        .gfw-quote {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 24px 32px; margin-bottom: 40px;
          animation: fadeInUp 1.2s ease-out;
        }
        .gfw-quote p {
          font-size: 1.05rem !important; font-style: italic;
          color: rgba(255,255,255,0.7) !important; line-height: 1.6 !important;
          margin-bottom: 8px !important;
        }
        .gfw-quote span {
          font-size: 0.8rem; color: rgba(255,255,255,0.3);
          text-transform: uppercase; letter-spacing: 1px;
        }

        .gfw-nuclear-timer {
          margin-bottom: 32px; animation: fadeInUp 1.4s ease-out;
        }
        .gfw-nuclear-label {
          font-size: 0.7rem; text-transform: uppercase; letter-spacing: 3px;
          color: #e74c3c; margin-bottom: 8px; font-weight: 700;
        }
        .gfw-nuclear-time {
          font-size: 2.5rem; font-weight: 900; color: #e74c3c;
          font-variant-numeric: tabular-nums;
        }

        .gfw-actions { animation: fadeInUp 1.6s ease-out; }
        .gfw-close-btn {
          padding: 14px 48px; border: none; border-radius: 8px;
          font-family: 'Inter', sans-serif; font-size: 0.85rem;
          font-weight: 800; text-transform: uppercase; letter-spacing: 2px;
          cursor: pointer; transition: all 0.2s;
          background: #e74c3c; color: #fff;
        }
        .gfw-close-btn:hover {
          background: #ff6b5a; transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(231,76,60,0.4);
        }
        .gfw-close-btn:active { transform: translateY(0); }

        @media (max-width: 600px) {
          .gfw-stats { gap: 16px; }
          .gfw-stat-num { font-size: 1.5rem; }
          .gfw-quote { padding: 16px 20px; }
          .gfw-close-btn { padding: 12px 32px; width: 90%; }
        }
      </style>
    </head>
    <body>
      <div class="gfw-grain"></div>
      <div class="gfw-vignette"></div>
      <div class="gfw-ring"></div>

      <div class="gfw-container">
        <div class="gfw-glitch-wrap">
          <h1 class="gfw-title" data-text="${msg}">${msg}</h1>
        </div>

        <div class="gfw-sub">You were trying to visit <strong>${blockedHost}</strong>. Not today.</div>

        <div class="gfw-stats">
          <div class="gfw-stat">
            <span class="gfw-stat-num" id="gfwToday">0</span>
            <span class="gfw-stat-label">blocked today</span>
          </div>
          <div class="gfw-stat-div"></div>
          <div class="gfw-stat">
            <span class="gfw-stat-num" id="gfwTotal">0</span>
            <span class="gfw-stat-label">all time</span>
          </div>
        </div>

        <div class="gfw-quote">
          <p>"${quote.text}"</p>
          <span>— ${quote.author}</span>
        </div>

        ${isNuclear ? `
        <div class="gfw-nuclear-timer">
          <div class="gfw-nuclear-label">NUCLEAR MODE ACTIVE</div>
          <div class="gfw-nuclear-time" id="gfwNuclearTimer">--:--</div>
        </div>
        ` : ''}

        <div class="gfw-actions">
          <button class="gfw-close-btn" id="gfwCloseBtn">CLOSE THIS TAB</button>
        </div>
      </div>
    </body>
    `;

    // Load stats
    try {
      chrome.storage.local.get(['todayBlocks', 'totalBlocks'], (d) => {
        const tEl = document.getElementById('gfwToday');
        const aEl = document.getElementById('gfwTotal');
        if (tEl) tEl.textContent = d.todayBlocks || 0;
        if (aEl) aEl.textContent = d.totalBlocks || 0;
      });
    } catch (_) {}

    // Nuclear countdown
    if (isNuclear && nuclearUntil) {
      const timerEl = document.getElementById('gfwNuclearTimer');
      if (timerEl) {
        const tick = () => {
          const rem = nuclearUntil - Date.now();
          if (rem <= 0) { timerEl.textContent = '00:00'; return; }
          const m = Math.floor(rem / 60000);
          const s = Math.floor((rem % 60000) / 1000);
          timerEl.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
          requestAnimationFrame(tick);
        };
        tick();
      }
    }

    // Close button
    setTimeout(() => {
      const btn = document.getElementById('gfwCloseBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          window.close();
          setTimeout(() => { window.location.href = 'about:blank'; }, 200);
        });
      }
    }, 100);
  }
})();
