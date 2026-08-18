import {scoreFromPerformance,scoreTimeDivisor} from './utils.js';
import {generateBridges,edgeIndexBetween,islandBridgeCounts,validateBridgesState,bridgeNetworkComponents,explainBridgesHint} from './bridges-core.js';
export {generateBridges} from './bridges-core.js';

const SVG_NS='http://www.w3.org/2000/svg';
const el=(name,attrs={})=>{const node=document.createElementNS(SVG_NS,name);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;};

export function createGame({host,difficulty,seed,onMetrics,onStatus,onComplete,onPracticeComplete=()=>{}}){
  const puzzle=generateBridges(difficulty,seed),timeDivisor=scoreTimeDivisor('bridges',difficulty),initial=Array(puzzle.edges.length).fill(0),idealMoves=puzzle.solution.reduce((sum,value)=>sum+value,0);
  let counts=[...initial],actions=[],moves=0,selected=null,currentHint=null,solutionVisible=false,practice=false,complete=false,toastTimer=null;
  host.innerHTML='<div class="bridges-stage"><div class="bridges-onboarding" data-bridges-coach-state="ready"><div class="bridges-onboarding-copy"><b data-bridges-coach-title>Tap an island to start</b><span id="bridgesInstructions" data-bridges-coach-text>Island → island adds bridges. Tap an existing bridge to remove one.</span></div><div class="bridges-onboarding-actions"><div class="bridges-progress-pill" aria-label="Puzzle progress"><span><b data-bridges-matched>0/0</b><small>MATCHED</small></span><i></i><span><b data-bridges-network>0/0</b><small>NETWORK</small></span></div><button type="button" class="button button-secondary bridges-hint-apply" data-apply-bridge-hint hidden>Apply Hint</button></div></div><div class="bridges-board-wrap"><div class="bridges-toast" role="status" aria-live="polite" hidden><span class="bridges-toast-icon" aria-hidden="true">!</span><span data-bridges-toast-text></span></div><svg class="bridges-board" role="application" aria-label="Bridges puzzle board. Select two highlighted islands to add a bridge. Tap an existing bridge to remove one. Use Tab or arrow keys to move between islands, then Enter or Space to select." aria-describedby="bridgesInstructions"></svg></div></div>';
  const stage=host.querySelector('.bridges-stage'),coach=host.querySelector('.bridges-onboarding'),coachTitle=host.querySelector('[data-bridges-coach-title]'),coachText=host.querySelector('[data-bridges-coach-text]'),svg=host.querySelector('.bridges-board'),hintApply=host.querySelector('[data-apply-bridge-hint]'),toast=host.querySelector('.bridges-toast'),toastText=host.querySelector('[data-bridges-toast-text]'),matchedValue=host.querySelector('[data-bridges-matched]'),networkValue=host.querySelector('[data-bridges-network]');
  const size=1000,denseBoard=puzzle.size>=11,pad=denseBoard?48:82,step=(size-pad*2)/(puzzle.size-1),haloRadius=denseBoard?38:49,progressRadius=denseBoard?35:40,islandRadius=denseBoard?29:31;svg.setAttribute('viewBox',`0 0 ${size} ${size}`);svg.dataset.density=denseBoard?'compact':'standard';
  const point=island=>({x:pad+island.col*step,y:pad+island.row*step});
  const edgeGroups=[],islandGroups=[],progressRings=[];
  const setCoach=(title,message,state='ready')=>{coachTitle.textContent=title;coachText.textContent=message;coach.dataset.bridgesCoachState=state;};
  const hideToast=()=>{toast.hidden=true;};
  const showToast=message=>{if(!message)return;toastText.textContent=message;toast.hidden=false;if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(hideToast,3200);};
  const totals=()=>islandBridgeCounts(puzzle,counts);
  const addTargetIsValid=edgeIndex=>{if(edgeIndex<0||counts[edgeIndex]>=2)return false;const probe=[...counts];probe[edgeIndex]=counts[edgeIndex]+1;return validateBridgesState(puzzle,probe).ok;};
  const hintActionLabel=hint=>{if(!hint)return'';const current=Number(counts[hint.edgeIndex]||0),target=Number(hint.target||0);if(target<current)return current-target>1?'REMOVE BRIDGE':'REMOVE 1 BRIDGE';if(target===2&&current===0)return'ADD DOUBLE BRIDGE';if(target===2&&current===1)return'MAKE DOUBLE BRIDGE';return'ADD 1 BRIDGE';};
  function bridgeLine(group,edge,count,ghost=false,ghostOffset=0){
    while(group.firstChild)group.removeChild(group.firstChild);
    const a=point(puzzle.islands[edge.a]),b=point(puzzle.islands[edge.b]),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,offset=count===2?8:0;
    const make=(off,cls)=>{const line=el('line',{x1:a.x+nx*off,y1:a.y+ny*off,x2:b.x+nx*off,y2:b.y+ny*off,class:cls});group.appendChild(line);};
    if(ghost){if(count===1)make(ghostOffset,'bridge-solution-line');else if(count===2){make(-8,'bridge-solution-line');make(8,'bridge-solution-line');}return;}
    if(count===1)make(0,'bridge-active-line');else if(count===2){make(-offset,'bridge-active-line');make(offset,'bridge-active-line');}
    group.appendChild(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'bridge-hit-line','data-edge':edge.id,'aria-hidden':'true'}));
  }
  const guideLayer=el('g',{class:'bridges-guide-layer','aria-hidden':'true'}),solutionLayer=el('g',{class:'bridges-solution-layer','aria-hidden':'true'}),edgeLayer=el('g',{class:'bridges-edge-layer'}),islandLayer=el('g',{class:'bridges-island-layer'});svg.append(guideLayer,solutionLayer,edgeLayer,islandLayer);
  puzzle.edges.forEach(()=>{const group=el('g',{class:'bridges-edge'});edgeLayer.appendChild(group);edgeGroups.push(group);const sg=el('g',{class:'bridges-solution-edge'});solutionLayer.appendChild(sg);});
  puzzle.islands.forEach((island,index)=>{
    const p=point(island),group=el('g',{class:'bridges-island',tabindex:'0',role:'button','data-island':index,'aria-label':`Island ${island.clue}, row ${island.row+1}, column ${island.col+1}`}),halo=el('circle',{cx:p.x,cy:p.y,r:haloRadius,class:'bridges-island-halo'}),progress=el('circle',{cx:p.x,cy:p.y,r:progressRadius,class:'bridges-island-progress',pathLength:'100',transform:`rotate(-90 ${p.x} ${p.y})`}),circle=el('circle',{cx:p.x,cy:p.y,r:islandRadius,class:'bridges-island-circle'}),text=el('text',{x:p.x,y:p.y+1,class:'bridges-island-number','text-anchor':'middle','dominant-baseline':'central'});
    text.textContent=String(island.clue);group.append(halo,progress,circle,text);islandLayer.appendChild(group);islandGroups.push(group);progressRings.push(progress);
  });
  function renderGuides(){
    while(guideLayer.firstChild)guideLayer.removeChild(guideLayer.firstChild);
    if(currentHint){const edge=puzzle.edges[currentHint.edgeIndex],a=point(puzzle.islands[edge.a]),b=point(puzzle.islands[edge.b]);guideLayer.appendChild(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'bridge-hint-guide-line'}));}
    if(selected==null)return;
    for(let edgeIndex=0;edgeIndex<puzzle.edges.length;edgeIndex++){
      const edge=puzzle.edges[edgeIndex];if((edge.a!==selected&&edge.b!==selected)||!addTargetIsValid(edgeIndex))continue;
      const a=point(puzzle.islands[edge.a]),b=point(puzzle.islands[edge.b]);guideLayer.appendChild(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'bridge-guide-line'}));
    }
  }
  function progressState(sum=totals()){
    const components=bridgeNetworkComponents(puzzle,counts),matched=sum.filter((value,index)=>value===puzzle.islands[index].clue).length,largest=components.reduce((max,component)=>Math.max(max,component.length),0),total=puzzle.islands.length;
    return{matched,largest,total,allMatched:matched===total,networkComplete:largest===total};
  }
  function render(){
    const sum=totals(),progressStateNow=progressState(sum);renderGuides();
    puzzle.edges.forEach((edge,index)=>{
      const target=puzzle.solution[index],current=counts[index],different=current!==target,missing=Math.max(0,target-current),ghostOffset=current===1&&target===2?10:0,selectedTouches=edge.a===selected||edge.b===selected;
      bridgeLine(edgeGroups[index],edge,current,false);bridgeLine(solutionLayer.children[index],edge,solutionVisible&&different?missing:0,true,ghostOffset);
      edgeGroups[index].classList.toggle('is-hinted',currentHint?.edgeIndex===index);edgeGroups[index].classList.toggle('is-active',current>0);edgeGroups[index].classList.toggle('is-removable',selected!=null&&selectedTouches&&current>0);edgeGroups[index].classList.toggle('is-solution-wrong',solutionVisible&&current>0&&different);edgeGroups[index].classList.toggle('is-solution-correct',solutionVisible&&current>0&&!different);
    });
    puzzle.islands.forEach((island,index)=>{
      const group=islandGroups[index],value=sum[index],remaining=Math.max(0,island.clue-value),satisfied=value===island.clue,inProgress=value>0&&!satisfied,ratio=island.clue?Math.min(1,value/island.clue):0;
      progressRings[index].setAttribute('stroke-dashoffset',String(100-ratio*100));
      group.classList.toggle('is-selected',selected===index);group.classList.toggle('is-satisfied',satisfied);group.classList.toggle('is-progress',inProgress);group.classList.toggle('is-hint',currentHint&&(puzzle.edges[currentHint.edgeIndex].a===index||puzzle.edges[currentHint.edgeIndex].b===index));
      let target=false;if(selected!=null&&selected!==index){const edgeIndex=edgeIndexBetween(puzzle,selected,index);target=edgeIndex>=0&&addTargetIsValid(edgeIndex);}group.classList.toggle('is-target',target);
      group.setAttribute('aria-label',`Island ${island.clue}; ${value} of ${island.clue} bridges${satisfied?'; matched':`; ${remaining} remaining`}${target?'; valid target':''}`);
    });
    if(matchedValue)matchedValue.textContent=`${progressStateNow.matched}/${progressStateNow.total}`;if(networkValue)networkValue.textContent=`${progressStateNow.largest}/${progressStateNow.total}`;if(hintApply)hintApply.hidden=!currentHint;
    stage.classList.toggle('needs-network-fix',progressStateNow.allMatched&&!progressStateNow.networkComplete);stage.classList.toggle('network-complete',progressStateNow.networkComplete);
    onMetrics({moves,links:counts.filter(Boolean).length,solved:progressStateNow.matched});
  }
  function finishIfSolved(){
    const result=validateBridgesState(puzzle,counts,{complete:true});if(!result.ok)return false;
    complete=true;selected=null;currentHint=null;hideToast();stage.classList.add('is-complete');host.classList.add('game-solved-bloom');setCoach('Network complete','Every island matches its number and belongs to one connected network.','success');render();
    if(practice){onStatus('');onPracticeComplete('Bridges practice complete. Every island is matched inside one connected network.');}else{onStatus('');onComplete();}return true;
  }
  function statusAfterMove(fromHint=false){
    const stateNow=progressState();onStatus('');
    if(stateNow.allMatched&&!stateNow.networkComplete){setCoach('Numbers matched — network still split',`Largest group: ${stateNow.largest}/${stateNow.total} islands. Tap a bridge to remove it, then reconnect the groups.`,'warning');return;}
    if(fromHint){setCoach('Hint applied','Use the updated island counts to reason about the next connection.','hint');return;}
    setCoach('Keep building the network','Select an island to add a bridge. Tap any existing bridge to remove one.','ready');
  }
  function blockedCopy(validity){
    if(validity?.island!=null){const island=puzzle.islands[validity.island],value=totals()[validity.island];return `Island ${island.clue} is full (${value}/${island.clue}). Tap one of its bridges to remove one.`;}
    if(validity?.reason==='Bridges cannot cross.')return 'Bridges can’t cross. Remove or reroute another bridge.';
    return validity?.reason||'That bridge cannot be added here.';
  }
  function setEdge(edgeIndex,next,{fromHint=false}={}){
    if(complete||edgeIndex<0)return false;const current=counts[edgeIndex];if(next===current)return false;
    if(next<0||next>2){showToast('Only two bridges can connect the same pair of islands.');return false;}
    const probe=[...counts];probe[edgeIndex]=next;const validity=validateBridgesState(puzzle,probe);
    if(!validity.ok){showToast(blockedCopy(validity));edgeGroups[edgeIndex]?.classList.add('is-rejected');setTimeout(()=>edgeGroups[edgeIndex]?.classList.remove('is-rejected'),360);return false;}
    counts=probe;moves++;actions.push(`${edgeIndex}:${next}`);selected=null;currentHint=null;hideToast();render();if(!finishIfSolved())statusAfterMove(fromHint);return true;
  }
  function addEdge(edgeIndex){const current=counts[edgeIndex];if(current>=2){showToast('This pair already has two bridges. Tap the bridge itself to remove one.');return false;}return setEdge(edgeIndex,current+1);}
  function removeEdge(edgeIndex){const current=counts[edgeIndex];if(current<=0)return false;const changed=setEdge(edgeIndex,current-1);if(changed){const left=current-1;setCoach(left?'One bridge remains':'Bridge removed',left?'Tap the bridge again to remove the last one, or select an island to keep solving.':'Select an island to add a new connection.','ready');}return changed;}
  function validTargets(index){const targets=[];puzzle.edges.forEach((edge,edgeIndex)=>{if((edge.a===index||edge.b===index)&&addTargetIsValid(edgeIndex))targets.push(edge.a===index?edge.b:edge.a);});return targets;}
  function remainingFor(index){const sum=totals();return puzzle.islands[index].clue-sum[index];}
  function selectIsland(index){
    if(complete)return;
    if(selected==null){
      selected=index;hideToast();const island=puzzle.islands[index],current=island.clue-remainingFor(index),remaining=Math.max(0,remainingFor(index)),targets=validTargets(index);
      if(remaining===0)setCoach(`Island ${island.clue} is full (${current}/${island.clue})`,'Tap one of its glowing bridges to remove one, or choose another island.','full');
      else if(targets.length)setCoach(`Island ${island.clue} needs ${remaining} more ${remaining===1?'bridge':'bridges'}`,'Tap a glowing island to add one bridge. Repeat the same pair for a double bridge.','selected');
      else{setCoach(`Island ${island.clue} has no open target`,'Remove or reroute another bridge first, then try this island again.','warning');showToast('No valid target is available from this island yet. Remove or reroute another bridge first.');}
      render();return;
    }
    if(selected===index){selected=null;setCoach('Selection cleared','Select an island to add a bridge. Tap an existing bridge to remove one.','ready');render();return;}
    const edgeIndex=edgeIndexBetween(puzzle,selected,index);
    if(edgeIndex<0){showToast('Choose a glowing island in the same row or column.');return;}
    if(!addTargetIsValid(edgeIndex)){
      if(counts[edgeIndex]>0){removeEdge(edgeIndex);return;}
      const probe=[...counts];probe[edgeIndex]=counts[edgeIndex]+1;showToast(blockedCopy(validateBridgesState(puzzle,probe)));return;
    }
    addEdge(edgeIndex);
  }
  function arrowNeighbor(index,key){
    const origin=puzzle.islands[index];for(const edge of puzzle.edges){if(edge.a!==index&&edge.b!==index)continue;const otherIndex=edge.a===index?edge.b:edge.a,other=puzzle.islands[otherIndex],dr=other.row-origin.row,dc=other.col-origin.col;if(key==='ArrowUp'&&dr<0&&dc===0)return otherIndex;if(key==='ArrowDown'&&dr>0&&dc===0)return otherIndex;if(key==='ArrowLeft'&&dc<0&&dr===0)return otherIndex;if(key==='ArrowRight'&&dc>0&&dr===0)return otherIndex;}return null;
  }
  svg.addEventListener('click',event=>{const island=event.target.closest?.('[data-island]');if(island){selectIsland(Number(island.dataset.island));return;}const hit=event.target.closest?.('[data-edge]');if(hit)removeEdge(Number(hit.dataset.edge));});
  svg.addEventListener('keydown',event=>{
    const island=event.target.closest?.('[data-island]');if(!island)return;const index=Number(island.dataset.island);
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){const next=arrowNeighbor(index,event.key);if(next!=null){event.preventDefault();islandGroups[next]?.focus();}return;}
    if(event.key==='Escape'&&selected!=null){event.preventDefault();selected=null;setCoach('Selection cleared','Select an island to add a bridge. Tap an existing bridge to remove one.','ready');render();return;}
    if(!['Enter',' '].includes(event.key))return;event.preventDefault();selectIsland(index);
  });
  hintApply.addEventListener('click',()=>{if(!currentHint)return;setEdge(currentHint.edgeIndex,currentHint.target,{fromHint:true});});
  render();onStatus('');
  return{
    reset(){counts=[...initial];actions=[];moves=0;selected=null;currentHint=null;solutionVisible=false;practice=false;complete=false;hideToast();setCoach('Tap an island to start','Island → island adds bridges. Tap an existing bridge to remove one.','ready');stage.classList.remove('is-complete','solution-visible');host.classList.remove('game-solved-bloom');render();onStatus('');},
    hint(){if(complete||solutionVisible||currentHint)return false;const hint=explainBridgesHint(puzzle,counts,puzzle.solution);if(!hint)return false;currentHint=hint;hideToast();setCoach(`Hint · ${hintActionLabel(hint)}`,`${hint.title}. ${hint.message}`,'hint');render();onStatus('');return true;},
    solution(){if(complete)return;practice=true;solutionVisible=true;currentHint=null;selected=null;hideToast();stage.classList.add('solution-visible');render();setCoach('Solution guide','Cyan solid bridges are missing. Red bridges should be changed. Single and double bridges stay visually distinct.','solution');onStatus('');},
    hideSolution(){if(complete)return;solutionVisible=false;stage.classList.remove('solution-visible');setCoach('Practice guide hidden','Select an island to continue. Tap an existing bridge to remove one.','ready');render();onStatus('');},
    previewScore(timeMs,hints=0){return scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-idealMoves)*48,hintPenalty:hints*190});},
    getResult(timeMs,hints=0){return{score:scoreFromPerformance({timeMs,timeDivisor,actionPenalty:Math.max(0,moves-idealMoves)*48,hintPenalty:hints*190}),metadata:{size:puzzle.size,islands:puzzle.islands.length,candidate_edges:puzzle.edges.length,links:counts.filter(Boolean).length,moves,ideal_moves:idealMoves,bridges:[...counts],actions:[...actions]}};},
    destroy(){if(toastTimer)clearTimeout(toastTimer);host.classList.remove('game-solved-bloom');}
  };
}
