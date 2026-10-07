// Polybius CipherLab の計算部（DOM を使わない）。globalThis.PolybiusCore に置く
// - 方陣の生成は純粋関数。呼び出し側の状態を書き換えない（タブごとに別の方陣を持てる）
// - 暗号化はトークン列（pair / sep / symbol）を返し、文字列の組み立ては formatCipher が行う
//   → 記号や1桁の数字が混じっても、ペアの境界が消えない
// - 復号は読み取れなかったものを捨てずに返す（範囲外のペア・余りの桁・数字でない文字）
(() => {
  'use strict';

  const MAX_INPUT = 10000;

  // 盤面の種類。alphabet は方陣に並べる文字、merge は「入力の文字 → 方陣の文字」の読み替え
  const MODES = {
    '5x5': { size: 5, alphabet: 'ABCDEFGHIKLMNOPQRSTUVWXYZ', merge: { J: 'I' } },
    '6x6': { size: 6, alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', merge: {} },
  };
  const DEFAULT_MODE = '5x5';

  const modeOf = (mode) => MODES[mode] || MODES[DEFAULT_MODE];

  // 制御文字のうち、タブ（09）・改行（0A）だけを残す。復帰（0D）は改行にそろえてから落とす
  const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

  // 入力の正規化。消したもの・切った長さを呼び出し側へ返す
  function normalizeInput(raw) {
    if (typeof raw !== 'string') return { text: '', truncated: 0, controls: 0 };
    const unified = raw.replace(/\r\n?/g, '\n');
    const stripped = unified.replace(CONTROL_RE, '');
    const controls = [...unified].length - [...stripped].length;
    const chars = [...stripped];
    const text = chars.length > MAX_INPUT ? chars.slice(0, MAX_INPUT).join('') : stripped;
    return { text, truncated: Math.max(0, chars.length - MAX_INPUT), controls };
  }

  // キーワードの整形。使えない文字と、読み替えた文字と、重複をそれぞれ記録する
  function prepareKeyword(raw, mode) {
    const spec = modeOf(mode);
    const chars = [];
    const dropped = [];
    const merged = [];
    const seen = new Set();
    for (const ch of String(raw ?? '')) {
      const up = ch.toUpperCase();
      const mapped = spec.merge[up] || up;
      if (!spec.alphabet.includes(mapped)) {
        if (ch.trim() !== '') dropped.push(ch);
        continue;
      }
      if (mapped !== up) merged.push({ from: up, to: mapped });
      if (seen.has(mapped)) continue;
      seen.add(mapped);
      chars.push(mapped);
    }
    return { chars, dropped, merged };
  }

  // 方陣を作る。state を持たず、必要なものをすべて戻り値に入れる
  function buildSquare(options) {
    const opts = options || {};
    const mode = MODES[opts.mode] ? opts.mode : DEFAULT_MODE;
    const spec = modeOf(mode);
    const size = spec.size;
    const keyword = prepareKeyword(opts.keyword, mode);

    const ordered = keyword.chars.slice();
    const used = new Set(ordered);
    for (const ch of spec.alphabet) {
      if (!used.has(ch)) {
        used.add(ch);
        ordered.push(ch);
      }
    }

    const rows = [];
    for (let r = 0; r < size; r++) rows.push(ordered.slice(r * size, (r + 1) * size));

    const charToPair = {};
    const pairToChar = {};
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const pair = `${r + 1}${c + 1}`;
        charToPair[rows[r][c]] = pair;
        pairToChar[pair] = rows[r][c];
      }
    }
    // 読み替える文字（5×5 の J）も引けるようにする。逆引きには入れない
    for (const [from, to] of Object.entries(spec.merge)) {
      if (charToPair[to]) charToPair[from] = charToPair[to];
    }

    return {
      mode,
      size,
      rows,
      charToPair,
      pairToChar,
      merge: spec.merge,
      keyword: { text: String(opts.keyword ?? ''), chars: keyword.chars, dropped: keyword.dropped, merged: keyword.merged },
      keywordChars: new Set(keyword.chars),
    };
  }

  const isSpace = (ch) => ch === ' ' || ch === '\n' || ch === '\t';
  // 暗号文にそのまま置ける記号＝印字できるASCII（空白と英数字を除く）
  const isPlainSymbol = (ch) => {
    const code = ch.codePointAt(0);
    return code > 0x20 && code < 0x7f;
  };
  const spaceLabel = (ch) => (ch === ' ' ? '␠' : ch === '\n' ? '⏎' : '⇥');

  // 暗号化。トークン列・対応表・件数を返す（文字列にするのは formatCipher）
  function encrypt(square, text, options) {
    const opts = options || {};
    const preserveSpaces = opts.preserveSpaces !== false;
    const preserveSymbols = opts.preserveSymbols === true;
    const tokens = [];
    const mapping = [];
    const stats = { pairs: 0, separators: 0, symbols: 0, droppedSymbols: 0, droppedNonAscii: 0, merged: [], droppedSpaces: 0 };

    for (const ch of String(text ?? '')) {
      const up = ch.toUpperCase();
      const mapped = square.merge[up] || up;
      const pair = square.charToPair[mapped];
      if (pair && /[A-Z0-9]/.test(mapped)) {
        if (mapped !== up && !stats.merged.includes(up)) stats.merged.push(up);
        tokens.push({ type: 'pair', value: pair });
        mapping.push({ left: ch, right: pair, kind: 'pair' });
        stats.pairs++;
        continue;
      }
      if (isSpace(ch)) {
        if (preserveSpaces) {
          // 区切りが続いたらひとつにまとめる
          if (tokens.length && tokens[tokens.length - 1].type === 'sep') continue;
          tokens.push({ type: 'sep', value: '/' });
          mapping.push({ left: spaceLabel(ch), right: '/', kind: 'sep' });
          stats.separators++;
        } else {
          stats.droppedSpaces++;
        }
        continue;
      }
      if (preserveSymbols && isPlainSymbol(ch)) {
        tokens.push({ type: 'symbol', value: ch });
        mapping.push({ left: ch, right: ch, kind: 'symbol' });
        stats.symbols++;
        continue;
      }
      // 方陣にない文字。非ASCII は「そのまま出力」を選んでいても暗号文へ出さない
      mapping.push({ left: ch, right: '—', kind: 'dropped' });
      if (isPlainSymbol(ch)) stats.droppedSymbols++;
      else stats.droppedNonAscii++;
    }

    return { tokens, mapping, stats, cipher: formatCipher(tokens, opts) };
  }

  // トークン列を文字列にする。記号の前後には必ず区切りを入れ、ペアの境界を守る
  function formatCipher(tokens, options) {
    const concat = (options || {}).concat === true;
    let out = '';
    let prev = null;
    for (const tok of tokens) {
      if (prev) {
        const needSpace = concat
          ? tok.type === 'symbol' || prev.type === 'symbol'
          : true;
        if (needSpace) out += ' ';
      }
      out += tok.value;
      prev = tok;
    }
    return out;
  }

  // 復号。読み取れなかったものは捨てずに、位置を保ったまま印をつけて返す
  function decrypt(square, raw) {
    const size = square.size;
    const mapping = [];
    const stats = { decoded: 0, outOfRange: 0, leftover: 0, symbols: 0, separators: 0 };
    const out = [];

    const pushPairs = (digits) => {
      for (let i = 0; i + 1 < digits.length; i += 2) {
        const t = digits.slice(i, i + 2);
        const r = Number(t[0]);
        const c = Number(t[1]);
        const ch = r >= 1 && r <= size && c >= 1 && c <= size ? square.pairToChar[t] : undefined;
        if (ch) {
          out.push(ch.toLowerCase());
          mapping.push({ left: t, right: ch.toLowerCase(), kind: 'pair' });
          stats.decoded++;
        } else {
          out.push(`[${t}]`);
          mapping.push({ left: t, right: '?', kind: 'out-of-range' });
          stats.outOfRange++;
        }
      }
      if (digits.length % 2 === 1) {
        const last = digits[digits.length - 1];
        out.push(last);
        mapping.push({ left: last, right: last, kind: 'leftover' });
        stats.leftover++;
      }
    };

    // 空白・改行で区切り、さらに「/」でも区切る。数字の並びは2桁ずつ読む
    for (const chunk of String(raw ?? '').split(/[\s]+/)) {
      if (chunk === '') continue;
      const parts = chunk.split('/');
      parts.forEach((part, idx) => {
        if (idx > 0) {
          out.push(' ');
          mapping.push({ left: '/', right: '␠', kind: 'sep' });
          stats.separators++;
        }
        if (part === '') return;
        let digits = '';
        for (const ch of part) {
          if (ch >= '0' && ch <= '9') {
            digits += ch;
            continue;
          }
          pushPairs(digits);
          digits = '';
          out.push(ch);
          mapping.push({ left: ch, right: ch, kind: 'symbol' });
          stats.symbols++;
        }
        pushPairs(digits);
      });
    }

    return { plain: out.join(''), mapping, stats };
  }

  globalThis.PolybiusCore = {
    MAX_INPUT,
    MODES,
    DEFAULT_MODE,
    normalizeInput,
    prepareKeyword,
    buildSquare,
    encrypt,
    formatCipher,
    decrypt,
  };
})();
