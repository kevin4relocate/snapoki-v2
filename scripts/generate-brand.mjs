import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(root,'public');
const brandDir=path.join(publicDir,'brand');
const BG=[8,11,20,255], WHITE=[255,255,255,255];
const STOPS=[[255,190,62,255],[255,91,126,255],[141,67,255,255],[56,92,255,255],[35,210,245,255]];
const BRAND_VERSION='puzzle-s-v5';

// One smooth S centerline is shared by SVG and raster output. The mark is built
// from six real ribbon pieces plus three small connector tabs; there are no
// decorative seam strokes laid on top of the logo.
const BEZIERS=[
  [[.750,.266],[.656,.172],[.406,.164],[.266,.242]],
  [[.266,.242],[.141,.313],[.180,.422],[.320,.461]],
  [[.320,.461],[.430,.492],[.609,.477],[.711,.547]],
  [[.711,.547],[.844,.633],[.773,.758],[.648,.813]],
  [[.648,.813],[.516,.875],[.305,.836],[.203,.750]]
];
const PIECE_COUNT=6, PIECE_GAP=.012, SMALL_PIECE_COUNT=4, SMALL_PIECE_GAP=.018;
const BUMP_INDEXES=[0,2,4], SMALL_BUMP_INDEXES=[0,2];

const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
function crc32(buffer){let c=0xffffffff;for(const byte of buffer)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function png(width,height,pixels){const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++){const dst=y*(width*4+1);raw[dst]=0;pixels.copy(raw,dst+1,y*width*4,(y+1)*width*4);}const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
function gradient(t){const p=Math.max(0,Math.min(.999,t))*(STOPS.length-1),i=Math.floor(p);return mix(STOPS[i],STOPS[i+1],p-i);}
function setPx(buf,w,x,y,color){if(x<0||y<0||x>=w||y>=buf.length/(w*4))return;const i=(y*w+x)*4;for(let c=0;c<4;c++)buf[i+c]=color[c];}
function insideRounded(x,y,x0,y0,x1,y1,r){if((x>=x0+r&&x<=x1-r)||(y>=y0+r&&y<=y1-r))return x>=x0&&x<=x1&&y>=y0&&y<=y1;const cx=x<x0+r?x0+r:x1-r,cy=y<y0+r?y0+r:y1-r;return(x-cx)**2+(y-cy)**2<=r*r;}
function iconBg(size,x,y){const glow=Math.max(0,1-Math.hypot(x-size*.5,y-size*.46)/(size*.72));return mix(BG,[17,24,48,255],glow*.65);}
function cubicPoint([p0,p1,p2,p3],t){const u=1-t;return [u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0],u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]];}
function buildPath(samples=20){const out=[];for(let s=0;s<BEZIERS.length;s++)for(let i=0;i<samples;i++){if(s&&i===0)continue;out.push(cubicPoint(BEZIERS[s],i/(samples-1)));}return out;}
const S_PATH=buildPath();
const METRICS=(()=>{const lengths=[],cumulative=[0];let total=0;for(let i=0;i<S_PATH.length-1;i++){const [ax,ay]=S_PATH[i],[bx,by]=S_PATH[i+1],len=Math.hypot(bx-ax,by-ay);lengths.push(len);total+=len;cumulative.push(total);}return {lengths,cumulative,total};})();
function samplePath(t){let target=Math.max(0,Math.min(1,t))*METRICS.total;for(let i=0;i<METRICS.lengths.length;i++){const start=METRICS.cumulative[i],len=METRICS.lengths[i];if(start+len>=target||i===METRICS.lengths.length-1){const u=len?(target-start)/len:0,[ax,ay]=S_PATH[i],[bx,by]=S_PATH[i+1],tx=(bx-ax)/len,ty=(by-ay)/len;return {x:ax+(bx-ax)*u,y:ay+(by-ay)*u,tx,ty};}}}
function pieceIntervals(count,gap){return Array.from({length:count},(_,i)=>[i/count+(i?gap/2:0),(i+1)/count-(i<count-1?gap/2:0)]);}
const LARGE_PIECES=pieceIntervals(PIECE_COUNT,PIECE_GAP), SMALL_PIECES=pieceIntervals(SMALL_PIECE_COUNT,SMALL_PIECE_GAP);
function bumpPoints(count,gap,indexes){return indexes.map(i=>{const t=(i+1)/count-gap/2,{x,y,tx,ty}=samplePath(t);return {x:x+tx*.022,y:y+ty*.022,r:.031};});}
const LARGE_BUMPS=bumpPoints(PIECE_COUNT,PIECE_GAP,BUMP_INDEXES), SMALL_BUMPS=bumpPoints(SMALL_PIECE_COUNT,SMALL_PIECE_GAP,SMALL_BUMP_INDEXES);
function visibleAt(t,pieces){return pieces.some(([lo,hi])=>t>=lo&&t<=hi);}
function nearestPath(px,py,size){let best=Infinity,bestT=0;for(let i=0;i<S_PATH.length-1;i++){const ax=S_PATH[i][0]*size,ay=S_PATH[i][1]*size,bx=S_PATH[i+1][0]*size,by=S_PATH[i+1][1]*size,vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,vv=vx*vx+vy*vy,u=vv?Math.max(0,Math.min(1,(wx*vx+wy*vy)/vv)):0,dx=px-(ax+u*vx),dy=py-(ay+u*vy),d=Math.hypot(dx,dy);if(d<best){best=d;bestT=(METRICS.cumulative[i]+METRICS.lengths[i]*u)/METRICS.total;}}return {dist:best,t:bestT};}

