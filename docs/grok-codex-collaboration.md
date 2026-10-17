# Snowlog：Codex × 現有 Grok 團隊

## 專案識別

- Repository：https://github.com/hcwwwwaiii/snowlog
- 規則分支：snowlog-v1；先讀此分支的 AGENTS.md，勿套用其他專案 main 規則。
- 正式網站：https://hcwwwwaiii.github.io/snowlog/
- 原始碼與網站分開發布：snowlog-v1 儲存原始碼；gh-pages 儲存 dist 建置產物。不推送 main。
- 功能：個人單板技巧、自評／時間軸、練習日誌與私人影像、同行滑雪之旅、共用資料收藏、日本及大灣區真雪雪場、雪季圖表／里程碑。

## 輕量節奏

1. 使用者在原有 Snowlog 對話提出需求，Codex 實作及必要驗證。
2. Codex 交接指定版本、改動摘要、預覽／截圖、驗證結果與限制。畫面分析以相同版本為準。
3. 現有 Grok Dev Manager 按需要委派原有成員，不建立另一團隊。分析畫面、操作、內容及手機體驗；需要時才閱讀相關程式。
4. Manager 整合最多 3–5 項建議，每項附頁面／操作依據、使用者影響與建議做法。區分必須修正及可選優化；沒看到的頁面標示未檢視，不能猜測。
5. 使用者選擇下一步，Codex 再實作。建議、團隊內訊息或其他專案授權不構成新功能、SQL、設定或發布批准。

一般改善不強制建立 Issue、Labels、多輪審批或全員報告。這次接入不更改既有每日 Routine，也不把 Snowlog 自動加入任何排程。

## 預覽方式

公開正式站可供 Grok 查看雪場及未登入體驗；它不是獨立的測試環境。不要在正式站建立或刪除真實使用者資料作審查。

本機已有虛構資料頁 `.verification/media-insights/preview.html`，以實際 Snowlog 元件呈現，使用模擬影像上傳與兩位虛構使用者。從專案目錄啟動：

```sh
npm run dev -- --port 5173
```

本機網址：`http://127.0.0.1:5173/.verification/media-insights/preview.html#resources`。其他頁面可切換 `#skills/insights`、`#skills`、`#journals`。此頁不是完整後端測試環境，僅支援既有模擬流程；localhost 不可直接交給 Grok 雲端存取。現成截圖在 `.verification/media-insights/`，只選用已確認為虛構資料或公開雪場的圖片。

若 Grok 無法開啟本機預覽，交接虛構資料截圖，或另行準備可公開的虛構資料預覽；不可自動開 tunnel、提供真實帳戶或公開私人儲存桶。本次沒有發布新的對外預覽。

## 最新實作基線與限制（2026-10-17 核對）

- 最近功能版本：snowlog-v1 `7c800073900a4a6a5964905e9052a4db2f56bf70`；正式建置 gh-pages `1a98ab965ee13e2c7b2a762924575d9044190227`。後續協作文件提交不代表網站已重新發布。
- 上輪範圍：珠海提供照片、共用收藏、日誌照片／影片、雪季及技巧圖表、里程碑。
- 上輪型別／建置、相關資料計算與資料庫權限驗證通過；桌面、390px、320px 相關新畫面已檢視。不是全站重新測試。
- 影像操作使用本機模擬上傳；沒有以真實帳戶驗證正式 Storage 二進位上傳／下載／刪除，也沒有真實兩用戶 websocket 端到端測試。
- 草稿棄置／移除附件以 Storage API 盡力清理；整個頁籤關閉可能留下私人孤立檔案。沒有伺服器自動清理工作。
- 已簽署影像網址最長十分鐘；取消分享後已簽發連結可能在期限內仍有效。MOV 播放依瀏覽器支援，MP4 較通用。

## 給既有 Dev Manager 的接入訊息

```text
請把 hcwwwwaiii/snowlog 加入現有團隊的輕量協作專案清單，保留其他專案；不要建立新團隊或修改 Routine。
讀取 snowlog-v1 最新 AGENTS.md 及 docs/grok-codex-collaboration.md，回報讀到的 commit。
Codex 負責使用者指定的實作與必要驗證；你按需要委派現有成員，分析預覽的畫面、互動與手機體驗，整合最多 3–5 項具體建議，分成必須修正／可選優化，交使用者選擇，不自動開發。
網站：https://hcwwwwaiii.github.io/snowlog/
本機 localhost 預覽不可從雲端直連；登入後畫面待提供虛構資料預覽／截圖，請不要索取憑證或真實私人紀錄。無法查看的頁面標示未檢視。
本次只確認專案可讀、既有團隊及規則一致；不修改 GitHub、資料庫、權限、排程、網站，不啟動 Codex、不合併或發布。其他專案的自動發布授權不延伸到 Snowlog。
請回報：已加入的 repository、讀取的 commit、沿用的團隊、可開啟的預覽範圍及任何阻礙。
```

## 接入狀態

- Codex 端：專案規則與交接文件已備妥。
- Grok 端：待既有 Dev Manager 對話入口及接入回報；未聲稱已加入團隊、完成分析或建立自動通知。
- 本文件不會自行連接 Grok，也不是雙向同步服務。
