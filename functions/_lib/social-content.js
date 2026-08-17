import {GAMES} from '../../src/js/games-config.js';

const ANGLES=['challenge','strategy','no-hint','pattern','speed','daily','mistake'];
const TAGS='#puzzle #braintraining #logicgame #puzzlegame #Snapoki';

function hash(text) {
  let value=2166136261;
  for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619);}
  return value>>>0;
}

function xCopy(text,url) {
  const suffix=`\n\n${url}`;
  let value=String(text||'').replaceAll(url,'').trim();
  if(value.length+suffix.length>280)value=value.slice(0,280-suffix.length).trimEnd();
  return `${value}${suffix}`.slice(0,280);
}

export function contentDate(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=type=>parts.find(part=>part.type===type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function gameInsight(game) {
  return game.socialInsight||game.description||`Read the full ${game.name} board before committing to the move that looks easiest.`;
}

function angleCopy(angle,game) {
  const hard=game.levels.find(([key])=>key==='hard')?.[2]||'expert challenge';
  const copy={
    challenge:{headline:`Can you solve today’s Hard ${game.name}?`,hook:`Today’s challenge: ${game.name} on Hard.`,body:`${hard}. No shortcuts — read the whole board before committing.`},
    strategy:{headline:`One rule that makes ${game.name} easier`,hook:`A small strategy change can completely change how you see ${game.name}.`,body:gameInsight(game)},
    'no-hint':{headline:`Hard ${game.name}. No hints.`,hook:`Try one Hard ${game.name} without using Hint.`,body:'If you get stuck, reset your assumptions before resetting the board.'},
    pattern:{headline:'What pattern do you notice first?',hook:`Before making your first move in ${game.name}, look for the board’s strongest constraint.`,body:gameInsight(game)},
    speed:{headline:`Can you beat your best ${game.name} time?`,hook:`Speed comes after recognition. Today, solve ${game.name} once for accuracy — then replay for time.`,body:`Hard: ${hard}.`},
    daily:{headline:'Your daily puzzle break is ready',hook:`A fresh ${game.name} challenge is waiting on Snapoki.`,body:'Play a quick round, then try Hard if you want the board that demands the most planning.'},
    mistake:{headline:'The first move can be the trap',hook:`In ${game.name}, the move that looks easiest first can create the hardest problem later.`,body:gameInsight(game)}
  };
  return copy[angle];
}

export function buildDailyContent(date,variant=0) {
  const seed=hash(`${date}:${variant}`);
  const game=GAMES[seed%GAMES.length];
  const angle=ANGLES[Math.floor(seed/GAMES.length)%ANGLES.length];
  const copy=angleCopy(angle,game);
  const url=`https://snapoki.com/${game.slug}/`;
  const linkedIn=`${copy.hook}\n\n${copy.body}\n\nWhat would you try first?\n\nPlay free: ${url}`;
  const instagram=`${copy.headline}\n\n${copy.body}\n\nSave this for your next puzzle break.\n\nPlay: ${url}\n\n${TAGS}`;
  return {
    date,
    variant,
    game:{key:game.key,name:game.name,slug:game.slug,category:game.category},
    angle,
    headline:copy.headline,
    insight:copy.body,
    url,
    linkedIn,
    x:xCopy(`${copy.headline}\n\n${copy.body}`,url),
    instagram,
    image:{format:'1080x1080',title:copy.headline,watermark:'snapoki.com'}
  };
}
