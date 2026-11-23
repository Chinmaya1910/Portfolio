/* Interactive particle sculpture for the portfolio hero. */
(() => {
  'use strict';

  const canvas = document.getElementById('bg');
  const stage = canvas?.closest('.particle-stage');
  if (!stage) return;
  const bench = stage.querySelector('.workbench') || stage;
  const motionButton = document.querySelector('[data-pause-surface]');
  const motionHint = stage.closest('figure')?.querySelector('.stir-hint');
  const A = window.Axon = window.Axon || {};
  const T = window.THREE;
  const tau = Math.PI * 2;
  const sqrtSeam = Math.sqrt(.012);
  const foldMin = Math.sqrt(.0215) - sqrtSeam;
  const small = matchMedia('(max-width: 760px)');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionPreference.matches;
  let inView = false;
  let frameId = 0;
  let lastFrame = 0;
  let engine;
  let visibleCanvas = canvas;

  function compositionBounds(frame) {
    const area = bench.getBoundingClientRect();
    return { left: area.left - frame.left, top: area.top - frame.top, width: area.width, height: area.height };
  }

  // Sample the same folded shell used by the implicit field. These samples are
  // used to frame the camera, and to paint the low-capability canvas version.
  function shellPoint(a, b) {
    const radius = .319 + .044 * Math.sin(3*a + .6) + .025 * Math.cos(2*a - .65);
    const tube = .114 + .029 * Math.sin(2*a + 1.7) + .019 * Math.cos(3*a + .75);
    const crossRadius = Math.sqrt(tube*tube - (.72*foldMin)**2);
    const sine = Math.sin(b);
    const fold = Math.hypot(foldMin, crossRadius * sine / .72);
    const radial = radius + crossRadius * Math.cos(b) + .30 * fold * Math.sin(2*a + .3);
    const z = Math.sign(sine) * Math.sqrt(Math.max(0, (fold + sqrtSeam)**2 - .0215));
    return [.90*radial*Math.cos(a), 1.18*radial*Math.sin(a), z];
  }

  const matcap = 'data:image/png;base64,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';

  const shape = `
    // q.zxy is p rotated by quaternion (0.5, 0.5, 0.5, 0.5).
    float surface(vec3 p) {
      float bound = length(p);
      if (bound > .8) return bound - .7;
      p.z = sqrt(p.z*p.z + .0215) - sqrt(.012);
      vec3 q = p.zxy;
      vec2 plane = q.yz / vec2(.90, 1.18);
      float radial = max(length(plane), .00001);
      vec2 dir = plane / radial;
      // Harmonics of the polar angle, shared across the three lobes.
      float c2 = dir.x*dir.x - dir.y*dir.y, s2 = 2.*dir.x*dir.y;
      float c3 = c2*dir.x - s2*dir.y, s3 = s2*dir.x + c2*dir.y;
      float radius = .319 + .044*(s3*.825336 + c3*.564642) + .025*(c2*.796084 + s2*.605186);
      float tube = .114 + .029*(s2*(-.128844) + c2*.991665) + .019*(c3*.731689 - s3*.681639);
      float tilt = .30*q.x*(s2*.955336 + c2*.295520);
      return .84*(length(vec2(radial-radius-tilt, .72*q.x))-tube);
    }
    vec3 surfaceNormal(vec3 p) {
      vec2 d = vec2(.001, 0.);
      vec3 n = vec3(surface(p+d.xyy)-surface(p-d.xyy),
                    surface(p+d.yxy)-surface(p-d.yxy),
                    surface(p+d.yyx)-surface(p-d.yyx));
      return n / max(.0000001, length(n));
    }
    vec3 curlNoise(vec3 p) {
      // Analytic curl of three periodic sine potentials.
      vec3 a = cos(p.yzx*vec3(3.1,2.6,3.8) + p.zxy + vec3(.7,4.8,1.4));
      vec3 b = cos(p.zxy*vec3(2.4,3.6,2.9) - p.yzx + vec3(5.3,1.5,3.1));
      vec3 curl = vec3(a.z+2.9*b.z, a.x+2.4*b.x, a.y+3.6*b.y)
                - vec3(2.6*a.y-b.y, 3.8*a.z-b.z, 3.1*a.x-b.x);
      return curl / max(.001,length(curl));
    }`;

  const simulationShader = `
    uniform sampler2D previous, origin, velocity, density;
    uniform mat4 clipFromModel;
    uniform mat3 flowRotation, viewNormal;
    uniform float elapsed, hz, settle;
    ` + shape + `
    void main() {
      vec3 source = texture2D(origin, vUv).xyz;
      vec3 p = texture2D(previous, vUv).xyz;
      if (length(p) > .7) p *= .5;
      p += curlNoise(p*.1 + elapsed*.05)*(.0002*hz);
      vec3 n = surfaceNormal(p);
      p += cross(p/max(.0001,length(p)), n)*(.0005*hz);
      p -= n*surface(p)*settle;
      p += (source-p)*(.0002*hz);
      vec4 clip = clipFromModel*vec4(p,1.);
      vec2 screen = .5+.5*clip.xy/clip.w;
      vec2 v = texture2D(velocity, screen).xy;
      p += flowRotation*vec3(v,0.)*(.00004*hz)*texture2D(density,screen).a;

      vec3 normal = normalize(viewNormal*n);
      vec3 key = normalize(vec3(-.55,.72,.68));
      float light = max(0., dot(normal,key));
      float glint = pow(max(0., dot(normal,normalize(key+vec3(0.,0.,1.)))),12.);
      float rim = pow(1.-min(1.,abs(normal.z)),2.);
      float facing = smoothstep(-.40,.24,normal.z);
      float longitude = atan(p.y/1.18, p.x/.90);
      float grain = .64 + .36*pow(.5+.5*sin(66.*longitude + 27.*p.z + 3.*sin(longitude*3.)),3.);
      float shade = (.26+.80*light+.46*glint+.25*rim)*mix(.29,1.,facing)*grain;
      gl_FragColor = vec4(p,shade);
    }`;

  const pointVertex = `
    uniform sampler2D particles;
    attribute vec4 random;
    uniform float dpr, footprint;
    varying vec4 seed;
    varying float shade, scale;
    void main() {
      vec4 state = texture2D(particles,position.xy);
      vec3 p = state.xyz * mix(1.,1.5,pow(random.y,150.));
      vec4 view = modelViewMatrix*vec4(p,1.);
      scale = smoothstep(3.,15.,length(view.xyz))*mix(.5,1.,random.z);
      gl_PointSize = clamp(.04*dpr*2.*scale*(1000./-view.z)*footprint,1.,10.*dpr);
      gl_Position = projectionMatrix*view;
      shade = state.w;
      seed = random;
    }`;

  const pointFragment = `
    uniform sampler2D matcap;
    uniform float elapsed, exposure;
    varying vec4 seed;
    varying float shade, scale;
    void main() {
      vec2 xy = gl_PointCoord-.5;
      float rr = dot(xy,xy);
      if (rr>.25 || scale<.1) discard;
      float a = sin(elapsed+seed.z*20.)*.5 + 1.;
      vec2 uv = mat2(cos(a),-sin(a),sin(a),cos(a))*xy+.5;
      float sphere = texture2D(matcap,uv).r;
      vec3 color = mix(vec3(.2*seed.x),vec3(.60,.45,1.),pow(seed.z,100.));
      float sparkle = max(.12,.5+(.4+sin(elapsed*4.+seed.y*20.))*pow(seed.z,10.)*2.5);
      vec3 softLight = (1.-2.*sphere)*color*color + 2.*sphere*color;
      color = mix(color,softLight,.8);
      vec3 overlay = mix(2.*color*sphere,1.-2.*(1.-color)*(1.-sphere),step(.5,color));
      color = mix(color,overlay,.2);
      gl_FragColor = vec4(color*sparkle*shade*exposure*(1.-smoothstep(.08,.25,rr)),1.);
    }`;

  function createGpu(renderer) {
    const pipe = A.makePipeline(renderer);
    const fluid = A.makeFluid(pipe);
    const pointer = A.makePointer(stage);
    const scene = new T.Scene();
    const group = new T.Group();
    group.position.set(.343,.16,-1);
    group.rotation.set(...[-28.4,390,4.92].map(T.MathUtils.degToRad));
    group.scale.set(5,5,6);
    scene.add(group);
    group.updateMatrixWorld(true);

    const camera = new T.PerspectiveCamera(30, 1, .1, 1000);
    const base = new T.Vector3(-1.17,0,6);
    camera.position.copy(base);
    const currentView = new T.Vector3();
    const gaze = new T.Vector3();
    const drawSize = new T.Vector2();
    const viewModel = new T.Matrix4(), clipFromModel = new T.Matrix4();
    const normal = new T.Matrix3(), flowRotation = new T.Matrix3();
    const groupRotation = new T.Matrix3().setFromMatrix4(new T.Matrix4().makeRotationFromEuler(group.rotation)).transpose();
    let active = true;
    const bitmap = new T.TextureLoader().load(matcap, () => { if (active && paused && points) draw(0); });
    const solver = A.makePass(simulationShader, {
      previous:null, origin:null, velocity:null, density:null, clipFromModel, flowRotation, viewNormal:normal,
      elapsed:0, hz:1, settle:.5
    });
    const material = new T.ShaderMaterial({
      vertexShader:pointVertex, fragmentShader:pointFragment,
      uniforms:{ particles:{value:null}, matcap:{value:bitmap}, elapsed:{value:0},
                 footprint:{value:1}, dpr:{value:1}, exposure:{value:1} },
      blending:T.AdditiveBlending, transparent:true, depthTest:true, depthWrite:false
    });

    const copy = A.makePass('uniform sampler2D source;void main(){gl_FragColor=texture2D(source,vUv);}', {source:null});
    let size = 0, elapsed = 0, positions, origin, points;
    function seed(sizeNext) {
      if (points) {
        group.remove(points);
        points.geometry.dispose();
        positions.dispose();
        origin.dispose();
      }
      size = sizeNext;
      const count = size*size;
      const xyz = new Float32Array(count*3);
      const random = new Float32Array(count*4);
      const data = new Float32Array(count*4);
      for (let i = 0; i < count; i++) {
        xyz[3*i] = (i%size+.5)/size;
        xyz[3*i+1] = (Math.floor(i/size)+.5)/size;
        for (let k = 0; k < 4; k++) {
          random[4*i+k] = Math.random();
          data[4*i+k] = k===3 ? .2 : Math.random()*2-1;
        }
      }
      origin = new T.DataTexture(data,size,size,T.RGBAFormat,T.FloatType);
      origin.needsUpdate = true;
      positions = A.doubleTarget(size,T.FloatType);
      pipe.run(copy,positions.read,{source:origin});
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position',new T.BufferAttribute(xyz,3));
      geometry.setAttribute('random',new T.BufferAttribute(random,4));
      points = new T.Points(geometry,material);
      points.frustumCulled = false;
      group.add(points);
      elapsed = 0;
    }

    function updateMatrices() {
      camera.lookAt(0,0,0);
      camera.updateMatrixWorld();
      viewModel.multiplyMatrices(camera.matrixWorldInverse,group.matrixWorld);
      clipFromModel.multiplyMatrices(camera.projectionMatrix,viewModel);
      normal.getNormalMatrix(viewModel);
      flowRotation.setFromMatrix4(camera.matrixWorld).premultiply(groupRotation);
    }

    function simulate(hz, settle) {
      pipe.run(solver,positions.write,{
        previous:positions.read.texture, origin, velocity:fluid.velocity, density:fluid.density,
        elapsed, hz, settle
      });
      positions.swap();
    }

    function draw(dt) {
      if (dt) {
        elapsed += dt;
        const hz = dt*60;
        gaze.set(base.x-pointer.gaze.x, base.y+2*pointer.gaze.y, base.z);
        camera.position.lerp(gaze,1-Math.pow(.95,hz));
        updateMatrices();
        fluid.step(pointer.consume());
        simulate(hz,1-Math.pow(1-(.034+.466*Math.min(1,elapsed/2.8)**2),hz));
      }
      material.uniforms.particles.value = positions.read.texture;
      material.uniforms.elapsed.value = elapsed;
      renderer.setRenderTarget(null);
      renderer.render(scene,camera);
    }

    // Off-axis framing puts the sculpture inside its composition bounds while
    // keeping the fluid textures aligned with the entire artboard.
    function resize() {
      const frame = stage.getBoundingClientRect();
      const w = Math.max(1, Math.round(frame.width)), h = Math.max(1, Math.round(frame.height));
      const dpr = Math.min(devicePixelRatio || 1,2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w,h,false);
      renderer.getDrawingBufferSize(drawSize);
      fluid.resize(drawSize.x,drawSize.y);
      const nextSize = small.matches ? 128 : 512;
      const newField = size !== nextSize;
      if (newField) seed(nextSize);
      const area = compositionBounds(frame);
      currentView.copy(camera.position);
      camera.position.copy(base);
      camera.aspect = w/h;
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      updateMatrices();
      const p = new T.Vector3();
      let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
      for (let i=0;i<72;i++) for (let j=0;j<12;j++) {
        p.fromArray(shellPoint(tau*i/72,tau*j/12)).applyMatrix4(group.matrixWorld).project(camera);
        x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); y0=Math.min(y0,p.y); y1=Math.max(y1,p.y);
      }
      const aw = Math.max(60,area.width), ah = Math.max(60,area.height);
      const fit = small.matches ? .93 : (aw < 360 ? 1.08 : .94);
      camera.zoom = Math.min(aw*fit/(.5*w*(x1-x0)),ah*.94/(.5*h*(y1-y0)));
      camera.updateProjectionMatrix();
      camera.projectionMatrix.elements[8] += .5*(x0+x1)*camera.zoom - (2*(area.left+aw*.5)/w-1);
      camera.projectionMatrix.elements[9] += .5*(y0+y1)*camera.zoom - (1-2*(area.top+ah*.49)/h);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      camera.position.copy(currentView);
      updateMatrices();

      const width = (x1-x0)*camera.zoom*w/2;
      const height = (y1-y0)*camera.zoom*h/2;
      const grainSize = Math.sqrt(width*height)/480 * (512/size);
      material.uniforms.footprint.value = Math.max(.48,Math.min(1.9,grainSize));
      material.uniforms.dpr.value = dpr;
      material.uniforms.exposure.value = Math.min(5,2.5*(grainSize/material.uniforms.footprint.value)**2);
      if (newField) {
        fluid.step(null);
        // Visitors requesting reduced motion see the settled surface immediately.
        if (paused) for (let i=0;i<12;i++) simulate(1,.9);
        else simulate(1,.09);
      }
      draw(0);
    }
    function dispose() {
      active = false;
      pointer.dispose();
      [points.geometry, positions, origin, material, bitmap, solver, copy, fluid, pipe]
        .forEach(resource => resource.dispose());
    }
    return {resize, draw, dispose, discardInput:() => pointer.consume()};
  }

  // The 2D renderer samples the same three-dimensional surface. Its compact
  // displacement grid keeps touch and gaze working without float framebuffers.
  function createCanvasSurface() {
    let field = visibleCanvas;
    let ctx = field.getContext('2d', {alpha:false});
    if (!ctx) {
      field = canvas.cloneNode(false);
      ctx = field.getContext('2d', {alpha:false});
      if (!ctx) return null;
      visibleCanvas.replaceWith(field);
      visibleCanvas = field;
    }
    const pointer = A.makePointer ? A.makePointer(stage) : {
      gaze:{x:0,y:0}, consume:() => null, dispose() {}
    };
    const n = small.matches ? 26000 : 82000;
    const particles = new Float32Array(n*6);
    const rad = Math.PI/180;
    const cx=Math.cos(-28.4*rad), sx=Math.sin(-28.4*rad);
    const cy=Math.cos(390*rad), sy=Math.sin(390*rad);
    const cz=Math.cos(4.92*rad), sz=Math.sin(4.92*rad);
    const ca=Math.cos(Math.atan(1.17/6)), sa=Math.sin(Math.atan(1.17/6));
    function rotate(x,y,z) {
      const xx=cz*x-sz*y, yy=sz*x+cz*y;
      const xxx=cy*xx+sy*z, zz=cy*z-sy*xx;
      const yyy=cx*yy-sx*zz, zzz=sx*yy+cx*zz;
      return [ca*xxx+sa*zzz, yyy, ca*zzz-sa*xxx];
    }

    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for (let i=0;i<n;i++) {
      const a=Math.random()*tau, b=Math.random()*tau;
      const p=shellPoint(a,b), du=shellPoint(a+.0003,b), dv=shellPoint(a,b+.0003);
      const u=du.map((v,k)=>v-p[k]), v=dv.map((v,k)=>v-p[k]);
      let [nx,ny,nz]=rotate(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],(u[0]*v[1]-u[1]*v[0])/1.2);
      const len=Math.hypot(nx,ny,nz)||1;
      nx/=len; ny/=len; nz/=len;
      const [x,y,z]=rotate(p[0],p[1],p[2]*1.2);
      const zoom=1/(1-z*.68);
      minX=Math.min(minX,x*zoom); maxX=Math.max(maxX,x*zoom);
      minY=Math.min(minY,y*zoom); maxY=Math.max(maxY,y*zoom);
      const lod=.5+.5*Math.sin(66*a+27*p[2]+3*Math.sin(3*a));
      const light=Math.max(0,-.485*nx+.637*ny+.602*nz);
      const glint=Math.max(0,-.287*nx+.376*ny+.881*nz)**12;
      const facing=.29+.71*Math.min(1,Math.max(0,(nz+.45)/.7));
      const rough=(.54+.46*lod**3)*(.30+Math.random()**2*1.45);
      const j=i*6, fleck=Math.random(), scatter=1+.5*Math.random()**150;
      particles[j]=x*scatter; particles[j+1]=y*scatter; particles[j+2]=z*scatter;
      particles[j+3]=(.30+1.18*light+.85*glint+.36*(1-Math.abs(nz))**2)*facing*rough;
      particles[j+4]=fleck**70; particles[j+5]=Math.random()*20;
    }

    const cells=48, flowX=new Float32Array(cells*cells), flowY=flowX.slice();
    let img, left, top, scale, ox, oy, gain, dpr, time=0, gx=0, gy=0, lastPaint=0;
    function resize() {
      dpr=Math.min(devicePixelRatio||1,1.5);
      const frame = stage.getBoundingClientRect();
      field.width=Math.max(1, Math.round(frame.width*dpr));
      field.height=Math.max(1, Math.round(frame.height*dpr));
      const area=compositionBounds(frame);
      const width=Math.max(60,area.width), height=Math.max(60,area.height);
      const fit = small.matches ? .93 : (width < 360 ? 1.08 : .94);
      scale=Math.min(width*fit/(maxX-minX),height*.94/(maxY-minY))*dpr;
      const sw=Math.ceil((maxX-minX)*scale*1.62), sh=Math.ceil((maxY-minY)*scale*1.62);
      left=Math.round((area.left+width/2)*dpr-sw/2);
      top=Math.round((area.top+height*.49)*dpr-sh/2);
      ox=sw/2-scale*(minX+maxX)/2;
      oy=sh/2+scale*(minY+maxY)/2;
      img=ctx.createImageData(sw,sh);
      gain=180*(scale*.9)**2/n;
      flowX.fill(0); flowY.fill(0);
      draw(0);
    }

    function draw(dt) {
      time+=dt;
      if (dt && time-lastPaint<1/30) return;
      lastPaint=time;
      const width=img.width,height=img.height, data=img.data;
      data.fill(0);
      const stroke=pointer.consume();
      const ease=dt ? .11 : 0;
      gx+=(pointer.gaze.x-gx)*ease;
      gy+=(pointer.gaze.y-gy)*ease;
      const xCell=cells/width, yCell=cells/height;
      for (let k=0;k<flowX.length;k++) { flowX[k]*=.91; flowY[k]*=.91; }
      if (stroke && dt) {
        const px=(stroke.finish.x*field.width-left)*xCell;
        const py=((1-stroke.finish.y)*field.height-top)*yCell;
        for (let y=0;y<cells;y++) for (let x=0;x<cells;x++) {
          const dx=x-px,dy=(y-py)*height/width;
          const w=Math.exp(-(dx*dx+dy*dy)/18)*dpr;
          const k=y*cells+x;
          flowX[k]+=w*Math.max(-42,Math.min(42,stroke.dx));
          flowY[k]+=w*Math.max(-42,Math.min(42,stroke.dy));
        }
      }
      for (let j=0;j<particles.length;j+=6) {
        const z=particles[j+2], zoom=1/(1-z*.68);
        let x=ox+scale*(particles[j]-gx*z*.15)*zoom;
        let y=oy-scale*(particles[j+1]+gy*z*.26)*zoom;
        const fx=x*xCell,fy=y*yCell,ix=fx|0,iy=fy|0;
        if (ix>=0 && iy>=0 && ix<cells-1 && iy<cells-1) {
          const k=iy*cells+ix, dx=fx-ix,dy=fy-iy;
          const aa=(1-dx)*(1-dy),bb=dx*(1-dy),cc=(1-dx)*dy,dd=dx*dy;
          x+=aa*flowX[k]+bb*flowX[k+1]+cc*flowX[k+cells]+dd*flowX[k+cells+1];
          y+=aa*flowY[k]+bb*flowY[k+1]+cc*flowY[k+cells]+dd*flowY[k+cells+1];
        }
        const px=x|0,py=y|0;
        if (px<0 || px>=width-1 || py<0 || py>=height-1) continue;
        const k=4*(py*width+px), accent=particles[j+4];
        const shine=particles[j+3]*gain*(1+accent*(1.7+Math.sin(time*2+particles[j+5])));
        const dx=x-px,dy=y-py;
        const red=shine*(1-.22*accent),green=shine*(1-.48*accent),blue=shine*(1+.58*accent);
        for (let m=0;m<4;m++) {
          const k2=k+4*((m&1)+(m>>1)*width);
          const weight=(m&1?dx:1-dx)*(m>=2?dy:1-dy);
          data[k2]+=red*weight; data[k2+1]+=green*weight; data[k2+2]+=blue*weight; data[k2+3]=255;
        }
      }
      ctx.putImageData(img,left,top);
    }
    return {draw, resize, dispose:() => pointer.dispose(), discardInput:() => pointer.consume()};
  }

  function tick(stamp) {
    frameId=0;
    if (!inView || document.hidden || paused || !engine) return;
    const dt=lastFrame ? Math.min(.05,(stamp-lastFrame)/1000) : 1/60;
    lastFrame=stamp;
    engine.draw(dt);
    frameId=requestAnimationFrame(tick);
  }

  function schedule() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId=0;
    lastFrame=0;
    if (engine && inView && !paused && !document.hidden) frameId=requestAnimationFrame(tick);
  }

  function updateControl() {
    if (motionHint) motionHint.hidden = !engine || paused;
    if (!motionButton) return;
    const label = paused ? 'Resume motion' : 'Pause motion';
    motionButton.hidden = !engine;
    motionButton.dataset.paused = String(paused);
    motionButton.title = label;
    motionButton.setAttribute('aria-label', label);
    const text = motionButton.querySelector('[data-surface-label]');
    if (text) text.textContent = label;
  }

  function useFallback() {
    engine = createCanvasSurface();
    stage.dataset.surface = engine ? 'canvas' : 'unavailable';
  }

  function useGpu(renderer) {
    engine = createGpu(renderer);
    stage.dataset.surface = 'gpu';
  }

  function initialize() {
    const options = {alpha:false, antialias:false, depth:true, powerPreference:'high-performance'};
    let renderer;
    try {
      const gl = T && A.supportsSimulation && (canvas.getContext('webgl2',options) || canvas.getContext('webgl',options));
      if (gl) {
        renderer = new T.WebGLRenderer({...options,canvas,context:gl});
        renderer.setClearColor(0x000000,1);
        if (A.supportsSimulation(renderer)) useGpu(renderer);
      }
    } catch {
      // The browser can revoke graphics access while a context is being created.
    }
    if (!engine) {
      renderer?.dispose();
      useFallback();
    } else {
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        engine?.dispose();
        useFallback();
        engine?.resize();
        updateControl();
        schedule();
      });
      canvas.addEventListener('webglcontextrestored', () => {
        if (!A.supportsSimulation(renderer)) return;
        engine?.dispose();
        if (visibleCanvas !== canvas) visibleCanvas.replaceWith(canvas);
        visibleCanvas = canvas;
        useGpu(renderer);
        engine.resize();
        updateControl();
        schedule();
      });
    }
    engine?.resize();
    updateControl();
  }

  A.surface={
    get paused() { return paused; },
    setPaused(value) {
      const stop=Boolean(value);
      if (paused===stop) return;
      paused=stop;
      engine?.discardInput();
      updateControl();
      schedule();
    },
    resize() { engine?.resize(); }
  };

  motionButton?.addEventListener('click', () => A.surface.setPaused(!paused));
  motionPreference.addEventListener('change', () => A.surface.setPaused(motionPreference.matches));

  function syncVisibility() {
    if (inView && !document.hidden && !stage.dataset.surface) initialize();
    schedule();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncVisibility();
    }).observe(stage);
  } else {
    function checkPosition() {
      const bounds = stage.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < innerHeight;
      if (visible === inView) return;
      inView = visible;
      syncVisibility();
    }
    window.addEventListener('scroll', checkPosition, {passive:true});
    window.addEventListener('resize', checkPosition);
    checkPosition();
  }
  const resize = () => engine?.resize();
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    if (bench !== stage) observer.observe(bench);
  } else window.addEventListener('resize', resize);
  small.addEventListener('change', resize);
  document.addEventListener('visibilitychange', syncVisibility);
})();
