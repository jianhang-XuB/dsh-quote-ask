# dsh-quote-ask

> Select text anywhere in a DSH conversation, quote it into a card above the composer, and ask a follow-up about exactly that passage.

划选对话里的文字 → 引用 → 针对这段内容提问。**DSH Desktop / DSH Web** 的客户端插件。

<details>
<summary><b>English summary</b></summary>

**dsh-quote-ask** adds targeted quoting to the DeepSeek Harness web UI.

Select any text in a conversation and a floating **Quote** button appears above
the selection. The excerpt lands in a card above the composer — collapsed to three
lines, expandable, removable, stackable — leaving the question box free for your
follow-up. On send, the quoted passage travels with the message as a Markdown
blockquote, so the model sees exactly the passage you meant, verbatim and complete.

There is also a **Quote** action under every assistant message, for when the
floating button is awkward to reach.

- **Identity comes from official slots, not DOM sniffing.** The per-message action
  seat hands the plugin a durable `messageId`, so quotes carry the real role and
  turn instead of a guess. The old approach silently mislabelled every quote.
- **Quotes are snapshots, not pointers.** The whole excerpt is serialized into the
  chip, so it still resolves after compaction or session rotation. A pointer would
  dangle — and the worst failure mode there is a model that invents content rather
  than admitting it cannot find it.
- **The card is a pure projection of the draft**, so it can never disagree with
  what will actually be sent.

```bash
dsh plugin --profile web add github:jianhang-XuB/dsh-quote-ask
```

Requires DSH kernel `>= 0.2.0-rc.2`. `lib/` is committed, so installation needs no
build step.

</details>

<!--
  截图位置。建议放一张动图：划选 → 浮动按钮 → 卡片 → 提问 → 发送。
  ![demo](docs/demo.gif)
-->

---

## 它解决什么问题

在长回答里追问某一个细节时，你通常需要先把那段话复制一遍再提问 —— 或者含糊地说"上面第二点"，然后祈祷模型指的是同一处。

这个插件把这件事变成两步：**划选，问**。

1. **划选**任意对话内容，松开鼠标后选区正上方浮出「❐ 引用」按钮
2. 或点**每条 AI 回答底部**操作栏里常驻的「❐ 引用」（划选没点到时的兜底入口）
3. 引用落到**输入框上方**的卡片里：顶部标注来源，正文固定 3 行可展开，可单独删除，可堆叠多条
4. 在输入框里**针对这段内容提问**，发送时引用原文随消息一起交给模型

可引用范围：AI 的回答、你自己的提问、工具调用输出与代码块。

引用以 Markdown 引用块的形式随消息发出，模型看到的是：

```
> [引用 · 助手 · 第 6 轮]
> 被引用的原文，完整逐字
```

---

## 安装

要求：DSH 内核 `>= 0.2.0-rc.2`（`web` 或 `desktop` profile）。

**从 GitHub 安装**（`lib/` 已提交，无需构建）：

```bash
dsh plugin --profile web add github:jianhang-XuB/dsh-quote-ask
```

锁定版本：

```bash
dsh plugin --profile web add github:jianhang-XuB/dsh-quote-ask#v0.1.0
```

> **使用 DSH Desktop 应用？** 在应用内置终端里执行同样的命令、**不要加 `--profile`**，它会自动指向 `desktop` profile。首次安装需要重启一次 DSH；之后的升级是热重载，不需要重启。

装完刷新一次浏览器页面。

---

## 设计上值得一提的几点

### 身份来自官方插槽，不是猜 DOM

插件通过 DSH 的官方座位拿数据，而不是去页面上嗅探属性：

| 需要知道 | 来源 |
| --- | --- |
| 这段是**助手**说的 | 组件注册在 `conversation.chat.assistant-actions` 里，天生就是助手消息 |
| 这条消息的**持久 id** | 该座位的 `ownerProps`：`{ messageId }`（UUID） |
| 是**第几轮** | 消息容器上的 `data-chat-turn` |
| 写入输入框 | `conversation.input` 官方门面 |
| 发送时注入原文 | `inputTriggers` 的 owner codec |

唯一残留的 DOM 依赖是"**选区落在哪条消息里**" —— 选区是浏览器的概念，DSH 没有对应 API。关键在于它的**失败方式**：找不到就**按钮不出现**（看得见），而不是猜错角色后**静默给出错误的值**。

