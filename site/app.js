import { bodies } from './content.js';

const $ = id => document.getElementById(id);
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }

async function boot() {
  const [THREE, { OrbitControls }, { createBody, addLighting, addStars }] = await Promise.all([
    import('three'), import('three/addons/controls/OrbitControls.js'), import('./models.js')
  ]);
  const models = { earth: createBody('earth'), sun: createBody('sun') };
  const scene = new THREE.Scene(); addLighting(scene); addStars(scene);
  Object.values(models).forEach(model => scene.add(model.root));
  const camera = new THREE.PerspectiveCamera(42, 1, .01, 100);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  $('preview').append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 2.5; controls.maxDistance = 12;
  let selected = null, ar = null, busy = false;
  let animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cutaway = false, magnetic = false;
  let zoom = 1, rotation = 0;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const observer = new ResizeObserver(resize); observer.observe($('viewport'));

  function resize() {
    const { width, height } = $('viewport').getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  function homeCamera() {
    camera.position.set(0, .18, Math.max(5.5, 5.5 / camera.aspect));
    controls.target.set(0, 0, 0); controls.update();
  }
  resize(); homeCamera();

  function syncControls() {
    $('cutaway').setAttribute('aria-pressed', String(cutaway));
    $('field').setAttribute('aria-pressed', String(magnetic));
    $('motion').setAttribute('aria-pressed', String(animate));
    $('motion').textContent = animate ? 'Pause animation' : 'Play animation';
    Object.values(models).forEach(model => { model.setView(cutaway, magnetic); model.setScale(zoom); });
  }
  function selectTopic(id) {
    const topic = bodies[selected].topics.find(item => item.id === id);
    if (!topic) return;
    $('topic-tag').textContent = topic.tag;
    $('topic-title').textContent = topic.title;
    $('topic-description').textContent = topic.description;
    $('topic-equation').textContent = topic.equation;
    for (const button of $('topics').children) button.setAttribute('aria-pressed', String(button.dataset.topic === id));
    cutaway = topic.view === 'cutaway'; magnetic = topic.view === 'field';
    models[selected].select(topic);
    if (cutaway) { rotation = 0; $('rotation').value = '0'; $('rotation-value').textContent = '0°'; models[selected].setRotation(0); if (!ar) homeCamera(); }
    syncControls();
  }
  function choose(kind) {
    if (selected === kind) return;
    selected = kind;
    const data = bodies[kind];
    $('object-title').textContent = data.title;
    $('object-category').textContent = data.category;
    $('object-summary').textContent = data.summary;
    $('model-note').textContent = data.note;
    $('science-source').href = data.source;
    $('stats').replaceChildren(...data.stats.map(([value, label]) => {
      const element = document.createElement('div'); element.className = 'stat';
      const strong = document.createElement('b'), caption = document.createElement('span');
      strong.textContent = value; caption.textContent = label; element.append(strong, caption); return element;
    }));
    $('topics').replaceChildren(...data.topics.map(topic => {
      const button = document.createElement('button'); button.textContent = topic.title; button.dataset.topic = topic.id;
      button.setAttribute('aria-pressed', 'false'); button.addEventListener('click', () => selectTopic(topic.id)); return button;
    }));
    for (const [name, model] of Object.entries(models)) {
      model.root.visible = ar ? true : name === kind;
      $('choose-' + name).setAttribute('aria-pressed', String(name === kind));
    }
    selectTopic(data.topics[0].id);
  }
  $('choose-earth').addEventListener('click', () => choose('earth'));
  $('choose-sun').addEventListener('click', () => choose('sun'));
  $('cutaway').addEventListener('click', () => { cutaway = !cutaway; models[selected].setRotation(0); rotation = 0; $('rotation').value = '0'; $('rotation-value').textContent = '0°'; if (!ar) homeCamera(); syncControls(); });
  $('field').addEventListener('click', () => { magnetic = !magnetic; syncControls(); });
  $('motion').addEventListener('click', () => { animate = !animate; syncControls(); });
  $('rotation').addEventListener('input', event => { rotation = Number(event.target.value); $('rotation-value').textContent = `${rotation}°`; Object.values(models).forEach(model => model.setRotation(rotation)); });
  $('scale').addEventListener('input', event => { zoom = Number(event.target.value) / 100; $('scale-value').textContent = `${event.target.value}%`; syncControls(); });
  $('reset').addEventListener('click', () => {
    zoom = 1; rotation = 0; $('scale').value = '100'; $('scale-value').textContent = '100%'; $('rotation').value = '0'; $('rotation-value').textContent = '0°';
    Object.values(models).forEach(model => model.reset()); homeCamera(); selectTopic(bodies[selected].topics[0].id);
  });
  choose('earth'); syncControls();

  let down = null;
  renderer.domElement.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY }; });
  renderer.domElement.addEventListener('pointerup', event => {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(models[selected].root, true).filter(hit => {
      if (!hit.object.userData.topic) return false;
      for (let object = hit.object; object; object = object.parent) if (!object.visible) return false;
      return true;
    });
    if (hits.length) selectTopic(hits[0].object.userData.topic);
  });
  renderer.domElement.addEventListener('pointercancel', () => { down = null; });

  function setCameraUI(active) {
    $('preview').hidden = active; $('ar-host').hidden = !active;
    $('mode').textContent = active ? 'IMAGE-TRACKED AR' : '3D EXPLORER';
    $('gesture-hint').textContent = active ? 'Keep picture in view · use sliders below' : 'Drag to orbit · pinch or scroll to zoom';
    for (const name of Object.keys(models)) $('choose-' + name).disabled = active;
    $('camera').textContent = active ? 'Stop camera · return to 3D' : 'Start picture AR ↗';
  }
  async function stopAR(message = 'Camera stopped. Continue exploring in 3D.') {
    const session = ar; ar = null;
    if (session) {
      session.renderer.setAnimationLoop(null);
      try { await session.stop(); } catch (error) { console.warn('AR stop:', error); }
      for (const video of $('ar-host').querySelectorAll('video')) video.srcObject?.getTracks().forEach(track => track.stop());
      session.renderer.dispose();
      session.renderer.forceContextLoss();
    }
    $('ar-host').replaceChildren();
    for (const [name, model] of Object.entries(models)) { scene.add(model.root); model.root.visible = name === selected; }
    setCameraUI(false); $('tracking').textContent = 'PREVIEW'; status(message);
  }
  async function startAR() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS and a supported browser. Open the deployed site in Android Chrome.');
    status('Loading image tracking. Allow camera access when Chrome asks.');
    const { MindARThree } = await import('./vendor/mindar.js');
    setCameraUI(true);
    const session = new MindARThree({ container: $('ar-host'), imageTargetSrc: new URL('./targets/planets.mind', location.href).href, maxTrack: 1, uiLoading: 'no', uiScanning: 'no', uiError: 'no' });
    ar = session;
    session.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    addLighting(session.scene);
    Object.entries(models).forEach(([name, model], index) => {
      const anchor = session.addAnchor(index), holder = new THREE.Group();
      holder.scale.setScalar(.37); holder.position.z = .42; holder.add(model.root); anchor.group.add(holder); model.root.visible = true;
      anchor.onTargetFound = () => { if (ar !== session) return; choose(name); $('tracking').textContent = `${name.toUpperCase()} LOCKED`; status(`${bodies[name].title} detected. Move slowly around the picture; tap labels below to explore.`); };
      anchor.onTargetLost = () => { if (ar !== session) return; $('tracking').textContent = 'SEARCHING'; status('Picture lost. Bring the complete picture back into view and avoid glare.'); };
    });
    await session.start();
    $('tracking').textContent = 'SEARCHING';
    status('Point at a supplied Earth or Sun picture. Keep its full border visible.');
    let previous = performance.now();
    session.renderer.setAnimationLoop(now => {
      const delta = Math.min((now - previous) / 1000, .05); previous = now;
      Object.values(models).forEach(model => model.update(delta, animate));
      session.renderer.render(session.scene, session.camera);
    });
  }
  $('camera').addEventListener('click', async () => {
    if (busy) return;
    busy = true; $('camera').disabled = true;
    try {
      if (ar) await stopAR(); else await startAR();
    } catch (error) {
      await stopAR();
      const message = error?.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in Chrome’s site settings, then retry.' : error?.name === 'NotFoundError' ? 'No camera was found. You can still use the 3D explorer.' : error?.name === 'NotReadableError' ? 'Camera is busy. Close other camera apps and retry.' : `AR could not start. ${error?.message || 'Check your connection and camera access, then retry.'}`;
      status(message, true);
    } finally { busy = false; $('camera').disabled = false; }
  });
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden && ar && !busy) { busy = true; $('camera').disabled = true; try { await stopAR('Camera stopped while the tab was hidden. Tap Start picture AR to resume.'); } finally { busy = false; $('camera').disabled = false; } }
  });
  window.addEventListener('pagehide', () => { for (const video of $('ar-host').querySelectorAll('video')) video.srcObject?.getTracks().forEach(track => track.stop()); });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); status('The graphics context was lost. Reload the page to restore the explorer.', true); });
  let previous = performance.now();
  renderer.setAnimationLoop(now => {
    const delta = Math.min((now - previous) / 1000, .05); previous = now;
    if (ar || document.hidden) return;
    models[selected].update(delta, animate); controls.update(); renderer.render(scene, camera);
  });
  $('loading').hidden = true; $('camera').disabled = false;
  status('Ready to explore. Tap labels or a visible layer; start AR when your picture is ready.');
}

boot().catch(error => {
  console.error(error);
  $('loading').textContent = 'The 3D explorer could not load.';
  status('Check your connection and use a WebGL-enabled browser such as current Android Chrome, then reload. Scan pictures remain available to download.', true);
});
