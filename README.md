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

影片與照片使用外部連結；雪場資訊為手動收藏，更新請以官方公告為準。

## 驗證

已完成正式建置、型別檢查、桌面／手機排版，以及在 Supabase 專案中使用三個虛構身分的交易內權限測試；測試資料全部 rollback，不留在正式資料庫。Supabase 安全 advisor 沒有提出問題。


## 視覺改版

首頁山景、水平導覽與手機底部導航、技巧路線及四類技巧圖形。使用 Barlow Condensed（SIL OFL）與原創靜態山景。網站沒有接入 AI。設計來源、檢視結果與素材提示見 [DESIGN.md](./DESIGN.md)。
