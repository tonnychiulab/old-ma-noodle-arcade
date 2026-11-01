# 老馬麵攤製作：台灣夜市街機 30 合 1

> 復古像素風的台灣夜市遊戲合集。今晚開哪一攤？

[![立即玩](https://img.shields.io/badge/%E2%96%B6%20%E7%AB%8B%E5%8D%B3%E7%8E%A9-%E9%80%9B%E5%A4%9C%E5%B8%82-ffb236?style=for-the-badge&labelColor=38271a)](https://tonnychiulab.github.io/old-ma-noodle-arcade/)

在瀏覽器直接玩：**[立即玩：台灣夜市街機 30 合 1](https://tonnychiulab.github.io/old-ma-noodle-arcade/)**

## 遊戲特色

- 30 款短局街機玩法：出餐、套圈、彈珠、釣蝦、雨巷跑酷、廟口鼓陣等。
- Phaser 4、TypeScript 與 Vite 製作；支援桌面鍵盤和手機觸控。
- 像素夜市街景、紅白棚布、街屋窗燈、霓虹招牌與原創 8-bit 音效。
- 個人分數與成就保存在目前瀏覽器，不需註冊帳號。
- 首批六款支援 Colyseus 私人房間多人對戰；線上多人需要另行部署房間伺服器，GitHub Pages 試玩版預設提供單人遊戲。

## 本機執行

需要 Node.js 20 或更新版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell 可使用：

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

單人遊戲不需後端。啟動 `npm run server:dev` 可在本機測試多人房間，預設位於 `http://localhost:2567`。部署多人服務後，設定前端環境變數 `VITE_ROOM_SERVER_URL` 為公開的 Colyseus WebSocket 網址。

## 測試與建置

```bash
npm test
npm run build
```

完整設計與驗收紀錄：

- [軟體設計文件（SDD）](docs/SDD.md)
- [測試報告](docs/test-report.md)

## GitHub Pages 部署

推送至 `main` 後，GitHub Actions 會建置 Vite 網站並部署至 GitHub Pages。到 Repo 的 **Settings → Pages** 將來源設為 **GitHub Actions**；後續每次推送都會更新試玩版。Vite 會在 Actions 建置時自動使用 Repo 子路徑。

## 作者與模型揭露

- **共同作者：** 老馬麵攤製作 × GPT-6 Luna
- **企劃與程式製作使用模型：** GPT-6 Luna
- **版本：** 以 [`package.json`](package.json) 為準

## 素材結構

每款遊戲的角色、音效、圖片、場景、圖示分開管理：

```text
public/assets/
├── games/<game-id>/{characters,audio,images,scenes,icons}/
└── shared/{audio,images,icons}/
```

原創像素 SVG 與 WAV 素材由 `scripts/generate-assets.mjs` 產生。
