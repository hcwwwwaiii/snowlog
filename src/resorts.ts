export type Resort = {
  id: string; name: string; localName: string; country: '日本' | '中國內地'; region: string;
  type: '戶外雪場' | '室內真雪'; summary: string; address: string; access: string;
  highlights: string[]; planning: string; url: string; linkLabel: string;
  sources: { title: string; url: string }[]; verified: string;
  klook?: {url:string;label:string;verified:string;note?:string};
};

// Curated public directory. Dates record editorial verification, not live operating status.
// Do not add simulators, dry slopes, skating rinks or snow-play-only venues.
export const resorts: Resort[] = [
  {
    id:'zhuhai-snow-haven',name:'珠海萬雪匯冰雪樂園',localName:'珠海万雪汇冰雪乐园',country:'中國內地',region:'珠海',type:'室內真雪',
    summary:'在灣區西岸安排自己的滑行日。萬雪匯設有室內滑雪區與娛雪區，可使用單板或雙板裝備。',
    address:'廣東省珠海市香洲區珠海大道1333號',
    access:'先安排香港往珠海的跨境交通，再確認到珠海大道場館的市內接駁。把過關、換票及返程時間一起排進行程。',
    highlights:['室內造雪環境','初、中級滑雪區','滑雪區與娛雪區分開'],
    planning:'先核對票種是否包含滑雪區，以及時段和裝備安排；自備裝備入場條件以場館及票券頁為準。',
    url:'https://www.zhuhai-water.com.cn/xwzx/jtxw/content_71670',linkLabel:'官方項目介紹',
    sources:[{title:'珠海水控集團：萬雪匯項目介紹',url:'https://www.zhuhai-water.com.cn/xwzx/jtxw/content_71670'},{title:'Klook：雪場、裝備及地址資訊',url:'https://www.klook.com/zh-HK/activity/178057-zhuhai-snow-haven/'}],verified:'2026-10-14',
    klook:{url:'https://www.klook.com/zh-HK/activity/178057-zhuhai-snow-haven/',label:'萬雪匯滑雪／娛雪票',verified:'2026-10-14'},
  },
  {
    id: 'shenzhen-huafa', name: '深圳前海冰雪世界', localName: '華發冰雪熱雪奇蹟', country: '中國內地', region: '深圳', type: '室內真雪',
    klook:{url:'https://www.klook.com/zh-HK/activity/171780-shenzhen-huafa-snow-bonski/',label:'前海冰雪世界票券',verified:'2026-10-14'},
    summary: '把雪旅放進週末。寶安的室內造雪雪場，設有不同難度的滑雪道。',
    address: '深圳市寶安區沙井南環路，前海冰雪世界',
    access: '先安排香港往深圳的過關與市內交通，再用地圖確認場館入口。跨境接駁的班次與上車點請向營運方查詢。',
    highlights: ['室內造雪環境', '五條專業雪道', '不同難度雪道與地形公園'],
    planning: '確認購買的是滑雪票而非嬉雪票，並核對可使用的雪道、入場時段與裝備安排。',
    url: 'https://wtl.sz.gov.cn/lyfw/lyxw/content/post_12878762.html', linkLabel: '官方文旅介紹',
    sources: [{title:'深圳市文化廣電旅遊體育局：前海冰雪世界',url:'https://wtl.sz.gov.cn/lyfw/lyxw/content/post_12878762.html'},{title:'深圳市政府：雪道與設施介紹',url:'https://www.sz.gov.cn/cn/xxgk/zfxxgj/tpxw/content/post_12420795.html'},{title:'高德地圖：地址',url:'https://amap.com/place/B0LA5ZQDSF'}], verified: '2026-10-14',
  },
  {
    id: 'guangzhou-bonski', name: '廣州熱雪奇蹟', localName: '广州热雪奇迹', country: '中國內地', region: '廣州', type: '室內真雪',
    klook:{url:'https://www.klook.com/zh-HK/activity/23416-sunac-snow-park-admission-ticket-guang-zhou/',label:'廣州熱雪奇蹟票券',verified:'2026-10-14'},
    summary: '花都的室內雪場，讓兩次日本雪旅之間，也能安排自己的滑行日。',
    address: '廣州市花都區鳳凰北路63號，廣州融創茂內',
    access: '先安排香港往廣州／花都的交通，再確認融創茂及雪場入口。將來回交通與入場時段一起排進行程。',
    highlights: ['室內造雪環境', '五條不同難度雪道', '滑雪區與娛雪區分開'],
    planning: '按自己要滑的雪道核對票種、時段及租借裝備；不要把娛雪區門票當作滑雪票。',
    url: 'https://www.sunac.com.cn/product.aspx?tid=2&type=15', linkLabel: '營運方介紹',
    sources: [{title:'融創文旅：熱雪奇蹟',url:'https://www.sunac.com.cn/product.aspx?tid=2&type=15'},{title:'廣州市體育局：雪場與雪道',url:'https://tyj.gz.gov.cn/bmzc/jckx/content/post_10173019.html'},{title:'國家體育總局冬運中心：場館地址',url:'https://www.sport.gov.cn/dyzx/n5169/c29729161/content.html'}], verified: '2026-10-14',
  },
  {
    id: 'niseko-grand-hirafu', name: '二世古 Grand Hirafu', localName: 'ニセコ東急 グラン・ヒラフ', country: '日本', region: '北海道', type: '戶外雪場',
    klook:{url:'https://www.klook.com/zh-HK/activity/131157-niseko-united-all-mountain-pass/',label:'二世古纜車票／裝備',verified:'2026-10-14'},
    summary: '羊蹄山前的滑行，接著是 Hirafu 小鎮的夜晚。雪場與住宿街區相鄰。',
    address: '北海道虻田郡倶知安町ニセコひらふ1条2丁目9-1',
    access: '先確認抵達北海道的航班，再安排前往 Hirafu 的交通。冬季有二世古及 Hirafu 區域巴士，班次依當季公告。',
    highlights: ['初級至上級雪道', 'Hirafu 小鎮相鄰', '冬季夜滑安排'],
    planning: '安排住宿時確認離纜車或巴士站的距離；夜滑日期及可滑區域依當季公告。',
    url: 'https://www.grand-hirafu.jp/snow/', linkLabel: '雪場官方網站',
    sources: [{title:'Grand Hirafu 官方冬季資訊',url:'https://www.grand-hirafu.jp/snow/'}], verified: '2026-10-14',
  },
  {
    id: 'hakuba-goryu', name: '白馬五竜', localName: 'エイブル白馬五竜', country: '日本', region: '長野・白馬', type: '戶外雪場',
    klook:{url:'https://www.klook.com/zh-HK/activity/82217-able-hakuba-goryu-hakuba47-ski-nagano/',label:'白馬五竜＆47纜車票',verified:'2026-10-14'},
    summary: '從山麓到 Alps 平，安排自己的白馬滑行節奏。山上與 Hakuba47 相連。',
    address: '長野縣北安曇郡白馬村神城22184-10（Escal Plaza）',
    access: '可經長野站轉往白馬五竜的巴士，或經 JR 神城站安排接駁。雪季接駁路線與時間請查看官方交通頁。',
    highlights: ['山麓與高山滑行區', '與 Hakuba47 山上相連', 'Escal Plaza 山麓設施'],
    planning: '白馬五竜有不同山麓入口，集合時寫清楚是 Escal Plaza 還是 Iimori；跨雪場滑行前確認纜車及雪道開放。',
    url: 'https://www.hakubaescal.com/winter/', linkLabel: '雪場官方網站',
    sources: [{title:'白馬五竜官方雪場資訊',url:'https://www.hakubaescal.com/winter/gelande/'},{title:'白馬五竜官方交通',url:'https://www.hakubaescal.com/winter/access/'}], verified: '2026-10-14',
  },
  {
    id: 'tsugaike', name: '栂池高原', localName: 'つがいけマウンテンリゾート', country: '日本', region: '長野・白馬', type: '戶外雪場',
    klook:{url:'https://www.klook.com/zh-HK/activity/134928-tsugaike-kogen-ski-resort-lift-ticket-gear-clothing-rental/',label:'栂池纜車票／裝備',verified:'2026-10-14'},
    summary: '以栂池高原作為雪旅據點，和同伴一起安排白馬山區的滑行日。',
    address: '長野縣北安曇郡小谷村栂池高原',
    access: '查看當季前往栂池高原的巴士或自駕路線。官方常見問題列有 VILLAGE TSUGAIKE 前的接駁站資訊。',
    highlights: ['白馬山區雪場', '栂池高原住宿區', '冬季區域接駁'],
    planning: '官方首頁會隨季節切換；出發前確認已查看冬季雪道、纜車及巴士公告。',
    url: 'https://www.tsugaike.gr.jp/', linkLabel: '雪場官方網站',
    sources: [{title:'栂池官方網站',url:'https://www.tsugaike.gr.jp/'},{title:'官方常見問題與接駁站',url:'https://www.tsugaike.gr.jp/faq'},{title:'官方位置資訊',url:'https://www.tsugaike.gr.jp/green/access'}], verified: '2026-10-14',
  },
  {
    id: 'nozawa-onsen', name: '野澤溫泉', localName: '野沢温泉スキー場', country: '日本', region: '長野・野澤', type: '戶外雪場',
    klook:{url:'https://www.klook.com/zh-HK/activity/136277-nozawa-onsen-ski-resort-lift-ticket/',label:'野澤溫泉纜車票',note:'核對時此票券頁顯示暫停提供；請查看當季方案。',verified:'2026-10-14'},
    summary: '雪道上的白天，溫泉村裡的晚上。把滑行與休息一起排進雪旅。',
    address: '長野縣下高井郡野澤溫泉村',
    access: '可經北陸新幹線飯山站，轉乘往野澤溫泉的巴士。村內往雪場接駁另有當季安排。',
    highlights: ['長坂纜車', '溫泉村住宿', '冬季雪道與公園'],
    planning: '住宿到雪場入口的路線要一起確認；把休息日與同伴集合地點寫進自己的行程。',
    url: 'https://nozawaski.com/winter/', linkLabel: '雪場官方網站',
    sources: [{title:'野澤溫泉官方冬季資訊',url:'https://nozawaski.com/winter/'},{title:'官方電車與巴士交通',url:'https://nozawaski.com/winter/access/train-bus/'}], verified: '2026-10-14',
  },
  {
    id: 'gala-yuzawa', name: 'GALA 湯澤', localName: 'ガーラ湯沢', country: '日本', region: '新潟・湯澤', type: '戶外雪場',
    klook:{url:'https://www.klook.com/zh-HK/activity/99585-everyone-beginners-experts-adults-children-enjoy-playing-snow/',label:'GALA 湯澤纜車票／裝備',note:'核對時此票券頁顯示暫停提供；請查看當季方案。',verified:'2026-10-14'},
    summary: '新幹線與雪旅接在一起。GALA 湯澤站連接山麓設施，方便安排滑行日。',
    address: '新潟縣南魚沼郡湯澤町湯澤茅平1039-2',
    access: '冬季可乘上越新幹線到 GALA 湯澤站，或在越後湯澤站轉接駁。先核對列車及雪場當日是否營運。',
    highlights: ['新幹線車站相連', '中央與北區雪道', '湯澤區域接駁'],
    planning: '若安排東京即日來回，先記下去程、回程與最後纜車時間；列車班次不會由 Snowlog 自動預訂。',
    url: 'https://gala.co.jp/winter/', linkLabel: '雪場官方網站',
    sources: [{title:'GALA 官方冬季網站',url:'https://gala.co.jp/winter/'},{title:'官方雪道介紹',url:'https://gala.co.jp/winter/gelande/'},{title:'新潟官方觀光：位置與交通',url:'https://niigata-kankou.or.jp/experience/10692'}], verified: '2026-10-14',
  },
  {
    id: 'naeba', name: '苗場', localName: '苗場スキー場', country: '日本', region: '新潟・湯澤', type: '戶外雪場',
    klook:{url:'https://www.klook.com/zh-HK/activity/190711-from-shinjuku-naeba-ski-day-trip-w-6-hour-lift-pass-optional-gear/',label:'苗場雪票＋新宿往返巴士',verified:'2026-10-14'},
    summary: '以山麓酒店作為據點，安排苗場與同伴的多日雪旅。',
    address: '新潟縣南魚沼郡湯澤町三國202',
    access: '先安排前往越後湯澤，再核對到苗場的巴士或酒店接駁。自駕請查看官方冬季道路資訊。',
    highlights: ['山麓酒店', '多種難度雪道', 'Dragondola 區域連接'],
    planning: '跨往其他滑行區域前核對連接纜車、票種及回程時間；把每天想滑的區域分開安排。',
    url: 'https://www.princehotels.co.jp/ski/naeba/winter/', linkLabel: '雪場官方網站',
    sources: [{title:'苗場官方雪場資訊與交通',url:'https://www.princehotels.co.jp/ski/naeba/winter/'},{title:'官方雪道圖與地址',url:'https://www.princehotels.co.jp/file.jsp?id=205769'}], verified: '2026-10-14',
  },
  {
    id: 'appi-kogen', name: '安比高原', localName: '安比高原スキー場', country: '日本', region: '東北・岩手', type: '戶外雪場',
    summary: '往東北出發，在安比高原安排自己的冬季山上日常。',
    address: '岩手縣八幡平市安比高原117-1',
    access: '可經盛岡等交通樞紐安排冬季巴士。部分接駁需要預約，請先查看官方冬季交通頁。',
    highlights: ['東北山區雪場', '冬季纜車與雪道', '度假區住宿'],
    planning: '把抵達交通、住宿及接駁預約一併列入待辦；雪道開放情況以當日官方資訊為準。',
    url: 'https://www.appi.co.jp/experience/white-season/', linkLabel: '雪場官方網站',
    sources: [{title:'安比高原官方冬季資訊',url:'https://www.appi.co.jp/experience/white-season/'},{title:'官方冬季交通與地址',url:'https://www.appi.co.jp/access-winter/'}], verified: '2026-10-14',
  },
];

export function resortTripDraft(resort: Resort) {
  return {title: `${resort.name}雪旅`, resort: resort.name, itinerary: `${resort.linkLabel}：${resort.url}\n${resort.klook?`Klook（${resort.klook.label}）：${resort.klook.url}\n${resort.klook.note?resort.klook.note+'\n':''}`:''}\n每日安排：\n`, todos: []};
}
