import React, { useState, useMemo } from "react";

/* ============================================================
   ポケモンチャンピオンズ  ダメージ計算 + 選出サポート  (v2)
   - 計算式は第9世代準拠 / チャンピオンズの「能力ポイント」制(0-32, 合計66)
   - テラスタルは現行未解禁のため非搭載
   - メガシンカ搭載(1バトル1体・持ち物はメガストーン固定)
   - 種族値/特性/技威力はゲーム事実データ。編集・追加が前提の設計
   ============================================================ */

const TYPES = ["ノーマル","ほのお","みず","でんき","くさ","こおり","かくとう","どく","じめん","ひこう","エスパー","むし","いわ","ゴースト","ドラゴン","あく","はがね","フェアリー"];
const TYPE_COLORS = {ノーマル:"#9099a1",ほのお:"#ff9d55",みず:"#4d90d5",でんき:"#f4d23c",くさ:"#63bc5a",こおり:"#73cec0",かくとう:"#ce4069",どく:"#ab6ac8",じめん:"#d97845",ひこう:"#8fa8dd",エスパー:"#f97176",むし:"#90c12c",いわ:"#c7b78b",ゴースト:"#5269ac",ドラゴン:"#0b6dc3",あく:"#5a5366",はがね:"#5a8ea1",フェアリー:"#ec8fe6"};

/* 攻撃タイプ → {防御タイプ: 倍率}（≠1 のみ） */
const CHART = {
  ノーマル:{ゴースト:0,いわ:0.5,はがね:0.5},
  ほのお:{くさ:2,こおり:2,むし:2,はがね:2,ほのお:0.5,みず:0.5,いわ:0.5,ドラゴン:0.5},
  みず:{ほのお:2,じめん:2,いわ:2,みず:0.5,くさ:0.5,ドラゴン:0.5},
  でんき:{みず:2,ひこう:2,でんき:0.5,くさ:0.5,ドラゴン:0.5,じめん:0},
  くさ:{みず:2,じめん:2,いわ:2,ほのお:0.5,くさ:0.5,どく:0.5,ひこう:0.5,むし:0.5,ドラゴン:0.5,はがね:0.5},
  こおり:{くさ:2,じめん:2,ひこう:2,ドラゴン:2,ほのお:0.5,みず:0.5,こおり:0.5,はがね:0.5},
  かくとう:{ノーマル:2,いわ:2,はがね:2,こおり:2,あく:2,どく:0.5,ひこう:0.5,エスパー:0.5,むし:0.5,フェアリー:0.5,ゴースト:0},
  どく:{くさ:2,フェアリー:2,どく:0.5,じめん:0.5,いわ:0.5,ゴースト:0.5,はがね:0},
  じめん:{ほのお:2,でんき:2,どく:2,いわ:2,はがね:2,くさ:0.5,むし:0.5,ひこう:0},
  ひこう:{くさ:2,かくとう:2,むし:2,でんき:0.5,いわ:0.5,はがね:0.5},
  エスパー:{かくとう:2,どく:2,エスパー:0.5,はがね:0.5,あく:0},
  むし:{くさ:2,エスパー:2,あく:2,ほのお:0.5,かくとう:0.5,どく:0.5,ひこう:0.5,ゴースト:0.5,はがね:0.5,フェアリー:0.5},
  いわ:{ほのお:2,こおり:2,ひこう:2,むし:2,かくとう:0.5,じめん:0.5,はがね:0.5},
  ゴースト:{エスパー:2,ゴースト:2,あく:0.5,ノーマル:0},
  ドラゴン:{ドラゴン:2,はがね:0.5,フェアリー:0},
  あく:{エスパー:2,ゴースト:2,かくとう:0.5,あく:0.5,フェアリー:0.5},
  はがね:{こおり:2,いわ:2,フェアリー:2,ほのお:0.5,みず:0.5,でんき:0.5,はがね:0.5},
  フェアリー:{かくとう:2,ドラゴン:2,あく:2,ほのお:0.5,どく:0.5,はがね:0.5},
};

