import test from 'node:test';
import assert from 'node:assert/strict';
import { core, read } from './load.js';

const C = core();

test('ギリシャ語の24文字を5＋5＋5＋5＋4に分ける（原典の記述）', () => {
  const groups = C.greekGroups();
  assert.equal(groups.length, 5);
  assert.deepEqual(groups.map((g) => g.length), [5, 5, 5, 5, 4]);
  assert.equal(groups.flat().length, 24);
  assert.equal(new Set(groups.flat()).size, 24);
  assert.deepEqual(groups.map((g) => g.join('')), ['ΑΒΓΔΕ', 'ΖΗΘΙΚ', 'ΛΜΝΞΟ', 'ΠΡΣΤΥ', 'ΦΧΨΩ']);
});

test('原典の例: κ は第2群の5番目（左2本・右5本）', () => {
  assert.deepEqual(C.torchSignal('κ'), { char: 'Κ', group: 2, index: 5 });
  assert.deepEqual(C.torchSignal('Κ'), { char: 'Κ', group: 2, index: 5 });
});

test('原典の例: ρ は第4群の2番目（左4本・右2本）', () => {
  assert.deepEqual(C.torchSignal('ρ'), { char: 'Ρ', group: 4, index: 2 });
});

test('最後の群は4文字で、ω が第5群の4番目になる', () => {
  assert.deepEqual(C.torchSignal('ω'), { char: 'Ω', group: 5, index: 4 });
  assert.deepEqual(C.torchSignal('Α'), { char: 'Α', group: 1, index: 1 });
});

test('語末のシグマも Σ として読む', () => {
  assert.deepEqual(C.torchSignal('ς'), C.torchSignal('σ'));
});

test('ギリシャ文字でないものは信号にならない', () => {
  for (const ch of ['a', 'Z', '1', '', ' ', 'あ', null, undefined]) {
    assert.equal(C.torchSignal(ch), null, String(ch));
  }
});

test('群と位置から、もとの文字へ戻れる', () => {
  const groups = C.greekGroups();
  for (const ch of C.GREEK) {
    const s = C.torchSignal(ch);
    assert.equal(groups[s.group - 1][s.index - 1], ch);
    assert.ok(s.group >= 1 && s.group <= 5);
    assert.ok(s.index >= 1 && s.index <= C.GREEK_GROUP_SIZE);
  }
});

test('文字列をまとめて信号にできる', () => {
  const out = C.torchSignals('κρ a');
  assert.equal(out.length, 4);
  assert.equal(out[0].signal.group, 2);
  assert.equal(out[1].signal.group, 4);
  assert.equal(out[2].signal, null);
  assert.equal(out[3].signal, null);
});

test('画面の説明が原典の数値と食い違っていない', () => {
  const html = read('index.html');
  assert.ok(html.includes('κ は第2群の5番目'), '原典の例（κ）が画面にない');
  assert.ok(html.includes('ρ は第4群の2番目'), '原典の例（ρ）が画面にない');
  assert.ok(html.includes('第10巻45節'), '出典がない');
  // 原典の数値そのものを、計算部から取り直して確かめる
  const k = C.torchSignal('κ');
  assert.ok(html.includes(`左に${k.group}本、右に${k.index}本`), 'κ の本数が合わない');
  const r = C.torchSignal('ρ');
  assert.ok(html.includes(`左に${r.group}本、右に${r.index}本`), 'ρ の本数が合わない');
});
