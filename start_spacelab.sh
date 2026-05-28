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
check_port() {
    if lsof -i:$1 >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 6. 启动后端 API 服务器
echo -e "\n${CYAN}>>> 启动后端 API 服务器...${NC}"

if check_port 9621; then
    echo -e "${YELLOW}端口 9621 已被占用，跳过启动 API 服务器${NC}"
else
    nohup python -c "from lightrag.api.lightrag_server import main; main()" \
        > logs/api_server.log 2>&1 &
    API_PID=$!
    echo $API_PID > .api_server.pid
    echo -e "${GREEN}✓ API 服务器已启动 (PID: $API_PID)${NC}"
    echo -e "   API 文档: http://localhost:9621/docs"
fi

# 7. 启动 WebUI 开发服务器
echo -e "\n${CYAN}>>> 启动 WebUI 开发服务器...${NC}"

if check_port 5173; then
    echo -e "${YELLOW}端口 5173 已被占用，跳过启动 WebUI${NC}"
else
    cd lightrag_webui
    nohup npm run dev > ../logs/webui.log 2>&1 &
    WEBUI_PID=$!
    echo $WEBUI_PID > ../.webui.pid
    echo -e "${GREEN}✓ WebUI 服务器已启动 (PID: $WEBUI_PID)${NC}"
    cd "$SCRIPT_DIR"
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
