/*
 * Local choreography draft. The optional RancanaCompanionArt module provides a
 * single original-texture body with continuously articulated SVG features. Without
 * it, the original WebPs remain intact fallback placeholders.
 *
 * Optional approved pose artwork (WebP/PNG/SVG, shared aligned transparent canvas):
 * <script type="application/json" id="companion-pose-manifest">
 * {"characters":{"ranca":{"ready":"/assets/poses/ranca-ready.svg",
 * "lift1":"...","lift2":"...","present":"/assets/poses/ranca-present.svg",
 * "settle1":"...","settle2":"...","search":"...","peek":"...",
 * "found":"...","cover":"..."},"cana":{...}}}
 * </script>
 * A script[data-companion-poses] URL may supply the same JSON instead. No file is
 * requested by default. Each pose is decoded before a single IMG source is swapped;
 * there are no layered duplicate bodies, crossfades, or pose rebuild timers.
 */
(() => {
  'use strict';
  const script = document.currentScript;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const supported = 'IntersectionObserver' in window && !!Element.prototype.animate;
  const scenes = [];
  const poses = new Map();
  const failedPoses = new Set();
  const poseRequests = new Map();
  const poseNames = ['ready', 'lift1', 'lift2', 'present', 'settle1', 'settle2',
    'search', 'peek', 'found', 'cover', 'duck'];
  const intermediates = {
    lift1: ['ready', 'lift2', 'present'],
    lift2: ['lift1', 'present', 'ready'],
    settle1: ['present', 'settle2', 'ready'],
    settle2: ['settle1', 'ready', 'present']
  };
  const neutral = 'translate(0px, 0px) rotate(0deg) scale(1)';
  const ease = 'cubic-bezier(.45,0,.2,1)';
  let pageActive = true;
  let raf = 0;
  let resizeFrame = 0;
  let poseAssetStatus = 'placeholder';
  let rigAssetStatus = 'placeholder';

  function actor(image, character, scene) {
    image.dataset.companionCharacter = character;
    image.dataset.companionScene = scene;
    image.dataset.companionPose = 'ready';
    image.dataset.companionArt = 'placeholder';
    const item = { image, element: image, character, original: image.src, source: image.src,
      pose: 'ready', animation: null, originalFailed: false, rig: null, rigShown: false, rigFailed: false };
    image.addEventListener('error', () => {
      if (item.source !== item.original) {
        failedPoses.add(item.source);
        item.source = item.original;
        image.src = item.original;
        item.element.dataset.companionArt = 'fallback';
      } else {
        item.originalFailed = true;
        item.element.dataset.companionArt = item.rigShown ? 'native' : 'unavailable';
      }
    });
    // Lazy originals can already have failed before the deferred script executes.
    if (image.complete && !image.naturalWidth) {
      item.originalFailed = true;
      item.element.dataset.companionArt = 'unavailable';
    }
    image.addEventListener('load', () => {
      if (item.source === item.original && image.naturalWidth) item.originalFailed = false;
      if (item.element.dataset.companionArt === 'unavailable' && !item.originalFailed)
        item.element.dataset.companionArt = 'placeholder';
    });
    return item;
  }

  const hero = document.querySelector('.hero-wrap');
  const greenHero = hero?.querySelector('.hero-companion-ranca .hero-mascot');
  const pinkHero = hero?.querySelector('.hero-companion-cana .hero-mascot');
  if (greenHero && pinkHero) addScene(hero, 'present', 11000,
    [actor(greenHero, 'ranca', 'present'), actor(pinkHero, 'cana', 'present')],
    [greenHero.parentElement, pinkHero.parentElement]);
  for (const row of document.querySelectorAll('.footer-brand-row')) {
    const images = row.querySelectorAll(':scope > .footer-mascot');
    const word = row.querySelector('.footer-brand-text');
    if (images.length !== 2 || !word) continue;
    addScene(row, 'hide-seek', 18000,
      [actor(images[0], 'ranca', 'hide-seek'), actor(images[1], 'cana', 'hide-seek')], [row], word);
  }
  if (!scenes.length) return;

  function addScene(root, name, duration, actors, targets, word) {
    root.dataset.companionSceneRoot = name;
    root.dataset.companionPhase = 'ready';
    root.dataset.companionAssets = 'placeholder';
    const scene = { root, name, duration, actors, targets, word, tracks: [],
      visible: new Set(), running: false, manualPause: false };
    scenes.push(scene);
    // DOM-scoped deterministic QA hooks. Native animations remain inspectable with
    // actor.getAnimations(); no debug controller is installed on window.
    root.addEventListener('companion:seek', event => {
      if (!Number.isFinite(event.detail?.time) || reduce.matches || !supported) return;
      scene.manualPause = event.detail.paused !== false;
      for (const item of actors) if (item.animation) {
        item.animation.pause();
        item.animation.currentTime = Math.max(0, event.detail.time);
      }
      scene.running = false;
      paintPoses(scene);
      sync();
    });
    root.addEventListener('companion:resume', () => {
      scene.manualPause = false;
      sync();
    });
  }

  function heroTrack(green) {
    const direction = green ? 1 : -1;
    const delay = green ? 0 : 350;
    const gesture = (x, y, tilt, scale = 1) =>
      `translate(${direction * x}%, ${y}%) rotate(${-direction * tilt}deg) scale(${scale})`;
    return [
      [0, neutral, 'ready'], [450 + delay, neutral, 'ready'],
      [800 + delay, gesture(-.6, 1, -1), 'anticipate'],
      [1150 + delay, gesture(.4, -.5, .7), 'lift1'],
      [1500 + delay, gesture(1.5, -1.6, 3), 'lift2'],
      [1950 + delay, gesture(3, -3, 6, 1.01), 'present'],
      [3100 + delay, gesture(3, -3, 6, 1.01), 'present'],
      [3850 + delay, gesture(2.5, -2, 4.5), 'presentHold'],
      [4650 + delay, gesture(3, -3, 6, 1.01), 'present'],
      [5900 + delay, gesture(3, -3, 6, 1.01), 'present'],
      [6550 + delay, gesture(2, -2, 4), 'settle1'],
      [7100 + delay, gesture(1, -1, 2), 'settle2'],
      [7600 + delay, neutral, 'ready'], [11000, neutral, 'ready']
    ];
  }

  function glyphCenters(scene) {
    const word = scene.word;
    const rowBox = scene.root.getBoundingClientRect();
    const wordBox = word.getBoundingClientRect();
    const text = word.firstChild;
    const centers = [];
    let leftEdge = wordBox.left - rowBox.left;
    let rightEdge = leftEdge + wordBox.width;
    // Ranges measure the actual unchanged text, retaining its kerning and glyphs.
    // No split-letter recreation, duplicate text, or opaque rectangular cover.
    if (text?.nodeType === Node.TEXT_NODE && text.length >= 7) {
      const range = document.createRange();
      for (let i = 0; i < 7; i++) {
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        const box = range.getBoundingClientRect();
        centers.push(box.left + box.width / 2 - rowBox.left);
        if (i === 0) leftEdge = box.left - rowBox.left;
        if (i === 6) rightEdge = box.left + box.width - rowBox.left;
      }
      range.detach();
    }
    if (centers.length !== 7) {
      for (let i = 0; i < 7; i++) centers[i] = wordBox.left - rowBox.left + wordBox.width * (i + .5) / 7;
    }
    centers.leftEdge = leftEdge;
    centers.rightEdge = rightEdge;
    return centers;
  }

  function footerTrack(item, glyphs, green) {
    const element = item.element;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const base = element.offsetLeft + width / 2;
    const at = (center, y, tilt, scale = .98) =>
      `translate(${(center - base).toFixed(3)}px, ${(y * height).toFixed(3)}px) rotate(${tilt}deg) scale(${scale})`;
    const side = base; // The searcher keeps the generous original outside slot.
    const behindR = glyphs.leftEdge + width * .12;
    const besideR = glyphs.leftEdge - width * .25;
    const behindA = glyphs[6] + width * .1;
    const rightFound = glyphs[6] + width * .35;
    // Four readable held compositions, not two shrunken bodies sliding under text:
    // 1. Ranca searches at left, Cana grips/peeks above the last a.
    // 2. Both faces rise clearly above the letters for the discovery.
    // 3. Ranca ducks behind R while Cana visibly covers her eyes and counts.
    // 4. Cana searches from the right while Ranca peeks out beside R.
    // Only the hider is concealed. Open glyph counters remain transparent.
    return green ? [
      [0, neutral, 'ready'], [350, neutral, 'ready'],
      [1050, at(side, -.12, -2), 'feel'],
      [1800, at(side, -.22, -4), 'search'],
      [2950, at(side, -.22, -4), 'scan'],
      [3850, at(side, -.2, -2), 'search'],
      [4600, at(side, -.22, -4), 'scan'],
      [5050, at(glyphs[1], -.35, -1), 'feel'],
      [5600, at(glyphs[2], -.56, 2), 'found'],
      [6350, at(glyphs[2], -.56, 2), 'celebrate'],
      [7250, at(glyphs[2], -.56, 2), 'found'],
      [7900, at(glyphs[1], -.3, -2), 'peek'],
      [9100, at(behindR, .01, -3, .9), 'hide'],
      [10400, at(behindR, .01, -3, .9), 'duck'],
      [11800, at(behindR, .01, -3, .9), 'hide'],
      [13000, at(besideR, -.02, -3, .94), 'peek'],
      [14200, at(besideR, -.06, -1, .94), 'peekHigh'],
      [15300, at(besideR, -.02, -3, .94), 'peek'],
      [16100, at(side, -.12, -1), 'feel'],
      [17300, neutral, 'ready'], [18000, neutral, 'ready']
    ] : [
      [0, neutral, 'ready'], [350, neutral, 'ready'],
      [1050, at(behindA, .01, 3, .9), 'duck'],
      [1800, at(behindA, .01, 3, .9), 'hide'],
      [2450, at(behindA, -.3, 3, .94), 'peek'],
      [3500, at(behindA, -.33, 1, .94), 'peekHigh'],
      [4550, at(behindA, -.3, 3, .94), 'peek'],
      [5100, at(rightFound, -.4, 1), 'peekHigh'],
      [5600, at(rightFound, -.56, -2), 'found'],
      [6600, at(rightFound, -.56, -2), 'celebrate'],
      [7400, at(rightFound, -.56, -2), 'found'],
      [8450, at(side, -.3, 2), 'cover'],
      [9500, at(side, -.3, 2), 'count'],
      [10500, at(side, -.3, 2), 'cover'],
      [11500, at(side, -.3, 2), 'count'],
      [12300, at(side, -.22, 4), 'feel'],
      [13100, at(side, -.22, 4), 'search'],
      [14200, at(side, -.22, 4), 'scan'],
      [15300, at(side, -.22, 4), 'search'],
      [16100, at(side, -.12, 2), 'feel'],
      [17300, neutral, 'ready'], [18000, neutral, 'ready']
    ];
  }

  function prepare(scene) {
    const glyphs = scene.word ? glyphCenters(scene) : null;
    scene.tracks = scene.actors.map(item => scene.word
      ? footerTrack(item, glyphs, item.character === 'ranca')
      : heroTrack(item.character === 'ranca'));
    scene.actors.forEach((item, index) => {
      const keyframes = scene.tracks[index].map(([time, transform]) =>
        ({ offset: time / scene.duration, transform, easing: ease }));
      if (item.animation) {
        // Resize/font loading only changes geometry; preserve this native clock.
        item.animation.effect.setKeyframes(keyframes);
      } else {
        item.animation = item.element.animate(keyframes,
          { duration: scene.duration, iterations: Infinity, fill: 'both' });
        item.animation.pause();
        item.animation.currentTime = 0;
      }
    });
  }

  function setPose(item, pose, originalOnly = false, time = 0, context = {}) {
    if (item.rig) {
      try {
        // One shared native scene clock drives both body movement and vector
        // articulation. Interpolation also works after deterministic seeks/resizes.
        item.rig.setPose(pose, time, context);
        if (!item.rigShown) { item.rig.show(); item.rigShown = true; }
        setActorState(item, pose, pose, 'native');
        return;
      } catch {
        // A failed optional renderer must not take down navigation or decoration.
        try { item.rig.restoreOriginal(); } catch { /* Original stays in its slot. */ }
        item.rig = null;
        item.rigShown = false;
        item.rigFailed = true;
        assetState('partial', 'rig');
      }
    }
    if (item.rigShown) {
      item.rig.restoreOriginal();
      item.rigShown = false;
    }
    // Missing in-between artwork holds the nearest approved pose, never flashes
    // the original body midway through a supplied articulated gesture.
    const candidates = [pose, ...(intermediates[pose] || [])];
    let selected = null;
    let renderedPose = 'original';
    if (!originalOnly) for (const candidate of candidates) {
      const source = poses.get(`${item.character}:${candidate}`);
      if (source && !failedPoses.has(source)) {
        selected = source;
        renderedPose = candidate;
        break;
      }
    }
    const next = selected || item.original;
    const requested = poseRequests.get(`${item.character}:${pose}`);
    const art = item.originalFailed && !selected ? 'unavailable'
      : selected ? 'pose' : item.rigFailed || requested && failedPoses.has(requested) ? 'fallback' : 'placeholder';
    setActorState(item, pose, renderedPose, art);
    if (next === item.source) return;
    item.source = next;
    item.image.src = next;
  }

  function setActorState(item, pose, renderedPose, art) {
    item.pose = pose;
    const data = item.element.dataset;
    if (data.companionPose !== pose) data.companionPose = pose;
    if (data.companionRenderedPose !== renderedPose) data.companionRenderedPose = renderedPose;
    if (data.companionArt !== art) data.companionArt = art;
  }

  function paintPoses(scene) {
    const time = Number(scene.actors[0].animation?.currentTime || 0) % scene.duration;
    scene.actors.forEach((item, index) => {
      const track = scene.tracks[index] || [];
      let segment = 0;
      while (segment + 1 < track.length && track[segment + 1][0] <= time) segment++;
      const frame = track[segment] || [0, neutral, 'ready'];
      const next = track[segment + 1] || frame;
      const progress = next[0] > frame[0] ? Math.max(0, Math.min(1, (time - frame[0]) / (next[0] - frame[0]))) : 0;
      setPose(item, frame[2], reduce.matches, time, {
        scene: scene.name, duration: scene.duration,
        phaseTime: time - frame[0], segmentStart: frame[0], segmentEnd: next[0],
        nextPose: next[2], progress
      });
    });
    const phase = scene.name === 'present'
      ? (time < 800 || time >= 7950 ? 'ready' : 'present')
      : time < 350 || time >= 17300 ? 'ready'
      : time < 5600 ? 'ranca-searches' : time < 7700 ? 'found'
      : time < 13000 ? 'swap-roles' : 'cana-searches';
    if (scene.root.dataset.companionPhase !== phase) scene.root.dataset.companionPhase = phase;
  }

  function tick() {
    raf = 0;
    for (const scene of scenes) if (scene.running) paintPoses(scene);
    if (scenes.some(scene => scene.running)) raf = requestAnimationFrame(tick);
  }

  function sync() {
    for (const scene of scenes) {
      if (reduce.matches || !supported) {
        for (const item of scene.actors) {
          item.animation?.cancel();
          item.animation = null;
          setPose(item, 'ready', true);
          item.element.dataset.companionMotion = reduce.matches ? 'reduced' : 'unsupported';
        }
        scene.running = false;
        scene.manualPause = false;
        scene.root.dataset.companionPhase = 'ready';
        continue;
      }
      if (!scene.actors[0].animation) prepare(scene);
      const active = !!scene.visible.size && !document.hidden && pageActive && !scene.manualPause;
      if (active !== scene.running) {
        const time = Number(scene.actors[0].animation.currentTime || 0);
        for (const item of scene.actors) {
          if (active) { item.animation.currentTime = time; item.animation.play(); }
          else { item.animation.pause(); item.animation.currentTime = time; }
        }
        scene.running = active;
      }
      for (const item of scene.actors) item.element.dataset.companionMotion = active ? 'playing' : 'paused';
      paintPoses(scene);
    }
    if (scenes.some(scene => scene.running)) {
      if (!raf) raf = requestAnimationFrame(tick);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function updateGeometry() {
    resizeFrame = 0;
    if (reduce.matches || !supported) return;
    for (const scene of scenes) if (scene.actors[0].animation) prepare(scene);
  }
  function queueGeometry() {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(updateGeometry);
  }
  if (supported) {
    const observed = new Map();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const scene = observed.get(entry.target);
        if (!scene) continue;
        if (entry.isIntersecting && entry.intersectionRatio > 0) scene.visible.add(entry.target);
        else scene.visible.delete(entry.target);
      }
      sync();
    }, { threshold: [0, .01] });
    for (const scene of scenes) for (const target of scene.targets) {
      observed.set(target, scene);
      observer.observe(target);
    }
    if ('ResizeObserver' in window) {
      const resize = new ResizeObserver(queueGeometry);
      for (const scene of scenes) resize.observe(scene.root);
    } else window.addEventListener('resize', queueGeometry, { passive: true });
    document.fonts?.ready.then(queueGeometry).catch(() => {});
  }
  if (reduce.addEventListener) reduce.addEventListener('change', sync);
  else reduce.addListener(sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => {
    pageActive = false;
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
    sync();
  });
  window.addEventListener('pageshow', () => { pageActive = true; queueGeometry(); sync(); });
  sync();

  function approvedAssetURL(value) {
    const source = typeof value === 'string' ? value : value?.src;
    if (!source) return null;
    try {
      const url = new URL(source, document.baseURI);
      // Pose assets belong to this site. Never load arbitrary manifest protocols.
      return url.origin === location.origin && /\.(?:webp|png|svg)(?:$|[?#])/i.test(url.href)
        ? url.href : null;
    } catch { return null; }
  }
  function assetState(status, kind = 'poses') {
    if (kind === 'rig') rigAssetStatus = status;
    else poseAssetStatus = status;
    const combined = rigAssetStatus === 'loading' || poseAssetStatus === 'loading' ? 'loading'
      : rigAssetStatus === 'ready' ? 'ready'
      : rigAssetStatus === 'partial' ? 'partial' : poseAssetStatus;
    for (const scene of scenes) {
      scene.root.dataset.companionAssets = combined;
      if (combined !== 'loading') scene.root.dispatchEvent(new CustomEvent('companion:assets-ready',
        { detail: { status: combined, loaded: poses.size, requested: poseRequests.size,
          rigs: scenes.flatMap(current => current.actors).filter(item => item.rig).length } }));
    }
  }

  async function loadRigs() {
    const module = window.RancanaCompanionArt;
    if (typeof module?.create !== 'function') return;
    assetState('loading', 'rig');
    await Promise.all(scenes.map(async scene => {
      await Promise.all(scene.actors.map(async item => {
        try {
          const rig = await module.create(item.image, item.character);
          if (!rig?.motionElement || typeof rig.setPose !== 'function' ||
              typeof rig.show !== 'function' || typeof rig.restoreOriginal !== 'function')
            throw new Error('Incomplete companion artwork renderer');
          const time = Number(item.animation?.currentTime || 0);
          item.animation?.cancel();
          item.animation = null;
          const previous = item.element;
          item.rig = rig;
          item.element = rig.motionElement;
          for (const key of Object.keys(previous.dataset)) if (key.startsWith('companion') && key !== 'companionOriginal') {
            item.element.dataset[key] = previous.dataset[key];
            if (item.element !== previous) delete previous.dataset[key];
          }
          item.image.dataset.companionOriginal = 'true';
          item.element.setAttribute('aria-hidden', 'true');
          if (!reduce.matches && supported) {
            prepare(scene);
            item.animation.currentTime = time;
            if (scene.running) item.animation.play();
          }
        } catch {
          item.rigFailed = true;
          item.element.dataset.companionArt = item.originalFailed ? 'unavailable' : 'fallback';
        }
      }));
      // Re-align a scene after asynchronous image decoding, without rewinding it.
      if (!reduce.matches && supported) {
        const time = Number(scene.actors[0].animation?.currentTime || 0);
        prepare(scene);
        for (const item of scene.actors) {
          item.animation.currentTime = time;
          scene.running ? item.animation.play() : item.animation.pause();
        }
      }
    }));
    sync();
    assetState(scenes.every(scene => scene.actors.every(item => item.rig)) ? 'ready' : 'partial', 'rig');
  }

  async function loadPoses(manifest) {
    const characters = manifest?.characters;
    if (!characters || typeof characters !== 'object') { assetState('partial'); return; }
    assetState('loading');
    await Promise.all(['ranca', 'cana'].flatMap(character =>
      poseNames.map(async pose => {
        const source = approvedAssetURL(characters[character]?.[pose]);
        if (!source) return;
        poseRequests.set(`${character}:${pose}`, source);
        const preload = new Image();
        preload.src = source;
        try {
          await preload.decode();
          if (!preload.naturalWidth || !preload.naturalHeight) return;
          poses.set(`${character}:${pose}`, source);
        } catch { failedPoses.add(source); }
      })));
    assetState(!poseRequests.size ? 'placeholder' : poses.size === poseRequests.size ? 'ready' : 'partial');
    sync();
  }
  loadRigs();
  const inlineManifest = document.getElementById('companion-pose-manifest');
  if (inlineManifest) {
    try { loadPoses(JSON.parse(inlineManifest.textContent)); } catch { assetState('partial'); }
  } else if (script?.dataset.companionPoses) {
    try {
      const url = new URL(script.dataset.companionPoses, document.baseURI);
      if (url.origin === location.origin) {
        assetState('loading');
        fetch(url.href, { credentials: 'same-origin' })
          .then(response => response.ok ? response.json() : null)
          .then(loadPoses).catch(() => assetState('partial'));
      } else assetState('partial');
    } catch { assetState('partial'); }
  }
})();
