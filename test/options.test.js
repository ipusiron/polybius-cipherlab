import test from 'node:test';
import assert from 'node:assert/strict';
import { core } from './load.js';

const C = core();
const sq = (opts) => C.buildSquare(opts);
const rowsOf = (s) => s.rows.map((r) => r.join(''));

test('25マスに収める流儀を選べる（落とす文字と読み替え先）', () => {
  const cases = [
    ['ij', 'J', 'I'],
    ['ck', 'K', 'C'],
    ['vw', 'W', 'V'],
    ['uv', 'V', 'U'],
  ];
  for (const [merge, drop, to] of cases) {
    const s = sq({ mode: '5x5', merge });
    const all = s.rows.flat().join('');
    assert.equal(all.length, 25, merge);
    assert.equal(all.includes(drop), false, `${merge}: ${drop} が残っている`);
    assert.equal(s.charToPair[drop], s.charToPair[to], `${merge}: ${drop} が ${to} に読み替わらない`);
    assert.equal(Object.values(s.pairToChar).includes(drop), false);
  }
});

test('Q を外す流儀では、Q が読み替えられずに落ちる', () => {
  const s = sq({ mode: '5x5', merge: 'q' });
  assert.equal(s.rows.flat().join('').includes('Q'), false);
  assert.equal(s.charToPair.Q, undefined);
  const r = C.encrypt(s, 'quiz');
  assert.deepEqual(r.stats.droppedLetters, ['Q']);
  assert.equal(r.stats.pairs, 3);
});

test('流儀ごとに暗号文が変わる（タップ符号の c/k 流儀を含む）', () => {
  const ij = C.encrypt(sq({ mode: '5x5', merge: 'ij' }), 'kick').cipher;
  const ck = C.encrypt(sq({ mode: '5x5', merge: 'ck' }), 'kick').cipher;
  assert.notEqual(ij, ck);
  // c/k では k が c として読まれるので、1文字目と4文字目が同じペアになる
  const pairs = ck.split(' ');
  assert.equal(pairs[0], pairs[3]);
  assert.equal(pairs[0], pairs[2]);
});

test('キーワードの充填順を5通り選べる', () => {
  const base = { mode: '5x5', keyword: 'mammoth' };
  const got = {};
  for (const fill of C.FILLS) got[fill] = sq({ ...base, fill }).rows.flat().join('');
  // 先頭優先・鍵を前・アルファベット順（ほぼ全ツールの既定）
  assert.equal(got.after, 'MAOTH' + 'BCDEFGIKLNPQRSUVWXYZ');
  // あとに出たほうを残す
  assert.equal(got.last, 'AMOTH' + 'BCDEFGIKLNPQRSUVWXYZ');
  // 鍵を逆順にしてから
  assert.equal(got.reverseKey, 'HTOMA' + 'BCDEFGIKLNPQRSUVWXYZ');
  // 残りをアルファベットの逆順で詰める
  assert.equal(got.reverseAlphabet, 'MAOTH' + 'ZYXWVUSRQPNLKIGFEDCB');
  // 鍵を末尾に置く
  assert.equal(got.before, 'BCDEFGIKLNPQRSUVWXYZ' + 'MAOTH');
  // 5通りとも25文字で、重複がない
  for (const [fill, seq] of Object.entries(got)) {
    assert.equal(seq.length, 25, fill);
    assert.equal(new Set(seq).size, 25, fill);
  }
});

test('Crypto Corner の mammoth の方陣と一致する（既定の充填順）', () => {
  const s = sq({ mode: '5x5', keyword: 'mammoth' });
  assert.deepEqual(rowsOf(s), ['MAOTH', 'BCDEF', 'GIKLN', 'PQRSU', 'VWXYZ']);
});

test('座標のラベルを変えられる（ADFGX）', () => {
  const s = sq({ mode: '5x5', rowLabels: 'ADFGX', colLabels: 'ADFGX' });
  assert.equal(s.charToPair.A, 'AA');
  assert.equal(s.charToPair.Z, 'XX');
  assert.equal(s.numericLabels, false);
  const r = C.encrypt(s, 'hello');
  assert.equal(r.cipher, 'DF AX FA FA FG');
  assert.equal(C.decrypt(s, r.cipher).plain, 'hello');
});

test('6×6 の ADFGVX でも読み書きできる', () => {
  const s = sq({ mode: '6x6', rowLabels: 'ADFGVX', colLabels: 'ADFGVX' });
  const r = C.encrypt(s, 'attack at 1200');
  assert.equal(C.decrypt(s, r.cipher).plain, 'attack at 1200');
  assert.match(r.cipher, /^[ADFGVX /]+$/);
});

test('行と列で違うラベルを使える', () => {
  const s = sq({ mode: '5x5', rowLabels: '12345', colLabels: 'ABCDE' });
  assert.equal(s.charToPair.A, '1A');
  assert.equal(s.charToPair.Z, '5E');
  const r = C.encrypt(s, 'hi');
  assert.equal(C.decrypt(s, r.cipher).plain, 'hi');
});

test('長さの合わないラベル・重複するラベルは受け取らず、既定に戻す', () => {
  const short = sq({ mode: '5x5', rowLabels: 'AB' });
  assert.deepEqual(short.rowLabels, ['1', '2', '3', '4', '5']);
  assert.equal(short.labelsValid, false);
  const dup = sq({ mode: '5x5', colLabels: 'AABCD' });
  assert.deepEqual(dup.colLabels, ['1', '2', '3', '4', '5']);
  assert.equal(dup.labelsValid, false);
  const empty = sq({ mode: '5x5', rowLabels: '' });
  assert.equal(empty.labelsValid, true);
});

