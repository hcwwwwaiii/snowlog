# 雪跡 Snowlog

單板滑雪追蹤工具，使用 GitHub Pages 發布前端、Supabase Auth 登入及 PostgreSQL 儲存資料。不含 AI 功能。

## 使用

1. 建立個人帳戶並確認電郵，或使用已有帳戶登入。
2. 在「我的進度」更新技巧狀態、適用條件、下一步及教練回饋。
3. 滑完在「滑雪日誌」記錄雪場、練習、心得及影片連結。
4. 建立同行計劃，分享 16 位邀請碼。成員各自登入加入、設定自己的目標並完成共同待辦。
5. 日誌預設私人；選擇行程並勾選分享後，只有該行程的目前成員可讀取。
6. 收藏教學、雪場、裝備或行前清單；可連結相關技巧卡。
7. 使用頁尾「匯出紀錄」下載 JSON 備份。

退出或刪除行程會保留各自的日誌，並將相關日誌改為私人。

## 本機開發

Node.js 22.13 或以上。

```sh
npm ci
npm run dev
```

開啟 http://127.0.0.1:5175。

```sh
npm run build
npm run preview
```

建置結果在 dist/，可直接部署到 GitHub Pages。路徑使用相對網址，可支援 /snowlog/ 子目錄。前端公開不會公開資料庫中的個人資料。

## Supabase 設定

連線設定在 public/config.json，只包含專案 URL 與 publishable key。可公開金鑰是前端使用的識別值，資料權限仍由登入權杖、RLS 及受限制的 RPC 控制。不要把 service_role、secret key 或資料庫密碼放入前端或 GitHub。

正式專案：snowlog（lobgvyprscckitfyowwo）。

初始 migration 位於 supabase/migrations/，已套用到這個專案；不要重複套用。後續修改須新增 migration。

Supabase Auth → URL Configuration：

- Site URL：https://hcwwwwaiii.github.io/snowlog/
- Redirect URLs：https://hcwwwwaiii.github.io/snowlog/、http://127.0.0.1:5175/

在邀請同伴註冊前，確認 Email provider 已啟用，以及電郵服務可寄送確認信和重設密碼信。Supabase 預設寄信服务可能限制收件人；對外註冊請依 Supabase 文件設定自己的 SMTP。

## 權限設計

六張表全部啟用 RLS。authenticated 角色只有受 RLS 限制的 SELECT，沒有直接修改表格的權限。snowlog_snapshot 和 snowlog_save 兩個公開 RPC 採用 SECURITY INVOKER，呼叫未暴露 schema 的內部實作，並逐項驗證 auth.uid()、資料所有權、行程成員和建立者資格。

個人技巧卡、收藏及雪季目標不會分享給同伴。行程只顯示成員名稱、站姿及這趟旅程的目標。進度由本人更新，不會依滑雪天數自動評級。

影片與照片使用外部連結；個人收藏與公共雪場目錄分開，更新請以官方公告為準。

## 雪場探索（第一階段）

公開目錄在 `src/resorts.ts`，目前 10 個雪場（日本 7 個、深圳、廣州及珠海室內真雪各 1 個），每筆包含穩定 ID、名稱、地區、場館類型、位置、交通規劃提示、官方／政府來源及核對日期。只收錄戶外雪場與室內真雪，不收錄模擬器、旱雪、溜冰場或純嬉雪設施。

雪場探索以日本及大灣區的輪廓地圖為入口，可點地區標記或地區列表，進入 `#resorts/region/<id>` 地區頁；全部目錄在 `#resorts/all`。桌面按目的地、地區、類型及名稱篩選；手機提供全屏篩選面板。不列出香港場館選項。雪場詳情可用 `#resorts/<id>` 直接連結，包含來源及地圖入口。場景插圖由 SVG 繪製，並非場館實景或雪道圖。

「在此規劃雪旅」帶入行程名稱、雪場、官方及 Klook 參考連結（如有）；使用者自行填寫日期、住宿、交通、每日安排和待辦。尚未登入時，保留本次頁面選擇，登入後開啟行程表單。重新載入頁面不保留未儲存的選擇。現有行程仍以 `resort` 文字欄位儲存，兼容舊紀錄及目錄以外的雪場；目錄名稱相符時可從行程返回詳情。

目錄為隨網站版本維護的公開資料，沒有即時營業狀態、票價、預約名額或課程庫存。第一階段沿用既有 Supabase 行程 RPC，沒有新增資料表或擴大資料存取權限。

## 驗證

已完成正式建置、型別檢查、桌面／手機排版，以及在 Supabase 專案中使用三個虛構身分的交易內權限測試；測試資料全部 rollback，不留在正式資料庫。Supabase 安全 advisor 沒有提出問題。


