#!/bin/bash
# json_parser.sh - Suiデプロイ結果JSONの汎用パーサー
# デプロイJSONから全オブジェクトを自動抽出し、環境変数形式で出力します

# objectTypeから環境変数名を生成
# 例: "0x2::package::UpgradeCap" → "UPGRADE_CAP_ID"
# 例: "0xe33c...::types::AdminCap" → "ADMIN_CAP_ID"
# 例: "0x2::transfer_policy::TransferPolicy<T>" → "TRANSFER_POLICY_ID"
generate_env_var_name() {
    local object_type="$1"

    # まずジェネリクス型パラメータを削除
    # "0x2::transfer_policy::TransferPolicy<0xe33c...::types::Moment>" → "0x2::transfer_policy::TransferPolicy"
    local cleaned_type=$(echo "$object_type" | sed 's/<.*$//')

    # objectTypeの最後のセグメント(型名)を抽出
    # "0x2::package::UpgradeCap" → "UpgradeCap"
    # "::types::AdminCap" → "AdminCap"
    local type_name=$(echo "$cleaned_type" | sed -E 's/.*:://')

    # camelCaseをSNAKE_CASEに変換
    # "UpgradeCap" → "UPGRADE_CAP"
    # "MomentRegistry" → "MOMENT_REGISTRY"
    # "TransferPolicy" → "TRANSFER_POLICY"
    local snake_case=$(echo "$type_name" | sed -E 's/([a-z0-9])([A-Z])/\1_\2/g' | tr '[:lower:]' '[:upper:]')

    # "_ID"サフィックスを追加
    echo "${snake_case}_ID"
}

# デプロイJSONから全オブジェクトを抽出
# 出力形式: ENV_VAR_NAME=object_id
parse_deploy_json() {
    local json_file="$1"

    # jqが利用可能か確認
    if ! command -v jq &> /dev/null; then
        echo "ERROR: jq command not found" >&2
        return 1
    fi

    # JSONの妥当性チェック
    if ! jq empty "$json_file" 2>/dev/null; then
        echo "ERROR: Invalid JSON file: $json_file" >&2
        return 1
    fi

    # エラーチェック
    local error=$(jq -r '.error // empty' "$json_file" 2>/dev/null)
    if [[ -n "$error" ]]; then
        echo "ERROR: Deploy failed - $error" >&2
        return 1
    fi

    # Package IDを抽出
    local package_id=$(jq -r '.objectChanges[] | select(.type == "published") | .packageId' "$json_file" 2>/dev/null)
    if [[ -n "$package_id" ]]; then
        echo "PACKAGE_ID|$package_id"
    fi

    # 全てのcreatedオブジェクトを処理
    # プロジェクト固有オブジェクトを優先表示するため、順序を制御

    # 1. AdminCapとMomentRegistry（プロジェクト固有の重要オブジェクト）を先に出力
    jq -r '.objectChanges[]
        | select(.type == "created")
        | select(.objectType != null)
        | select(.objectType | contains("AdminCap") or contains("MomentRegistry"))
        | "\(.objectType)|\(.objectId)"' "$json_file" 2>/dev/null | \
    while IFS='|' read -r object_type object_id; do
        if [[ -n "$object_type" ]] && [[ -n "$object_id" ]]; then
            local env_var_name=$(generate_env_var_name "$object_type")
            echo "${env_var_name}|${object_id}"
        fi
    done

    # 2. その他の標準オブジェクト
    jq -r '.objectChanges[]
        | select(.type == "created")
        | select(.objectType != null)
        | select(.objectType | contains("AdminCap") or contains("MomentRegistry") | not)
        | "\(.objectType)|\(.objectId)"' "$json_file" 2>/dev/null | \
    while IFS='|' read -r object_type object_id; do
        if [[ -n "$object_type" ]] && [[ -n "$object_id" ]]; then
            local env_var_name=$(generate_env_var_name "$object_type")
            echo "${env_var_name}|${object_id}"
        fi
    done
}

# デプロイJSONから抽出した環境変数を連想配列として返す
# 使用例:
#   declare -A env_vars
#   parse_to_array "$json_file" env_vars
#   echo "${env_vars[PACKAGE_ID]}"
parse_to_array() {
    local json_file="$1"
    local -n result_array=$2

    while IFS='|' read -r key value; do
        if [[ -n "$key" ]] && [[ -n "$value" ]]; then
            result_array["$key"]="$value"
        fi
    done < <(parse_deploy_json "$json_file")
}

# .env形式のファイルを生成
generate_env_file() {
    local json_file="$1"
    local network="$2"
    local output_file="$3"

    {
        echo "# Generated from Sui deploy result"
        echo "# Network: $network"
        echo "# Generated at: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""

        # パース結果を.env形式で出力
        while IFS='|' read -r key value; do
            if [[ -n "$key" ]] && [[ -n "$value" ]]; then
                echo "${key}=${value}"
            fi
        done < <(parse_deploy_json "$json_file")

    } > "$output_file"
}
