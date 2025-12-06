<!--
---
id: day067
slug: polybius-cipherlab

title: "Polybius CipherLab"

subtitle_ja: "ポリュビオス暗号ツール"
subtitle_en: "Polybius Cipher Visualization Tool"

description_ja: "古代ギリシャの歴史的暗号「ポリュビオス暗号」を学べるWebアプリ。文字を数字ペアに変換するチェッカー盤を使い、暗号化・復号の仕組みを可視化します。"
description_en: "Visualize and practice the Polybius cipher using the historic checkerboard system. Convert letters to number pairs and learn ancient Greek cryptography."

category_ja:
  - 古典暗号
  - 換字式暗号
category_en:
  - Classical Cryptography
  - Subsutitution Cipher

difficulty: 1

tags:
  - polybius
  - cipher
  - classical
  - cryptography
  - checkerboard
  - education
  - visualization

repo_url: "https://github.com/ipusiron/polybius-cipherlab"
demo_url: "https://ipusiron.github.io/polybius-cipherlab/"

hub: true
---
-->

# Polybius CipherLab - ポリュビオス暗号ツール

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/polybius-cipherlab?style=social) 
![GitHub forks](https://img.shields.io/github/forks/ipusiron/polybius-cipherlab?style=social) 
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/polybius-cipherlab) 
![GitHub license](https://img.shields.io/github/license/ipusiron/polybius-cipherlab) 
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/polybius-cipherlab/) 

**Day067 - 生成AIで作るセキュリティツール100**


**Polybius CipherLab**は、古代ギリシャの歴史的暗号「ポリュビオス暗号」を学べるWebアプリです。

文字を数字ペアに変換するポリュビオスのチェッカー盤を使い、暗号化・復号の仕組みを可視化します。  

---

## 🌐 デモページ

