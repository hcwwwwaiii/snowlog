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
