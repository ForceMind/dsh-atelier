<div align="center">
  <img src="./icon.svg" alt="DSH Atelier icon" width="88" height="88" />
  <h1>DSH Atelier · 工作台</h1>
  <p>让模型工作过程可读，让用量与成本可查，让提示词配置可管理。</p>
  <p>
    <a href="https://github.com/ForceMind/dsh-atelier/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ForceMind/dsh-atelier/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="https://www.npmjs.com/package/dsh-atelier-plugin"><img alt="npm version" src="https://img.shields.io/npm/v/dsh-atelier-plugin" /></a>
    <a href="./LICENSE"><img alt="License MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
    <img alt="Tested with DSH 0.2.1-rc.3" src="https://img.shields.io/badge/tested%20DSH-0.2.1--rc.3-235d60" />
  </p>
  <p>简体中文 · <a href="./README.en.md">English</a></p>
</div>

**DSH Atelier** 是面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的社区 Host + Web UI 插件：紧凑模型指标、API 等价成本、全局提示词库、动态工作文案，以及可选的本地请求审计。安装在当前 profile，不修改 DSH 应用文件，也不启动额外服务器。

> **先了解默认值：**公开版默认保留 DSH 原版身份，**不记录请求/响应正文**，不改变语言偏好。完整日志、通用助手身份和动态语言包均由你主动开启。插件不是匿名化网关，也不是供应商账单系统。

## 1.5.0 更新

七项底栏指标可点击查看简洁浮窗，支持按币种费用拆分、首次使用引导、76 句原创状态词，以及缓存字段覆盖率和前缀稳定性诊断。价格目录提供 5 条官方文档／示例快照和 6 组**用户提供、未独立核验**的人民币／美元参考价，仅手动导入草稿，不做换汇或自动分时计费。详见 [价格证据](docs/price-evidence.md) 与 [版本记录](CHANGELOG.md)。

模型增强、BrowserSkill、dsh-context 的统一入口仍未实现；请继续独立使用原插件。缓存诊断不承诺供应商命中率提高。

## 目录

