export type GameId =
  | 'night-market-rush' | 'pinball-duel' | 'ring-toss' | 'neon-wiring' | 'bumper-alley' | 'hopscotch-king'
  | 'oyster-omelet' | 'braised-bites' | 'bubble-tea-shake' | 'alley-delivery' | 'claw-master' | 'fishball-skewer'
  | 'mahjong-match' | 'alley-skater' | 'temple-drums' | 'night-market-tycoon' | 'mole-market' | 'sausage-chef'
  | 'planter-bowler' | 'balloon-shooter' | 'rain-dash' | 'sparrow-rhythm' | 'night-market-puzzle' | 'change-maker'
  | 'sign-match' | 'tile-runner' | 'shrimp-fishing' | 'lucky-wheel' | 'stall-defense' | 'old-ma-adventure';

export type GameAction = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'ACTION' | 'A' | 'S' | 'D' | 'F' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type GameCategory = '反應與服務' | '精準與物理' | '解謎' | '競速與移動' | '節奏與記憶' | '經營與冒險';
export type GameSpec = {
  id: GameId;
  title: string;
  tagline: string;
  controls: string;
  color: string;
  symbol: string;
  category: GameCategory;
  batch: 1 | 2 | 3 | 4 | 5;
  multiplayer: boolean;
  singleSeconds: number;
  actions: Array<{ action: GameAction; label: string }>;
  available: boolean;
};

