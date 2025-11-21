# 🎨 Sui ウォレット接続UI実装ガイド

このドキュメントは、別のプロジェクトで同じウォレット接続UIを実装するための完全なガイドです。

## 📢 AIへの説明文（プロンプトテンプレート）

```markdown
# Sui ウォレット接続UIの実装依頼

## 概要
Sui blockchain用のモダンなウォレット接続UIを実装してください。
@mysten/dapp-kit v0.19.7を使用し、以下の仕様に従ってください。

## UI/UX仕様

### 1. ヘッダーボタン（未接続時）
- ピクセルアート風の「Connect Wallet」画像ボタンを表示
- クリックで接続モーダルまたはドロップダウンを表示
- ホバー時に軽くスケール（scale-105）
- imageRendering: "pixelated" スタイルを適用

### 2. ヘッダーボタン（接続済み時）
- ウォレットアドレスを短縮形式で表示（例: 0xe8d3...04ef）
- 青色の丸みを帯びたボタンスタイル
- クリックでウォレット詳細パネルをドロップダウン表示
- レスポンシブ：モバイルは画面中央、デスクトップは右上配置

### 3. 接続済みパネル（ConnectedWalletPanel）
**構造**:
```
┌─────────────────────────────┐
│ Connected                    │
├─────────────────────────────┤
│ 0xe8d3...04ef   [📋] [🔗]   │
├─────────────────────────────┤
│   [DISCONNECT ボタン]        │
├─────────────────────────────┤
│ Wallets                      │
│ ● 0xe8d3...04ef (選択中)    │
│ ○ 0x09fa...77c2              │
└─────────────────────────────┘
```

**機能要件**:
- ✅ "Connected" ステータス表示
- ✅ 現在のアドレス表示（短縮形式）
- ✅ コピーボタン（クリップボードコピー + 成功フィードバック）
- ✅ エクスプローラーリンクボタン（Sui Scanへ遷移）
- ✅ DISCONNECTボタン（青色、全幅）
- ✅ 複数ウォレットがある場合のみ「Wallets」セクション表示
- ✅ アカウント一覧と切り替え機能
- ✅ アクティブアカウントのハイライト表示

### 4. スタイリング要件
- **フレームワーク**: Tailwind CSS
- **カラーパレット**:
  - Primary: blue-500, blue-600, blue-700
  - Background: gray-50, gray-100
  - Success: green-500
- **フォント**: "Pixelify Sans" または類似のピクセルフォント
- **アニメーション**:
  - ホバー: scale-105, duration-200
  - アクティブ: scale-95
  - トランジション: transition-all
- **レスポンシブ**:
  - モバイル: fixed left-1/2 top-20 -translate-x-1/2
  - デスクトップ: absolute right-0 top-full mt-2

### 5. アクセシビリティ要件
- ✅ aria-label属性の適切な使用
- ✅ aria-expanded状態管理
- ✅ role="presentation"のセマンティック対応
- ✅ キーボードナビゲーション（Escapeキーで閉じる）

### 6. 技術要件
**必須ライブラリ**:
- @mysten/dapp-kit: ^0.19.7
- @mysten/sui: ^1.43.2
- @tanstack/react-query: ^5.83.0
- React: ^19.0.0
- Next.js: ^15.3.2

**必須フック**:
- useCurrentAccount()
- useCurrentWallet()
- useAccounts()
- useSwitchAccount()
- useDisconnectWallet()

**プロバイダー構成**:
```tsx
<SuiClientProvider>
  <QueryClientProvider>
    <WalletProvider>
      {children}
    </WalletProvider>
  </QueryClientProvider>
</SuiClientProvider>
```

## 実装するコンポーネント

1. **WalletButton.tsx** - メインの統合ボタンコンポーネント
2. **ConnectedWalletPanel.tsx** - 接続後の詳細パネル
3. **SuiProvider.tsx** - プロバイダー設定ラッパー

## 期待される動作

1. 未接続時: ピクセルアート画像ボタン表示
2. クリック: @mysten/dapp-kitのConnectModal表示
3. 接続成功: ボタンがアドレス表示に変化
4. アドレスクリック: ConnectedWalletPanel表示
5. コピーボタン: アドレスをクリップボードにコピー + 緑色の成功表示
6. エクスプローラーボタン: 新しいタブでSui Scan開く
7. DISCONNECT: ウォレット切断 + パネル閉じる
8. 複数ウォレット: 切り替え可能なリスト表示
9. Escapeキー: パネルを閉じる
10. 外部クリック: パネルを閉じる

## 出力形式
完全な実装可能なTypeScriptコードを、以下のファイル構成で提供してください:
- src/components/wallet/WalletButton.tsx
- src/components/wallet/ConnectedWalletPanel.tsx
- src/providers/SuiProvider.tsx
```

---

## 🛠️ ステップバイステップ実装ガイド

### ステップ 1: 依存関係のインストール

