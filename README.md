# AI 教学应用导航（AInetwork）

一个把工作区里所有教学演示站点汇总在一起的本地导航首页。
打开 `index.html` 就能看到全部站点卡片，点进去即是各个独立网站。

---

## 一、怎么跑起来

**双击 `启动导航页.command`** 即可（macOS）。
它会在本机起一个静态服务器并自动打开浏览器。

或者在终端里手动启动：

```bash
cd /Users/fjchen/Documents/AInetwork
python3 server.py            # 默认 8080，端口被占用会自动顺延
python3 server.py 9000       # 也可以指定端口
python3 server.py 9000 --no-open   # 不自动开浏览器
```

然后访问终端里打印出来的地址，一般是 <http://127.0.0.1:8080/>。

> **不要直接双击 `index.html`。**
> 手势类站点用到 ES Module、WebAssembly 和摄像头，
> 在 `file://` 协议下会被浏览器直接拦掉；摄像头权限也只在
> `https://` 或 `localhost` 下才给。所以必须走本地服务器。

---

## 二、站点清单

首页按三类组织，共 **9 张站点卡片**（另有 1 个同目录子站点直通入口，合计 10 个页面入口）：

### 手势互动（需要摄像头）

| 站点 | 入口 | 说明 |
|---|---|---|
| 空中画函数 · 手势演示 | `gesture/gesture-demo/index.html` | 隔空画抛物线，AI 拟合解析式与 R²；双手对碰揭题。模型已本地化，**不联网也能跑** |
| AI 手势课堂反馈 · 数学 | `gesture/gesture-edu/index.html` | 学生用手指比选项号（1~4 指 = A~D），实时统计全班答案分布，可定格 / 公布答案看正确率。内置 8 道小学数学题，支持 `?demo=1` 无摄像头彩排 |
| AI 手势数独（多关卡版） | `gesture/gesture-shudu/shudu.html` | 食指移动光标、捏合选格与挑数字，把 1–9 填进九宫格，共 2 关。**依赖 jsDelivr CDN** |

`gesture/gesture-shudu/` 下还有一套独立子站点，首页卡片里有直通按钮：

| 子站点 | 入口 |
|---|---|
| 💠 AI 巨型全息（120 碎片版） | `gesture/gesture-shudu/index.html` |

### 课堂工具

| 站点 | 入口 | 说明 |
|---|---|---|
| 课堂点名系统 | `dianming/index.html` | 随机/顺序点名、考勤记录、CSV 名单导入与考勤导出 |
| 10 以内加减法小游戏 | `math_game/math_game.html` | 限时口算练习 |
| 量水游戏 | `water-measure-game/index.html` | 倒水量杯闯关，训练逻辑推理 |

### 学科演示

| 站点 | 入口 | 说明 |
|---|---|---|
| 京杭大运河数字展厅 | `grand_canal_project/index.html` | 含世界遗产 / 古城镇 / 非物质遗产三个子页面 |
| 红军长征路线图 | `long-march/long-march.html` | 沿路线逐点推进的动画演示，含背景音乐 |
| 太阳系三维动画演示 | `solar-system-3d/index.html` | Three.js 太阳系，可拖动旋转 |

---

## 三、目录结构

```
AInetwork/
├── index.html                  # ★ 导航首页（重新设计过）
├── server.py                   # 本地静态服务器
├── 启动导航页.command            # 双击即启动
├── previews/                   # 首页 9 张卡片的站点截图
├── tools/
│   ├── verify.sh               # 一键自检（逻辑 + 断链 + HTTP + 运行时）
│   ├── test-logic.js           # 首页筛选 / 出题算法 的逻辑测试（node，无需浏览器）
│   ├── test-sticky.js          # 真实滚动测量工具条吸附（node + CDP，需先起服务器）
│   ├── make-cdp-cover.js       # 用 CDP 控制浏览器后截图（数独棋盘 / 课堂反馈票数）
│   ├── check-links.py          # 全站断链扫描
│   └── make-previews.sh        # 重新生成 previews/ 截图（内部会调用上面那个脚本）
├── dianming/                   # 课堂点名
├── gesture/
│   ├── gesture-demo/           # 空中画函数
│   └── gesture-shudu/          # 手势数独（主）+ 巨型全息（子站点）
├── grand_canal_project/        # 大运河数字展厅
├── long-march/                 # 红军长征路线图
├── math_game/                  # 10 以内加减法
├── solar-system-3d/            # 太阳系三维
└── water-measure-game/         # 量水游戏
```

---

## 四、自检

改过东西之后跑一遍：

```bash
bash tools/verify.sh
```

它会依次检查：

| 步骤 | 内容 |
|---|---|
| 0 | 本地服务器是否可用（不可用则临时拉起一个） |
| 1 | 逻辑测试：首页搜索 / 分类筛选 / 分组显隐；出题算法 20 万次抽样 + 选项 / 反馈 / 计时器竞态 |
| 2 | 静态扫描：所有 html/css 里的本地引用是否都存在 |
| 3 | 首页每个链接与预览图走一遍 HTTP，必须 200 |
| 4 | `previews/*.png` 是否齐全且非空 |
| 5 | 无头浏览器逐个打开 11 个页面抓运行时 JS 报错；再真实滚动首页，测量工具条是否吸附在顶部 |

