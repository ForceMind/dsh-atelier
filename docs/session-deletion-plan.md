# 会话永久删除：下一阶段

状态：2026-10-30，经用户选择，**先发布已完成的工作台版本，删除功能进入下一阶段**。当前版本不提供删除按钮，也不改动任何真实会话。

## 为什么不能把归档当删除

DSH 0.2.1-rc.3 的 `sessionPersistence` 正式服务仅提供 create/open/flush/stat/list；会话句柄仅有 read/append/flush/close。工作区的 archiveSession 只是归档状态，工作区 delete 明确保留会话日志。当前不能经受支持的插件 API 永久删除会话。

## 实现边界

需要独立宿主源码扩展，不能由 Atelier 拼接磁盘路径删除日志：

1. 新增正式的会话删除服务和权限判定，按会话 ID 操作。提供可重复重试、明确拒绝原因、失败可恢复的提交语义。
2. 删除期间封锁 prompt/resume/fork/后台任务等新工作。生命周期所有者保留精确 AgentHandle，等待运行、子任务、终端和写句柄结算，而不只是发停止信号。
3. 持久化后端在跨进程写锁保护下处理该会话全部历史日志世代，避免旧世代重新出现；禁止 unlink 活跃锁文件。
4. 删除提交后清理工作区条目／置顶／归档、投影缓存和搜索索引，阻止最后一次异步缓存写入重新生成记录，通知客户端移除。
5. 首版可拒绝有未解决依赖、外部写者或所有权不明的会话；独立 fork 不是自动递归删除目标。fork 已复制的对话内容不会因删除父会话而消失。
6. 附件为全局内容寻址共享对象，首版保留共享附件，不承诺安全擦除；后续 GC 需要完整引用可达性分析。不会删除项目目录、用户代码或交付文件。

## 交互要求

- 入口置于原会话操作菜单或归档管理页，与“归档”清晰区分。
- 永久删除前展示准确的会话名／ID、影响范围、不可恢复提示；二次确认绑定同一会话，不使用列表索引。
- 运行中不静默终止；明确要求先停止或拒绝操作。权限、外部写锁、依赖冲突必须由 Host 再检验。
- 一次只删除明确选择的目标；批量／级联另行设计。失败不显示成功、不先从列表乐观隐藏。

## 必须通过的测试

缺失会话及重复请求；删除与 create/resume/prompt/fork 的竞争；最终事件结算与句柄关闭；跨进程写者冲突；历史世代不复活；崩溃重试；独立 fork 与拥有的子任务区分；工作区、搜索与投影缓存不残留或重建；共享附件仍可由其他会话读取；真实 Loader 和实际界面确认流程。

## 源码核对依据

匹配 `dsh-v0.2.1-rc.3` 源码：`packages/session/session-persistence/src/index.ts` 与 `handle.ts`、`packages/core/agent-loop/src/index.ts`、`packages/api/session-controller/src/agent.ts`、`packages/session/session-persistence-jsonl/src/lease.ts`、`packages/workspace/workspace/src/index.ts`、`packages/core/session/src/fork.ts`、投影缓存／搜索索引和 attachment-local 的共享对象实现。

以上为设计与只读核对，不是已实现或已通过删除测试。后续需单独建立源码分支和隔离测试数据，取得切换新构建的明确同意后才可能用于日常应用。

## English summary

Permanent session deletion is deferred to a follow-up host extension. Stock rc.3 has no supported deletion API; archive is not deletion. A safe implementation needs lifecycle admission fencing, exact agent/writer settlement, cross-process-safe all-generation deletion, cache/index/registry cleanup, explicit user confirmation, and crash-safe retry semantics. Independent forks and shared attachments must not be silently erased. No real session was removed and no placeholder Delete button ships in this release.
