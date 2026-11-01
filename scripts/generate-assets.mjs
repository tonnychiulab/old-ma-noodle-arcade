import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const games = [
  ['night-market-rush','夜','麵','#ffb02e'],['pinball-duel','彈','彈','#68d6c0'],['ring-toss','套','圈','#f97570'],
  ['neon-wiring','電','電','#7ce4dc'],['bumper-alley','車','撞','#77b5ff'],['hopscotch-king','跳','格','#f3d264'],
  ['oyster-omelet','煎','鍋','#f1a85b'],['braised-bites','滷','滷','#9fce74'],['bubble-tea-shake','茶','搖','#bca0ed'],
  ['alley-delivery','送','餐','#f18b59'],['claw-master','夾','爪','#ed93ce'],['fishball-skewer','丸','串','#ffe08d'],
  ['mahjong-match','麻','牌','#7cc9a4'],['alley-skater','板','滑','#e77d62'],['temple-drums','鼓','陣','#df6c55'],
  ['night-market-tycoon','店','帳','#d38f54'],['mole-market','鼠','洞','#bd9666'],['sausage-chef','烤','腸','#f08059'],
  ['planter-bowler','球','投','#82bc7a'],['balloon-shooter','氣','球','#ff7096'],['rain-dash','雨','跑','#79aee8'],
  ['sparrow-rhythm','雀','拍','#dab269'],['night-market-puzzle','拼','圖','#a99ad9'],['change-maker','錢','找','#6ec9a1'],
  ['sign-match','消','燈','#ff8881'],['tile-runner','磚','躍','#d99061'],['shrimp-fishing','蝦','釣','#f28f70'],
  ['lucky-wheel','轉','獎','#f3cd5a'],['stall-defense','守','攤','#86c278'],['old-ma-adventure','馬','冒','#edac58'],
];

function makeWav(frequencies, seconds, wave = 'square', volume = 0.18) {
  const sampleRate = 22050;
  const count = Math.floor(sampleRate * seconds);
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + count * 2, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const frequency = frequencies[Math.floor(t / seconds * frequencies.length) % frequencies.length];
    const envelope = Math.min(1, t * 24, (seconds - t) * 8);
    const phase = 2 * Math.PI * frequency * t;
    const sample = wave === 'triangle' ? 2 / Math.PI * Math.asin(Math.sin(phase)) : Math.sign(Math.sin(phase));
    buffer.writeInt16LE(Math.round(sample * volume * envelope * 32767), 44 + i * 2);
  }
  return buffer;
}

