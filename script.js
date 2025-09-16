// ============ Polybius CipherLab ============

// State
const state = {
  mode: '5x5', // '5x5' or '6x6'
  keyword: '',
  matrix: [],       // 2D array of chars (with header row/col handled separately)
  mapCharToPair: {},// { 'A': '11', ... }
  mapPairToChar: {},// { '11': 'A', ... }
};

// Utilities
const upper = s => String(s ?? '').toUpperCase();
const onlyAZ09 = s => upper(s).replace(/[^A-Z0-9]/g, '');
const onlyAZ = s => upper(s).replace(/[^A-Z]/g, '');
const uniqOrder = arr => Array.from(new Map(arr.map(x => [x, true])).keys());

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  // Remove any potentially dangerous characters, keep only printable ASCII + common Unicode
  return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '').substring(0, 10000); // Limit length
}

function showToast(msg='コピーしました') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); el.hidden = true; }, 1200);
}

function copyText(id, statusId){
  const el = document.getElementById(id);
  if(!el) return;

  // Use modern clipboard API if available, fallback to execCommand
  if(navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(el.value).then(() => {
      showToast();
      const st = document.getElementById(statusId);
      if(st){ st.textContent = '→ コピーしました'; setTimeout(()=> st.textContent='', 1500); }
    }).catch(() => {
      // Fallback to execCommand
      el.select();
      document.execCommand('copy');
      showToast();
      const st = document.getElementById(statusId);
      if(st){ st.textContent = '→ コピーしました'; setTimeout(()=> st.textContent='', 1500); }
    });
  } else {
    // Fallback for older browsers
    el.select();
    document.execCommand('copy');
    showToast();
    const st = document.getElementById(statusId);
    if(st){ st.textContent = '→ コピーしました'; setTimeout(()=> st.textContent='', 1500); }
  }
}

// Matrix generation
function generateMatrix(mode, keywordRaw){
  const keyword = upper(keywordRaw || '');
  let size = mode === '6x6' ? 6 : 5;

  let alphabet = [];
  if(mode === '6x6'){
    // A-Z + 0-9
    alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
  } else {
    // 5x5 with I/J merge: treat J as I
    alphabet = [...'ABCDEFGHIKLMNOPQRSTUVWXYZ']; // Note: J omitted
  }

  let kw = mode === '6x6' ? onlyAZ09(keyword) : onlyAZ(keyword).replaceAll('J','I');
  // remove duplicates in keyword, preserving order; then fill with remaining symbols
  const used = new Set();
  const ordered = [];
  for(const ch of kw){
    const X = mode==='5x5' ? (ch==='J'?'I':ch) : ch;
    if(!used.has(X) && alphabet.includes(X)){
      used.add(X); ordered.push(X);
    }
  }
  for(const ch of alphabet){
    if(!used.has(ch)){ ordered.push(ch); used.add(ch); }
  }

  // Build matrix (no headers in the array; headers will be rendered around)
  const matrix = [];
  for(let r=0;r<size;r++){
    matrix.push(ordered.slice(r*size,(r+1)*size));
  }

  // Build maps
  const mapCharToPair = {};
  const mapPairToChar = {};
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      const ch = matrix[r][c];
      const pair = `${r+1}${c+1}`;
      mapCharToPair[ch] = pair;
      mapPairToChar[pair] = ch;
    }
  }
  // 5x5: map J to I
  if(mode==='5x5'){
    mapCharToPair['J'] = mapCharToPair['I'];
  }

  state.mode = mode;
  state.keyword = keywordRaw || '';
  state.matrix = matrix;
  state.mapCharToPair = mapCharToPair;
  state.mapPairToChar = mapPairToChar;
}

