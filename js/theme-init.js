// 最初の描画の前にテーマを決める。index.html の <head> で、style.css のあとに同期読み込みする。
//
// style.css の既定はダークで、ライトは data-theme="light" で切り替える。この判定を </body> 直前の
// script.js で行うと、ダークで描いたあとにライトへ切り替わって見える。
// 保存した選択（localStorage の theme が light か dark）を優先し、なければブラウザーの設定
// （prefers-color-scheme: light ならライト、それ以外はダーク）に従う。
// <head> の時点では <body> が無いので、data-theme は <html> に書く。
(function (global) {
  'use strict';

  let theme = null;
  try {
    const saved = global.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    // 保存を読めない環境でも続ける
  }
  if (!theme) {
    const mq = global.matchMedia && global.matchMedia('(prefers-color-scheme: light)');
    theme = mq && mq.matches ? 'light' : 'dark';
  }
  if (theme === 'light') global.document.documentElement.setAttribute('data-theme', 'light');
})(typeof window !== 'undefined' ? window : globalThis);
