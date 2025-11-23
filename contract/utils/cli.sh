#!/usr/bin/env bash

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ライブラリの読み込み
source "${SCRIPT_DIR}/lib/logging.sh"
source "${SCRIPT_DIR}/lib/input.sh"
source "${SCRIPT_DIR}/lib/network.sh"
source "${SCRIPT_DIR}/lib/env_manager.sh"

# グローバル変数
CONTRACTS_DIR=""
SELECTED_NETWORK=""

# 初期化処理
initialize() {
    log_section "Fight Moments CLI 初期化"

    # カレントディレクトリの確認
    if [[ ! -f "${SCRIPT_DIR}/.gitignore" ]]; then
        log_error "スクリプトディレクトリが正しくありません。"
        log_info "contracts/utils ディレクトリで実行してください。"
        exit 1
    fi

    # contracts ディレクトリのパスを設定
    CONTRACTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

    # Move.toml の存在確認
    if [[ ! -f "${CONTRACTS_DIR}/Move.toml" ]]; then
        log_error "Move.toml が見つかりません。"
        log_info "contracts ディレクトリに Move.toml が存在することを確認してください。"
        exit 1
    fi

    # ログディレクトリの作成
    if [[ ! -d "${SCRIPT_DIR}/logs" ]]; then
        mkdir -p "${SCRIPT_DIR}/logs"
    fi

    # ログファイルの設定
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    set_log_file "${SCRIPT_DIR}/logs/cli_${timestamp}.log"

    # Sui CLI の存在確認
    if ! command -v sui &> /dev/null; then
        log_error "Sui CLI が見つかりません。"
        log_info "Sui CLI をインストールしてください: https://docs.sui.io/build/install"
        exit 1
    fi

    # 環境変数マネージャーの初期化
    initialize_env_manager "$SCRIPT_DIR"

    # ネットワーク情報の初期化
    if ! initialize_network; then
        log_error "ネットワーク情報の取得に失敗しました。"
        exit 1
    fi

    log_success "初期化が完了しました。"
}

# ネットワーク選択
select_network_menu() {
    log_section "ネットワーク選択"

    # 現在のネットワークを表示
    if [[ -n "$CURRENT_NETWORK" ]]; then
        echo "現在のネットワーク: ${CURRENT_NETWORK}"
        echo ""
    fi

    # ネットワーク一覧を表示
    list_networks

    # ネットワークを選択
    local choice
    choice=$(prompt_menu "ネットワークを選択してください" "${VALID_NETWORKS[@]}")

    if [[ "$choice" == "0" ]]; then
        log_info "終了します。"
        exit 0
    fi

    # 選択されたネットワーク
    local selected_network="${VALID_NETWORKS[$((choice-1))]}"

    # ネットワークを切り替え
    if switch_network "$selected_network"; then
        SELECTED_NETWORK="$selected_network"

        # 環境変数ファイルを読み込み
        if load_env_file "$selected_network"; then
            log_success "ネットワーク ${selected_network} を選択しました。"
        else
            log_warning "環境変数ファイルの読み込みに失敗しましたが、続行します。"
        fi
    else
        log_error "ネットワークの切り替えに失敗しました。"
        exit 1
    fi
}

# コマンドメニュー
command_menu() {
    while true; do
        log_section "コマンド選択 (現在: ${SELECTED_NETWORK})"

        echo "1. deploy - コントラクトをデプロイ"
        echo "2. sync-frontend-env - フロントエンド環境変数を同期"
        echo "9. ネットワーク変更"
        echo "0. 終了"
        echo ""

        local choice
        read -p "選択してください: " choice

        case "$choice" in
            1)
                execute_command "deploy"
                ;;
            2)
                execute_command "sync-frontend-env"
                ;;
            9)
                select_network_menu
                ;;
            0)
                log_info "終了します。"
                exit 0
                ;;
            *)
                log_error "無効な選択です。"
                ;;
        esac

        echo ""
        read -p "Enter キーを押して続行..."
    done
}

# コマンドを実行
# 引数:
#   $1 - コマンド名
execute_command() {
    local command_name="$1"
    local command_script="${SCRIPT_DIR}/command/${command_name}.sh"

    # コマンドスクリプトの存在確認
    if [[ ! -f "$command_script" ]]; then
        log_error "コマンドが見つかりません: ${command_name}"
        return 1
    fi

    # コマンドスクリプトを実行
    log_info "コマンドを実行します: ${command_name}"

    # 必要な変数をエクスポート
    export SCRIPT_DIR
    export CONTRACTS_DIR
    export SELECTED_NETWORK
    export CURRENT_NETWORK
    export CURRENT_ADDRESS
    export CURRENT_RPC_URL

    # コマンドスクリプトを実行
    if bash "$command_script"; then
        log_success "コマンドが正常に終了しました。"

        # 環境変数ファイルを再読み込み
        load_env_file "$SELECTED_NETWORK" &>/dev/null
    else
        log_error "コマンドの実行に失敗しました。"
    fi
}

# メイン処理
main() {
    # 初期化
    initialize

    # ネットワーク選択
    select_network_menu

    # コマンドメニュー
    command_menu
}

# メイン処理を実行
main
