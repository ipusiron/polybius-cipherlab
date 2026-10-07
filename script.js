// ============ Polybius CipherLab ============
// 画面側。方陣の生成・暗号化・復号は js/polybius-core.js（PolybiusCore）に置き、
// ここでは DOM の読み書きだけを行う。文言は js/messages.js（PolybiusMessages）から取る

(() => {
  'use strict';

  const Core = globalThis.PolybiusCore;
  const t = (key, vars) => globalThis.PolybiusMessages.t(key, vars);
  const $ = (id) => document.getElementById(id);

  // 対応表に並べる上限。これを超えたら残りの件数だけを出す（1万文字でアニメが何分も続くのを防ぐ）
  const MAPPING_LIMIT = 200;
  const ANIM_STEP_MS = 36;

  // タブごとの設定。暗号化・復号・マトリクスはそれぞれ独立した方陣を持つ
  // （表示している鍵と計算に使う鍵がずれないよう、ひとつの状態を共有しない）
  const PANELS = {
    encrypt: { mode: 'mode-enc', keyword: 'keyword-enc', preview: 'matrix-container-enc', status: 'enc-status' },
    decrypt: { mode: 'mode-dec', keyword: 'keyword-dec', preview: 'matrix-container-dec', status: 'dec-status' },
    matrix: { mode: 'mode-matrix', keyword: 'keyword-matrix', preview: 'matrix-container', status: null },
  };

  // Utilities
  function squareOf(tab) {
    const p = PANELS[tab];
    return Core.buildSquare({ mode: $(p.mode).value, keyword: $(p.keyword).value });
  }

  function setStatus(id, parts) {
    const el = $(id);
    if (!el) return;
    el.textContent = parts.filter(Boolean).join(' ');
  }

  function showToast(msg) {
    const el = $('toast');
    el.textContent = msg || t('toast.copied');
    el.hidden = false;
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
      el.hidden = true;
    }, 1200);
  }

  function copyText(id, statusId) {
    const el = $(id);
    if (!el) return;
    const done = () => {
      showToast(t('toast.copied'));
      const st = $(statusId);
      if (st) {
        const prev = st.textContent;
        st.textContent = t('status.copied');
        setTimeout(() => {
          st.textContent = prev;
        }, 1500);
      }
    };
    const fallback = () => {
      el.select();
      try {
        document.execCommand('copy');
        done();
      } catch {
        showToast(t('toast.copyFailed'));
      }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(el.value).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  // キーワードの入力欄から、使えない文字・読み替えた文字の注意書きを作る
  function keywordNotes(square) {
    const notes = [];
    const dropped = square.keyword.dropped;
    if (dropped.length) notes.push(t('keyword.dropped', { chars: [...new Set(dropped)].join(' ') }));
    const merged = square.keyword.merged;
    if (merged.length) {
      const from = [...new Set(merged.map((m) => m.from.toLowerCase()))].join(' ');
      notes.push(t('keyword.merged', { chars: from, to: merged[0].to.toLowerCase() }));
    }
    return notes;
  }

  // Rendering matrix
  function renderMatrix(containerId, square) {
    const container = $(containerId);
    if (!container) return;

    container.replaceChildren();
    const wrap = document.createElement('div');
    wrap.className = 'matrix-wrapper';

    const grid = document.createElement('div');
    grid.className = 'matrix';
    grid.style.gridTemplateColumns = `repeat(${square.size + 1}, minmax(0, 1fr))`;

    // Header row (top-left corner)
    const corner = document.createElement('div');
    corner.className = 'cell coord';
    corner.textContent = '↘';
    corner.setAttribute('aria-hidden', 'true');
    grid.appendChild(corner);

    // Col headers
    for (let c = 1; c <= square.size; c++) {
      const h = document.createElement('div');
      h.className = 'cell coord';
      h.textContent = String(c);
      grid.appendChild(h);
    }

    // Rows
    for (let r = 0; r < square.size; r++) {
      const h = document.createElement('div');
      h.className = 'cell coord';
      h.textContent = String(r + 1);
      grid.appendChild(h);

      for (let c = 0; c < square.size; c++) {
        const charUpper = square.rows[r][c];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.textContent = charUpper.toLowerCase();
        cell.setAttribute('aria-label', t('matrix.cellLabel', {
          char: charUpper.toLowerCase(),
          row: r + 1,
          col: c + 1,
          pair: `${r + 1}${c + 1}`,
        }));

        if (square.keywordChars.has(charUpper)) cell.classList.add('keyword-char');

        cell.dataset.row = String(r + 1);
        cell.dataset.col = String(c + 1);
        cell.addEventListener('click', () => {
          const on = cell.classList.contains('highlight');
          grid.querySelectorAll('.cell').forEach((x) => x.classList.remove('highlight'));
          if (on) return; // もう一度押したら消す
          grid.querySelectorAll(`.cell[data-row="${r + 1}"], .cell[data-col="${c + 1}"]`)
            .forEach((x) => x.classList.add('highlight'));
        });
        grid.appendChild(cell);
      }
    }

    wrap.appendChild(grid);
    container.appendChild(wrap);
  }

  function renderPreview(tab) {
    const square = squareOf(tab);
    renderMatrix(PANELS[tab].preview, square);
    return square;
  }

  // 対応表。innerHTML を使わず要素で組み立てる（入力の文字がそのまま入るため）
  const animations = {};
  async function renderMapping(listId, items) {
    const list = $(listId);
    if (!list) return;
    const run = (animations[listId] || 0) + 1;
    animations[listId] = run;

    list.replaceChildren();
    const shown = items.slice(0, MAPPING_LIMIT);
    for (const it of shown) {
      const li = document.createElement('li');
      if (it.kind) li.dataset.kind = it.kind;
      const left = document.createElement('span');
      left.className = 'left';
      left.textContent = it.left;
      const right = document.createElement('span');
      right.className = 'pair';
      right.textContent = it.right;
      li.append(left, document.createTextNode(' → '), right);
      list.appendChild(li);
    }
    if (items.length > shown.length) {
      const li = document.createElement('li');
      li.className = 'more';
      li.textContent = t('mapping.more', { count: items.length - shown.length, shown: MAPPING_LIMIT });
      list.appendChild(li);
    }

    // 動きを減らす設定のときは光らせない。走っている間に押し直されたら、古いほうは止める
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const li of [...list.children]) {
      if (animations[listId] !== run) return;
      li.classList.add('anim');
      await new Promise((r) => setTimeout(r, ANIM_STEP_MS));
      li.classList.remove('anim');
    }
  }

  // Tabs
  function setupTabs() {
    const tabs = [...document.querySelectorAll('.tab')];
    const select = (btn) => {
      tabs.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        const panel = $(`tab-${b.dataset.tab}`);
        if (panel) panel.classList.toggle('active', on);
      });
    };
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => select(btn));
      btn.addEventListener('keydown', (ev) => {
        const i = tabs.indexOf(btn);
        let next = -1;
        if (ev.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (ev.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        if (ev.key === 'Home') next = 0;
        if (ev.key === 'End') next = tabs.length - 1;
        if (next < 0) return;
        ev.preventDefault();
        select(tabs[next]);
        tabs[next].focus();
      });
    });
  }

  // Events
  function setupEncrypt() {
    const update = () => {
      const square = renderPreview('encrypt');
      setStatus('enc-status', keywordNotes(square));
    };
    $('mode-enc').addEventListener('change', update);
    $('keyword-enc').addEventListener('input', update);

    $('btn-enc').addEventListener('click', () => {
      const square = renderPreview('encrypt');
      const norm = Core.normalizeInput($('enc-input').value);
      const result = Core.encrypt(square, norm.text, {
        preserveSpaces: $('preserve-spaces-enc').checked,
        concat: $('concat-pairs-enc').checked,
        preserveSymbols: $('preserve-symbols-enc').checked,
      });
      $('enc-output').value = result.cipher;

      const s = result.stats;
      const parts = keywordNotes(square);
      if (!norm.text) parts.push(t('status.empty'));
      else if (s.pairs) parts.push(t('status.encrypted', { pairs: s.pairs }));
      else parts.push(t('status.nothing'));
      if (norm.truncated) parts.push(t('status.truncated', { count: norm.truncated, max: Core.MAX_INPUT }));
      if (s.merged.length) {
        parts.push(t('status.merged', {
          chars: s.merged.map((c) => c.toLowerCase()).join(' '),
          to: (square.merge[s.merged[0]] || '').toLowerCase(),
        }));
      }
      if (s.droppedSymbols) parts.push(t('status.droppedSymbols', { count: s.droppedSymbols }));
      if (s.droppedNonAscii) parts.push(t('status.droppedNonAscii', { count: s.droppedNonAscii }));
      if (s.droppedSpaces) parts.push(t('status.droppedSpaces'));
      setStatus('enc-status', parts);

      renderMapping('enc-map', result.mapping);
    });

    $('btn-enc-copy').addEventListener('click', () => copyText('enc-output', 'enc-status'));
    $('btn-enc-clear').addEventListener('click', () => {
      $('enc-input').value = '';
      $('enc-output').value = '';
      $('enc-map').replaceChildren();
      setStatus('enc-status', []);
    });
  }

  function setupDecrypt() {
    const update = () => {
      const square = renderPreview('decrypt');
      setStatus('dec-status', keywordNotes(square));
    };
    $('mode-dec').addEventListener('change', update);
    $('keyword-dec').addEventListener('input', update);

    // 暗号化タブの結果と設定を取り込む
    $('btn-sync-cipher').addEventListener('click', () => {
      $('dec-input').value = $('enc-output').value;
      $('mode-dec').value = $('mode-enc').value;
      $('keyword-dec').value = $('keyword-enc').value;
      update();
      showToast(t('toast.synced'));
    });

    $('btn-dec').addEventListener('click', () => {
      const square = renderPreview('decrypt');
      const norm = Core.normalizeInput($('dec-input').value);
      const result = Core.decrypt(square, norm.text);
      $('dec-output').value = result.plain;

      const s = result.stats;
      const parts = keywordNotes(square);
      if (!norm.text) parts.push(t('status.empty'));
      else if (s.decoded) parts.push(t('status.decoded', { count: s.decoded }));
      else parts.push(t('status.nothingDecoded'));
      if (norm.truncated) parts.push(t('status.truncated', { count: norm.truncated, max: Core.MAX_INPUT }));
      if (s.outOfRange) parts.push(t('status.outOfRange', { count: s.outOfRange }));
      if (s.leftover) parts.push(t('status.leftover', { count: s.leftover }));
      if (s.symbols) parts.push(t('status.symbols', { count: s.symbols }));
      // i が出たときだけ、j と見分けられないことを添える
      if (square.mode === '5x5' && result.plain.includes('i')) parts.push(t('status.ijNote'));
      setStatus('dec-status', parts);

      renderMapping('dec-map', result.mapping);
    });

    $('btn-dec-copy').addEventListener('click', () => copyText('dec-output', 'dec-status'));
    $('btn-dec-clear').addEventListener('click', () => {
      $('dec-input').value = '';
      $('dec-output').value = '';
      $('dec-map').replaceChildren();
      setStatus('dec-status', []);
    });
  }

  function setupMatrix() {
    const update = () => renderPreview('matrix');
    $('mode-matrix').addEventListener('change', update);
    $('keyword-matrix').addEventListener('input', update);
  }

  // ヘルプの「?」。hover だけでは触る画面で読めないので、押しても出るようにする
  function setupHelp() {
    const closeAll = () => document.querySelectorAll('.help-icon.open').forEach((x) => x.classList.remove('open'));
    document.querySelectorAll('.help-icon').forEach((btn) => {
      btn.addEventListener('click', () => {
        const on = btn.classList.contains('open');
        closeAll();
        if (!on) btn.classList.add('open');
      });
    });
    document.addEventListener('click', (ev) => {
      if (!ev.target.closest || !ev.target.closest('.help-icon')) closeAll();
    });
    // Esc で閉じる（WCAG 2.2 の 1.4.13）。フォーカスが残っていると :focus-visible で出たままになるので外す
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      closeAll();
      const active = document.activeElement;
      if (active && active.classList && active.classList.contains('help-icon')) active.blur();
    });
  }

  // Theme management
  const THEME_KEY = 'theme';

  function readTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // 保存を読めない環境では、そのページの間だけ切り替える
    }
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
    return mq && mq.matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    const icon = document.querySelector('.theme-icon');
    const btn = $('theme-toggle');
    if (theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
      if (icon) icon.textContent = '🌙';
      if (btn) btn.setAttribute('aria-label', t('theme.toDark'));
    } else {
      document.body.removeAttribute('data-theme');
      if (icon) icon.textContent = '☀️';
      if (btn) btn.setAttribute('aria-label', t('theme.toLight'));
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // 保存できなくても表示は切り替わる
    }
  }

  function initTheme() {
    applyTheme(readTheme());
    $('theme-toggle').addEventListener('click', () => {
      applyTheme(document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });
  }

  // Init
  function init() {
    initTheme();
    setupTabs();
    setupEncrypt();
    setupDecrypt();
    setupMatrix();
    setupHelp();
    for (const tab of Object.keys(PANELS)) renderPreview(tab);
  }

  init();
})();
