# 素材看板

这是一个前端素材看板，用于展示采集来的商店图素材记录。

## 使用方式

直接用浏览器打开 `index.html`，或在当前目录运行：

```bash
npm run dev
```

## 当前功能

- 每条记录按表格一行展示。
- 表头包含产品名、采集时间、品类、商店图、备注和操作。
- 从 Supabase 读取 `asset_records` 和 `asset_images`。
- icon 页面从 Supabase 读取 `icon_records`，建表 SQL 见 `supabase-icon.sql`。
- 产品名可绑定来源链接并跳转。
- 品类和备注支持在前端编辑，并保存回 Supabase。
- 点击缩略图可在空白处查看大图。
- 支持按行下载全部商店图。

## 部署到 Vercel

1. 将 `web-mvp` 目录上传到 GitHub 仓库。
2. 打开 Vercel，点击 `Add New Project`。
3. 选择这个 GitHub 仓库。
4. 如果仓库根目录不是 `web-mvp`，在 Vercel 里把 `Root Directory` 设置为 `web-mvp`。
5. Framework Preset 选择 `Other`。
6. Build Command 留空。
7. Output Directory 留空或填 `.`。
8. 点击 Deploy。

## 说明

当前版本只负责读取 Supabase 数据。后续可以让 Chrome 插件把采集结果写入 Supabase Database 和 Storage。