// Rendering matrix
function renderMatrix(containerId='matrix-container'){
  const container = document.getElementById(containerId);
  if(!container) return; // Skip if container doesn't exist

  const size = state.mode==='6x6' ? 6 : 5;

  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'matrix-wrapper';

  const grid = document.createElement('div');
  grid.className = 'matrix';
  grid.style.gridTemplateColumns = `repeat(${size+1}, 1fr)`;

  // Get keyword characters for highlighting
  const keywordChars = getKeywordChars();

  // Header row (top-left blank)
  const corner = document.createElement('div');
  corner.className = 'cell coord';
  corner.textContent = '↘';
  grid.appendChild(corner);

  // Col headers
  for(let c=1;c<=size;c++){
    const h = document.createElement('div');
    h.className='cell coord';
    h.textContent = c;
    grid.appendChild(h);
  }

  // Rows
  for(let r=0;r<size;r++){
    // Row header
    const h = document.createElement('div');
    h.className='cell coord';
    h.textContent = r+1;
    grid.appendChild(h);

    for(let c=0;c<size;c++){
      const cell = document.createElement('button');
      cell.type='button';
      cell.className='cell';
      const charUpper = state.matrix[r][c];
      cell.textContent = charUpper.toLowerCase();

      // Add keyword highlighting
      if(keywordChars.has(charUpper)){
        cell.classList.add('keyword-char');
      }

      cell.dataset.row = (r+1);
      cell.dataset.col = (c+1);
      cell.addEventListener('click', ()=>{
        // highlight all cells in same row/col briefly
        [...grid.querySelectorAll('.cell')].forEach(x=>x.classList.remove('highlight'));
        [...grid.querySelectorAll(`.cell[data-row="${r+1}"], .cell[data-col="${c+1}"]`)]
          .forEach(x=>x.classList.add('highlight'));
        setTimeout(()=>{
          [...grid.querySelectorAll('.cell')].forEach(x=>x.classList.remove('highlight'));
        }, 600);
      });
      grid.appendChild(cell);
    }
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);
}

// Get unique keyword characters for highlighting
function getKeywordChars(){
  const keyword = state.keyword || '';
  const chars = new Set();

  for(const ch of keyword.toUpperCase()){
    if(state.mode === '6x6' && /[A-Z0-9]/.test(ch)){
      chars.add(ch);
    } else if(state.mode === '5x5' && /[A-Z]/.test(ch)){
      const normalizedChar = ch === 'J' ? 'I' : ch;
      chars.add(normalizedChar);
    }
  }

  return chars;
}

// Encryption
function encrypt(input, preserveSpaces=true, concatenate=false, preserveSymbols=false){
  const outTokens = [];
  const mappingItems = [];

  const s = input || '';  // Don't uppercase yet to preserve original symbols
  for(let i = 0; i < s.length; i++){
    const ch = s[i];
    const upperCh = ch.toUpperCase();

    if(/[A-Z]/.test(upperCh)){
      // Alphabetic character
      const keyCh = (state.mode==='5x5' && upperCh==='J') ? 'I' : upperCh;
      const pair = state.mapCharToPair[keyCh];
      if(pair){
        outTokens.push(pair);
        mappingItems.push({left: ch, right: pair});
      }
    }else if(state.mode==='6x6' && /[0-9]/.test(ch)){
      // Numeric character in 6x6 mode
      const pair = state.mapCharToPair[ch];
      if(pair){
        outTokens.push(pair);
        mappingItems.push({left: ch, right: pair});
      }
    }else if(ch===' ' || ch==='\n' || ch==='\t'){
      // Whitespace
      if(preserveSpaces){
        outTokens.push('/'); // word separator
        mappingItems.push({left: ch===' ' ? '␠' : ch==='\n' ? '⏎' : '⇥', right: '/'});
      }
    }else{
      // Other characters (punctuation, symbols, etc.)
      if(preserveSymbols){
        outTokens.push(ch);  // Keep the symbol as-is
        mappingItems.push({left: ch, right: ch});
      }else{
        mappingItems.push({left: ch, right: '—'});  // Mark as removed
      }
    }
  }

  // collapse multiple separators
  const collapsed = [];
  for(const tok of outTokens){
    if(tok==='/' && collapsed[collapsed.length-1]==='/') continue;
    collapsed.push(tok);
  }

  // Apply concatenation if requested (but keep symbols separate)
  let result = '';
  for(let i = 0; i < collapsed.length; i++){
    const tok = collapsed[i];
    if(i > 0 && !concatenate && /^\d{2}$/.test(tok) && /^\d{2}$/.test(collapsed[i-1])){
      result += ' ';
    }
    result += tok;
  }

  return { cipher: result, mapping: mappingItems };
}

// Decryption
function normalizePairs(raw, size){
  // accept: "23 15 31", "231531", with separators like '/', newlines
  const digits = raw.replace(/[^0-9/]+/g,'').replace(/\n/g,'/');
  const tokens = [];
  let buf = '';

  for(const ch of digits){
    if(ch==='/'){
      tokens.push('/'); // word boundary
      buf = '';
      continue;
    }
    buf += ch;
    if(buf.length===2){
      tokens.push(buf);
      buf='';
    }
  }
  // ignore leftover single digit if any
  return tokens.filter(Boolean);
}

