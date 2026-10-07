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

  // 「詳しい設定」。ツールによって流儀が割れるので、合わせられるようにする
  const PRESETS = {
    default: { merge: 'ij', fill: 'after', order: 'rowcol', labels: 'digits' },
    cryptocorner: { merge: 'ij', fill: 'after', order: 'colrow', labels: 'digits' },
    adfgx: { merge: 'ij', fill: 'after', order: 'rowcol', labels: 'letters' },
    tapcode: { merge: 'ck', fill: 'after', order: 'rowcol', labels: 'digits' },
  };

  const ADV_FIELDS = [
    { key: 'preset', values: ['default', 'cryptocorner', 'adfgx', 'tapcode', 'custom'] },
    { key: 'merge', values: ['ij', 'ck', 'vw', 'uv', 'q'] },
    { key: 'fill', values: ['after', 'last', 'reverseKey', 'reverseAlphabet', 'before'] },
    { key: 'order', values: ['rowcol', 'colrow'] },
    { key: 'labels', values: ['digits', 'letters', 'custom'] },
  ];

  // Utilities
  function advancedOf(tab) {
    const get = (key) => {
      const el = $(`${key}-${tab}`);
      return el ? el.value : undefined;
    };
    const mode = $(PANELS[tab].mode).value;
    const spec = Core.MODES[mode] || Core.MODES[Core.DEFAULT_MODE];
    const labels = get('labels');
    let rowLabels = '';
    let colLabels = '';
    if (labels === 'letters') {
      rowLabels = spec.letters;
      colLabels = spec.letters;
    } else if (labels === 'custom') {
      rowLabels = ($(`rowLabels-${tab}`) || {}).value || '';
      colLabels = ($(`colLabels-${tab}`) || {}).value || '';
    }
    return { merge: get('merge'), fill: get('fill'), order: get('order'), rowLabels, colLabels };
  }

  function squareOf(tab) {
    const p = PANELS[tab];
    return Core.buildSquare({
      mode: $(p.mode).value,
      keyword: $(p.keyword).value,
      ...advancedOf(tab),
    });
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

  // Rendering matrix（id でも要素でも受け取る。くらべるタブは小さな方陣を並べる）
  function renderMatrix(target, square) {
    const container = typeof target === 'string' ? $(target) : target;
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
      right.textContent = it.alt ? `${it.right}（${it.alt}）` : it.right;
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
      setStatus('enc-status', keywordNotes(square).concat(labelNotes('encrypt', square)));
    };
    const slot = document.querySelector('.advanced-slot[data-advanced="encrypt"]');
    if (slot) buildAdvanced(slot, update);
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
      const parts = keywordNotes(square).concat(labelNotes('encrypt', square));
      if (!norm.text) parts.push(t('status.empty'));
      else if (s.pairs) parts.push(t('status.encrypted', { pairs: s.pairs }));
      else parts.push(t('status.nothing'));
      if (norm.truncated) parts.push(t('status.truncated', { count: norm.truncated, max: Core.MAX_INPUT }));
      if (s.merged.length) {
        parts.push(t('status.merged', {
          chars: s.merged.map((c) => c.toLowerCase()).join(' '),
          to: (square.map[s.merged[0]] || '').toLowerCase(),
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
      setStatus('dec-status', keywordNotes(square).concat(labelNotes('decrypt', square)));
    };
    const slot = document.querySelector('.advanced-slot[data-advanced="decrypt"]');
    if (slot) buildAdvanced(slot, update);
    $('mode-dec').addEventListener('change', update);
    $('keyword-dec').addEventListener('input', update);

    // 暗号化タブの結果と設定を取り込む
    $('btn-sync-cipher').addEventListener('click', () => {
      $('dec-input').value = $('enc-output').value;
      $('mode-dec').value = $('mode-enc').value;
      $('keyword-dec').value = $('keyword-enc').value;
      for (const key of ['preset', 'merge', 'fill', 'order', 'labels', 'rowLabels', 'colLabels']) {
        const from = $(`${key}-encrypt`);
        const to = $(`${key}-decrypt`);
        if (from && to) to.value = from.value;
      }
      $('mode-dec').dispatchEvent(new Event('change'));
      update();
      showToast(t('toast.synced'));
    });

    $('btn-dec').addEventListener('click', () => {
      const square = renderPreview('decrypt');
      const norm = Core.normalizeInput($('dec-input').value);
      const result = Core.decrypt(square, norm.text);
      $('dec-output').value = result.plain;

      const s = result.stats;
      const parts = keywordNotes(square).concat(labelNotes('decrypt', square));
      if (!norm.text) parts.push(t('status.empty'));
      else if (s.decoded) parts.push(t('status.decoded', { count: s.decoded }));
      else parts.push(t('status.nothingDecoded'));
      if (norm.truncated) parts.push(t('status.truncated', { count: norm.truncated, max: Core.MAX_INPUT }));
      if (s.outOfRange) parts.push(t('status.outOfRange', { count: s.outOfRange }));
      if (s.leftover) parts.push(t('status.leftover', { count: s.leftover }));
      if (s.symbols) parts.push(t('status.symbols', { count: s.symbols }));
      // 読み替えのある流儀で、両方に読める文字が出たときだけ添える
      if (s.ambiguous) {
        const from = Object.keys(square.map)[0] || '';
        parts.push(t('status.ambiguous', {
          count: s.ambiguous,
          from: (square.map[from] || '').toLowerCase(),
          to: from.toLowerCase(),
        }));
      }
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
    const slot = document.querySelector('.advanced-slot[data-advanced="matrix"]');
    if (slot) buildAdvanced(slot, update);
    $('mode-matrix').addEventListener('change', update);
    $('keyword-matrix').addEventListener('input', update);
  }

  // 「詳しい設定」を組み立てる。3つのタブで同じ作りなので、スロットから生成する
  function buildAdvanced(slot, onChange) {
    const tab = slot.dataset.advanced;
    const details = document.createElement('details');
    details.className = 'advanced';

    const summary = document.createElement('summary');
    summary.textContent = t('adv.summary');
    details.appendChild(summary);

    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = t('adv.note');
    details.appendChild(note);

    const grid = document.createElement('div');
    grid.className = 'adv-grid';

    for (const f of ADV_FIELDS) {
      const field = document.createElement('div');
      field.className = 'field';
      const label = document.createElement('label');
      label.className = 'label';
      label.htmlFor = `${f.key}-${tab}`;
      label.textContent = t(`adv.${f.key}`);
      const sel = document.createElement('select');
      sel.id = `${f.key}-${tab}`;
      for (const v of f.values) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = t(`adv.${f.key}.${v}`);
        sel.appendChild(opt);
      }
      field.append(label, sel);
      grid.appendChild(field);
    }

    // ラベルを自分で決めるときだけ出す入力欄
    for (const key of ['rowLabels', 'colLabels']) {
      const field = document.createElement('div');
      field.className = 'field label-input';
      field.hidden = true;
      const label = document.createElement('label');
      label.className = 'label';
      label.htmlFor = `${key}-${tab}`;
      label.textContent = t(`adv.${key}`);
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `${key}-${tab}`;
      input.autocapitalize = 'characters';
      input.spellcheck = false;
      field.append(label, input);
      grid.appendChild(field);
    }

    details.appendChild(grid);
    slot.replaceChildren(details);

    const syncVisibility = () => {
      const mode = $(PANELS[tab].mode).value;
      const mergeSel = $(`merge-${tab}`);
      mergeSel.disabled = mode !== '5x5'; // 6×6は36マスなので読み替えが要らない
      const custom = $(`labels-${tab}`).value === 'custom';
      details.querySelectorAll('.label-input').forEach((el) => {
        el.hidden = !custom;
      });
    };

    // プリセットを選んだら個別の設定をそろえる。個別を触ったら、一致するプリセットを選び直す
    $(`preset-${tab}`).addEventListener('change', () => {
      const preset = PRESETS[$(`preset-${tab}`).value];
      if (preset) {
        for (const [key, value] of Object.entries(preset)) {
          const el = $(`${key}-${tab}`);
          if (el) el.value = value;
        }
      }
      syncVisibility();
      onChange();
    });

    const matchPreset = () => {
      const now = {
        merge: $(`merge-${tab}`).value,
        fill: $(`fill-${tab}`).value,
        order: $(`order-${tab}`).value,
        labels: $(`labels-${tab}`).value,
      };
      const hit = Object.entries(PRESETS).find(([, v]) => Object.entries(v).every(([k, x]) => now[k] === x));
      $(`preset-${tab}`).value = hit ? hit[0] : 'custom';
    };

    for (const key of ['merge', 'fill', 'order', 'labels']) {
      $(`${key}-${tab}`).addEventListener('change', () => {
        matchPreset();
        syncVisibility();
        onChange();
      });
    }
    for (const key of ['rowLabels', 'colLabels']) {
      $(`${key}-${tab}`).addEventListener('input', onChange);
    }
    $(PANELS[tab].mode).addEventListener('change', syncVisibility);
    syncVisibility();
  }

  // ラベルの指定が通らなかったときの注意書き
  function labelNotes(tab, square) {
    if (square.labelsValid) return [];
    return [t('adv.labelsInvalid', {
      size: square.size,
      fallback: (Core.MODES[square.mode] || Core.MODES[Core.DEFAULT_MODE]).digits,
    })];
  }

  // くらべるタブ。同じ平文と鍵で、流儀ごとの違いを並べる
  function setupCompare() {
    const textEl = $('cmp-text');
    const kwEl = $('cmp-keyword');
    if (!textEl || !kwEl) return;

    const renderMerges = () => {
      const list = $('cmp-merge');
      list.replaceChildren();
      const results = Core.compareMerges({ mode: '5x5', keyword: kwEl.value, text: textEl.value });
      for (const r of results) {
        const item = document.createElement('div');
        item.className = r.isBase ? 'cmp-item base' : 'cmp-item';

        const head = document.createElement('div');
        head.className = 'cmp-head';
        const name = document.createElement('strong');
        name.textContent = t(`adv.merge.${r.merge}`);
        const note = document.createElement('span');
        note.className = 'cmp-note';
        if (r.isBase) note.textContent = t('cmp.base');
        else if (!r.sameLength) note.textContent = t('cmp.lengthDiff', { chars: r.dropped.join('').toLowerCase() });
        else if (r.diff === 0) note.textContent = t('cmp.same');
        else note.textContent = t('cmp.diff', { count: r.diff });
        head.append(name, note);

        const cipher = document.createElement('code');
        cipher.className = 'cmp-cipher';
        cipher.textContent = r.cipher || t('cmp.empty');

        item.append(head, cipher);
        list.appendChild(item);
      }
    };

    const renderFills = () => {
      const grid = $('cmp-fill');
      grid.replaceChildren();
      if (!kwEl.value.trim()) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = t('cmp.keywordHint');
        grid.appendChild(hint);
      }
      for (const r of Core.compareFills({ mode: '5x5', keyword: kwEl.value })) {
        const cell = document.createElement('div');
        cell.className = 'cmp-square';
        const name = document.createElement('div');
        name.className = 'cmp-name';
        name.textContent = t(`adv.fill.${r.fill}`);
        const box = document.createElement('div');
        cell.append(name, box);
        renderMatrix(box, r.square);
        grid.appendChild(cell);
      }
    };

    const update = () => {
      renderMerges();
      renderFills();
    };
    textEl.addEventListener('input', update);
    kwEl.addEventListener('input', update);
    update();
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
    setupCompare();
    setupHelp();
    for (const tab of Object.keys(PANELS)) renderPreview(tab);
  }

  init();
})();
