# codebase-web

`master` 上跑的是三个页签：图谱、项目、控制。项目、控制、新建索引和删除确认按设计图排了版。图谱是画布上的点云，悬停可看节点信息。数据来自本机官方服务 `127.0.0.1:9749`。

`graph-ui/` 是官方 `v0.12.1` 前端，留着对照和以后合并上游，当前开发命令不会启动它。

```powershell
bun install
bun run dev
```

打开 `http://127.0.0.1:5173`。官方服务要先在 `9749` 上运行。

## 合并上游前端

```powershell
git remote add upstream https://github.com/DeusData/codebase-memory-mcp.git
git fetch upstream tag v0.12.2
git checkout -b upstream-graph-ui
git checkout upstream/v0.12.2 -- graph-ui
git add graph-ui
git commit -m "同步官方 graph-ui v0.12.2"
git checkout main
git merge upstream-graph-ui
```

官方数据约定写在 `src/contract.ts`。配置修订不是 `"3"`，或图数据、项目列表缺字段时，页面顶部会提示。
