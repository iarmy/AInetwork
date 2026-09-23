# 把静态网站放上 GitHub，用自有域名访问 — 实战指南

> **成本 0 元，全程免费。** 适合教学演示站、个人主页、作品集、文档站。
> 全文基于一次真实部署实测：macOS + GitHub Pages + 阿里云注册的 `.cn` 域名。

---

## 一、30 秒判断你能不能这么干

| 你的网站 | 能不能 |
|---|---|
| 只有 HTML / CSS / JS / 图片 / 音视频等静态文件 | ✅ 直接托管，不需要买服务器 |
| 有后端（接口、数据库、需要写文件/登录状态） | ❌ 不行，那要买 VPS |

判断方法：把网站文件夹发给别人、对方双击 `index.html` 能看，基本就是静态站。

---

## 二、原理一句话

```
本地文件 ──git push──▶ GitHub 仓库 ──自动发布──▶ GitHub Pages（免费 HTTPS）
                                                      ▲
                                        你的域名 DNS ──┘（A / CNAME 记录）
```

浏览器访问 `https://你的域名/` → DNS 把它指到 GitHub 的服务器 → GitHub 返回你仓库里的文件。全程没有服务器要维护。

---

## 三、动手：6 步

### 第 1 步 准备三个关键文件

| 文件 | 内容 | 为什么必须 |
|---|---|---|
| `.nojekyll` | **空文件** | 关掉 GitHub 默认的 Jekyll 处理，让所有文件原样发布 |
| `CNAME` | 你的域名，如 `example.com` | 声明自定义域名（也可在网页端填写后由 GitHub 自动生成） |
| `.gitignore` | `.DS_Store`、`__pycache__/`、`*.pyc` 等 | 别把系统垃圾文件传上去 |

### 第 2 步 配置 SSH（一次配置，以后免密）

```bash
ssh-keygen -t ed25519 -C "你的邮箱" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub          # 把这一整行复制出来
```

把公钥粘贴到 GitHub → 头像 → **Settings → SSH and GPG keys → New SSH key**。
验证：

```bash
ssh -T git@github.com
# 出现 "Hi 你的用户名! You've successfully authenticated" 即成功
```

> - **公钥可以随便发，私钥（`id_ed25519`，没有 `.pub`）绝不能外发。**
> - 别用密码推送：GitHub 从 2021 年起就禁用密码认证了，密码对 `git push` 完全无效。
> - 如果改用 HTTPS + Personal Access Token，Token 等同于密码，同样不能外发。

### 第 3 步 建仓库并推送

在 GitHub 网页建一个 **Public** 空仓库（**不要**勾 Add README / .gitignore / license）：

```bash
cd 你的网站目录
git init -b main
git add -A
git commit -m "首次发布"
git remote add origin git@github.com:<你的用户名>/<仓库名>.git
git push -u origin main
```

### 第 4 步 开启 Pages

仓库 **Settings → Pages**：
- Source 选 `Deploy from a branch` → 分支 `main` → 目录 `/ (root)` → **Save**

这时 `https://<你的用户名>.github.io/<仓库名>/` 已经能访问了，先确认能打开再往下做。

### 第 5 步 绑定自己的域名（⚠️ 顺序很重要）

1. **先在 GitHub 填域名**：Settings → Pages → Custom domain → 输入你的域名 → Save
2. **再去域名商加 DNS 记录**（下表中的值以 GitHub 官方文档为准）
3. 等生效，通常几分钟

| 记录类型 | 主机记录 | 记录值 |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA（可选，IPv6） | `@` | `2606:50c0:8000::153`、`8001::153`、`8002::153`、`8003::153` |
| CNAME | `www` | `<你的用户名>.github.io` |

> **为什么必须先在 GitHub 填、再去加 DNS？**
> 顺序反了的话，别人可能抢先把你的域名绑到他自己的仓库上（子域劫持）。
> 建议顺手点一次 **Verify**，按提示加一条 `_github-pages-challenge-<你的用户名>` 的 TXT 记录，把域名所有权锁死。

### 第 6 步 等证书 + 强制 HTTPS

- 证书由 Let's Encrypt **自动签发**，一般几分钟，最长 24 小时
- 签发完成后回到 Settings → Pages，勾选 **Enforce HTTPS**
- **勾选框是灰的 = 证书还没签发完**，等一会儿强制刷新页面即可，不是配置错了