- [功能](#功能)
- [安装与迁移](#安装与迁移)
- [快速上手](#快速上手)
- [全局提示词库](#全局提示词库)
- [用量与 API 等价费用](#用量与-api-等价费用)
- [本地日志与隐私](#本地日志与隐私)
- [动态工作文案](#动态工作文案)
- [开发与测试](#开发与测试)
- [兼容性与已知限制](#兼容性与已知限制)
- [参与贡献](#参与贡献)

## 功能

| 模块 | 提供的能力 |
| --- | --- |
| 紧凑状态栏 | 模型 / provider、本轮耗时、可观测的思考流时长、输入 / 输出 / 缓存、API 等价费用；图标对齐、`K/M/B` 数字、完整值悬停提示 |
| GPT 轨道图标 | 原创双轨光点，运行时缓慢旋转、空闲静止；遵循系统“减少动态效果” |
| 全局提示词库 | DSH 原版、通用 AI 编程助手、可命名保存/选择/删除的自定义条目 |
| 动态 Chat 文案 | 可选轮换中文/英文工作提示，保留原生鲸鱼、计时、工具状态和滚动逻辑 |
| 本地请求审计 | 按会话列出新模型请求；查看 JSON、按角色展开的请求文本、响应流 JSONL 和响应文本 |
| 可配置计价 | 精确 provider/model 或通配符；输入、输出、缓存读取/写入；长上下文档位、来源和核对日期 |
| Agent 集成 | `atelier` 工具与 `/atelier` 命令，共用 Host 操作，不维护另一套配置逻辑 |

底部只显示指标，不重复上方的等待文案。GPT 图标位于插件模型指标旁；**并不替换原生 Chat 内部的鲸鱼图标**。

## 安装与迁移

### 环境要求

- DeepSeek Harness **0.2.1-rc.3**：当前经过运行验证的版本。
- 包声明允许 `>=0.2.1-rc.3 <0.3.0`；范围内其他版本仍需自行验证，不承诺未来所有版本无改动兼容。
- Web GUI，或包含相同 Host / Web Client 服务的 Desktop profile。
- 本地开发使用 Node.js **>=22.19.0**、pnpm **11.28.5**。普通用户无需手工安装这些依赖。

### 使用 DSH 插件管理器

在 DSH 的 **插件 → 安装插件** 中输入：

```text
dsh-atelier-plugin@1.5.0
```

确认安装并启用。也可以让拥有插件管理权限的 Agent 使用 `plugin_manager`，将以上包名作为 `install_bundle` 的 `target`。市场目录收录与 npm 发布是独立流程；**若市场搜索尚未显示该插件，可直接使用包名安装**。

包已附带构建好的浏览器模块。安装后打开应用 **设置 → 工作台**，或会话顶部 **工作台 → 全局设置**。若当前页面未跟随模块更新，重新打开该 DSH 窗口；是否需要应用重启以插件管理器的实际结果为准。

### 从源码开发

```sh
git clone https://github.com/ForceMind/dsh-atelier.git
cd dsh-atelier
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm check
```

之后通过 DSH 插件管理器安装这个目录的**绝对路径**。不要直接编辑 profile 的依赖清单或组合补丁。

### 从早期本地版迁移

早期会话开发版的包名是 `@local/dsh-atelier`；公开包名是 **`dsh-atelier-plugin`**。npm 上的 `dsh-atelier` 是其他作者的不同项目，**不是本插件**。

1. 备份当前 profile 数据；日志可能含敏感信息。
2. 在插件管理器中先禁用/卸载早期本地版，再启用公开版。**不能同时启用两者**，因为它们使用相同的工具、API 路由、projection 与存储域。
3. 公开版沿用 `dsh_atelier_v1` 存储域，不主动删除旧数据。原设置会被保留；因此旧版已经开启的正文记录不会因为安装公开版而自动关闭。
4. 在全局设置重新检查记录开关、提示词、价格与语言包选项。

## 快速上手

1. 安装后先观察底部模型指标。
2. 打开 **设置 → 工作台**。这里的提示词、价格、记录策略和词库都属于**当前 profile 的全局设置**；请求日志则按会话隔离。
3. 按需要选择提示词，或开启动态等待提示。
4. 如需日志正文，阅读隐私说明后开启 **记录完整请求与响应正文**。
5. 配置供应商实际单价；未配置时显示“未知”，不会冒充免费。
6. 点击 **保存设置**。提示词变更从各会话下一次 admitted step 生效，历史消息不改写。

`/atelier` 显示当前会话统计。Agent 的 `atelier` 工具支持 `status`、`settings`、`save`、`logs`、`get`、`diagnose`、`cache` 和 `display`。日志默认分页，建议只读取必要片段。配置可由该 Agent 工具修改；如果不希望 Agent 修改全局设置，请通过宿主工具可见性/权限机制限制它，而不是把 UI 开关当作授权边界。

## 全局提示词库

### DSH 原版（默认）

撤销本插件对身份和软件说明的覆盖，继续使用**当前 DSH、模型、preset 与其他插件动态组装**的内容。不是一份容易过期的完整提示词副本。

### 通用 AI 编程助手

将身份段设置为：

```text
You are a helpful AI coding assistant.
```

该条目同时启用客户端固定自述精简：将两项已知的软件说明改为中性措辞，并不再额外贡献对应的安装路径/GUI URL 上下文。工作目录、构建验证、工具使用和权限约束保留。

### 自定义条目

编辑身份和追加系统指令，填写名称后点击 **将当前提示词存入库**。可再次选择或删除自定义条目；两项内置条目不可删除。选择、添加和删除都需要 **保存设置** 才持久化。价格和日志选项不会随提示词选择被覆盖。

**这不提供客户端匿名化。**历史内容、工具定义、权限说明、SDK 协议或请求头仍可能透露客户端；插件不删除沙箱/审批策略，不暗改冻结的模型请求。

## 用量与 API 等价费用

费用是**当前会话已提交响应的累计 API 等价估算**，不是余额、单次请求价格或渠道账单。新装公开版价格表为空，不自动下载或套用费率。

示例仅演示结构，**不是当前官方价**，单位为每百万 tokens：

```json
[
  {
    "provider": "YOUR_PROVIDER",
    "model": "YOUR_MODEL",
    "currency": "USD",
    "input": 2,
    "output": 10,
    "cacheRead": 0.1,
    "cacheWrite": 2.5,
    "longContext": {
      "threshold": 272000,
      "input": 4,
      "output": 15,
      "cacheRead": 0.2,
      "cacheWrite": 5
    },
    "source": "https://your-provider.example/pricing",
    "checkedAt": "YYYY-MM-DD"
  }
]
```

- 精确 provider 优先，其次精确 model，再比较 model 通配符具体程度。provider `*` 是跨渠道的同名模型等价估算，不证明其上游路由。
- DSH 的未缓存输入、缓存读取和缓存写入是独立桶；思考 tokens 已在输出中，不重复计费。
- 按**单次请求**的输入总量选长短档，分别累计后汇总；不是对会话累计 tokens 套一次长上下文价格。当前开发版支持 `100000` 与 `272000` 两种阈值，并按请求分别累计。
- 缺失/非法 usage、未匹配价格都明确标为未知；已有可计算费用只代表已知部分。
- 默认缓存写入按匹配规则的单价处理；宿主不报告实际 TTL，不能声称自动识别。开发版有证据不完整的预设会将缺失缓存费率保留为未知，而不推价。12h 字段仅为显式扩展，不是 Claude 的 1h 字段。
- 不包括渠道倍率、Fast/Flex/Batch、地区加价、税费、工具附加费；失败/重试 attempt 可能已被供应商收费，但不计入已提交响应 aggregate。

完整字段和算法见 [配置参考](docs/configuration.md)。请在 [OpenAI](https://developers.openai.com/api/docs/pricing) 或相应供应商官网核实当前价格，维护 `source` / `checkedAt`，不要把仓库示例当作永久价目表。

## 本地日志与隐私

**公开版默认关闭正文记录。**关闭时仍保存请求元数据、模型/provider、用量、时间、结束状态与错误摘要。开启后，可能保存系统/开发者提示词、对话、代码、工具 schema/参数和模型输出。

日志捕获层级：

```text
DSH 统一请求（适配器转换前） → 供应商适配器 → DSH 统一响应流（转换后）
```

它**不是**最终 HTTP body、请求头或供应商原始 SSE；图片/文件只保留附件引用，不复制二进制内容。插件不拦截全局 fetch，不读取 API key，也不新增日志上传或价格查询网络服务。它不改变 DSH 本体或其他插件拥有的联网行为。

- 凭据字段和常见字符串模式尽力脱敏，**不是 DLP**；分享前务必人工检查。
- 为防止凭据跨 chunk 拆分绕过脱敏，正文流在 attempt 结束后重建并清洗。`rebuiltForRedaction` 表示原 token 边界已改变，不适合精确流时序回放。
- 默认保留策略：14 天、256 MiB 总量、每 attempt 32 MiB 捕获预算。清理发生在启动、请求结束和保存设置时，**不是定时硬过期**；格式化/标记可能增加存储大小。
- 开始与结束时持久化，崩溃可能仅留下开始记录。只记录启用后的新正文，不追溯补录历史。
- 下载按钮下载当前已加载内容；未完整加载时文件名带 `partial`。卸载插件不会自动删除日志。

详见 [安全政策](SECURITY.md) 和 [数据与配置参考](docs/configuration.md)。不要在公开 issue 上传完整请求日志、个人配置或未审查的截图。

## 动态工作文案

主动开启后，通过 `zh-x-atelier` / `en-x-atelier` 语言包只覆盖原生 Chat 的两个等待翻译键，其他文案回退原语言；不操作宿主 DOM，也不替换整个聊天渲染器。

它会持久化一个 **profile 共享的语言偏好**。关闭或卸载时，仅当语言仍为本插件变体才恢复对应中文/英文，不覆盖用户手动切换的其他语言；不能恢复“未显式选择”的自动检测状态。默认 4 秒轮换，仅在有会话运行时刷新；词典更新会产生少量全局 locale 刷新成本。读屏提示保持稳定，避免频繁播报。

## 缓存诊断

点击底栏缓存指标，可分别查看本次、最近 20 次、累计的已报告样本命中率，以及未报告缓存字段的次数。**缺字段不等于 0% 命中**；百分比按 tokens 加权，不是逐请求比例的平均。

在 **工作台 → 请求日志 → 缓存诊断 → 分析最近请求**，或调用 `atelier` 的 `cache` 动作，可查看系统段、工具定义、请求选项与历史前缀变化。只返回布尔、计数与有限工具名，不返回请求正文或指纹。新请求只在内存保存有限指纹；历史回看使用已有脱敏记录，无法证明上游缓存键、路由或 TTL。

已优化：只保存价格、词库或日志策略时，不再重绑所有会话的提示词。趣味状态词仍只存在于 Client。不会自动改写请求、删除安全规则，或发送额外付费请求来刷命中率。详见 [缓存诊断参考](docs/cache-diagnostics.md)。

## 开发与测试

```sh
pnpm build        # 生成可加载的 client.js
pnpm check        # 语法、核心、Host、语言包、格式及发布守卫
npm pack --dry-run --ignore-scripts
```

- Host / domain：`host.js`、`core.mjs`。
- Client 源码：`client-source.js`、`activity.mjs`、`ui-format.mjs`。
- 构建：`build-client.mjs`；生成的 `client.js` 随包发布。
- 包采用运行文件白名单，无安装脚本，无独立服务器，无重复 React。

测试包含设置 CAS 并发保护、日志会话隔离、缺失 usage、上下文分档、跨片段脱敏、原版提示词恢复、语言包清理与格式边界。测试不等同于视觉截图验收或真实供应商账单对账。架构见 [architecture](docs/architecture.md)，发布流程见 [releasing](docs/releasing.md)。

## 兼容性与已知限制

- 主要验证平台：macOS Desktop / Web、DSH 0.2.1-rc.3；其他 OS、第三方主题和未来版本尚未全面验收。
- Host 缺少声明依赖时插件不会激活；仅安装成功不代表浏览器端已加载。可用 `atelier diagnose` 检查版本和 Client 注册。
- 活动中更换插件若宿主返回 `restart-required`，请在当前回复结束后重启；不要通过另起服务器代替刷新当前应用。
- 思考耗时是**可观察的 reasoning stream 区间**，不是供应商内部思考时间；没有该流时显示 `—`。
- 原生鲸鱼图标仍由宿主控制；GPT 轨道图标位于底部指标旁。
- 旧本地版与公开版不能在同一 profile 同时启用。

## 参与贡献

欢迎 issue 与 PR。提交前阅读 [贡献指南](CONTRIBUTING.md)，安全问题请使用 [私密报告流程](SECURITY.md)。功能边界和版本记录见 [CHANGELOG](CHANGELOG.md)。

## 致谢与许可

灵感来自 [Claude-Code-Chinese-Simplified](https://github.com/ForceMind/Claude-Code-Chinese-Simplified) 的中文体验方向；本项目没有复制其代码或词库。图标和轨道动画为原创。

社区项目，非 DeepSeek 或 OpenAI 官方产品；相关名称与商标属于各自权利人。代码按 [MIT](LICENSE) 许可发布。
