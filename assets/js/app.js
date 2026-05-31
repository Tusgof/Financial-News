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

  // After marked renders, group each item (h3 + Thai headline + blockquote)
  // into a clean news card. This strips the "พาดหัวไทย:" label, gives every
  // item a number badge + English kicker + bold Thai headline, and breaks the
  // dense analysis blockquote into analysis / "why it matters" / meta sections.
  function enhanceMarkdown(container) {
    const nodes = Array.from(container.children);
    const frag = document.createDocumentFragment();

    let i = 0;
    while (i < nodes.length) {
      const node = nodes[i];

      if (node.tagName !== 'H3') {
        // Region headings (h2), title (h1), separators — keep as-is.
        frag.appendChild(node);
        i++;
        continue;
      }

      const card = document.createElement('article');
      card.className = 'news-card';

      // English headline like "1) Wall Street Closes..." → number + kicker.
      const rawEn = node.textContent.trim();
      const m = rawEn.match(/^(\d+)\)\s*(.*)$/);
      const num = m ? m[1] : '';
      const kicker = m ? m[2] : rawEn;

      if (num) {
        const badge = document.createElement('div');
        badge.className = 'news-card__num';
        badge.textContent = num;
        card.appendChild(badge);
      }

      const main = document.createElement('div');
      main.className = 'news-card__main';

      if (kicker) {
        const k = document.createElement('p');
        k.className = 'news-card__kicker';
        k.textContent = kicker;
        main.appendChild(k);
      }

      let j = i + 1;

      // Next paragraph is the Thai headline — drop the "พาดหัวไทย:" label.
      if (j < nodes.length && nodes[j].tagName === 'P') {
        const p = nodes[j];
        let headline = p.innerHTML
          .replace(/^\s*<strong>[\s\S]*?<\/strong>/i, '')
          .replace(/^[\s:：]+/, '')
          .trim();
        const tmp = document.createElement('div');
        tmp.innerHTML = headline;
        const h = document.createElement('h3');
        h.className = 'news-card__headline';
        h.textContent = tmp.textContent.trim();
        main.appendChild(h);
        j++;
      }

      // Following blockquote holds analysis / why / confidence / source.
      if (j < nodes.length && nodes[j].tagName === 'BLOCKQUOTE') {
        main.appendChild(transformBody(nodes[j]));
        j++;
      }

      card.appendChild(main);
      frag.appendChild(card);
      i = j;
    }

    container.innerHTML = '';
    container.appendChild(frag);
  }

  // Turn a rendered analysis blockquote into structured card sections.
  function transformBody(bq) {
    const wrap = document.createElement('div');
    wrap.className = 'news-card__body';

    // marked (breaks:true) collapses the 4 ">" lines into one <p> joined by
    // <br>, so flatten every p/li and split on <br> to recover each line.
    const lines = [];
    bq.querySelectorAll('p, li').forEach((node) => {
      node.innerHTML.split(/<br\s*\/?>/i).forEach((seg) => {
        const t = seg.trim();
        if (t) lines.push(t);
      });
    });

    const meta = document.createElement('div');
    meta.className = 'news-card__meta';

    lines.forEach((lineHtml) => {
      const labelMatch = lineHtml.match(/^\s*<strong>([\s\S]*?)<\/strong>/i);
      const label = labelMatch ? labelMatch[1].replace(/[:：]/g, '').trim() : '';
      const valueHtml = lineHtml
        .replace(/^\s*<strong>[\s\S]*?<\/strong>/i, '')
        .replace(/^[\s:：]+/, '')
        .trim();
      const tmp = document.createElement('div');
      tmp.innerHTML = valueHtml;
      const valueText = tmp.textContent.trim();

      if (label.includes('บทวิเคราะห์')) {
        const p = document.createElement('p');
        p.className = 'news-card__analysis';
        p.innerHTML = valueHtml;
        wrap.appendChild(p);
      } else if (label.includes('สนใจ') || label.includes('ทำไม')) {
        const why = document.createElement('div');
        why.className = 'news-card__why';
        const lbl = document.createElement('span');
        lbl.className = 'news-card__why-label';
        lbl.textContent = 'น่าสนใจเพราะ';
        const txt = document.createElement('span');
        txt.className = 'news-card__why-text';
        txt.innerHTML = valueHtml;
        why.append(lbl, txt);
        wrap.appendChild(why);
      } else if (label.includes('ความเชื่อมั่น')) {
        const level = classifyConfidence(valueText);
        const pill = document.createElement('span');
        pill.className = `conf-pill is-${level}`;
        pill.textContent = `เชื่อมั่น${valueText || '—'}`;
        meta.appendChild(pill);
      } else if (label.includes('ที่มา')) {
        tmp.querySelectorAll('a').forEach((a) => {
          a.classList.add('source-chip');
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          meta.appendChild(a);
        });
      } else if (label) {
        const p = document.createElement('p');
        p.className = 'news-card__analysis';
        p.innerHTML = lineHtml;
        wrap.appendChild(p);
      }
    });

    if (meta.children.length) wrap.appendChild(meta);
    return wrap;
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
