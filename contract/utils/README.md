# Fight Moments CLI Tool

Fight Momentsコントラクトのデプロイと管理を行う対話式CLIツールです。

## 📋 必要要件

- **Sui CLI**: バージョン 1.60.0以上
  - インストール: https://docs.sui.io/build/install
- **jq**: JSON解析用
  - macOS: `brew install jq`
  - Ubuntu: `sudo apt-get install jq`

## 🚀 使い方

### 1. CLIツールの起動

```bash
cd contracts/utils
./cli.sh
```

### 2. ネットワーク選択

起動後、まずネットワークを選択します：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  利用可能なネットワーク
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. devnet
      RPC: https://fullnode.devnet.sui.io:443
  2. testnet
      RPC: https://fullnode.testnet.sui.io:443
  3. local
      RPC: http://127.0.0.1:9000

選択してください: 1
```

### 3. コマンド選択

ネットワーク選択後、実行するコマンドを選択します：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  コマンド選択 (現在: devnet)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. deploy - コントラクトをデプロイ
2. sync-frontend-env - フロントエンド環境変数を同期
9. ネットワーク変更
0. 終了

選択してください: 1
```

## 📦 コマンド詳細

### deploy - コントラクトのデプロイ

初回デプロイまたはコントラクトの再デプロイを行います。

#### 実行フロー

1. **デプロイ前確認**
   - ネットワーク情報の表示
   - アドレス確認
   - contracts ディレクトリの確認

2. **パラメータ入力**
   - ガス予算（デフォルト: 100000000）

3. **確認プロンプト**
   - 入力内容の確認

4. **デプロイ実行**
   - `sui client publish` の実行
   - JSON出力の保存

5. **結果解析**
   - PACKAGE_ID の抽出
   - ADMIN_CAP_ID の抽出
   - UPGRADE_CAP_ID の抽出
   - TRANSFER_POLICY_ID の抽出
   - MINTABLE_MOMENT_ID の抽出

6. **環境変数更新**
   - `.env.{network}` ファイルの自動更新
   - バックアップの作成

#### 出力例

```
✅ デプロイ成功！

📦 PACKAGE_ID:
   0xabc123...

🔑 ADMIN_CAP_ID:
   0xdef456...

⬆️  UPGRADE_CAP_ID:
   0x123abc...

🔄 TRANSFER_POLICY_ID:
   0x456def...

🎯 MINTABLE_MOMENT_ID:
   0x789ghi...

────────────────────────────────────────
環境変数ファイル: .env.devnet
────────────────────────────────────────
```

### sync-frontend-env - フロントエンド環境変数の同期

契約環境変数（`.env.{network}`）をフロントエンド環境変数（`frontend/.env`）に同期します。

#### 実行フロー

1. **同期前確認**
   - フロントエンドディレクトリの確認
   - frontend/.env の存在確認
   - 契約環境変数ファイルの確認

2. **確認プロンプト**
   - 同期内容の確認

3. **バックアップ作成**
   - frontend/.env のバックアップ（タイムスタンプ付き）

4. **環境変数同期**
   - 以下のマッピングで環境変数を更新:
     - `NETWORK` → `NEXT_PUBLIC_SUI_NETWORK`
     - `RPC_URL` → `NEXT_PUBLIC_SUI_RPC_URL`
     - `PACKAGE_ID` → `NEXT_PUBLIC_PACKAGE_ID`
     - `TRANSFER_POLICY_ID` → `NEXT_PUBLIC_TRANSFER_POLICY_ID`
     - `ADMIN_CAP_ID` → `NEXT_PUBLIC_ADMIN_CAP_ID`

5. **同期結果表示**
   - 更新された環境変数の一覧表示

#### 出力例

