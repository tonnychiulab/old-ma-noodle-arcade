const games = [
  ['夜市快手','限時接單、配餐出餐，和朋友比誰送得快。','🍜','多人競速'],
  ['彈珠台對戰','控制左右彈板，把彈珠打進高分區。','🎱','多人對戰'],
  ['套圈擂台','抓準角度與力道投出套圈，搶下稀有獎品。','⭕','多人對戰'],
  ['霓虹接電線','轉動線路接通電路，讓夜市招牌重新亮起來。','💡','解謎'],
  ['巷口碰碰車','在巷弄裡閃躲碰撞，努力撐到最後。','🚗','多人競速'],
  ['跳格王','跟著節拍踩中格子，失誤就會掉隊。','🟨','多人競速'],
  ['蚵仔煎翻鍋','掌握煎台火候，在恰好的時機翻面起鍋。','🍳','節奏'],
  ['滷味夾夾樂','看清訂單，快速夾出正確的滷味食材。','🥢','手眼協調'],
  ['珍奶搖搖樂','拿捏搖杯節拍與力道，做出剛好的口感。','🧋','節奏'],
  ['夜市送餐王','穿越熱鬧巷弄，在時間內把餐點送到客人手上。','🛵','閃避跑酷'],
  ['夾娃娃高手','移動爪子、抓準下降時機，把娃娃夾出來。','🧸','時機挑戰'],
  ['魚丸串串','依照指定順序串起魚丸與配料，別讓訂單等太久。','🍡','反應挑戰'],
  ['麻將配對','翻開牌面，找出相同的麻將完成配對。','🀄','記憶配對'],
  ['巷弄滑板','沿路閃過路障、收集道具，挑戰最遠距離。','🛹','閃避跑酷'],
  ['廟口鼓陣','看準鼓點節奏敲擊，連續命中累積高分。','🥁','節奏'],
  ['夜市攤位大亨','看訂單補貨，撐過夜市晚餐尖峰。','🍲','策略經營'],
  ['夜市打地鼠','地鼠冒出來就快手敲下，別打到不該打的目標。','🔨','反應挑戰'],
  ['烤香腸大師','適時翻面掌控火候，烤香腸也不能烤焦。','🌭','時機挑戰'],
  ['盆栽投球','調好投球方向和力道，一球擊倒街頭目標。','⚾','瞄準技巧'],
  ['氣球射手','移動準星，射中正在飄動的氣球。','🎈','多人競速'],
  ['避雨衝刺','在雨中穿梭騎樓，避開水窪與迎面而來的障礙。','☔','閃避跑酷'],
  ['麻雀節奏追逐','踩著節拍躲開追逐，順手撿米粒。','🐦','節奏'],
  ['夜市拼圖','移動拼圖片，在倒數結束前拼出夜市街景。','🧩','解謎'],
  ['找零快算','快速算出正確找零，考驗你的夜市心算速度。','🪙','腦力挑戰'],
  ['招牌消消樂','交換相鄰招牌圖示，連成一線完成消除目標。','✨','益智消除'],
  ['磁磚跑酷','在屋頂與巷道間跳躍，躲開缺口一路向前。','🏃','閃避跑酷'],
  ['夜市釣蝦場','放餌、等待、看準時機起竿，釣起大尾泰國蝦。','🦐','時機挑戰'],
  ['轉盤抽獎王','抓準停輪時機，挑戰連續命中幸運獎項。','🎯','時機挑戰'],
  ['守住麵攤','運用手邊工具和食材，守住攤位一波又一波。','🍜','塔防策略'],
  ['老馬大冒險','一路闖關收集食材，平安回到麵攤。','🧢','平台冒險'],
].map(([title, description, icon, tag], i) => ({ title, description, icon, tag, no: String(i + 1).padStart(2, '0') }));

const palettes = [
  ['#172f3b','#fd9b4a','#ffd166'], ['#222849','#f15b50','#76d6cf'], ['#3a2741','#f7b955','#fb6f73'],
  ['#143f50','#e6c45d','#ff6b6b'], ['#302b44','#62c6b8','#ff955c'], ['#273452','#f4cb62','#ec6c56'],
];

