# 后续计划 / Roadmap

状态核对：2026-10-29。此页区分已实现未发布、已确定未完成与仅供选择的建议；不是自动执行授权。

## 已实现，待统一发布

- [ ] 整理下一版 changelog、双语 README、兼容说明与安装包，验证归档内容后发布 GitHub Release / npm。公开最新仍为 `dsh-atelier-plugin@1.5.0`。
- [x] 本地完成并经用户验收：实时估算输出速度／完成后 API 均速、思考时间保留、清晰的未上报思考 tokens、简洁统一 tips、底栏按实际宽度优先隐藏恢复。
- [x] 本地完成并经用户验收：24h 近期点并入原生 idle 标记区、1h 会话双向顶部停靠／轻亮及冷却修复。
- [x] 本地完成并经用户验收：工作台设置分组、主价格表与高级 JSON 一份规则、双币种预填和币种选择、DeepSeek 双行价格、移除工作台边缘多余宽度柄。
- [x] 本地完成并经用户验收：配置过的渠道卡片常驻模型列表、上下文／输出上限批量预览及版本校验保存，保留思考强度插件。真实容量未因测试被改写。

## 已提出，尚未完成

- [ ] **价格补全**：已按用户 2026-10-29 新表配置 K2.7 标准／高速、K3、K3.1 Pro 标准／高速双币种报价，修正 K2.7 人民币价格并补 Coding HighSpeed 人民币映射。`k3-256k` 不在新表中，仍需精确型号报价；K3 人民币缓存命中与所有缓存写入价未提供，保留未知。不自动换汇，不宣称订阅扣额。
- [ ] **常用模型价格全量核验**：当前存在固定文档快照、用户未独立核验参考价和精确渠道映射，尚非全量实时官方报价服务。需要模型 ID、地区／币种和缓存单价证据。
- [ ] **缓存实际效果**：插件侧减少无关重绑、统计纠偏和前缀诊断已做；上游路由、TTL、原始 usage 转发与真实命中改善未证实。不可发额外付费请求刷命中。
- [x] **市场 PR 合并**：[9524](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/9524) 已核对为 MERGED。
- [ ] **市场可见性与版本更新**：核对配置市场索引中实际可检索、包名正确且版本更新；PR 合并不等于索引已刷新。

## 土星方案：按用户决定暂缓接入

- [x] 核对 stock 0.2.1-rc.3 无独立图标入口；在独立源码新增正式扩展点，默认鲸鱼回退。
- [x] 14px 土星插件、单行过程／思考状态与内容展开的源码方案，构建和聚合类型检查通过。
- [x] 隔离实际浏览器验收深色纯思考流：收起、展开只有一条状态，计时持续、正文可读。
- [ ] 浅色最终版、减少动态效果、禁用恢复、工具／多组／滚动矩阵和最终广泛回归。
- [ ] 确认上游扩展点或受支持构建方案，用户另行同意后才能切换当前应用。当前未替换日常应用，**本轮不继续做**。

详细边界与可审查源码见 [土星实验方案](experiments/mini-saturn/README.md)。

## 已评估，不代表已批准实施

- [ ] Reasoning Effort / BrowserSkill / dsh-context 三插件统一导航与设置：仅做兼容性评估和现有模型卡片适配，未完成三者整合；保留每个插件的权限与生命周期。

## 可选建议，未承诺交付

本轮／会话指标切换、预算提醒、日志搜索与手动删除、诊断导出、自动更新提示、自动分时／节假日历史计价、宣传视频和社区推广。需用户选择后再进入确定待办，不能把先前建议当作漏做承诺。

## English summary

Local UI improvements are implemented but remain unreleased after npm 1.5.0. Missing Kimi prices await user data; broader live price verification and upstream cache effectiveness remain open. Marketplace PR 9524 is merged, while actual index visibility still needs checking. The Saturn source experiment is archived and explicitly deferred from production activation. Three-plugin integration is assessed, not implemented or implicitly authorized. Optional budget/log/export/update features are suggestions, not delivery promises.
