#!/bin/bash
# sync-frontend-env.sh - フロントエンド環境変数同期コマンド

# ライブラリの読み込み
source "${SCRIPT_DIR}/lib/logging.sh"
source "${SCRIPT_DIR}/lib/input.sh"
source "${SCRIPT_DIR}/lib/network.sh"
source "${SCRIPT_DIR}/lib/env_manager.sh"

# 環境変数ファイルのパスを設定
initialize_env_manager "$SCRIPT_DIR"

# フロントエンドディレクトリのパス
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/../../frontend" && pwd)"
FRONTEND_ENV="${FRONTEND_DIR}/.env"

# 同期前の確認
pre_sync_check() {
    log_section "同期前確認"

    # フロントエンドディレクトリの確認
    if [[ ! -d "$FRONTEND_DIR" ]]; then
        log_error "フロントエンドディレクトリが見つかりません: ${FRONTEND_DIR}"
        return 1
    fi

    # フロントエンド .env の確認
    if [[ ! -f "$FRONTEND_ENV" ]]; then
        log_error "フロントエンド .env が見つかりません: ${FRONTEND_ENV}"
        log_info "frontend/.env ファイルを作成してください。"
        return 1
    fi

    # 契約環境変数ファイルの確認
    local contract_env=$(get_env_file_path "$SELECTED_NETWORK")
    if [[ ! -f "$contract_env" ]]; then
        log_error "契約環境変数ファイルが見つかりません: ${contract_env}"
        log_info "先にデプロイを実行してください。"
        return 1
    fi

    # 現在の設定を表示
    echo "📋 同期情報"
    echo "────────────────────────────────────────"
    echo "  ネットワーク: ${SELECTED_NETWORK}"
    echo "  契約環境変数: ${contract_env}"
    echo "  フロントエンド: ${FRONTEND_ENV}"
    echo "────────────────────────────────────────"
    echo ""

    return 0
}

# Python3の存在確認
check_python3() {
    if ! command -v python3 &> /dev/null; then
        log_error "python3 が見つかりません。"
        log_info "python3 をインストールしてください。"
        return 1
    fi
    return 0
}

