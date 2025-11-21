/// Cure Pocket - メインモジュール
///
/// パッケージ初期化と管理者権限の定義
module cure_pocket::cure_pocket;

use cure_pocket::medical_passport;
use sui::display;
use sui::package;

// ============================================================
// 管理者権限構造体
// ============================================================

/// 管理者権限オブジェクト
///
/// ## 用途
/// - 将来的な管理者専用機能の権限証明
/// - この構造体を所有していること自体が権限の証明となる
///
/// ## 譲渡性
/// - `has key, store` を持つため、譲渡可能
/// - 必要に応じて管理権限を他のアドレスに委譲できる
public struct AdminCap has key, store {
    id: object::UID
}

/// One-Time Witness
///
/// パッケージデプロイ時に1度だけ供給される Witness。
/// Publisher の発行に使用し、以降は不要。
public struct CURE_POCKET has drop {}

// ============================================================
// 初期化
// ============================================================

/// パッケージ初期化関数
///
/// ## 実行タイミング
/// - パッケージがSuiネットワークにデプロイされた際に自動実行される
///
/// ## 動作
/// - `AdminCap` を1つ生成し、デプロイヤー（tx送信者）に転送
/// - `PassportRegistry` を1つ生成し、共有オブジェクトとして公開
///
/// ## パラメータ
/// - `ctx`: トランザクションコンテキスト
#[allow(lint(share_owned))] // Display をこの init 内で生成しそのまま共有するため安全
fun init(witness: CURE_POCKET, ctx: &mut tx_context::TxContext) {
    // Publisher を取得（Display 生成に使用）
    let publisher = package::claim(witness, ctx);

    // AdminCap を生成してデプロイヤーに転送
    let admin = AdminCap {
        id: object::new(ctx)
    };
    sui::transfer::public_transfer(admin, tx_context::sender(ctx));

    // PassportRegistry を生成して共有オブジェクトとして公開
    medical_passport::create_and_share_passport_registry(ctx);

    // Passport Display を生成し、バージョンをインクリメントして共有
    let mut display = medical_passport::create_passport_display(&publisher, ctx);
    display::update_version(&mut display);
    sui::transfer::public_share_object(display);

    // Publisher をデプロイヤーに返却（将来の更新用）
    sui::transfer::public_transfer(publisher, tx_context::sender(ctx));
}

// ============================================================
// テスト専用関数
// ============================================================

/// テスト専用: AdminCapを生成して返す
///
/// ## 注意
/// - この関数はテストコードからのみ呼び出し可能（`#[test_only]`）
/// - 本番環境では `init()` のみが AdminCap を生成する
///
/// ## 用途
/// - ユニットテストでの AdminCap 取得
/// - transfer をシミュレートせずに直接 AdminCap を取得
///
/// ## パラメータ
/// - `ctx`: トランザクションコンテキスト
///
/// ## 返り値
/// - `AdminCap`: 新しく生成された管理者権限オブジェクト
#[test_only]
public fun test_init_for_tests(ctx: &mut tx_context::TxContext): AdminCap {
    AdminCap {
        id: object::new(ctx)
    }
}

/// テスト専用: init関数を直接呼び出し可能にする
///
/// ## 用途
/// - test_scenario での init() のシミュレーション
///
/// ## パラメータ
/// - `ctx`: トランザクションコンテキスト
#[test_only]
public fun init_for_testing(ctx: &mut tx_context::TxContext) {
    init(create_cure_pocket_witness_for_tests(), ctx);
}

#[test_only]
fun create_cure_pocket_witness_for_tests(): CURE_POCKET {
    CURE_POCKET {}
}

/// テスト専用: AdminCap を破棄
#[test_only]
public fun destroy_admin_for_tests(admin: AdminCap) {
    let AdminCap { id } = admin;
    sui::object::delete(id);
}
