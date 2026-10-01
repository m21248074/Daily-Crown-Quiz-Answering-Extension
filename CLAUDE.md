# CLAUDE.md

Wizard101 每日皇冠幣測驗自動作答的 Chrome 擴充功能 (Manifest V3)。純 JavaScript，沒有建置步驟、套件或測試框架。

## 檔案結構

- `background.js`：service worker。測驗流程、分頁導覽、排程 (`chrome.alarms`)、通知、進度與徽章。
- `quizScript.js`：測驗頁的 content script。判斷頁面狀態 (題目/結果/節流)、作答、內建題庫 (每份測驗一個 `switch`)。
- `login.js`：測驗首頁，自動登入後送出 `startQuiz`。
- `result.js`：皇冠幣紀錄頁，標示 20 小時內的入帳並送出 `scheduleNext`。
- `popup/`：點擴充圖示的彈出面板。
- `options/`：選項頁。
- `error429.js`、`429Wait.js`、`waitScreen.js`：舊的 429 處理流程，目前未使用 (會導向原作者的外部網站)。

各部分之間用 `chrome.runtime.sendMessage({ greeting: '...' })` 溝通，訊息種類集中在 `background.js` 的 `onMessage` switch。

## 重要行為與陷阱

- **Service worker 會被終止**，全域變數不可靠。需要保留的狀態存在 `chrome.storage`：
  - `sync`：使用者設定與 `totalCrowns`
  - `local`：本輪進度 `progress` (`state`: idle / running / captcha / done)
  - `session`：測驗分頁 `quizTabId`、背景讀取排程用的 `scheduleTabId`
- **只操作測驗分頁**：導覽用訊息的 `sender.tab.id` 或 `quizTabId`，不要用「目前使用中的分頁」。
- Service worker 沒有 `window`，`window.open` 等 DOM API 不能用。
- 測驗名稱從 `.contentbox` 文字以 `slice(10, -7)` 取出 (`Wizard101 ` 與 ` Trivia`)。
- Zafaria 是最後一份測驗，節流或完成時都送 `endQuiz` 而不是 `nextQuiz`。
- 新增設定時，同時更新 `createUser()` 的預設值與 `onUpdate()` 的補值，以及選項頁的讀取、預設、儲存。
- **CAPTCHA 一律由使用者手動完成**，不要實作任何繞過或自動解驗證的功能。

## 慣例

- 分支：`feat/<描述>`、`fix/<描述>`、`docs/<描述>`，從最新的 `main` 開。
- Commit：Conventional Commits (`feat:` / `fix:` / `docs:` / `chore:`)，標題用英文；一個 commit 只做一件事，可單獨運作。
- PR 說明與使用者介面文字使用繁體中文。
- 縮排沿用各檔案現狀：`background.js`、`quizScript.js` 用 tab；`options/*.js`、`popup/*.js`、`result.js` 用兩個空白。
- 發布版本時：更新 `manifest.json` 的 `version`、把 `CHANGELOG.md` 的「未發布」移到新版本，合併後打 tag (例如 `v7.1.0`)。

## 測試

沒有自動化測試。改動後至少：

1. `node --check <file>.js` 檢查語法，`python3 -m json.tool manifest.json` 檢查 manifest。
2. 用 Playwright 載入擴充功能實際跑流程：
   - `launchPersistentContext` 搭配 `--disable-extensions-except=<repo>`、`--load-extension=<repo>`、`--headless=new`。
   - 無法連到 wizard101.com 時，用本機 HTTPS 伺服器 (自簽憑證) 模擬網站，加上 `--host-resolver-rules=MAP www.wizard101.com:443 127.0.0.1:8443`、`--ignore-certificate-errors`、`--no-proxy-server`。`page.route` 攔截不到擴充功能自己開的分頁，所以要用這個方式。
   - 模擬頁面需要的元素：首頁 `#userNameOverflow`；測驗頁 `.contentbox`，加上 `.quizThrottle` (節流)、`.rewardText` (結果，以 `Y` 開頭代表需要驗證，搭配 `.loginitem`)；紀錄頁 `#theGrid2` 與 `result.js` 中提示欄位的選擇器。
   - 把選項 `timeToWaitQuestion` 設為 0 可以加快流程。
3. 最終仍需在真實網站上確認。
