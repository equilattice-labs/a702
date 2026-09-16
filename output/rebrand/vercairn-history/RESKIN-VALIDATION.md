# Vercairn 品牌与体验重构验收

2026-09-16（Asia/Shanghai）。已按 rebrand 与 reskin 技能完成本地品牌和整站 UI/UX 重构。新品牌为 **Vercairn**，标语为 **Every finding starts somewhere.**；采用域名 **vercairn.xyz**、X 标识 **@vercairn**，完整记录见根目录 [list.txt](list.txt)。

## 完成范围

- 品牌：项目名称、包名和 lock 根名称、页面标题、配置展示名、下载文件名、favicon、canonical、Open Graph、文档及传播文案统一更新。主站与 `a702` 分发镜像均已重新构建。
- 视觉：原创堆石路标与菱形顶点，石墨侧栏、纸白画布、紫色操作和浅紫研究卡。本地 SVG、DM Sans 字体和图片无需外部视觉服务。
- 页面：首页、任务列表、搜索与主题筛选、收藏、我的任务、详情、证据提交、创建者审核、两步创建、奖励、指南、FAQ、空态及错误态采用统一设计。
- 体验：桌面固定导航和横向编号索引；手机触控任务卡、任务区直接创建入口、底部阅读面板；详情改为居中阅读区域。主题显示任务数，已选条件可单独删除，清空搜索恢复输入焦点。
- 收藏撤销：取消收藏后可在通知中 Undo，条目恢复到 Saved 且刷新后仍保留；详情中的撤销通知紧邻收藏操作，避免落在原生弹窗外。通知关闭、过期或被新通知替代后清理旧操作；撤销不适用于链上交易。
- 传播资产：五张正式 PNG、SVG 标识、10 秒 H.264 视频重新生成，网站 mark/social 与传播原件哈希一致。旧源码、媒体和验证记录保留在明确的归档目录。

## 保留的业务契约

网络仍为 Robinhood Chain testnet（chain ID 46630），奖励及 gas 使用 native testnet ETH；没有平台代币。保留 `EvidaraEscrow` 技术名称、ABI、方法、事件、revert 前缀、部署记录及全部环境配置接口。本地合约复验确认业务逻辑和去编译器元数据后的可执行字节码未改变。

收藏从 `siftlane-saved`、`citeward-saved`、`civiquill-saved`、`proofora-saved` 按新旧顺序迁移到 `vercairn-saved`，保留 sample 与 chain/address 命名空间、空列表优先级及只读存储降级。示例任务明确标注；真实模式不混入示例数据。创建者在截止前审核、截止后回收未分配奖励，再领取可提取余额；额外资助者没有独立退款权。

网站保留原有无 Twitter/X 外链规则，包括合约提供的动态 brief、evidence 及 explorer 地址。主域名用于 canonical、OG URL 和分享图地址；X 标识用于品牌记录与传播材料。

## 验证结果

| 检查 | 命令 / 方法 | 结果 |
| --- | --- | --- |
| 双入口生产构建 | `npm run build:all`，在 website 运行 | 主站和镜像成功，产物一致 |
| 业务逻辑 | `npm run check:logic` | 6 个测试、242 条断言通过；覆盖迁移、撤销、权限、金额与六类交易 |
| 站点完整性 | `npm run check:site` | 337 项通过；源码/产物品牌、链接规则、本地资源及镜像一致性 |
| 浏览器 UI | `npm run check:ui` | 9 组任务流通过；6 种视口无横向溢出，5 个 axe 扫描状态零违规 |
| 触控与压力场景 | `npm run check:experience` | 3 组手机任务流通过；长标题、长筛选词、大额字符串无溢出 |
| 合约数据界面 | `npm run check:live` | 8 组本地 RPC fixture 场景通过；审核界面 axe 零违规 |
| 合约本地测试 | `npm test -- --network hardhat`，按合约报告的隔离配置运行 | 7 项通过；ABI、执行逻辑、部署记录与依赖兼容 |
| 品牌残留 | `python research/check-vercairn-brand.py` | 未分类残留 0；保留项均为精确技术标识、迁移键、回归检查或显式历史 |
| 传播资产 | `python twitter/generate_assets.py --encode --sync-public`、视觉检查及 ffprobe | 文字边界检查通过；视频 1280×720、24 fps、240 帧、10 秒 |