---

## 四、验证清单（复制即用）

```bash
dig 你的域名 +short                    # 应返回上面 4 个 GitHub IP
curl -I https://你的域名/               # 应返回 200
curl -sL -o /dev/null -w "最终地址: %{url_effective}  状态码: %{http_code}  证书校验: %{ssl_verify_result}\n" \
     http://你的域名/                   # 应落到 https://，200，证书校验 0
curl -s -o /dev/null -w "%{http_code}\n" https://你的域名/某个子页面.html
```

`ssl_verify_result: 0` 表示证书校验通过。最后再手动点几个子页面确认。

---

## 五、以后怎么更新

```bash
git add -A && git commit -m "更新说明" && git push
```

推送后**约 1 分钟**自动重新发布。

> ⚠️ 在 GitHub 网页端改过设置（例如自定义域名、Pages 来源）会产生一条提交，
> 本地要 `git pull` 一次，否则本地会落后于远端。

---

## 六、12 个必踩的坑（本文最有价值的部分）

1. **HTTPS 不是可选项，是功能前提。** 摄像头、麦克风、剪贴板、定位等浏览器 API 只在 `https://` 或 `localhost` 下可用。手势识别、扫码、录音类页面在 `http://` 下会直接失效，"能打开"不等于"能用"。所以 `Enforce HTTPS` 必须开。

2. **Linux 区分大小写，macOS/Windows 不区分。** 网页里写 `Photo.jpg`、磁盘上是 `photo.jpg`，本机一切正常，传上去就 404。这是最阴的一类 bug。

3. **中文文件名的 Unicode 归一化陷阱。** macOS 存文件名可能用 NFD（拆分形式），网页里写的是 NFC（合成形式），**肉眼完全一样，在 Linux 上却是两个不同的文件名**。上线前用下面的脚本自查（顺便查断链和大小写）：

   ```bash
   cd 你的网站目录
   git ls-files -z > /tmp/tracked.bin && python3 - <<'PY'
   import os, re
   tracked = set(x for x in open('/tmp/tracked.bin', encoding='utf-8').read().split('\0') if x)
   low = {x.lower(): x for x in tracked}
   ref = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']|url\(\s*["\']?([^"\')\s]+)')
   bad = 0
   for root, dirs, files in os.walk('.'):
       dirs[:] = [d for d in dirs if d not in ('.git', '__pycache__')]
       for f in files:
           if not f.endswith(('.html', '.css', '.js')): continue
           p = os.path.join(root, f)
           for m in ref.finditer(open(p, encoding='utf-8', errors='ignore').read()):
               u = m.group(1) or m.group(2)
               if not u or u.startswith(('http', '//', 'data:', '#', 'mailto:', 'javascript:', 'blob:', '${')): continue
               u = u.split('?')[0].split('#')[0]
               t = os.path.relpath(os.path.normpath(os.path.join(os.path.dirname(p), u)), '.')
               if t not in tracked:
                   bad += 1
                   print('❌', p, '->', u, '(大小写不符! 实际是 %s)' % low[t.lower()] if t.lower() in low else '(文件不存在)')
   print('✅ 全部命中，大小写与归一化都一致' if not bad else '共 %d 处问题' % bad)
   PY
   ```

   > - 注意要用 `git ls-files -z`：默认输出会把中文路径转义成八进制，导致误报。
   > - 报告里有两类"良性"结果不用管：以 `/` 开头的根路径引用（脚本按相对路径解析不了），
   >   以及页面本来就用 `onerror` 兜底的缺图。

4. **别提交 `.DS_Store` / `__pycache__/`。** macOS 会在每个目录生成 `.DS_Store`，Python 会生成 `__pycache__`，先写进 `.gitignore` 再 `git add`。

5. **绝对不要用 Git LFS。** GitHub Pages **不会下发 LFS 内容**，页面只会拿到一个指针文本文件。大音视频要么压缩，要么换托管平台。

6. **单文件限制：** 超过 50 MB 推送会警告，超过 100 MB 直接拒收；仓库建议控制在 1 GB 以内。

7. **先填 GitHub、后加 DNS**，否则有子域劫持风险（见第 5 步）。