/* 通常フォルム (HP/攻/防/特攻/特防/素早) */
const BASE = {
  ガブリアス:{t:["じめん","ドラゴン"],b:[108,130,95,80,85,102]},
  カイリュー:{t:["ドラゴン","ひこう"],b:[91,134,95,100,100,80]},
  バンギラス:{t:["いわ","あく"],b:[100,134,110,95,100,61]},
  ハバタクカミ:{t:["ゴースト","フェアリー"],b:[55,55,55,135,135,135]},
  テツノブジン:{t:["フェアリー","かくとう"],b:[74,130,90,120,60,116]},
  "ウーラオス(いちげき)":{t:["かくとう","あく"],b:[100,130,100,63,60,97]},
  "ウーラオス(れんげき)":{t:["かくとう","みず"],b:[100,130,100,63,60,97]},
  ランドロス霊獣:{t:["じめん","ひこう"],b:[89,145,90,105,80,91]},
  ディンルー:{t:["あく","じめん"],b:[155,110,125,55,80,45]},
  パオジアン:{t:["あく","こおり"],b:[80,120,80,90,65,135]},
  イーユイ:{t:["あく","ほのお"],b:[55,80,80,135,120,100]},
  チオンジェン:{t:["あく","くさ"],b:[85,85,100,95,135,70]},
  コライドン:{t:["かくとう","ドラゴン"],b:[100,135,115,85,100,135]},
  ミライドン:{t:["でんき","ドラゴン"],b:[100,85,100,135,115,135]},
  テツノカイナ:{t:["でんき","かくとう"],b:[154,140,108,50,68,50]},
  サーフゴー:{t:["はがね","ゴースト"],b:[87,60,95,133,91,84]},
  カイオーガ:{t:["みず"],b:[100,100,90,150,140,90]},
  グラードン:{t:["じめん"],b:[100,150,140,100,90,90]},
  キュレム:{t:["ドラゴン","こおり"],b:[125,130,90,130,90,95]},
  オーガポン緑:{t:["くさ"],b:[80,120,84,60,96,110]},
  モロバレル:{t:["くさ","どく"],b:[114,85,70,85,80,30]},
  ドドゲザン:{t:["あく","はがね"],b:[100,135,120,60,85,50]},
  テツノツツミ:{t:["こおり","みず"],b:[56,80,114,124,60,136]},
  ヘイラッシャ:{t:["みず"],b:[150,100,115,65,65,35]},
  シャリタツ:{t:["ドラゴン","みず"],b:[68,50,60,120,95,82]},
  "ロトム(ヒート)":{t:["でんき","ほのお"],b:[50,65,107,105,107,86]},
  "ロトム(ウォッシュ)":{t:["でんき","みず"],b:[50,65,107,105,107,86]},
  ガチグマアカツキ:{t:["ノーマル","じめん"],b:[113,70,120,135,65,52]},
  テツノドクガ:{t:["ほのお","どく"],b:[80,70,60,140,110,110]},
  マスカーニャ:{t:["くさ","あく"],b:[76,110,70,81,70,123]},
  ラウドボーン:{t:["ほのお","ゴースト"],b:[104,75,100,110,75,66]},
  ウェーニバル:{t:["みず","かくとう"],b:[85,120,80,85,75,85]},
  ミミッキュ:{t:["ゴースト","フェアリー"],b:[55,90,80,50,105,96]},
  カバルドン:{t:["じめん"],b:[108,112,118,68,72,47]},
  ドラパルト:{t:["ドラゴン","ゴースト"],b:[88,120,75,100,75,142]},
  ヒードラン:{t:["ほのお","はがね"],b:[91,90,106,130,106,77]},
  メタグロス:{t:["はがね","エスパー"],b:[80,135,130,95,90,70]},
  ボーマンダ:{t:["ドラゴン","ひこう"],b:[95,135,80,110,80,100]},
  ガオガエン:{t:["ほのお","あく"],b:[95,115,90,80,90,60]},
  エルフーン:{t:["くさ","フェアリー"],b:[60,67,85,77,75,116]},
  ドリュウズ:{t:["じめん","はがね"],b:[110,135,60,50,65,88]},
  トドロクツキ:{t:["ドラゴン","あく"],b:[105,139,71,55,101,119]},
};