👉 **[https://ipusiron.github.io/polybius-cipherlab/](https://ipusiron.github.io/polybius-cipherlab/)**

ブラウザーで直接お試しいただけます。

---

## 📸 スクリーンショット

>!["Hello world"を暗号化する](assets/screenshot.png)  
>*"Hello world"を暗号化する*

---

## 📖 機能概要
- **暗号化**：平文をポリュビオス表にしたがって数字ペアへ変換
- **復号**：数字ペア列を文字へ復元
- **リアルタイムマトリクス表示**：設定変更と同時に表が更新
- **テーマ切り替え**：ダークモード・ライトモード対応
- **キーワードハイライト**：マトリクス内でキーワード文字を色分け表示
- **同期機能**：暗号化結果を復号タブへワンクリック転送
- **座学**：ポリュビオス暗号の歴史と「チェッカー盤」と呼ばれる由来を解説

---

## 🗂️ タブ構成と詳細機能

### 1. 暗号化 (Encrypt)
- **リアルタイム表示**：モード・キーワード変更で即座にマトリクス更新
- **2つのモード**：5×5（I/J統合）・6×6（A-Z + 0-9）
- **暗号化オプション**：
  - 単語区切り維持（空白→「/」変換）
  - 数字ペア連結（スペースなし出力）
  - 記号・数字保持（非アルファベット文字の扱い）
- **コピー機能**：出力欄右上のワンクリックコピー

### 2. 復号 (Decrypt)
- **同期ボタン**：暗号化タブの結果を自動取り込み
- **柔軟な入力**：連結・スペース区切り両対応
- **設定同期**：モード・キーワードも同時反映

### 3. マトリクス表示 (Matrix)
- **リアルタイム生成**：入力と同時に表が更新
- **キーワードハイライト**：該当文字を緑色で強調表示
- **インタラクティブ**：セルクリックで行・列ハイライト

### 4. 座学 (Study)
- **歴史的背景**：ポリュビオスの生涯と暗号の意義
- **技術解説**：暗号化・復号の具体的手順
- **応用例**：古代の松明通信システム

---

## 🚀 技術的特徴
- **レスポンシブデザイン**：デスクトップ・モバイル対応
- **アクセシビリティ**：ARIA属性・キーボードナビゲーション
- **セキュリティ強化**：入力サニタイゼーション・XSS対策
- **モダンWeb技術**：CSS変数・Flexbox・Grid Layout
- **パフォーマンス最適化**：効率的なDOM操作・イベント処理
- **プログレッシブエンハンスメント**：基本機能から段階的機能向上

---

## 🎯 使用技術
- **フロントエンド**：HTML5, CSS3, Vanilla JavaScript
- **UI/UX**：カスタムデザインシステム・ダークモード対応
- **デプロイ**：GitHub Pages（静的サイト）
- **セキュリティ**：CSP対応・入力検証

---

## 🏛️ ポリュビオス暗号とは
ポリュビオス暗号（Polybius Cipher）は、古代ギリシャの歴史家ポリュビオスが考案した暗号方式です。

### 特徴
- 「アルファベット1文字の平文文字」を「数字ペアの暗号文文字」に暗号化する、単一換字式暗号。
  - 単一換字式暗号＝同じ平文が常に同じ暗号文に暗号化される。
  - ここでいう単一は「1文字」のことではなく、「1通り」という意味である。
- 複字式
  - 暗号文文字が2文字だから。
  - なお、暗号文文字が1文字なら単字式という。
- 文字を数字に置き換えるという発想は、当時画期的だった。
- **ポリュビオス表（Polybius Square）**や**ポリュビオスのチェッカー盤（Polybius’s Checkerboard）**（盤面がチェッカー盤や碁盤のようにマス目状になっているため）を暗号表として用いる。
  - 一般にiとjが統合され、5×5のマトリクスで構成される。
  - 文字を「行・列番号のペア」に変換するために使う。

```
  1 2 3 4   5
1 a b c d   e
2 f g h i/j k
3 l m n o   p
4 q r s t   u
5 v x x y   z
```

### 暗号化

平文からアルファベット1文字ずつ抽出します。
ポリュビオス表において、そのアルファベットが存在する行が第1の数、列が第2の数として、数値ペアを作ります。
これを並べていったのが暗号文になります。

ただし、空白は記号（カンマやピリオド）は暗号化できないので、暗号化するために削除するか、暗号文にそのまま残すことになります。

例："hello"を暗号化する

 - 'h'⇒「2行目」かつ「3列目」⇒"23"
 - 'e'⇒「1行目」かつ「5列目」⇒"15"
 - 'l'⇒「3行目」かつ「1列目」⇒"31"
 - 'l'⇒「3行目」かつ「1列目」⇒"31"
 - 'o'⇒「3行目」かつ「4列目」⇒"34"

平文"hello"⇒暗号文"23 15 31 31 34"

### キーワードの使い方

キーワードを指定すると、ポリュビオス表の文字配列をカスタマイズできます。キーワードの文字が優先的に表の先頭に配置され、残りのアルファベットが続きます。

例：キーワード"key"を使用した場合
```
  1   2 3 4 5
1 k   e y a b
2 c   d f g h
3 i/j l m n o
4 p   q r s t
5 u   v w x z
```
（5×5の場合、iとjは統合されます）

キーワードを使うことで：
- 暗号文のパターンが変わり、解読が困難になる
- 送信者と受信者だけが知る秘密鍵として機能する
- 同じ平文でも異なる暗号文を生成できる

### 復号

暗号文から数字ペアを抽出します。
第1の数はポリュビオス表の行、第2の数は列を表わします。これの交差したところにあるのが平文文字になります。
これを並べていけば、平文になります。

ただし、暗号文の"24"が'i'と'j'のどちらに対応するかは、文意から判断します。

また、空白や記号は復元できませんので、文脈で適時挿入します。

### 歴史的背景

ポリュビオス（Polybius）は古代ギリシャの歴史家・暗号学者です（紀元前203-120年頃）。
ヘロドトスやツキディデスと並ぶ大歴史家とされています。

ポリュビオスは暗号にも関心が深く、アルファベットを数字に変える暗号を考案しました。
これがポリュビオス暗号です。
時期的にはシーザー暗号よりも古いものになります。

### ポリュビオス暗号の応用

ポリュビオスはポリュビオス表に基づいて、両手で特定数の松明をかざして、文字を表現しようとしました。
たとえば、文字'm'を送信したければ、表から"32"に変換でき、「左手に3本の松明」かつ「右手に2本の松明」を持ちました。

これは古代ギリシャの烽火通信（torch telegraphy）と相性がよく、遠隔地に情報を伝達する手法に使われました。
この「文字を数字に置き換える」という思想は、後の電信や暗号方式にも影響を与えました。

---

## ポリュビオス暗号文の特徴

- 数字のみ。
- 1～5までしか登場しない。
- 暗号文に登場する数字の個数が偶数個。

---

## 座標式暗号に属するその他の暗号との比較

| 暗号名 | 時代・起源 | マトリクス | 変換方式 | 特徴 | ツール |
|--------|------------|------------|----------|------|------|
| **ポリュビオス暗号** | 古代ギリシャ<br/>（紀元前203-120年） | 5×5 | 1文字 → 2数字 | • 世界初の座標式暗号<br/>• 松明通信に応用<br/>• I/J統合 |[Polybius CipherLab](https://ipusiron.github.io/polybius-cipherlab/)|
| **上杉暗号** | 日本・戦国時代<br/>（16世紀） | 5×10 | 1文字 → 2数字 | • ひらがな対応<br/>• 軍事暗号として使用<br/>| [Uesugi Cipher Tool](https://ipusiron.github.io/uesugi-cipher/) |
| **ポルタ暗号** | イタリア・ルネサンス<br/>（1563年） | 13×2 | 2文字 → 1記号 | • 複字式暗号<br/>• 特殊記号を使用<br/>• 『秘密記法』に記載 | まだ未作成 |
| **プレイフェア暗号** | イギリス<br/>（1854年） | 5×5 | 2文字 → 2文字 | • 2文字組み合わせ処理<br/>• 軍事・外交で使用<br/>• より複雑な規則 | [Playfair CipherLab](https://ipusiron.github.io/playfair-cipherlab/) |

### 各暗号の安全性比較

| 項目 | ポリュビオス | 上杉 | ポルタ | プレイフェア |
|------|-------------|------|--------|-------------|
| **頻度分析耐性** | ❌ 低い | ❌ 低い | ⚠️ やや低い | ⚠️ やや高い |
| **実装の複雑さ** | ✅ 簡単 | ✅ 簡単 | ⚠️ 中程度 | ❌ 複雑 |
| **暗号文の長さ** | 2倍 | 2倍 | 0.5倍 | 同じ |
| **歴史的意義** | ✅ 非常に高い | ✅ 高い | ✅ 高い | ✅ 高い |

---

## 📁 ディレクトリー構成

```
polybius-cipherlab/
├── index.html          # メインHTMLファイル
├── script.js           # JavaScript（暗号化ロジック・UI制御）
├── style.css           # CSS（ダークモード・ライトモード対応）
├── README.md           # プロジェクト説明文書
├── CLAUDE.md           # Claude Code向けガイダンス
├── LICENSE             # MITライセンス
├── .gitignore          # Git除外設定
├── .nojekyll           # GitHub Pages設定
└── assets/             # 画像・リソースフォルダ
    └── screenshot.png  # アプリのスクリーンショット
```

---

## 📄 ライセンス

MIT License – 詳細は [LICENSE](LICENSE) を参照してください。

---

## 🛠 このツールについて

本ツールは、「生成AIで作るセキュリティツール100」プロジェクトの一環として開発されました。 
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。  

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
