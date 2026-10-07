// 画面が出す文言。t(key, vars) で {name} を置き換える。globalThis.PolybiusMessages に置く
// スクリプトの中に文字列を直接書かず、ここに集める（言語を足すときに触る場所をひとつにする）
(() => {
  'use strict';

  const LANGS = ['ja'];

  const ja = {
    'status.encrypted': '{pairs}文字を数字ペアにしました。',
    'status.decoded': '{count}文字を復元しました。',
    'status.nothing': '変換できる文字がありませんでした。',
    'status.nothingDecoded': '復元できる数字ペアがありませんでした。',
    'status.empty': '入力がありません。',
    'status.merged': '{chars}は{to}として扱いました（5×5では同じマス）。',
    'status.droppedSymbols': '記号を{count}個削除しました。',
    'status.droppedNonAscii': '英数字でない文字を{count}個削除しました。',
    'status.droppedSpaces': '空白と改行を削除しました。',
    'status.truncated': '上限の{max}文字を超えた{count}文字は切りました。',
    'status.outOfRange': '方陣にないペアが{count}個ありました（[ ]で囲んで残しています）。',
    'status.leftover': '2桁にならない数字が{count}個ありました（そのまま残しています）。',
    'status.symbols': '数字でない文字が{count}個ありました（そのまま残しています）。',
    'status.ijNote': '5×5では i と j を見分けられません。文意から補ってください。',
    'status.copied': 'コピーしました',

    'keyword.dropped': 'キーワードで使えない文字（{chars}）は除きました。',
    'keyword.merged': 'キーワードの{chars}は{to}として扱いました。',

    'toast.copied': 'コピーしました',
    'toast.copyFailed': 'コピーできませんでした',
    'toast.synced': '暗号文と設定を同期しました',

    'matrix.cellLabel': '{char}（{row}行{col}列） ペア{pair}',
    'matrix.corner': '行＼列',

    'mapping.more': 'ほかに{count}件（表示は先頭{shown}件まで）',
  };

  const DICT = { ja };

  function t(key, vars, lang) {
    const dict = DICT[lang] || DICT.ja;
    const template = dict[key];
    if (template === undefined) return key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (m, name) => (vars[name] === undefined ? m : String(vars[name])));
  }

  globalThis.PolybiusMessages = { LANGS, DICT, t };
})();
