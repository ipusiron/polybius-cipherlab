// 画面と同じ通常のスクリプト（js/*.js）を、テストの実行環境に読み込む。
// vm.runInThisContext で読むので、結果のオブジェクトはテスト側と同じ realm になる（deepStrictEqual で比べられる）
import fs from 'node:fs';
import vm from 'node:vm';

// 改行は LF にそろえて読む（作業ツリーは CRLF、GitHub Pages の配信は LF）
const CRLF = new RegExp(String.fromCharCode(13) + String.fromCharCode(10), 'g');
export const read = (f) =>
  fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(CRLF, String.fromCharCode(10));

const loaded = new Set();
export function load(file) {
  if (!loaded.has(file)) {
    vm.runInThisContext(read(file), { filename: file });
    loaded.add(file);
  }
  return globalThis;
}

export const core = () => load('js/polybius-core.js').PolybiusCore;

// 参照実装（本体とは別の方法で方陣を作る。キーワードの重複除去を Set でなく indexOf で書く）
export function refSquare(mode, keyword) {
  const alphabet = mode === '6x6' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
  const size = mode === '6x6' ? 6 : 5;
  let seq = '';
  for (const raw of String(keyword || '').toUpperCase()) {
    const ch = mode === '6x6' ? raw : raw === 'J' ? 'I' : raw;
    if (alphabet.indexOf(ch) >= 0 && seq.indexOf(ch) < 0) seq += ch;
  }
  for (const ch of alphabet) if (seq.indexOf(ch) < 0) seq += ch;
  const rows = [];
  for (let r = 0; r < size; r++) rows.push(seq.slice(r * size, (r + 1) * size).split(''));
  return rows;
}

// 参照実装（暗号化。ペアの組み立てを本体と違う書き方で行う）
export function refPairs(rows, text, mode) {
  const out = [];
  for (const raw of String(text).toUpperCase()) {
    const ch = mode === '6x6' ? raw : raw === 'J' ? 'I' : raw;
    for (let r = 0; r < rows.length; r++) {
      const c = rows[r].indexOf(ch);
      if (c >= 0) out.push(String(r + 1) + String(c + 1));
    }
  }
  return out;
}
