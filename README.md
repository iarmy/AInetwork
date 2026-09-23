# AI 教学应用导航（AInetwork）

---

## 一、站点清单

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

## 二、目录结构

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
