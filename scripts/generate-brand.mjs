import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const brandDir = path.join(publicDir, 'brand');
const PURPLE = [115,87,255,255], CYAN = [40,201,245,255], WHITE = [255,255,255,255], BG = [8,11,20,255];

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n=0;n<256;n++) { let c=n; for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; table[n]=c>>>0; }
  return table;
})();
function crc32(buffer){let c=0xffffffff;for(const byte of buffer)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type);const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function png(width,height,pixels){const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++){const dst=y*(width*4+1);raw[dst]=0;pixels.copy(raw,dst+1,y*width*4,(y+1)*width*4);}const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const blend=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
function setPx(buf,w,x,y,color){if(x<0||y<0||x>=w||y>=buf.length/(w*4))return;const i=(y*w+x)*4;for(let c=0;c<4;c++)buf[i+c]=color[c];}
function insideRounded(x,y,x0,y0,x1,y1,r){if((x>=x0+r&&x<=x1-r)||(y>=y0+r&&y<=y1-r))return x>=x0&&x<=x1&&y>=y0&&y<=y1;const cx=x<x0+r?x0+r:x1-r,cy=y<y0+r?y0+r:y1-r;return (x-cx)**2+(y-cy)**2<=r*r;}
function distSeg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,vv=vx*vx+vy*vy,t=vv?Math.max(0,Math.min(1,(wx*vx+wy*vy)/vv)):0;return Math.hypot(px-(ax+t*vx),py-(ay+t*vy));}
function logoPixels(size){const out=Buffer.alloc(size*size*4);const m=size*.0625,x0=m,y0=m,x1=size-m-1,y1=size-m-1,r=size*.25;for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(insideRounded(x,y,x0,y0,x1,y1,r))setPx(out,size,x,y,blend(PURPLE,CYAN,Math.max(0,Math.min(1,(x+y)/(2*size)))));const p=[[.68,.31],[.39,.31],[.28,.31],[.25,.43],[.32,.50],[.61,.50],[.72,.50],[.74,.62],[.68,.69],[.32,.69]].map(([x,y])=>[x*size,y*size]),th=size*.105;for(let y=0;y<size;y++)for(let x=0;x<size;x++){let hit=false;for(let i=0;i<p.length-1&&!hit;i++)hit=distSeg(x+.5,y+.5,...p[i],...p[i+1])<=th/2;if(hit)setPx(out,size,x,y,WHITE);}return out;}
async function writeLogo(size,file){await fs.writeFile(file,png(size,size,logoPixels(size)));}
async function social(){const w=1200,h=630,out=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,t=(x+y)/(w+h),brand=blend(PURPLE,CYAN,t),strength=Math.max(0,.13-Math.hypot(x-980,y-80)/6000);out[i]=Math.round(BG[0]*(1-strength)+brand[0]*strength);out[i+1]=Math.round(BG[1]*(1-strength)+brand[1]*strength);out[i+2]=Math.round(BG[2]*(1-strength)+brand[2]*strength);out[i+3]=255;}const mark=logoPixels(240),ox=120,oy=195;for(let y=0;y<240;y++)for(let x=0;x<240;x++){const si=(y*240+x)*4;if(!mark[si+3])continue;const di=((oy+y)*w+(ox+x))*4;mark.copy(out,di,si,si+4);}for(let rr=0;rr<4;rr++)for(let cc=0;cc<5;cc++){const x0=650+cc*88,y0=150+rr*88,active=(rr*5+cc)%6===0||(rr*5+cc)%6===2,col=active?blend(PURPLE,CYAN,(cc+rr)/8):[24,31,53,255];for(let y=y0;y<y0+66;y++)for(let x=x0;x<x0+66;x++)if(insideRounded(x,y,x0,y0,x0+65,y0+65,12))setPx(out,w,x,y,col);}await fs.writeFile(path.join(brandDir,'social-card.png'),png(w,h,out));}

await fs.mkdir(brandDir,{recursive:true});
for(const size of [1024,512,256,192,128,64]) await writeLogo(size,path.join(brandDir,`logo-mark-${size}.png`));
await writeLogo(32,path.join(publicDir,'favicon-32.png'));
await writeLogo(180,path.join(publicDir,'apple-touch-icon.png'));
await social();
console.log('Generated Snapoki PNG brand assets.');