function decrypt(raw){
  const size = state.mode==='6x6' ? 6 : 5;
  const tokens = normalizePairs((raw||''), size);
  const sb = [];
  const mappingItems = [];

  for(const t of tokens){
    if(t==='/'){
      sb.push(' ');
      mappingItems.push({left:'/', right:'␠'});
      continue;
    }
    // validate pair range
    const r = Number(t[0]), c = Number(t[1]);
    if(!(r>=1 && r<=size && c>=1 && c<=size)){
      mappingItems.push({left:t, right:'?'});
      continue;
    }
    const ch = state.mapPairToChar[t];
    if(ch){
      sb.push(ch);
      mappingItems.push({left:t, right:ch});
    }else{
      mappingItems.push({left:t, right:'?'});
    }
  }

  // In 5x5 we cannot distinguish I/J. Leave as generated character (I or from matrix)
  return { plain: sb.join('').toLowerCase(), mapping: mappingItems };
}

// Animate mapping list
async function renderMapping(listId, items){
  const list = document.getElementById(listId);
  list.innerHTML = '';
  for(const it of items){
    const li = document.createElement('li');
    li.innerHTML = `<span class="left">${it.left}</span> → <span class="pair">${it.right}</span>`;
    list.appendChild(li);
  }
  // simple sequential highlight
  const children = [...list.children];
  for(const li of children){
    li.classList.add('anim');
    await new Promise(r=>setTimeout(r, 36));
    li.classList.remove('anim');
  }
}

// Tabs
function setupTabs(){
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    encrypt: document.getElementById('tab-encrypt'),
    decrypt: document.getElementById('tab-decrypt'),
    matrix:  document.getElementById('tab-matrix'),
    history: document.getElementById('tab-history'),
  };

  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
      Object.values(panels).forEach(p=>p.classList.remove('active'));
      panels[btn.dataset.tab].classList.add('active');
    });
  });
}

// Render matrices in multiple containers
function renderAllMatrices(){
  renderMatrix('matrix-container');
  renderMatrix('matrix-container-enc');
  renderMatrix('matrix-container-dec');
}

// Events
function setupEncrypt(){
  // Update matrix when mode or keyword changes
  document.getElementById('mode-enc').addEventListener('change', ()=>{
    const mode = document.getElementById('mode-enc').value;
    const kw = document.getElementById('keyword-enc').value;
    generateMatrix(mode, kw);
    renderAllMatrices();
  });

  document.getElementById('keyword-enc').addEventListener('input', ()=>{
    const mode = document.getElementById('mode-enc').value;
    const kw = sanitizeInput(document.getElementById('keyword-enc').value);
    generateMatrix(mode, kw);
    renderAllMatrices();
  });

  document.getElementById('btn-enc').addEventListener('click', ()=>{
    const input = sanitizeInput(document.getElementById('enc-input').value);
    const mode = document.getElementById('mode-enc').value;
    const kw = sanitizeInput(document.getElementById('keyword-enc').value);
    const keepSpaces = document.getElementById('preserve-spaces-enc').checked;
    const concatenate = document.getElementById('concat-pairs-enc').checked;
    const preserveSymbols = document.getElementById('preserve-symbols-enc').checked;

    generateMatrix(mode, kw);
    const { cipher, mapping } = encrypt(input, keepSpaces, concatenate, preserveSymbols);
    document.getElementById('enc-output').value = cipher || '';
    renderMapping('enc-map', mapping);
    renderAllMatrices();
  });

  document.getElementById('btn-enc-copy').addEventListener('click', ()=> copyText('enc-output','enc-status'));
  document.getElementById('btn-enc-clear').addEventListener('click', ()=>{
    document.getElementById('enc-input').value='';
    document.getElementById('enc-output').value='';
    document.getElementById('enc-map').innerHTML='';
    document.getElementById('enc-status').textContent='';
  });
}