function logoPixels(size){const out=Buffer.alloc(size*size*4),pad=size*.055,x0=pad,y0=pad,x1=size-pad-1,y1=size-pad-1,r=size*.26,pieces=size<=64?SMALL_PIECES:LARGE_PIECES,bumps=size<=64?SMALL_BUMPS:LARGE_BUMPS,th=size*.205;for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(insideRounded(x,y,x0,y0,x1,y1,r))setPx(out,size,x,y,iconBg(size,x,y));for(let y=0;y<size;y++)for(let x=0;x<size;x++){const {dist,t}=nearestPath(x+.5,y+.5,size);if(dist<=th/2&&visibleAt(t,pieces)){const edge=Math.max(0,Math.min(1,(th/2-dist)/(th*.16))),c=gradient(Math.max(0,Math.min(.999,(x/size)*.60+(y/size)*.80-.18)));setPx(out,size,x,y,mix(c,WHITE,edge*.06));}}for(const bump of bumps){const cx=bump.x*size,cy=bump.y*size,rr=bump.r*size;for(let y=Math.max(0,Math.floor(cy-rr));y<=Math.min(size-1,Math.ceil(cy+rr));y++)for(let x=Math.max(0,Math.floor(cx-rr));x<=Math.min(size-1,Math.ceil(cx+rr));x++)if((x+.5-cx)**2+(y+.5-cy)**2<=rr*rr)setPx(out,size,x,y,gradient(Math.max(0,Math.min(.999,(x/size)*.60+(y/size)*.80-.18))));}return out;}
async function writeLogo(size,file){await fs.writeFile(file,png(size,size,logoPixels(size)));}

