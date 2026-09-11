import * as THREE from 'three';
import { factory } from './factoryContent';
import { formatMetric } from './landing';

const clamp = (n: number) => Math.max(0,Math.min(1,n));
const smooth = (n: number) => {const t=clamp(n);return t*t*(3-2*t);};
const mix = (a:number,b:number,t:number) => a+(b-a)*t;
const el = (s:string) => document.querySelector<HTMLElement>(s)!;
interface SectionRange { top: number; height: number }

/** Native scroll timeline: cached section geometry, frame-coalesced reads and
 * transform/opacity writes. No wheel listener and no synthetic scroll position. */
export class LandingMotion {
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly hero=el('.hero-stage');
  private readonly heading=el('.hero-heading');
  private readonly copy=el('.hero-copy');
  private readonly bottom=el('.hero-bottom');
  private readonly metrics=el('.metrics');
  private readonly viewer=el('#viewer');
  private readonly enters=Array.from(document.querySelectorAll<HTMLElement>('.hero-enter'));
  private readonly counters=Array.from(document.querySelectorAll<HTMLElement>('[data-counter]'));
  private readonly primaryAward=el('[data-award=primary]');
  private readonly secondaryAward=el('[data-award=secondary]');
  private ranges:Record<string,SectionRange>={};
  private layoutDirty=true;
  private scrollDirty=true;
  private width=0;
  private height=0;
  private startTime:number|null=null;
  private elapsed=0;
  private introComplete=false;
  private observer:IntersectionObserver;
  private center = new THREE.Vector3();
  private modelDistance=1;
  private right=new THREE.Vector3();
  private up=new THREE.Vector3();
  private away=new THREE.Vector3();
  private transformedCenter=new THREE.Vector3();
  private readonly neutralBounds=new THREE.Box3();
  private readonly projectedCorner=new THREE.Vector3();
  private lastCounterValues:number[]=[];
  private interactionActive=false;
  private introAnimations:Animation[]=[];
  private idleWeight=0;
  readonly diagnostics={intro:'loading',stage:'hero',heroProgress:0,qualityProgress:0,scrollYawDeg:0,modelVisible:false,reducedMotion:false,idleYawDeg:0,idleWeight:0};

