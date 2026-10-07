import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

// 1行に詰め込んだ（minify した）ファイルを見つける。行数の下限も見る
const FILES = [
  { path: 'js/polybius-core.js', maxLine: 160, minLines: 150 },
  { path: 'js/messages.js', maxLine: 160, minLines: 30 },
  { path: 'script.js', maxLine: 160, minLines: 250 },
  { path: 'style.css', maxLine: 160, minLines: 300 },
  { path: 'index.html', maxLine: 250, minLines: 200 },
  { path: 'test/core.test.js', maxLine: 160, minLines: 150 },
  { path: 'test/html.test.js', maxLine: 160, minLines: 50 },
  { path: 'test/contrast.test.js', maxLine: 160, minLines: 50 },
];

for (const f of FILES) {
  test(`${f.path} が1行に詰め込まれていない`, () => {
    const lines = read(f.path).split('\n');
    const longest = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
    assert.ok(longest.length <= f.maxLine, `最長 ${longest.length} 文字: ${longest.slice(0, 80)}…`);
    assert.ok(lines.length >= f.minLines, `${lines.length} 行しかない`);
  });
}

test('画面のスクリプトに日本語の文字列リテラルを残さない（文言は messages.js に集める）', () => {
  const js = read('script.js');
  const stripped = js
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
    .join('\n');
  const literals = [...stripped.matchAll(/(['"`])((?:(?!\1).)*)\1/g)]
    .map((m) => m[2])
    .filter((v) => /[぀-ヿ一-鿿]/.test(v));
  assert.deepEqual(literals, [], `日本語の文字列が残っている: ${literals.join(' / ')}`);
});

test('計算部は DOM を使わない', () => {
  const core = read('js/polybius-core.js');
  for (const token of ['document', 'window', 'localStorage', 'navigator']) {
    assert.equal(core.includes(token), false, `計算部に ${token} がある`);
  }
});
