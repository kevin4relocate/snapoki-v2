const INITIAL_STATUS={
  maze:'Reach the green finish. Hard boards hide the correct route behind deeper branch traps and tighter decisions.',
  'number-path':'Start at 1. Checkpoints must match their exact path step. Regular Play allows contradictions so you can reason, notice them and Undo yourself.'
};

const NUMBER_PATH_PROGRESS=/^Step (\d+) of (\d+)\. Next checkpoint: (\d+)\.$/;
const NUMBER_PATH_BACKTRACK=/^Backtracked to step (\d+)\.$/;
const progressHistory=new WeakMap();

function progressHtml(step,total,next){
  const totalText=total?` / ${total}`:'';
  const nextHtml=next?`<span class="board-progress-next">Next checkpoint <b>${next}</b></span>`:'<span class="board-progress-next">Backtracked</span>';
  return `<span class="board-progress-step">Step <b>${step}</b>${totalText}</span>${nextHtml}`;
}

export function presentGameStatus(gameKey,value=''){
  let text=String(value||'');
  if(text&&INITIAL_STATUS[gameKey]===text)text='';
  if(!text)return{hidden:true,type:'',text:'',html:''};
  if(gameKey==='number-path'){
    const match=text.match(NUMBER_PATH_PROGRESS);
    if(match)return{
      hidden:false,
      type:'progress',
      text,
      step:Number(match[1]),
      total:Number(match[2]),
      next:Number(match[3]),
      html:progressHtml(match[1],match[2],match[3])
    };
    const backtrack=text.match(NUMBER_PATH_BACKTRACK);
    if(backtrack)return{
      hidden:false,
      type:'progress',
      text,
      backtracked:true,
      step:Number(backtrack[1]),
      html:progressHtml(backtrack[1],null,null)
    };
  }
  return{hidden:false,type:'',text,html:''};
}

function resetProgressHistory(element){progressHistory.delete(element);}

export function renderGameStatus(element,gameKey,value=''){
  if(!element)return;
  const text=String(value||'');
  if(gameKey==='number-path'&&(INITIAL_STATUS[gameKey]===text||text.startsWith('Path reset.')))resetProgressHistory(element);
  let view=presentGameStatus(gameKey,text);

  if(gameKey==='number-path'&&view.type==='progress'){
    let history=progressHistory.get(element);
    if(!history){history={steps:new Map(),last:null};progressHistory.set(element,history);}
    if(view.backtracked){
      const snapshot=history.steps.get(view.step)||history.last;
      if(snapshot)view={...view,html:progressHtml(view.step,snapshot.total,snapshot.next)};
    }else if(view.total&&view.next){
      const snapshot={total:view.total,next:view.next};
      history.steps.set(view.step,snapshot);
      history.last=snapshot;
    }
  }

  element.classList.toggle('is-progress',view.type==='progress');
  element.hidden=view.hidden;
  if(view.html)element.innerHTML=view.html;
  else element.textContent=view.text;
}
