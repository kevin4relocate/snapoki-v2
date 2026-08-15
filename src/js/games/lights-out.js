import {rngFromSeed,shuffle,scoreFromPerformance,scoreTimeDivisor} from './utils.js';

const LEVEL={easy:{size:5,minMoves:3,maxMoves:5},medium:{size:6,minMoves:9,maxMoves:12},hard:{size:7,minMoves:15,maxMoves:20}};
const PRACTICE_ARIA_HINT='Highlighted cells are one shortest solution; press them in any order.';

export function pressLights(board,size,index){
  const out=Uint8Array.from(board),row=Math.floor(index/size),col=index%size;
  for(const[r,c]of[[row,col],[row-1,col],[row+1,col],[row,col-1],[row,col+1]]){
    if(r<0||c<0||r>=size||c>=size)continue;
    out[r*size+c]^=1;
  }
  return out;
}

export function solveLightsOut(board,size){
  let best=null;
  for(let mask=0;mask<(1<<size);mask++){
    let work=Uint8Array.from(board);
    const presses=[];
    for(let c=0;c<size;c++)if(mask&(1<<c)){
      work=pressLights(work,size,c);
      presses.push(c);
    }
    for(let r=1;r<size;r++)for(let c=0;c<size;c++)if(work[(r-1)*size+c]){
      const idx=r*size+c;
      work=pressLights(work,size,idx);
      presses.push(idx);
    }
    if([...work].some(Boolean))continue;
    if(!best||presses.length<best.length)best=presses;
  }
  return best;
}

