// テーマの初期判定（js/theme-init.js）と、<head> での読み込み位置
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './load.js';

const source = read('js/theme-init.js');

// 保存値とブラウザーの設定を差し替えた仮の window で動かし、<html> の data-theme を返す
function run({ saved = null, prefersLight = false, storageThrows = false } = {}) {
  const attrs = {};
  const keys = [];
  const window = {
    localStorage: {
      getItem: (key) => {
        keys.push(key);
        if (storageThrows) throw new Error('blocked');
        return saved;
      },
    },
    matchMedia: (query) => ({ matches: query === '(prefers-color-scheme: light)' && prefersLight }),
    document: { documentElement: { setAttribute: (name, value) => { attrs[name] = value; } } },
  };
  vm.runInNewContext(source, { window });
  return { theme: attrs['data-theme'] === 'light' ? 'light' : 'dark', keys };
}

test('保存値がなければブラウザーの設定に従う', () => {
  assert.equal(run({ prefersLight: true }).theme, 'light');
  assert.equal(run({ prefersLight: false }).theme, 'dark');
});

test('保存値はブラウザーの設定より優先する', () => {
  assert.equal(run({ saved: 'light', prefersLight: false }).theme, 'light');
  assert.equal(run({ saved: 'dark', prefersLight: true }).theme, 'dark');
});

test('想定外の保存値は無視してブラウザーの設定に従う', () => {
  assert.equal(run({ saved: 'blue', prefersLight: true }).theme, 'light');
  assert.equal(run({ saved: 'blue', prefersLight: false }).theme, 'dark');
});

test('localStorage が使えなくても落ちず、ブラウザーの設定に従う', () => {
  assert.equal(run({ storageThrows: true, prefersLight: true }).theme, 'light');
  assert.equal(run({ storageThrows: true, prefersLight: false }).theme, 'dark');
});

test('保存キーは script.js と同じ theme', () => {
  assert.deepEqual(run().keys, ['theme']);
  assert.match(read('script.js'), /const THEME_KEY = 'theme';/);
});

test('index.html の <head> で、style.css のあとに同期読み込みする', () => {
  const html = read('index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(head.includes('<script src="js/theme-init.js"></script>'), '<head> に theme-init.js がない');
  assert.ok(head.indexOf('style.css') < head.indexOf('js/theme-init.js'));
});

test('data-theme は <html> で切り替え、CSS も <html> の属性で受ける', () => {
  const script = read('script.js');
  assert.match(script, /document\.documentElement\.setAttribute\('data-theme', 'light'\)/);
  assert.doesNotMatch(script, /document\.body\.(?:set|remove|get)Attribute\('data-theme'/);
  assert.doesNotMatch(read('style.css'), /body:not\(\[data-theme/);
});
