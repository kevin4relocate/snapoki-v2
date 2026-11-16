import {clamp,rngFromSeed} from '../games/utils.js';

const EDGE={minX:.085,maxX:.915,minY:.13,maxY:.77};
const SPEED={easy:.032,medium:.050,hard:.072};
export const SWIM_SPEED=Object.freeze(SPEED);

function chooseTarget(swimmer){
  const r=swimmer.random;
  swimmer.targetX=EDGE.minX+.04+r()*(EDGE.maxX-EDGE.minX-.08);
  swimmer.targetY=EDGE.minY+.02+r()*(EDGE.maxY-EDGE.minY-.05);
  swimmer.targetAge=3+r()*5;
}

export function createSwimmers(animals,seed='aquarium:preview'){
  if(!Array.isArray(animals)||animals.length<4||animals.length>12)
    throw new RangeError('An aquarium must contain 4–12 swimmers');
  const rand=rngFromSeed(String(seed)+':swim');
  return animals.map((creature,index)=>{
    const random=rngFromSeed(String(seed)+':'+creature.code+':'+index);
    const swimmer={
      ...creature,index,
      x:clamp(.13+((index*.61803398875+rand()*.11)%1)*.72,EDGE.minX,EDGE.maxX),
      y:clamp(.17+(index+.5)/animals.length*.54+(rand()-.5)*.028,EDGE.minY,EDGE.maxY),
      vx:(index%2?-.032:.032),vy:0,angle:0,
      targetX:.5,targetY:.5,targetAge:0,phase:random()*6.283,
      size:.82+random()*.42,depth:.65+random()*.35,
      random,element:null
    };
    chooseTarget(swimmer);
    return swimmer;
  });
}

/** Independent 2-D wandering with soft boundary steering and gentle separation.
 * dt is in seconds; no fish gains a species-specific speed advantage.
 * A fixed upper dt avoids teleports after background-tab suspension.
 */
export function stepSwimmers(swimmers,dt=1/60,mode='medium'){
  if(!swimmers.length||!Number.isFinite(dt)||dt<=0)return swimmers;
  const seconds=clamp(dt,0,.05),speed=SPEED[mode]||SPEED.medium;
  const previous=swimmers.map(s=>({x:s.x,y:s.y}));
  for(let i=0;i<swimmers.length;i++){
    const s=swimmers[i];
    s.targetAge-=seconds;
    const dx=s.targetX-s.x,dy=s.targetY-s.y;
    if(s.targetAge<=0||(dx*dx+dy*dy)<.004){chooseTarget(s);}
    let desiredX=s.targetX-s.x,desiredY=(s.targetY-s.y)*.76;
    const length=Math.hypot(desiredX,desiredY)||1;
    desiredX=desiredX/length*speed;
    desiredY=desiredY/length*speed*.62;
    // Local separation is intentionally weak; avoid flicker and sudden turns.
    let repelX=0,repelY=0;
    for(let j=0;j<previous.length;j++){
      if(j===i)continue;
      const ox=s.x-previous[j].x,oy=s.y-previous[j].y,dist2=ox*ox+oy*oy;
      if(dist2>1e-6&&dist2<.012){
        const weight=(.012-dist2)/.012;
        repelX+=ox/Math.sqrt(dist2)*weight;
        repelY+=oy/Math.sqrt(dist2)*weight;
      }
    }
    desiredX+=clamp(repelX,-1,1)*speed*.38;
    desiredY+=clamp(repelY,-1,1)*speed*.27;
    if(s.x<EDGE.minX+.05)desiredX=Math.max(desiredX,speed*.55);
    if(s.x>EDGE.maxX-.05)desiredX=Math.min(desiredX,-speed*.55);
    if(s.y<EDGE.minY+.055)desiredY=Math.max(desiredY,speed*.35);
    if(s.y>EDGE.maxY-.055)desiredY=Math.min(desiredY,-speed*.35);
    const easing=Math.min(1,seconds*1.8);
    s.vx+=(desiredX-s.vx)*easing;
    s.vy+=(desiredY-s.vy)*easing;
    s.x=clamp(s.x+s.vx*seconds,EDGE.minX,EDGE.maxX);
    s.y=clamp(s.y+s.vy*seconds+Math.sin(s.phase)*.0004*seconds,EDGE.minY,EDGE.maxY);
    s.phase+=seconds*(1.0+s.depth*.65);
    s.angle=clamp(Math.atan2(s.vy,s.vx)*180/Math.PI*.16,-12,12);
  }
  return swimmers;
}

export function safeSwimSelection(theme,raw){
  let parsed=null;
  try{parsed=JSON.parse(raw||'null');}catch{}
  const available=new Set(theme.items.map(item=>item.code));
  const chosen=Array.isArray(parsed)?[...new Set(parsed.filter(code=>typeof code==='string'&&available.has(code)))].slice(0,12):[];
  return chosen.length>=4?chosen:[...theme.defaultCodes];
}
