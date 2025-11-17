#!/bin/bash
# input.sh - ユーザー入力処理ライブラリ

# プロンプトを表示して入力を取得
# 引数:
#   $1 - プロンプトメッセージ
#   $2 - デフォルト値（オプション）
# 戻り値:
#   入力された値（またはデフォルト値）
prompt_input() {
    local prompt="$1"
    local default_value="$2"
    local input_value

    if [[ -n "$default_value" ]]; then
        read -p "${prompt} [${default_value}]: " input_value
        echo "${input_value:-$default_value}"
    else
        read -p "${prompt}: " input_value
        echo "$input_value"
    fi
}

# Yes/Noの確認プロンプト
# 引数:
#   $1 - 確認メッセージ
#   $2 - デフォルト値（"y" or "n"、オプション）
# 戻り値:
#   0 - Yes、1 - No
prompt_yes_no() {
    local prompt="$1"
    local default_value="$2"
    local input_value
    local prompt_suffix

    # デフォルトを小文字に変換（bash 3.2対応）
    local default_value_lc="$(printf '%s' "$default_value" | tr '[:upper:]' '[:lower:]')"

    case "$default_value_lc" in
        y|yes)
            prompt_suffix="(Y/n)"
            ;;
        n|no)
            prompt_suffix="(y/N)"
            ;;
        *)
            prompt_suffix="(y/n)"
            ;;
    esac

    while true; do
        read -p "${prompt} ${prompt_suffix}: " input_value
        input_value="$(printf '%s' "$input_value" | tr '[:upper:]' '[:lower:]')"

        # デフォルト値の処理
        if [[ -z "$input_value" ]] && [[ -n "$default_value_lc" ]]; then
            input_value="$default_value_lc"
        fi

        case "$input_value" in
            y|yes)
                return 0
                ;;
            n|no)
                return 1
                ;;
            *)
                echo "y または n を入力してください。"
                ;;
        esac
    done
}

# 数値の検証
# 引数:
#   $1 - 検証する値
# 戻り値:
#   0 - 有効な数値、1 - 無効
validate_number() {
    local value="$1"

    # 空文字チェック
    if [[ -z "$value" ]]; then
        return 1
    fi

    # 数値以外の文字が含まれていないかチェック
    # ASCIIの数字のみを許可
    case "$value" in
        ''|*[!0-9]*)
            # 空文字または数字以外が含まれる
            return 1
            ;;
        *)
            # 数字のみ
            return 0
            ;;
    esac
}

# Suiアドレスの検証
# 引数:
#   $1 - 検証するアドレス
# 戻り値:
#   0 - 有効なアドレス、1 - 無効
validate_address() {
    local address="$1"

    # 空文字チェック
    if [[ -z "$address" ]]; then
        return 1
    fi

    # Suiアドレス形式チェック（0xで始まる64文字の16進数）
    if [[ "$address" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
        return 0
    else
        return 1
    fi
}

# 数値を入力させる（検証付き）
# 引数:
#   $1 - プロンプトメッセージ
#   $2 - デフォルト値（オプション）
# 戻り値:
#   入力された有効な数値
prompt_number() {
    local prompt="$1"
    local default_value="$2"
    local input_value

    while true; do
        input_value=$(prompt_input "$prompt" "$default_value")

        if validate_number "$input_value"; then
            echo "$input_value"
            return 0
        else
            log_error "有効な数値を入力してください。"
        fi
    done
}

# メニューから選択させる
# 引数:
#   $1 - メニュータイトル
#   $@ - メニュー項目（2番目以降の引数）
# 戻り値:
#   選択された項目のインデックス（1始まり）
prompt_menu() {
    local title="$1"
    shift
    local options=("$@")
    local choice

    {
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  ${title}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        for i in "${!options[@]}"; do
            echo "$((i+1)). ${options[$i]}"
        done
        echo "0. 戻る/終了"
        echo ""
    } >&2

    while true; do
        printf "選択してください: " >&2
        read -r choice

        # 改行やスペースをトリム
        choice=$(echo "$choice" | tr -d '[:space:]')

        if [[ "$choice" == "0" ]]; then
            echo "0"
            return 0
        elif validate_number "$choice" 2>/dev/null; then
            # 数値として有効な場合のみ、範囲チェック
            if [[ "$choice" -ge 1 ]] 2>/dev/null && [[ "$choice" -le "${#options[@]}" ]] 2>/dev/null; then
                echo "$choice"
                return 0
            fi
        fi

        printf "1 から %s の数値、または 0 を入力してください。\n" "${#options[@]}" >&2
    done
}