```
✅ フロントエンド .env を更新しました:
  [更新] NEXT_PUBLIC_SUI_NETWORK=devnet
  [更新] NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.devnet.sui.io:443
  [更新] NEXT_PUBLIC_PACKAGE_ID=0xabc123...
  [更新] NEXT_PUBLIC_TRANSFER_POLICY_ID=0x456def...
  [更新] NEXT_PUBLIC_ADMIN_CAP_ID=0xdef456...
```

#### 必要要件

- **Python3**: 環境変数のマッピング処理に使用
  - macOS: デフォルトでインストール済み
  - Ubuntu: `sudo apt-get install python3`

#### 使用タイミング

- デプロイ後、フロントエンドに環境変数を反映したいとき
- ネットワークを切り替えた後
- 環境変数が更新された後

## 📁 ファイル構成

```
contracts/utils/
├── cli.sh                    # メインスクリプト
├── .env.devnet              # devnet環境変数（自動生成）
├── .env.testnet             # testnet環境変数（自動生成）
├── .gitignore               # Git除外設定
├── command/                  # コマンド実装
│   ├── deploy.sh            # デプロイコマンド
│   └── sync-frontend-env.sh # フロントエンド環境変数同期
├── lib/                      # 共通ライブラリ
│   ├── logging.sh           # ログ出力
│   ├── input.sh             # 入力処理
│   ├── network.sh           # ネットワーク管理
│   ├── env_manager.sh       # 環境変数管理
│   └── json_parser.sh       # デプロイJSON解析（新規）
└── logs/                     # ログ保存ディレクトリ
    ├── cli_*.log            # CLIログ
    ├── deploy_*.log         # デプロイログ
    └── deploy_*.json        # デプロイJSON出力
```

## 🔧 環境変数ファイル

デプロイ後、`.env.{network}` ファイルに以下の環境変数が自動で設定されます：

```bash
# Network Configuration
NETWORK=devnet
RPC_URL=https://fullnode.devnet.sui.io:443
ACTIVE_ADDRESS=0xe8d3d297...

# Package
PACKAGE_ID=0xabc123...

# Admin
ADMIN_CAP_ID=0xdef456...

# Upgrade
UPGRADE_CAP_ID=0x123abc...

# Objects
TRANSFER_POLICY_ID=0x456def...
MINTABLE_MOMENT_ID=0x789ghi...

# Clock (System Object)
CLOCK_ID=0x0000000000000000000000000000000000000000000000000000000000000006
```

## 📝 ログファイル

すべての操作はログファイルに記録されます：

- **CLIログ**: `logs/cli_{timestamp}.log`
- **デプロイログ**: `logs/deploy_{network}_{timestamp}.log`
- **デプロイJSON**: `logs/deploy_{network}_{timestamp}.json`

## 🔐 セキュリティ

- 秘密鍵はCLI内で扱いません（Sui CLIの既存設定を利用）
- `.env.*` ファイルは `.gitignore` に含まれています
- ログファイルも `.gitignore` に含まれています
- 環境変数ファイルは自動でバックアップされます

## 🚧 今後の拡張予定

以下のコマンドを将来追加予定です：

- **upgrade**: コントラクトのアップグレード
- **register-moment**: 新しいモーメントの登録
- **mint**: NFTのミント
- **deactivate**: モーメントの無効化
- **reactivate**: モーメントの再有効化
- **show-env**: 環境変数の表示

## 🐛 トラブルシューティング

### Sui CLI が見つからない

```bash
# Sui CLIをインストール
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui
```

### jq が見つからない

```bash
# macOS
brew install jq

# Ubuntu
sudo apt-get install jq
```

### 権限エラー

```bash
# スクリプトに実行権限を付与
chmod +x cli.sh
```

### ネットワーク切り替えエラー

```bash
# Sui CLIでネットワーク一覧を確認
sui client envs

# ネットワークを手動で切り替え
sui client switch --env devnet
```

## 📚 参考

- [Sui Documentation](https://docs.sui.io/)
- [Sui CLI Reference](https://docs.sui.io/references/cli)
- [Move Language](https://move-language.github.io/move/)