  constructor(private entry:THREE.Group,private scrollRoot:THREE.Group,private heroIdleRoot:THREE.Group,private camera:THREE.PerspectiveCamera,private onInteractive:(active:boolean)=>void){
    this.observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');this.observer.unobserve(entry.target);}},{rootMargin:'0px 0px -12% 0px',threshold:.01});
    if(!this.reduced.matches) document.documentElement.classList.add('motion-ready');
    document.querySelectorAll('.reveal').forEach(e=>this.observer.observe(e));
    window.addEventListener('scroll',()=>{this.scrollDirty=true;},{passive:true});
    window.addEventListener('resize',()=>{this.layoutDirty=true;},{passive:true});
    this.reduced.addEventListener('change',()=>{this.layoutDirty=true;this.scrollDirty=true;document.documentElement.classList.toggle('motion-ready',!this.reduced.matches);if(this.reduced.matches)document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-revealed'));});
    new ResizeObserver(()=>{this.layoutDirty=true;}).observe(document.querySelector('main')!);
    document.fonts.ready.then(()=>{this.layoutDirty=true;});
    document.querySelectorAll('img').forEach(img=>img.addEventListener('load',()=>{this.layoutDirty=true;},{once:true}));
    // The metrics anchor lies in a pinned viewport; resolve to the end of its timeline.
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{
      const id=a.hash.slice(1);const target=document.getElementById(id);if(!target)return;
      event.preventDefault();this.measure();const top=id==='about'?0:id==='metrics'?this.hero.offsetTop+this.hero.offsetHeight-this.height-1:target.getBoundingClientRect().top+window.scrollY-96;
      history.pushState(null,'',a.hash);window.scrollTo({top,behavior:this.reduced.matches?'instant':'smooth'});
    }));
  }
  private measure():void{
    this.width=window.innerWidth;this.height=window.innerHeight;
    for(const selector of ['.hero-stage','#production','#quality','.quality-body','.quality-model-space','#service','#achievements']){const r=el(selector).getBoundingClientRect();this.ranges[selector]={top:r.top+window.scrollY,height:r.height};}
    this.layoutDirty=false;this.scrollDirty=true;
  }
  setFrame(bounds:THREE.Box3):void{
    this.neutralBounds.copy(bounds);bounds.getCenter(this.center);this.modelDistance=this.camera.position.distanceTo(this.center);
    this.right.set(1,0,0).applyQuaternion(this.camera.quaternion);this.up.set(0,1,0).applyQuaternion(this.camera.quaternion);this.away.copy(this.camera.position).sub(this.center).normalize();this.layoutDirty=true;
  }
  private heroRightAnchoredX(scale:number,ndcY:number,rightEdgeNdc:number):number{
    const neutralNdc=this.center.clone().project(this.camera);
    const heightAtCenter=2*this.modelDistance*Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5));
    const rightAt=(xNdc:number):number=>{
      let right=-Infinity;
      for(const idleYawDeg of [-1.25,1.25])for(const x of [this.neutralBounds.min.x,this.neutralBounds.max.x])for(const y of [this.neutralBounds.min.y,this.neutralBounds.max.y])for(const z of [this.neutralBounds.min.z,this.neutralBounds.max.z]){
        this.projectedCorner.set(x,y,z).applyAxisAngle(THREE.Object3D.DEFAULT_UP,THREE.MathUtils.degToRad(idleYawDeg)).multiplyScalar(scale).addScaledVector(this.center,1-scale).addScaledVector(this.right,(xNdc-neutralNdc.x)*heightAtCenter*this.camera.aspect*.5).addScaledVector(this.up,(ndcY-neutralNdc.y)*heightAtCenter*.5).project(this.camera);
        right=Math.max(right,this.projectedCorner.x);
      }
      return right;
    };
    let low=-2;let high=2;
    for(let i=0;i<28;i++){
      const mid=(low+high)*.5;
      if(rightAt(mid)<rightEdgeNdc)low=mid;else high=mid;
    }
    return (low+high)*.5;
  }
  private heroHeaderRightNdc():number{
    const headerRight=el('.site-header').getBoundingClientRect().right;
    return headerRight/this.width*2-1;
  }
  async begin():Promise<void>{
    await document.fonts.ready;
    this.measure();this.startTime=performance.now();this.diagnostics.intro='arrival';
    el('#status').hidden=true;document.body.classList.remove('is-loading');
    // Respect deep links after the loader releases document scrolling.
    if(location.hash && location.hash!=='#about'){
      const target=document.getElementById(location.hash.slice(1));if(target){const top=location.hash==='#metrics'?this.hero.offsetHeight-this.height-1:target.getBoundingClientRect().top+window.scrollY-96;window.scrollTo({top,behavior:'instant'});}
    }
  }
  private showCopy():void{
    this.diagnostics.intro='copy';const durations=this.reduced.matches?120:720;
    this.introAnimations=this.enters.map((node,i)=>node.animate([{opacity:0,transform:`translateY(${this.reduced.matches?0:20}px)`},{opacity:1,transform:'translateY(0)'}],{duration:durations,delay:this.reduced.matches?0:Math.min(i,4)*120,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'}));
    Promise.all(this.introAnimations.map(a=>a.finished.catch(()=>undefined))).then(()=>{
      this.enters.forEach((node,i)=>{node.style.opacity='1';node.style.transform='none';this.introAnimations[i]?.cancel();});
      this.introComplete=true;this.diagnostics.intro='complete';this.scrollDirty=true;
    });
  }
  private updateHeroIdle(now:number,dt:number,interactionState:string):void{
    // This layer is deliberately above user drag: it can fade without changing the
    // persistent yaw selected by the user or the passive-hover pitch below it.
    const restingHero=this.introComplete&&this.diagnostics.modelVisible&&this.diagnostics.stage==='hero'&&this.diagnostics.heroProgress<.04;
    const interacting=interactionState==='DRAGGING'||interactionState==='INERTIA';
    const target=!this.reduced.matches&&restingHero&&!interacting?1:0;
    const response=target?2.5:6;
    this.idleWeight+=(target-this.idleWeight)*(1-Math.exp(-response*dt));
    const yawDeg=this.reduced.matches?0:1.25*Math.sin(now*Math.PI*2/12000)*this.idleWeight;
    this.heroIdleRoot.rotation.set(0,THREE.MathUtils.degToRad(yawDeg),0);
    this.diagnostics.idleYawDeg=yawDeg;this.diagnostics.idleWeight=this.idleWeight;
  }
  update(now:number,dt:number,interactionState='IDLE'):void{
    if(this.startTime===null)return;
    if(this.layoutDirty)this.measure();
    // Advance only with the visible document's clamped frame delta; hidden tabs pause arrival.
    this.elapsed+=dt;
    const duration=this.reduced.matches?.16:.8;
    const t=clamp(this.elapsed/duration);const remaining=1-(1-Math.pow(1-t,3));
    if(this.diagnostics.intro==='arrival'){
      this.entry.position.copy(this.away).multiplyScalar(this.reduced.matches?0:-this.modelDistance*2*remaining).addScaledVector(this.up,this.reduced.matches?0:-this.modelDistance*.075*remaining);
      this.entry.rotation.y=this.reduced.matches?0:THREE.MathUtils.degToRad(-5)*remaining;
      if(t>=1){this.entry.position.set(0,0,0);this.entry.rotation.set(0,0,0);this.showCopy();}
    }
    if(!this.scrollDirty&&this.introComplete){this.updateHeroIdle(now,dt,interactionState);return;}
    this.scrollDirty=false;
    const y=window.scrollY;const h=this.height;const tablet=this.width<=900;const mobile=this.width<=540;
    const hero=this.ranges['.hero-stage']!;const quality=this.ranges['#quality']!;const qbody=this.ranges['.quality-body']!;const qmodel=this.ranges['.quality-model-space']!;const service=this.ranges['#service']!;
    const progress=smooth((y-hero.top)/(hero.height-h)*1.35);this.diagnostics.heroProgress=progress;
    const reduce=this.reduced.matches;this.diagnostics.reducedMotion=reduce;
    this.heading.style.transform=`translateY(${-progress*(mobile?24:tablet?30:h*.04)}px) scale(${mix(1,mobile?.64:tablet?.6:.53,progress)})`;
    this.copy.style.opacity=String(1-smooth(progress*2));this.copy.style.transform=`translateY(${-progress*(reduce?0:24)}px)`;this.copy.style.visibility=progress>.65?'hidden':'visible';
    this.bottom.style.opacity=String(1-progress);
    this.bottom.inert=progress>.9;
    const mp=smooth((progress-.23)/.62);this.metrics.style.opacity=String(mp);this.metrics.style.transform=`translateY(${(1-mp)*(reduce?0:h*.15)}px)`;this.metrics.classList.toggle('is-visible',mp>.01);this.metrics.inert=mp<.1;
    this.counters.forEach((node,i)=>{const target=factory.metrics[i]!;const cp=reduce?1:smooth((progress-.3-i*.035)/.45);const v=Math.round(target.value*cp);if(v!==this.lastCounterValues[i]){node.textContent=formatMetric(target,v);this.lastCounterValues[i]=v;}});
    // HERO.02: contained, upper-balanced right-side Hero composition. This is a screen-space
    // ScrollRoot factor; GLTF scale, camera FOV/elevation/azimuth and ground plane
    // stay untouched. The slightly higher baseline removes the previous low-right
    // “fallen” read without any camera or model roll.
    const heroScale=tablet?.88:.90;
    const heroNdcY=mobile?.22:tablet?.07:.20;
    // Anchor the projected desktop footprint to the header's right boundary.
    // This follows the actual responsive header gutter rather than guessing a
    // model-center X factor; tablet/mobile retain their existing composition.
    const heroX=tablet?0:this.heroRightAnchoredX(heroScale,heroNdcY,this.heroHeaderRightNdc());
    // The metrics frame keeps the factory as the left-hand visual counterweight
    // to the two-column figures: larger, slightly higher, and clear of the data.
    let x=mix(heroX,tablet?0:-.42,progress);let ndcY=mix(heroNdcY,mobile?.42:tablet?.30:-.12,progress);let scale=mix(heroScale,mobile?.47:tablet?.58:.58,progress);let yaw=0;let visible=y<hero.top+hero.height;
    let stage='hero';
    if(y>hero.top+hero.height-h*.15){
      stage='production';visible=false;
      if(y+h>quality.top && y<service.top){
        stage='quality';const qp=clamp((y-qbody.top+h*.25)/Math.max(1,service.top-qbody.top-h*.5));this.diagnostics.qualityProgress=qp;
        yaw=reduce?0:THREE.MathUtils.degToRad(mix(-8,14,qp));
        if(tablet){const centerY=qmodel.top+qmodel.height*.5-y;ndcY=1-2*centerY/h;x=0;scale=mobile?.75:.72;visible=qmodel.top-y<h&&qmodel.top+qmodel.height-y>0;}
        else {const modelRect=el('.quality-model-space').getBoundingClientRect();const centerY=modelRect.top+modelRect.height*.5;ndcY=1-2*centerY/h;x=-.47;scale=.58;visible=y+h>qbody.top+h*.32;}
      }
    }
    this.diagnostics.stage=stage;this.diagnostics.scrollYawDeg=THREE.MathUtils.radToDeg(yaw);this.diagnostics.modelVisible=visible;
    this.viewer.style.opacity=String(visible?(reduce?t:1):0);this.viewer.dataset.active=String(visible&&this.introComplete);
    const interactive=visible&&this.introComplete;if(interactive!==this.interactionActive){this.interactionActive=interactive;this.onInteractive(interactive);}
    // Screen-space composition expressed in camera right/up world units. No absolute
    // approval-camera XYZ and no writes to user DragRoot/approved HoverRoot.
    const heightAtCenter=2*this.modelDistance*Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5));
    const neutralNdc=this.center.clone().project(this.camera);
    this.scrollRoot.rotation.set(0,yaw,0);this.scrollRoot.scale.setScalar(scale);
    this.transformedCenter.copy(this.center).multiplyScalar(scale).applyAxisAngle(THREE.Object3D.DEFAULT_UP,yaw);
    this.scrollRoot.position.copy(this.center).sub(this.transformedCenter).addScaledVector(this.right,(x-neutralNdc.x)*heightAtCenter*this.camera.aspect*.5).addScaledVector(this.up,(ndcY-neutralNdc.y)*heightAtCenter*.5);
    const award=this.ranges['#achievements']!;const ap=clamp((y+h-award.top)/(h+award.height))-.5;
    this.primaryAward.style.transform=`translateY(${reduce?0:ap*70}px)`;this.secondaryAward.style.transform=`translateY(${reduce?0:-ap*42}px)`;
    // Solid covering planes advance first; their content follows at a smaller rate.
    for(const selector of ['#production','#service']){const range=this.ranges[selector]!;const arrival=clamp((range.top-y)/h);const content=el(`${selector} .section-content`);content.style.transform=`translateY(${reduce?0:arrival*(selector==='#service'?38:65)}px)`;}
    // Expose diagnostics in the DOM for read-only browser smoke checks.
    document.documentElement.dataset.landingStage=stage;document.documentElement.dataset.intro=this.diagnostics.intro;
    this.updateHeroIdle(now,dt,interactionState);
  }
}
