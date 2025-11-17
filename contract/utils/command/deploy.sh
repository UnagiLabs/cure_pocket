#!/bin/bash
# deploy.sh - コントラクトデプロイコマンド

# ライブラリの読み込み
source "${SCRIPT_DIR}/lib/logging.sh"
source "${SCRIPT_DIR}/lib/input.sh"
source "${SCRIPT_DIR}/lib/network.sh"
source "${SCRIPT_DIR}/lib/env_manager.sh"

# 環境変数ファイルの管理者を初期化
initialize_env_manager "$SCRIPT_DIR"

# デプロイ前の確認
pre_deploy_check() {
    log_section "デプロイ前確認"

    # contracts ディレクトリの確認
    if [[ ! -d "$CONTRACTS_DIR" ]]; then
        log_error "contracts ディレクトリが見つかりません: ${CONTRACTS_DIR}"
        return 1
    fi

    # Move.toml の確認
    if [[ ! -f "${CONTRACTS_DIR}/Move.toml" ]]; then
        log_error "Move.toml が見つかりません: ${CONTRACTS_DIR}/Move.toml"
        return 1
    fi

    # 現在の設定を表示
    echo "📋 デプロイ情報"
    echo "────────────────────────────────────────"
    echo "  ネットワーク: ${SELECTED_NETWORK}"
    echo "  RPC URL: ${CURRENT_RPC_URL}"
    echo "  アドレス: ${CURRENT_ADDRESS}"
    echo "  コントラクト: ${CONTRACTS_DIR}"
    echo "────────────────────────────────────────"
    echo ""

    return 0
}

# パラメータ入力
get_deploy_params() {
    log_section "デプロイパラメータ入力"

    # ガス予算の入力
    GAS_BUDGET=$(prompt_number "ガス予算を入力してください" "500000000")

    echo ""
    echo "📝 入力内容確認"
    echo "────────────────────────────────────────"
    echo "  ガス予算: ${GAS_BUDGET}"
    echo "────────────────────────────────────────"
    echo ""

    # 確認プロンプト
    if ! prompt_yes_no "この設定でデプロイしますか？" "n"; then
        log_info "デプロイをキャンセルしました。"
        return 1
    fi

    return 0
}

# デプロイ実行
execute_deploy() {
    log_section "デプロイ実行"

    # ログファイルのパス
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local deploy_log="${SCRIPT_DIR}/logs/deploy_${SELECTED_NETWORK}_${timestamp}.log"
    local deploy_json="${SCRIPT_DIR}/logs/deploy_${SELECTED_NETWORK}_${timestamp}.json"

    log_info "🚀 デプロイを開始します..."
    log_info "ログファイル: ${deploy_log}"

    # デプロイコマンドを実行
    local deploy_cmd="sui client publish --gas-budget ${GAS_BUDGET} --json"

    log_info "実行コマンド: ${deploy_cmd}"
    log_to_file "Executing: ${deploy_cmd}"

    # コントラクトディレクトリに移動してデプロイ
    cd "$CONTRACTS_DIR" || {
        log_error "コントラクトディレクトリに移動できません。"
        return 1
    }

    # デプロイを実行（JSON出力を保存）
    if ! $deploy_cmd > "$deploy_json" 2> "$deploy_log"; then
        log_error "デプロイに失敗しました。"
        log_info "エラー詳細:"
        cat "$deploy_log"
        return 1
    fi

    # 元のディレクトリに戻る
    cd - > /dev/null || return 1

    log_success "デプロイコマンドが正常に実行されました。"

    # JSON出力の確認
    if [[ ! -f "$deploy_json" ]] || [[ ! -s "$deploy_json" ]]; then
        log_error "デプロイ結果のJSON出力が見つかりません。"
        return 1
    fi

    # JSONを解析してオブジェクトIDを抽出
    parse_deploy_result "$deploy_json"
}

# デプロイ結果の解析
parse_deploy_result() {
    local json_file="$1"

    log_section "デプロイ結果の解析"

    # jqが利用可能か確認
    if ! command -v jq &> /dev/null; then
        log_error "jq コマンドが見つかりません。"
        log_info "jq をインストールしてください: brew install jq"
        log_info "手動で環境変数ファイルを更新してください: ${json_file}"
        return 1
    fi

    # JSON出力を確認
    log_info "📦 JSON レスポンスを解析しています..."

    # json_parser.shを読み込み
    source "${SCRIPT_DIR}/lib/json_parser.sh"

    # 連想配列でオブジェクトを保持
    declare -A env_vars

    # JSONを解析
    while IFS='|' read -r key value; do
        if [[ -n "$key" ]] && [[ -n "$value" ]]; then
            env_vars["$key"]="$value"
            log_success "${key}: ${value}"
        fi
    done < <(parse_deploy_json "$json_file")

    # エラーチェック（PACKAGE_IDは必須）
    if [[ -z "${env_vars[PACKAGE_ID]}" ]]; then
        log_error "PACKAGE_ID の取得に失敗しました。"
        log_info "JSON ファイルを確認してください: ${json_file}"
        return 1
    fi

    # 環境変数ファイルを更新
    update_env_variables_from_array env_vars
}

# 連想配列から環境変数ファイルを更新（汎用版）
update_env_variables_from_array() {
    local -n vars_array=$1

    log_section "環境変数ファイル更新"

    # 環境変数を更新
    log_info "💾 環境変数ファイルを更新しています..."

    # 連想配列の全キーを更新
    for key in "${!vars_array[@]}"; do
        local value="${vars_array[$key]}"
        if [[ -n "$value" ]]; then
            update_env_file "$SELECTED_NETWORK" "$key" "$value"
        fi
    done

    # アクティブアドレスも更新
    if [[ -n "$CURRENT_ADDRESS" ]]; then
        update_env_file "$SELECTED_NETWORK" "ACTIVE_ADDRESS" "$CURRENT_ADDRESS"
    fi

    log_success "環境変数ファイルを更新しました: .env.${SELECTED_NETWORK}"

    # 結果を表示（汎用版）
    display_deploy_result_from_array vars_array
}