### 引用用快照，不用指针

chip 里存的是**内容本身**（`ref` 里是序列化后的完整原文），发送时只做 `JSON.parse` 再拼 Markdown —— 不需要向任何地方查询。

这样即使原文后来被 compaction 折叠、或会话轮转，引用依然有效。指针方案在这些情况下会悬空，而最坏的失败模式是**模型取不到内容却不承认，直接编一段**。

### 引用卡片是草稿的纯投影

卡片渲染的就是 `InputState.occurrences` 里属于本插件的条目，**插件侧不镜像任何状态**。所以不可能出现"卡片显示的和实际要发送的不一致"；删掉一条，卡片自动少一条。

### 引用正文上限 20000 字

纯粹是防"把整个会话划选下来"这类病态输入的安全阀。正常引用不受影响，触发时卡片和发送帧都会明确标注「已截断」。

---

## 从源码构建

```bash
pnpm install
pnpm build        # 产出 lib/index.js + lib/client.js
pnpm watch        # 开发模式，改 src/ 自动重建
```

> **`lib/` 是提交进版本库的。** DSH 从仓库直接安装时不会跑构建，所以改完 `src/` 必须重新 `pnpm build` 再提交。`.gitignore` 里刻意没有忽略 `lib/`。

客户端 bundle 是 **CommonJS 包在 `window.__ModuleLoader__.load` 里**，`react` / `react-dom` / `react/jsx-runtime` / `@deepseek-ai/*` 必须保持 **external** —— 打进第二份 React 会让 hooks 崩掉。

本地开发时用 `link:` 安装，改完重建即热重载、不用刷新页面：

```bash
dsh plugin --profile web add link:/absolute/path/to/dsh-quote-ask
```

---

## 目录

```
├─ package.json          dsh.bundle.patch + dsh.client.inject 声明
├─ cordis.patch.yml      把宿主行插进组合（宿主行是空壳，只为挂载客户端）
├─ lib/                  构建产物，已提交
├─ scripts/build.mjs     esbuild 构建
└─ src/
   ├─ index.js           宿主端，11 行空壳
   └─ client/
      ├─ index.jsx       apply()：注册座位、codec、语言、样式
      ├─ quote.js        快照载荷 · 发送帧 · 语言字典 · 长度上限
      ├─ bridge.js       官方输入契约 · 身份登记表 · chip 增删 · codec · 选区
      ├─ components.jsx  引用卡片 · 浮动按钮 · 操作栏按钮
      └─ styles.js       卡片样式（跟随 DSH 主题 token）
```

---

## 排查

浏览器控制台过滤 `[dsh-quote-ask]` 能看到插件自己打的全部警告。

| 症状 | 大概率先坏在哪 |
| --- | --- |
| 划选后浮动按钮不出现 | `[data-slot="conversation.session"]` 改名了 |
| 表头显示「对话」而不是「助手」 | `data-chat-flow-kind` 改名了 |
| 轮次号消失 | `data-chat-turn` 没了 |
| 卡片整个不出现 | `InputState.occurrences` 结构变了 |
| 卡片出现但删不掉 | 探测坐标换算失效 |
| 引用插不进去 | `conversation.input.for()` 或 `insertReference` 签名变了 |
| 插进去是纯文本而非 chip | codec 契约变了（会打 `codec unavailable` 警告） |
| 引用发出去变成空 | codec 的 `serialize` 没被调用 |

**插件列表里显示 `failed to import` / `fiberPhase: null`**：检查 `lib/index.js` 是否存在。名单条目指向 `lib/index.js`，缺了它条目无法被 import。

---

## 已知边界

- **跨消息划选**会丢掉角色和轮次 —— 归属不明就不瞎标，属于有意为之
- **流式输出过程中划选不稳定**：回答还在生成时 DOM 持续重渲染，选区可能被作废；引用文本是选定时快照，内容不会错
- **多 composer 场景（如同屏侧边对话）的引用归属未实测**
- **整条回答引用未实现**（有意的）：整条引用等于把已经在上文里的内容再复制一遍，是重复计费；引用"你选中的部分"更准确

---

## License

[MIT](./LICENSE)