8. **`www` 和裸域只能有一个当主域**，另一个会自动 301 跳过去。证书会同时覆盖两个名字，所以两个都能用。想换主域，改 Custom domain 即可。

9. **`404.html` 只认仓库根目录**，放在子目录里的不生效。

10. **公开仓库 = 全站公开。** GitHub 免费版 Pages 只支持公开仓库，所以学生名单、密钥、内部资料、公司文档**不要放进这个仓库**。

11. **国内访问 `github.io` 不稳定**（走 Fastly CDN）。这是 GitHub Pages 唯一的硬伤，见第七节的替代方向。

12. **别直接双击 `index.html` 调试。** 用了 ES Module / WebAssembly / 摄像头时，`file://` 协议会被浏览器拦截，必须用本地服务器（`python3 -m http.server 8080`）测。

---

## 七、常见问题

**Q：国内访问慢或打不开怎么办？**
三个方向，按成本排序：
1. 把域名的 DNS 托管换到 Cloudflare，开代理 + 缓存 —— 免费，通常比裸 `github.io` 稳；
2. 换腾讯 EdgeOne Pages 等国内厂商的 Pages 服务 —— 免费额度够用，支持自定义域名；
3. 阿里云 OSS + CDN —— 国内最快，但要花钱。

**Q：要不要 ICP 备案？**
`.cn` / `.com` 域名**本身不强制备案**；只有当域名解析到**中国大陆境内的服务器或 CDN 节点**时才必须备案。GitHub Pages、Cloudflare、EdgeOne 海外节点都不需要备案。

**Q：`Enforce HTTPS` 勾不上？**
证书还在签发（最长 24 小时），或者自定义域名刚改过。等一会儿强制刷新。仍不行就把 Custom domain 清空 → Save → 等 5 分钟 → 重新填回 → Save，触发重新签发。

**Q：想给每个网站不同子域名（如 `game.example.com`）？**
一个仓库 = 一个 Pages 站点。每个子域名需要独立仓库 + 独立 CNAME 记录 + 独立证书。如果站点不多、路径能分开，**"单仓库 + 子目录"最省事**（本指南对应的实例就是这么做的）。

**Q：仓库必须公开吗？**
免费版是。想用私有仓库 + 免费托管，考虑 Cloudflare Pages（注意单文件上限 25 MiB）。

---

## 八、平台对比

| 平台 | 免费 HTTPS | 自定义域名 | 单文件上限 | 国内访问 | 备案 |
|---|---|---|---|---|---|
| **GitHub Pages** | ✅ 自动 | ✅ 免费 | 100 MB | 一般 | 不需要 |
| Cloudflare Pages | ✅ 自动 | ✅（域名需托管到 Cloudflare） | **25 MiB**（官方限制） | 一般偏好 | 不需要 |
| 腾讯 EdgeOne Pages | ✅ | ✅ | 需查官方文档 | 可选大陆节点 | 大陆节点需要 |
| 阿里云 OSS + CDN | ✅ | ✅ | 大文件友好 | 最好 | 大陆节点需要 |
| 自建 VPS | 需自己配置 | ✅ | 看磁盘 | 看机房 | 大陆机房需要 |

---

## 九、一页速查（可直接贴墙上）

```bash
# 首次（在本机网站目录里）
printf '.DS_Store\n__pycache__/\n*.pyc\n' > .gitignore
touch .nojekyll
echo 'example.com' > CNAME
git init -b main && git add -A && git commit -m "首次发布"
git remote add origin git@github.com:<用户名>/<仓库名>.git
git push -u origin main

# 之后每次更新
git add -A && git commit -m "更新说明" && git push

# 验证
dig example.com +short
curl -sL -o /dev/null -w "%{url_effective} %{http_code}\n" http://example.com/
```

**网页端要做的两件事**（只能手动）：
1. Settings → Pages → Source = `main` / `/ (root)`，Custom domain 填域名
2. 证书签发后勾上 **Enforce HTTPS**

**DNS 要加的记录**：`@` 的 4 条 A 记录指向 `185.199.108~111.153`，`www` 的 CNAME 指向 `<用户名>.github.io`

---

> **本指南对应的实例**：<https://www.atcoding.cn/>
> （单仓库 + 根域名 + 10 个子站路径，全程未改动一行业务代码，仓库 93 个文件约 139 MB）
