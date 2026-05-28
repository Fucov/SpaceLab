#!/bin/bash
# ==========================================
# 天宫智能助手 启动脚本
# 支持双屏：平板终端 + 电脑大屏
# ==========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}=========================================="
echo -e "    天宫智能助手 启动脚本"
echo -e "==========================================${NC}"

# 1. 检查虚拟环境
if [ ! -d ".venv" ]; then
    echo -e "${RED}错误: .venv 目录不存在!${NC}"
    echo -e "${YELLOW}请先创建虚拟环境: uv venv${NC}"
    exit 1
fi

# 2. 激活虚拟环境
echo -e "\n${YELLOW}>>> 激活虚拟环境...${NC}"
source .venv/bin/activate

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 虚拟环境激活失败!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 虚拟环境已激活${NC}"

# 3. 加载环境变量
if [ -f ".env" ]; then
    echo -e "\n${YELLOW}>>> 加载环境变量...${NC}"
    set -a
    source .env
    set +a
    echo -e "${GREEN}✓ 环境变量已加载${NC}"
else
    echo -e "${RED}警告: .env 文件不存在!${NC}"
fi

# 4. 创建日志目录
mkdir -p logs

# 5. 检查端口是否被占用
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
        echo -e "${YELLOW}端口 $PORT 已被占用，正在清理旧的 ${NAME} 进程: $PIDS${NC}"
        kill $PIDS 2>/dev/null
        sleep 1
        PIDS=$(port_pids "$PORT" | tr '\n' ' ')
        if [ -n "$PIDS" ]; then
            kill -9 $PIDS 2>/dev/null
            sleep 1
        fi
    elif check_port "$PORT"; then
        echo -e "${RED}端口 $PORT 被占用，但无法识别 ${NAME} 进程 PID${NC}"
    fi
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
        echo -e "${YELLOW}正在清理残留 WebUI/Vite 进程: $PIDS${NC}"
        kill $PIDS 2>/dev/null
        sleep 1
        for PID in $PIDS; do
            if kill -0 "$PID" 2>/dev/null; then
                kill -9 "$PID" 2>/dev/null
            fi
        done
    fi
}

wait_for_port() {
    local PORT=$1
    local PATH_SUFFIX=${2:-/}
    local PID=${3:-}
    local RETRY=${4:-40}
    while [ $RETRY -gt 0 ]; do
        if check_port "$PORT" || http_reachable "$PORT" "$PATH_SUFFIX"; then
            return 0
        fi
        if [ -n "$PID" ] && ! kill -0 "$PID" 2>/dev/null; then
            return 1
        fi
        sleep 0.5
        RETRY=$((RETRY - 1))
    done
    return 1
}

# 6. 启动后端 API 服务器
echo -e "\n${CYAN}>>> 启动后端 API 服务器...${NC}"

if check_port 9621 || http_reachable 9621 "/docs"; then
    kill_port 9621 "API"
fi

if check_port 9621 || http_reachable 9621 "/docs"; then
    echo -e "${RED}错误: 端口 9621 仍被占用，无法启动 API${NC}"
    echo -e "${YELLOW}如果 ss/lsof 查不到 PID，这通常表示服务运行在宿主机、WSL 转发层或其他命名空间中。${NC}"
    exit 1
fi

setsid python -c "from lightrag.api.lightrag_server import main; main()" \
    > logs/api_server.log 2>&1 &
API_PID=$!
echo "$API_PID" > .api_server.pid
if wait_for_port 9621 "/docs" "$API_PID" 80; then
    echo -e "${GREEN}✓ API 服务器已启动 (PID: $API_PID)${NC}"
    echo -e "   API 文档: http://localhost:9621/docs"
else
    echo -e "${RED}错误: API 服务器未能在 9621 启动，请查看 logs/api_server.log${NC}"
    rm -f .api_server.pid
    exit 1
fi

# 7. 启动 WebUI 开发服务器
echo -e "\n${CYAN}>>> 启动 WebUI 开发服务器...${NC}"

kill_webui_processes

if check_port 5173 || http_reachable 5173 "/webui/"; then
    kill_port 5173 "WebUI"
fi

if check_port 5173 || http_reachable 5173 "/webui/"; then
    echo -e "${RED}错误: 端口 5173 仍被占用，无法启动 WebUI${NC}"
    echo -e "${YELLOW}如果 ss/lsof 查不到 PID，这通常表示旧 Vite 服务运行在宿主机、WSL 转发层或其他命名空间中。${NC}"
    exit 1
fi

cd lightrag_webui
setsid npm run dev -- --host 0.0.0.0 --port 5173 --strictPort > ../logs/webui.log 2>&1 &
WEBUI_PID=$!
echo "$WEBUI_PID" > ../.webui.pid
cd "$SCRIPT_DIR"

if wait_for_port 5173 "/webui/" "$WEBUI_PID" 40; then
    echo -e "${GREEN}✓ WebUI 服务器已启动 (PID: $WEBUI_PID)${NC}"
else
    echo -e "${RED}错误: WebUI 未能在 5173 启动，请查看 logs/webui.log${NC}"
    rm -f .webui.pid
    exit 1
fi

# 8. 等待服务启动
echo -e "\n${YELLOW}>>> 等待服务启动...${NC}"
sleep 3

# 9. 显示访问信息
echo -e "\n${CYAN}=========================================="
echo -e "    启动完成!"
echo -e "==========================================${NC}"
echo -e "\n${GREEN}访问地址:${NC}"
echo -e "  ${CYAN}平板终端:${NC} http://localhost:5173/webui/#/spacelab/tablet"
echo -e "  ${CYAN}电脑大屏:${NC} http://localhost:5173/webui/#/spacelab/main"
echo -e "  ${CYAN}入口导航:${NC} http://localhost:5173/webui/#/spacelab"
echo -e "\n${YELLOW}API 服务:${NC}"
echo -e "  http://localhost:9621/docs"
echo -e "\n${YELLOW}日志文件:${NC}"
echo -e "  - API 日志:  logs/api_server.log"
echo -e "  - WebUI 日志: logs/webui.log"
echo -e "\n${YELLOW}停止服务: bash stop_spacelab.sh${NC}"
echo ""