/* メガシンカ (種族値・特性はgame8等で照合したゲーム事実データ) */
const MEGA = {
  メガライチュウX:{t:["でんき"],b:[60,135,95,90,95,110],ab:"エレキメイカー"},
  メガライチュウY:{t:["でんき"],b:[60,100,55,160,80,130],ab:"ノーガード"},
  メガジュカイン:{t:["くさ","ドラゴン"],b:[70,110,75,145,85,145],ab:"ひらいしん"},
  メガバシャーモ:{t:["ほのお","かくとう"],b:[80,160,80,130,80,100],ab:"かそく"},
  メガラグラージ:{t:["みず","じめん"],b:[100,150,110,95,110,70],ab:"すいすい"},
  メガクチート:{t:["はがね","フェアリー"],b:[50,105,125,55,95,50],ab:"ちからもち"},
  メガメタグロス:{t:["はがね","エスパー"],b:[80,145,150,105,110,110],ab:"かたいツメ"},
  メガムクホーク:{t:["かくとう","ひこう"],b:[85,140,100,60,90,110],ab:"あまのじゃく"},
  メガペンドラー:{t:["むし","どく"],b:[60,140,149,75,99,62],ab:"シェルアーマー"},
  メガズルズキン:{t:["あく","かくとう"],b:[65,130,135,55,135,68],ab:"いかく"},
  メガシビルドン:{t:["でんき"],b:[85,145,80,135,90,80],ab:"うなぎのぼり"},
  メガカエンジシ:{t:["ほのお","ノーマル"],b:[86,88,92,129,86,126],ab:"ほのおのたてがみ"},
  メガカラマネロ:{t:["あく","エスパー"],b:[86,102,88,98,120,88],ab:"あまのじゃく"},
  メガガメノデス:{t:["いわ","かくとう"],b:[72,140,130,64,106,88],ab:"かたいツメ"},
  メガドラミドロ:{t:["どく","ドラゴン"],b:[65,85,105,132,163,44],ab:"さいせいりょく"},
  メガタイレーツ:{t:["かくとう"],b:[65,135,135,70,65,100],ab:"まけんき"},
  メガガブリアス:{t:["じめん","ドラゴン"],b:[108,170,115,120,95,92],ab:"すなのちから"},
  メガバンギラス:{t:["いわ","あく"],b:[100,164,150,95,120,71],ab:"すなおこし"},
  メガボーマンダ:{t:["ドラゴン","ひこう"],b:[95,145,130,120,90,120],ab:"スカイスキン"},
  メガゲンガー:{t:["ゴースト","どく"],b:[60,65,80,170,95,130],ab:"かげふみ"},
  メガハッサム:{t:["むし","はがね"],b:[70,150,140,65,100,75],ab:"テクニシャン"},
  メガルカリオ:{t:["かくとう","はがね"],b:[70,145,88,140,70,112],ab:"てきおうりょく"},
  メガフシギバナ:{t:["くさ","どく"],b:[80,100,123,122,120,80],ab:"あついしぼう"},
  メガカメックス:{t:["みず"],b:[79,103,120,135,115,78],ab:"メガランチャー"},
  メガリザードンX:{t:["ほのお","ドラゴン"],b:[78,130,111,130,85,100],ab:"かたいツメ"},
  メガリザードンY:{t:["ほのお","ひこう"],b:[78,104,78,159,115,100],ab:"ひでり"},
  メガギャラドス:{t:["みず","あく"],b:[95,155,109,70,130,81],ab:"かたやぶり"},
  メガサーナイト:{t:["エスパー","フェアリー"],b:[68,85,65,165,135,100],ab:"フェアリースキン"},
  メガガルーラ:{t:["ノーマル"],b:[105,125,100,60,100,100],ab:"おやこあい"},
};
const POKEMON = {};
Object.entries(BASE).forEach(([k,v])=>POKEMON[k]={...v,mega:false});
Object.entries(MEGA).forEach(([k,v])=>POKEMON[k]={t:v.t,b:v.b,mega:true,ab:v.ab});

/* 技 (タイプ, 分類, 威力) */
const MOVES = {
  じしん:["じめん","phys",100], じならし:["じめん","phys",60],
  げきりん:["ドラゴン","phys",120], ドラゴンクロー:["ドラゴン","phys",80], りゅうせいぐん:["ドラゴン","spec",130], りゅうのはどう:["ドラゴン","spec",85],
  しんそく:["ノーマル","phys",80], すてみタックル:["ノーマル","phys",120],
  ストーンエッジ:["いわ","phys",100], いわなだれ:["いわ","phys",75],
  かみくだく:["あく","phys",80], あくのはどう:["あく","spec",80], ふいうち:["あく","phys",70], はたきおとす:["あく","phys",65], じごくづき:["あく","phys",80],
  インファイト:["かくとう","phys",120], きあいだま:["かくとう","spec",120], ばくれつパンチ:["かくとう","phys",100], とびひざげり:["かくとう","phys",130],
  ムーンフォース:["フェアリー","spec",95], マジカルシャイン:["フェアリー","spec",80], じゃれつく:["フェアリー","phys",90],
  シャドーボール:["ゴースト","spec",80], かげうち:["ゴースト","phys",40], ゴーストダイブ:["ゴースト","phys",90], たたりめ:["ゴースト","spec",65],
  "10まんボルト":["でんき","spec",90], かみなり:["でんき","spec",110], ボルトチェンジ:["でんき","spec",70], ワイルドボルト:["でんき","phys",90],
  れいとうビーム:["こおり","spec",90], ふぶき:["こおり","spec",110], つららおとし:["こおり","phys",85], こおりのつぶて:["こおり","phys",40],
  かえんほうしゃ:["ほのお","spec",90], だいもんじ:["ほのお","spec",110], フレアドライブ:["ほのお","phys",120], オーバーヒート:["ほのお","spec",130], ねっぷう:["ほのお","spec",95],
  ハイドロポンプ:["みず","spec",110], なみのり:["みず","spec",90], アクアジェット:["みず","phys",40], たきのぼり:["みず","phys",80], ウェーブタックル:["みず","phys",120],
  エナジーボール:["くさ","spec",90], リーフブレード:["くさ","phys",90], パワーウィップ:["くさ","phys",120], ウッドハンマー:["くさ","phys",120],
  ヘドロばくだん:["どく","spec",90], ヘドロウェーブ:["どく","spec",95], ダストシュート:["どく","phys",120],
  とんぼがえり:["むし","phys",70], むしのさざめき:["むし","spec",90], シザークロス:["むし","phys",80],
  アイアンヘッド:["はがね","phys",80], ラスターカノン:["はがね","spec",80], ゴールドラッシュ:["はがね","spec",120], アイアンテール:["はがね","phys",100], バレットパンチ:["はがね","phys",40],
  ブレイブバード:["ひこう","phys",120], エアスラッシュ:["ひこう","spec",75], ぼうふう:["ひこう","spec",110],
  サイコキネシス:["エスパー","spec",90], サイコショック:["エスパー","spec",80], ワイドフォース:["エスパー","spec",80],
};

