import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

const css = read('style.css');

// style.css の :root と [data-theme="light"] から、CSS 変数の色を読む
function readVars(selector) {
  const block = css.match(new RegExp(`${selector}\\{([^}]*)\\}`));
  assert.ok(block, `${selector} の定義が見つからない`);
  const vars = {};
  for (const m of block[1].matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) vars[m[1]] = m[2];
  return vars;
}

function toRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

// WCAG 2.2 の相対輝度
function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// 画面で実際に重なる組（文字 → 背景）
const PAIRS = [
  ['text', 'bg'],
  ['text', 'card'],
  ['text', 'panel'],
  ['muted', 'card'],
  ['muted', 'panel'],
  ['on-primary', 'primary'],
  ['accent', 'card'],
  ['accent', 'panel'],
  ['primary', 'card'],
  ['primary', 'bg'],
  ['danger', 'card'],
  ['focus', 'card'],
  ['focus', 'bg'],
];

const dark = readVars(':root');
const light = { ...dark, ...readVars('\\[data-theme="light"\\]') };

for (const [name, vars] of [['ダーク', dark], ['ライト', light]]) {
  test(`${name}の文字と背景が 4.5:1 以上`, () => {
    for (const [fg, bg] of PAIRS) {
      assert.ok(vars[fg], `--${fg} がない`);
      assert.ok(vars[bg], `--${bg} がない`);
      const r = ratio(vars[fg], vars[bg]);
      assert.ok(r >= 4.5, `${name}: --${fg} on --${bg} = ${r.toFixed(2)}:1`);
    }
  });
}

test('白い文字を primary の上に直接置かない（ダークで 2.74:1 しかない）', () => {
  assert.doesNotMatch(css, /\.tab\.active\{[^}]*color:\s*white/);
  assert.doesNotMatch(css, /\.btn\.primary\{[^}]*color:\s*white/);
  assert.match(css, /\.tab\.active\{[^}]*color:var\(--on-primary\)/);
  assert.match(css, /\.btn\.primary\{[^}]*color:var\(--on-primary\)/);
});

test('フォーカスが見えるようにしてある', () => {
  assert.match(css, /:focus-visible\{[^}]*outline:\s*3px solid var\(--focus\)/);
  assert.doesNotMatch(css, /textarea, input, select\{[^}]*outline:none/);
});

test('入力欄の文字は16px以上（iOS が勝手に拡大しない）', () => {
  const block = css.match(/textarea, input, select\{([^}]*)\}/);
  assert.ok(block);
  const size = block[1].match(/font-size:\s*(\d+)px/);
  assert.ok(size && Number(size[1]) >= 16, block[1]);
});

test('動きを減らす設定を尊重する', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