单项也可以单独跑：

```bash
node tools/test-logic.js        # 只看逻辑测试
python3 tools/check-links.py    # 只看断链
node tools/test-sticky.js       # 只看工具条吸附（需先启动服务器）
```

重新生成首页卡片截图（需要先启动服务器）：

```bash
python3 server.py 8080 --no-open &
bash tools/make-previews.sh                    # 全部
bash tools/make-previews.sh solar-system       # 只重跑某几个站点
```

---

## 五、已知情况

1. **CDN 依赖**：`gesture/gesture-shudu/`（手势数独页与同目录的全息页）与
   `solar-system-3d/`、`grand_canal_project/` 会从
   jsDelivr / bootcdn / 高德地图 加载资源，**断网时这些页面会缺功能**。
   两个 `gesture-demo` 已把识别引擎和模型全部本地化，断网可用。
2. **`grand_canal_project/images/cc.jpg` 不存在**（建项目起就缺），
   `world-heritage.html` 的「保护与传承」配图已加 `onerror` 兜底，
   缺图时显示主题色占位块，不会再出现裂图图标。
3. **摄像头**：手势类站点首次进入需在浏览器弹窗里点「允许」。
   无摄像头的机器上这些页面会停在启动界面，属正常现象。

---

## 六、部署到 GitHub Pages（自定义域名 atcoding.cn）

本站已按「**单仓库 + 根域名**」的方式准备好部署配置：整站原样发布，路径与本地一致，
所以 `index.html` 里的相对链接一个都不用改。

| 文件 | 作用 |
|---|---|
| `.nojekyll` | 关闭 GitHub Pages 的 Jekyll 处理，原样发布所有文件 |
| `CNAME` | 声明自定义域名 `atcoding.cn` |
| `.gitignore` | 排除 `.DS_Store`、`__pycache__/` 等不该进仓库的文件 |

### 1. 首次推送

```bash
cd /Users/fjchen/Documents/AInetwork
git config user.name  "你的名字"                  # 只对本仓库生效；加 --global 则全局
git config user.email "你的邮箱"
git remote add origin git@github.com:iarmy/AInetwork.git
git push -u origin main
```

> - 仓库必须是 **public**：GitHub 免费版的 Pages 只支持公开仓库。
> - 首次推送约 139 MB，主要是 `long-march/`、`gesture/`、`grand_canal_project/`
>   里的音视频，慢属正常现象。
> - **不要用 Git LFS**：GitHub Pages 不会下发 LFS 文件，页面只会拿到指针文本。

### 2. 打开 Pages

仓库 **Settings → Pages**：

1. Source 选 `Deploy from a branch` → 分支 `main` → 目录 `/ (root)`，保存；
2. Custom domain 填 `atcoding.cn`，保存（会在仓库里生成 CNAME 提交）；
3. 等证书签发后勾选 **Enforce HTTPS**。
   **必须开**：手势类页面依赖摄像头，浏览器只在 `https://` 或 `localhost` 下给权限。

### 3. 阿里云云解析加记录

| 记录类型 | 主机记录 | 记录值 |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA（可选） | `@` | `2606:50c0:8000::153`、`8001::153`、`8002::153`、`8003::153` |
| CNAME | `www` | `iarmy.github.io` |
| TXT（建议，防域名被抢注） | `_github-pages-challenge-iarmy` | GitHub 给出的验证值 |

### 4. 验证

```bash
dig atcoding.cn +short          # 应返回上面 4 个 IP
curl -I https://atcoding.cn/    # 应返回 200
```

浏览器打开 <https://atcoding.cn/> 看到导航首页即成功；
子站路径与本地一致，例如 <https://atcoding.cn/gesture/gesture-edu/>。

### 5. 之后的更新

```bash
git add -A && git commit -m "更新说明" && git push
```

推送后约 1 分钟自动重新发布。

### 6. 上线注意点

1. **国内访问 `github.io` 不稳定**（Fastly CDN）。若明显打不开，两个补救方向：
   把 NS 换到 Cloudflare 后开启代理；或改用腾讯 EdgeOne Pages 等可走国内节点的托管
   （走中国大陆节点需要 ICP 备案，`.cn` 域名本身不强制备案）。
2. **大小写敏感**：GitHub Pages 跑在 Linux 上，链接大小写必须与文件名完全一致；
   本机 macOS 不区分大小写，会掩盖问题，建议上线后跑一遍 `python3 tools/check-links.py`。
3. `grand_canal_project/404.html` 里的 `href="/"` 只在整站部署在根目录时才正确；
   GitHub Pages 也只认**根目录**的 `404.html`，子目录的不生效。
4. 仓库公开后 `tools/` 下的脚本、`dianming/学生名单示例.csv` 等都会公开，
   **真实学生名单不要提交**。