test('座標の順を 列→行 に変えられる（Crypto Corner の既定）', () => {
  const s = sq({ mode: '5x5', order: 'colrow' });
  // h は2行3列なので、列→行では 32
  assert.equal(s.charToPair.H, '32');
  const r = C.encrypt(s, 'hello world');
  assert.equal(r.cipher, '32 51 13 13 43 / 25 43 24 13 41');
  assert.equal(C.decrypt(s, r.cipher).plain, 'hello world');
});

test('行→列と列→行は、同じ暗号文を別の平文として読む', () => {
  const rowcol = sq({ mode: '5x5' });
  const colrow = sq({ mode: '5x5', order: 'colrow' });
  const cipher = C.encrypt(rowcol, 'hello').cipher;
  assert.equal(C.decrypt(rowcol, cipher).plain, 'hello');
  assert.notEqual(C.decrypt(colrow, cipher).plain, 'hello');
});

test('どの設定の組み合わせでも往復する', () => {
  const texts = ['hello world', 'attack at dawn', 'the quick brown fox'];
  for (const merge of Object.keys(C.MERGES)) {
    for (const fill of C.FILLS) {
      for (const order of C.ORDERS) {
        for (const labels of ['12345', 'ADFGX']) {
          const s = sq({ mode: '5x5', keyword: 'cipher', merge, fill, order, rowLabels: labels, colLabels: labels });
          for (const text of texts) {
            const enc = C.encrypt(s, text);
            const dec = C.decrypt(s, enc.cipher);
            // 読み替えのある流儀では、落ちる文字（q）や読み替えた文字（j→i）が戻らない
            const expected = [...text]
              .map((ch) => {
                const up = ch.toUpperCase();
                if (!/[A-Z]/.test(up)) return ch;
                const mapped = s.map[up] || up;
                return s.charToPair[mapped] ? mapped.toLowerCase() : '';
              })
              .join('');
            assert.equal(dec.plain, expected, `${merge}/${fill}/${order}/${labels}/${text}`);
          }
        }
      }
    }
  }
});

test('読み替えのある流儀では、復号で2通りに読めることを知らせる', () => {
  const s = sq({ mode: '5x5', merge: 'ij' });
  const r = C.decrypt(s, C.encrypt(s, 'hi').cipher);
  assert.equal(r.stats.ambiguous, 1);
  const alt = r.mapping.find((m) => m.alt);
  assert.equal(alt.right, 'i');
  assert.equal(alt.alt, 'j');
  // 読み替えのない6×6では出ない
  const six = sq({ mode: '6x6' });
  assert.equal(C.decrypt(six, C.encrypt(six, 'hi').cipher).stats.ambiguous, 0);
});

test('知らない設定を渡したら既定に戻す', () => {
  const s = sq({ mode: '5x5', merge: 'xx', fill: 'zz', order: 'yy' });
  assert.equal(s.merge, C.DEFAULT_MERGE);
  assert.equal(s.fill, C.DEFAULT_FILL);
  assert.equal(s.order, C.DEFAULT_ORDER);
});

test('6×6では流儀の指定を無視する（36マスに全部入る）', () => {
  const s = sq({ mode: '6x6', merge: 'ck' });
  assert.equal(s.rows.flat().join('').includes('K'), true);
  assert.equal(s.merge, C.DEFAULT_MERGE);
  assert.deepEqual(s.map, {});
});

test('流儀の比較は5通りを返し、基準との違いを数える', () => {
  const results = C.compareMerges({ mode: '5x5', keyword: '', text: 'kick the quiz' });
  assert.equal(results.length, Object.keys(C.MERGES).length);
  const base = results.find((r) => r.isBase);
  assert.equal(base.merge, C.DEFAULT_MERGE);
  assert.equal(base.diff, 0);
  assert.equal(base.sameLength, true);
  const ck = results.find((r) => r.merge === 'ck');
  // kick の k が c として読まれるので、2か所だけ変わる
  assert.equal(ck.diff, 2);
  assert.equal(ck.sameLength, true);
  const q = results.find((r) => r.merge === 'q');
  // q を外す流儀では quiz の q が落ちるので、長さが変わる
  assert.equal(q.sameLength, false);
  assert.deepEqual(q.dropped, ['Q']);
});

test('v/w と u/v は、v も w も鍵に入らない限り同じ暗号文になる', () => {
  // V と W が隣り合うので、どちらを外しても22番目以降の位置が変わらない
  const pick = (kw, text) => {
    const r = C.compareMerges({ mode: '5x5', keyword: kw, text });
    return [r.find((x) => x.merge === 'vw').cipher, r.find((x) => x.merge === 'uv').cipher];
  };
  const [a1, b1] = pick('', 'world');
  assert.equal(a1, b1);
  const [a2, b2] = pick('key', 'world');
  assert.equal(a2, b2);
  // 鍵に w を入れると、並びがずれて結果が変わる
  const [a3, b3] = pick('wave', 'world');
  assert.notEqual(a3, b3);
});

test('充填順の比較は5通りの方陣を返す', () => {
  const results = C.compareFills({ mode: '5x5', keyword: 'mammoth' });
  assert.equal(results.length, C.FILLS.length);
  assert.deepEqual(results.map((r) => r.fill), C.FILLS);
  assert.equal(new Set(results.map((r) => r.seq)).size, C.FILLS.length, '5通りとも違う並びになるはず');
  for (const r of results) assert.equal(r.seq.length, 25);
});

test('キーワードがないと、鍵の置き方だけでは違いが出ない', () => {
  const results = C.compareFills({ mode: '5x5', keyword: '' });
  const seqs = Object.fromEntries(results.map((r) => [r.fill, r.seq]));
  assert.equal(seqs.after, seqs.before);
  assert.equal(seqs.after, seqs.last);
  assert.notEqual(seqs.after, seqs.reverseAlphabet);
});