# 連想配列からデプロイ結果を表示（汎用版）
display_deploy_result_from_array() {
    local -n result_array=$1

    log_section "✅ デプロイ成功！"

    # 重要な順に表示
    local important_keys=("PACKAGE_ID" "ADMIN_CAP_ID" "MOMENT_REGISTRY_ID" "UPGRADE_CAP_ID" "TRANSFER_POLICY_ID" "TRANSFER_POLICY_CAP_ID")
    local icons=("📦" "🔑" "📚" "⬆️" "🔄" "🔐")

    local i=0
    for key in "${important_keys[@]}"; do
        if [[ -n "${result_array[$key]}" ]]; then
            echo "${icons[$i]} ${key}:"
            echo "   ${result_array[$key]}"
            echo ""
        fi
        ((i++))
    done

    # その他のキーも表示
    for key in "${!result_array[@]}"; do
        # 重要なキーはスキップ（すでに表示済み）
        if [[ " ${important_keys[*]} " =~ " ${key} " ]]; then
            continue
        fi
        echo "🔹 ${key}:"
        echo "   ${result_array[$key]}"
        echo ""
    done

    echo "📁 環境変数ファイル: .env.${SELECTED_NETWORK}"
}

# 環境変数ファイルを更新（旧バージョン - 後方互換性のため維持）
update_env_variables() {
    local package_id="$1"
    local admin_cap_id="$2"
    local upgrade_cap_id="$3"
    local transfer_policy_id="$4"
    local transfer_policy_cap_id="$5"
    local moment_registry_id="$6"

    log_section "環境変数ファイル更新"

    # 環境変数を更新
    log_info "💾 環境変数ファイルを更新しています..."

    update_env_file "$SELECTED_NETWORK" "PACKAGE_ID" "$package_id"

    if [[ -n "$admin_cap_id" ]]; then
        update_env_file "$SELECTED_NETWORK" "ADMIN_CAP_ID" "$admin_cap_id"
    fi

    if [[ -n "$upgrade_cap_id" ]]; then
        update_env_file "$SELECTED_NETWORK" "UPGRADE_CAP_ID" "$upgrade_cap_id"
    fi

    if [[ -n "$transfer_policy_id" ]]; then
        update_env_file "$SELECTED_NETWORK" "TRANSFER_POLICY_ID" "$transfer_policy_id"
    fi

    if [[ -n "$transfer_policy_cap_id" ]]; then
        update_env_file "$SELECTED_NETWORK" "TRANSFER_POLICY_CAP_ID" "$transfer_policy_cap_id"
    fi

    if [[ -n "$moment_registry_id" ]]; then
        update_env_file "$SELECTED_NETWORK" "MOMENT_REGISTRY_ID" "$moment_registry_id"
    fi

    # アクティブアドレスも更新
    if [[ -n "$CURRENT_ADDRESS" ]]; then
        update_env_file "$SELECTED_NETWORK" "ACTIVE_ADDRESS" "$CURRENT_ADDRESS"
    fi

    log_success "環境変数ファイルを更新しました: .env.${SELECTED_NETWORK}"

    # 結果を表示
    display_deploy_result "$package_id" "$admin_cap_id" "$upgrade_cap_id" "$transfer_policy_id" "$transfer_policy_cap_id" "$moment_registry_id"
}

# デプロイ結果を表示
display_deploy_result() {
    local package_id="$1"
    local admin_cap_id="$2"
    local upgrade_cap_id="$3"
    local transfer_policy_id="$4"
    local transfer_policy_cap_id="$5"
    local moment_registry_id="$6"

    log_section "✅ デプロイ成功！"

    echo "📦 PACKAGE_ID:"
    echo "   ${package_id}"
    echo ""

    if [[ -n "$admin_cap_id" ]]; then
        echo "🔑 ADMIN_CAP_ID:"
        echo "   ${admin_cap_id}"
        echo ""
    fi

    if [[ -n "$upgrade_cap_id" ]]; then
        echo "⬆️  UPGRADE_CAP_ID:"
        echo "   ${upgrade_cap_id}"
        echo ""
    fi

    if [[ -n "$transfer_policy_id" ]]; then
        echo "🔄 TRANSFER_POLICY_ID:"
        echo "   ${transfer_policy_id}"
        echo ""
    fi

    if [[ -n "$transfer_policy_cap_id" ]]; then
        echo "🔐 TRANSFER_POLICY_CAP_ID:"
        echo "   ${transfer_policy_cap_id}"
        echo ""
    fi

    if [[ -n "$moment_registry_id" ]]; then
        echo "📋 MOMENT_REGISTRY_ID:"
        echo "   ${moment_registry_id}"
        echo ""
    fi

    echo "────────────────────────────────────────"
    echo "環境変数ファイル: .env.${SELECTED_NETWORK}"
    echo "────────────────────────────────────────"
}

# メイン処理
main() {
    # デプロイ前確認
    if ! pre_deploy_check; then
        return 1
    fi

    # パラメータ入力
    if ! get_deploy_params; then
        return 1
    fi

    # デプロイ実行
    if ! execute_deploy; then
        return 1
    fi

    return 0
}

# メイン処理を実行
main
exit $?
