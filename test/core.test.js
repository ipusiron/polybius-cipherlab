import test from 'node:test';
import assert from 'node:assert/strict';
import { core, refSquare, refPairs } from './load.js';

const C = core();
const sq = (mode, keyword) => C.buildSquare({ mode, keyword });
const enc = (square, text, opts) => C.encrypt(square, text, opts);

test('5×5 の既定の方陣は J を除いた25文字を順に並べる', () => {
  const s = sq('5x5', '');
  assert.deepEqual(s.rows.map((r) => r.join('')), ['ABCDE', 'FGHIK', 'LMNOP', 'QRSTU', 'VWXYZ']);
  assert.equal(s.size, 5);
  assert.equal(s.charToPair.A, '11');
  assert.equal(s.charToPair.Z, '55');
  assert.equal(s.pairToChar['24'], 'I');
});

test('6×6 の既定の方陣は A–Z と 0–9 を並べる', () => {
  const s = sq('6x6', '');
  assert.deepEqual(s.rows.map((r) => r.join('')), ['ABCDEF', 'GHIJKL', 'MNOPQR', 'STUVWX', 'YZ0123', '456789']);
  assert.equal(s.charToPair['9'], '66');
  assert.equal(s.pairToChar['24'], 'J');
});

test('方陣は参照実装と一致する（キーワードあり・重複・J・記号）', () => {
  for (const mode of ['5x5', '6x6']) {
    for (const kw of ['', 'key', 'KEY', 'balloon', 'jazz', 'k3y!', 'zebra', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Polybius']) {
      const s = sq(mode, kw);
      assert.deepEqual(s.rows, refSquare(mode, kw), `${mode} / ${kw}`);
    }
  }
});

test('方陣の対応表は双方向で一致する', () => {
  for (const mode of ['5x5', '6x6']) {
    const s = sq(mode, 'cipher');
    for (const [ch, pair] of Object.entries(s.charToPair)) {
      if (s.map[ch]) continue; // 読み替えた文字（J）は逆引きに入らない
      assert.equal(s.pairToChar[pair], ch);
    }
    assert.equal(Object.keys(s.pairToChar).length, s.size * s.size);
  }
});

test('5×5 では J が I と同じペアになり、逆引きには J が出ない', () => {
  const s = sq('5x5', '');
  assert.equal(s.charToPair.J, s.charToPair.I);
  assert.equal(Object.values(s.pairToChar).includes('J'), false);
});

test('キーワードから落ちた文字と読み替えた文字を記録する', () => {
  const s = sq('5x5', 'k3y!');
  assert.deepEqual(s.keyword.chars, ['K', 'Y']);
  assert.deepEqual(s.keyword.dropped, ['3', '!']);
  const j = sq('5x5', 'jazz');
  assert.deepEqual(j.keyword.chars, ['I', 'A', 'Z']);
  assert.deepEqual(j.keyword.merged, [{ from: 'J', to: 'I' }]);
  const six = sq('6x6', 'k3y!');
  assert.deepEqual(six.keyword.chars, ['K', '3', 'Y']);
  assert.deepEqual(six.keyword.dropped, ['!']);
});

test('既知解答: hello → 23 15 31 31 34（README と座学タブの例）', () => {
  const s = sq('5x5', '');
  assert.equal(enc(s, 'hello').cipher, '23 15 31 31 34');
});

test('既知解答: hello world（キーワードなし・キーワード key）', () => {
  assert.equal(enc(sq('5x5', ''), 'hello world').cipher, '23 15 31 31 34 / 52 34 42 31 14');
  assert.equal(enc(sq('5x5', 'key'), 'hello world').cipher, '25 12 32 32 35 / 53 35 43 32 22');
});

test('数字ペアを連結すると区切りの空白が消える', () => {
  const s = sq('5x5', '');
  assert.equal(enc(s, 'hello world', { concat: true }).cipher, '2315313134/5234423114');
});

test('単語の区切りを維持しないと空白が消える', () => {
  const s = sq('5x5', '');
  assert.equal(enc(s, 'hello world', { preserveSpaces: false }).cipher, '23 15 31 31 34 52 34 42 31 14');
});

test('改行とタブも単語の区切りになる', () => {
  const s = sq('5x5', '');
  const r = enc(s, 'ab\ncd\tef');
  assert.equal(r.cipher, '11 12 / 13 14 / 15 21');
  assert.equal(r.stats.separators, 2);
  assert.deepEqual(r.mapping.map((m) => m.left), ['a', 'b', '⏎', 'c', 'd', '⇥', 'e', 'f']);
});

test('続いた空白はひとつの区切りにまとめる', () => {
  assert.equal(enc(sq('5x5', ''), 'a  \n b').cipher, '11 / 12');
});

test('記号をそのまま出力しても、ペアの境界が消えない', () => {
  const s = sq('5x5', '');
  assert.equal(enc(s, 'a1b', { preserveSymbols: true }).cipher, '11 1 12');
  assert.equal(enc(s, 'a1b', { preserveSymbols: true, concat: true }).cipher, '11 1 12');
  assert.equal(enc(s, 'a,b', { preserveSymbols: true }).cipher, '11 , 12');
});

test('記号をそのまま出力しない設定では記号が落ちる', () => {
  const r = enc(sq('5x5', ''), 'a1b');
  assert.equal(r.cipher, '11 12');
  assert.equal(r.stats.droppedSymbols, 1);
});

test('非ASCII は「そのまま出力」を選んでも暗号文に出さない', () => {
  const r = enc(sq('5x5', ''), 'こんにちは', { preserveSymbols: true });
  assert.equal(r.cipher, '');
  assert.equal(r.stats.droppedNonAscii, 5);
  const mixed = enc(sq('5x5', ''), 'aあb', { preserveSymbols: true });
  assert.equal(mixed.cipher, '11 12');
  assert.equal(mixed.stats.droppedNonAscii, 1);
});

test('サロゲートペアを1文字として数える', () => {
  const r = enc(sq('5x5', ''), 'a\u{1F600}b', { preserveSymbols: true });
  assert.equal(r.cipher, '11 12');
  assert.equal(r.stats.droppedNonAscii, 1);
  assert.equal(r.mapping.length, 3);
});

test('6×6 では数字がペアになる', () => {
  const s = sq('6x6', '');
  const r = enc(s, 'hi 7 there');
  assert.equal(r.cipher, '22 23 / 64 / 42 22 15 36 15');
  assert.equal(r.stats.droppedSymbols, 0);
});

test('5×5 で j を使うと i として扱ったことを記録する', () => {
  const r = enc(sq('5x5', ''), 'jazz');
  assert.equal(r.cipher, '24 11 55 55');
  assert.deepEqual(r.stats.merged, ['J']);
});

test('暗号化は参照実装のペアと一致する', () => {
  const texts = ['hello world', 'the quick brown fox jumps over the lazy dog', 'Polybius', 'JJjj', 'abcdefghijklmnopqrstuvwxyz'];
  for (const mode of ['5x5', '6x6']) {
    for (const kw of ['', 'key', 'cipher', 'zebra']) {
      const s = sq(mode, kw);
      for (const text of texts) {
        const got = enc(s, text).tokens.filter((t) => t.type === 'pair').map((t) => t.value);
        assert.deepEqual(got, refPairs(s.rows, text.replace(/[^a-zA-Z0-9]/g, ''), mode), `${mode}/${kw}/${text}`);
      }
    }
  }
});

test('往復: 英字だけの平文は元に戻る（5×5は j が i になる）', () => {
  const cases = ['hello world', 'attack at dawn', 'the quick brown fox'];
  for (const mode of ['5x5', '6x6']) {
    for (const kw of ['', 'key', 'cipher']) {
      const s = sq(mode, kw);
      for (const text of cases) {
        for (const concat of [false, true]) {
          const { cipher } = enc(s, text, { concat });
          assert.equal(C.decrypt(s, cipher).plain, text, `${mode}/${kw}/${text}/concat=${concat}`);
        }
      }
    }
  }
});

test('往復: 記号をそのまま出力した暗号文も元に戻る', () => {
  const s = sq('5x5', '');
  for (const text of ['a1b', 'a,b', 'hello, world!', 'x=1+2']) {
    const { cipher } = enc(s, text, { preserveSymbols: true });
    assert.equal(C.decrypt(s, cipher).plain, text.toLowerCase());
  }
});

test('復号: 連結された数字列も空白区切りも読める', () => {
  const s = sq('5x5', '');
  assert.equal(C.decrypt(s, '23 15 31 31 34').plain, 'hello');
  assert.equal(C.decrypt(s, '2315313134').plain, 'hello');
  assert.equal(C.decrypt(s, '23\n15').plain, 'hello'.slice(0, 2));
  assert.equal(C.decrypt(s, '23/15').plain, 'h e');
});

test('復号: 範囲外のペアは捨てずに印をつけて残す', () => {
  const s = sq('5x5', '');
  const r = C.decrypt(s, '99 11');
  assert.equal(r.plain, '[99]a');
  assert.equal(r.stats.outOfRange, 1);
  assert.equal(r.stats.decoded, 1);
  assert.equal(C.decrypt(sq('6x6', ''), '66 11').plain, '9a');
});

test('復号: 余った1桁と数字でない文字も残す', () => {
  const s = sq('5x5', '');
  const r = C.decrypt(s, '231');
  assert.equal(r.plain, 'h1');
  assert.equal(r.stats.leftover, 1);
  const t = C.decrypt(s, 'abc');
  assert.equal(t.plain, 'abc');
  assert.equal(t.stats.symbols, 3);
  assert.equal(t.stats.decoded, 0);
});

test('復号: 空の入力は空を返す', () => {
  const s = sq('5x5', '');
  const r = C.decrypt(s, '');
  assert.equal(r.plain, '');
  assert.deepEqual(r.mapping, []);
});

test('入力の正規化: 改行をそろえ、制御文字を落とし、長さを切る', () => {
  assert.equal(C.normalizeInput('a\r\nb').text, 'a\nb');
  assert.equal(C.normalizeInput('a\rb').text, 'a\nb');
  assert.equal(C.normalizeInput('a\tb').text, 'a\tb');
  assert.equal(C.normalizeInput('a\u0000b').text, 'ab');
  assert.equal(C.normalizeInput('a\u0000b').controls, 1);
  const long = C.normalizeInput('x'.repeat(C.MAX_INPUT + 50));
  assert.equal(long.text.length, C.MAX_INPUT);
  assert.equal(long.truncated, 50);
  assert.equal(C.normalizeInput(null).text, '');
});

test('最大長の入力でも暗号化と復号ができる', () => {
  const s = sq('5x5', '');
  const text = 'a'.repeat(C.MAX_INPUT);
  const r = enc(s, text);
  assert.equal(r.stats.pairs, C.MAX_INPUT);
  assert.equal(C.decrypt(s, r.cipher).plain, text);
});

test('方陣は呼び出しごとに別のオブジェクトで、互いに影響しない', () => {
  const a = sq('5x5', 'key');
  const b = sq('5x5', 'zebra');
  assert.equal(a.rows[0].join(''), 'KEYAB');
  assert.equal(b.rows[0].join(''), 'ZEBRA');
  assert.notEqual(a.charToPair.A, b.charToPair.A);
});

test('知らないモードを渡したら5×5として扱う', () => {
  const s = sq('7x7', '');
  assert.equal(s.mode, '5x5');
  assert.equal(s.size, 5);
});
