<<<<<<< HEAD
# 代码图谱前端

这个目录是畿智自己的代码图谱页面。图数据仍由官方 `codebase-memory-mcp` 提供，页面只负责读取和展示。

当前页面对着本机官方服务 `0.12.1` 写的。它约定：

- `GET /api/config` 的 `revision` 是 `"3"`
- `list_projects` 的文本包含 `cols: name root_path branch`
- `GET /api/layout` 的节点包含 `id`、`name`、`label`、`x`、`y`、`z`，连线包含 `source`、`target`、`type`

官方多返回字段时页面照常显示。修订号变了，或上面这些字段少了，页面顶部会出现「官方数据和当前前端不匹配」。

## 运行

先让官方服务在 `127.0.0.1:9749` 运行，然后：

```powershell
bun install
bun run dev
```

打开 `http://127.0.0.1:5173`。开发服务器把 `/api` 和 `/rpc` 转到官方服务，避免浏览器跨域被拒绝。

```powershell
bun test
```

仓库初始化和后续 SDK 封装不在这个目录的当前步骤里。
=======
# codebase-web
代码图谱前端页面
>>>>>>> 4f974569ca05a54412e356a8e9695a5c631762b2
