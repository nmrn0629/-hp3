# ハーモグロー会計事務所 サイト（-hp3）

税理士事務所「ハーモグロー会計事務所」の公式サイトです。ビルド工程のない静的サイト（HTML / CSS / JavaScript）で、GitHub Pages で公開しています。

- **公開URL**: https://nmrn0629.github.io/-hp3/

## ファイル構成

| ファイル / ディレクトリ | 役割 |
|---|---|
| `index.html` | トップページ |
| `about.html` | 事務所紹介 |
| `services.html` | 業務案内 |
| `pricing.html` | 料金案内 |
| `contact.html` | お問い合わせ |
| `privacy.html` | プライバシーポリシー |
| `archive.html` | 過去のTOPICS一覧 |
| `manager-topics.html` | TOPICS更新用の管理ツール（検索エンジンからは除外） |
| `style.css` | 全ページ共通のスタイル |
| `script.js` | 共通スクリプト（メニュー・スクロール・TOPICSバブル等） |
| `js/topics-data.js` | TOPICS（お知らせ）データ |
| `images/` | 画像素材 |
| `sitemap.xml` / `robots.txt` | SEO関連ファイル |

## TOPICS（お知らせ）の更新

TOPICS の更新は `manager-topics.html`（管理ツール）で `js/topics-data.js` を生成・更新する運用です。
詳しい手順は管理者向けマニュアル [`docs/README-ADMIN.md`](docs/README-ADMIN.md) を参照してください。
