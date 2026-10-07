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
    'status.ambiguous': '{count}か所は{from}と{to}のどちらとも読めます（対応表に両方を出しています）。文意から補ってください。',
    'status.copied': 'コピーしました',

    'keyword.dropped': 'キーワードで使えない文字（{chars}）は除きました。',
    'keyword.merged': 'キーワードの{chars}は{to}として扱いました。',

    'theme.toLight': 'ライトモードに切り替える',
    'theme.toDark': 'ダークモードに切り替える',

    'toast.copied': 'コピーしました',
    'toast.copyFailed': 'コピーできませんでした',
    'toast.synced': '暗号文と設定を同期しました',

    'adv.summary': '詳しい設定（ほかのツールに合わせる）',
    'adv.note': 'ツールによって流儀が違います。暗号文が合わないときは、ここをそろえてください。',
    'adv.preset': '形式のプリセット',
    'adv.preset.default': 'このツールの既定（dCode・cryptiiと同じ）',
    'adv.preset.cryptocorner': 'Crypto Corner（列→行）',
    'adv.preset.adfgx': 'ADFGX／ADFGVX（文字のラベル）',
    'adv.preset.tapcode': 'タップ符号（cとkを同じマスに）',
    'adv.preset.custom': '自分で設定する',
    'adv.merge': '25マスに収める方法（5×5のみ）',
    'adv.merge.ij': 'iとjを同じマスに（標準）',
    'adv.merge.ck': 'cとkを同じマスに（タップ符号）',
    'adv.merge.vw': 'vとwを同じマスに',
    'adv.merge.uv': 'uとvを同じマスに',
    'adv.merge.q': 'qを外す（読み替えない）',
    'adv.fill': 'キーワードのあとの並べ方',
    'adv.fill.after': '鍵を先に、残りをアルファベット順（標準）',
    'adv.fill.last': '鍵の重複は、あとに出たほうを残す',
    'adv.fill.reverseKey': '鍵を逆順にしてから',
    'adv.fill.reverseAlphabet': '残りをアルファベットの逆順で',
    'adv.fill.before': '鍵を末尾に置く',
    'adv.order': '座標の順',
    'adv.order.rowcol': '行→列（標準）',
    'adv.order.colrow': '列→行（Crypto Corner）',
    'adv.labels': '座標のラベル',
    'adv.labels.digits': '数字（1〜5／1〜6）',
    'adv.labels.letters': '文字（ADFGX／ADFGVX）',
    'adv.labels.custom': '自分で決める',
    'adv.rowLabels': '行のラベル',
    'adv.colLabels': '列のラベル',
    'adv.labelsInvalid': 'ラベルは{size}文字で、同じ文字を重ねずに入れてください。いまは既定の{fallback}で計算しています。',

    'cmp.base': '基準',
    'cmp.diff': '基準と違うペアが{count}個',
    'cmp.same': '基準と同じ暗号文',
    'cmp.lengthDiff': '暗号文の長さが変わる（{chars}を暗号化できない）',
    'cmp.keywordHint': 'キーワードを入れると、5通りの違いが出ます。',
    'cmp.empty': '平文を入れてください。',

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
