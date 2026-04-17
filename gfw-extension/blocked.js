// ── Blocked Page Logic ──────────────────────────────────────────────

(function () {
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
    { text: "The pain of discipline is nothing like the pain of disappointment.", author: "Justin Langer" },
    { text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" }
  ];

  // ── Pick random message ───────────────────────────────────────────
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  const mainEl = document.getElementById('mainMessage');
  if (mainEl) {
    mainEl.textContent = msg;
    mainEl.setAttribute('data-text', msg);
  }

  // ── Pick random quote ─────────────────────────────────────────────
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const quoteText = document.getElementById('quoteText');
  const quoteAuthor = document.getElementById('quoteAuthor');
  if (quoteText) quoteText.textContent = `"${quote.text}"`;
  if (quoteAuthor) quoteAuthor.textContent = `— ${quote.author}`;

  // ── Load stats ────────────────────────────────────────────────────
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['todayBlocks', 'totalBlocks', 'streakDays'], (data) => {
      const todayEl = document.getElementById('todayCount');
      const totalEl = document.getElementById('totalCount');
      const streakEl = document.getElementById('streak');
      if (todayEl) todayEl.textContent = data.todayBlocks || 0;
      if (totalEl) totalEl.textContent = data.totalBlocks || 0;
      if (streakEl) streakEl.textContent = data.streakDays || 0;
    });

    // ── Nuclear mode timer ──────────────────────────────────────────
    chrome.storage.sync.get(['nuclearUntil'], (data) => {
      if (data.nuclearUntil && data.nuclearUntil > Date.now()) {
        const timerSection = document.getElementById('timerSection');
        const timerEl = document.getElementById('nuclearTimer');
        if (timerSection) timerSection.style.display = 'block';

        const tick = () => {
          const remaining = data.nuclearUntil - Date.now();
          if (remaining <= 0) {
            if (timerEl) timerEl.textContent = '00:00';
            return;
          }
          const mins = Math.floor(remaining / 60000);
          const secs = Math.floor((remaining % 60000) / 1000);
          if (timerEl) timerEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
          requestAnimationFrame(tick);
        };
        tick();
      }
    });
  }

  // ── Sub-message with blocked site name ────────────────────────────
  const subMsg = document.getElementById('subMessage');
  if (subMsg && window.__GFW_BLOCKED_SITE) {
    subMsg.textContent = `You were trying to visit ${window.__GFW_BLOCKED_SITE}. Not today.`;
  }

  // ── Close tab button ──────────────────────────────────────────────
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Try to close, if last tab go to new tab page
      window.close();
      // Fallback
      setTimeout(() => {
        window.location.href = 'about:blank';
      }, 200);
    });
  }
})();
