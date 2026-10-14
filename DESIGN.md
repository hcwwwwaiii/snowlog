# 地圖與字體更新（2026-10-14）

移除香港場館選項，新增珠海萬雪匯，共 10 個真雪雪場。日本（北海道、東北、新潟、長野）及大灣區（廣州、深圳、珠海）輪廓圖可透過標記與地區列表進入分頁；保留所有雪場的搜尋與手機篩選。Natural Earth 輪廓資料為公共領域，點位為地區概略位置。

一般文字採用 SKI-O 的 Spinnaker 與源柔黑體字形，字體自行託管、保留原作者著作權與 SIL OFL。源柔黑體子集重新命名 Snowlog Rounded，未知字元回退系統字體。首頁大標題採用同一明體回退字族，Snowlog 品牌字樣保留原設定。

Klook 為外部參考入口，並非 Snowlog 預約系統。產品名稱與適用雪季、日期的核對提醒明確顯示，未加入價格或庫存。參考連結會帶入自己的行程，個人資料權限沿用現有 Supabase 設計。

# Snowlog 視覺改版

設計方向：單板滑雪者的個人雪上手冊。山景作為唯一主要視覺焦點，其餘頁面保持清楚、可讀、快速。

## 設計系統
- Glacier white #f2f5f6：內容背景。
- Midnight blue #142e42：文字與識別。
- Trail blue #193c54：可操作的技巧路線。
- Cobalt #2459c4：儲存、新增、明確的操作入口。
- Snow blue #dce7ef：次要區域。
- Orange #df6b3f：鍵盤焦點。
- Barlow Condensed Bold / Bold Italic：品牌、數字。授權隨字體附上。
- 中文：作業系統正體中文無襯線字體，保持輸入、資料及導航可讀。

版面：上方清楚導航 → 山景與記錄入口 → 真實紀錄 → 下次旅程 → 技巧分類路線 → 最近練習與日誌。桌面採水平導航，手機採底部五項導航。

原始計畫的不足：避免把所有功能放進同樣的小型圓角卡。品牌焦點留給山景，技巧路線使用雪道地形圖語言，數據與表單使用安靜的白底。

## 參考來源
- https://www.snowboard-asylum.com/ ：大字、圖片構圖、功能性圖片互動，沒有複製其品牌或素材。
- https://www.niseko.ne.jp/en/ ：出發規劃與雪場資訊的明確分層。
- https://www.awwwards.com/about-evaluation/ ：設計 40%、易用性 30%、創意 20%、內容 10%。這是內部檢視依據，不是官方得分或入選判定。

## 三輪設計檢視
1. 桌面首頁：從狹窄管理台改成山景主視覺、品牌字體、真實統計及可點選的技巧路線；保留個人資料隔離與現有資料接口。
2. 390px 手機：发现技巧分類文字太密、山景主體裁切不理想、切頁保持原位置。改成雙欄觸控站點、調整山景焦點、切頁回到頁首。修正原本 hashchange 將路線篩選清除的行為。
3. 有資料及各子頁：用本機虛構 fixture 檢查行程、日誌、技巧、收藏、表單。移除技巧頁重複的大型路線，增加簡潔進度摘要；修正行程圖片下方的多餘空隙、頁尾文字對比及行程詳細頁捲動。

未聲稱符合正式得獎門檻。Awwwards 的 SOTD 是比較性的評審結果，不能靠內部檢查保證。此次提升視覺完成度、主題一致性、響應式操作及可讀性；真實使用者可用性研究、跨 Safari/Firefox 的裝置驗證與正式评审仍未進行。

## 原創圖片
工具：內建 imagegen。用途：純靜態背景，網站沒有 AI API、模型或聊天功能。
圖片：public/media/alpine-carve.webp（1536×1024，約 217KB）。這是虛構山景，不代表實際雪場或使用者紀錄。
最終提示：photorealistic-natural panoramic alpine landscape, fresh snow, lone helmeted snowboarder in dark navy and orange at the right lower third, one curved carving trail, cinematic morning light, rugged distant peaks, pale snow, indigo shadows, open left side for title overlay; no text, logos, buildings, lifts or watermarks.