function preview(game: typeof games[number], i: number) {
  const [sky, neon, warm] = palettes[i % palettes.length];
  const skyline = [0,1,2,3,4,5,6].map((n) => `<rect x="${n*58-5}" y="${78-(n*13%42)}" width="50" height="94" fill="${n%2? '#182b39':'#213447'}"/><path d="M${n*58+8} ${92-(n*13%40)}h5v7h-5zm14 0h5v7h-5zm-14 15h5v7h-5zm14 0h5v7h-5z" fill="${neon}" opacity=".7"/>`).join('');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 236"><defs><pattern id="p" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8V0H8" fill="none" stroke="#fff" stroke-opacity=".045"/></pattern></defs><rect width="420" height="236" fill="${sky}"/>${skyline}<rect y="164" width="420" height="72" fill="#171b2b"/><path d="M0 168h420" stroke="${neon}" stroke-width="3"/><path d="M0 188h420" stroke="#f5bb55" stroke-width="2" stroke-dasharray="25 15" opacity=".6"/><rect x="244" y="112" width="144" height="55" rx="4" fill="#803e46"/><path d="M234 113h164l-14-20h-137z" fill="${warm}"/><path d="M245 120h142v7H245z" fill="#fff0bd" opacity=".8"/><text x="316" y="108" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="900" fill="#fff7d6">老馬麵攤</text><circle cx="93" cy="134" r="26" fill="${warm}"/><path d="M71 130q21-37 45-3v13H71z" fill="#21313b"/><rect x="77" y="150" width="32" height="26" rx="7" fill="${neon}"/><text x="93" y="144" text-anchor="middle" font-size="23">${game.icon}</text><rect width="420" height="236" fill="url(#p)"/><rect x="12" y="12" width="75" height="25" rx="3" fill="#111521" opacity=".8"/><text x="20" y="29" font-family="monospace" font-size="12" font-weight="bold" fill="#ffe18d">STAGE ${game.no}</text><rect x="300" y="12" width="108" height="25" rx="3" fill="#111521" opacity=".8"/><text x="354" y="29" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#fff">SCORE 0${i*7+8}</text><rect x="0.5" y="0.5" width="419" height="235" fill="none" stroke="#fff" stroke-opacity=".22"/><rect x="0" y="220" width="420" height="16" fill="#141726"/><text x="210" y="232" text-anchor="middle" font-family="monospace" font-size="9" letter-spacing="3" fill="#f8cc62">OLD MA NOODLE ARCADE · ${game.no}</text></svg>`)}`;
}

const style = document.createElement('style');
style.textContent = `
  #game-catalog{--ink:#f7edda;--muted:#b9ad9b;--gold:#ffc65c;position:fixed;z-index:99999;inset:0;overflow:auto;background:#151620;color:var(--ink);font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif;line-height:1.6}
  #game-catalog *{box-sizing:border-box} #game-catalog a{color:inherit;text-decoration:none} #game-catalog .wrap{width:min(1160px,calc(100% - 36px));margin:auto}
  #game-catalog .top{height:74px;border-bottom:1px solid #ffffff1b;display:flex;align-items:center;justify-content:space-between}
  #game-catalog .brand{font-weight:900;letter-spacing:.08em} #game-catalog .brand b{color:var(--gold)}
  #game-catalog .top a{font-size:14px;color:#1d1b1a;background:var(--gold);padding:10px 20px;border-radius:6px;font-weight:900}
  #game-catalog .hero{padding:64px 0 48px;display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:42px}
  #game-catalog .eyebrow{color:var(--gold);font:700 12px/1.4 ui-monospace,monospace;letter-spacing:.2em}
  #game-catalog h1{font-size:clamp(38px,6vw,68px);line-height:1.08;letter-spacing:-.05em;margin:15px 0 18px}
  #game-catalog h1 span{color:var(--gold)} #game-catalog .lead{color:#c4b9a8;font-size:16px;max-width:490px;margin:0 0 25px}
  #game-catalog .actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  #game-catalog .play{display:inline-flex;align-items:center;gap:10px;padding:13px 22px;background:var(--gold);color:#241d15!important;border-radius:6px;font-weight:900;box-shadow:0 5px 0 #ad7532}
  #game-catalog .sub{font-size:12px;color:#aaa091}
  #game-catalog .hero-art{width:100%;border:1px solid #ffffff2c;border-radius:10px;box-shadow:0 18px 50px #0008;transform:rotate(1deg)}
  #game-catalog .marquee{border-block:1px solid #ffffff1c;padding:12px 0;color:#d7cbb9;font:700 11px ui-monospace,monospace;letter-spacing:.2em;white-space:nowrap;overflow:hidden;text-align:center}
  #game-catalog .section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:48px 0 20px}
  #game-catalog h2{font-size:30px;line-height:1.2;margin:0;letter-spacing:-.03em} #game-catalog .section-head p{margin:7px 0 0;color:var(--muted);font-size:13px}
  #game-catalog .count{font:700 12px ui-monospace,monospace;color:var(--gold)}
  #game-catalog .filters{display:flex;gap:8px;overflow:auto;padding:2px 0 17px;scrollbar-width:thin}
  #game-catalog .filter{white-space:nowrap;border:1px solid #ffffff27;color:#d8cdbb;background:#ffffff08;border-radius:99px;padding:7px 13px;font:600 12px system-ui;cursor:pointer}
  #game-catalog .filter.active{background:var(--gold);border-color:var(--gold);color:#201912}
  #game-catalog .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding-bottom:60px}
  #game-catalog .card{overflow:hidden;border:1px solid #ffffff20;border-radius:8px;background:#1c1d28;transition:transform .18s,border-color .18s}
  #game-catalog .card:hover{transform:translateY(-4px);border-color:#ffc65c99}
  #game-catalog .shot{position:relative;display:block;aspect-ratio:420/236;background:#202c3b;overflow:hidden}
  #game-catalog .shot img{width:100%;height:100%;object-fit:cover;display:block;image-rendering:pixelated}
  #game-catalog .badge{position:absolute;top:10px;right:10px;background:#151620d9;border:1px solid #ffffff31;color:#ffe19a;padding:4px 8px;border-radius:3px;font:700 10px ui-monospace,monospace}
  #game-catalog .copy{padding:13px 15px 16px}.titleline{display:flex;align-items:center;gap:9px}.titleline .icon{font-size:21px}
  #game-catalog h3{font-size:16px;margin:0;font-weight:850}.desc{font-size:12px;line-height:1.65;color:#bfb4a5;margin:7px 0 12px;min-height:40px}
  #game-catalog .cardfoot{display:flex;justify-content:space-between;align-items:center;color:#938a7f;font:10px ui-monospace,monospace}
  #game-catalog .start-link{color:#e7c97f!important;font-weight:800;white-space:nowrap}
  #game-catalog footer{border-top:1px solid #ffffff1a;text-align:center;padding:24px 0 34px;color:#9b9287;font-size:11px;letter-spacing:.04em}
  @media(max-width:760px){#game-catalog .hero{grid-template-columns:1fr;padding:43px 0 32px;gap:26px}#game-catalog .hero-art{max-width:620px}#game-catalog .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#game-catalog .section-head{margin-top:35px}}
  @media(max-width:430px){#game-catalog .wrap{width:calc(100% - 24px)}#game-catalog .top{height:62px}#game-catalog .brand{font-size:13px}#game-catalog .top a{padding:8px 13px;font-size:12px}#game-catalog .grid{grid-template-columns:1fr}#game-catalog .desc{min-height:0}#game-catalog .copy{padding:12px 13px}#game-catalog h2{font-size:25px}}
`;
document.head.append(style);