```bash
# 必須パッケージ
npm install @mysten/dapp-kit@^0.19.7 \
            @mysten/sui@^1.43.2 \
            @tanstack/react-query@^5.83.0

# Next.js + React (既存プロジェクトの場合はスキップ)
npm install next@^15.3.2 react@^19.0.0 react-dom@^19.0.0

# Tailwind CSS (既存プロジェクトの場合はスキップ)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### ステップ 2: Tailwind CSS設定

**tailwind.config.js**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Pixelify Sans"', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

**src/app/globals.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Google Fontsからピクセルフォントをインポート */
@import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap');

:root {
  --background: #e0f7ff;
  --foreground: #333;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: 'Pixelify Sans', monospace;
}

/* @mysten/dapp-kit のスタイルをインポート */
@import '@mysten/dapp-kit/dist/index.css';
```

### ステップ 3: プロバイダー設定

**src/providers/SuiProvider.tsx**
```typescript
"use client";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// ネットワーク設定
const networks = {
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

// React Query クライアント設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分間キャッシュ
      retry: 3, // 最大3回リトライ
      refetchOnWindowFocus: false,
    },
  },
});

interface SuiProviderProps {
  children: ReactNode;
}

export function SuiProvider({ children }: SuiProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="mainnet">
        <WalletProvider
          autoConnect
          // SlushWallet統合（オプション）
          preferredWallets={[
            "Slush Wallet",
            "Sui Wallet",
            "Suiet Wallet",
          ]}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

**app/layout.tsx への統合**
```typescript
import { SuiProvider } from "@/providers/SuiProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <SuiProvider>
          {children}
        </SuiProvider>
      </body>
    </html>
  );
}
```

### ステップ 4: ConnectedWalletPanel コンポーネント

**src/components/wallet/ConnectedWalletPanel.tsx**
```typescript
"use client";

