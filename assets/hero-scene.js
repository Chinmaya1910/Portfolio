(() => {
  'use strict';

  const width = 900;
  const height = 720;
  const shades = [
    { top: '#94cbff', side: '#3172ec', front: '#254ea4', edge: '#c4e5ffcb' },
    { top: '#7ddafa', side: '#287ac8', front: '#235795', edge: '#c1f2ffda' },
    { top: '#c2c8ff', side: '#695ce2', front: '#473da0', edge: '#ede6ffe6' }
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

  function drawNode(context, project, position, node) {
    const [x, y, z] = position;
    const half = node.size;
    const at = (vx, vy, vz) => project(x + vx * half, y + vy * half, z + vz * half);
    const a = at(-1, 1, -1);
    const b = at(1, 1, -1);
    const c = at(1, 1, 1);
    const d = at(-1, 1, 1);
    const e = at(-1, -1, 1);
    const f = at(1, -1, 1);
    const g = at(1, -1, -1);
    fill(context, [b, c, f, g], node.shade.side);
    fill(context, [d, c, f, e], node.shade.front);
    fill(context, [a, b, c, d], node.shade.top);
    stroke(context, [a, d, c, b], node.shade.edge);
  }

  function renderScene(context, state = 'field', turn = 0, lift = 0) {
    const ordered = typeof state === 'number' ? state : Number(state === 'ordered');
    const project = getProjector(turn, lift);
    background(context, project);

    const positions = points.map((node) => {
      const amount = ease(clamp((ordered - node.delay) / 0.83));
      return node.field.map((value, axis) => value + (node.grid[axis] - value) * amount);
    });
    const projected = positions.map(([x, y, z]) => project(x, y, z));
    const depthOrder = [...points.keys()].sort((first, second) => projected[first][2] - projected[second][2]);

    for (const [from, to, axis] of connections) {
      const depth = (projected[from][2] + projected[to][2]) / 2;
      const opacity = clamp(0.11 + ordered * 0.36 + depth * 0.065);
      if (ordered < 0.1 && axis === 1) continue;
      stroke(context, [projected[from], projected[to]], `rgba(141, 193, 255, ${opacity})`, 0.9 + ordered * 0.6);
    }
    for (const index of depthOrder) drawNode(context, project, positions[index], points[index]);
  }

  // The same geometry is used to export posters for the two static states.
  if (typeof module === 'object' && module.exports) {
    module.exports = { renderScene, width, height };
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
  let amount = Number(stage.dataset.signature === 'ordered');
  const camera = [-0.085, 0.026];
  const target = [0, 0];

  const canDraw = () => available && inView && !preference.matches && !document.hidden;
  const targetAmount = () => Number(stage.dataset.signature === 'ordered');

  function draw() {
    renderScene(context, amount, ...camera);
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

    if (tween) {
      tween.start ??= time;
      const elapsed = clamp((time - tween.start) / tween.duration);
      amount = tween.from + (tween.to - tween.from) * ease(elapsed);
      if (elapsed === 1) tween = null;
    }
    for (let axis = 0; axis < 2; axis++) {
      const difference = target[axis] - camera[axis];
      camera[axis] = Math.abs(difference) < 0.001 ? target[axis] : camera[axis] + difference * 0.18;
    }
    draw();
    if (tween || camera.some((value, axis) => value !== target[axis])) requestFrame();
  }

  function settle() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    tween = null;
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

  stage.addEventListener('pointermove', (event) => {
    if (!canDraw() || !finePointer.matches || event.pointerType !== 'mouse') return;
    const bounds = stage.getBoundingClientRect();
    target[0] = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.32;
    target[1] = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.19;
    requestFrame();
  });
  stage.addEventListener('pointerleave', () => {
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
