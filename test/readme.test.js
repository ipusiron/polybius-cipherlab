import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { read, core } from './load.js';

const C = core();
const readme = read('README.md');
const html = read('index.html');
const ROOT = new URL('..', import.meta.url);

test('YAML メタデータの構造と値を保つ', () => {
  const block = readme.match(/^<!--\n---\n([\s\S]*?)\n---\n-->/);
  assert.ok(block, 'HTML コメントで囲んだ YAML がない');
  const yaml = block[1];
  assert.match(yaml, /^id: day067$/m);
  assert.match(yaml, /^slug: polybius-cipherlab$/m);
  assert.match(yaml, /^repo_url: "https:\/\/github\.com\/ipusiron\/polybius-cipherlab"$/m);
  assert.match(yaml, /^demo_url: "https:\/\/ipusiron\.github\.io\/polybius-cipherlab\/"$/m);
  assert.match(yaml, /^hub: true$/m);
  // 配列はブロック形式（「- 」で始まる行）であること。フロー形式 [a, b] に書き換えない
  for (const key of ['category_ja', 'category_en', 'tags']) {
    const m = yaml.match(new RegExp(`^${key}:\\n((?:  - .+\\n)+)`, 'm'));
    assert.ok(m, `${key} がブロック形式でない`);
  }
  assert.doesNotMatch(yaml, /Subsutitution/);
});

test('README の方陣（キーワード key）がコードの出力と一致する', () => {
  const block = readme.match(/```\n  1 2 3 4 5\n([\s\S]*?)```/);
  assert.ok(block, 'キーワード key の方陣が見つからない');
  const rows = block[1].trim().split('\n').map((line) => line.replace(/^\d /, '').split(' ').join(''));
  const square = C.buildSquare({ mode: '5x5', keyword: 'key' });
  assert.deepEqual(rows, square.rows.map((r) => r.join('').toLowerCase()));
  assert.equal(rows.length, 5);
});

test('座学タブの方陣（キーワードなし）がコードの出力と一致する', () => {
  const block = html.match(/<pre class="code-block">\n {2}1 2 3 4 {3}5\n([\s\S]*?)<\/pre>/);
  assert.ok(block, '座学タブの方陣が見つからない');
  const rows = block[1].trim().split('\n').map((line) => line.replace(/^\d /, '').replace(/\s+/g, '').replace('i/j', 'i'));
  const square = C.buildSquare({ mode: '5x5', keyword: '' });
  assert.deepEqual(rows, square.rows.map((r) => r.join('').toLowerCase()));
  // w の抜けや x の重複がないこと（かつて README で起きていた）
  assert.equal(rows.join('').split('').sort().join(''), 'abcdefghiklmnopqrstuvwxyz');
});

test('README と座学タブに書いた変換の例が、コードの出力と一致する', () => {
  const square = C.buildSquare({ mode: '5x5', keyword: '' });
  // hello → 23 15 31 31 34
  assert.equal(C.encrypt(square, 'hello').cipher, '23 15 31 31 34');
  assert.ok(readme.includes('`23 15 31 31 34`'), 'README に hello の例がない');
  assert.ok(html.includes('"hello" → "23 15 31 31 34"'), '座学タブに hello の例がない');
  // 連結した形
  assert.equal(C.encrypt(square, 'hello', { concat: true }).cipher, '2315313134');
  assert.ok(readme.includes('`2315313134`'));
  // 記号を残した往復
  const sym = C.encrypt(square, 'a1b', { preserveSymbols: true });
  assert.equal(sym.cipher, '11 1 12');
  assert.equal(C.decrypt(square, sym.cipher).plain, 'a1b');
  assert.ok(readme.includes('`a1b` → `11 1 12` → `a1b`'));
});

test('座学タブの変換の例（1文字ずつ）がコードの出力と一致する', () => {
  const square = C.buildSquare({ mode: '5x5', keyword: '' });
  const items = [...html.matchAll(/<li[^>]*>'(\w)' → (\d)行(\d)列 → "(\d\d)"<\/li>/g)];
  assert.equal(items.length, 5);
  for (const [, ch, row, col, pair] of items) {
    assert.equal(square.charToPair[ch.toUpperCase()], pair, ch);
    assert.equal(pair, `${row}${col}`, ch);
  }
});

test('README の設定の表が、計算部の選択肢と食い違っていない', () => {
  const table = readme.match(/\| 25マスに収める方法 \| ([^|]+)\|/);
  assert.ok(table, '設定の表がない');
  const merges = table[1].trim().split('／');
  assert.equal(merges.length, Object.keys(C.MERGES).length);
  const fills = readme.match(/\| キーワードのあとの並べ方 \| ([^|]+)\|/);
  assert.ok(fills);
  assert.equal(fills[1].trim().split('／').length, C.FILLS.length);
  const orders = readme.match(/\| 座標の順 \| ([^|]+)\|/);
  assert.ok(orders);
  assert.equal(orders[1].trim().split('／').length, C.ORDERS.length);
  // 画面のプリセットが4つとも README に出ている
  for (const name of ['このツールの既定', 'Crypto Corner', 'ADFGX', 'タップ符号']) {
    assert.ok(readme.includes(name), `プリセット ${name} の説明がない`);
  }
});

