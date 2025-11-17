#!/bin/bash
# network.sh - ネットワーク管理ライブラリ

# グローバル変数
CURRENT_NETWORK=""
CURRENT_ADDRESS=""
CURRENT_RPC_URL=""

# 有効なネットワーク一覧
readonly VALID_NETWORKS=("devnet" "testnet" "local")

# ネットワークごとのRPC URL
readonly DEVNET_RPC="https://fullnode.devnet.sui.io:443"
readonly TESTNET_RPC="https://fullnode.testnet.sui.io:443"
readonly LOCAL_RPC="http://127.0.0.1:9000"

# アクティブなアドレスを取得
# 戻り値:
#   アクティブアドレス
get_active_address() {
    local address
    address=$(sui client active-address 2>/dev/null)

    if [[ $? -eq 0 ]] && [[ -n "$address" ]]; then
        CURRENT_ADDRESS="$address"
        echo "$address"
        return 0
    else
        log_error "アクティブアドレスの取得に失敗しました。"
        return 1
    fi
}

# アクティブな環境を取得
# 戻り値:
#   アクティブなネットワーク名
get_active_env() {
    local env
    env=$(sui client active-env 2>/dev/null)

    if [[ $? -eq 0 ]] && [[ -n "$env" ]]; then
        CURRENT_NETWORK="$env"
        echo "$env"
        return 0
    else
        log_error "アクティブな環境の取得に失敗しました。"
        return 1
    fi
}

# ネットワークを切り替え
# 引数:
#   $1 - ネットワーク名（devnet, testnet, local）
# 戻り値:
#   0 - 成功、1 - 失敗
switch_network() {
    local network_name="$1"

    # ネットワーク名の検証
    if ! validate_network "$network_name"; then
        log_error "無効なネットワーク名: ${network_name}"
        log_info "有効なネットワーク: ${VALID_NETWORKS[*]}"
        return 1
    fi

    # ネットワークを切り替え
    log_info "ネットワークを ${network_name} に切り替えています..."

    if sui client switch --env "$network_name" &>/dev/null; then
        CURRENT_NETWORK="$network_name"

        # RPC URLを設定
        case "$network_name" in
            devnet)
                CURRENT_RPC_URL="$DEVNET_RPC"
                ;;
            testnet)
                CURRENT_RPC_URL="$TESTNET_RPC"
                ;;
            local)
                CURRENT_RPC_URL="$LOCAL_RPC"
                ;;
        esac

        # アドレスを再取得
        get_active_address &>/dev/null

        log_success "ネットワークを ${network_name} に切り替えました。"
        return 0
    else
        log_error "ネットワークの切り替えに失敗しました。"
        log_info "sui client envs でネットワーク一覧を確認してください。"
        return 1
    fi
}

# ネットワーク名の検証
# 引数:
#   $1 - ネットワーク名
# 戻り値:
#   0 - 有効、1 - 無効
validate_network() {
    local network_name="$1"

    for valid_network in "${VALID_NETWORKS[@]}"; do
        if [[ "$network_name" == "$valid_network" ]]; then
            return 0
        fi
    done

    return 1
}

# 現在のネットワーク情報を表示
show_network_info() {
    log_section "現在のネットワーク情報"

    echo "  ネットワーク: ${CURRENT_NETWORK:-未設定}"
    echo "  RPC URL: ${CURRENT_RPC_URL:-未設定}"
    echo "  アドレス: ${CURRENT_ADDRESS:-未設定}"
    echo ""
}

# ネットワーク情報を初期化
# 戻り値:
#   0 - 成功、1 - 失敗
initialize_network() {
    log_info "ネットワーク情報を取得しています..."

    # アクティブな環境を取得
    if ! get_active_env &>/dev/null; then
        return 1
    fi

    # RPC URLを設定
    case "$CURRENT_NETWORK" in
        devnet)
            CURRENT_RPC_URL="$DEVNET_RPC"
            ;;
        testnet)
            CURRENT_RPC_URL="$TESTNET_RPC"
            ;;
        local)
            CURRENT_RPC_URL="$LOCAL_RPC"
            ;;
        *)
            log_warning "不明なネットワーク: ${CURRENT_NETWORK}"
            ;;
    esac

    # アクティブアドレスを取得
    if ! get_active_address &>/dev/null; then
        return 1
    fi

    log_success "ネットワーク情報を取得しました。"
    return 0
}

# 利用可能なネットワーク一覧を表示
list_networks() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  利用可能なネットワーク"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    for i in "${!VALID_NETWORKS[@]}"; do
        local network="${VALID_NETWORKS[$i]}"
        local rpc_url=""

        case "$network" in
            devnet)
                rpc_url="$DEVNET_RPC"
                ;;
            testnet)
                rpc_url="$TESTNET_RPC"
                ;;
            local)
                rpc_url="$LOCAL_RPC"
                ;;
        esac

        if [[ "$network" == "$CURRENT_NETWORK" ]]; then
            echo "  $((i+1)). ${network} ✓ (現在選択中)"
        else
            echo "  $((i+1)). ${network}"
        fi
        echo "      RPC: ${rpc_url}"
    done

    echo ""
}