function pointAtT(t){const p=samplePath(t);return [p.x,p.y];}
function pathSlice(lo,hi){const points=[pointAtT(lo)];for(let i=1;i<S_PATH.length-1;i++){const t=METRICS.cumulative[i]/METRICS.total;if(t>lo&&t<hi)points.push(S_PATH[i]);}points.push(pointAtT(hi));return points;}
function svgPathD(points){return points.map(([x,y],i)=>`${i?'L':'M'}${(x*128).toFixed(1)} ${(y*128).toFixed(1)}`).join('');}
const SVG_PIECES=LARGE_PIECES.map(([lo,hi])=>svgPathD(pathSlice(lo,hi)));
function markInner(){return `<defs><linearGradient id="g" x1="24" y1="20" x2="104" y2="110" gradientUnits="userSpaceOnUse"><stop stop-color="#ffc247"/><stop offset=".25" stop-color="#ff5b7d"/><stop offset=".52" stop-color="#8e43ff"/><stop offset=".78" stop-color="#385cff"/><stop offset="1" stop-color="#23d2f5"/></linearGradient><radialGradient id="b"><stop stop-color="#152245"/><stop offset="1" stop-color="#080b14"/></radialGradient><filter id="soft"><feDropShadow dx="0" dy="1" stdDeviation="1.1" flood-color="#000" flood-opacity=".22"/></filter></defs><rect x="7" y="7" width="114" height="114" rx="31" fill="url(#b)"/><g class="puzzle-pieces" fill="none" stroke="url(#g)" stroke-width="26" stroke-linecap="butt" stroke-linejoin="round" filter="url(#soft)">${SVG_PIECES.map(d=>`<path d="${d}"/>`).join('')}</g><g class="puzzle-tabs" fill="url(#g)">${LARGE_BUMPS.map(({x,y,r})=>`<circle class="puzzle-tab" cx="${(x*128).toFixed(1)}" cy="${(y*128).toFixed(1)}" r="${(r*128).toFixed(1)}"/>`).join('')}</g>`;}
function markSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Snapoki" data-brand-version="${BRAND_VERSION}">${markInner()}</svg>`;}
function wordmarkSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 128" role="img" aria-label="Snapoki" data-brand-version="${BRAND_VERSION}"><g>${markInner()}</g><text x="145" y="82" fill="#f7f9ff" font-family="Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="54" font-weight="780" letter-spacing="-2">Snapoki</text></svg>`;}

async function social(){const w=1200,h=630,out=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,t=(x+y)/(w+h),glow=Math.max(0,1-Math.hypot(x-900,y-210)/720),c=mix(BG,gradient(t),glow*.12);out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=255;}const mark=logoPixels(260),ox=120,oy=185;for(let y=0;y<260;y++)for(let x=0;x<260;x++){const si=(y*260+x)*4;if(!mark[si+3])continue;const di=((oy+y)*w+(ox+x))*4;mark.copy(out,di,si,si+4);}for(let rr=0;rr<4;rr++)for(let cc=0;cc<5;cc++){const x0=680+cc*82,y0=145+rr*82,active=(rr*5+cc)%5===0||(rr*5+cc)%7===2,col=active?gradient((rr+cc)/8):[23,31,52,255];for(let y=y0;y<y0+61;y++)for(let x=x0;x<x0+61;x++)if(insideRounded(x,y,x0,y0,x0+60,y0+60,13))setPx(out,w,x,y,col);}await fs.writeFile(path.join(brandDir,'social-card.png'),png(w,h,out));}

await fs.mkdir(brandDir,{recursive:true});
await fs.writeFile(path.join(brandDir,'logo-mark.svg'),markSvg());
await fs.writeFile(path.join(brandDir,'logo.svg'),wordmarkSvg());
await fs.writeFile(path.join(publicDir,'favicon.svg'),markSvg());
for(const size of [1024,512,256,192,128,64])await writeLogo(size,path.join(brandDir,`logo-mark-${size}.png`));
await writeLogo(32,path.join(publicDir,'favicon-32.png'));
await writeLogo(180,path.join(publicDir,'apple-touch-icon.png'));
await social();
await fs.writeFile(path.join(publicDir,'manifest.webmanifest'),JSON.stringify({name:'Snapoki',short_name:'Snapoki',description:'Free browser puzzle games with daily challenges and fair rankings.',start_url:'/',display:'standalone',background_color:'#080b14',theme_color:'#080b14',icons:[{src:'/brand/logo-mark-192.png',sizes:'192x192',type:'image/png'},{src:'/brand/logo-mark-512.png',sizes:'512x512',type:'image/png'}]},null,2));
console.log(`Generated Snapoki ${BRAND_VERSION} brand assets.`);
