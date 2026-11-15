(() => {
  'use strict';

  const width = 900;
  const height = 720;
  const tau = 2 * Math.PI;

  function createProjection(yaw, pitch, scale, centerY) {
    const [cosYaw, sinYaw] = [Math.cos(yaw), Math.sin(yaw)];
    const [cosPitch, sinPitch] = [Math.cos(pitch), Math.sin(pitch)];
    return ([x, y, z]) => {
      const horizontal = x * cosYaw - z * sinYaw;
      const front = x * sinYaw + z * cosYaw;
      const depth = front * cosPitch + y * sinPitch;
      const vertical = y * cosPitch - front * sinPitch;
      const perspective = scale / (1 - depth / 20);
      return [width / 2 + horizontal * perspective, centerY - vertical * perspective, depth];
    };
  }

  function trace(context, points) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index++) {
      context.lineTo(points[index][0], points[index][1]);
    }
  }

  function line(context, points, color, size = 1) {
    trace(context, points);
    context.strokeStyle = color;
    context.lineWidth = size;
    context.stroke();
  }

  function polygon(context, points, color) {
    trace(context, points);
    context.closePath();
    context.fillStyle = color;
    context.fill();
  }

  function dot(context, x, y, radius, color) {
    context.beginPath();
    context.arc(x, y, radius, 0, tau);
    context.fillStyle = color;
    context.fill();
  }

  function linear(context, coordinates, colors) {
    const gradient = context.createLinearGradient(...coordinates);
    colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
    return gradient;
  }

  function backdrop(context, colors, glow, lightX, lightY, light = false) {
    context.fillStyle = linear(context, [110, 620, 800, 55], colors);
    context.fillRect(0, 0, width, height);
    const halo = context.createRadialGradient(lightX, lightY, 0, lightX, lightY, 570);
    halo.addColorStop(0, glow);
    halo.addColorStop(1, '#739ef000');
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);
    for (let x = 36; x < width; x += 32) {
      for (let y = 48; y < height; y += 32) {
        // Use a fixed pattern so the texture remains stable as the camera moves.
        const accent = (x + y * 3) % 9 === 0;
        dot(context, x, y, accent ? 1.05 : 0.65, light ? '#4767943e' : '#a9caff3d');
      }
    }
  }

  function ribbonPoint(t, strand) {
    const twist = 3.9 * Math.PI * t - 0.52;
    return [
      6.15 * (t - 0.5) + 0.18 * strand * Math.sin(twist),
      0.94 * Math.sin(tau * t - 2.61) + 1.98 * (t - 0.5) + 0.82 * strand * Math.cos(twist),
      0.8 * Math.cos(tau * t - 0.56) + 1.35 * strand * Math.sin(twist)
    ];
  }

  function drawSignal(context, turn, lift, pulse) {
    backdrop(context, ['#080f27', '#10264e', '#0c1937'], '#315ab895', 545, 365);
    const project = createProjection(0.29 + turn, 0.12 + lift, 117, 342);
    const bands = [
      { from: -1, to: -0.16, color: ['#648cff45', '#687ffe16', '#9da8ff51'], line: ['#759bff60', '#92a8ffd9', '#b0e9ffb0'] },
      { from: 0.03, to: 1, color: ['#26aaff46', '#2976f039', '#6bcdff60'], line: ['#527cffa5', '#7ac5ffd9', '#adf0ffed'] }
    ];

    for (const band of bands) {
      const strips = Array.from({ length: 13 }, (_, index) => {
        const strand = band.from + (band.to - band.from) * index / 12;
        return Array.from({ length: 65 }, (_, step) => project(ribbonPoint(step / 64, strand)));
      });
      const shade = linear(context, [125, 500, 790, 195], band.color);
      const edge = linear(context, [115, 550, 805, 142], band.line);
      polygon(context, [...strips[0], ...strips[12].slice().reverse()], shade);
      for (let step = 4; step < 64; step += 3) {
        line(context, strips.map((strip) => strip[step]), '#a8d6ff39', 0.8);
      }
      strips.forEach((strip, index) => {
        line(context, strip, index === 0 || index === 12 ? edge : '#6eacff8c', index === 0 || index === 12 ? 2.3 : 1);
      });
    }

    // Bright transverse segments make the pulse look like a wave through the ribbon.
    if (pulse > 0) {
      const brightness = Math.sin(Math.PI * pulse);
      for (let offset = 7; offset >= 0; offset--) {
        const center = pulse - offset * 0.012;
        if (center <= 0) continue;
        const points = Array.from({ length: 17 }, (_, index) => project(ribbonPoint(center, index / 8 - 1)));
        const opacity = brightness * (1 - offset / 8) * 0.8;
        line(context, points, `rgba(205, 242, 255, ${opacity})`, 1.2 + (7 - offset) * 0.28);
      }
    }
  }

  const terrainHalfX = 3.14;
  const terrainHalfZ = 2.3;
  const sections = 19;

  function elevation(x, z) {
    const high = 1.1 * Math.exp(-((x + 1.05) ** 2 * 0.47 + (z - 0.78) ** 2 * 0.88));
    const low = 0.72 * Math.exp(-((x - 1.44) ** 2 * 0.72 + (z + 0.88) ** 2 * 0.65));
    const folds = 0.17 * Math.sin(1.8 * x + 0.4) * Math.cos(1.7 * z);
    const edge = Math.max(0, (1 - (x / terrainHalfX) ** 8) * (1 - (z / terrainHalfZ) ** 8));
    return -0.63 + (high + low + folds + 0.08) * edge;
  }

  const terrain = Array.from({ length: sections + 1 }, (_, row) => {
    const z = terrainHalfZ * (2 * row / sections - 1);
    return Array.from({ length: sections + 1 }, (_, column) => {
      const x = terrainHalfX * (2 * column / sections - 1);
      return [x, elevation(x, z), z];
    });
  });

  function trailPoint(t) {
    const x = -2.73 + 5.46 * t;
    const z = 0.85 * Math.cos(tau * t - 0.5) + 0.35 * Math.sin(2 * tau * t);
    return [x, elevation(x, z) + 0.05, z];
  }

  function drawContour(context, turn, lift, progress) {
    backdrop(context, ['#90b4ef', '#c3dafa', '#e8f2ff'], '#f2f8ffb0', 385, 245, true);
    const project = createProjection(0.62 + turn, 0.61 + lift, 101, 330);
    const base = [[-terrainHalfX, -0.63, terrainHalfZ], [terrainHalfX, -0.63, terrainHalfZ], [terrainHalfX, -0.63, -terrainHalfZ]];
    polygon(context, [...base, ...base.map(([x, , z]) => [x, -0.93, z]).reverse()].map(project), '#375f9c');
    const tileGrid = terrain.map((row) => row.map(project));
    const facets = [];

    for (let row = 0; row < sections; row++) {
      for (let column = 0; column < sections; column++) {
        const points = [
          tileGrid[row][column], tileGrid[row][column + 1],
          tileGrid[row + 1][column + 1], tileGrid[row + 1][column]
        ];
        const peak = terrain[row][column][1] + 0.63;
        const slope = terrain[row + 1][column][1] - terrain[row][column][1];
        const lightness = 52 + Math.max(-8, Math.min(28, peak * 20 - slope * 52));
        facets.push({
          points,
          depth: points.reduce((sum, point) => sum + point[2], 0),
          fill: `hsl(216, 62%, ${lightness}%)`
        });
      }
    }
    facets.sort((first, second) => first.depth - second.depth);
    for (const facet of facets) polygon(context, facet.points, facet.fill);
    tileGrid.forEach((row, index) => line(context, row, index % 4 === 0 ? '#eef6ff8e' : '#d5ebff60', 1));
    for (let column = 0; column <= sections; column++) {
      line(context, tileGrid.map((row) => row[column]), '#aacdff58');
    }

    const route = Array.from({ length: 85 }, (_, index) => project(trailPoint(index / 84)));
    line(context, route, '#142c53cc', 6);
    context.setLineDash([5, 5]);
    line(context, route, '#f0f8ffd9', 2.6);
    context.setLineDash([]);
    if (progress > 0) {
      const traced = route.slice(0, Math.max(2, Math.ceil(progress * route.length)));
      line(context, traced, '#f0fcff', 4.1);
      dot(context, ...traced[traced.length - 1].slice(0, 2), 5, '#172e84');
    }
    for (const marker of [route[0], route[route.length - 1]]) {
      dot(context, marker[0], marker[1], 7.5, '#172e84');
      dot(context, marker[0], marker[1], 3.3, '#e8f4ff');
    }
  }

  const plateOutline = [[-1.97, -1.18], [1.72, -1.18], [1.97, -0.93], [1.97, 1.18], [-1.72, 1.18], [-1.97, 0.93]];
  const plateColors = [
    ['#1b398e', '#255baf', '#142963'],
    ['#203b95', '#485ab1', '#222e76'],
    ['#2057a8', '#5188da', '#174781']
  ];

  function drawLayers(context, turn, lift, separation) {
    backdrop(context, ['#0b143c', '#173479', '#1d2862'], '#537dff75', 480, 300);
    const project = createProjection(0.58 + turn, 0.52 + lift, 127, 343);

    function layerPoint(index, x, z) {
      const offset = index - 1;
      return [x + offset * 0.58 * separation, offset * (0.99 + 0.42 * separation), z];
    }

    context.setLineDash([4, 6]);
    for (const [x, z] of [[-1.5, -0.78], [1.47, -0.78], [-1.5, 0.78], [1.47, 0.78]]) {
      line(context, [0, 1, 2].map((index) => project(layerPoint(index, x, z))), '#9cc7ff9e');
    }
    context.setLineDash([]);

    for (let index = 0; index < 3; index++) {
      const at = (x, z) => project(layerPoint(index, x, z));
      const top = plateOutline.map(([x, z]) => at(x, z));
      const bottom = plateOutline.map(([x, z]) => {
        const [baseX, baseY, baseZ] = layerPoint(index, x, z);
        return project([baseX, baseY - 0.15, baseZ]);
      });
      const [light, dark, side] = plateColors[index];
      polygon(context, bottom, side);
      for (const edge of [1, 2, 3, 4]) {
        polygon(context, [top[edge], top[edge + 1], bottom[edge + 1], bottom[edge]], side);
      }
      polygon(context, top, linear(context, [...top[0].slice(0, 2), ...top[3].slice(0, 2)], [dark, light]));
      line(context, [...top, top[0]], '#aad4ffbd', 1.4);

      if (index === 2) {
        for (const x of [-1, 0, 1]) {
          const corners = [[x - 0.32, -0.42], [x + 0.34, -0.42], [x + 0.34, 0.42], [x - 0.32, 0.42]];
          polygon(context, corners.map(([u, v]) => at(u, v)), '#a2d8ffc5');
          line(context, [at(x - 0.20, 0.06), at(x + 0.20, 0.06)], '#1b4791', 2);
          if (x < 1) line(context, [at(x + 0.34, 0), at(x + 0.68, 0)], '#b9d7ff', 1.7);
        }
      } else if (index === 1) {
        for (const z of [-0.48, 0, 0.48]) {
          polygon(context, [at(-1.28, z - 0.12), at(1.16 + z, z - 0.12), at(1.16 + z, z + 0.12), at(-1.28, z + 0.12)], '#bfc8ffc2');
        }
      } else {
        [0.63, 0.8, 0.35, 0.62, 0.88, 0.46].forEach((amount, step) => {
          const x = step * 0.44 - 1.29;
          polygon(context, [at(x, 0.59), at(x + 0.28, 0.59), at(x + 0.28, 0.59 - amount * 1.35), at(x, 0.59 - amount * 1.35)], '#82c4ffc8');
        });
      }
    }
  }

  const views = { signal: drawSignal, contour: drawContour, layers: drawLayers };

  // This entry point is also used to export static posters with the same geometry.
  if (typeof module === 'object' && module.exports) {
    module.exports = {
      renderScene: (context, view = 'signal') => views[view](context, 0, 0, 0),
      width, height
    };
    return;
  }

  const stage = document.querySelector('[data-scene-stage]');
  if (!stage) return;
  const canvas = stage.querySelector('canvas');
  const control = stage.querySelector('[data-scene-play]');
  const action = control.querySelector('[data-action-label]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let context;
  try {
    context = canvas.getContext('2d', { alpha: false });
  } catch {
    return;
  }
  if (!context) return;

  let rotation = [0, 0];
  let progress = 0;
  let frame = null;
  let playback = null;
  let available = true;

  function draw() {
    views[stage.dataset.view](context, ...rotation, progress);
  }

  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.max(1, Math.round(stage.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(stage.clientHeight * ratio));
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    draw();
  }

  function cancelFrame() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    playback = null;
    control.removeAttribute('aria-disabled');
  }

  function renderOnNextFrame() {
    if (frame !== null || motion.matches || !available) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      draw();
    });
  }

  function restartView() {
    cancelFrame();
    progress = 0;
    rotation = [0, 0];
    if (available && !motion.matches) draw();
  }

  function animate(time) {
    playback.start ??= time;
    const elapsed = Math.min(1, (time - playback.start) / playback.duration);
    const eased = elapsed * elapsed * (3 - 2 * elapsed);
    progress = playback.from + (playback.to - playback.from) * eased;
    draw();
    if (elapsed < 1) {
      frame = requestAnimationFrame(animate);
      return;
    }

    const view = stage.dataset.view;
    if (view === 'layers') action.textContent = progress === 1 ? 'Bring layers together' : 'Separate layers';
    if (view === 'signal') progress = 0;
    cancelFrame();
  }

  control.addEventListener('click', () => {
    if (playback || motion.matches || !available) return;
    cancelFrame();
    const view = stage.dataset.view;
    playback = {
      start: null,
      from: view === 'layers' ? progress : 0,
      to: view === 'layers' && progress === 1 ? 0 : 1,
      duration: view === 'layers' ? 800 : 1650
    };
    control.setAttribute('aria-disabled', 'true');
    frame = requestAnimationFrame(animate);
  });

  stage.addEventListener('scenechange', restartView);
  stage.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || event.pointerType !== 'mouse' || motion.matches) return;
    const bounds = stage.getBoundingClientRect();
    rotation = [(event.clientX - bounds.left) / bounds.width * 0.3 - 0.15,
      (event.clientY - bounds.top) / bounds.height * 0.21 - 0.105];
    renderOnNextFrame();
  });
  stage.addEventListener('pointerleave', () => {
    rotation = [0, 0];
    renderOnNextFrame();
  });

  function syncAvailability() {
    if (playback) progress = playback.from;
    cancelFrame();
    const showCanvas = available && !motion.matches;
    control.hidden = !showCanvas;
    stage.toggleAttribute('data-ready', showCanvas);
    if (showCanvas) resize();
  }

  window.addEventListener('resize', () => {
    if (available && !motion.matches) resize();
  }, { passive: true });
  function pausePlayback() {
    if (!playback) return;
    progress = playback.from;
    cancelFrame();
    if (available && !motion.matches) draw();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pausePlayback();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) pausePlayback();
    }).observe(stage);
  }
  motion.addEventListener('change', syncAvailability);
  canvas.addEventListener('contextlost', () => {
    available = false;
    syncAvailability();
  });
  canvas.addEventListener('contextrestored', () => {
    available = true;
    syncAvailability();
  });
  syncAvailability();
})();
