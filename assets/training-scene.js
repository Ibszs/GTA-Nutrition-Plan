// Three.js 0.180.0, MIT; locally vendored module 338908 B + core 381124 B.
// https://threejs.org/manual/en/rendering-on-demand.html
// https://threejs.org/manual/en/responsive.html
// Import and WebGL failures keep the decorative SVG; no workout state is touched.
const mounts = new WeakMap();
export async function mountTrainingScene(host) {
  if (mounts.has(host)) return mounts.get(host);
  host.setAttribute('aria-hidden', 'true');
  const fallback = document.createElement('img');
  fallback.src = new URL('./training-scene-fallback.svg', import.meta.url).href;
  fallback.alt = ''; fallback.setAttribute('aria-hidden', 'true');
  fallback.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none';
  host.append(fallback);
  let renderer, frame = 0, active = true, visible = true, disposed = false, failed = false;
  let resizeObserver, intersectionObserver, scene, texture, shadowTexture;
  const cleanups = [];
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };
  const release = () => {
    stop();
    resizeObserver?.disconnect(); intersectionObserver?.disconnect();
    cleanups.splice(0).forEach(fn => fn());
    if (scene) {
      const geometries = new Set(), materials = new Set();
      scene.traverse(item => { if (item.geometry) geometries.add(item.geometry); if (item.material) materials.add(item.material); });
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
    }
    texture?.dispose(); shadowTexture?.dispose(); renderer?.dispose(); renderer?.domElement.remove();
  };
  let requestDraw = () => {};
  const api = {
    setActive(value) { active = Boolean(value); if (active) requestDraw(); else stop(); },
    dispose() { if (disposed) return; disposed = true; release(); fallback.remove(); mounts.delete(host); },
  };
  mounts.set(host, api);
  const fail = () => { if (failed || disposed) return; failed = true; release(); fallback.hidden = false; host.dataset.scene = 'fallback'; };
  try {
    const THREE = await import('./vendor/three.module.min.js');
    if (disposed || !host.isConnected) { api.dispose(); return api; }
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none';
    host.append(canvas);
    const onLost = event => { event.preventDefault(); fail(); };
    canvas.addEventListener('webglcontextlost', onLost);
    cleanups.push(() => canvas.removeEventListener('webglcontextlost', onLost));
    scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 1, 8); camera.lookAt(0, 0, 0);
    // Procedural broad studio panels provide bright metal reflections without an HDR download.
    const environment = document.createElement('canvas'); environment.width = 512; environment.height = 256;
    const env = environment.getContext('2d');
    const gradient = env.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#f3f6ff'); gradient.addColorStop(.48, '#7f95b4'); gradient.addColorStop(.55, '#263d5a'); gradient.addColorStop(1, '#bdcce0');
    env.fillStyle = gradient; env.fillRect(0, 0, 512, 256);
    env.fillStyle = '#ffffff'; env.fillRect(40, 20, 105, 155); env.fillRect(320, 35, 55, 160);
    texture = new THREE.CanvasTexture(environment); texture.mapping = THREE.EquirectangularReflectionMapping; texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8299b8, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 4); key.position.set(-3, 5, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xc1d9ff, 3); rim.position.set(4, 2, -2); scene.add(rim);
    const group = new THREE.Group(); scene.add(group);
    const steel = new THREE.MeshStandardMaterial({ color: 0xe0e8f3, metalness: .92, roughness: .22 });
    const navy = new THREE.MeshStandardMaterial({ color: 0x233c5c, metalness: .35, roughness: .3 });
    const cobalt = new THREE.MeshStandardMaterial({ color: 0x365ef2, metalness: .25, roughness: .3 });
    const apricot = new THREE.MeshStandardMaterial({ color: 0xf1ad82, metalness: .18, roughness: .32 });
    function cylinder(radius, length, x, material, facets = 48) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, facets), material);
      mesh.rotation.z = Math.PI / 2; mesh.position.x = x; group.add(mesh); return mesh;
    }
    cylinder(.16, 2.7, 0, steel);
    // Thin chrome grip rings catch light; a shallow mechanical detail, not a texture download.
    for (let i = -9; i <= 9; i++) cylinder(.172, .018, i * .075, steel, 32);
    for (const sign of [-1, 1]) {
      cylinder(.27, .15, sign * .94, steel);
      cylinder(.79, .67, sign * 1.32, navy, 8);
      cylinder(.67, .025, sign * 1.67, sign < 0 ? cobalt : apricot, 8);
      cylinder(.15, .034, sign * 1.69, navy, 32);
    }
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    const glow = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
    glow.addColorStop(0, 'rgba(20,39,65,.25)'); glow.addColorStop(1, 'rgba(20,39,65,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 128, 128);
    shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.05), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
    shadow.position.set(0, -1.48, -.6); scene.add(shadow);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let started = null, settled = reduced.matches, tiltX = 0, tiltY = 0;
    const canDraw = () => !disposed && !failed && active && visible && !document.hidden;
    function draw(time) {
      frame = 0; if (!canDraw()) return;
      try {
        const width = host.clientWidth, height = host.clientHeight;
        if (!width || !height) return;
        const ratio = Math.min(devicePixelRatio || 1, 1.5, 900 / width, 600 / height);
        const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
        if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false);
        camera.aspect = width / height;
        camera.position.z = camera.aspect < 1.25 ? 9.3 : 8;
        camera.updateProjectionMatrix();
        if (started === null) started = time;
        const progress = settled || reduced.matches ? 1 : Math.min(1, (time - started) / 800);
        const ease = 1 - (1 - progress) ** 3;
        group.rotation.set(.12 + tiltY, -.35 + tiltX + (1 - ease) * .22, -.43);
        group.position.y = .15 - (1 - ease) * .28;
        renderer.render(scene, camera);
        fallback.hidden = true; host.dataset.scene = 'webgl';
        if (progress < 1) requestDraw(); else settled = true;
      } catch { fail(); }
    }
    requestDraw = () => { if (canDraw() && !frame) frame = requestAnimationFrame(draw); };
    const onVisibility = () => { if (document.hidden) stop(); else requestDraw(); };
    const onMotion = () => { settled = true; tiltX = tiltY = 0; requestDraw(); };
    const onPointer = event => {
      if (!fine.matches || reduced.matches || event.pointerType !== 'mouse') return;
      const box = host.getBoundingClientRect();
      tiltX = Math.max(-.1, Math.min(.1, (event.clientX - box.left) / box.width * .2 - .1));
      tiltY = Math.max(-.06, Math.min(.06, (event.clientY - box.top) / box.height * .12 - .06)); requestDraw();
    };
    const onLeave = () => { tiltX = tiltY = 0; requestDraw(); };
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onMotion);
    host.addEventListener('pointermove', onPointer, { passive: true }); host.addEventListener('pointerleave', onLeave, { passive: true });
    cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility), () => reduced.removeEventListener('change', onMotion), () => host.removeEventListener('pointermove', onPointer), () => host.removeEventListener('pointerleave', onLeave));
    resizeObserver = new ResizeObserver(requestDraw); resizeObserver.observe(host);
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) requestDraw(); else stop(); });
      intersectionObserver.observe(host);
    }
    requestDraw();
  } catch { fail(); }
  return api;
}
