// Polybius CipherLab の計算部（DOM を使わない）。globalThis.PolybiusCore に置く
// - 方陣の生成は純粋関数。呼び出し側の状態を書き換えない（タブごとに別の方陣を持てる）
// - 25マスに収める流儀・キーワードの充填順・座標のラベル・座標の順を選べる
//   （ほかのツールが採る流儀が割れているため。既定は I/J 統合・先頭優先・1〜5・行→列）
// - 暗号化はトークン列（pair / sep / symbol）を返し、文字列の組み立ては formatCipher が行う
//   → 記号や1桁の数字が混じっても、ペアの境界が消えない
// - 復号は読み取れなかったものを捨てずに返す（範囲外のペア・余りの桁・ラベルでない文字）
(() => {
  'use strict';

  const MAX_INPUT = 10000;

  const BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DIGITS = '0123456789';

  // 25マスに収めるために、どの文字を落として、どの文字として読むか
  // to が空の流儀（q）は、その文字を暗号化できない（落とす）
  const MERGES = {
    ij: { drop: 'J', to: 'I' },
    ck: { drop: 'K', to: 'C' },
    vw: { drop: 'W', to: 'V' },
    uv: { drop: 'V', to: 'U' },
    q: { drop: 'Q', to: '' },
  };
  const DEFAULT_MERGE = 'ij';

  // キーワードのあとに残りの文字をどう並べるか（Rumkin が選べる5通りに合わせる）
  const FILLS = ['after', 'before', 'last', 'reverseKey', 'reverseAlphabet'];
  const DEFAULT_FILL = 'after';

  const ORDERS = ['rowcol', 'colrow'];
  const DEFAULT_ORDER = 'rowcol';

  const MODES = {
    '5x5': { size: 5, digits: '12345', letters: 'ADFGX' },
    '6x6': { size: 6, digits: '123456', letters: 'ADFGVX' },
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

  // そのモードと流儀で、方陣に並べる文字と、入力の読み替えを決める
  function alphabetFor(mode, merge) {
    if (mode === '6x6') return { alphabet: BASE + DIGITS, map: {} };
    const spec = MERGES[merge] || MERGES[DEFAULT_MERGE];
    const alphabet = [...BASE].filter((c) => c !== spec.drop).join('');
    const map = spec.to ? { [spec.drop]: spec.to } : {};
    return { alphabet, map };
  }

  // キーワードの整形。使えない文字と、読み替えた文字と、重複をそれぞれ記録する
  // fill が last のときは、同じ文字が2回出たら「あとに出たほう」を残す
  function prepareKeyword(raw, mode, options) {
    const opts = options || {};
    const merge = MERGES[opts.merge] ? opts.merge : DEFAULT_MERGE;
    const fill = FILLS.includes(opts.fill) ? opts.fill : DEFAULT_FILL;
    const { alphabet, map } = alphabetFor(mode, merge);
    const chars = [];
    const dropped = [];
    const merged = [];
    // 鍵を逆順にする流儀は、重複を外す前に文字列ごと裏返す（Rumkin の mammoth → HTOMA に合わせる）
    const source = fill === 'reverseKey' ? [...String(raw ?? '')].reverse().join('') : String(raw ?? '');
    for (const ch of source) {
      const up = ch.toUpperCase();
      const mapped = map[up] || up;
      if (!alphabet.includes(mapped)) {
        if (ch.trim() !== '') dropped.push(ch);
        continue;
      }
      if (mapped !== up) merged.push({ from: up, to: mapped });
      const at = chars.indexOf(mapped);
      if (at >= 0) {
        if (fill !== 'last') continue;
        chars.splice(at, 1); // あとに出たほうを残す
      }
      chars.push(mapped);
    }
    return { chars, dropped, merged };
  }

  // キーワードと残りの文字を、選んだ充填順で1列に並べる
  function orderedAlphabet(alphabet, keywordChars, fill) {
    const key = keywordChars.slice();
    const rest = [...alphabet].filter((c) => !key.includes(c));
    if (fill === 'reverseAlphabet') rest.reverse();
    return fill === 'before' ? rest.concat(key) : key.concat(rest);
  }

  // 座標のラベル。長さが足りない・重複があるものは受け取らず、既定に戻して報告する
  function normalizeLabels(raw, size, fallback) {
    const text = String(raw ?? '').toUpperCase().replace(/\s+/g, '');
    const chars = [...text];
    const ok = chars.length === size && new Set(chars).size === size;
    return { labels: ok ? chars : [...fallback], valid: ok || text === '' };
  }

  // 方陣を作る。state を持たず、必要なものをすべて戻り値に入れる
  function buildSquare(options) {
    const opts = options || {};
    const mode = MODES[opts.mode] ? opts.mode : DEFAULT_MODE;
    const spec = modeOf(mode);
    const size = spec.size;
    const merge = mode === '5x5' && MERGES[opts.merge] ? opts.merge : DEFAULT_MERGE;
    const fill = FILLS.includes(opts.fill) ? opts.fill : DEFAULT_FILL;
    const order = ORDERS.includes(opts.order) ? opts.order : DEFAULT_ORDER;
    const { alphabet, map } = alphabetFor(mode, merge);

    const keyword = prepareKeyword(opts.keyword, mode, { merge, fill });
    const ordered = orderedAlphabet(alphabet, keyword.chars, fill);

    const rows = [];
    for (let r = 0; r < size; r++) rows.push(ordered.slice(r * size, (r + 1) * size));

    const rowSpec = normalizeLabels(opts.rowLabels, size, spec.digits);
    const colSpec = normalizeLabels(opts.colLabels, size, spec.digits);
    const rowLabels = rowSpec.labels;
    const colLabels = colSpec.labels;

    const pairOf = (r, c) => (order === 'colrow' ? colLabels[c] + rowLabels[r] : rowLabels[r] + colLabels[c]);

    const charToPair = {};
    const pairToChar = {};
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const pair = pairOf(r, c);
        charToPair[rows[r][c]] = pair;
        pairToChar[pair] = rows[r][c];
      }
    }
    // 読み替える文字（5×5 の J など）も引けるようにする。逆引きには入れない
    for (const [from, to] of Object.entries(map)) {
      if (charToPair[to]) charToPair[from] = charToPair[to];
    }

    // 復号でペアの材料として読む文字。数字のラベルなら 0〜9 すべてを読み、範囲外を見つける
    const labelChars = [...new Set(rowLabels.concat(colLabels))];
    const numericLabels = labelChars.every((c) => DIGITS.includes(c));
    const pairChars = new Set(numericLabels ? [...DIGITS] : labelChars);

    return {
      mode,
      size,
      merge,
      fill,
      order,
      rows,
      rowLabels,
      colLabels,
      labelsValid: rowSpec.valid && colSpec.valid,
      numericLabels,
      pairChars,
      charToPair,
      pairToChar,
      map,
      alphabet,
      keyword: {
        text: String(opts.keyword ?? ''),
        chars: keyword.chars,
        dropped: keyword.dropped,
        merged: keyword.merged,
      },
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
    const stats = {
      pairs: 0,
      separators: 0,
      symbols: 0,
      droppedSymbols: 0,
      droppedNonAscii: 0,
      droppedLetters: [],
      merged: [],
      droppedSpaces: 0,
    };

    for (const ch of String(text ?? '')) {
      const up = ch.toUpperCase();
      const mapped = square.map[up] || up;
      const pair = square.charToPair[mapped];
      if (pair) {
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
      // 方陣に入っていない英字（Q を外す流儀など）は、記号ではなく「使えない文字」として数える
      if (/[A-Z]/.test(up) && !stats.droppedLetters.includes(up)) stats.droppedLetters.push(up);
      // 方陣にない英字は、そのまま出すとペアと見分けがつかないので暗号文に出さない
      if (preserveSymbols && isPlainSymbol(ch) && !/[A-Z]/.test(up)) {
        tokens.push({ type: 'symbol', value: ch });
        mapping.push({ left: ch, right: ch, kind: 'symbol' });
        stats.symbols++;
        continue;
      }
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
        const needSpace = concat ? tok.type === 'symbol' || prev.type === 'symbol' : true;
        if (needSpace) out += ' ';
      }
      out += tok.value;
      prev = tok;
    }
    return out;
  }

  // 復号。読み取れなかったものは捨てずに、位置を保ったまま印をつけて返す
  // 5×5で読み替えのある流儀では、戻した文字が2通りに読めることを ambiguous で知らせる
  function decrypt(square, raw) {
    const mapping = [];
    const stats = { decoded: 0, outOfRange: 0, leftover: 0, symbols: 0, separators: 0, ambiguous: 0 };
    const out = [];
    const mergedFrom = {};
    for (const [from, to] of Object.entries(square.map)) {
      if (!mergedFrom[to]) mergedFrom[to] = [];
      mergedFrom[to].push(from);
    }

    const pushPairs = (buf) => {
      for (let i = 0; i + 1 < buf.length; i += 2) {
        const t = buf.slice(i, i + 2);
        const ch = square.pairToChar[t];
        if (ch) {
          out.push(ch.toLowerCase());
          const alt = mergedFrom[ch];
          mapping.push({ left: t, right: ch.toLowerCase(), kind: 'pair', alt: alt ? alt.join('').toLowerCase() : '' });
          stats.decoded++;
          if (alt) stats.ambiguous++;
        } else {
          out.push(`[${t}]`);
          mapping.push({ left: t, right: '?', kind: 'out-of-range' });
          stats.outOfRange++;
        }
      }
      if (buf.length % 2 === 1) {
        const last = buf[buf.length - 1];
        out.push(last);
        mapping.push({ left: last, right: last, kind: 'leftover' });
        stats.leftover++;
      }
    };

    // 空白・改行で区切り、さらに「/」でも区切る。ラベルに使う文字の並びを2つずつ読む
    for (const chunk of String(raw ?? '').split(/\s+/)) {
      if (chunk === '') continue;
      const parts = chunk.split('/');
      parts.forEach((part, idx) => {
        if (idx > 0) {
          out.push(' ');
          mapping.push({ left: '/', right: '␠', kind: 'sep' });
          stats.separators++;
        }
        if (part === '') return;
        let buf = '';
        for (const ch of part) {
          const up = ch.toUpperCase();
          if (square.pairChars.has(up)) {
            buf += up;
            continue;
          }
          pushPairs(buf);
          buf = '';
          out.push(ch);
          mapping.push({ left: ch, right: ch, kind: 'symbol' });
          stats.symbols++;
        }
        pushPairs(buf);
      });
    }

    return { plain: out.join(''), mapping, stats };
  }

  // 25マスに収める流儀をくらべる。同じ平文を5通りで暗号化し、既定との違いを数える
  function compareMerges(options) {
    const opts = options || {};
    const base = MERGES[opts.merge] ? opts.merge : DEFAULT_MERGE;
    const text = String(opts.text ?? '');
    const results = Object.keys(MERGES).map((merge) => {
      const square = buildSquare({ ...opts, mode: '5x5', merge });
      const enc = encrypt(square, text, opts);
      return {
        merge,
        square,
        cipher: enc.cipher,
        pairs: enc.tokens.filter((t) => t.type === 'pair').map((t) => t.value),
        dropped: enc.stats.droppedLetters.slice(),
      };
    });
    const ref = results.find((r) => r.merge === base);
    for (const r of results) {
      const same = ref && r.pairs.length === ref.pairs.length;
      r.sameLength = Boolean(same);
      r.diff = same ? r.pairs.filter((p, i) => p !== ref.pairs[i]).length : r.pairs.length;
      r.isBase = r.merge === base;
    }
    return results;
  }

  // キーワードのあとの並べ方をくらべる。5通りの方陣を返す
  function compareFills(options) {
    const opts = options || {};
    return FILLS.map((fill) => {
      const square = buildSquare({ ...opts, fill });
      return { fill, square, seq: square.rows.flat().join('') };
    });
  }

  globalThis.PolybiusCore = {
    MAX_INPUT,
    MODES,
    MERGES,
    FILLS,
    ORDERS,
    DEFAULT_MODE,
    DEFAULT_MERGE,
    DEFAULT_FILL,
    DEFAULT_ORDER,
    normalizeInput,
    prepareKeyword,
    alphabetFor,
    orderedAlphabet,
    buildSquare,
    compareMerges,
    compareFills,
    encrypt,
    formatCipher,
    decrypt,
  };
})();
