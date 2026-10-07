import test from 'node:test';
import assert from 'node:assert/strict';
import { read, load } from './load.js';

const M = load('js/messages.js').PolybiusMessages;
const html = read('index.html');

test('日本語と英語で同じキーをそろえる', () => {
  const ja = Object.keys(M.DICT.ja).sort();
  const en = Object.keys(M.DICT.en).sort();
  const onlyJa = ja.filter((k) => !en.includes(k));
  const onlyEn = en.filter((k) => !ja.includes(k));
  assert.deepEqual(onlyJa, [], `英語にないキー: ${onlyJa.join(' ')}`);
  assert.deepEqual(onlyEn, [], `日本語にないキー: ${onlyEn.join(' ')}`);
  assert.ok(ja.length > 100, `キーが ${ja.length} 件しかない`);
});

test('英語の辞書に日本語の文字が残っていない', () => {
  const bad = [];
  // 言語を切り替えるボタンだけは、英語の画面でも「日本語」と出す
  const allow = new Set(['ui.langButton']);
  for (const [key, value] of Object.entries(M.DICT.en)) {
    if (allow.has(key)) continue;
    if (/[぀-ヿ一-鿿]/.test(value)) bad.push(`${key}: ${value.slice(0, 30)}`);
  }
  assert.deepEqual(bad, [], bad.join(' / '));
});

test('{name} の差し込みが日英で同じ', () => {
  for (const key of Object.keys(M.DICT.ja)) {
    const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(vars(M.DICT.en[key]), vars(M.DICT.ja[key]), key);
  }
});

test('index.html の data-i18n がすべて辞書にある', () => {
  const keys = [...html.matchAll(/data-i18n="([\w.]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 50, `data-i18n が ${keys.length} 件しかない`);
  for (const key of new Set(keys)) {
    assert.ok(M.DICT.ja[key] !== undefined, `辞書にないキー: ${key}`);
  }
  const attrs = [...html.matchAll(/data-i18n-attr="([^"]+)"/g)].map((m) => m[1]);
  for (const spec of attrs) {
    for (const pair of spec.split(';')) {
      const [attr, key] = pair.split(':');
      assert.ok(attr && key, spec);
      assert.ok(M.DICT.ja[key.trim()] !== undefined, `辞書にないキー: ${key}`);
    }
  }
});

test('t() は言語を切り替え、知らないキーはそのまま返す', () => {
  assert.equal(M.t('tab.encrypt', null, 'ja'), '暗号化 (Encrypt)');
  assert.equal(M.t('tab.encrypt', null, 'en'), 'Encrypt');
  assert.equal(M.t('unknown.key', null, 'en'), 'unknown.key');
  assert.equal(M.t('status.decoded', { count: 3 }, 'en'), 'Recovered 3 letters.');
  assert.equal(M.t('status.decoded', { count: 3 }, 'ja'), '3文字を復元しました。');
  // 知らない言語は日本語にする
  assert.equal(M.t('tab.encrypt', null, 'fr'), '暗号化 (Encrypt)');
});

test('言語の選び方（?lang → 保存 → ブラウザー）', () => {
  const i18n = load('js/i18n.js').PolybiusI18n;
  const d = (search, stored, nav) => i18n.detectLanguage(search, stored, nav, M.LANGS);
  assert.equal(d('?lang=en', 'ja', 'ja-JP'), 'en');
  assert.equal(d('?lang=ja', 'en', 'en-US'), 'ja');
  assert.equal(d('', 'en', 'ja-JP'), 'en');
  assert.equal(d('', null, 'ja-JP'), 'ja');
  assert.equal(d('', null, 'en-US'), 'en');
  assert.equal(d('', null, 'fr-FR'), 'en');
  assert.equal(d('?lang=fr', null, 'ja'), 'ja');
  assert.equal(d(undefined, undefined, undefined), 'en');
});

test('原典の例の数値は、英語でも同じ', () => {
  for (const lang of M.LANGS) {
    const ex1 = M.t('sig.ex1', null, lang);
    const ex2 = M.t('sig.ex2', null, lang);
    assert.match(ex1, /κ/);
    assert.match(ex2, /ρ/);
    assert.match(ex1, /2/);
    assert.match(ex1, /5/);
    assert.match(ex2, /4/);
  }
});

test('座学の変換の例は、日英とも計算部の出力と合う', () => {
  const C = load('js/polybius-core.js').PolybiusCore;
  const square = C.buildSquare({ mode: '5x5' });
  const cases = [
    ['study.how.ex1', 'H'],
    ['study.how.ex2', 'E'],
    ['study.how.ex3', 'L'],
    ['study.how.ex4', 'O'],
  ];
  for (const lang of M.LANGS) {
    for (const [key, ch] of cases) {
      const text = M.t(key, null, lang);
      assert.ok(text.includes(square.charToPair[ch]), `${lang} ${key}: ${text}`);
      assert.ok(text.includes(ch.toLowerCase()), `${lang} ${key}: ${text}`);
    }
    assert.ok(M.t('study.how.result', null, lang).includes(C.encrypt(square, 'hello').cipher));
  }
});
