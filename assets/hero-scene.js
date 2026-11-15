(() => {
  'use strict';

  const width = 900;
  const height = 720;
  const shades = [
    { top: '#97cfff', side: '#306ee3', front: '#223d82', rim: '#6daeff', edge: '#c4e5ffcb' },
    { top: '#94dfee', side: '#287bad', front: '#1b476e', rim: '#55b7d6', edge: '#c1f2ffda' },
    { top: '#cdd1fe', side: '#655ac7', front: '#41376f', rim: '#9287ee', edge: '#ede6ffe6' }
  ];

  const clamp = (value) => Math.min(1, Math.max(0, value));
  const ease = (value) => value * value * (3 - 2 * value);

  function noise(index, salt) {
    const value = Math.sin(index * 12.9898 + salt * 73.379) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
  }

  const side = 4;
  const points = Array.from({ length: side ** 3 }, (_, index) => {
    const x = ((index % side) - 1.5) * 0.81;
    const y = ((Math.floor(index / side) % side) - 1.5) * 0.82;
    const z = (Math.floor(index / side ** 2) - 1.5) * 0.81;
    const twist = y * 0.64 + 0.37;
    const spunX = x * Math.cos(twist) - z * Math.sin(twist);
    const spunZ = x * Math.sin(twist) + z * Math.cos(twist);
    return {
      grid: [x, y, z],
      field: [
        spunX * 1.32 + y * 0.34 + noise(index, 1) * 0.44,
        y * 1.26 + noise(index, 2) * 0.48,
        spunZ * 1.37 + noise(index, 3) * 0.62
      ],
      size: 0.145 + (noise(index, 5) + 1) * 0.025,
      shade: shades[(Math.floor(index / side) + index % side) % shades.length],
      delay: (x + 1.215) / 2.43 * 0.17
    };
  });

  const connections = [];
  for (let index = 0; index < points.length; index++) {
    if (index % side < side - 1) connections.push([index, index + 1, 0]);
    if (Math.floor(index / side) % side < side - 1) connections.push([index, index + side, 1]);
    if (index < points.length - side ** 2) connections.push([index, index + side ** 2, 2]);
  }

  // A route along adjacent nodes on three exposed edges of the same lattice.
  const traceRoute = [48, 49, 50, 51, 55, 59, 63, 47, 31, 15];

  function getProjector(turn, lift) {
    const yaw = 0.60 + turn;
    const pitch = 0.46 + lift;
    const cosX = Math.cos(yaw);
    const sinX = Math.sin(yaw);
    const cosY = Math.cos(pitch);
    const sinY = Math.sin(pitch);

    return (x, y, z) => {
      const horizontal = x * cosX - z * sinX;
      const front = x * sinX + z * cosX;
      const depth = front * cosY + y * sinY;
      const vertical = y * cosY - front * sinY;
      const scale = 116 / (1 - depth / 20);
      return [width / 2 + horizontal * scale, 326 - vertical * scale, depth];
    };
  }

  function path(context, points) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index++) {
      context.lineTo(points[index][0], points[index][1]);
    }
  }

  function stroke(context, points, color, width = 1) {
    path(context, points);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  }

  function fill(context, points, color) {
    path(context, points);
    context.closePath();
    context.fillStyle = color;
    context.fill();
  }

  function background(context, project) {
    const base = context.createLinearGradient(80, 20, 820, 680);
    base.addColorStop(0, '#0a1430');
    base.addColorStop(0.55, '#122850');
    base.addColorStop(1, '#071124');
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);

    const halo = context.createRadialGradient(490, 328, 0, 490, 328, 470);
    halo.addColorStop(0, '#367cff58');
    halo.addColorStop(0.58, '#244ca447');
    halo.addColorStop(1, '#14316b00');
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);

    // The ground grid makes changes in camera perspective visible.
    for (let step = -4; step <= 4; step++) {
      const offset = step * 0.64;
      const color = step === 0 ? '#6fa8f24b' : '#7097db27';
      stroke(context, [project(-2.56, -1.99, offset), project(2.56, -1.99, offset)], color);
      stroke(context, [project(offset, -1.99, -2.56), project(offset, -1.99, 2.56)], color);
    }
  }

  function drawNode(context, project, position, node, detailed) {
    const [x, y, z] = position;
    const half = node.size;
    const at = (vx, vy, vz) => project(x + vx * half, y + vy * half, z + vz * half);
    const edge = detailed ? 0.89 : 1;
    const shoulder = detailed ? 0.72 : 1;
    const a = at(-edge, 1, -edge);
    const b = at(edge, 1, -edge);
    const c = at(edge, 1, edge);
    const d = at(-edge, 1, edge);
    const rimRight = detailed ? at(1, shoulder, -1) : b;
    const rimCenter = detailed ? at(1, shoulder, 1) : c;
    const rimLeft = detailed ? at(-1, shoulder, 1) : d;
    const e = at(-1, -1, 1);
    const f = at(1, -1, 1);
    const g = at(1, -1, -1);

    fill(context, [rimRight, rimCenter, f, g], node.shade.side);
    fill(context, [rimLeft, rimCenter, f, e], node.shade.front);
    if (detailed) {
      fill(context, [b, c, rimCenter, rimRight], node.shade.top);
      fill(context, [d, c, rimCenter, rimLeft], node.shade.rim);
    }
    fill(context, [a, b, c, d], node.shade.top);
    if (detailed) stroke(context, [a, d, c], node.shade.edge, 0.9);
  }

  function nodePosition(node, ordered) {
    const amount = ease(clamp((ordered - node.delay) / 0.83));
    return node.field.map((value, axis) => value + (node.grid[axis] - value) * amount);
  }

  function drawTrace(context, route, opacity, pulse) {
    stroke(context, route, `rgba(63, 162, 240, ${opacity * 0.4})`, 6);
    stroke(context, route, `rgba(180, 249, 255, ${opacity * 0.94})`, 2.4);
    if (pulse === null) return;

    const lengths = route.slice(1).map(([x, y], index) => Math.hypot(x - route[index][0], y - route[index][1]));
    let distance = pulse * lengths.reduce((total, value) => total + value, 0);
    let index = 0;
    while (index < lengths.length - 1 && distance > lengths[index]) {
      distance -= lengths[index++];
    }
    const [x, y] = route[index];
    const [nextX, nextY] = route[index + 1];
    const progress = clamp(distance / Math.max(1, lengths[index]));
    const head = [x + (nextX - x) * progress, y + (nextY - y) * progress];

    const tail = [route[Math.max(0, index - 1)], route[index], head];
    stroke(context, tail, '#91dfff72', 11);
    stroke(context, tail, '#e8ffff', 3.8);
    context.beginPath();
    context.arc(head[0], head[1], 4, 0, 2 * Math.PI);
    context.fillStyle = '#f8ffff';
    context.fill();
  }

  function renderScene(context, state = 'field', turn = 0, lift = 0, {
    detailed = true, traceOpacity = 0, pulse = null
  } = {}) {
    const ordered = typeof state === 'number' ? state : Number(state === 'ordered');
    const project = getProjector(turn, lift);
    background(context, project);

    const positions = points.map((node) => nodePosition(node, ordered));
    const projected = positions.map(([x, y, z]) => project(x, y, z));
    const depthOrder = [...points.keys()].sort((first, second) => projected[first][2] - projected[second][2]);

    // Draw connections in a few depth bands with one stroke per band.
    const bands = Array.from({ length: 7 }, () => []);
    for (const connection of connections) {
      const [from, to, axis] = connection;
      if (ordered < 0.1 && axis === 1) continue;
      const depth = (projected[from][2] + projected[to][2]) / 2;
      bands[Math.round(clamp((depth + 3) / 6) * (bands.length - 1))].push(connection);
    }
    bands.forEach((connectionsInBand, band) => {
      if (!connectionsInBand.length) return;
      context.beginPath();
      for (const [from, to] of connectionsInBand) {
        context.moveTo(projected[from][0], projected[from][1]);
        context.lineTo(projected[to][0], projected[to][1]);
      }
      const opacity = clamp(0.11 + ordered * 0.36 + (band - 3) * 0.065);
      context.strokeStyle = `rgba(141, 193, 255, ${opacity})`;
      context.lineWidth = 0.9 + ordered * 0.6;
      context.stroke();
    });
    for (const index of depthOrder) drawNode(context, project, positions[index], points[index], detailed);
    if (traceOpacity > 0) drawTrace(context, traceRoute.map((index) => projected[index]), traceOpacity, pulse);
  }

  function tracePosterPath(state) {
    const project = getProjector(0, 0);
    return traceRoute.map((index, step) => {
      const [x, y] = project(...nodePosition(points[index], Number(state === 'ordered')));
      return `${step === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  // The same geometry is used to export posters for the two static states.
  if (typeof module === 'object' && module.exports) {
    module.exports = { renderScene, tracePosterPath, width, height };
    return;
  }

  const stage = document.querySelector('[data-signature]');
  if (!stage) return;
  const canvas = stage.querySelector('canvas');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let context;
  try {
    context = canvas.getContext('2d', { alpha: false });
  } catch {
    return;
  }
  if (!context) return;

  let available = true;
  let inView = !('IntersectionObserver' in window);
  let frame = null;
  let tween = null;
  let traceStart = null;
  let traceRunning = false;
  let cursor = null;
  let previousTime = null;
  let stillFrame = null;
  let amount = Number(stage.dataset.signature === 'ordered');
  const camera = [-0.085, 0.026];
  const target = [0, 0];

  const canDraw = () => available && inView && !preference.matches && !document.hidden;
  const targetAmount = () => Number(stage.dataset.signature === 'ordered');

  function draw(pulse = null) {
    const detailed = stage.clientWidth >= 440 && finePointer.matches;
    const rocking = tween ? Math.sin(amount * Math.PI) * 0.10 : 0;
    if (pulse !== null && !tween && camera.every((value, axis) => value === target[axis]) &&
        typeof OffscreenCanvas === 'function') {
      const key = [canvas.width, canvas.height, amount, ...camera, detailed].join(',');
      if (stillFrame?.key !== key) {
        const buffer = new OffscreenCanvas(canvas.width, canvas.height);
        const bufferContext = buffer.getContext('2d', { alpha: false });
        if (bufferContext) {
          bufferContext.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
          renderScene(bufferContext, amount, ...camera, { detailed });
          const project = getProjector(...camera);
          const route = traceRoute.map((index) => project(...nodePosition(points[index], amount)));
          stillFrame = { key, buffer, route };
        }
      }
      if (stillFrame?.key === key) {
        context.drawImage(stillFrame.buffer, 0, 0, width, height);
        drawTrace(context, stillFrame.route, 1, pulse);
        return;
      }
    }
    stillFrame = null;
    renderScene(context, amount, camera[0] + rocking, camera[1], {
      detailed,
      traceOpacity: stage.dataset.trace === 'true' ? 1 : 0,
      pulse
    });
  }

  function resize() {
    const pixelRatio = Math.min(devicePixelRatio || 1, finePointer.matches ? 1.55 : 1.25);
    const nextWidth = Math.max(1, Math.round(stage.clientWidth * pixelRatio));
    const nextHeight = Math.max(1, Math.round(stage.clientHeight * pixelRatio));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    draw();
  }

  function requestFrame() {
    if (frame === null && canDraw()) frame = requestAnimationFrame(paintFrame);
  }

  function paintFrame(time) {
    frame = null;
    if (!canDraw()) return;

    if (cursor) {
      const bounds = stage.getBoundingClientRect();
      target[0] = ((cursor[0] - bounds.left) / bounds.width - 0.5) * 0.32;
      target[1] = ((cursor[1] - bounds.top) / bounds.height - 0.5) * 0.19;
      cursor = null;
    }
    if (tween) {
      tween.start ??= time;
      const elapsed = clamp((time - tween.start) / tween.duration);
      amount = tween.from + (tween.to - tween.from) * ease(elapsed);
      if (elapsed === 1) tween = null;
    }

    const delta = Math.min(50, time - (previousTime ?? time - 16.7));
    const damping = 1 - 0.82 ** (delta / 16.7);
    for (let axis = 0; axis < 2; axis++) {
      const difference = target[axis] - camera[axis];
      camera[axis] = Math.abs(difference) < 0.001 ? target[axis] : camera[axis] + difference * damping;
    }

    let pulse = null;
    if (traceRunning) {
      traceStart ??= time;
      const elapsed = (time - traceStart) / 1000;
      if (elapsed < 1) pulse = elapsed;
      else traceRunning = false;
    }
    draw(pulse);

    const moving = tween || traceRunning || camera.some((value, axis) => value !== target[axis]);
    previousTime = moving ? time : null;
    if (moving) requestFrame();
  }

  function settle() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    tween = null;
    traceStart = null;
    traceRunning = false;
    cursor = null;
    previousTime = null;
    stillFrame = null;
    amount = targetAmount();
    camera.fill(0);
    target.fill(0);
  }

  function updateAvailability() {
    if (!canDraw()) {
      settle();
      stage.removeAttribute('data-ready');
      return;
    }
    resize();
    stage.setAttribute('data-ready', '');
    requestFrame();
  }

  stage.addEventListener('signaturechange', () => {
    const to = targetAmount();
    if (!canDraw()) {
      settle();
      return;
    }
    tween = { from: amount, to, duration: Math.max(240, 900 * Math.abs(to - amount)), start: null };
    requestFrame();
  });

  stage.addEventListener('tracechange', () => {
    traceStart = null;
    traceRunning = stage.dataset.trace === 'true' && canDraw();
    requestFrame();
  });
  stage.addEventListener('pointermove', (event) => {
    if (!canDraw() || !finePointer.matches || event.pointerType !== 'mouse') return;
    cursor = [event.clientX, event.clientY];
    requestFrame();
  }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    cursor = null;
    target.fill(0);
    requestFrame();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateAvailability();
    }).observe(stage);
  } else {
    updateAvailability();
  }
  window.addEventListener('resize', () => {
    if (canDraw()) resize();
  }, { passive: true });
  preference.addEventListener('change', updateAvailability);
  document.addEventListener('visibilitychange', updateAvailability);
  canvas.addEventListener('contextlost', () => {
    available = false;
    updateAvailability();
  });
  canvas.addEventListener('contextrestored', () => {
    available = true;
    updateAvailability();
  });
})();