const rows: Omit<GameSpec, 'available'>[] = [
  { id:'night-market-rush', title:'夜市快手', tagline:'照訂單出餐，手腳要快！', controls:'依序按訂單上的食材鍵', color:'#ffb02e', symbol:'麵', category:'反應與服務', batch:1, multiplayer:true, singleSeconds:45, actions:[{action:'A',label:'麵'},{action:'S',label:'蛋'},{action:'D',label:'菜'}] },
  { id:'pinball-duel', title:'彈珠台對戰', tagline:'左右打彈板，把彈珠留在台上！', controls:'左右控制彈板，空白鍵發射', color:'#68d6c0', symbol:'彈', category:'精準與物理', batch:1, multiplayer:true, singleSeconds:45, actions:[{action:'LEFT',label:'左彈板'},{action:'ACTION',label:'發射'},{action:'RIGHT',label:'右彈板'}] },
  { id:'ring-toss', title:'套圈擂台', tagline:'瞄準獎品，掌握套圈時機！', controls:'左右瞄準，空白鍵投擲', color:'#f97570', symbol:'圈', category:'精準與物理', batch:1, multiplayer:true, singleSeconds:40, actions:[{action:'LEFT',label:'左瞄'},{action:'ACTION',label:'投圈'},{action:'RIGHT',label:'右瞄'}] },
  { id:'neon-wiring', title:'霓虹接電線', tagline:'旋轉線路，讓招牌重新亮起！', controls:'左右選線路，空白鍵旋轉', color:'#7ce4dc', symbol:'電', category:'解謎', batch:1, multiplayer:true, singleSeconds:60, actions:[{action:'LEFT',label:'選左線'},{action:'ACTION',label:'旋轉'},{action:'RIGHT',label:'選右線'}] },
  { id:'bumper-alley', title:'巷口碰碰車', tagline:'閃避障礙，搶收夜市代幣！', controls:'方向鍵移動，空白鍵衝刺', color:'#77b5ff', symbol:'車', category:'競速與移動', batch:1, multiplayer:true, singleSeconds:45, actions:[{action:'LEFT',label:'左'},{action:'UP',label:'上'},{action:'ACTION',label:'衝刺'},{action:'DOWN',label:'下'},{action:'RIGHT',label:'右'}] },
  { id:'hopscotch-king', title:'跳格王', tagline:'記住節奏，踩中指定方向！', controls:'按提示方向鍵跳格', color:'#f3d264', symbol:'跳', category:'節奏與記憶', batch:1, multiplayer:true, singleSeconds:45, actions:[{action:'LEFT',label:'←'},{action:'UP',label:'↑'},{action:'DOWN',label:'↓'},{action:'RIGHT',label:'→'}] },
  { id:'oyster-omelet', title:'蚵仔煎翻鍋', tagline:'看火候翻面，煎出金黃酥脆！', controls:'火候進入綠色區時按空白鍵', color:'#f1a85b', symbol:'煎', category:'經營與冒險', batch:2, multiplayer:false, singleSeconds:35, actions:[{action:'ACTION',label:'翻面'}] },
  { id:'braised-bites', title:'滷味夾夾樂', tagline:'看訂單，夾對每一樣滷味！', controls:'依序按 A、S、D 選食材', color:'#9fce74', symbol:'滷', category:'反應與服務', batch:2, multiplayer:false, singleSeconds:40, actions:[{action:'A',label:'蘿蔔'},{action:'S',label:'豆干'},{action:'D',label:'米血'}] },
  { id:'bubble-tea-shake', title:'珍奶搖搖樂', tagline:'左右交替，搖出完美珍珠奶茶！', controls:'左右交替按鍵累積搖勁', color:'#bca0ed', symbol:'茶', category:'節奏與記憶', batch:2, multiplayer:false, singleSeconds:35, actions:[{action:'LEFT',label:'左搖'},{action:'RIGHT',label:'右搖'}] },
  { id:'alley-delivery', title:'夜市送餐王', tagline:'沿著指定路線把餐點送到客人手上！', controls:'依序按方向鍵通過巷口', color:'#f18b59', symbol:'送', category:'競速與移動', batch:2, multiplayer:false, singleSeconds:50, actions:[{action:'LEFT',label:'←'},{action:'UP',label:'↑'},{action:'DOWN',label:'↓'},{action:'RIGHT',label:'→'}] },
  { id:'claw-master', title:'夾娃娃高手', tagline:'移動夾爪，對準目標再抓取！', controls:'左右移動，空白鍵下降夾取', color:'#ed93ce', symbol:'夾', category:'經營與冒險', batch:3, multiplayer:false, singleSeconds:40, actions:[{action:'LEFT',label:'左移'},{action:'ACTION',label:'抓取'},{action:'RIGHT',label:'右移'}] },
  { id:'fishball-skewer', title:'魚丸串串', tagline:'照著客人的順序串起魚丸！', controls:'依序按 A、S、D 串食材', color:'#ffe08d', symbol:'丸', category:'反應與服務', batch:3, multiplayer:false, singleSeconds:35, actions:[{action:'A',label:'魚丸'},{action:'S',label:'香菇'},{action:'D',label:'青菜'}] },
  { id:'mahjong-match', title:'麻將配對', tagline:'翻開牌面，找出兩組相同的麻將！', controls:'按 A、S、D、F 翻牌；再按空白鍵確認', color:'#7cc9a4', symbol:'麻', category:'解謎', batch:2, multiplayer:false, singleSeconds:55, actions:[{action:'A',label:'牌一'},{action:'S',label:'牌二'},{action:'D',label:'牌三'},{action:'F',label:'牌四'},{action:'ACTION',label:'配對'}] },
  { id:'alley-skater', title:'巷弄滑板', tagline:'跳過路障，在巷子裡一路滑行！', controls:'上跳、下蹲、左右閃避', color:'#e77d62', symbol:'板', category:'競速與移動', batch:3, multiplayer:false, singleSeconds:45, actions:[{action:'LEFT',label:'左閃'},{action:'UP',label:'跳'},{action:'DOWN',label:'蹲'},{action:'RIGHT',label:'右閃'}] },
  { id:'temple-drums', title:'廟口鼓陣', tagline:'跟著鼓點節拍，敲出最熱鬧陣頭！', controls:'依序按方向鍵打鼓', color:'#df6c55', symbol:'鼓', category:'節奏與記憶', batch:3, multiplayer:false, singleSeconds:45, actions:[{action:'LEFT',label:'左鼓'},{action:'UP',label:'大鼓'},{action:'DOWN',label:'小鼓'},{action:'RIGHT',label:'右鼓'}] },
  { id:'night-market-tycoon', title:'夜市攤位大亨', tagline:'看訂單補貨，撐過晚餐尖峰！', controls:'A 備麵、S 備湯、D 備料', color:'#d38f54', symbol:'店', category:'經營與冒險', batch:4, multiplayer:false, singleSeconds:50, actions:[{action:'A',label:'備麵'},{action:'S',label:'備湯'},{action:'D',label:'備料'}] },
  { id:'mole-market', title:'夜市打地鼠', tagline:'看清楚洞口，快速敲中地鼠！', controls:'按 A、S、D 敲左、中、右洞', color:'#bd9666', symbol:'鼠', category:'反應與服務', batch:4, multiplayer:false, singleSeconds:35, actions:[{action:'A',label:'左洞'},{action:'S',label:'中洞'},{action:'D',label:'右洞'}] },
  { id:'sausage-chef', title:'烤香腸大師', tagline:'香腸烤到金黃時快點翻面！', controls:'熟度進入綠色區時翻面', color:'#f08059', symbol:'烤', category:'反應與服務', batch:5, multiplayer:false, singleSeconds:35, actions:[{action:'ACTION',label:'翻面'}] },
  { id:'planter-bowler', title:'盆栽投球', tagline:'瞄準盆栽塔，控制力道擊倒它！', controls:'左右瞄準，空白鍵投球', color:'#82bc7a', symbol:'球', category:'精準與物理', batch:2, multiplayer:false, singleSeconds:40, actions:[{action:'LEFT',label:'左瞄'},{action:'ACTION',label:'投球'},{action:'RIGHT',label:'右瞄'}] },
  { id:'balloon-shooter', title:'氣球射手', tagline:'移動準星，射中正在飄動的氣球！', controls:'方向鍵移動準星，空白鍵射擊', color:'#ff7096', symbol:'氣', category:'精準與物理', batch:4, multiplayer:false, singleSeconds:40, actions:[{action:'LEFT',label:'左'},{action:'UP',label:'上'},{action:'ACTION',label:'射擊'},{action:'DOWN',label:'下'},{action:'RIGHT',label:'右'}] },
  { id:'rain-dash', title:'避雨衝刺', tagline:'在巷弄間閃躲水窪與穿梭車流！', controls:'左右切換巷道閃避障礙', color:'#79aee8', symbol:'雨', category:'競速與移動', batch:4, multiplayer:false, singleSeconds:45, actions:[{action:'LEFT',label:'左巷'},{action:'RIGHT',label:'右巷'}] },
  { id:'sparrow-rhythm', title:'麻雀節奏追逐', tagline:'踩著節拍躲開追逐，順手撿米粒！', controls:'依節拍按方向鍵追逐與閃避', color:'#dab269', symbol:'雀', category:'節奏與記憶', batch:4, multiplayer:false, singleSeconds:45, actions:[{action:'LEFT',label:'左'},{action:'UP',label:'上'},{action:'DOWN',label:'下'},{action:'RIGHT',label:'右'}] },
  { id:'night-market-puzzle', title:'夜市拼圖', tagline:'滑動磁磚，拼回熟悉的夜市招牌！', controls:'左右移動空格，空白鍵放置', color:'#a99ad9', symbol:'拼', category:'解謎', batch:3, multiplayer:false, singleSeconds:60, actions:[{action:'LEFT',label:'左移'},{action:'ACTION',label:'放置'},{action:'RIGHT',label:'右移'}] },
  { id:'change-maker', title:'找零快算', tagline:'算出正確找零，別讓客人久等！', controls:'輸入數字後按空白鍵送出', color:'#6ec9a1', symbol:'錢', category:'解謎', batch:4, multiplayer:false, singleSeconds:50, actions:[{action:'1',label:'1'},{action:'2',label:'2'},{action:'3',label:'3'},{action:'4',label:'4'},{action:'5',label:'5'},{action:'6',label:'6'},{action:'7',label:'7'},{action:'8',label:'8'},{action:'9',label:'9'},{action:'0',label:'0'},{action:'ACTION',label:'送出'}] },
  { id:'sign-match', title:'招牌消消樂', tagline:'交換相鄰燈牌，連成三個相同圖案！', controls:'左右選擇，空白鍵交換', color:'#ff8881', symbol:'消', category:'解謎', batch:5, multiplayer:false, singleSeconds:55, actions:[{action:'LEFT',label:'左選'},{action:'ACTION',label:'交換'},{action:'RIGHT',label:'右選'}] },
  { id:'tile-runner', title:'磁磚跑酷', tagline:'抓準跳躍節奏，跨過屋頂缺口！', controls:'空白鍵跳過缺口', color:'#d99061', symbol:'跑', category:'競速與移動', batch:5, multiplayer:false, singleSeconds:45, actions:[{action:'ACTION',label:'跳躍'}] },
  { id:'shrimp-fishing', title:'夜市釣蝦場', tagline:'等浮標亮起，立刻起竿！', controls:'空白鍵放餌及起竿', color:'#f28f70', symbol:'蝦', category:'精準與物理', batch:3, multiplayer:false, singleSeconds:45, actions:[{action:'ACTION',label:'放餌 / 起竿'}] },
  { id:'lucky-wheel', title:'轉盤抽獎王', tagline:'轉盤到達獎區時按下停止！', controls:'空白鍵停下轉盤', color:'#f3cd5a', symbol:'轉', category:'節奏與記憶', batch:5, multiplayer:false, singleSeconds:35, actions:[{action:'ACTION',label:'停輪'}] },
  { id:'stall-defense', title:'守住麵攤', tagline:'在敵人抵達前，把防禦物放到正確巷道！', controls:'按 1、2、3 在不同巷道設置防禦', color:'#86c278', symbol:'守', category:'經營與冒險', batch:5, multiplayer:false, singleSeconds:55, actions:[{action:'1',label:'左巷'},{action:'2',label:'中巷'},{action:'3',label:'右巷'}] },
  { id:'old-ma-adventure', title:'老馬大冒險', tagline:'跳過路障，收集食材回到麵攤！', controls:'左右移動，空白鍵跳躍', color:'#edac58', symbol:'馬', category:'經營與冒險', batch:5, multiplayer:false, singleSeconds:60, actions:[{action:'LEFT',label:'左'},{action:'ACTION',label:'跳躍'},{action:'RIGHT',label:'右'}] },
];

const releaseBatch = Math.max(1, Math.min(5, Number(import.meta.env?.VITE_RELEASE_BATCH ?? 5)));
export const games: GameSpec[] = rows.map((game) => ({ ...game, available: game.batch <= releaseBatch }));
export const firstBatch = games.filter((game) => game.batch === 1);
export const multiplayerGames = games.filter((game) => game.multiplayer);
export const gameById = (id: string) => games.find((game) => game.id === id);
