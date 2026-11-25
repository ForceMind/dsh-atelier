# Atelier Suite

Atelier Suite 将 Atelier 工作台、Better Reasoning Effort（BRE）和 Context 上下文面板合在同一个 DeepSeek Harness 插件包中。BrowserSkill 和 GameForge 仍独立安装。

[English](README.md) · [第三方来源和许可证](THIRD-PARTY.md)

## 安装和启用

本版本的验收目标是 Windows 上的 DeepSeek Harness `0.2.2-rc.5`，不涵盖其他版本或平台。不要为此包设置 Node 的 `standard-schema-spec` 导出条件：捆绑的上游依赖未分发该条件指向的文件。

1. 通过 DSH 插件管理器添加已经验证的 `@forcemind/dsh-atelier-suite@0.1.0` 或对应的已验证本地归档。试用本地候选时应使用独立测试 profile。独立 Atelier 的源码仓库根目录不是 Suite 安装包。
2. 首次安装后，三条业务组件默认禁用。进入 Suite 详情，按需启用。Context 偏好可从「插件 → Atelier Suite → Context」进入，也可从「上下文洞察 → 设置 → Atelier Suite → Context」进入；两条路径打开同一表单。点击「保存」后应用改动，点击「取消更改」放弃草稿。
3. 不要同时选中 Suite 和三个原独立插件中的任何清单层，即使对应组件行已禁用。Suite 保留原有组件标识和配置归属。

## 升级与回退

切换前记录目标 profile、各包版本、启用状态和本地来源。保留原安装介质，并在私密位置备份可读的原始配置及持久数据。结束请求、停止目标 Host 后，再用支持的 DSH 插件管理方式排他换层；如果无法做到不停留在共选状态，就先停止操作。不要就地修改已安装的模块，也不要从界面展示值重建整份配置。

切换后核对实际启用行、共享模型设置、自定义价目和历史。退回时再次停止目标 Host，再恢复原包选择，保持单一数据所有者。先核对试用期间的新编辑，不要盲目用旧备份覆盖。浏览器偏好按站点来源存放，不会自动跨来源迁移；Context 派生缓存不能代替原始会话或附件。

## 数据与许可

完成工作且没有可靠待办时，自动回复建议可以不显示内容。即使最终不显示，也可能已请求一次草稿模型。采纳只把文字插入输入框，不会自动发送。已有自定义价目仍由用户配置。Suite 自有代码采用 MIT；各捆绑模块保留原许可证，其中 Context 为 Apache-2.0。更多信息见包内的来源清单和修改声明。