async function put(relative, content) {
  const path = join(root, relative);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

for (const [index, [id, symbol, prop, color]] of games.entries()) {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" shape-rendering="crispEdges"><rect x="8" y="8" width="112" height="112" rx="8" fill="#251b13" stroke="${color}" stroke-width="8"/><rect x="24" y="25" width="80" height="78" fill="#3b2a1b"/><path d="M32 92h64V46H32z" fill="${color}"/><path d="M40 39h48v9H40zM50 26h28v12H50z" fill="#f6da91"/><text x="64" y="82" fill="#28180e" font-family="sans-serif" font-size="38" font-weight="900" text-anchor="middle">${symbol}</text><path d="M16 16h16v7H16zm80 88h16v7H96z" fill="#fff0bd"/></svg>`;
  const sceneType = index % 6;
  const night = sceneType === 4 ? '#1e2c38' : sceneType === 5 ? '#2b211d' : '#30241d';
  const streetDetail = sceneType === 0
    ? `<path d="M0 130h960v35H0z" fill="#c84637"/><path d="M0 130h960v17H0z" fill="#f5dfb5"/><path d="M85 290h790v110H85z" fill="#70452b"/><path d="M105 278h750v18H105z" fill="#e39b3c"/><path d="M130 222h700v45H130z" fill="#281a15" stroke="${color}" stroke-width="5"/>`
    : sceneType === 1
      ? `<path d="M0 105h960v210H0z" fill="#261f1b"/><path d="M70 170h820v220H70z" fill="#1b2020" stroke="#c89650" stroke-width="7"/><path d="M95 190h770v165H95z" fill="${color}" opacity=".42"/><path d="M145 365h670v22H145z" fill="#9d6740"/>`
      : sceneType === 2
        ? `<path d="M0 130h960v190H0z" fill="#202a32"/><path d="M0 370h960v170H0z" fill="#293b43"/><path d="M90 190h780v28H90zm40 80h700v9H130zm0 44h700v9H130z" fill="#7999a4" opacity=".52"/><path d="M180 238h600v122H180z" fill="${color}" opacity=".5"/>`
        : sceneType === 3
          ? `<path d="M60 150l420-90 420 90-32 28H92z" fill="#9e3426"/><path d="M105 150l375-76 375 76v22H105z" fill="#e5bd72"/><path d="M90 172h780v200H90z" fill="#63302a"/><path d="M110 205h740v20H110zm30 120h680v12H140z" fill="#e0b557"/>`
          : sceneType === 4
            ? `<path d="M0 90h240v300H0zm720-30h240v330H720z" fill="#27343d"/><path d="M0 410h960v130H0z" fill="#526875"/><path d="M135 170h690v190H135z" fill="#20333a" stroke="${color}" stroke-width="8"/><path d="M165 198h630v16H165z" fill="#9ac0c5"/>`
            : `<path d="M0 130h960v240H0z" fill="#32241d"/><path d="M0 390h960v150H0z" fill="#39322b"/><path d="M85 215l120-80 110 80v155H85zm460 0l120-80 110 80v155H545z" fill="#4a3428"/><path d="M105 242h190v16H105zm460 0h190v16H565z" fill="${color}"/>`;
  const paving = Array.from({ length: 8 }, (_, i) => `<path d="M${i * 128} 405l-34 135" stroke="#806449" stroke-width="3" opacity=".7"/>`).join('');
  const scene = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" shape-rendering="crispEdges"><rect width="960" height="540" fill="${night}"/><path d="M0 0h960v42H0z" fill="#9d382e"/><path d="M0 0h960v18H0z" fill="#f0d7ae"/>${streetDetail}<path d="M0 390h960v150H0z" fill="#38302a"/>${paving}<path d="M70 110h820v45H70z" fill="#201715" stroke="${color}" stroke-width="5"/><text x="480" y="142" fill="#fff0cc" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle">${symbol} ${prop}　夜市街頭</text><circle cx="96" cy="83" r="12" fill="#f6bf53"/><circle cx="864" cy="83" r="12" fill="#f6bf53"/><text x="48" y="505" fill="#edca8c" font-family="monospace" font-size="20">攤位 ${String(index + 1).padStart(2,'0')}　｜　老馬麵攤</text></svg>`;
  const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" shape-rendering="crispEdges"><path d="M28 112V64h72v48H84V88H44v24z" fill="#f2b252"/><path d="M34 58l10-29h40l10 29-12 14H46z" fill="#542f1d" stroke="#f6d28b" stroke-width="5"/><path d="M48 47h10v11H48zm24 0h10v11H72z" fill="#fff1ca"/><path d="M58 64h14v9H58z" fill="${color}"/><path d="M20 112h88v10H20z" fill="#8d5528"/><path d="M46 21h36v9H46zM53 14h22v7H53z" fill="${color}"/></svg>`;
  const propImage = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" shape-rendering="crispEdges"><rect x="18" y="25" width="284" height="130" fill="#332419" stroke="${color}" stroke-width="8"/><path d="M36 132h248v14H36z" fill="#77532d"/><circle cx="100" cy="83" r="36" fill="${color}"/><path d="M83 83h34M100 66v34" stroke="#fff0bd" stroke-width="8"/><text x="216" y="100" fill="#ffe5a4" font-family="sans-serif" font-size="44" font-weight="bold" text-anchor="middle">${prop}</text></svg>`;
  await Promise.all([
    put(`games/${id}/icons/${id}.svg`, icon),
    put(`games/${id}/scenes/${id}-scene.svg`, scene),
    put(`games/${id}/characters/${id}-hero.svg`, hero),
    put(`games/${id}/images/${id}-prop.svg`, propImage),
    put(`games/${id}/audio/${id}-action.wav`, makeWav([220 + index * 9, 330 + index * 11, 440 + index * 13], 0.24, index % 2 ? 'triangle' : 'square', 0.28)),
  ]);
}

const music = makeWav([220,330,440,330,262,392,523,392,196,294,392,294,247,370,494,370], 4, 'square', 0.08);
await put('shared/audio/night-market-loop.wav', music);
await put('shared/audio/score-chime.wav', makeWav([523,659,784,1047], 0.28, 'square', 0.24));
await put('shared/audio/miss-buzz.wav', makeWav([180,130], 0.18, 'triangle', 0.2));
await put('shared/icons/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges"><rect x="3" y="3" width="58" height="58" rx="7" fill="#25180f" stroke="#ffbd4a" stroke-width="5"/><path d="M14 44h36v8H14zM18 21h28v5H18zM13 27h38v16H13z" fill="#a55f2a"/><text x="32" y="40" fill="#ffe39b" font-family="sans-serif" font-size="17" font-weight="900" text-anchor="middle">老馬</text><path d="M20 14h24v5H20z" fill="#ffbd4a"/></svg>`);
console.log(`Generated original pixel-style art and audio for ${games.length} games.`);
