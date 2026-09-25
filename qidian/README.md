# 启点 · DeepSeek 学习诊所

## 已实现

- DeepSeek 真实 API 代理：服务端调用 `https://api.deepseek.com/chat/completions`，默认模型 `deepseek-flash`。
- 拍照 / 选择图片 → 本机压缩 → DeepSeek 识题 → 用户编辑并确认题干 → 携带原图辅导，保留图形上下文。
- 中文多学科学习问答：启发式辅导、直接讲解、10 轮连续追问，支持停止请求。
- 原有一元一次方程本地训练与本机错题本。
- 密钥缺失、无权限、余额不足、限流、超时、识题结果异常的明确提示。

## 本机使用

需要 Node.js 22 或以上；无需安装第三方依赖。

1. 在此目录运行 `npm run dev`。
2. 打开 http://127.0.0.1:5188/setup ，输入自己的 DeepSeek API Key，验证并保存。
3. 返回 http://127.0.0.1:5188 ，开始辅导。

密钥保存在本机 `.env`，权限为仅本人可读写。`.env` 被 Git 忽略，不会写入网页或打包文件。不要将密钥放进聊天、截图、仓库或浏览器本地存储。

也可自行配置 `.env`，字段见 `.env.example`。本地配置页不会自动发布密钥到线上。

## 线上部署

`npm run build` 生成自带页面资源的 Cloudflare Worker：`dist/server/index.js`。

Sites 项目保持既有 ID：`appgprj_6ab68465392c8191801cf31d1c53efa9`。在线运行必须通过 Sites 配置：

- `DEEPSEEK_API_KEY`：secret
- `DEEPSEEK_MODEL`：`deepseek-flash`

线上访问权限由 Sites 负责；维持当前仅所有者访问配置。修改密钥后重新部署，生产中不开放本机配置接口。

## 数据与限制

点击「识别」或「发送」才会将问题、图片或本轮上下文发给 DeepSeek。应用不将照片与 AI 对话写入文件或数据库；原有错题本保存在当前浏览器。DeepSeek 对 API 数据的处理以其服务政策为准。

照片仅支持 JPG、PNG、WebP，输入最大 12 MB；浏览器压缩后才发送。HEIC 需要转换。照片可能被误识别，必须由用户核对题干。模型答案需要复核，不能将自查完成等同于客观掌握度评分。

## 检查

- `npm run build` —— 打包自带页面资源的 Worker
- `npm test` —— 接口契约与异常分支（模拟上游，不联网、不花钱）
- `npm run e2e` —— 真实浏览器联调（需另开终端先跑 `npm run dev`，并已配好 Key）

`npm test` 通过模拟上游覆盖接口契约、图片输入、多轮上下文、异常分支与敏感数据不泄露。
`npm run e2e` 用无头 Chrome 走一遍真实用户路径：首屏状态、文字提问、多轮追问、拍照识题与核对确认、
带图辅导、新问题重置、停止按钮与超长输入守卫、本地一元一次方程与错题本，并汇总 JS 运行时错误；
题目照片在运行时由浏览器现场渲染生成，无需外部素材。**它会真实调用 DeepSeek，消耗少量额度。**

官方接口文档：https://api-docs.deepseek.com/guides/vision/
