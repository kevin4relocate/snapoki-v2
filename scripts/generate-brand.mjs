import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(root,'public');
const brandDir=path.join(publicDir,'brand');
const BG=[8,11,20,255], WHITE=[255,255,255,255];
const STOPS=[[255,190,62,255],[255,91,126,255],[141,67,255,255],[56,92,255,255],[35,210,245,255]];
const BRAND_VERSION='puzzle-s-v2';
const S_PATH=[[.719,.227],[.617,.164],[.438,.156],[.336,.195],[.234,.258],[.219,.344],[.281,.406],[.391,.453],[.563,.492],[.672,.516],[.734,.578],[.727,.664],[.672,.734],[.555,.797],[.422,.805],[.32,.766],[.188,.695]];
const PUZZLE_SEAMS=[
  [[.453,.117],[.453,.172],[.492,.172],[.492,.219],[.453,.219],[.453,.305]],
  [[.18,.383],[.242,.383],[.242,.352],[.289,.352],[.289,.391],[.375,.391]],
  [[.484,.414],[.484,.469],[.523,.469],[.523,.516],[.484,.516],[.484,.594]],
  [[.57,.641],[.641,.641],[.641,.609],[.688,.609],[.688,.648],[.789,.648]],
  [[.383,.68],[.383,.734],[.344,.734],[.344,.781],[.383,.781],[.383,.867]]
];

const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
function crc32(buffer){let c=0xffffffff;for(const byte of buffer)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function png(width,height,pixels){const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++){const dst=y*(width*4+1);raw[dst]=0;pixels.copy(raw,dst+1,y*width*4,(y+1)*width*4);}const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
function gradient(t){const p=Math.max(0,Math.min(.999,t))*(STOPS.length-1),i=Math.floor(p);return mix(STOPS[i],STOPS[i+1],p-i);}
function setPx(buf,w,x,y,color){if(x<0||y<0||x>=w||y>=buf.length/(w*4))return;const i=(y*w+x)*4;for(let c=0;c<4;c++)buf[i+c]=color[c];}
function insideRounded(x,y,x0,y0,x1,y1,r){if((x>=x0+r&&x<=x1-r)||(y>=y0+r&&y<=y1-r))return x>=x0&&x<=x1&&y>=y0&&y<=y1;const cx=x<x0+r?x0+r:x1-r,cy=y<y0+r?y0+r:y1-r;return(x-cx)**2+(y-cy)**2<=r*r;}
function distSeg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,vv=vx*vx+vy*vy,t=vv?Math.max(0,Math.min(1,(wx*vx+wy*vy)/vv)):0;return Math.hypot(px-(ax+t*vx),py-(ay+t*vy));}
function iconBg(size,x,y){const glow=Math.max(0,1-Math.hypot(x-size*.5,y-size*.46)/(size*.72));return mix(BG,[17,24,48,255],glow*.65);}
function seamDistance(px,py,seam,size){let best=Infinity;for(let i=0;i<seam.length-1;i++){const a=seam[i],b=seam[i+1],d=distSeg(px,py,a[0]*size,a[1]*size,b[0]*size,b[1]*size);if(d<best)best=d;}return best;}
function logoPixels(size){
  const out=Buffer.alloc(size*size*4),ribbon=new Uint8Array(size*size),pad=size*.055,x0=pad,y0=pad,x1=size-pad-1,y1=size-pad-1,r=size*.26;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(!insideRounded(x,y,x0,y0,x1,y1,r))continue;setPx(out,size,x,y,iconBg(size,x,y));}
  const path=S_PATH.map(([x,y])=>[x*size,y*size]),th=size*.205;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let best=Infinity,along=0;
    for(let i=0;i<path.length-1;i++){const d=distSeg(x+.5,y+.5,...path[i],...path[i+1]);if(d<best){best=d;along=i/(path.length-1);}}
    if(best<=th/2){ribbon[y*size+x]=1;const edge=Math.max(0,Math.min(1,(th/2-best)/(th*.16))),c=gradient((y/size)*.72+along*.28);setPx(out,size,x,y,mix(c,WHITE,edge*.07));}
  }
  const seams=size<=64?PUZZLE_SEAMS.filter((_,i)=>i===0||i===2||i===4):PUZZLE_SEAMS;
  const cut=Math.max(1.15,size*.025);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    if(!ribbon[y*size+x])continue;
    let onSeam=false;
    for(const seam of seams){if(seamDistance(x+.5,y+.5,seam,size)<=cut/2){onSeam=true;break;}}
    if(onSeam)setPx(out,size,x,y,iconBg(size,x,y));
  }
  return out;
}
async function writeLogo(size,file){await fs.writeFile(file,png(size,size,logoPixels(size)));}
const svgPath='M92 29C79 18 56 18 43 25C30 33 28 44 36 52C44 60 58 60 72 64C86 68 95 74 92 84C88 98 70 105 54 102C42 101 31 96 24 89';
const svgSeams=['M58 15V22H63V28H58V39','M23 49H31V45H37V50H48','M62 53V60H67V66H62V76','M73 82H82V78H88V83H101','M49 87V94H44V100H49V111'];
function markSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Snapoki" data-brand-version="${BRAND_VERSION}"><defs><linearGradient id="g" x1="26" y1="18" x2="100" y2="110" gradientUnits="userSpaceOnUse"><stop stop-color="#ffc247"/><stop offset=".24" stop-color="#ff5b7d"/><stop offset=".5" stop-color="#8e43ff"/><stop offset=".75" stop-color="#385cff"/><stop offset="1" stop-color="#23d2f5"/></linearGradient><radialGradient id="b"><stop stop-color="#152245"/><stop offset="1" stop-color="#080b14"/></radialGradient><clipPath id="sClip"><path d="${svgPath}" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/></clipPath></defs><rect x="7" y="7" width="114" height="114" rx="31" fill="url(#b)"/><path d="${svgPath}" fill="none" stroke="url(#g)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/><g class="puzzle-seams" clip-path="url(#sClip)" fill="none" stroke="#080b14" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round">${svgSeams.map(d=>`<path d="${d}"/>`).join('')}</g></svg>`;}
function wordmarkSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 128" role="img" aria-label="Snapoki" data-brand-version="${BRAND_VERSION}"><g>${markSvg().replace(/<svg[^>]*>|<\/svg>/g,'')}</g><text x="145" y="82" fill="#f7f9ff" font-family="Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="54" font-weight="780" letter-spacing="-2">Snapoki</text></svg>`;}
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