const NATURES = {"無補正":[null,null],"攻撃↑":["atk",null],"特攻↑":["spa",null],"素早↑":["spe",null],"防御↑":["def",null],"特防↑":["spd",null],"攻撃↑特攻↓":["atk","spa"],"特攻↑攻撃↓":["spa","atk"],"素早↑攻撃↓":["spe","atk"],"素早↑特攻↓":["spe","spa"],"防御↑特攻↓":["def","spa"],"特防↑攻撃↓":["spd","atk"]};
const STAT_KEYS = ["hp","atk","def","spa","spd","spe"];
const STAT_JP = {hp:"HP",atk:"攻撃",def:"防御",spa:"特攻",spd:"特防",spe:"素早"};

/* ---------------- 計算エンジン ---------------- */
const pokeRound = (n) => (n % 1 > 0.5 ? Math.ceil(n) : Math.floor(n));

function calcStat(base, key, iv, pts, natureName, level) {
  const [up, down] = NATURES[natureName] || [null, null];
  if (key === "hp") {
    if (base === 1) return 1;
    return Math.floor((2 * base + iv) * level / 100) + level + 10 + pts;
  }
  let nat = 1.0;
  if (up === key) nat = 1.1;
  if (down === key) nat = 0.9;
  const inner = Math.floor((2 * base + iv) * level / 100) + 5 + pts;
  return Math.floor(inner * nat);
}
function typeEff(moveType, defTypes) {
  let m = 1;
  for (const dt of defTypes) { const row = CHART[moveType] || {}; if (dt in row) m *= row[dt]; }
  return m;
}

function calcDamage(cfg) {
  const { atkStat, defStat, maxHP, atkTypes, defTypes, move, level,
    weather, crit, spread, burn, otherMult, atkAbility, defAbility } = cfg;
  let [mType, mCat, mPow] = MOVES[move];

  // 攻撃側特性
  let A = atkStat;
  if ((atkAbility === "ちからもち" || atkAbility === "ヨガパワー") && mCat === "phys") A *= 2;
  if (atkAbility === "テクニシャン" && mPow <= 60) mPow = Math.floor(mPow * 1.5);
  const D = defStat;

  const eff = typeEff(mType, defTypes);
  if (eff === 0 || mPow === 0) return { immune: eff === 0, rolls:[0], maxHP, eff, mType, mCat };

  const stab = atkTypes.includes(mType) ? 1.5 : 1;
  let dmgTypeMult = eff;
  if (defAbility === "あついしぼう" && (mType === "ほのお" || mType === "こおり")) dmgTypeMult *= 0.5;

  const base = Math.floor(Math.floor(Math.floor((2*level/5+2)*mPow*A/D)/50)+2);
  const rolls = [];
  for (let N = 85; N <= 100; N++) {
    let v = base;
    if (spread) v = Math.floor(v * 0.75);
    if (weather === "boost") v = pokeRound(v * 1.5);
    if (weather === "weaken") v = pokeRound(v * 0.5);
    if (crit) v = Math.floor(v * 1.5);
    v = Math.floor(v * N / 100);
    v = pokeRound(v * stab);
    v = Math.floor(v * dmgTypeMult);
    if (burn) v = Math.floor(v * 0.5);
    if (otherMult !== 1) v = pokeRound(v * otherMult);
    rolls.push(Math.max(1, v));
  }
  return { rolls, maxHP, eff, mType, mCat, immune:false };
}

function koSummary(rolls, maxHP) {
  if (rolls[0] === 0) return { text:"無効", pct:[0,0] };
  const min = rolls[0], max = rolls[rolls.length-1];
  const pctMin = (min/maxHP)*100, pctMax = (max/maxHP)*100;
  const guaranteed = Math.ceil(maxHP/min), possible = Math.ceil(maxHP/max);
  const oneShot = rolls.filter(r=>r>=maxHP).length;
  let label = guaranteed===possible ? `確定${guaranteed}発` : `乱数${possible}発〜確定${guaranteed}発`;
  if (possible === 1) { const p=((oneShot/rolls.length)*100).toFixed(1); label = oneShot===rolls.length?"確定1発":`乱数1発 (${p}%)`; }
  return { text:label, pct:[pctMin,pctMax], min, max };
}

