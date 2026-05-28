#!/bin/bash
# ==========================================
# 天宫智能助手 停止脚本
# ==========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}=========================================="
echo -e "    停止天宫智能助手服务"
echo -e "==========================================${NC}\n"

kill_pid_group() {
    local PID=$1
    local NAME=$2
    if [ -z "$PID" ]; then
        return 1
    fi
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${YELLOW}>>> 停止 ${NAME} (PID: $PID)...${NC}"
        kill -- -"$PID" 2>/dev/null || kill "$PID" 2>/dev/null
        sleep 1
        if kill -0 "$PID" 2>/dev/null; then
            kill -9 -- -"$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null
        fi
        return 0
    fi
    return 1
}

port_pids() {
    local PORT=$1
    local PIDS=""

    if command -v lsof >/dev/null 2>&1; then
        PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
    fi

    if [ -z "$PIDS" ] && command -v ss >/dev/null 2>&1; then
        PIDS="$(ss -ltnp 2>/dev/null \
            | awk -v port="$PORT" '$4 ~ ":" port "$" {print}' \
            | grep -o 'pid=[0-9]*' \
            | cut -d= -f2 \
            | sort -u || true)"
    fi

    if [ -z "$PIDS" ] && command -v fuser >/dev/null 2>&1; then
        PIDS="$(fuser -n tcp "$PORT" 2>/dev/null | tr ' ' '\n' || true)"
    fi

    echo "$PIDS" | awk 'NF && !seen[$0]++'
}

check_port() {
    local PORT=$1

    if [ -n "$(port_pids "$PORT")" ]; then
        return 0
    fi

    if command -v ss >/dev/null 2>&1; then
        ss -ltn 2>/dev/null | awk -v port="$PORT" '$4 ~ ":" port "$" {found=1} END {exit found ? 0 : 1}'
        return $?
    fi

    return 1
}

http_reachable() {
    local PORT=$1
    local PATH_SUFFIX=${2:-/}

    if command -v curl >/dev/null 2>&1; then
        curl -fsS --max-time 2 "http://127.0.0.1:${PORT}${PATH_SUFFIX}" >/dev/null 2>&1
        return $?
    fi

    return 1
}

kill_port() {
    local PORT=$1
    local NAME=$2
    local PIDS
    PIDS=$(port_pids "$PORT" | tr '\n' ' ')
    if [ -n "$PIDS" ]; then
        echo -e "${YELLOW}>>> 通过端口 $PORT 停止 ${NAME}: $PIDS${NC}"
        kill $PIDS 2>/dev/null
        sleep 1
        PIDS=$(port_pids "$PORT" | tr '\n' ' ')
        if [ -n "$PIDS" ]; then
            kill -9 $PIDS 2>/dev/null
        fi
        echo -e "${GREEN}✓ ${NAME} 已停止${NC}"
        return 0
    fi
    if check_port "$PORT"; then
        echo -e "${RED}${NAME} 端口 $PORT 被占用，但无法识别进程 PID${NC}"
        return 1
    fi
    echo -e "${YELLOW}${NAME} 未运行${NC}"
    return 1
}

kill_webui_processes() {
    local PIDS
    PIDS=""
    for PID in $(pgrep -f "$SCRIPT_DIR/lightrag_webui/node_modules/.bin/vite" 2>/dev/null); do
        PIDS="$PIDS $PID"
        PPID_OF_PID=$(ps -o ppid= -p "$PID" 2>/dev/null | tr -d ' ')
        if [ -n "$PPID_OF_PID" ]; then
            PIDS="$PIDS $PPID_OF_PID"
        fi
    done
    for PID in $(pgrep -f "npm run dev" 2>/dev/null); do
        CWD=$(readlink "/proc/$PID/cwd" 2>/dev/null || true)
        if [ "$CWD" = "$SCRIPT_DIR/lightrag_webui" ]; then
            PIDS="$PIDS $PID"
        fi
    done
    PIDS=$(echo "$PIDS" | tr ' ' '\n' | awk 'NF && !seen[$0]++' | tr '\n' ' ')
    if [ -n "$PIDS" ]; then
        echo -e "${YELLOW}>>> 清理残留 WebUI/Vite 进程: $PIDS${NC}"
        kill $PIDS 2>/dev/null
        sleep 1
        for PID in $PIDS; do
            if kill -0 "$PID" 2>/dev/null; then
                kill -9 "$PID" 2>/dev/null
            fi
        done
        echo -e "${GREEN}✓ 残留 WebUI/Vite 进程已清理${NC}"
    fi
}

# 停止 API 服务器
API_STOPPED=0
if [ -f ".api_server.pid" ]; then
    API_PID=$(cat .api_server.pid)
    if kill_pid_group "$API_PID" "API 服务器"; then
        echo -e "${GREEN}✓ API 服务器已停止${NC}"
        API_STOPPED=1
    fi
    rm -f .api_server.pid
fi
if [ "$API_STOPPED" -eq 0 ]; then
    kill_port 9621 "API 服务器"
elif check_port 9621; then
    kill_port 9621 "API 服务器"
fi

# 停止 WebUI 服务器
WEBUI_STOPPED=0
if [ -f ".webui.pid" ]; then
    WEBUI_PID=$(cat .webui.pid)
    if kill_pid_group "$WEBUI_PID" "WebUI 服务器"; then
        echo -e "${GREEN}✓ WebUI 服务器已停止${NC}"
        WEBUI_STOPPED=1
    fi
    rm -f .webui.pid
fi
if [ "$WEBUI_STOPPED" -eq 0 ]; then
    kill_port 5173 "WebUI 服务器"
elif check_port 5173; then
    kill_port 5173 "WebUI 服务器"
fi
kill_webui_processes

if http_reachable 9621 "/docs"; then
    echo -e "${RED}警告: http://127.0.0.1:9621 仍然可访问，但当前脚本没有找到可终止的 API 进程。${NC}"
    echo -e "${YELLOW}这通常表示服务运行在宿主机、WSL 转发层、容器或另一个终端命名空间中。${NC}"
fi

if http_reachable 5173 "/webui/"; then
    echo -e "${RED}警告: http://127.0.0.1:5173/webui/ 仍然可访问，但当前脚本没有找到可终止的 WebUI 进程。${NC}"
    echo -e "${YELLOW}这通常表示旧 Vite 服务运行在宿主机、WSL 转发层、容器或另一个终端命名空间中。${NC}"
fi

echo -e "\n${GREEN}所有服务已停止${NC}"