## 視覺改版

首頁山景、水平導覽與手機底部導航、技巧路線及四類技巧圖形。一般文字採用 Spinnaker 及源柔黑體字形（自託管並保留 SIL OFL 授權），首頁大標題採用 SKI-O 的明體字族；品牌保留 Barlow Condensed。原創山景維持靜態。網站沒有接入 AI。設計來源、檢視結果與素材提示見 [DESIGN.md](./DESIGN.md)。

## 地圖與外部連結維護

地區定義在 `src/resortRegions.ts`，輪廓由 Natural Earth 公共領域資料簡化，標記為地區概略位置，不作導航。新增雪場需確認為戶外或室內真雪，再加上官方來源、核對日期及可用的 Klook 產品連結（如有）。`klook.note` 可記錄核對時暫停提供的票券，不能將外部連結當成即時庫存。詳情與行程草稿會顯示這些註記；沒有找到合適產品時省略 Klook 區塊。

字體來源與子集規則在 `public/fonts/FONT-SOURCES.md`；字體檔不含個人資料，其他字元回退系統字體。雪場探索以獨立 JavaScript 檔按需要載入，首頁不用先下載地圖元件。

### Scheduled visual refresh, 2026-10-14

Home headline uses self-hosted rounded Chinese; light digit-only Archivo face covers counts, dates, countdowns and progress. Sixteen original technique-specific SVG illustrations have readable captions. Nine resorts have verified historical Creative Commons photographs, with credits, source and license links on details and in public/media/resorts/PHOTO-SOURCES.md. Shenzhen image shows the venue exterior; Guangzhou image shows the indoor slope. Zhuhai keeps a labelled illustration and official photo link until a reusable photograph is supplied. No photo is presented as live snow conditions. No database or authentication changes.

### Practice focus and technique history

Each account can select up to three private focus skills. Technique details combine existing owned journals with append-only progress snapshots. Quick recording preselects one skill and today in Hong Kong; it suggests the single active trip, otherwise the last logged resort, and defaults to private. The optional trip chooser only lists trips covering that date. Progress assessment stays a separate action. Existing progress is labelled as a baseline; earlier changes are not invented. Identical progress writes do not append events. User-profile locking serializes concurrent progress updates. Focus survives profile edits, and history is included in JSON exports. Migration: 20261014085513_skill_practice.sql. History is in the unexposed private schema with ownership RLS and no direct client write grants; authenticated RPC checks retain ownership.

### Personal technique observations, 2026-10-14

Sixteen technique definitions each have three stable observation IDs (c1–c3); they are personal self-assessments, not qualifications. Relevant techniques have independent edge, transition, lateral direction, riding stance or board-end ratings. Slope, snow, perceived speed and stance are optional structured conditions; existing free-text conditions and notes are preserved. Blockers retain their text and resolution notes; server-generated creation/resolution times are recorded, with resolved and reopened states preserved in the append-only timeline. Client forms send an expected updated_at to prevent stale edits overwriting newer observations. The RPC validates fields, allowed check/side IDs, levels and condition options, canonicalizes empty choices, preserves assessment for older clients and rejects removal of previously stored blockers. Each technique may retain up to 30 blocker entries. No automatic mastery grading. Migration: 20261014115215_skill_assessment.sql. Existing owner RLS, authenticated write RPC, private history and optional journal sharing remain unchanged. Interface wording uses 滑雪之旅; user-authored saved titles are untouched.

### Japanese directory and map refresh, 2026-10-14

Japan expands from seven entries to 25 destinations: 24 individual outdoor resorts plus the explicitly labelled Shiga Kogen ski area. The full directory has 28 destinations including the three existing Greater Bay Area real-snow venues. Eighteen additions use verified official winter/access sources and 13 Klook product links (12 distinct products); package and partial-area ticket limits are stated. Seasonal operating dates, prices and timetables are deliberately left to the linked official pages. Each entry retains its verification date and sources. New destinations without a verified reusable photograph use the existing clearly labelled illustration fallback and official photo link.

The Japanese map uses original SVG controls with public-domain Natural Earth 1:10m administrative paths, seven destination groups, keyboard links, mountain markers and linked region rows. Main islands only; no resort pin is claimed to be an entrance or navigation coordinate. Tohoku is a regional group and the Kansai group currently highlights Shiga, where the listed venue lies. See public/MAP-SOURCES.md for source, license, extraction hash and geometry changes. Existing region routes, personal trip creation, indoor venue map and authentication are retained. No Supabase schema or permission changes.
