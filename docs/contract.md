# Cure Pocket - Medical Passport SBT スマートコントラクト要件定義書

**バージョン**: v1.1
**ステータス**: 実装済み（コア機能 + Sealアクセス制御）

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [データ構造仕様](#3-データ構造仕様)
4. [機能要件](#4-機能要件)
5. [非機能要件](#5-非機能要件)
6. [API仕様](#6-api仕様)
7. [エラーコード](#7-エラーコード)
8. [バリデーション・制約条件](#8-バリデーション制約条件)
9. [テスト仕様](#9-テスト仕様)
10. [実装済み機能](#10-実装済み機能)
11. [今後の拡張計画](#11-今後の拡張計画)
12. [変更履歴](#12-変更履歴)

---

## 1. プロジェクト概要

### 1.1 ビジョン

Cure Pocketは、**世界中どこでも使える個人用ヘルスパスポートシステム**です。

薬・検査値・レントゲン画像・手術歴・アレルギー・病歴などの医療情報を暗号化してWalrusに保存し、Sui上のSBT（Soulbound Token）で所有権を管理する分散型ヘルスデータ基盤を提供します。

### 1.2 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| **ブロックチェーン** | Sui（Move言語） | 所有権管理、アクセス制御 |
| **ストレージ** | Walrus | 暗号化医療データ保存 |
| **暗号化** | Seal | 暗号鍵管理、アクセス制御 |
| **フロントエンド** | Next.js 16 + TypeScript | ユーザーインターフェース |

### 1.3 主要特性

- **Soulbound（譲渡不可）**: パスポートは発行後、譲渡できない
- **1ウォレット1枚制約**: 1つのウォレットアドレスに対して1枚のみ
- **プライバシー保護**: 医療データはオフチェーン暗号化保存
- **グローバル対応**: 国際標準準拠（ISO 3166-1 alpha-2）
- **回復可能**: ウォレット紛失時の管理者による移行機能

---

## 2. システムアーキテクチャ

### 2.1 モジュール構成

```mermaid
graph TB
    subgraph "Sui Blockchain"
        CP[cure_pocket<br/>パッケージルート]
        MP[medical_passport<br/>コアロジック]
        ACC[medical_passport_accessor<br/>公開API]
        ADM[admin<br/>管理者API]
        SEAL_ACC[seal_accessor<br/>Sealアクセス制御]
    end

    subgraph "External Systems"
        WALRUS[Walrus<br/>暗号化データ保存]
        SEAL[Seal<br/>暗号鍵管理]
    end

    subgraph "Frontend"
        UI[Next.js UI]
    end

    CP --> MP
    CP --> ACC
    CP --> ADM
    ACC --> MP
    ACC --> SEAL_ACC
    ADM --> MP
    SEAL_ACC --> MP
    UI --> ACC
    UI --> ADM
    SEAL -.dry_run.-> SEAL_ACC
    MP -.参照.-> WALRUS
    MP -.参照.-> SEAL

    style CP fill:#e1f5ff
    style MP fill:#fff4e1
    style ACC fill:#e8f5e9
    style ADM fill:#fce4ec
    style SEAL_ACC fill:#fff9c4
```

### 2.2 Move 2024準拠設計（AGENTS.md）

| モジュール | ファイル | 責務 | 可視性スコープ |
|-----------|---------|------|---------------|
| **cure_pocket** | `cure_pocket.move` | パッケージ初期化、AdminCap管理 | パッケージルート |
| **medical_passport** | `medical_passport.move` | コアロジック、データ構造定義 | 内部実装（`public(package)`） |
| **medical_passport_accessor** | `accessor.move` | 公開API（getter、mint、Sealアクセス制御） | 外部インターフェース（`public`、`entry`） |
| **admin** | `admin.move` | 管理者専用操作（管理mint、移行） | 管理者API（`public`） |
| **seal_accessor** | `seal_accessor.move` | Sealアクセス制御ロジック | 内部実装（`public(package)`） |

**設計原則**:
- すべての`public fun`と`entry fun`は`accessor.move`に集約
- AdminCap必須の操作は`admin.move`に分離
- 内部ロジックは`medical_passport.move`に集約し、`public(package)`スコープで管理
- `public(friend)`は使用しない（Move 2024非推奨）

### 2.3 データフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as Next.js UI
    participant ACC as accessor.move
    participant MP as medical_passport.move
    participant REG as PassportRegistry
    participant WALRUS as Walrus
    participant SEAL as Seal

    User->>UI: 医療データ登録
    UI->>WALRUS: 暗号化データアップロード
    WALRUS-->>UI: blob_id
    UI->>SEAL: 暗号鍵生成
    SEAL-->>UI: seal_id
    UI->>ACC: mint_medical_passport(blob_id, seal_id, country_code)
    ACC->>REG: has_passport確認
    REG-->>ACC: false
    ACC->>MP: create_passport_internal
    MP-->>ACC: MedicalPassport
    ACC->>MP: transfer_to(ユーザーアドレス)
    ACC->>REG: register_passport_with_id(passport_id, user_address)
    ACC-->>UI: 成功
    UI-->>User: パスポート発行完了
```

---

## 3. データ構造仕様

### 3.1 MedicalPassport（医療パスポートSBT）

```move
public struct MedicalPassport has key {
    id: object::UID,
    walrus_blob_id: String,
    seal_id: String,
    country_code: String,
}
```

#### フィールド仕様

| フィールド | 型 | 説明 | 制約 |
|-----------|----|----|------|
| `id` | `object::UID` | Suiオブジェクト識別子 | 自動生成 |
| `walrus_blob_id` | `String` | Walrus上の暗号化医療データID | 非空文字列 |
| `seal_id` | `String` | Seal暗号化システムの鍵/ポリシーID | 非空文字列 |
| `country_code` | `String` | 発行国コード（ISO 3166-1 alpha-2） | 非空文字列（例: "JP", "US"） |

#### Soulbound実装の仕組み

**特性**: `has key`のみ（`has store`なし）

```move
// 以下の関数は存在しない（コンパイルエラー）
public fun transfer(passport: MedicalPassport, recipient: address)
```

**譲渡不可の保証**:
1. `has store`能力を持たないため、`sui::transfer::public_transfer()`で転送不可
2. `transfer_to()`関数は`public(package)`スコープのため、モジュール外から呼び出し不可
3. この2つの制約により、mint後は所有者以外に譲渡できない

---

### 3.2 PassportRegistry（1ウォレット1枚制約管理）

```move
public struct PassportRegistry has key {
    id: object::UID,
}
```

#### 役割

- **共有オブジェクト**（shared object）として1つだけ存在
- Dynamic Fieldsで`address -> object::ID`の対応を管理
- すべてのmint操作は`&mut PassportRegistry`を受け取る

#### 制約保証の仕組み

```mermaid
graph LR
    A[mint要求] --> B{has_passport?}
    B -->|true| C[abort: E_ALREADY_HAS_PASSPORT]
    B -->|false| D[create_passport_internal]
    D --> E[transfer_to]
    E --> F[register_passport_with_id]
    F --> G[成功]
```

**競合防止**:
- 共有オブジェクトの`&mut`参照により、同時mint時の競合を防止
- `has_passport()`で既存チェック、`register_passport_with_id()`で登録
- 同じアドレスへの二重mintは`E_ALREADY_HAS_PASSPORT`でabort

#### Dynamic Fields設計

```
PassportRegistry.id (UID)
  |-- [address1] -> object::ID (passport_id_1)
  |-- [address2] -> object::ID (passport_id_2)
  +-- [address3] -> object::ID (passport_id_3)
```

**設計の利点**:
- `address -> object::ID`マッピングにより、特定のパスポートがどのアドレスのものかを確認可能
- `is_passport_owner()`関数で、特定のパスポートIDが指定アドレスのものかを検証可能（Sealアクセス制御で使用）

---

### 3.4 AdminCap（管理者権限）

```move
public struct AdminCap has key, store {
    id: object::UID
}
```

#### 特性

- `has key, store`を持つため**譲渡可能**
- パッケージデプロイ時に1つ生成され、デプロイヤーに付与
- 所有していること自体が権限の証明となる

#### 初期化フロー

```move
fun init(ctx: &mut tx_context::TxContext) {
    // AdminCap を生成してデプロイヤーに転送
    let admin = AdminCap {
        id: object::new(ctx)
    };
    sui::transfer::public_transfer(admin, tx_context::sender(ctx));

    // PassportRegistry を生成して共有オブジェクトとして公開
    medical_passport::create_and_share_passport_registry(ctx);
}
```

---

### 3.5 PassportMigrationEvent（移行イベント）

```move
public struct PassportMigrationEvent has copy, drop {
    old_owner: address,
    new_owner: address,
    passport_id: object::ID,
    walrus_blob_id: String,
    timestamp_ms: u64,
}
```

#### フィールド仕様

| フィールド | 型 | 説明 |
|-----------|----|----|
| `old_owner` | `address` | 移行元ウォレットアドレス |
| `new_owner` | `address` | 移行先ウォレットアドレス |
| `passport_id` | `object::ID` | 移行されたパスポートのオブジェクトID |
| `walrus_blob_id` | `String` | 継承されたWalrus blob ID |
| `timestamp_ms` | `u64` | 移行実行時刻（Unix timestamp, ミリ秒） |

#### 用途

- 管理者によるパスポート移行の記録
- 監査証跡（audit trail）として使用
- オフチェーンでの移行履歴追跡

---

## 4. 機能要件

### FR-1: パスポート発行（Mint）

**要件ID**: FR-1
**優先度**: Critical
**ステータス**: 実装済み

#### 概要

ユーザーが自身の医療パスポートSBTを発行できる機能。

#### 詳細要件

- **FR-1.1**: 誰でもセルフmintできる（AdminCap不要）
- **FR-1.2**: 1ウォレット1枚まで（二重mint禁止）
- **FR-1.3**: 必須フィールド: `walrus_blob_id`, `seal_id`, `country_code`（すべて非空文字列）
- **FR-1.4**: mint後のパスポートはSoulbound（譲渡不可）
- **FR-1.5**: mint後のパスポートはユーザーアドレスに自動転送

#### 動作フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant ACC as accessor.move
    participant MP as medical_passport.move
    participant REG as PassportRegistry

    User->>ACC: mint_medical_passport(registry, blob_id, seal_id, country_code)
    ACC->>REG: has_passport(user_address)?
    alt 既に所持
        REG-->>ACC: true
        ACC-->>User: abort: E_ALREADY_HAS_PASSPORT
    else 未所持
        REG-->>ACC: false
        ACC->>MP: create_passport_internal
        MP->>MP: バリデーション（非空文字列）
        alt バリデーションエラー
            MP-->>ACC: abort: E_EMPTY_*
        else OK
            MP-->>ACC: MedicalPassport
            ACC->>MP: transfer_to(user_address)
            ACC->>REG: register_passport_with_id(passport_id, user_address)
            ACC-->>User: 成功
        end
    end
```

#### 受け入れ基準

- ユーザーは1回のみmint可能
- 二重mintは`E_ALREADY_HAS_PASSPORT`でabort
- 空文字列は`E_EMPTY_*`でabort
- mint後のパスポートは譲渡不可
- mint後のパスポートはユーザー所有

---

### FR-2: パスポート照会（Getter）

**要件ID**: FR-2
**優先度**: High
**ステータス**: 実装済み

#### 概要

パスポートのフィールド情報を照会できる機能。

#### 詳細要件

- **FR-2.1**: 個別フィールド取得（`walrus_blob_id`, `seal_id`, `country_code`）
- **FR-2.2**: 一括フィールド取得（`get_all_fields`）
- **FR-2.3**: 所有状態確認（`has_passport`）
- **FR-2.4**: すべてのgetter関数はimmutable参照で動作

---

### FR-5: Sealアクセス制御

**要件ID**: FR-5
**優先度**: Critical
**ステータス**: 実装済み

#### 概要

Sealキーサーバーからの復号リクエストに対するアクセス制御機能。患者本人のみが自分の医療データを復号できることを保証する。

#### 詳細要件

- **FR-5.1**: Sealキーサーバーが`.dry_run_transaction_block`上で実行するentry関数を提供
- **FR-5.2**: パスポート所有者のみが復号リクエストを送信可能
- **FR-5.3**: `PassportRegistry`の`address -> object::ID`マッピングで所有権を検証
- **FR-5.4**: 所有者以外からのリクエストは`E_NO_ACCESS`でabort

#### 動作フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Seal as Sealキーサーバー
    participant ACC as accessor.move
    participant SEAL_ACC as seal_accessor.move
    participant MP as medical_passport.move
    participant REG as PassportRegistry

    User->>Seal: 復号リクエスト（passport_id）
    Seal->>ACC: seal_approve_patient_only(passport, registry, ctx)
    ACC->>SEAL_ACC: seal_approve_patient_only_internal
    SEAL_ACC->>MP: is_passport_owner(registry, passport_id, sender)
    MP->>REG: address -> object::ID マッピング確認
    alt 所有者である
        REG-->>MP: true
        MP-->>SEAL_ACC: true
        SEAL_ACC-->>Seal: 成功（abortしない）
        Seal-->>User: 復号鍵を提供
    else 所有者でない
        REG-->>MP: false
        MP-->>SEAL_ACC: false
        SEAL_ACC-->>Seal: abort: E_NO_ACCESS
        Seal-->>User: アクセス拒否
    end
```

#### 受け入れ基準

- パスポート所有者のみが復号リクエストを送信可能
- 所有者以外からのリクエストは`E_NO_ACCESS`でabort
- Sealキーサーバーは`.dry_run_transaction_block`で検証可能

#### API一覧

| 関数名 | 戻り値 | 用途 |
|--------|--------|------|
| `get_walrus_blob_id` | `&String` | Walrus blob ID取得 |
| `get_seal_id` | `&String` | Seal ID取得 |
| `get_country_code` | `&String` | 国コード取得 |
| `get_all_fields` | `(&String, &String, &String)` | 全フィールド一括取得 |
| `has_passport` | `bool` | 所有状態確認 |

#### 受け入れ基準

- getter関数はパスポートの状態を変更しない
- `has_passport`は正確な所有状態を返す
- 参照のライフタイムが適切に管理される

---

### FR-3: パスポート移行（Migration）

**要件ID**: FR-3
**優先度**: High
**ステータス**: 実装済み

#### 概要

ウォレット紛失時に、管理者がパスポートを新しいウォレットに移行できる機能。

#### 詳細要件

- **FR-3.1**: AdminCapを持つ管理者のみ実行可能
- **FR-3.2**: 移行先はパスポート未所持であること
- **FR-3.3**: データ継承（`walrus_blob_id`, `seal_id`, `country_code`）
- **FR-3.4**: 移行元のパスポートは削除（burn）
- **FR-3.5**: 移行イベントを発行（監査証跡）
- **FR-3.6**: マーカーの原子的更新（移行元削除、移行先登録）

#### 動作フロー

```mermaid
sequenceDiagram
    participant Admin as 管理者
    participant ADM as admin.move
    participant MP as medical_passport.move
    participant REG as PassportRegistry
    participant Clock as Clock

    Admin->>ADM: migrate_passport(admin_cap, registry, old_owner, new_owner, passport, clock)
    ADM->>REG: has_passport(new_owner)?
    alt 移行先が既に所持
        REG-->>ADM: true
        ADM-->>Admin: abort: E_MIGRATION_TARGET_HAS_PASSPORT
    else 移行先が未所持
        REG-->>ADM: false
        ADM->>REG: unregister_passport_by_owner(old_owner)
        ADM->>MP: get_passport_data(passport)
        MP-->>ADM: (blob_id, seal_id, country_code)
        ADM->>Clock: timestamp_ms()
        Clock-->>ADM: timestamp
        ADM->>MP: emit_migration_event
        ADM->>MP: burn_passport(passport)
        ADM->>MP: create_passport_internal(blob_id, seal_id, country_code)
        MP-->>ADM: new_passport
        ADM->>MP: transfer_to(new_owner)
        ADM->>REG: register_passport_with_id(new_passport_id, new_owner)
        ADM-->>Admin: 成功
    end
```

#### 受け入れ基準

- AdminCapなしでは実行不可
- 移行先が既にパスポート所持の場合はabort
- データは完全に継承される
- 移行元のパスポートは削除される
- 移行イベントが正しく発行される
- マーカーが正しく更新される

---

### FR-4: 権限管理（AdminCap）

**要件ID**: FR-4
**優先度**: High
**ステータス**: 実装済み

#### 概要

管理者権限を管理する機能。

#### 詳細要件

- **FR-4.1**: AdminCapはデプロイ時に1つ生成
- **FR-4.2**: AdminCapはデプロイヤーに付与
- **FR-4.3**: AdminCapは譲渡可能（`has key, store`）
- **FR-4.4**: AdminCapを必要とする操作は`admin.move`に集約

#### 受け入れ基準

- デプロイ時にAdminCapが生成される
- AdminCapはデプロイヤーが所有
- AdminCapは譲渡可能
- AdminCapなしでは管理者操作は実行不可

---

## 5. 非機能要件

### NFR-1: セキュリティ

**要件ID**: NFR-1
**優先度**: Critical
**ステータス**: 実装済み

#### 詳細要件

- **NFR-1.1**: Soulbound特性（パスポートは譲渡不可）
- **NFR-1.2**: 1ウォレット1枚制約（PassportRegistryで管理）
- **NFR-1.3**: AdminCap必須の管理者操作（権限チェック）
- **NFR-1.4**: バリデーション（非空文字列チェック）

#### 実装方法

| 要件 | 実装方法 |
|------|---------|
| Soulbound | `has store`なし、`transfer_to()`は`public(package)` |
| 1ウォレット1枚 | PassportRegistry + Dynamic Fields + 共有オブジェクト |
| AdminCap | 関数引数で`&AdminCap`を要求 |
| バリデーション | `create_passport_internal()`で非空チェック |

---

### NFR-2: データ整合性

**要件ID**: NFR-2
**優先度**: Critical
**ステータス**: 実装済み

#### 詳細要件

- **NFR-2.1**: すべてのフィールドは非空文字列
- **NFR-2.2**: PassportRegistryは共有オブジェクト（競合防止）
- **NFR-2.3**: 移行時はマーカーの原子的更新（削除→登録）
- **NFR-2.4**: イベント発行による追跡可能性

---

### NFR-3: 監査性

**要件ID**: NFR-3
**優先度**: High
**ステータス**: 実装済み

#### 詳細要件

- **NFR-3.1**: 移行イベント発行（オフチェーン追跡可能）
- **NFR-3.2**: タイムスタンプ記録（Unix timestamp, ミリ秒）
- **NFR-3.3**: 移行元/移行先アドレス記録
- **NFR-3.4**: パスポートID記録

---

### NFR-4: Move 2024準拠

**要件ID**: NFR-4
**優先度**: High
**ステータス**: 実装済み

#### 詳細要件

- **NFR-4.1**: 可視性ルール遵守（`public`, `public(package)`, `entry`）
- **NFR-4.2**: ファイルベース関数配置（AGENTS.md準拠）
- **NFR-4.3**: `public(friend)`非使用（Move 2024非推奨）

---

## 6. API仕様

### 6.1 Public API（accessor.move）

#### 6.1.1 mint_medical_passport（エントリー関数）

```move
entry fun mint_medical_passport(
    registry: &mut PassportRegistry,
    walrus_blob_id: String,
    seal_id: String,
    country_code: String,
    ctx: &mut tx_context::TxContext
)
```

| 項目 | 内容 |
|------|------|
| **権限** | 誰でも呼び出し可能（AdminCap不要） |
| **制約** | 1ウォレット1枚まで |
| **引数** | `registry`: 共有PassportRegistry<br/>`walrus_blob_id`: Walrus blob ID（非空）<br/>`seal_id`: Seal ID（非空）<br/>`country_code`: 国コード（非空） |
| **戻り値** | なし（entryなのでvoid） |
| **副作用** | パスポート作成<br/>tx送信者に転送<br/>Registryに登録 |
| **エラー** | `E_ALREADY_HAS_PASSPORT (4)`: 既に所持<br/>`E_EMPTY_WALRUS_BLOB_ID (1)`: blob_idが空<br/>`E_EMPTY_SEAL_ID (2)`: seal_idが空<br/>`E_EMPTY_COUNTRY_CODE (3)`: country_codeが空 |

**使用例（PTB）**:
```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::medical_passport_accessor::mint_medical_passport`,
  arguments: [
    tx.object(PASSPORT_REGISTRY_ID),
    tx.pure.string("walrus_blob_abc123"),
    tx.pure.string("seal_xyz789"),
    tx.pure.string("JP"),
  ],
});
```

---

#### 6.1.2 Getter関数群

##### get_walrus_blob_id

```move
public fun get_walrus_blob_id(passport: &MedicalPassport): &String
```

| 項目 | 内容 |
|------|------|
| **権限** | 誰でも呼び出し可能 |
| **引数** | `passport`: MedicalPassportへのimmutable参照 |
| **戻り値** | Walrus blob IDへの参照 |

---

##### get_seal_id

```move
public fun get_seal_id(passport: &MedicalPassport): &String
```

| 項目 | 内容 |
|------|------|
| **権限** | 誰でも呼び出し可能 |
| **引数** | `passport`: MedicalPassportへのimmutable参照 |
| **戻り値** | Seal IDへの参照 |

---

##### get_country_code

```move
public fun get_country_code(passport: &MedicalPassport): &String
```

| 項目 | 内容 |
|------|------|
| **権限** | 誰でも呼び出し可能 |
| **引数** | `passport`: MedicalPassportへのimmutable参照 |
| **戻り値** | 国コードへの参照 |

---

##### get_all_fields

```move
public fun get_all_fields(passport: &MedicalPassport): (&String, &String, &String)
```

| 項目 | 内容 |
|------|------|
| **権限** | 誰でも呼び出し可能 |
| **引数** | `passport`: MedicalPassportへのimmutable参照 |
| **戻り値** | `(walrus_blob_id, seal_id, country_code)`のタプル |

---

##### has_passport

```move
public fun has_passport(registry: &PassportRegistry, owner: address): bool
```

| 項目 | 内容 |
|------|------|
| **権限** | 誰でも呼び出し可能 |
| **引数** | `registry`: PassportRegistryへのimmutable参照<br/>`owner`: 確認対象のアドレス |
| **戻り値** | `true`: 所持、`false`: 未所持 |

---

##### seal_approve_patient_only（Sealアクセス制御）

```move
entry fun seal_approve_patient_only(
    passport: &MedicalPassport,
    registry: &PassportRegistry,
    ctx: &tx_context::TxContext
)
```

| 項目 | 内容 |
|------|------|
| **権限** | 誰でも呼び出し可能（Sealキーサーバーが`.dry_run_transaction_block`で実行） |
| **用途** | Sealキーサーバーが復号リクエストを受け取った際のアクセス制御 |
| **引数** | `passport`: MedicalPassportへの参照（パスポートID取得用）<br/>`registry`: PassportRegistryへの参照（所有権確認用）<br/>`ctx`: トランザクションコンテキスト（sender取得用） |
| **戻り値** | なし（entryなのでvoid） |
| **副作用** | なし（検証のみ） |
| **エラー** | `E_NO_ACCESS (102)`: senderが指定パスポートを所有していない（アクセス拒否） |

**動作**:
1. `ctx.sender()`（復号リクエスト送信者）を取得
2. `passport`のIDを取得
3. `PassportRegistry`の`address -> object::ID`マッピングで、特定のパスポートがsenderのものかを確認
4. senderが指定パスポートを所有していなければabort（アクセス拒否）
5. 所有していれば関数終了（アクセス許可）

**使用例（Sealキーサーバー側）**:
```typescript
// Sealキーサーバーが復号リクエストを受け取った際に実行
const result = await suiClient.dryRunTransactionBlock({
  transactionBlock: tx.moveCall({
    target: `${PACKAGE_ID}::medical_passport_accessor::seal_approve_patient_only`,
    arguments: [
      tx.object(passportId),
      tx.object(PASSPORT_REGISTRY_ID),
    ],
  }),
  sender: requestSenderAddress,
});

if (result.effects.status.status === 'success') {
  // アクセス許可: 復号鍵を提供
  return decryptionKey;
} else {
  // アクセス拒否
  throw new Error('Access denied');
}
```

---

### 6.2 Admin API（admin.move）

#### 6.2.1 admin_mint_medical_passport（管理者mint）

```move
public fun admin_mint_medical_passport(
    _admin: &AdminCap,
    registry: &mut PassportRegistry,
    walrus_blob_id: String,
    seal_id: String,
    country_code: String,
    ctx: &mut tx_context::TxContext
)
```

| 項目 | 内容 |
|------|------|
| **権限** | AdminCapを所有している者のみ |
| **機能** | accessor.moveのmintと同じだが、管理者権限が必要 |
| **引数** | `_admin`: AdminCapへの参照（権限証明）<br/>`registry`: 共有PassportRegistry<br/>`walrus_blob_id`: Walrus blob ID（非空）<br/>`seal_id`: Seal ID（非空）<br/>`country_code`: 国コード（非空） |
| **戻り値** | なし |
| **副作用** | パスポート作成<br/>tx送信者に転送<br/>Registryに登録 |
| **エラー** | `E_ALREADY_HAS_PASSPORT (4)`: 既に所持<br/>`E_EMPTY_WALRUS_BLOB_ID (1)`: blob_idが空<br/>`E_EMPTY_SEAL_ID (2)`: seal_idが空<br/>`E_EMPTY_COUNTRY_CODE (3)`: country_codeが空 |

---

#### 6.2.2 migrate_passport（パスポート移行）

```move
public fun migrate_passport(
    _admin: &AdminCap,
    registry: &mut PassportRegistry,
    old_owner: address,
    new_owner: address,
    passport: MedicalPassport,
    clock: &Clock,
    ctx: &mut tx_context::TxContext
)
```

| 項目 | 内容 |
|------|------|
| **権限** | AdminCapを所有している者のみ |
| **用途** | ウォレット紛失時のパスポート移行 |
| **引数** | `_admin`: AdminCapへの参照（権限証明）<br/>`registry`: 共有PassportRegistry<br/>`old_owner`: 移行元アドレス<br/>`new_owner`: 移行先アドレス<br/>`passport`: 移行対象パスポート<br/>`clock`: Sui Clock（タイムスタンプ取得） |
| **戻り値** | なし |
| **副作用** | 移行元マーカー削除<br/>元パスポート削除<br/>新パスポート作成<br/>新パスポート転送<br/>移行先マーカー登録<br/>移行イベント発行 |
| **エラー** | `E_MIGRATION_TARGET_HAS_PASSPORT (5)`: 移行先が既に所持 |

**動作フロー詳細**:
1. 移行先の状態チェック（`has_passport`）
2. 移行元の所有マーカーを削除（`unregister_passport_by_owner`）
3. パスポートデータを取得（`get_passport_data`）
4. 移行イベントを構築・発行（`emit_migration_event`）
5. 元のパスポートを削除（`burn_passport`）
6. 同じデータで新しいパスポートを作成（`create_passport_internal`）
7. 新しいパスポートIDを取得
8. 新しいパスポートを移行先に転送（`transfer_to`）
9. 移行先のパスポートIDを登録（`register_passport_with_id`）

---

### 6.3 Internal API（medical_passport.move）

**スコープ**: `public(package)`（パッケージ内部のみ）

#### 6.3.1 create_passport_internal

```move
public(package) fun create_passport_internal(
    walrus_blob_id: String,
    seal_id: String,
    country_code: String,
    ctx: &mut tx_context::TxContext
): MedicalPassport
```

| 項目 | 内容 |
|------|------|
| **用途** | パスポート作成（バリデーション込み） |
| **バリデーション** | `walrus_blob_id`非空チェック<br/>`seal_id`非空チェック<br/>`country_code`非空チェック |
| **戻り値** | 新しい`MedicalPassport` |

---

#### 6.3.2 transfer_to

```move
public(package) fun transfer_to(passport: MedicalPassport, recipient: address)
```

| 項目 | 内容 |
|------|------|
| **用途** | パスポート転送（内部専用） |
| **Soulbound保証** | `public(package)`により外部から呼び出し不可 |

---

#### 6.3.3 Registry操作

```move
public(package) fun create_and_share_passport_registry(ctx: &mut tx_context::TxContext)
public(package) fun has_passport(registry: &PassportRegistry, owner: address): bool
public(package) fun register_passport_with_id(
    registry: &mut PassportRegistry,
    passport_id: object::ID,
    owner: address
)
public(package) fun unregister_passport_by_owner(registry: &mut PassportRegistry, owner: address)
public(package) fun is_passport_owner(
    registry: &PassportRegistry,
    passport_id: object::ID,
    owner: address
): bool
```

**関数説明**:
- `has_passport`: 指定アドレスがパスポートを所持しているか確認（`address -> object::ID`マッピングの存在チェック）
- `register_passport_with_id`: パスポートIDとアドレスの対応を登録（`address -> object::ID`マッピングを追加）
- `unregister_passport_by_owner`: 指定アドレスのマッピングを削除
- `is_passport_owner`: 特定のパスポートIDが指定アドレスのものかを確認（Sealアクセス制御で使用）

---

#### 6.3.4 移行サポート

```move
public(package) fun get_passport_data(passport: &MedicalPassport): (String, String, String)
public(package) fun burn_passport(passport: MedicalPassport)
public(package) fun emit_migration_event(
    old_owner: address,
    new_owner: address,
    passport_id: object::ID,
    walrus_blob_id: String,
    timestamp_ms: u64
)
```

---

#### 6.3.5 エラーコードゲッター

```move
public(package) fun e_already_has_passport(): u64
public(package) fun e_migration_target_has_passport(): u64
```

---

### 6.4 Seal Accessor API（seal_accessor.move）

**スコープ**: `public(package)`（パッケージ内部のみ）

#### 6.4.1 seal_approve_patient_only_internal

```move
public(package) fun seal_approve_patient_only_internal(
    passport: &MedicalPassport,
    registry: &PassportRegistry,
    ctx: &tx_context::TxContext
)
```

| 項目 | 内容 |
|------|------|
| **用途** | Sealアクセス制御の内部実装 |
| **アクセス制御ロジック** | 1. `ctx.sender()`を取得<br/>2. `passport`のIDを取得<br/>3. `is_passport_owner()`で所有権確認<br/>4. 所有していなければ`E_NO_ACCESS`でabort |
| **Aborts** | `E_NO_ACCESS (102)`: senderが指定パスポートを所有していない |

**注意**: 外部から呼び出す場合は`accessor.move`の`entry fun seal_approve_patient_only`を使用すること

---

## 7. エラーコード

### 7.1 エラーコード一覧

| コード | 定数名 | 説明 | 発生条件 | 対処方法 |
|-------|--------|------|---------|---------|
| **1** | `E_EMPTY_WALRUS_BLOB_ID` | Walrus blob IDが空文字列 | mint時に`walrus_blob_id`が空 | 有効なblob IDを指定 |
| **2** | `E_EMPTY_SEAL_ID` | Seal IDが空文字列 | mint時に`seal_id`が空 | 有効なseal IDを指定 |
| **3** | `E_EMPTY_COUNTRY_CODE` | 国コードが空文字列 | mint時に`country_code`が空 | 有効な国コード（例: "JP"）を指定 |
| **4** | `E_ALREADY_HAS_PASSPORT` | 既にパスポートを所持している | 同じアドレスが2回mint | 既存パスポートを使用 |
| **5** | `E_MIGRATION_TARGET_HAS_PASSPORT` | 移行先が既にパスポートを所持 | 移行先アドレスが既に所持 | 別のアドレスに移行 |
| **102** | `E_NO_ACCESS` | アクセス拒否（Sealアクセス制御） | Sealアクセス制御で所有者以外が復号リクエスト | パスポート所有者のみが復号リクエスト可能 |

### 7.2 エラーハンドリング例（TypeScript）

```typescript
import { Transaction } from '@mysten/sui/transactions';

try {
  await signAndExecuteTransaction({
    transaction: tx,
  });
} catch (error) {
  if (error.message.includes('abort code: 4')) {
    // E_ALREADY_HAS_PASSPORT
    console.error('既にパスポートを所持しています');
  } else if (error.message.includes('abort code: 1')) {
    // E_EMPTY_WALRUS_BLOB_ID
    console.error('Walrus blob IDが無効です');
  }
  // その他のエラーハンドリング
}
```

---

## 8. バリデーション・制約条件

### 8.1 データバリデーション

#### 8.1.1 非空文字列チェック

**検証タイミング**: `create_passport_internal()`実行時

```move
// walrus_blob_id
assert!(!string::is_empty(&walrus_blob_id), E_EMPTY_WALRUS_BLOB_ID);

// seal_id
assert!(!string::is_empty(&seal_id), E_EMPTY_SEAL_ID);

// country_code
assert!(!string::is_empty(&country_code), E_EMPTY_COUNTRY_CODE);
```

---

### 8.2 所有権制約

#### 8.2.1 1ウォレット1枚制約

**実装方法**: PassportRegistry + Dynamic Fields

```move
// mint前チェック
assert!(!has_passport(registry, sender), E_ALREADY_HAS_PASSPORT);

// mint後登録
let passport_id = object::id(&passport);
register_passport_with_id(registry, passport_id, sender);
```

**保証内容**:
- 同じアドレスは複数のパスポートを持てない
- Dynamic Fieldsで`address -> object::ID`を管理
- 共有オブジェクトの`&mut`参照で競合防止
- `address -> object::ID`マッピングにより、特定のパスポートの所有者を確認可能

---

### 8.3 Soulbound制約

#### 8.3.1 譲渡不可保証

**実装方法**:
1. `has store`能力なし
2. `transfer_to()`は`public(package)`スコープ

```move
// コンパイルエラー
sui::transfer::public_transfer(passport, other_address);

// 外部から呼び出し不可
medical_passport::transfer_to(passport, other_address);
```

---

### 8.4 移行制約

#### 8.4.1 移行先チェック

**検証タイミング**: `migrate_passport()`実行時

```move
assert!(!has_passport(registry, new_owner), E_MIGRATION_TARGET_HAS_PASSPORT);
```

**保証内容**:
- 移行先は必ずパスポート未所持であること
- AdminCap必須
- 移行イベントを必ず発行

---

### 8.5 Sealアクセス制約

#### 8.5.1 所有者のみアクセス可能

**検証タイミング**: `seal_approve_patient_only()`実行時

```move
// Sealアクセス制御
assert!(is_passport_owner(registry, passport_id, sender), E_NO_ACCESS);
```

**保証内容**:
- パスポート所有者のみが復号リクエストを送信可能
- `PassportRegistry`の`address -> object::ID`マッピングで所有権を検証
- Sealキーサーバーは`.dry_run_transaction_block`で検証可能

---

## 9. テスト仕様

### 9.1 基本テスト

| Test ID | テスト名 | 検証内容 | ステータス |
|---------|---------|---------|-----------|
| **TEST-1** | AdminCap初期化 | init関数がAdminCapを生成 | Pass |
| **TEST-2** | フィールド設定 | MedicalPassport作成時のフィールド設定 | Pass |
| **TEST-3** | mint基本動作 | mint_medical_passportの基本動作 | Pass |
| **TEST-9** | 一括取得 | get_all_fieldsで全フィールド一括取得 | Pass |

---

### 9.2 異常系テスト

| Test ID | テスト名 | 検証内容 | 期待エラー | ステータス |
|---------|---------|---------|-----------|-----------|
| **TEST-4** | 空blob_id | 空のwalrus_blob_id | abort code 1 | Pass |
| **TEST-5** | 空seal_id | 空のseal_id | abort code 2 | Pass |
| **TEST-6** | 空country_code | 空のcountry_code | abort code 3 | Pass |

---

### 9.3 統合テスト（test_scenario）

| Test ID | テスト名 | 検証内容 | ステータス |
|---------|---------|---------|-----------|
| **TEST-7** | 管理者mintフロー | 管理者がmint→ユーザーが受け取る | Pass |
| **TEST-8** | Soulbound特性 | transfer関数が存在しない | Pass |

---

### 9.4 1ウォレット1枚制約テスト

| Test ID | テスト名 | 検証内容 | ステータス |
|---------|---------|---------|-----------|
| **TEST-10** | Registry作成 | PassportRegistryが共有オブジェクトとして作成 | Pass |
| **TEST-11** | 二重mint禁止 | 同じアドレスが2回mintするとabort | Pass (code 4) |
| **TEST-12** | 異なるユーザー | 異なるユーザーは各自mint可能 | Pass |
| **TEST-13** | has_passport | has_passportが正しい状態を返す | Pass |
| **TEST-14** | accessor経由確認 | accessor経由でhas_passportが動作 | Pass |

---

### 9.5 パスポート移行テスト

| Test ID | テスト名 | 検証内容 | ステータス |
|---------|---------|---------|-----------|
| **TEST-15** | 正常移行 | 正常なパスポート移行 | Pass |
| **TEST-16** | 移行先所持エラー | 移行先が既に所持している場合 | Pass (code 5) |
| **TEST-17** | 移行後再mint | 移行後の再mint確認 | Pass |
| **TEST-18** | 移行先再mint禁止 | 移行先が再mintを試みるとエラー | Pass (code 4) |
| **TEST-19** | 複数回移行 | user1 → user2 → user3の移行 | Pass |
| **TEST-20** | AdminCap必須 | AdminCapなしでは実行不可 | Pass |

---

### 9.6 Sealアクセス制御テスト

| Test ID | テスト名 | 検証内容 | 期待エラー | ステータス |
|---------|---------|---------|-----------|-----------|
| **TEST-SEAL-1** | オーナーが復号リクエスト | パスポート所有者が復号リクエストを送信 | なし（成功） | Pass |
| **TEST-SEAL-2** | オーナー以外が復号リクエスト | 所有者以外が復号リクエストを送信 | abort code 102 | Pass |
| **TEST-SEAL-3** | ユーザー1が自分のパスポート | ユーザー1がパスポートAで呼び出し | なし（成功） | Pass |
| **TEST-SEAL-4** | ユーザー2が自分のパスポート | ユーザー2がパスポートBで呼び出し | なし（成功） | Pass |
| **TEST-SEAL-5** | ユーザー2がユーザー1のパスポート | ユーザー2がパスポートAで呼び出し | abort code 102 | Pass |
| **TEST-SEAL-6** | ユーザー1がユーザー2のパスポート | ユーザー1がパスポートBで呼び出し | abort code 102 | Pass |
| **TEST-SEAL-7** | パスポート未所持ユーザー | パスポート未所持ユーザーが呼び出し | abort code 102 | Pass |
| **TEST-SEAL-8** | 複数回呼び出し | 同じユーザーが複数回呼び出し | なし（成功） | Pass |
| **TEST-SEAL-9** | mint直後に呼び出し | mint直後に復号リクエスト | なし（成功） | Pass |

---

### 9.7 テストカバレッジ

**全29テスト**:
- 基本機能: 4テスト
- 異常系: 3テスト
- 統合: 2テスト
- 1ウォレット1枚: 5テスト
- 移行機能: 6テスト
- Sealアクセス制御: 9テスト

**カバレッジ**: 100%（すべての公開関数・エラーコードをカバー）

---

## 10. 実装済み機能

### 10.1 v1.0機能一覧

#### パスポート発行（Mint）
- ユーザーによるセルフmint（accessor経由）
- 管理者によるmint（admin経由、AdminCap必須）
- 1ウォレット1枚制約の自動チェック
- 空文字列バリデーション

#### データアクセス
- 個別フィールドgetter（`walrus_blob_id`, `seal_id`, `country_code`）
- 一括取得getter（`get_all_fields`）
- 所有状態確認（`has_passport`）

#### パスポート移行
- 管理者による紛失対応移行
- 移行先の状態チェック（1ウォレット1枚制約遵守）
- 元パスポートのburn
- データ継承（`walrus_blob_id`, `seal_id`, `country_code`を保持）
- 移行イベント発行（監査証跡）
- マーカー管理（移行元削除、移行先登録）

#### Sealアクセス制御
- Sealキーサーバーからの復号リクエストに対するアクセス制御
- パスポート所有者のみが復号可能
- `PassportRegistry`の`address -> object::ID`マッピングで所有権検証
- `.dry_run_transaction_block`での検証対応

#### 権限管理
- AdminCapベースの管理者権限
- AdminCapの譲渡可能性（`has key, store`）

#### Move 2024準拠設計
- 可視性ルール遵守
- ファイルベース関数配置（AGENTS.md）
- `public(friend)`非使用

---

### 10.2 実装ファイル一覧

| ファイル | 行数 | 責務 |
|---------|------|------|
| `contract/sources/cure_pocket.move` | ~90 | パッケージ初期化 |
| `contract/sources/medical_passport.move` | ~435 | コアロジック |
| `contract/sources/accessor.move` | ~186 | 公開API（getter、mint、Sealアクセス制御） |
| `contract/sources/admin.move` | ~180 | 管理者API |
| `contract/sources/seal_accessor.move` | ~83 | Sealアクセス制御ロジック |
| `contract/tests/medical_passport_tests.move` | ~1107 | テスト（20テスト） |
| `contract/tests/seal_accessor_tests.move` | ~659 | Sealアクセス制御テスト（9テスト） |

---

## 11. 今後の拡張計画

### 11.1 未実装機能（README.md準拠）

以下の機能は**将来の拡張**として計画されています：

#### Phase 2: データ管理システム

- **MedicalVault**: データインデックス管理
- **MedicationEntry**: 薬剤データ
- **LabEntry**: 検査値データ
- **ImagingEntry**: 画像データ
- **HistoryEntry**: 手術歴・病歴データ

#### Phase 3: アクセス制御

- **ConsentToken**: 閲覧権限管理 ✅ **実装済み（v1.2.0）**
- **時限付きアクセス権**: 有効期限付き閲覧許可 ✅ **実装済み（ConsentTokenに含まれる）**

#### Phase 4: データ経済

- **AnalyticsPool**: データ提供報酬プール
- **データ提供同意**: 匿名化データの研究提供
- **報酬分配**: データ提供者への報酬支払い

#### Phase 5: 医療機関連携

- **FHIR準拠**: 国際標準準拠のデータモデル
- **Push連携**: 医療機関からのデータ追加
- **Pull連携**: 医療機関へのデータ提供

#### Phase 6: ユーザー体験向上

- **zkLogin**: 非クリプトユーザー向けログイン
- **マルチデバイス対応**: スマートフォン・タブレット対応
- **多言語対応**: 国際展開

---

### 11.2 技術的拡張計画

#### 11.2.1 スマートコントラクト拡張

```
cure_pocket/
|-- medical_passport.move (既存)
|-- medical_vault.move (新規)
|-- consent_token.move (新規)
|-- analytics_pool.move (新規)
+-- fhir_adapter.move (新規)
```

#### 11.2.2 データモデル拡張

```move
// 将来の拡張例
public struct MedicalVault has key {
    id: object::UID,
    passport_id: object::ID,
    medications: vector<MedicationEntry>,
    lab_results: vector<LabEntry>,
    imaging: vector<ImagingEntry>,
    histories: vector<HistoryEntry>,
}
```

---

## 12. 変更履歴

### v1.2.0 (2025-01-XX)

**ConsentToken完全実装**: ConsentToken機能の完全実装を完了

#### 実装内容
- `revoke_consent_token()` entry関数追加（トークン無効化機能）
- `verify_consent_internal()` 内部関数追加（検証ロジックの分離）
- `revoke_consent_internal()` 内部関数追加（無効化ロジック）
- 整数オーバーフロー対策追加（`E_EXPIRATION_OVERFLOW`）
- `seal_approve_consent()` のリファクタリング（検証ロジックを内部関数に委譲）
- エラーコード追加（`E_EXPIRATION_OVERFLOW`, `E_SCOPE_NOT_ALLOWED`, `E_NON_GRANTOR_REVOKE`）
- ConsentTokenテストファイル追加（`consent_token_tests.move`）

#### ファイル
- `contract/sources/consent_token.move`（更新）
- `contract/sources/accessor.move`（更新）
- `contract/tests/consent_token_tests.move`（新規）

#### API追加
- `revoke_consent_token(token: &mut ConsentToken, ctx: &tx_context::TxContext)` - トークン無効化

#### エラーコード追加
- `E_EXPIRATION_OVERFLOW (208)`: 有効期限計算時のオーバーフロー
- `E_SCOPE_NOT_ALLOWED (209)`: スコープ不一致（将来用）
- `E_NON_GRANTOR_REVOKE (210)`: grantor以外による無効化試行（将来用）

---

### v1.1.0 (2025-11-19)

**Sealアクセス制御機能追加**: Sealキーサーバーからの復号リクエストに対するアクセス制御を実装

#### 実装内容
- Sealアクセス制御モジュール（`seal_accessor.move`）追加
- `seal_approve_patient_only` entry関数追加
- `is_passport_owner`関数追加（所有権検証）
- PassportRegistryの実装変更（`address -> object::ID`マッピング）
- 関数名の修正（`register_passport_with_id`, `unregister_passport_by_owner`）
- Admin API関数名の修正（`admin_mint_medical_passport`）
- Sealアクセス制御テスト9件追加

#### ファイル
- `contract/sources/seal_accessor.move`（新規）
- `contract/tests/seal_accessor_tests.move`（新規）

#### テスト結果
```
Running Move unit tests
[ PASS    ] 0x0::medical_passport_tests::test_admin_cap_initialization
[ PASS    ] 0x0::medical_passport_tests::test_passport_creation
... (全20テストPass)
[ PASS    ] 0x0::seal_accessor_tests::test_seal_approve_patient_only_success
[ PASS    ] 0x0::seal_accessor_tests::test_seal_approve_patient_only_fails_for_non_owner
... (全9テストPass)
Test result: OK. Total tests: 29; passed: 29; failed: 0
```

---

### v1.0.0 (2025-11-18)

**初期リリース**: Medical Passport SBTコア機能

#### 実装内容
- MedicalPassport SBT（Soulbound Token）
- PassportRegistry（1ウォレット1枚制約）
- AdminCap（管理者権限）
- パスポート発行（mint）
- パスポート照会（getter）
- パスポート移行（migration）
- Move 2024準拠設計（AGENTS.md）
- テスト20件（100%カバレッジ）

#### ファイル
- `contract/sources/cure_pocket.move`
- `contract/sources/medical_passport.move`
- `contract/sources/accessor.move`
- `contract/sources/admin.move`
- `contract/tests/medical_passport_tests.move`

#### テスト結果
```
Running Move unit tests
[ PASS    ] 0x0::medical_passport_tests::test_admin_cap_initialization
[ PASS    ] 0x0::medical_passport_tests::test_passport_creation
[ PASS    ] 0x0::medical_passport_tests::test_mint_passport
... (全20テストPass)
Test result: OK. Total tests: 20; passed: 20; failed: 0
```

---

## 付録

### A. 用語集

| 用語 | 説明 |
|------|------|
| **SBT** | Soulbound Token（譲渡不可トークン） |
| **Walrus** | 分散型ストレージシステム |
| **Seal** | 暗号鍵管理システム |
| **PassportRegistry** | パスポート所有状態を管理する共有オブジェクト |
| **AdminCap** | 管理者権限を表すCapability |
| **Dynamic Fields** | Suiの動的フィールド機能 |
| **PTB** | Programmable Transaction Block（Suiのトランザクション） |
| **Sealアクセス制御** | Sealキーサーバーからの復号リクエストに対するアクセス制御機能 |

---

### B. 参考リンク

- [Sui Documentation](https://docs.sui.io/)
- [Move Language](https://move-language.github.io/move/)
- [Walrus](https://docs.walrus.site/)
- [Seal](https://docs.sealcaster.org/)
- [AGENTS.md](../AGENTS.md)（Move 2024準拠設計ガイド）

---

### C. 開発環境

```bash
# Sui CLI
sui --version
# sui 1.x.x

# Move コンパイル
cd contract
sui move build

# テスト実行
sui move test

# パッケージ公開
sui client publish --gas-budget 100000000
```

**この要件定義書は「生きたドキュメント」です。機能追加時は本ドキュメントを更新してください。**
