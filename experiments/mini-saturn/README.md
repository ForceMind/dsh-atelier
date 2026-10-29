# 迷你土星：独立源码实验 / Mini Saturn source experiment

## 当前决定

本方案暂存于仓库，**不继续切换当前应用**。标准 DSH 0.2.1-rc.3 没有独立运行图标入口；普通安装 Atelier 或此目录插件不能替换现有鲸鱼。不得修改应用安装包、用内部 CSS 遮鲸鱼，或替换整个对话流来声称稳定兼容。

## 文件与实现

- [Harness 补丁](harness-0.2.1-rc.3.patch)：以官方 `dsh-v0.2.1-rc.3` 源码为基线；通过正式 Session 级 `conversation.chat.running` Component Factory 复用运行状态，并由它声明 `conversation.chat.running.icon`。
- [独立插件](plugin/README.md)：仅注册图标，原生鲸鱼 priority 0，土星 priority -10；禁用土星后默认注册仍在。插件不新增状态文字、计时器或独立播报。
- 土星为原创 SVG，14×14 CSS px，继承文字颜色，约 3 秒轻微摆动；减少动态效果时静止。
- 最新运行过程组或可见流式思考按钮承载同一状态，保留展开、键盘操作和正文。独立尾部提示仅在没有可见状态承载者时回退；不扫描全部历史 Node。

## 已验证与未验证

已验证：独立构建的资源编译和 Host/Client 聚合类型检查通过；相关 188 项测试通过（后续尾部控制节点回归所在的 ChatView 169 项测试通过）。浏览器实际发现并修复了两次遗漏，最终在**深色主题、纯思考流**下，收起与展开均只有一条土星状态，计时正常、思考正文可读。所有模型调用均使用本地假模型，不调用付费渠道。

此前图标扩展版本的 GUI 广泛回归为 10,901 通过、1 跳过；此数字不是最终单行重构后的全量回归结果。Web 浏览器回放曾因缺少指定 Playwright Chromium 无法启动，不计为通过。

仍待：最终版浅色主题复查、实际减少动态效果切换、实际禁用恢复鲸鱼、工具调用／多组／无思考流模式完整视觉回归、长会话滚动回归、最终广泛 GUI 回归。动态 Atelier 文案与新构建共存的完整实际验收也未完成。

当前日常应用未加载此补丁；隔离测试服务器已关闭。浏览器 Agent Window 清理曾因参数冲突失败，未用其他后端绕过限制。访问令牌、测试 profile、会话、日志和截图不收录。

## 后续步骤

1. 在匹配版本源码应用补丁并再次运行相关测试、`build:artifacts`、`build:check`。
2. 仅在经用户批准的隔离实例加载此插件，完成上述视觉矩阵；不要复用真实数据。
3. 若准备日常使用，先确定受支持的新构建／上游扩展点方案、备份和回退路径，再取得切换同意。只提交上游方案或补丁不等于已被上游合并。

## English summary

Deferred source experiment, not a stock-host feature. The patch adds one reusable running-status Factory owning the dedicated icon slot, keeps the whale fallback, and consolidates visible live process/reasoning status without discarding disclosure content. The optional plugin draws only a 14 px Saturn with reduced-motion support. The final dark-theme reasoning-only browser check passes in collapsed and expanded states; the remaining visual matrix and production activation are explicitly pending. No installed application resources or real profile data are included or modified by this archive.