# フロントエンド環境変数を更新
update_frontend_env() {
    local source_env=$(get_env_file_path "$SELECTED_NETWORK")
    local target_env="$FRONTEND_ENV"

    log_section "フロントエンド環境変数の更新"

    log_info "📝 環境変数を同期しています..."
    log_info "ソース: ${source_env}"
    log_info "ターゲット: ${target_env}"

    # Python3で環境変数を更新
    python3 - "$source_env" "$target_env" <<'PY'
import pathlib
import re
import sys

def parse_env(path):
    """環境変数ファイルをパースして辞書として返す"""
    data = {}
    for line in pathlib.Path(path).read_text().splitlines():
        line = line.strip()
        # 空行とコメント行をスキップ
        if not line or line.startswith('#'):
            continue
        # = が含まれない行をスキップ
        if '=' not in line:
            continue
        # キーと値を分割
        key, value = line.split('=', 1)
        data[key.strip()] = value.strip()
    return data

# 環境変数のマッピング
# contracts/.env.{network} → frontend/.env
mapping = {
    'NETWORK': 'NEXT_PUBLIC_SUI_NETWORK',
    'RPC_URL': 'NEXT_PUBLIC_SUI_RPC_URL',
    'PACKAGE_ID': 'NEXT_PUBLIC_PACKAGE_ID',
    'TRANSFER_POLICY_ID': 'NEXT_PUBLIC_TRANSFER_POLICY_ID',
    'TRANSFER_POLICY_CAP_ID': 'NEXT_PUBLIC_TRANSFER_POLICY_CAP_ID',
    'ADMIN_CAP_ID': 'NEXT_PUBLIC_ADMIN_CAP_ID',
    'MOMENT_REGISTRY_ID': 'NEXT_PUBLIC_MOMENT_REGISTRY_ID',
}

# ソース環境変数を読み込み
src = parse_env(sys.argv[1])

# ターゲット環境変数ファイルを読み込み
dst_path = pathlib.Path(sys.argv[2])
dst_text = dst_path.read_text()

# 更新内容を記録
changes = []
missing = []

# 各マッピングに対して処理
for src_key, dst_key in mapping.items():
    if src_key not in src or not src[src_key]:
        # ソースにキーがない、または値が空の場合
        missing.append(src_key)
    else:
        value = src[src_key]
        # ターゲットに既に存在する場合は更新、存在しない場合は追加
        if re.search(rf"(?m)^{dst_key}=", dst_text):
            # 既存の行を更新
            dst_text, count = re.subn(rf"(?m)^{dst_key}=.*$", f"{dst_key}={value}", dst_text)
            changes.append((dst_key, value, "更新"))
        else:
            # Sui Contract Configuration セクションに追加
            # セクションが見つからない場合はファイル末尾に追加
            if "# Sui Contract Configuration" in dst_text:
                # セクション内に追加
                dst_text = re.sub(
                    r"(# Sui Contract Configuration\n)",
                    rf"\1{dst_key}={value}\n",
                    dst_text
                )
            else:
                # ファイル末尾に追加
                dst_text += f"\n{dst_key}={value}\n"
            changes.append((dst_key, value, "追加"))

# 欠落しているキーがある場合は警告
if missing:
    print(f"⚠️  契約環境変数に次のキーが欠落しています: {', '.join(missing)}", file=sys.stderr)
    print(f"   デプロイ後に再度同期を実行してください。", file=sys.stderr)

# ターゲットファイルを更新
dst_path.write_text(dst_text)

# 更新内容を表示
if changes:
    print("✅ フロントエンド .env を更新しました:")
    for key, value, action in changes:
        # 値が長い場合は短縮表示
        display_value = value if len(value) <= 60 else f"{value[:60]}..."
        print(f"  [{action}] {key}={display_value}")
else:
    print("ℹ️  更新する環境変数がありませんでした。")

sys.exit(0)
PY

    local exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
        log_success "フロントエンド環境変数の同期が完了しました。"
        return 0
    else
        log_error "フロントエンド環境変数の同期に失敗しました。"
        return 1
    fi
}

# バックアップ作成
backup_frontend_env() {
    log_info "💾 フロントエンド .env のバックアップを作成しています..."

    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${FRONTEND_ENV}.backup.${timestamp}"

    if cp "$FRONTEND_ENV" "$backup_file"; then
        log_success "バックアップを作成しました: ${backup_file}"
        return 0
    else
        log_error "バックアップの作成に失敗しました。"
        return 1
    fi
}

# 同期結果の表示
show_sync_result() {
    log_section "同期結果"

    echo "📄 フロントエンド .env の内容:"
    echo "────────────────────────────────────────"

    # Sui関連の環境変数のみを表示
    grep "^NEXT_PUBLIC_SUI" "$FRONTEND_ENV" || echo "（Sui関連の環境変数が見つかりません）"

    echo "────────────────────────────────────────"
    echo ""
    echo "ファイル: ${FRONTEND_ENV}"
}

# メイン処理
main() {
    # Python3の確認
    if ! check_python3; then
        return 1
    fi

    # 同期前確認
    if ! pre_sync_check; then
        return 1
    fi

    # 確認プロンプト
    if ! prompt_yes_no "フロントエンド .env を同期しますか？" "y"; then
        log_info "同期をキャンセルしました。"
        return 1
    fi

    # バックアップ作成
    if ! backup_frontend_env; then
        log_warning "バックアップの作成に失敗しましたが、続行します。"
    fi

    # フロントエンド環境変数を更新
    if ! update_frontend_env; then
        return 1
    fi

    # 同期結果を表示
    show_sync_result

    return 0
}

# メイン処理を実行
main
exit $?