export function generateLightsOut(difficulty='easy',seed='lights-out'){
  const cfg=LEVEL[difficulty]||LEVEL.easy,rng=rngFromSeed(`${seed}:generator:v3`);
  let fallback=null,distanceBest=Infinity;
  const attempts=difficulty==='hard'?420:difficulty==='medium'?280:180;
  for(let attempt=0;attempt<attempts;attempt++){
    const pool=shuffle(Array.from({length:cfg.size*cfg.size},(_,i)=>i),rng),desired=cfg.minMoves+Math.floor(rng()*(cfg.maxMoves-cfg.minMoves+5));
    let board=new Uint8Array(cfg.size*cfg.size);
    for(const index of pool.slice(0,desired))board=pressLights(board,cfg.size,index);
    if(![...board].some(Boolean))continue;
    const solution=solveLightsOut(board,cfg.size);
    if(!solution)continue;
    const distance=solution.length<cfg.minMoves?cfg.minMoves-solution.length:solution.length>cfg.maxMoves?solution.length-cfg.maxMoves:0;
    if(distance<distanceBest){
      distanceBest=distance;
      fallback={size:cfg.size,board:Array.from(board),seed,difficulty,solution,minimumMoves:solution.length};
    }
    if(distance===0)return fallback;
  }
  return fallback;
}

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateLightsOut(difficulty,seed),initial=Uint8Array.from(puzzle.board),timeDivisor=scoreTimeDivisor('lights-out',difficulty);
  let board=Uint8Array.from(initial),moves=0,pressTrace=[],hinted=null,hintEffects=new Set(),solutionSet=new Set(),solutionVisible=false,practice=false,complete=false,hintUses=0,previewSource=null,previewEffects=new Set(),hintTimer=null;

  host.innerHTML=`<div class="lights-grid" style="--grid-size:${puzzle.size}" aria-label="Lights Out board"></div>`;
  const grid=host.querySelector('.lights-grid');
  grid.setAttribute('aria-description',PRACTICE_ARIA_HINT);

  const effectIndices=index=>{
    const row=Math.floor(index/puzzle.size),col=index%puzzle.size,out=[];
    for(const[r,c]of[[row,col],[row-1,col],[row+1,col],[row,col-1],[row,col+1]])if(r>=0&&c>=0&&r<puzzle.size&&c<puzzle.size)out.push(r*puzzle.size+c);
    return out;
  };

  for(let i=0;i<board.length;i++){
    const cell=document.createElement('button');
    cell.type='button';
    cell.className='light-cell';
    cell.dataset.index=String(i);
    cell.setAttribute('aria-label',`Light row ${Math.floor(i/puzzle.size)+1}, column ${i%puzzle.size+1}`);

    const preview=document.createElement('span');
    preview.className='light-effect-preview';
    Object.assign(preview.style,{position:'absolute',inset:'7px',borderRadius:'8px',border:'1px solid rgba(143,165,255,.42)',boxShadow:'inset 0 0 14px rgba(143,165,255,.08)',opacity:'0',pointerEvents:'none',transition:'opacity .12s ease,border-color .12s ease',zIndex:'2'});

    const target=document.createElement('span');
    target.className='light-target-marker';
    Object.assign(target.style,{position:'absolute',left:'50%',top:'50%',width:'28%',aspectRatio:'1',transform:'translate(-50%,-50%) scale(.82)',border:'2px solid var(--primary-2)',borderRadius:'50%',background:'radial-gradient(circle,var(--primary-2) 0 17%,transparent 20%)',boxShadow:'0 0 0 5px rgba(40,201,245,.10),0 0 16px rgba(40,201,245,.28)',opacity:'0',pointerEvents:'none',transition:'opacity .14s ease,transform .14s ease,border-color .14s ease,box-shadow .14s ease',zIndex:'3'});

    cell.append(preview,target);
    grid.appendChild(cell);
  }

  const litCount=()=>[...board].filter(Boolean).length;
  const cellAt=index=>grid.querySelector(`[data-index="${index}"]`);

  function lockSolution(){
    solutionSet=new Set();
    if(!solutionVisible||complete)return;
    for(const index of solveLightsOut(board,puzzle.size)||[])solutionSet.add(index);
  }

  function clearPreview(){
    previewSource=null;
    previewEffects=new Set();
  }

  function showPreview(index){
    if(complete||index==null||index<0)return;
    previewSource=index;
    previewEffects=new Set(effectIndices(index));
    render();
  }

  function render(){
    grid.querySelectorAll('.light-cell').forEach(cell=>{
      const idx=Number(cell.dataset.index),isHint=hinted===idx,isSolutionTarget=solutionVisible&&solutionSet.has(idx),isPreview=previewEffects.has(idx),isPreviewSource=previewSource===idx,isHintEffect=hintEffects.has(idx);
      cell.classList.toggle('on',Boolean(board[idx]));
      cell.classList.toggle('hinted',isHint);
      cell.classList.toggle('solution-press',isSolutionTarget);
      cell.disabled=complete;
      cell.setAttribute('aria-pressed',String(Boolean(board[idx])));
      cell.setAttribute('aria-label',`Light row ${Math.floor(idx/puzzle.size)+1}, column ${idx%puzzle.size+1}${isHint?' — recommended press':''}${isSolutionTarget?' — solution target':''}`);

      const preview=cell.querySelector('.light-effect-preview');
      if(preview){
        preview.style.opacity=isPreview||isHintEffect?'1':'0';
        preview.style.borderColor=isHintEffect?'rgba(55,217,154,.48)':isPreviewSource?'rgba(143,165,255,.68)':'rgba(143,165,255,.34)';
        preview.style.boxShadow=isHintEffect?'inset 0 0 16px rgba(55,217,154,.10)':'inset 0 0 14px rgba(143,165,255,.08)';
      }

      const target=cell.querySelector('.light-target-marker');
      if(target){
        const visible=isHint||isSolutionTarget;
        target.style.opacity=visible?'1':'0';
        target.style.transform=`translate(-50%,-50%) scale(${visible?'1':'.82'})`;
        target.style.borderColor=isHint?'var(--success)':'var(--primary-2)';
        target.style.background=isHint?'radial-gradient(circle,var(--success) 0 17%,transparent 20%)':'radial-gradient(circle,var(--primary-2) 0 17%,transparent 20%)';
        target.style.boxShadow=isHint?'0 0 0 5px rgba(55,217,154,.11),0 0 18px rgba(55,217,154,.34)':'0 0 0 5px rgba(40,201,245,.10),0 0 16px rgba(40,201,245,.28)';
      }
    });
    onMetrics({moves,lit:litCount()});
  }

  function updatePracticeStatus(){
    onStatus(solutionVisible&&solutionSet.size?`${solutionSet.size} target${solutionSet.size===1?'':'s'} remaining.`:'');
  }

  function finish(){
    complete=true;
    solutionSet=new Set();
    clearPreview();
    host.classList.add('game-solved-bloom');
    render();
    if(practice){
      onStatus('');
      onPracticeComplete('Lights Out practice complete. Reset to solve this board again, or start a New Puzzle.');
    }else{
      onStatus('All lights are off.');
      onComplete();
    }
  }

  function press(index){
    if(complete)return;
    const guidedPress=solutionVisible&&solutionSet.has(index),cell=cellAt(index);
    cell?.classList.remove('press-pop');
    void cell?.offsetWidth;
    cell?.classList.add('press-pop');
    setTimeout(()=>cell?.classList.remove('press-pop'),220);

    board=pressLights(board,puzzle.size,index);
    moves++;
    pressTrace.push(index);
    hinted=null;
    hintEffects=new Set();
    clearPreview();

    if(solutionVisible){
      if(guidedPress)solutionSet.delete(index);
      else lockSolution();
      if(!solutionSet.size&&litCount()>0)lockSolution();
    }

    render();
    if(litCount()===0)finish();
    else if(solutionVisible)updatePracticeStatus();
    else onStatus('');
  }

  grid.addEventListener('click',event=>{
    if(complete)return;
    const cell=event.target.closest('.light-cell');
    if(cell)press(Number(cell.dataset.index));
  });

  grid.addEventListener('pointerover',event=>{
    const cell=event.target.closest('.light-cell');
    if(!cell||complete)return;
    showPreview(Number(cell.dataset.index));
  });
  grid.addEventListener('pointerleave',()=>{
    if(!previewEffects.size)return;
    clearPreview();
    render();
  });
  grid.addEventListener('pointerdown',event=>{
    const cell=event.target.closest('.light-cell');
    if(cell&&!complete)showPreview(Number(cell.dataset.index));
  });
  grid.addEventListener('pointerup',()=>{
    clearPreview();
  });
  grid.addEventListener('pointercancel',()=>{
    clearPreview();
    render();
  });

  onMetrics({moves:0,lit:litCount(),hints:0});
  onStatus('');
  render();

  return{
    supportsUndo:false,
    reset(){
      host.classList.remove('game-solved-bloom');
      if(hintTimer)clearTimeout(hintTimer);
      board=Uint8Array.from(initial);
      moves=0;
      pressTrace=[];
      hinted=null;
      hintEffects=new Set();
      solutionVisible=false;
      practice=false;
      complete=false;
      solutionSet=new Set();
      hintUses=0;
      clearPreview();
      render();
      onStatus('');
    },
    hint(){
      if(complete||solutionVisible)return false;
      const solution=solveLightsOut(board,puzzle.size)||[],next=solution[0]??null;
      if(next==null)return false;
      hintUses++;
      hinted=next;
      hintEffects=new Set(effectIndices(next));
      clearPreview();
      render();
      onStatus('');
      const marker=cellAt(next)?.querySelector('.light-target-marker');
      marker?.animate?.([{transform:'translate(-50%,-50%) scale(.82)',opacity:.55},{transform:'translate(-50%,-50%) scale(1.12)',opacity:1},{transform:'translate(-50%,-50%) scale(1)',opacity:1}],{duration:520,easing:'ease-out'});
      if(hintTimer)clearTimeout(hintTimer);
      hintTimer=setTimeout(()=>{
        if(!complete&&!solutionVisible){
          hinted=null;
          hintEffects=new Set();
          render();
        }
      },4200);
      return true;
    },
    solution(){
      if(complete)return;
      if(hintTimer)clearTimeout(hintTimer);
      practice=true;
      solutionVisible=true;
      hinted=null;
      hintEffects=new Set();
      clearPreview();
      lockSolution();
      render();
      updatePracticeStatus();
    },
    hideSolution(){
      if(complete)return;
      solutionVisible=false;
      hinted=null;
      hintEffects=new Set();
      solutionSet=new Set();
      clearPreview();
      render();
      onStatus('');
    },
    previewScore(timeMs,hints=0){
      return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.minimumMoves)*65,hintPenalty:hints*190});
    },
    getResult(timeMs,hints=0){
      return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-puzzle.minimumMoves)*65,hintPenalty:hints*190}),metadata:{moves,minimum_moves:puzzle.minimumMoves,size:puzzle.size,presses:[...pressTrace]}};
    },
    destroy(){
      if(hintTimer)clearTimeout(hintTimer);
      host.classList.remove('game-solved-bloom');
    }
  };
}