function setupDecrypt(){
  // Update matrix when mode or keyword changes
  document.getElementById('mode-dec').addEventListener('change', ()=>{
    const mode = document.getElementById('mode-dec').value;
    const kw = document.getElementById('keyword-dec').value;
    generateMatrix(mode, kw);
    renderAllMatrices();
  });

  document.getElementById('keyword-dec').addEventListener('input', ()=>{
    const mode = document.getElementById('mode-dec').value;
    const kw = sanitizeInput(document.getElementById('keyword-dec').value);
    generateMatrix(mode, kw);
    renderAllMatrices();
  });

  // Sync button to copy cipher from encrypt tab
  document.getElementById('btn-sync-cipher').addEventListener('click', ()=>{
    const encOutput = document.getElementById('enc-output').value;
    const encMode = document.getElementById('mode-enc').value;
    const encKeyword = document.getElementById('keyword-enc').value;

    // Copy the cipher text
    document.getElementById('dec-input').value = encOutput;

    // Also sync the mode and keyword settings
    document.getElementById('mode-dec').value = encMode;
    document.getElementById('keyword-dec').value = encKeyword;

    // Update the matrix display
    generateMatrix(encMode, encKeyword);
    renderAllMatrices();

    // Show feedback
    showToast('暗号文と設定を同期しました');
  });

  document.getElementById('btn-dec').addEventListener('click', ()=>{
    const input = sanitizeInput(document.getElementById('dec-input').value);
    const mode = document.getElementById('mode-dec').value;
    const kw = sanitizeInput(document.getElementById('keyword-dec').value);

    generateMatrix(mode, kw);
    const { plain, mapping } = decrypt(input);
    document.getElementById('dec-output').value = plain || '';
    renderMapping('dec-map', mapping);
    renderAllMatrices();
  });

  document.getElementById('btn-dec-copy').addEventListener('click', ()=> copyText('dec-output','dec-status'));
  document.getElementById('btn-dec-clear').addEventListener('click', ()=>{
    document.getElementById('dec-input').value='';
    document.getElementById('dec-output').value='';
    document.getElementById('dec-map').innerHTML='';
    document.getElementById('dec-status').textContent='';
  });
}

function setupMatrix(){
  const modeSel = document.getElementById('mode-matrix');
  const kwInput = document.getElementById('keyword-matrix');

  const regen = ()=>{
    generateMatrix(modeSel.value, kwInput.value);
    renderAllMatrices();
  };

  // Real-time update when mode changes
  modeSel.addEventListener('change', regen);

  // Real-time update when keyword changes
  kwInput.addEventListener('input', ()=>{
    const kw = sanitizeInput(kwInput.value);
    kwInput.value = kw; // Update the field with sanitized value
    regen();
  });
}

// Theme management
function initTheme(){
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

function applyTheme(theme){
  const body = document.body;
  const themeIcon = document.querySelector('.theme-icon');

  if(theme === 'light'){
    body.setAttribute('data-theme', 'light');
    themeIcon.textContent = '🌙';
  } else {
    body.removeAttribute('data-theme');
    themeIcon.textContent = '☀️';
  }

  localStorage.setItem('theme', theme);
}

function toggleTheme(){
  const currentTheme = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

// Init
(function init(){
  initTheme();
  setupTabs();
  // default matrix 5x5 without keyword
  generateMatrix('5x5','');
  renderAllMatrices();

  setupEncrypt();
  setupDecrypt();
  setupMatrix();

  // Sync selects on tab changes: keep last-used mode/keyword in Matrix tab
  const syncEnc = ()=>{
    document.getElementById('mode-matrix').value = document.getElementById('mode-enc').value;
    document.getElementById('keyword-matrix').value = document.getElementById('keyword-enc').value;
  };
  const syncDec = ()=>{
    document.getElementById('mode-matrix').value = document.getElementById('mode-dec').value;
    document.getElementById('keyword-matrix').value = document.getElementById('keyword-dec').value;
  };
  document.querySelector('[data-tab="matrix"]').addEventListener('click', ()=>{
    // prefer enc settings if available, else dec
    const encKW = document.getElementById('keyword-enc').value;
    const encMode = document.getElementById('mode-enc').value;
    if(encKW!=='' || encMode!==state.mode){ syncEnc(); generateMatrix(encMode, encKW); renderAllMatrices(); }
  });
  document.querySelector('[data-tab="encrypt"]').addEventListener('click', ()=>{/* no-op */});
  document.querySelector('[data-tab="decrypt"]').addEventListener('click', ()=>{/* no-op */});
})();
