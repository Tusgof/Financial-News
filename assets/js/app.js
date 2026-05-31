/* ============================================================
   Financial News · app.js
   Loads news/manifest.json → fetches daily markdown →
   renders with marked.js → enhances confidence pills & sources.
   ============================================================ */

(() => {
  'use strict';

  const CATEGORIES = ['business', 'economy', 'politics'];
  const MANIFEST_URL = 'news/manifest.json';

  const el = {
    dateSelect: document.getElementById('dateSelect'),
    themeToggle: document.getElementById('themeToggle'),
    heroDate: document.getElementById('heroDate'),
    heroCount: document.getElementById('heroCount'),
    state: document.getElementById('state'),
    year: document.getElementById('year'),
    tabs: document.getElementById('tabs'),
    navLinks: document.getElementById('navLinks'),
    panels: {
      business: document.getElementById('business'),
      economy: document.getElementById('economy'),
      politics: document.getElementById('politics'),
    },
  };

  // Cache markdown per date so switching tabs/dates is instant.
  const cache = new Map(); // key: date → { business, economy, politics }

  /* ---------- Utilities ---------- */

  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  function formatThaiDate(iso) {
    // iso = YYYY-MM-DD
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    const buddhistYear = y + 543;
    return `${d} ${THAI_MONTHS[m - 1]} ${buddhistYear}`;
  }

  function shortThaiDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${d} ${THAI_MONTHS[m - 1].slice(0, 3)} ${(y + 543) % 100}`;
  }

  /* ---------- Theme ---------- */

  function initTheme() {
    const saved = localStorage.getItem('fn-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    el.themeToggle?.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('fn-theme', next);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = el.themeToggle?.querySelector('.theme-toggle__icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
  }

  /* ---------- Tabs ---------- */

  function initTabs() {
    el.tabs?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });

    // Nav links jump to category too
    el.navLinks?.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-cat]');
      if (!link) return;
      e.preventDefault();
      switchTab(link.dataset.cat);
      document.getElementById('tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function switchTab(cat) {
    if (!CATEGORIES.includes(cat)) return;
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('is-active', t.dataset.tab === cat);
    });
    CATEGORIES.forEach((c) => {
      el.panels[c]?.classList.toggle('is-active', c === cat);
    });
  }

  /* ---------- State display ---------- */

  function showState(html) {
    if (!el.state) return;
    el.state.innerHTML = html;
    el.state.hidden = false;
  }

  function hideState() {
    if (el.state) el.state.hidden = true;
  }

  function skeleton() {
    return `
      <div class="skel-card"></div>
      <div class="skel-card"></div>
      <div class="skel-card"></div>`;
  }

  /* ---------- Markdown enhancement ---------- */

  // After marked renders, walk blockquotes to upgrade
  // confidence ("ความเชื่อมั่น") and source ("ที่มา") lines.
  function enhanceMarkdown(container) {
    container.querySelectorAll('blockquote').forEach((bq) => {
      bq.querySelectorAll('p, li').forEach((node) => {
        const strong = node.querySelector('strong');
        if (!strong) return;
        const label = strong.textContent.replace(/[:：]/g, '').trim();

        if (label.includes('ความเชื่อมั่น')) {
          const raw = node.textContent.replace(strong.textContent, '').replace(/[:：]/g, '').trim();
          const level = classifyConfidence(raw);
          node.classList.add('conf-line');
          node.innerHTML = `${strong.outerHTML} <span class="conf-pill is-${level}">${raw || '—'}</span>`;
        } else if (label.includes('ที่มา')) {
          node.classList.add('source-line');
          node.querySelectorAll('a').forEach((a) => {
            a.classList.add('source-chip');
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          });
        }
      });
    });
  }

  function classifyConfidence(text) {
    const t = (text || '').toLowerCase();
    if (t.includes('สูง') || t.includes('high')) return 'high';
    if (t.includes('ต่ำ') || t.includes('low')) return 'low';
    return 'mid';
  }

  function countItems(container) {
    // Each "### N)" headline becomes an <h3>
    return container.querySelectorAll('h3').length;
  }

  /* ---------- Data loading ---------- */

  async function loadManifest() {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const data = await res.json();
    // Accept either { dates: [...] } or a bare array.
    const dates = Array.isArray(data) ? data : data.dates;
    if (!Array.isArray(dates) || dates.length === 0) throw new Error('no dates');
    // Sort newest first.
    return dates.slice().sort().reverse();
  }

  async function fetchMarkdown(date, cat) {
    const url = `news/${date}/${cat}.md`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.text();
  }

  async function loadDate(date) {
    if (cache.has(date)) return cache.get(date);
    const [business, economy, politics] = await Promise.all(
      CATEGORIES.map((c) => fetchMarkdown(date, c))
    );
    const bundle = { business, economy, politics };
    cache.set(date, bundle);
    return bundle;
  }

  /* ---------- Render ---------- */

  function renderPanel(cat, markdown) {
    const panel = el.panels[cat];
    if (!panel) return 0;

    if (!markdown || !markdown.trim()) {
      panel.innerHTML = `<div class="panel__empty">ยังไม่มีข่าวหมวดนี้สำหรับวันนี้</div>`;
      return 0;
    }

    panel.innerHTML = `<div class="md">${marked.parse(markdown)}</div>`;
    const md = panel.querySelector('.md');
    enhanceMarkdown(md);
    return countItems(md);
  }

  async function selectDate(date) {
    el.heroDate.textContent = formatThaiDate(date);
    el.heroCount.textContent = 'กำลังโหลด…';
    CATEGORIES.forEach((c) => {
      if (el.panels[c]) el.panels[c].innerHTML = `<div class="md">${skeleton()}</div>`;
    });
    hideState();

    try {
      const bundle = await loadDate(date);
      let total = 0;
      CATEGORIES.forEach((c) => {
        total += renderPanel(c, bundle[c]);
      });

      if (total === 0) {
        el.heroCount.textContent = 'ยังไม่มีข่าวสำหรับวันนี้';
      } else {
        el.heroCount.textContent = `${total} ข่าวเด่นวันนี้`;
      }
    } catch (err) {
      console.error('[FinancialNews] selectDate failed', err);
      el.heroCount.textContent = 'โหลดข่าวไม่สำเร็จ';
      CATEGORIES.forEach((c) => {
        if (el.panels[c]) {
          el.panels[c].innerHTML = `<div class="panel__empty">โหลดข่าวไม่สำเร็จ</div>`;
        }
      });
    }
  }

  function monthGroupLabel(iso) {
    // iso = YYYY-MM-DD -> "พฤษภาคม 2569"
    const [y, m] = iso.split('-').map(Number);
    if (!y || !m) return iso;
    return `${THAI_MONTHS[m - 1]} ${y + 543}`;
  }

  function populateDates(dates) {
    el.dateSelect.innerHTML = '';
    // Dates arrive newest-first. Group consecutive dates by month into <optgroup>
    // so the dropdown stays browsable as news accumulates over months/years.
    let currentGroup = null;
    let currentKey = null;
    dates.forEach((d, i) => {
      const key = d.slice(0, 7); // YYYY-MM
      if (key !== currentKey) {
        currentKey = key;
        currentGroup = document.createElement('optgroup');
        currentGroup.label = monthGroupLabel(d);
        el.dateSelect.appendChild(currentGroup);
      }
      const opt = document.createElement('option');
      opt.value = d;
      const day = Number(d.slice(8, 10));
      opt.textContent = i === 0 ? `${day} · ล่าสุด` : String(day);
      currentGroup.appendChild(opt);
    });
    el.dateSelect.addEventListener('change', () => selectDate(el.dateSelect.value));
  }

  /* ---------- Boot ---------- */

  async function init() {
    if (el.year) el.year.textContent = new Date().getFullYear();
    initTheme();
    initTabs();

    // Configure marked: GitHub-flavoured, line breaks honoured.
    if (window.marked) {
      marked.setOptions({ gfm: true, breaks: true });
    }

    try {
      const dates = await loadManifest();
      populateDates(dates);
      await selectDate(dates[0]);
    } catch (err) {
      console.error('[FinancialNews] init failed', err);
      el.heroDate.textContent = '—';
      el.heroCount.textContent = 'ยังไม่มีข้อมูลข่าว';
      showState(`
        <div class="state__emoji">📭</div>
        <h2 class="state__title">ยังไม่มีข้อมูลข่าว</h2>
        <p class="state__text">ระบบจะแสดงข่าวอัตโนมัติเมื่อ Claude routine บันทึกไฟล์ลงโฟลเดอร์ <code>news/</code> และอัปเดต <code>manifest.json</code></p>`);
      CATEGORIES.forEach((c) => {
        if (el.panels[c]) el.panels[c].innerHTML = '';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