## 第四輪檢查
- 390px 五個頁面有資料時均沒有水平溢出。
- 320px 發現首頁練習列与路線標題造成溢出，已修正 grid 最小寬度、文字尺寸與列間距；五頁及行程詳細頁重驗沒有水平溢出。
- 發現原生 dialog 在部分瀏覽器鍵盤循環會離開頁面，補上明確 Tab/Shift+Tab 循環。重新驗證首尾焦點及 Escape 關閉成功。
- 本機虛構資料的技巧狀態更新後，摘要及卡片同步更新。
- 16 項技巧分類、路線篩選及回到頁首行为已檢查。
- 圖片使用 WebP；字體自行託管並附 OFL 授權；減少動態偏好會停用所有過場。

所有 fixture、驗證程式及截圖都留在 ignored .verification，沒有上傳為正式帳戶資料。Supabase 資料庫、登入憑證及 RLS 沒有変更。
# 雪場探索第一階段（2026-10-14）

新增「雪場探索」導覽、原創 SVG 雪山／室內雪場場景、地區與類型篩選、全屏手機篩選、可直接連結的雪場詳情，以及接到既有行程表單的規劃入口。沿用雪跡的冰藍、海軍藍與鈷藍；圖形為示意，避免把虛構山景當作某個真實雪場的照片。

首批 9 個雪場的來源與核對日期可在頁面查看。沒有課程目錄、課程庫存、購物車或模擬器。目錄公開，個人行程仍走既有登入及 Supabase RPC。

檢視桌面、390px、320px：目的地／地區／類型篩選、詳情返回、香港空白狀態、篩選面板焦點循環；本機模擬登入後帶入雪場，模擬行程儲存及編輯回讀。發現原有行程對話框在窄螢幕受固定寬度影響，修正寬度限制與單欄日期欄位。這些模擬資料沒有連接正式資料庫，也不會發布。


## October 14 scheduled visual refresh

Retain the chalk / navy / cobalt palette. The home cover now uses bold rounded Chinese with two deliberate lines, matching the familiar body while feeling more like a snowboard journal. Light Archivo digits replace heavy counters and also cover dates and progress through a digit-only font face. Sixteen original board, rider and route SVGs show technique-specific motion without adding animation; captions distinguish edges and turn shapes. Resort cards and details use verified historical Creative Commons photographs with attribution and licensing on the detail page; missing and failed photos have labelled illustration fallbacks. Check PHOTO-SOURCES.md for the exact location and license of each image.

## Practice flow

A compact three-card practice focus section precedes the full technique directory. Focus cards show the next step and last practice date, with a quick-record action. Dedicated technique pages retain the board/rider illustrations and combine chronological owned journals with explicit state updates. Historical baseline records are labelled. A short native-dialog journal form keeps technique fixed and places optional snow, media and sharing fields in native disclosure; no new animation treatment is added.

## Concrete personal assessment

Technique details show observed abilities, independent direction ratings, four environment fields and retained blockers. The native update dialog uses three checkboxes and explicit labels; irrelevant directions are omitted. Resolved blockers remain readable with a green label and notes. Timeline snapshots place the full historical assessment inside a native disclosure to keep the chronology short. Assessment never computes the overall skill status. The cobalt/navy/rounded type palette and light numerals remain unchanged. No new custom motion. Technique and assessment views load on demand.

## Regional atlas refresh, 2026-10-14

SKI-O informs the detailed Japanese silhouette, direct region labels and linked destination rows. Snowlog uses original code and public-domain Natural Earth 1:10m prefecture boundaries, with a 0.45-unit simplification instead of the former coarse 1:110m coast. Seven destination groups use muted ice-blue, teal and sage fills; unlisted prefectures stay neutral. Dark mountain pins and off-coast labels identify regional destinations without covering the coastline. A single quiet white panel holds destination rows, instead of seven floating form-like cards. The current rounded Chinese and light numerals stay unchanged; coastline geometry is the focal point. No new custom motion. Bay-area geometry remains intact, with the same label/row design. Mobile stacks map and full-sized links. Only directory-covered regional groups are clickable.
