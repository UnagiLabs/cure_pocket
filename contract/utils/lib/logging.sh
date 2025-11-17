#!/bin/bash
# logging.sh - ログ出力関数ライブラリ

# カラーコード
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_YELLOW='\033[1;33m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_RESET='\033[0m'

# ログレベル
readonly LOG_LEVEL_INFO="INFO"
readonly LOG_LEVEL_SUCCESS="SUCCESS"
readonly LOG_LEVEL_ERROR="ERROR"
readonly LOG_LEVEL_WARNING="WARNING"

# ログファイルのパス（グローバル変数）
LOG_FILE=""

# ログファイルを設定
# 引数:
#   $1 - ログファイルのパス
set_log_file() {
    LOG_FILE="$1"

    # ログディレクトリが存在しない場合は作成
    local log_dir=$(dirname "$LOG_FILE")
    if [[ ! -d "$log_dir" ]]; then
        mkdir -p "$log_dir"
    fi
}

# 情報ログを出力
# 引数:
#   $1 - メッセージ
log_info() {
    local message="$1"
    echo -e "${COLOR_BLUE}ℹ️  [${LOG_LEVEL_INFO}]${COLOR_RESET} ${message}"
    log_to_file "[${LOG_LEVEL_INFO}] ${message}"
}

# 成功ログを出力
# 引数:
#   $1 - メッセージ
log_success() {
    local message="$1"
    echo -e "${COLOR_GREEN}✅ [${LOG_LEVEL_SUCCESS}]${COLOR_RESET} ${message}"
    log_to_file "[${LOG_LEVEL_SUCCESS}] ${message}"
}

# エラーログを出力
# 引数:
#   $1 - メッセージ
log_error() {
    local message="$1"
    echo -e "${COLOR_RED}❌ [${LOG_LEVEL_ERROR}]${COLOR_RESET} ${message}" >&2
    log_to_file "[${LOG_LEVEL_ERROR}] ${message}"
}

# 警告ログを出力
# 引数:
#   $1 - メッセージ
log_warning() {
    local message="$1"
    echo -e "${COLOR_YELLOW}⚠️  [${LOG_LEVEL_WARNING}]${COLOR_RESET} ${message}"
    log_to_file "[${LOG_LEVEL_WARNING}] ${message}"
}

# ファイルにログを出力（内部関数）
# 引数:
#   $1 - メッセージ
log_to_file() {
    if [[ -n "$LOG_FILE" ]]; then
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo "[${timestamp}] $1" >> "$LOG_FILE"
    fi
}

# セクション区切りを出力
# 引数:
#   $1 - セクションタイトル
log_section() {
    local title="$1"
    echo ""
    echo -e "${COLOR_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
    echo -e "${COLOR_BLUE}  ${title}${COLOR_RESET}"
    echo -e "${COLOR_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
    echo ""
    log_to_file "=== ${title} ==="
}
