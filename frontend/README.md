# CurePocket Frontend

モバイルファーストなお薬パスポートアプリケーション - Next.js 16 App Router + TypeScript + Tailwind CSS

## 🌟 主な機能

- **多言語対応**: 5つの言語（日本語、英語、中国語、フランス語、ポルトガル語）に対応
- **テーマシステム**: 4つのテーマから選択可能
  - Classic Blue（クラシックブルー）
  - Mint Clinic（ミントクリニック）
  - Sakura Notebook（桜ノート）
  - Midnight Travel（ミッドナイトトラベル）
- **ウォレット接続**: Sui Wallet統合（MVP版はモック実装）
- **お薬管理**: 薬の追加、閲覧、編集、削除
- **緊急カード**: QRコードで医療従事者と情報共有
- **プライバシー保護**: Walrus による暗号化ストレージ

## 🏗️ プロジェクト構成

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # 多言語ルーティング
│   │   │   ├── app/           # メインアプリケーション
│   │   │   │   ├── page.tsx   # ホーム画面
│   │   │   │   ├── add/       # 薬追加画面
│   │   │   │   ├── card/      # 緊急カード画面
│   │   │   │   ├── settings/  # 設定画面
│   │   │   │   └── layout.tsx # アプリレイアウト
│   │   │   ├── page.tsx       # ランディングページ
│   │   │   └── layout.tsx     # ロケールレイアウト
│   │   ├── page.tsx           # ルートリダイレクト
│   │   ├── layout.tsx         # ルートレイアウト
│   │   └── globals.css        # グローバルスタイル
│   ├── components/            # 再利用可能なコンポーネント
│   ├── contexts/              # React Context
│   │   └── AppContext.tsx     # グローバルステート管理
│   ├── i18n/                  # 国際化設定
│   │   ├── config.ts          # i18n設定
│   │   └── request.ts         # next-intl設定
│   ├── lib/                   # ユーティリティ
│   │   ├── apiClient.ts       # APIクライアント
│   │   ├── walletService.ts   # ウォレットサービス
│   │   └── themes.ts          # テーマ定義
│   ├── locales/              # 言語リソース
│   │   ├── en/               # 英語
│   │   ├── ja/               # 日本語
│   │   ├── zh/               # 中国語
│   │   ├── fr/               # フランス語
│   │   └── pt/               # ポルトガル語
│   ├── types/                # TypeScript型定義
│   │   └── index.ts
│   └── proxy.ts              # Next.js 16 Proxy (旧middleware)
├── public/                   # 静的ファイル
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 🚀 セットアップ

### 前提条件

- Node.js 20以上
- Bun または npm

### インストール

```bash
# 依存関係のインストール
bun install
# または
npm install
```

### 開発サーバーの起動

```bash
bun dev
# または
npm run dev
```

ブラウザで以下のURLを開きます:
- 英語: [http://localhost:3000/en](http://localhost:3000/en)
- 日本語: [http://localhost:3000/ja](http://localhost:3000/ja)
- 中国語: [http://localhost:3000/zh](http://localhost:3000/zh)
- フランス語: [http://localhost:3000/fr](http://localhost:3000/fr)
- ポルトガル語: [http://localhost:3000/pt](http://localhost:3000/pt)

ルートURL [http://localhost:3000](http://localhost:3000) は自動的に `/en` にリダイレクトされます。

### ビルド

```bash
bun run build
# または
npm run build
```

### 本番サーバーの起動

```bash
bun start
# または
npm start
```

## 📱 画面構成

### 1. ランディングページ (`/`)
- アプリの紹介
- Sui Wallet 接続
- 言語選択

### 2. ホーム画面 (`/app`)
- 服用中の薬一覧プレビュー
- クイックアクション（QRコード追加など）
- 緊急カードへのショートカット

### 3. 薬追加画面 (`/app/add`)
- QRコードスキャン（準備中）
- バーコードスキャン（準備中）
- 手動入力フォーム

### 4. 緊急カード画面 (`/app/card`)
- QRコード生成（医療従事者との共有用）
- 薬リスト表示
- PDF ダウンロード / 印刷機能

### 5. 設定画面 (`/app/settings`)
- テーマ選択
- 言語切り替え
- プライバシー設定（匿名データ提供）
- Walrus ストレージステータス
- ウォレット情報

## 🎨 テーマシステム

4つのプリセットテーマを用意：

1. **Classic Blue**: 医療的な信頼感を表現する青ベースのテーマ
2. **Mint Clinic**: やさしいミントグリーンのクリニック風テーマ
3. **Sakura Notebook**: 桜色をベースにした和風テーマ
4. **Midnight Travel**: ダークモードに対応したインディゴテーマ

テーマは設定画面から変更可能で、LocalStorageに保存されます。

## 🌍 多言語対応

next-intl を使用して以下の言語に対応：

- 🇬🇧 English (en)
- 🇯🇵 日本語 (ja)
- 🇨🇳 中文 (zh)
- 🇫🇷 Français (fr)
- 🇧🇷 Português (pt)

言語ファイルは `src/locales/{locale}/common.json` に配置されています。

## 🔧 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **i18n**: next-intl
- **Icons**: lucide-react
- **State Management**: React Context API
- **Package Manager**: Bun
- **Linter/Formatter**: Biome

## 🔐 セキュリティとプライバシー

- **暗号化**: すべての薬データは Walrus に暗号化して保存
- **アクセス制御**: Seal による鍵管理で一時的なアクセス権限を発行
- **ブロックチェーン**: Sui ブロックチェーンで透明性とセキュリティを確保
- **匿名化**: 研究用データは完全に匿名化

## 📝 開発ガイドライン

### コーディングスタイル

```bash
# コードチェック
bun run lint

# フォーマット
bun run check
```

### 新しい画面の追加

1. `src/app/app/{screen-name}/page.tsx` を作成
2. `AppLayout` の下部ナビゲーションにボタンを追加（必要に応じて）
3. 必要な i18n キーを `src/locales/*/common.json` に追加

### 新しいテーマの追加

1. `src/lib/themes.ts` に新しいテーマを定義
2. `src/types/index.ts` の `ThemeId` 型を更新
3. 各言語の `themes` セクションにテーマ名を追加

## 🔮 今後の実装予定

- [ ] 実際の Sui Wallet 統合
- [ ] QRコード・バーコードスキャン機能
- [ ] Walrus / Seal との実際の連携
- [ ] オフラインサポート（PWA化）
- [ ] 薬の服用リマインダー
- [ ] 服用履歴の可視化
- [ ] 医師との共有機能の強化

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🤝 貢献

プルリクエストを歓迎します！大きな変更を行う場合は、まず Issue を開いて変更内容について議論してください。
