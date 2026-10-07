import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

const html = read('index.html');

test('CSP の meta があり、meta では効かない指定を書かない', () => {
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(csp, 'CSP の meta がない');
  assert.match(csp[1], /default-src 'self'/);
  assert.match(csp[1], /base-uri 'none'/);
  assert.match(csp[1], /form-action 'none'/);
  assert.doesNotMatch(csp[1], /frame-ancestors/); // meta では効かない
  assert.doesNotMatch(csp[1], /unsafe-inline|unsafe-eval/);
  for (const name of ['X-Frame-Options', 'X-Content-Type-Options', 'X-XSS-Protection']) {
    assert.equal(html.includes(name), false, `${name} は meta では効かない`);
  }
});

test('referrer の meta がある', () => {
  assert.match(html, /<meta name="referrer" content="no-referrer"/);
});

test('インラインのイベントハンドラーと style 属性がない', () => {
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /\sstyle\s*=\s*"/i);
  assert.doesNotMatch(html, /javascript:/i);
});

test('スクリプトは計算部・文言・画面の順に読み込む', () => {
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.deepEqual(srcs, ['js/polybius-core.js', 'js/messages.js', 'script.js']);
});

test('主要な要素の id がそろっている', () => {
  const ids = [
    'enc-input', 'enc-output', 'enc-status', 'enc-map', 'mode-enc', 'keyword-enc',
    'preserve-spaces-enc', 'concat-pairs-enc', 'preserve-symbols-enc', 'matrix-container-enc',
    'btn-enc', 'btn-enc-copy', 'btn-enc-clear',
    'dec-input', 'dec-output', 'dec-status', 'dec-map', 'mode-dec', 'keyword-dec',
    'matrix-container-dec', 'btn-dec', 'btn-dec-copy', 'btn-dec-clear', 'btn-sync-cipher',
    'mode-matrix', 'keyword-matrix', 'matrix-container', 'theme-toggle', 'toast',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `id="${id}" がない`);
});

test('タブとパネルが id で結ばれている', () => {
  const tabs = [...html.matchAll(/<button class="tab[^"]*" id="tab-btn-(\w+)"[^>]*aria-controls="tab-(\w+)"/g)];
  assert.equal(tabs.length, 6);
  for (const [, btnKey, panelKey] of tabs) {
    assert.equal(btnKey, panelKey);
    assert.ok(html.includes(`<section id="tab-${panelKey}"`), `tab-${panelKey} のパネルがない`);
    assert.ok(
      new RegExp(`<section id="tab-${panelKey}"[^>]*aria-labelledby="tab-btn-${panelKey}"`).test(html),
      `tab-${panelKey} に aria-labelledby がない`,
    );
  }
});

test('ヘルプは button で、ブラウザー標準のツールチップ（title）を使わない', () => {
  const helps = [...html.matchAll(/<button type="button" class="help-icon" data-help="([^"]+)" aria-label="([^"]+)">/g)];
  assert.equal(helps.length, 6);
  assert.doesNotMatch(html, /class="help-icon"[^>]*\stitle=/);
  for (const [, text] of helps) assert.ok(text.length > 5);
});

test('テーマのボタンに aria-label がある', () => {
  assert.match(html, /<button id="theme-toggle"[^>]*aria-label="[^"]+"/);
});

test('noscript と viewport と lang がある', () => {
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1"/);
  assert.match(html, /<noscript>/);
});

test('外部への読み込みがない（同一オリジンだけ）', () => {
  const urls = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  for (const u of urls) {
    assert.ok(u.startsWith('https://github.com/') || u.startsWith('https://ipusiron.github.io/'), u);
  }
  assert.doesNotMatch(html, /<link[^>]+href="https?:\/\//); // 外部のスタイルシートを読まない
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
});

test('外部リンクに rel="noopener noreferrer" がある', () => {
  for (const m of html.matchAll(/<a [^>]*href="https?:\/\/[^"]+"[^>]*>/g)) {
    assert.match(m[0], /rel="noopener noreferrer"/, m[0]);
  }
});

test('favicon を指している', () => {
  assert.match(html, /<link rel="icon" href="assets\/favicon\.svg"/);
});