/* ---------------- UI ---------------- */
const C = {bg:"#0e1420",panel:"#182031",panel2:"#1f2a3d",border:"#2b384f",text:"#e7edf6",muted:"#8695ab",gold:"#f5c451",good:"#4fd18b",bad:"#ff6b7a",even:"#f5c451"};
const jp = {fontFamily:'"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif'};
const mono = {fontFamily:'ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace'};
const panelStyle = {background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:14};
const thStyle = {border:`1px solid ${C.border}`,padding:"5px 6px",color:C.muted,fontWeight:600,whiteSpace:"nowrap"};
const selStyle = {width:"100%",background:C.panel2,color:C.text,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",fontSize:14,...jp,appearance:"none"};

function TypeChip({t,small}){ if(!t) return null; return <span style={{background:TYPE_COLORS[t],color:"#12161d",fontWeight:700,fontSize:small?10:12,padding:small?"1px 6px":"2px 8px",borderRadius:4,letterSpacing:1,...jp}}>{t}</span>; }
function Field({label,children}){ return <label style={{display:"block",marginBottom:10}}><div style={{fontSize:11,color:C.muted,marginBottom:4,letterSpacing:1,...jp}}>{label}</div>{children}</label>; }
function Select({value,onChange,options}){ return <select style={selStyle} value={value} onChange={(e)=>onChange(e.target.value)}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}</select>; }
function clamp(v,lo,hi){ const n=parseInt(v||0,10); return Math.max(lo,Math.min(hi,isNaN(n)?0:n)); }
function Toggle({on,set,label}){ return <button onClick={()=>set(!on)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",...jp}}><span style={{width:34,height:20,borderRadius:10,background:on?C.gold:C.border,position:"relative",transition:"0.15s"}}><span style={{position:"absolute",top:2,left:on?16:2,width:16,height:16,borderRadius:8,background:"#0e1420",transition:"0.15s"}}/></span><span style={{fontSize:12,color:on?C.text:C.muted}}>{label}</span></button>; }
function SideTitle({color,label,name,types,ability}){ return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,borderLeft:`3px solid ${color}`,paddingLeft:8}}><span style={{...jp,fontSize:11,color:C.muted}}>{label}</span><span style={{...jp,fontWeight:800,fontSize:15}}>{name}</span>{ability&&<span style={{...jp,fontSize:10,color:C.gold}}>{ability}</span>}<span style={{display:"flex",gap:3,marginLeft:"auto"}}>{types.map(t=><TypeChip key={t} t={t} small/>)}</span></div>; }

const idx = (k)=>STAT_KEYS.indexOf(k);