if (new URLSearchParams(location.search).has('play')) {
  // The catalog's play links open the original arcade selector.
} else {
  const catalog = document.createElement('main');
  catalog.id = 'game-catalog';
  catalog.innerHTML = `<header class="wrap top"><div class="brand">老馬麵攤 <b>ARCADE</b></div><a href="?play=1">立即玩　↗</a></header>
    <section class="wrap hero"><div><div class="eyebrow">TAIWAN NIGHT MARKET · 30 IN 1</div><h1>巷口的遊戲，<br><span>今晚玩個夠。</span></h1><p class="lead">從夜市攤位到廟口巷弄，30 款復古街機小遊戲一次收藏。找朋友競速、挑戰手速，或自己來一場懷舊冒險。</p><div class="actions"><a class="play" href="?play=1">▶　立即玩</a><span class="sub">手機觸控・電腦鍵盤・打開就能玩</span></div></div><img class="hero-art" alt="像素風夜市街景遊戲畫面" src="${preview(games[0],0)}"></section>
    <div class="marquee">✦　老馬麵攤製作　　✦　30 款夜市街機　　✦　支援手機與電腦　　✦　今晚一起來玩　　✦</div>
    <section class="wrap"><div class="section-head"><div><div class="eyebrow">THE GAME COLLECTION</div><h2>今晚玩哪一攤？</h2><p>每一款都有不同玩法，挑一個馬上開玩。</p></div><div class="count">30 GAMES / 01—30</div></div><div class="filters" aria-label="遊戲分類篩選"></div><div class="grid"></div></section>
    <footer>老馬麵攤製作　·　復古街機 30 合 1　·　遊戲畫面為像素風預覽圖</footer>`;
  const filters = ['全部','多人對戰','節奏','閃避跑酷','時機挑戰','益智','其他'];
  const filterRoot = catalog.querySelector('.filters')!;
  const grid = catalog.querySelector('.grid')!;
  let active = '全部';
  function render() {
    filterRoot.innerHTML = filters.map((filter) => `<button class="filter${active === filter ? ' active' : ''}" data-filter="${filter}">${filter}</button>`).join('');
    const visible = games.filter((game) => active === '全部' || (active === '多人對戰' ? game.tag.startsWith('多人') : active === '閃避跑酷' ? game.tag === active : active === '時機挑戰' ? game.tag === active : active === '節奏' ? game.tag === active : active === '益智' ? ['解謎','益智消除','記憶配對'].includes(game.tag) : !['多人對戰','多人競速','節奏','閃避跑酷','時機挑戰','解謎','益智消除','記憶配對'].includes(game.tag)));
    grid.innerHTML = visible.map((game) => `<article class="card"><div class="shot"><img loading="lazy" alt="${game.title}像素風遊戲畫面預覽" src="${preview(game, Number(game.no)-1)}"><span class="badge">GAME ${game.no}</span></div><div class="copy"><div class="titleline"><span class="icon">${game.icon}</span><h3>${game.title}</h3></div><p class="desc">${game.description}</p><div class="cardfoot"><span>NO. ${game.no}　/　${game.tag}</span><span class="start-link">玩法介紹　↗</span></div></div></article>`).join('');
  }
  filterRoot.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const filter = target.closest<HTMLButtonElement>('[data-filter]');
    if (filter) { active = filter.dataset.filter || '全部'; render(); }
  });
  render();
  document.body.append(catalog);
}
