// Original procedural visual atmosphere. No product state, assets or network.
export function mountAtmosphere() {
  const makeCanvas = className => {
    const canvas=document.createElement('canvas');canvas.className=className;
    canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);return canvas;
  };
  const sky=makeCanvas('nodal-universe'), snow=makeCanvas('atmosphere');
  const skyCtx=sky.getContext('2d'), ctx=snow.getContext('2d');
  if(!ctx || !skyCtx){sky.remove();snow.remove();return () => {};}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const random=(min,max)=>min+Math.random()*(max-min);
  let width=0,height=0,flakes=[],frame=0,last=0,elapsed=0,network;
  const pointer={x:-1000,y:-1000};
  function halo(target,x,y,r,color,opacity=1) {
    const gradient=target.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,`rgba(255,255,255,${opacity})`);
    gradient.addColorStop(.12,color);gradient.addColorStop(.4,color.replace('1)', '.23)'));
    gradient.addColorStop(1,color.replace('1)', '0)'));
    target.fillStyle=gradient;target.beginPath();target.arc(x,y,r,0,Math.PI*2);target.fill();
  }
  function buildNetwork() {
    network=document.createElement('canvas');network.width=sky.width;network.height=sky.height;
    const nctx=network.getContext('2d'), ratio=network.width/width;
    nctx.scale(ratio,ratio);
    const colors=['rgba(22,186,255,1)','rgba(238,63,246,1)','rgba(145,100,255,1)'];
    const nodes=Array.from({length:width<700 ? 52:112},(_,i)=>{
      const x=random(-.07,1.07)*width;
      // A layered luminous ribbon, strongest at the right and outer edges.
      const y=height*(.14+.48*(x/width)+random(-.23,.23));
      return {x,y,z:random(.3,1),color:colors[i%3]};
    });
    nctx.globalCompositeOperation='screen';
    for(let i=0;i<nodes.length;i++) {
      const a=nodes[i];
      const neighbours=nodes.map((b,j)=>({b,j,d:Math.hypot(a.x-b.x,a.y-b.y)})).filter(v=>v.j>i && v.d<width*.24).sort((a,b)=>a.d-b.d).slice(0,4);
      for(const {b,d} of neighbours) {
        const gradient=nctx.createLinearGradient(a.x,a.y,b.x,b.y);
        gradient.addColorStop(0,a.color);gradient.addColorStop(1,b.color);
        nctx.strokeStyle=gradient;nctx.globalAlpha=(.2+.25*a.z)*(1-d/(width*.3));
        nctx.lineWidth=.4+.7*a.z;nctx.beginPath();nctx.moveTo(a.x,a.y);nctx.lineTo(b.x,b.y);nctx.stroke();
      }
      nctx.globalAlpha=.45+.4*a.z;halo(nctx,a.x,a.y,6+14*a.z,a.color,.9);
      nctx.fillStyle='#f5f4ff';nctx.beginPath();nctx.arc(a.x,a.y,.7+1.5*a.z,0,Math.PI*2);nctx.fill();
      if(i%16===0) {
        nctx.globalAlpha=.6;nctx.strokeStyle='#e3caff';nctx.lineWidth=.5;
        nctx.beginPath();nctx.moveTo(a.x-12,a.y);nctx.lineTo(a.x+12,a.y);nctx.moveTo(a.x,a.y-16);nctx.lineTo(a.x,a.y+16);nctx.stroke();
      }
    }
    for(let i=0;i<(width<700?55:125);i++) {
      nctx.globalAlpha=random(.08,.35);
      halo(nctx,random(0,width),random(0,height*.88),random(3,13),colors[i%3],.45);
    }
    nctx.globalAlpha=1;
  }
  function sprite(layer) {
    const image=document.createElement('canvas');image.width=112;image.height=112;
    const pen=image.getContext('2d');pen.translate(56,56);
    pen.strokeStyle=layer===0?'#bccfff':'#f4efff';pen.lineWidth=layer===2?2:1.3;
    pen.shadowColor='#c9c5ff';pen.shadowBlur=layer===1?2:0;
    pen.beginPath();
    const length=random(24,34),branch=random(.22,.42), levels=layer===1?2:1;
    for(let arm=0;arm<6;arm++) {
      const angle=arm*Math.PI/3,len=length*random(.82,1);
      const x=Math.cos(angle),y=Math.sin(angle);
      pen.moveTo(0,0);pen.lineTo(x*len,y*len);
      for(let level=0;level<levels;level++) {
        const at=len*(.48+level*.25),twig=len*branch*(1-level*.2);
        for(const side of [-1,1]){pen.moveTo(x*at,y*at);pen.lineTo(x*at+Math.cos(angle+side*1.03)*twig,y*at+Math.sin(angle+side*1.03)*twig);}
      }
    }
    pen.stroke();
    if(layer===2) {
      const bloom=pen.createRadialGradient(0,0,0,0,0,38);
      bloom.addColorStop(0,'rgba(247,242,255,.3)');bloom.addColorStop(.35,'rgba(211,231,255,.18)');bloom.addColorStop(1,'rgba(211,231,255,0)');
      pen.fillStyle=bloom;pen.fillRect(-50,-50,100,100);
      const blurred=document.createElement('canvas');blurred.width=112;blurred.height=112;
      const blur=blurred.getContext('2d');blur.filter='blur(5px)';blur.drawImage(image,0,0);return blurred;
    }
    return image;
  }
  function resize() {
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,1.5);
    for(const canvas of [sky,snow]){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
    ctx.setTransform(ratio,0,0,ratio,0,0);skyCtx.setTransform(ratio,0,0,ratio,0,0);
    const count=width<700?42:90;
    flakes=Array.from({length:count},(_,i)=>{
      const layer=i%10<5?0:i%10<9?1:2;
      return {x:random(0,width),y:random(layer===2?height*.45:0,height),size:layer===0?random(2,5):layer===1?random(7,13):random(38,68),
        speed:random(5,13)*(1+layer*.45),phase:random(0,6),angle:random(0,6),spin:random(-.06,.06),sway:random(2,9),layer,image:sprite(layer)};
    });
    buildNetwork();draw(0);
  }
  function draw(delta) {
    elapsed+=delta;
    skyCtx.clearRect(0,0,width,height);
    // The upper universe belongs to the document's beginning; fades near the snow base.
    const skyFade=Math.max(0,1-scrollY/Math.max(height*.9,650));
    skyCtx.globalAlpha=skyFade*(.88+.06*Math.sin(elapsed*.35));
    skyCtx.drawImage(network,0,0,width,height);
    ctx.clearRect(0,0,width,height);
    for(const f of flakes) {
      f.phase+=delta*.32;f.y+=f.speed*delta;f.angle+=f.spin*delta;
      f.x+=Math.sin(f.phase)*f.sway*delta;
      const distance=Math.hypot(f.x-pointer.x,f.y-pointer.y);
      if(delta && distance<120)f.x+=(f.x-pointer.x)/Math.max(distance,1)*12*delta;
      if(f.y>height+60){f.y=-60;f.x=random(0,width);}
      if(f.x<-60)f.x=width+60;if(f.x>width+60)f.x=-60;
      // Foreground is sparse and peripheral; central text remains easy to read.
      const edge=Math.abs(f.x-width/2)/(width/2);
      const lower=.12+.88*Math.pow(Math.max(0,f.y/height),1.8);
      ctx.globalAlpha=lower*(f.layer===0?.4:f.layer===1?.7:.46)*(f.layer===2?.35+.65*edge:1);
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);
      ctx.drawImage(f.image,-f.size,-f.size,f.size*2,f.size*2);ctx.restore();
    }
    ctx.globalAlpha=1;
  }
  function tick(time) {
    // Cap decorative rendering at 30fps; motion still uses elapsed time.
    if(!last || time-last>=32){draw(last?Math.min((time-last)/1000,.07):0);last=time;}
    frame=requestAnimationFrame(tick);
  }
  function sync(){cancelAnimationFrame(frame);last=0;if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);else draw(0);}
  const move=e=>{pointer.x=e.clientX;pointer.y=e.clientY;};
  const leave=()=>{pointer.x=-1000;pointer.y=-1000;};
  const staticScroll=()=>{if(reduced.matches)draw(0);};
  resize();sync();
  window.addEventListener('resize',resize);window.addEventListener('pointermove',move,{passive:true});window.addEventListener('scroll',staticScroll,{passive:true});
  document.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  return ()=>{cancelAnimationFrame(frame);sky.remove();snow.remove();window.removeEventListener('resize',resize);window.removeEventListener('pointermove',move);window.removeEventListener('scroll',staticScroll);document.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);};
}