/* ============ ダメージ計算タブ ============ */
function DamageTab(){
  const mons = Object.keys(POKEMON);
  const [atk,setAtk]=useState("メガメタグロス");
  const [def,setDef]=useState("ハバタクカミ");
  const [move,setMove]=useState("アイアンヘッド");
  const [atkPts,setAtkPts]=useState(32);
  const [atkNature,setAtkNature]=useState("攻撃↑");
  const [item,setItem]=useState("なし");
  const [defHPpts,setDefHPpts]=useState(0);
  const [defDefPts,setDefDefPts]=useState(0);
  const [defNature,setDefNature]=useState("無補正");
  const [defItem,setDefItem]=useState("なし");
  const [weather,setWeather]=useState("none");
  const [crit,setCrit]=useState(false);
  const [spread,setSpread]=useState(false);
  const [burn,setBurn]=useState(false);

  const [mType,mCat]=MOVES[move];
  const atkKey = mCat==="phys"?"atk":"spa";
  const defKey = mCat==="phys"?"def":"spd";
  const atkData=POKEMON[atk], defData=POKEMON[def];
  const atkIsMega=atkData.mega, defIsMega=defData.mega;

  function weatherBoost(w,mt){ if(w==="sun")return mt==="ほのお"?"boost":mt==="みず"?"weaken":null; if(w==="rain")return mt==="みず"?"boost":mt==="ほのお"?"weaken":null; return null; }

  const result = useMemo(()=>{
    // 攻撃側実数値
    const atkStat = calcStat(atkData.b[idx(atkKey)],atkKey,31,atkPts,atkNature,50);
    // 防御側実数値（チョッキは特防1.5）
    let defStat = calcStat(defData.b[idx(defKey)],defKey,31,defDefPts,defNature,50);
    if(defItem==="とつげきチョッキ"&&mCat==="spec") defStat=Math.floor(defStat*1.5);
    const maxHP = calcStat(defData.b[0],"hp",31,defHPpts,defNature,50);
    // 持ち物倍率（メガはメガストーン固定なので攻撃側の火力アイテム無効）
    let otherMult=1;
    if(!atkIsMega){
      if(item==="こだわり/眼鏡ハチマキ")otherMult*=1.5;
      if(item==="いのちのたま")otherMult*=1.3;
      if(item==="タイプ強化(1.2)")otherMult*=1.2;
    }
    if(defItem==="リフレクター"&&mCat==="phys")otherMult*=(spread?2/3:0.5);
    if(defItem==="ひかりのかべ"&&mCat==="spec")otherMult*=(spread?2/3:0.5);
    return calcDamage({atkStat,defStat,maxHP,atkTypes:atkData.t,defTypes:defData.t,move,level:50,
      weather:weather==="none"?null:weatherBoost(weather,mType),crit,spread,burn,otherMult,
      atkAbility:atkIsMega?atkData.ab:null, defAbility:defIsMega?defData.ab:null});
  },[atk,def,move,atkPts,atkNature,item,defHPpts,defDefPts,defNature,defItem,weather,crit,spread,burn]);

  const ko = koSummary(result.rolls, result.maxHP);
  const effLabel = result.immune?"×0 (無効)":result.eff===0?"無効":result.eff>1?`×${result.eff} こうかばつぐん`:result.eff<1?`×${result.eff} いまひとつ`:"×1 等倍";
  const pctMax=Math.min(100,ko.pct[1]), pctMin=Math.min(100,ko.pct[0]);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={panelStyle}>
          <SideTitle color={TYPE_COLORS[atkData.t[0]]} label="攻撃" name={atk} types={atkData.t} ability={atkIsMega?atkData.ab:null}/>
          <Field label="ポケモン"><Select value={atk} onChange={setAtk} options={mons}/></Field>
          <Field label="わざ"><Select value={move} onChange={setMove} options={Object.keys(MOVES)}/></Field>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8,fontSize:12,color:C.muted,...jp}}><TypeChip t={mType} small/> {mCat==="phys"?"物理":"特殊"} / 威力{MOVES[move][2]}</div>
          <Field label={`${STAT_JP[atkKey]}ポイント (0–32)`}><input type="number" min={0} max={32} style={selStyle} value={atkPts} onChange={(e)=>setAtkPts(clamp(e.target.value,0,32))}/></Field>
          <Field label="性格補正"><Select value={atkNature} onChange={setAtkNature} options={Object.keys(NATURES)}/></Field>
          <Field label={atkIsMega?"持ち物（メガストーン固定）":"持ち物・特性倍率"}>
            {atkIsMega ? <div style={{...selStyle,color:C.muted}}>メガストーン</div>
              : <Select value={item} onChange={setItem} options={["なし","こだわり/眼鏡ハチマキ","いのちのたま","タイプ強化(1.2)"]}/>}
          </Field>
        </div>

        <div style={panelStyle}>
          <SideTitle color={TYPE_COLORS[defData.t[0]]} label="防御" name={def} types={defData.t} ability={defIsMega?defData.ab:null}/>
          <Field label="ポケモン"><Select value={def} onChange={setDef} options={mons}/></Field>
          <Field label="HPポイント (0–32)"><input type="number" min={0} max={32} style={selStyle} value={defHPpts} onChange={(e)=>setDefHPpts(clamp(e.target.value,0,32))}/></Field>
          <Field label={`${STAT_JP[defKey]}ポイント (0–32)`}><input type="number" min={0} max={32} style={selStyle} value={defDefPts} onChange={(e)=>setDefDefPts(clamp(e.target.value,0,32))}/></Field>
          <Field label="性格補正(防御側)"><Select value={defNature} onChange={setDefNature} options={Object.keys(NATURES)}/></Field>
          <Field label="持ち物">{defIsMega?<div style={{...selStyle,color:C.muted}}>メガストーン</div>:<Select value={defItem} onChange={setDefItem} options={["なし","とつげきチョッキ","リフレクター","ひかりのかべ"]}/>}</Field>
        </div>
      </div>

      <div style={{...panelStyle,marginTop:12}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"center"}}>
          <div style={{minWidth:130}}><div style={{fontSize:11,color:C.muted,marginBottom:4,...jp}}>天気</div><Select value={weather} onChange={setWeather} options={[{v:"none",l:"なし"},{v:"sun",l:"はれ"},{v:"rain",l:"あめ"}]}/></div>
          <Toggle on={spread} set={setSpread} label="ダブル範囲技(0.75)"/>
          <Toggle on={crit} set={setCrit} label="急所(1.5)"/>
          <Toggle on={burn} set={setBurn} label="やけど(物理0.5)"/>
        </div>
      </div>

      <div style={{...panelStyle,marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8,...jp}}>
          <span style={{color:C.muted,fontSize:12}}>{def} / 最大HP {result.maxHP}</span>
          <span style={{color:result.eff>1?C.good:result.eff<1?C.bad:C.muted,fontSize:12,fontWeight:700}}>{effLabel}</span>
        </div>
        <div style={{position:"relative",height:34,background:"#0a0f18",borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`}}>
          {!result.immune && (<>
            <div style={{position:"absolute",left:`${100-pctMax}%`,right:0,top:0,bottom:0,background:"rgba(255,107,122,0.25)"}}/>
            <div style={{position:"absolute",left:`${100-pctMin}%`,right:0,top:0,bottom:0,background:"rgba(255,107,122,0.55)"}}/>
            <div style={{position:"absolute",left:`${Math.max(0,100-pctMax)}%`,top:0,bottom:0,width:2,background:C.gold}}/>
          </>)}
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",...mono,fontSize:13,color:C.text,fontWeight:700}}>{result.immune?"こうかがない":`${ko.pct[0].toFixed(1)}% 〜 ${ko.pct[1].toFixed(1)}%`}</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,alignItems:"center"}}>
          <span style={{...mono,fontSize:13,color:C.muted}}>{result.immune?"":`ダメージ ${ko.min}〜${ko.max}`}</span>
          <span style={{...jp,fontSize:18,fontWeight:800,color:ko.text.includes("1発")?C.good:ko.text.includes("確定2")?C.gold:C.text}}>{ko.text}</span>
        </div>
      </div>
      <p style={{fontSize:11,color:C.muted,marginTop:10,lineHeight:1.6,...jp}}>
        ※Lv50・個体値31固定。テラスタルは現行未解禁のため非搭載。メガは持ち物=メガストーン固定。特性は ちからもち/ヨガパワー/テクニシャン/あついしぼう のみ自動反映（他は持ち物欄の倍率で調整）。連続技・特殊技は威力を簡易化。実戦前に公式ツールでも確認を。
      </p>
    </div>
  );
}

/* ============ 選出サポートタブ ============ */
function SelectionTab(){
  const mons = Object.keys(POKEMON);
  const [myTeam,setMyTeam]=useState(["メガメタグロス","カイリュー","ハバタクカミ","",""]);
  const [oppTeam,setOppTeam]=useState(["バンギラス","モロバレル","テツノカイナ","",""]);

  function bestHit(attacker,defender){
    const a=POKEMON[attacker], d=POKEMON[defender]; if(!a||!d)return null;
    let physAtk=calcStat(a.b[1],"atk",31,32,"攻撃↑",50);
    const specAtk=calcStat(a.b[3],"spa",31,32,"特攻↑",50);
    if(a.mega&&(a.ab==="ちからもち"||a.ab==="ヨガパワー"))physAtk*=2;
    const maxHP=calcStat(d.b[0],"hp",31,0,"無補正",50);
    let best=0,bestMove=null,bestEff=1;
    for(const mv of Object.keys(MOVES)){
      let [mt,mc,mp]=MOVES[mv];
      const eff=typeEff(mt,d.t); if(eff===0)continue;
      if(a.mega&&a.ab==="テクニシャン"&&mp<=60)mp=Math.floor(mp*1.5);
      const stab=a.t.includes(mt)?1.5:1;
      const A=mc==="phys"?physAtk:specAtk;
      const dstat=mc==="phys"?calcStat(d.b[2],"def",31,0,"無補正",50):calcStat(d.b[4],"spd",31,0,"無補正",50);
      const base=Math.floor(Math.floor(Math.floor((2*50/5+2)*mp*A/dstat)/50)+2);
      let dmg=pokeRound(base*stab)*eff;
      if(d.mega&&d.ab==="あついしぼう"&&(mt==="ほのお"||mt==="こおり"))dmg*=0.5;
      const pct=(dmg/maxHP)*100;
      if(pct>best){best=pct;bestMove=mv;bestEff=eff;}
    }
    return {pct:best,move:bestMove,eff:bestEff};
  }

  const my=myTeam.filter(Boolean), opp=oppTeam.filter(Boolean);
  const scores=useMemo(()=>{
    const s={};
    for(const m of my){ let total=0;
      for(const o of opp){ const bh=bestHit(m,o),rev=bestHit(o,m); if(!bh||!rev)continue;
        let cell=bh.pct-rev.pct; if(POKEMON[m].b[5]>POKEMON[o].b[5])cell+=8; total+=cell; }
      s[m]={total:total/Math.max(1,opp.length)}; }
    return s;
  },[myTeam,oppTeam]);
  const ranked=[...my].sort((a,b)=>(scores[b]?.total||0)-(scores[a]?.total||0));
  function verdict(pm,po,sm,so){ const d=pm-po+(sm>so?8:0); if(d>25)return{c:C.good,t:"有利"}; if(d<-25)return{c:C.bad,t:"不利"}; return{c:C.even,t:"五分"}; }
  const megaCount=my.filter(m=>POKEMON[m]?.mega).length;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div style={panelStyle}>
          <div style={{...jp,fontWeight:700,marginBottom:8,color:C.good}}>自分のパーティ</div>
          {myTeam.map((v,i)=><div key={i} style={{marginBottom:6}}><Select value={v} onChange={(nv)=>setMyTeam(t=>t.map((x,j)=>j===i?nv:x))} options={["",...mons].map(m=>({v:m,l:m||"— 空き —"}))}/></div>)}
          {megaCount>1&&<div style={{...jp,fontSize:11,color:C.bad,marginTop:4}}>⚠ メガは1バトル1体まで（{megaCount}体選択中）</div>}
        </div>
        <div style={panelStyle}>
          <div style={{...jp,fontWeight:700,marginBottom:8,color:C.bad}}>相手のパーティ</div>
          {oppTeam.map((v,i)=><div key={i} style={{marginBottom:6}}><Select value={v} onChange={(nv)=>setOppTeam(t=>t.map((x,j)=>j===i?nv:x))} options={["",...mons].map(m=>({v:m,l:m||"— 空き —"}))}/></div>)}
        </div>
      </div>

      <div style={{...panelStyle,marginBottom:12}}>
        <div style={{...jp,fontWeight:700,marginBottom:10,color:C.gold}}>選出おすすめ（相手全体への有利度順）</div>
        {ranked.map((m,i)=>(
          <div key={m} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<ranked.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{...mono,color:C.gold,width:22,fontWeight:700}}>{i+1}</span>
            <span style={{...jp,flex:1,fontWeight:600}}>{m}</span>
            <span style={{display:"flex",gap:3}}>{POKEMON[m].t.map(t=><TypeChip key={t} t={t} small/>)}</span>
            <span style={{...mono,fontSize:12,color:(scores[m]?.total||0)>0?C.good:C.bad,width:56,textAlign:"right"}}>{(scores[m]?.total||0)>0?"+":""}{(scores[m]?.total||0).toFixed(0)}</span>
          </div>
        ))}
        {ranked.length===0&&<div style={{...jp,color:C.muted,fontSize:13}}>パーティを選ぶとおすすめが出ます。</div>}
      </div>

      {my.length>0&&opp.length>0&&(
        <div style={{...panelStyle,overflowX:"auto"}}>
          <div style={{...jp,fontWeight:700,marginBottom:10}}>相性マトリクス（縦：自分 → 横：相手）</div>
          <table style={{borderCollapse:"collapse",fontSize:11,...jp}}>
            <thead><tr><th style={thStyle}></th>{opp.map(o=><th key={o} style={{...thStyle,minWidth:64}}>{o}</th>)}</tr></thead>
            <tbody>{my.map(m=>(
              <tr key={m}>
                <td style={{...thStyle,textAlign:"left",position:"sticky",left:0,background:C.panel}}>{m}</td>
                {opp.map(o=>{ const bh=bestHit(m,o),rev=bestHit(o,m); const vd=verdict(bh.pct,rev.pct,POKEMON[m].b[5],POKEMON[o].b[5]);
                  return <td key={o} style={{border:`1px solid ${C.border}`,padding:"5px 4px",textAlign:"center",background:vd.c+"22"}}><div style={{color:vd.c,fontWeight:700}}>{vd.t}</div><div style={{...mono,color:C.muted,fontSize:10}}>{bh.pct.toFixed(0)}%</div></td>;
                })}
              </tr>
            ))}</tbody>
          </table>
          <p style={{fontSize:11,color:C.muted,marginTop:10,lineHeight:1.6}}>※%は「攻撃特化・相手無振り・最大乱数」での最大打点の目安。素早さ勝ちを加点。持ち物/振り/対面択は未加味の簡易判定です。</p>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [tab,setTab]=useState("dmg");
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,padding:"18px 14px 40px",...jp}}>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <header style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10}}>
            <h1 style={{margin:0,fontSize:20,fontWeight:900,letterSpacing:1}}>ポケチャン計算・選出</h1>
            <span style={{fontSize:11,color:C.muted}}>能力ポイント / メガ対応 / Lv50</span>
          </div>
        </header>
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {[{k:"dmg",l:"ダメージ計算"},{k:"sel",l:"選出サポート"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"10px",borderRadius:9,cursor:"pointer",fontSize:14,fontWeight:700,...jp,background:tab===t.k?C.gold:C.panel,color:tab===t.k?"#12161d":C.muted,border:`1px solid ${tab===t.k?C.gold:C.border}`}}>{t.l}</button>
          ))}
        </div>
        {tab==="dmg"?<DamageTab/>:<SelectionTab/>}
      </div>
    </div>
  );
}
