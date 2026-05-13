import streamlit as st
import requests
import json
import os
import re
import pandas as pd
import numpy as np
import streamlit.components.v1 as components
from streamlit_mic_recorder import speech_to_text
from dotenv import load_dotenv

load_dotenv()

# =================配置区域（从 .env 读取）=================
BASE_URL = os.getenv("TIANGONG_BASE_URL", "http://127.0.0.1:9621")
STORAGE_PATH = os.getenv("TIANGONG_STORAGE_PATH", "./rag_storage")
TESTDATA_PATH = os.getenv("TIANGONG_TESTDATA_PATH", "./testdata")
OUTPUT_PATH = os.getenv("TIANGONG_OUTPUT_PATH", "./output")
# ==========================================================

st.set_page_config(layout="wide", page_title="天宫智能体终端", page_icon="🛰️")

# 辅助 CSS
st.markdown("""
    <style>
    .main { background-color: #f0f2f6; }
    .stChatInput { border-radius: 20px; }
    .stButton>button { border-radius: 5px; height: 3em; background-color: #07c; color: white; }
    </style>
    """, unsafe_allow_html=True)


# --- 1. 工具函数 ---

def get_local_document_list():
    status_file = os.path.join(STORAGE_PATH, "kv_store_doc_status.json")
    if not os.path.exists(status_file): return []
    try:
        with open(status_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [{"文档ID": k, "状态": v.get("status", "未知")} for k, v in data.items()]
    except:
        return []


def trigger_voice_output(text):
    clean_text = text.replace('"', '\"').replace('\n', ' ').strip()[:300]
    js_code = f"""<script>window.speechSynthesis.cancel(); var msg = new SpeechSynthesisUtterance("{clean_text}"); msg.lang='zh-CN'; msg.rate=1.5; window.speechSynthesis.speak(msg);</script>"""
    components.html(js_code, height=0)


# --- 2. 智能体 Agent 核心逻辑 ---
def agent_run_logic(user_prompt, file_name):
    """
    智能体核心逻辑：
    1. 检索《数据处理手册》获取编程规范
    2. 结合规范与用户需求生成 Python 代码
    3. 清洗代码并进行安全检查
    4. 动态执行代码并反馈结果
    """
    # 路径格式化：统一使用正斜杠防止转义错误
    clean_path = os.path.join(TESTDATA_PATH, file_name).replace("\\", "/")

    # --- 第一阶段：RAG 规程检索 ---
    # 尝试获取你在 RAG 中存储的《数据处理手册.txt》
    try:
        manual_res = requests.post(
            f"{BASE_URL}/query",
            json={"query": "数据处理手册：编程规范与 Excel 读取禁令", "mode": "local"},
            timeout=10
        )
        manual_context = manual_res.json().get("response", "编写 Python 代码处理数据，使用 pandas 和 streamlit。")
    except Exception:
        manual_context = "优先确保 read_excel 不包含 encoding 参数。使用 st.line_chart 绘图。"

    # --- 第二阶段：构造增强版 Prompt ---
    agent_prompt = f"""
# ROLE: Senior Space Data Scientist
# CONTEXT RULES:
{manual_context}

# TASK:
1. Load data from '{clean_path}'.
2. Perform Denoising if requested in user requirement.
3. Calculate Statistics (Count, Mean, Max, Min).
4. Visualize data using Streamlit.

# USER REQUIREMENT:
"{user_prompt}"

# CODE STRUCTURE REQUIREMENTS (STRICT):
- Use `col1, col2, col3 = st.columns(3)` to display Mean, Max, and Min as `st.metric`.
- Use `st.line_chart` for data visualization.
- Use `st.dataframe(df.describe())` for full statistics table.
- OUTPUT ONLY CLEAN PYTHON CODE. NO EXPLANATIONS.
"""

    try:
        # 向 LLM 发送请求
        res = requests.post(f"{BASE_URL}/query", json={"query": agent_prompt, "mode": "naive"}, timeout=60)
        code = res.json().get("response", "").strip()

        # --- 第三阶段：代码深度清洗 (防止语法崩溃) ---

        # 1. 移除 Markdown 代码块标记 (```python ... ```)
        code = re.sub(r"```python|```", "", code).strip()

        # 2. 截断由于 RAG 习惯导致的末尾解释文字或引用
        # 只要遇到常见的非代码标记，就切断后续内容
        for noise in ["###", "References", "Note:", "说明:", "Reference"]:
            if noise in code:
                code = code.split(noise)[0].strip()

        # 3. 修复导入语句粘连问题 (针对模型输出不换行的情况)
        # 将 "import pandas as pdfrom" 修复为换行格式
        code = re.sub(r"(import\s+.+?)(from|import)", r"\1\n\2", code)

        # 4. 强制物理移除 Excel 的 encoding 幻觉 (最终保险)
        if ".xlsx" in file_name.lower():
            # 使用正则匹配并移除 read_excel 中的 encoding 参数
            code = re.sub(r",\s*encoding=['\"].+?['\"]", "", code)
            code = code.replace(', encoding="gbk"', "").replace(", encoding='gbk'", "")

        # 5. 空结果检查
        if len(code) < 10 or "Sorry" in code:
            st.error("智能体未能生成有效的执行代码。")
            st.warning(f"原始响应内容: {code}")
            return False

        # --- 第四阶段：动态展示与执行 ---

        with st.expander("🛠️ 查看智能体自主生成的执行代码"):
            st.code(code, language="python")

        # 定义执行环境，预置核心库
        exec_env = {
            "st": st,
            "pd": pd,
            "np": np,
            "plt": __import__("matplotlib.pyplot"),
            "savgol_filter": __import__("scipy.signal").signal.savgol_filter
        }

        # 动态执行代码
        # 在执行前先在环境里预执行 import 语句防止局部变量冲突
        exec("import pandas as pd\nimport streamlit as st", exec_env)
        exec(code, exec_env)

        # 检查是否生成了图片
        plot_path = os.path.join(OUTPUT_PATH, "latest_plot.png")
        if os.path.exists(plot_path):
            with open(plot_path, "rb") as file:
                btn = st.download_button(
                    label="💾 下载分析图表 (PNG)",
                    data=file,
                    file_name=f"分析结果_{file_name}.png",
                    mime="image/png"
                )
            if btn:
                st.success(f"文件已保存至: {plot_path}")

        # 同时保存一份处理后的数据
        if 'df' in exec_env:
            csv_path = os.path.join(OUTPUT_PATH, "processed_data.csv")
            exec_env['df'].to_csv(csv_path, index=False)
            st.info(f"清洗后的数据已同步备份至 output 文件夹")

        return True

    except Exception as e:
        st.error(f"⚠️ 智能体代码执行阶段出错: {e}")
        # 如果报错，将生成的代码打印出来方便答辩演示时排查问题
        st.info("尝试修复建议：请再次明确指令，例如'直接绘制 时间温度1.xlsx'")
        return False

# --- 3. 消息处理 ---

def process_qa(user_input):
    if not user_input: return
    st.session_state.messages.append({"role": "user", "content": user_input})

    with st.chat_message("user"):
        st.markdown(user_input)

    with st.chat_message("assistant"):
        # 1. 精准提取文件名（改进版正则）
        # 匹配任何以 .csv 或 .xlsx 结尾的部分
        file_match = re.search(r"([a-zA-Z0-9_\u4e00-\u9fa5\s\-\.]+\.(csv|xlsx))", user_input)

        if file_match and any(k in user_input for k in ["图", "分析", "降噪", "处理", "平滑", "统计", "计算", "平均", "最值"]):
            full_match_str = file_match.group(1).strip()
            # 过滤掉指令前缀干扰
            clean_filename = re.split(r"处理|绘制|对|针对|分析", full_match_str)[-1].strip()

            st.info(f"🧠 智能体锁定文件: {clean_filename}")
            if agent_run_logic(user_input, clean_filename):
                ans = f"已通过智能体自主编程完成对 {clean_filename} 的分析任务。"
                st.session_state.messages.append({"role": "assistant", "content": ans})
                trigger_voice_output(ans)

        # 2. RAG 规程检索
        else:
            with st.spinner("查阅天宫手册..."):
                try:
                    payload = {"query": user_input, "mode": rag_mode}
                    res = requests.post(f"{BASE_URL}/query", json=payload, timeout=60)
                    ans = res.json().get("response", "未找到结果")
                    st.markdown(ans)

                    if res.json().get("references"):
                        with st.expander("📚 参考来源"):
                            for r in res.json()["references"]: st.write(f"- {r.get('file_path')}")

                    st.session_state.messages.append({"role": "assistant", "content": ans})
                    trigger_voice_output(ans)
                except:
                    st.error("后端服务连接异常")


# --- 4. 侧边栏与布局 ---

with st.sidebar:
    st.title("🛰️ 任务控制台")
    st.subheader("📊 知识图谱")
    st.iframe(src=f"{BASE_URL}/webui/#/graph", height=400)

    st.divider()
    st.subheader("📂 知识导入")
    uploaded = st.file_uploader("上传规程", type=['txt', 'pdf', 'docx'])
    if uploaded and st.button("🚀 注入 RAG"):
        files = {"file": (uploaded.name, uploaded.getvalue(), "text/plain")}
        if requests.post(f"{BASE_URL}/documents/upload", files=files).status_code == 200:
            st.success("已注入");
            st.rerun()

    st.divider()
    st.subheader("📄 索引清单")
    docs = get_local_document_list()
    if docs: st.dataframe(docs, hide_index=True)
    if st.button("♻️ 刷新界面"): st.rerun()

# --- 5. 主界面 ---

st.title("🤖 天宫交互式智能助手")
rag_mode = st.radio("检索模式:", ["naive", "local", "global", "hybrid"], index=3, horizontal=True)

if "messages" not in st.session_state: st.session_state.messages = []
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]): st.markdown(msg["content"])

st.markdown("---")
col1, col2 = st.columns([1, 4])
with col1:
    voice = speech_to_text(language='zh', start_prompt="🎤 语音", key='v')
if voice: process_qa(voice)
if p := st.chat_input("示例: 对 时间温度1.xlsx 进行降噪绘图"): process_qa(p)