const INITIAL_STATUS={
  maze:'Reach the green finish. Hard boards hide the correct route behind deeper branch traps and tighter decisions.',
  'number-path':'Start at 1. Checkpoints must match their exact path step. Regular Play allows contradictions so you can reason, notice them and Undo yourself.'
};

const NUMBER_PATH_PROGRESS=/^Step (\d+) of (\d+)\. Next checkpoint: (\d+)\.$/;

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
      html:`<span class="board-progress-step">Step <b>${match[1]}</b> / ${match[2]}</span><span class="board-progress-next">Next checkpoint <b>${match[3]}</b></span>`
    };
  }
  return{hidden:false,type:'',text,html:''};
}

export function renderGameStatus(element,gameKey,value=''){
  if(!element)return;
  const view=presentGameStatus(gameKey,value);
  element.classList.toggle('is-progress',view.type==='progress');
  element.hidden=view.hidden;
  if(view.html)element.innerHTML=view.html;
  else element.textContent=view.text;
}