test('画面のプリセットと計算部の値が食い違っていない', () => {
  const script = read('script.js');
  const block = script.match(/const PRESETS = \{([\s\S]*?)\};/);
  assert.ok(block, 'PRESETS が見つからない');
  const merges = [...block[1].matchAll(/merge: '(\w+)'/g)].map((m) => m[1]);
  const fills = [...block[1].matchAll(/fill: '(\w+)'/g)].map((m) => m[1]);
  const orders = [...block[1].matchAll(/order: '(\w+)'/g)].map((m) => m[1]);
  for (const v of merges) assert.ok(C.MERGES[v], `知らない流儀: ${v}`);
  for (const v of fills) assert.ok(C.FILLS.includes(v), `知らない充填順: ${v}`);
  for (const v of orders) assert.ok(C.ORDERS.includes(v), `知らない座標の順: ${v}`);
  assert.equal(merges.length, 4);
});

test('README の画像がすべて実在する', () => {
  const imgs = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  const local = imgs.filter((u) => !u.startsWith('http'));
  assert.ok(local.length >= 3, `画像の参照が ${local.length} 件しかない`);
  for (const rel of local) {
    assert.ok(fs.existsSync(new URL(rel, ROOT)), `${rel} がない`);
  }
});

test('ディレクトリー構造に全ファイルが載っていて、全行に説明がある', () => {
  const tree = readme.match(/## 📁 ディレクトリー構造\n\n```\n([\s\S]*?)```/);
  assert.ok(tree, 'ディレクトリー構造がない');
  const lines = tree[1].trim().split('\n');
  for (const line of lines.slice(1)) {
    assert.match(line, /# .+$/, `説明のない行: ${line}`);
  }

  const skip = new Set(['.git', 'node_modules', '.claude']);
  const found = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(new URL(dir, ROOT), { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const rel = prefix + entry.name;
      if (entry.isDirectory()) walk(`${dir}${entry.name}/`, `${rel}/`);
      else found.push(rel);
    }
  };
  walk('', '');
  for (const file of found) {
    const base = path.basename(file);
    assert.ok(lines.some((l) => l.includes(`${base} `) || l.includes(`${base}  `)), `ツリーに ${file} がない`);
  }
  // ツリーに書いたファイルが実在すること
  for (const line of lines.slice(1)) {
    const name = line.replace(/^[│├└─\s]+/, '').split(/\s+#/)[0].trim();
    if (!name || name.endsWith('/')) continue;
    assert.ok(found.some((f) => path.basename(f) === name), `ツリーの ${name} が実在しない`);
  }
});

test('シリーズ標準の見出しがそろっている', () => {
  for (const h of [
    '# Polybius CipherLab - ポリュビオス暗号ツール',
    '**Day067 - 生成AIで作るセキュリティツール100**',
    '## 🌐 デモページ',
    '## 📸 スクリーンショット',
    '## 🎯 ユースケース',
    '## 🧪 テスト',
    '## 📁 ディレクトリー構造',
    '## 💻 動作環境',
    '## 📄 ライセンス',
    '## 🛠️ このツールについて',
  ]) {
    assert.ok(readme.includes(h), `${h} がない`);
  }
  assert.ok(readme.includes('https://akademeia.info/?page_id=42163'));
});

// 表記のゆれ。README・index.html・文言の辞書をまとめて見る
const NG = [
  [/サーバ(?![ーイ])/, 'サーバー'],
  [/ユーザ(?![ー])/, 'ユーザー'],
  [/ブラウザ(?![ー])/, 'ブラウザー'],
  [/エディタ(?![ー])/, 'エディター'],
  [/パラメータ(?![ー])/, 'パラメーター'],
  [/フォルダ(?![ー])/, 'フォルダー'],
  [/リポジトリ(?![ー])/, 'リポジトリー'],
  [/ライブラリ(?![ー])/, 'ライブラリー'],
  [/ディレクトリ(?![ー])/, 'ディレクトリー'],
  [/インターフェース/, 'インターフェイス'],
  [/分かる|分かり|分から/, 'わかる'],
  [/全て/, 'すべて'],
  [/既に/, 'すでに'],
  [/[^。、]無い/, 'ない'],
];

for (const file of ['README.md', 'index.html', 'js/messages.js']) {
  test(`${file} の表記をそろえる`, () => {
    const text = read(file);
    for (const [re, should] of NG) {
      const m = text.match(re);
      assert.equal(m, null, m ? `「${m[0]}」は「${should}」に（${file}）` : '');
    }
  });
}

test('README に過去の版との違いを書かない', () => {
  for (const re of [/改修前/, /以前は/, /初期の実装/, /旧バージョン/, /誤りだった/]) {
    assert.doesNotMatch(readme, re);
  }
});

// ---- 英語版のREADME（要約にせず、同じ節をそろえる）
const readmeEn = read('README.en.md');

test('日本語版と英語版で、見出しの数・順・階層がそろっている', () => {
  const levels = (text) => [...text.matchAll(/^(#{1,3}) /gm)].map((m) => m[1].length);
  const ja = levels(readme);
  const en = levels(readmeEn);
  assert.ok(ja.length >= 25, `見出しが ${ja.length} 個しかない`);
  assert.deepEqual(en, ja, `見出しの数か階層が違う（ja ${ja.length} / en ${en.length}）`);
});

test('英語版に日本語の本文が残っていない', () => {
  const body = readmeEn
    .split('\n')
    .filter((line) => !line.includes('README.md') && !line.includes('日本語'))
    .join('\n');
  const hits = [...body.matchAll(/[぀-ヿ一-鿿]+/g)].map((m) => m[0]);
  assert.deepEqual(hits, [], `日本語が残っている: ${hits.slice(0, 5).join(' / ')}`);
});

test('両方のREADMEが互いにリンクしている', () => {
  assert.match(readme, /^\[English\]\(README\.en\.md\) · 日本語$/m);
  assert.match(readmeEn, /^English · \[日本語\]\(README\.md\)$/m);
  // YAML メタデータは日本語版だけに置く（hackinglab.online が読むのは README.md）
  assert.doesNotMatch(readmeEn, /^id: day067$/m);
});

test('英語版の方陣と例が、コードの出力と一致する', () => {
  const block = readmeEn.match(/```\n  1 2 3 4 5\n([\s\S]*?)```/);
  assert.ok(block, 'キーワード key の方陣が英語版にない');
  const rows = block[1].trim().split('\n').map((line) => line.replace(/^\d /, '').split(' ').join(''));
  const square = C.buildSquare({ mode: '5x5', keyword: 'key' });
  assert.deepEqual(rows, square.rows.map((r) => r.join('').toLowerCase()));
  const sym = C.encrypt(C.buildSquare({ mode: '5x5' }), 'a1b', { preserveSymbols: true });
  assert.ok(readmeEn.includes('`a1b` → `11 1 12` → `a1b`'));
  assert.equal(sym.cipher, '11 1 12');
});

test('英語版の画像がすべて実在する', () => {
  const imgs = [...readmeEn.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  const local = imgs.filter((u) => !u.startsWith('http'));
  assert.ok(local.length >= 7, `画像の参照が ${local.length} 件しかない`);
  for (const rel of local) {
    assert.ok(rel.startsWith('assets/en/'), `英語版は英語の画面を使う: ${rel}`);
    assert.ok(fs.existsSync(new URL(rel, ROOT)), `${rel} がない`);
  }
});

test('英語版のディレクトリー構造にも全ファイルが載っている', () => {
  const tree = readmeEn.match(/## 📁 Directory structure\n\n```\n([\s\S]*?)```/);
  assert.ok(tree, '英語版にディレクトリー構造がない');
  const lines = tree[1].trim().split('\n');
  for (const line of lines.slice(1)) assert.match(line, /# .+$/, `説明のない行: ${line}`);
});

test('ユースケースの「このツールならではの使い方」の値は計算部と同じ（日英）', () => {
  const [ja, en] = [readme, readmeEn];
  const sq5 = C.buildSquare({ mode: '5x5', merge: 'ij', fill: 'standard', keyword: '' });
  const hello = C.encrypt(sq5, 'HELLO', {}).cipher;
  assert.equal(hello, '23 15 31 31 34');
  assert.ok([...hello.replace(/ /g, '')].every((d) => d >= '1' && d <= '5'));
  assert.ok(ja.includes('HELLOを暗号化すると23 15 31 31 34') && en.includes('HELLO with the standard 5x5 square gives 23 15 31 31 34'));
  const torch = (ch) => { const s = C.torchSignal(ch); return [s.group, s.index]; };
  assert.deepEqual('ΝΙΚΗ'.split('').map(torch), [[3, 3], [2, 4], [2, 5], [2, 2]]);
  assert.ok(ja.includes('Νが3と3、Ιが2と4、Κが2と5、Ηが2と2') && en.includes('Ν is 3 and 3, Ι is 2 and 4, Κ is 2 and 5, and Η is 2 and 2'));
  assert.equal(C.GREEK_GROUP_SIZE, 5);
  const sq6 = C.buildSquare({ mode: '6x6', merge: 'none', fill: 'standard', keyword: '' });
  assert.equal(sq6.rows.flat().length, 36);
  const c6 = C.encrypt(sq6, 'HELLO2026', {}).cipher;
  assert.equal(c6, '22 15 26 26 33 55 53 55 63');
  assert.ok(c6.replace(/ /g, '').includes('6'));
  assert.ok(ja.includes('HELLO2026は22 15 26 26 33 55 53 55 63') && en.includes('HELLO2026 becomes 22 15 26 26 33 55 53 55 63'));
});