import { useCurrentAccount, useAccounts, useSwitchAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { Copy, ExternalLink, Check } from "lucide-react";
import { useState } from "react";

interface ConnectedWalletPanelProps {
  onClose: () => void;
}

export function ConnectedWalletPanel({ onClose }: ConnectedWalletPanelProps) {
  const currentAccount = useCurrentAccount();
  const allAccounts = useAccounts();
  const { mutate: switchAccount } = useSwitchAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [copied, setCopied] = useState(false);

  if (!currentAccount) return null;

  // アドレス短縮関数
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // コピー処理
  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // エクスプローラーで開く
  const handleExplorer = () => {
    window.open(
      `https://suiscan.xyz/mainnet/account/${currentAccount.address}`,
      "_blank"
    );
  };

  // 切断処理
  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  // アカウント切り替え
  const handleSwitchAccount = (address: string) => {
    const account = allAccounts.find((acc) => acc.address === address);
    if (account) {
      switchAccount({ account });
    }
  };

  const hasMultipleAccounts = allAccounts.length > 1;

  return (
    <div
      className="fixed left-1/2 top-20 -translate-x-1/2
        sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 sm:top-full sm:mt-2
        w-80 bg-white rounded-lg shadow-xl border-2 border-gray-200
        font-pixel z-50"
      role="dialog"
      aria-label="接続済みウォレット情報"
    >
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-sm text-gray-600 font-semibold">Connected</p>
      </div>

      {/* 現在のアドレス */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-base font-mono font-semibold">
            {formatAddress(currentAccount.address)}
          </span>
          <div className="flex gap-2">
            {/* コピーボタン */}
            <button
              onClick={handleCopy}
              className={`p-2 rounded hover:bg-gray-100 transition-colors
                ${copied ? "text-green-500" : "text-gray-600"}`}
              aria-label="アドレスをコピー"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            {/* エクスプローラーボタン */}
            <button
              onClick={handleExplorer}
              className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="エクスプローラーで表示"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* DISCONNECT ボタン */}
      <div className="px-4 py-3 border-b border-gray-200">
        <button
          onClick={handleDisconnect}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600
            text-white font-bold rounded transition-colors
            hover:scale-105 active:scale-95 duration-200"
        >
          DISCONNECT
        </button>
      </div>

      {/* 複数ウォレットセクション */}
      {hasMultipleAccounts && (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-600 font-semibold mb-2">Wallets</p>
          <div className="space-y-1">
            {allAccounts.map((account) => {
              const isActive = account.address === currentAccount.address;
              return (
                <button
                  key={account.address}
                  onClick={() => handleSwitchAccount(account.address)}
                  className={`w-full px-3 py-2 rounded text-left font-mono text-sm
                    transition-colors flex items-center gap-2
                    ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                >
                  <span className="flex-shrink-0">
                    {isActive ? "●" : "○"}
                  </span>
                  <span className="truncate">
                    {formatAddress(account.address)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

### ステップ 5: WalletButton メインコンポーネント

**src/components/wallet/WalletButton.tsx**
```typescript
"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import { ConnectedWalletPanel } from "./ConnectedWalletPanel";
import { ChevronDown } from "lucide-react";

interface WalletButtonProps {
  size?: "small" | "medium" | "large";
}

export function WalletButton({ size = "medium" }: WalletButtonProps) {
  const currentAccount = useCurrentAccount();
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // アドレス短縮
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 外部クリックでパネルを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPanel]);

  // Escapeキーでパネルを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showPanel]);

  // サイズクラス
  const sizeClasses = {
    small: "text-sm px-3 py-1.5",
    medium: "text-base px-4 py-2",
    large: "text-lg px-6 py-3",
  };

  // 未接続時
  if (!currentAccount) {
    return (
      <ConnectButton
        connectText="Connect Wallet"
        className="font-pixel"
      />
    );
  }

  // 接続済み時
  return (
    <div className="relative" ref={buttonRef}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`${sizeClasses[size]} bg-blue-500 hover:bg-blue-600
          text-white font-bold rounded-lg flex items-center gap-2
          transition-all duration-200 hover:scale-105 active:scale-95
          shadow-md hover:shadow-lg font-pixel border-2 border-blue-700`}
        aria-expanded={showPanel}
        aria-label="ウォレット情報を表示"
      >
        <span className="font-mono">
          {formatAddress(currentAccount.address)}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200
            ${showPanel ? "rotate-180" : ""}`}
        />
      </button>

      {showPanel && (
        <div ref={panelRef}>
          <ConnectedWalletPanel onClose={() => setShowPanel(false)} />
        </div>
      )}
    </div>
  );
}
```

### ステップ 6: アイコンライブラリのインストール（オプション）

上記のコードでは `lucide-react` を使用しています：

```bash
npm install lucide-react
```

または、シンプルなSVGアイコンに置き換えることも可能です。

### ステップ 7: 使用方法

**ヘッダーコンポーネントで使用**
```typescript
import { WalletButton } from "@/components/wallet/WalletButton";

export function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>My Sui dApp</h1>
      <WalletButton size="small" />
    </header>
  );
}
```

---

## 🎨 カスタマイズガイド

### 1. カラーテーマの変更

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6', // blue-500
          hover: '#2563eb',   // blue-600
          border: '#1d4ed8',  // blue-700
        },
      },
    },
  },
}
```

### 2. エクスプローラーURLの変更

```typescript
// 異なるネットワークやエクスプローラーを使用する場合
const handleExplorer = () => {
  const network = "testnet"; // または "devnet"
  window.open(
    `https://suiscan.xyz/${network}/account/${currentAccount.address}`,
    "_blank"
  );
};
```

### 3. ピクセルアート画像ボタンの追加

未接続時にカスタム画像を使用する場合：

```typescript
if (!currentAccount) {
  return (
    <button
      onClick={() => {/* ConnectModalを開く処理 */}}
      className="hover:scale-105 active:scale-95 transition-transform"
      style={{ imageRendering: "pixelated" }}
    >
      <img
        src="/button/connectwallet.png"
        alt="Connect Wallet"
        className="h-10 w-auto"
        style={{ imageRendering: "pixelated" }}
      />
    </button>
  );
}
```

### 4. 複数ネットワーク対応

```typescript
// SuiProvider.tsx
export function SuiProvider({ children, defaultNetwork = "mainnet" }: Props) {
  return (
    <SuiClientProvider networks={networks} defaultNetwork={defaultNetwork}>
      {/* ... */}
    </SuiClientProvider>
  );
}
```

---

## 🐛 トラブルシューティング

### 問題 1: "Module not found: @mysten/dapp-kit"

**解決策**:
```bash
npm install @mysten/dapp-kit@^0.19.7 --save
rm -rf node_modules package-lock.json
npm install
```

### 問題 2: スタイルが適用されない

**解決策**:
1. `globals.css` に `@import '@mysten/dapp-kit/dist/index.css';` があるか確認
2. Tailwind CSS の `content` 配列にコンポーネントのパスが含まれているか確認

### 問題 3: ウォレットが自動接続されない

**解決策**:
`WalletProvider` に `autoConnect` プロパティを追加：
```typescript
<WalletProvider autoConnect>
```

### 問題 4: TypeScript型エラー

**解決策**:
```bash
npm install --save-dev @types/react @types/node
```

---

## 📚 参考リソース

- [@mysten/dapp-kit 公式ドキュメント](https://sdk.mystenlabs.com/dapp-kit)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
- [React Query ドキュメント](https://tanstack.com/query/latest)

---

## 🔗 このプロジェクトの実装参照

### 主要ファイル

- **WalletButton**: `src/components/wallet/WalletButton.tsx`
- **ConnectedWalletPanel**: `src/components/wallet/ConnectedWalletPanel.tsx`
- **SuiProvider**: `src/providers/SuiProvider.tsx`
- **Header統合**: `src/components/layout/Header.tsx`

### ライブラリバージョン

```json
{
  "@mysten/dapp-kit": "^0.19.7",
  "@mysten/sui": "^1.43.2",
  "@tanstack/react-query": "^5.83.0",
  "next": "15.3.2",
  "react": "^19.0.0"
}
```

---

**作成日**: 2025年11月
**対象プロジェクト**: Inuverse
**ベースバージョン**: @mysten/dapp-kit v0.19.7
