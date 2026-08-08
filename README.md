# 楚河棋局

一个适合家人远程对弈的实时中国象棋应用。双方通过房间链接加入，服务器使用 `xiangqiops` 校验每一步，并通过 Socket.IO 同步棋局。

## 本地运行

```bash
npm install
npm start
```

打开 `http://localhost:3000`。

## 部署

仓库中的 `render.yaml` 可在 Render 上创建 Node Web Service。健康检查路径为 `/health`。
