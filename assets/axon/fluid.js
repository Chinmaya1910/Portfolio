/* The fluid and particle solvers share a fullscreen triangle. */
'use strict';
window.Axon = window.Axon || {};
(() => {
  const T = window.THREE;
  if (!T) return;

  function target(width, height, type = T.HalfFloatType, filter = T.NearestFilter) {
    return new T.WebGLRenderTarget(width, height, {
      type, format: T.RGBAFormat, minFilter: filter, magFilter: filter,
      generateMipmaps: false, depthBuffer: false, stencilBuffer: false
    });
  }

  function doubleTarget(size, type, filter) {
    let read = target(size, size, type, filter);
    let write = target(size, size, type, filter);
    return {
      get read() { return read; }, get write() { return write; },
      swap() { [read, write] = [write, read]; },
      dispose() { read.dispose(); write.dispose(); }
    };
  }

  // Test the attachment types the two solvers actually use. Float textures can
  // be sampled on some devices even when they cannot be rendered into.
  function supportsSimulation(renderer) {
    const caps = renderer.capabilities;
    if (caps.maxVertexTextures < 1 || caps.maxTextureSize < 512) return false;
    const extensions = renderer.extensions;
    if (caps.isWebGL2) {
      if (!extensions.has('EXT_color_buffer_float')) return false;
    } else {
      if (!extensions.has('OES_texture_float') || !extensions.has('OES_texture_half_float')) return false;
      extensions.has('WEBGL_color_buffer_float');
      extensions.has('EXT_color_buffer_half_float');
    }
    const gl = renderer.getContext();
    const previous = renderer.getRenderTarget();
    const probes = [target(2, 2, T.FloatType), target(2, 2, T.HalfFloatType)];
    try {
      return probes.every(probe => {
        renderer.setRenderTarget(probe);
        return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      });
    } finally {
      renderer.setRenderTarget(previous);
      probes.forEach(probe => probe.dispose());
    }
  }

  function makePointer(element) {
    const gaze = new T.Vector2();
    const start = new T.Vector2();
    const finish = new T.Vector2();
    const mobile = window.matchMedia('(max-width: 760px)');
    const listeners = [];
    let x = 0, y = 0, previousX = 0, previousY = 0;
    let width = 1, height = 1;
    let tracking = false, released = false, lastSplat = -Infinity;

    function reset() {
      tracking = false;
      released = false;
      lastSplat = -Infinity;
      gaze.set(0, 0);
    }
    function release() {
      // A short touch swipe can finish between two animation frames.
      released = true;
      gaze.set(0, 0);
    }
    function sample(clientX, clientY) {
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      width = bounds.width;
      height = bounds.height;
      x = Math.min(width, Math.max(0, clientX - bounds.left));
      y = Math.min(height, Math.max(0, clientY - bounds.top));
      gaze.set(2 * x / width - 1, 2 * y / height - 1);
      if (!tracking || released) {
        previousX = x;
        previousY = y;
        tracking = true;
        released = false;
        lastSplat = -Infinity;
      }
    }
    function listen(target, type, handle) {
      const options = { passive: true };
      target.addEventListener(type, handle, options);
      listeners.push(() => target.removeEventListener(type, handle, options));
    }
    if (window.PointerEvent) {
      const samplePrimary = event => {
        if (event.isPrimary) sample(event.clientX, event.clientY);
      };
      listen(element, 'pointerdown', event => {
        if (!event.isPrimary) return;
        if (event.pointerType !== 'mouse') reset();
        sample(event.clientX, event.clientY);
      });
      listen(element, 'pointermove', samplePrimary);
      listen(element, 'pointerup', event => {
        if (event.isPrimary && event.pointerType !== 'mouse') {
          sample(event.clientX, event.clientY);
          release();
        }
      });
      listen(element, 'pointercancel', event => { if (event.isPrimary) reset(); });
      listen(element, 'pointerleave', event => {
        if (event.isPrimary && !released) reset();
      });
    } else {
      listen(element, 'mousemove', event => sample(event.clientX, event.clientY));
      listen(element, 'mouseleave', reset);
      const sampleTouch = event => {
        const touch = event.touches[0];
        if (touch) sample(touch.clientX, touch.clientY);
      };
      listen(element, 'touchstart', event => {
        if (event.touches.length === 1) reset();
        sampleTouch(event);
      });
      listen(element, 'touchmove', sampleTouch);
      listen(element, 'touchend', release);
      listen(element, 'touchcancel', reset);
    }
    listen(window, 'resize', reset);
    listen(window, 'scroll', reset);
    listen(window, 'blur', reset);
    return {
      gaze,
      consume() {
        if (!tracking) return null;
        if (released) tracking = false;
        const dx = x - previousX, dy = y - previousY;
        const distance = Math.hypot(dx, dy);
        if (distance <= .01) return null;
        const now = performance.now();
        finish.set(x / width, 1 - y / height);
        if (now - lastSplat > 50) start.copy(finish);
        else start.set(previousX / width, 1 - previousY / height);
        previousX = x;
        previousY = y;
        lastSplat = now;
        return { start, finish, dx, dy, distance, aspect: width / height, mobile: mobile.matches };
      },
      dispose() { listeners.forEach(remove => remove()); }
    };
  }

  function makePass(body, values) {
    const uniforms = {};
    for (const [name, value] of Object.entries(values)) uniforms[name] = { value };
    return new T.ShaderMaterial({
      uniforms, depthTest: false, depthWrite: false, blending: T.NoBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=position.xy*.5+.5; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: 'precision highp float; varying vec2 vUv;\n' + body
    });
  }

  function makePipeline(renderer) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0], 3));
    const scene = new T.Scene();
    const mesh = new T.Mesh(geometry);
    const originalMaterial = mesh.material;
    mesh.frustumCulled = false;
    scene.add(mesh);
    const camera = new T.Camera();
    return {
      run(pass, destination, values = {}) {
        for (const [name, value] of Object.entries(values)) pass.uniforms[name].value = value;
        mesh.material = pass;
        renderer.setRenderTarget(destination);
        renderer.render(scene, camera);
      },
      dispose() { geometry.dispose(); originalMaterial.dispose(); }
    };
  }

  function makeFluid(pipe) {
    const size = 256;
    const velocity = doubleTarget(size);
    const density = doubleTarget(512);
    const pressure = doubleTarget(size);
    const curl = target(size, size);
    const divergence = target(size, size);
    // RGBA8 suffices for the display mask, whose values are clamped to [0,1].
    const mask = target(1, 1, T.UnsignedByteType, T.LinearFilter);
    const fields = 'uniform sampler2D field; uniform vec2 texel;\n';
    const neighbors = `
      vec4 L=texture2D(field,vUv-vec2(texel.x,0.)), R=texture2D(field,vUv+vec2(texel.x,0.));
      vec4 B=texture2D(field,vUv-vec2(0.,texel.y)), U=texture2D(field,vUv+vec2(0.,texel.y));`;
    const step = new T.Vector2(1 / size, 1 / size);
    const stencil = (extra, body, uniforms = {}) => makePass(
      fields + extra + 'void main(){' + neighbors + body + '}',
      { field: null, texel: step, ...uniforms }
    );
    const curlPass = stencil('', 'gl_FragColor=vec4(.5*(R.y-L.y-U.x+B.x),0.,0.,1.);');
    const confinement = stencil('uniform sampler2D velocity;', `
      float c=texture2D(field,vUv).x;
      vec2 n=.5*vec2(abs(U.x)-abs(B.x),abs(R.x)-abs(L.x));
      n/=length(n)+.0001; n.y=-n.y;
      vec2 v=texture2D(velocity,vUv).xy+n*c*(30./60.);
      gl_FragColor=vec4(clamp(v,-650.,650.),0.,1.);`, { velocity: null });
    const divergencePass = stencil('', `
      vec2 c=texture2D(field,vUv).xy;
      if(vUv.x<texel.x)L.x=-c.x; if(vUv.x>1.-texel.x)R.x=-c.x;
      if(vUv.y<texel.y)B.y=-c.y; if(vUv.y>1.-texel.y)U.y=-c.y;
      gl_FragColor=vec4(.5*(R.x-L.x+U.y-B.y),0.,0.,1.);`);
    const pressurePass = stencil('uniform sampler2D divergence;', `
      float d=texture2D(divergence,vUv).x;
      gl_FragColor=vec4((L.x+R.x+B.x+U.x-d)*.25,0.,0.,1.);`, { divergence: null });
    const gradient = stencil('uniform sampler2D velocity;', `
      gl_FragColor=vec4(texture2D(velocity,vUv).xy-vec2(R.x-L.x,U.x-B.x),0.,1.);`, { velocity: null });
    const decayPressure = makePass('uniform sampler2D field; void main(){gl_FragColor=.95*texture2D(field,vUv);}', {field:null});
    // Explicit bilinear lookup also works on hardware without half-float linear filtering.
    const advection = makePass(`
      uniform sampler2D field, velocity;
      uniform vec2 fieldTexel;
      uniform float decay;
      vec4 bilinear(sampler2D tex,vec2 p,vec2 size){
        vec2 grid=p/size-.5, f=fract(grid), a=(floor(grid)+.5)*size;
        return mix(mix(texture2D(tex,a),texture2D(tex,a+vec2(size.x,0.)),f.x),
                   mix(texture2D(tex,a+vec2(0.,size.y)),texture2D(tex,a+size),f.x),f.y);
      }
      void main(){
        vec2 v=bilinear(velocity,vUv,vec2(1./256.)).xy;
        gl_FragColor=decay*bilinear(field,vUv-v/(60.*256.),fieldTexel);
      }`, { field:null, velocity:null, fieldTexel:step, decay:1 });
    const dyeStep = new T.Vector2(1/512, 1/512);
    const splat = makePass(`
      uniform sampler2D field;
      uniform vec2 start, finish;
      uniform vec3 impulse;
      uniform float aspect, radius;
      void main(){
        vec2 stretch=vec2(aspect,1.);
        vec2 a=(vUv-start)*stretch, b=(finish-start)*stretch;
        float h=clamp(dot(a,b)/max(dot(b,b),1.e-8),0.,1.);
        vec2 gap=a-b*h;
        float weight=exp(-6.*dot(gap,gap)/max(radius*radius,1.e-8));
        gl_FragColor=vec4(texture2D(field,vUv).xyz+weight*impulse,1.);
      }`, { field:null, start:new T.Vector2(), finish:new T.Vector2(), impulse:new T.Vector3(), aspect:1, radius:0.01 });
    const display = makePass(`
      uniform sampler2D field;
      void main(){vec3 dye=clamp(texture2D(field,vUv).rgb,0.,1.);
      gl_FragColor=vec4(dye,max(dye.r,max(dye.g,dye.b)));}`, {field:null});

    function update(buffer, pass, params) {
      pipe.run(pass, buffer.write, { field:buffer.read.texture, ...params });
      buffer.swap();
    }
    const zero = makePass('void main(){gl_FragColor=vec4(0.);}', {});
    // Initialize the read sides before any shader samples them.
    [velocity.read, density.read, pressure.read, mask].forEach(buffer => pipe.run(zero, buffer));
    const white = new T.Vector3(1,1,1);
    const force = new T.Vector3();
    let energy = 0;
    return {
      get velocity() { return velocity.read.texture; }, get density() { return mask.texture; },
      resize(w,h) { mask.setSize(w,h); energy = Math.max(energy,1); },
      step(stroke) {
        if (stroke) {
          const { dx, dy, distance, start, finish, aspect, mobile } = stroke;
          const mult = Math.min(distance/15,1)*10;
          const radius = Math.min(distance / 5, 1) * 60 * .6 * (mobile ? .8 : 1) / 200;
          const params = {start, finish, aspect, radius};
          // Keep a full-width cursor jump inside the finite half-float range.
          force.set(dx * mult, -dy * mult, 1).clampScalar(-60000, 60000);
          update(velocity,splat,{...params,impulse:force});
          update(density,splat,{...params,impulse:white});
          energy = 360;
        }
        // Zero is a fixed point of the solver. Avoid idle full-screen mask writes.
        if (!energy) return;
        energy--;
        pipe.run(curlPass,curl,{field:velocity.read.texture});
        pipe.run(confinement,velocity.write,{field:curl.texture,velocity:velocity.read.texture});
        velocity.swap();
        pipe.run(divergencePass,divergence,{field:velocity.read.texture});
        update(pressure,decayPressure);
        for (let i=0;i<5;i++) update(pressure,pressurePass,{divergence:divergence.texture});
        pipe.run(gradient,velocity.write,{field:pressure.read.texture,velocity:velocity.read.texture});
        velocity.swap();
        update(velocity,advection,{velocity:velocity.read.texture,fieldTexel:step,decay:.98});
        update(density,advection,{velocity:velocity.read.texture,fieldTexel:dyeStep,decay:.97});
        pipe.run(display,mask,{field:density.read.texture});
      },
      dispose() {
        [velocity,density,pressure,curl,divergence,mask,curlPass,confinement,divergencePass,
          pressurePass,gradient,decayPressure,advection,splat,display,zero].forEach(item=>item.dispose());
      }
    };
  }
  Object.assign(window.Axon, { target, doubleTarget, supportsSimulation, makePointer, makePass, makePipeline, makeFluid });
})();
