# 后续计划 / Roadmap

状态核对：2026-10-30。此页区分已实现未发布、已确定未完成与仅供选择的建议；不是自动执行授权。

## 已实现，准备发布 1.6.0

- [ ] 整理下一版 changelog、双语 README、兼容说明与安装包，验证归档内容后发布 GitHub Release / npm。1.6.0 已通过 103 项测试与打包审核；npm 认证检查返回 E401，尚未发布到 registry。源码和 GitHub 草稿先保存，待维护者私下恢复 npm 登录后继续；公开 npm/市场仍为 1.5.0。
- [x] 本地完成并经用户验收：实时估算输出速度／完成后 API 均速、思考时间保留、清晰的未上报思考 tokens、简洁统一 tips、底栏按实际宽度优先隐藏恢复。
- [x] 本地完成并经用户验收：24h 近期点并入原生 idle 标记区、1h 会话双向顶部停靠／轻亮及冷却修复。
- [x] 本地完成并经用户验收：工作台设置分组、主价格表与高级 JSON 一份规则、双币种预填和币种选择、DeepSeek 双行价格、移除工作台边缘多余宽度柄。
- [x] 本地完成并经用户验收：配置过的渠道卡片常驻模型列表、上下文／输出上限批量预览及版本校验保存，保留思考强度插件。真实容量未因测试被改写。

## 已提出，尚未完成

- [x] **用户提供的 Kimi 价格录入**：2026-10-29 五个型号的双币种表已全部录入，包括 K2.7 标准／高速、K3、K3.1 Pro 标准／高速及 Coding 精确路由映射。K3 人民币缓存命中“——”保留未知；未列出的缓存写入不视为用户漏交资料。不再列为等待用户补价。
- [ ] **内部渠道型号映射核对**：核对渠道 `k3-256k` 与已提供官方型号的对应关系；不擅自套为 K2.7，不将内部映射问题列作用户报价缺口。此项是工程核对，不需要用户重复提供已给价表。不自动换汇，不宣称订阅扣额。
- **可选维护而非用户待办**：今后按需独立核验参考价格及变化；当前是固定快照，不宣称全量实时官方价表。用户已提供本次所需资料，不以额外核验为由重复索价。
- [ ] **缓存实际效果**：插件侧减少无关重绑、统计纠偏和前缀诊断已做；上游路由、TTL、原始 usage 转发与真实命中改善未证实。不可发额外付费请求刷命中。
- [x] **市场 PR 合并**：[9524](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/9524) 已核对为 MERGED。
- [x] **市场可见性**：已通过配置索引检索到 `dsh-atelier-plugin@1.5.0`，仓库和安装目标正确。
- [ ] **市场新版更新**：发布 1.6.0 后核对索引刷新，不把 npm 发布视为市场已同步。

## 下一阶段：会话永久删除

- [ ] 用户已提出删除会话，随后选择先发布当前已完成版、删除进入下一阶段。宿主 rc.3 无安全删除 API，不通过拼路径删文件或假按钮绕过。范围、确认、写锁、fork、附件和缓存要求见[删除计划](docs/session-deletion-plan.md)。

## 土星方案：按用户决定暂缓接入

- [x] 核对 stock 0.2.1-rc.3 无独立图标入口；在独立源码新增正式扩展点，默认鲸鱼回退。
- [x] 14px 土星插件、单行过程／思考状态与内容展开的源码方案，构建和聚合类型检查通过。
- [x] 隔离实际浏览器验收深色纯思考流：收起、展开只有一条状态，计时持续、正文可读。
- [ ] 浅色最终版、减少动态效果、禁用恢复、工具／多组／滚动矩阵和最终广泛回归。
- [ ] 确认上游扩展点或受支持构建方案，用户另行同意后才能切换当前应用。当前未替换日常应用，**本轮不继续做**。

详细边界与可审查源码见 [土星实验方案](experiments/mini-saturn/README.md)。

## 思考滑块与整合

- [x] 深空飞船外观已实现并由用户验收：轨道横向 320px、上下厚 28px，飞船 96×72；无白边，首尾可伸出，不改变原档位与保存逻辑。
- [ ] 严格会话覆盖／恢复继承需要宿主正式 API；现有选择会后台保存部署默认，不添加语义不实的“仅本会话”按钮。见[思考设置说明](docs/reasoning-integration.md)。

## 已评估，不代表已批准实施

- [ ] Reasoning Effort / BrowserSkill / dsh-context 三插件统一导航与设置：仅做兼容性评估和现有模型卡片适配，未完成三者整合；保留每个插件的权限与生命周期。

## 可选建议，未承诺交付

本轮／会话指标切换、预算提醒、日志搜索与手动删除、诊断导出、自动更新提示、自动分时／节假日历史计价、宣传视频和社区推广。需用户选择后再进入确定待办，不能把先前建议当作漏做承诺。

## English summary

Version 1.6.0 is in release preflight; registry and release verification remain separate. The supplied Kimi price table is fully recorded; only internal channel/model mapping remains to be checked, not another request for user prices. Independent price verification is optional maintenance, while upstream cache effectiveness remains unproven. Marketplace PR 9524 is merged, and the configured index exposes 1.5.0; the next version needs a separate refresh check. The Saturn source experiment is archived and explicitly deferred from production activation. Three-plugin integration is assessed, not implemented or implicitly authorized. Optional budget/log/export/update features are suggestions, not delivery promises.
