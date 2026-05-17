# SpaceLab Module

SpaceLabOS 双屏联动演示系统的核心模块，面向开发者的快速参考。

## 文档体系

| 文档 | 内容 |
|------|------|
| [SPACELAB_USER_MANUAL.md](../SPACELAB_USER_MANUAL.md) | 双屏使用手册（面向用户） |
| [SPACELAB_TECHNICAL_WHITEPAPER.md](../SPACELAB_TECHNICAL_WHITEPAPER.md) | 技术白皮书（面向开发者） |
| [README.md](../SPACELAB_USER_MANUAL.md) | 同上，使用手册入口 |

## 快速参考

### 访问地址

```
http://localhost:5173/webui/#/spacelab         # 入口导航
http://localhost:5173/webui/#/spacelab/main   # 演示大屏
http://localhost:5173/webui/#/spacelab/tablet  # 平板终端
```

### 核心文件

| 文件 | 职责 |
|------|------|
| `TabletApp.tsx` | 平板终端主界面 |
| `SpaceLabApp.tsx` | 大屏主控界面 |
| `conversationStore.ts` | 多会话状态（Zustand） |
| `store.ts` | 全局状态（舱体/告警/HITL） |
| `DagEditor.tsx` | DAG 步骤编辑器 |
| `MarkdownRenderer.tsx` | Markdown + 思考折叠渲染 |
| `skills.ts` | Skills 路由 + DAG 解析 |

### 状态同步

```
平板端操作 (TabletApp)
    │
    └── useSpaceLabStore.labModules 更新
            │
            └── 大屏订阅感知
                    │
                    ├── LabModuleGrid — 卡片进度更新
                    ├── LabModuleDetail — DAG SVG 重绘
                    └── AlertLog — 实时日志追加
```

### LLM 流式查询

```typescript
import { queryTextStream } from '@/api/lightrag'

await queryTextStream(
  { query, mode: 'mix', stream: true },
  (chunk) => appendMsg(activeId, msgId, chunk),
  (error) => handleError(error)
)
```
