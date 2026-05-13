# ==========================================
# TiangongAgent 自动化启动脚本 (修复乱码版)
# ==========================================

# 1. 强制使用 UTF8 编码处理输出，防止控制台乱码
$OutputEncoding = [System.Text.Encoding]::UTF8

# 2. 注入核心环境变量 (直接作用于当前进程)
$env:OPENAI_API_KEY="sk-5b2ccb32856949be923139cfa9078e84"
$env:LLM_BINDING="openai"
$env:LLM_MODEL="qwen-turbo"
$env:LLM_BINDING_HOST="https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:EMBEDDING_BINDING="openai"
$env:EMBEDDING_MODEL="text-embedding-v2"
$env:EMBEDDING_BINDING_HOST="https://dashscope.aliyuncs.com/compatible-mode/v1"

# 3. 自动获取脚本所在目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path $scriptPath

Write-Host "---"
Write-Host "Current Directory: $scriptPath" -ForegroundColor Yellow

# 4. 激活虚拟环境
if (Test-Path ".\.venv\Scripts\activate.ps1") {
    . .\.venv\Scripts\activate.ps1
    Write-Host "OK: Virtual environment activated." -ForegroundColor Green
} else {
    Write-Host "Error: .venv not found in current directory!" -ForegroundColor Red
}

# 5. 启动服务端
Write-Host "🚀 Starting LightRAG Server..." -ForegroundColor Cyan
Write-Host "👉 Access the WebUI at: http://127.0.0.1:9621" -ForegroundColor Green

& ".\.venv\Scripts\python.exe" -m lightrag.api.lightrag_server --verbose

# 强制跳过确认并启动
echo "yes" | lightrag-server --verbose

Read-Host "Press Enter to exit..."