桌面验证覆盖搜索→空态→恢复、所有主题及排序、收藏→刷新→取消→撤销、详情页签方向键/Home/End、草稿错误修正→预览→下载→编辑、钱包缺失反馈、指南与 FAQ。手机执行主题搜索清除、收藏与详情返回、直接创建及精确 1 wei 草稿下载；菜单焦点循环、Escape、关闭后的焦点返回均通过。

本地 fixture 覆盖慢加载、RPC 错误重试、空注册表、创建者与非创建者权限、过期禁用、过额提示、切换网络及不安全来源过滤。请求只包含 `eth_getBalance`、`eth_chainId`、`eth_call`；浏览器未发送真实交易或签名。所有三个浏览器报告均无控制台异常，触控资源检查无失败请求。

## 响应式、资源与性能

视口宽度为 **320、390、768、1024、1440、1920**；手机高度 844，其余 1000。主操作均在首屏可见，无页面横向溢出。支持系统减少动效、forced-colors、键盘焦点和手机 16px 表单输入；字体和品牌图本地成功加载。axe 自动扫描不等于完整人工读屏认证。

| 本地性能观测 | 归档基线 | 本轮最终构建 |
| --- | --- | --- |
| FCP / LCP | 292 / 292 ms | 348 / 348 ms |
| CLS | 0 | 0 |
| 首屏解码资源 | 475,942 bytes | 473,184 bytes |

以上来自同机本地 Chromium 冷浏览器上下文，未做网络/CPU 限速且运行时有并行测试；单次时延差异不足以推断线上性能变化。新资源体积略小，未新增运行时依赖，未出现布局偏移。生产 JS 约 397.06 kB（gzip 142.76 kB），CSS 约 37.23 kB（gzip 8.34 kB）。没有宣称线上 INP 或真实设备测试结果。

## 可复查证据

- [桌面首页](website/output/playwright/vercairn-1440.png)、[手机首页](website/output/playwright/vercairn-390.png)、[全页](website/output/playwright/vercairn-full-desktop.png)。
- [桌面详情](website/output/playwright/vercairn-detail-desktop.png)、[手机详情](website/output/playwright/vercairn-detail-mobile.png)、[手机创建](website/output/playwright/vercairn-create-mobile.png)。
- [UI 报告](website/output/playwright/vercairn-ui-results.json)、[触控与性能报告](website/output/playwright/vercairn-experience.json)、[RPC fixture 报告](website/output/playwright/vercairn-live-results.json)。
- [品牌残留报告](research/vercairn-brand-residuals.md)、[合约验证](contracts/REBRAND-VALIDATION.md)、[传播资产总览](twitter/asset-review.png)。
- [改版前截图](website/output/rebrand/siftlane-history/siftlane-baseline.png)、[修改前公开源码备份](website/output/rebrand/before-vercairn-20260916.zip)。工作区没有 Git 仓库，备份采用明确的公开文件清单，排除 key.txt 和环境文件。

## 使用与边界

在 `website` 运行 `npm run preview -- --host 127.0.0.1 --port 42702 --strictPort` 后，访问 `http://127.0.0.1:42702/`。UI 和 experience 脚本使用此生产预览；live 脚本使用 `http://127.0.0.1:5173/` 的 Vite 开发服务并替换为本地只读 fixture。

本次未注册域名、创建账号、发布帖子、上线网站或部署合约。命名核查时注册局没有主域名记录，X 没有公开个人主页；这不证明注册资格或所有权，可用性随时可能变化。完整证据见 [命名核查](research/vercairn-naming.md)。
