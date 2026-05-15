#!/bin/bash
# ==========================================
# SpaceLabOS 停止脚本
# ==========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}=========================================="
echo -e "    停止 SpaceLabOS 服务"
echo -e "==========================================${NC}\n"

# 停止 API 服务器
if [ -f ".api_server.pid" ]; then
    API_PID=$(cat .api_server.pid)
    if kill -0 $API_PID 2>/dev/null; then
        echo -e "${YELLOW}>>> 停止 API 服务器 (PID: $API_PID)...${NC}"
        kill $API_PID 2>/dev/null
        sleep 1
        if kill -0 $API_PID 2>/dev/null; then
            kill -9 $API_PID 2>/dev/null
        fi
        echo -e "${GREEN}✓ API 服务器已停止${NC}"
    else
        echo -e "${YELLOW}API 服务器未运行${NC}"
    fi
    rm -f .api_server.pid
else
    echo -e "${YELLOW}API 服务器 PID 文件不存在，尝试通过端口查找...${NC}"
    API_PID=$(lsof -ti:9621 2>/dev/null)
    if [ -n "$API_PID" ]; then
        kill $API_PID 2>/dev/null
        echo -e "${GREEN}✓ API 服务器已停止 (PID: $API_PID)${NC}"
    fi
fi

# 停止 WebUI 服务器
cd lightrag_webui
if [ -f "../.webui.pid" ]; then
    WEBUI_PID=$(cat ../.webui.pid)
    if kill -0 $WEBUI_PID 2>/dev/null; then
        echo -e "${YELLOW}>>> 停止 WebUI 服务器 (PID: $WEBUI_PID)...${NC}"
        kill $WEBUI_PID 2>/dev/null
        sleep 1
        if kill -0 $WEBUI_PID 2>/dev/null; then
            kill -9 $WEBUI_PID 2>/dev/null
        fi
        echo -e "${GREEN}✓ WebUI 服务器已停止${NC}"
    else
        echo -e "${YELLOW}WebUI 服务器未运行${NC}"
    fi
    rm -f ../.webui.pid
else
    echo -e "${YELLOW}WebUI PID 文件不存在，尝试通过端口查找...${NC}"
    WEBUI_PID=$(lsof -ti:5173 2>/dev/null)
    if [ -n "$WEBUI_PID" ]; then
        kill $WEBUI_PID 2>/dev/null
        echo -e "${GREEN}✓ WebUI 服务器已停止${NC}"
    fi
fi

cd "$SCRIPT_DIR"

echo -e "\n${GREEN}所有服务已停止${NC}"
