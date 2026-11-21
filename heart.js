(function () {
  "use strict";

  // ---------- Settings you can tweak ----------
  const IMAGE_FILE = "wiggers.svg";

  // Where each phase boundary sits across the diagram image (0 = left edge, 1 = right edge).
  // 7 numbers: the start of phases 1 to 6, then the end of phase 6.
  // Add ?debug to the page address (index.html?debug) to see these lines on the image,
  // then adjust the numbers until the lines match the phase boundaries in the picture.
  const IMAGE_X = [0.14, 0.222, 0.288, 0.509, 0.575, 0.698, 0.96];

  // ---------- Elements ----------
  const cycleEl = document.getElementById("cycle");
  const statsEl = document.getElementById("stats");
  const container = document.getElementById("heart-container");
  const bpmSlider = document.getElementById("bpm");
  const bpmValue = document.getElementById("bpm-value");
  const pauseBtn = document.getElementById("pause");
  const phaseNameEl = document.getElementById("phase-name");
  const phaseDescEl = document.getElementById("phase-desc");
  const mitralEl = document.getElementById("valve-mitral");
  const aorticEl = document.getElementById("valve-aortic");
  const wrap = document.getElementById("wiggers-wrap");
  const img = document.getElementById("wiggers-img");
  const playhead = document.getElementById("playhead");
  const missing = document.getElementById("img-missing");

  // ---------- Load the diagram image ----------
  img.addEventListener("error", function () {
    wrap.hidden = true;
    missing.hidden = false;
  });
  img.src = IMAGE_FILE;

  // ---------- Cardiac cycle model (phase runs 0 to 1) ----------
  function curve(points) {
    return function (p) {
      p = ((p % 1) + 1) % 1;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        if (p >= a[0] && p <= b[0]) {
          const t = (p - a[0]) / (b[0] - a[0]);
          const s = (1 - Math.cos(t * Math.PI)) / 2;
          return a[1] + (b[1] - a[1]) * s;
        }
      }
      return points[points.length - 1][1];
    };
  }

  const vent = curve([[0, 5], [0.08, 8], [0.10, 8], [0.18, 80], [0.30, 122], [0.45, 104], [0.53, 4], [0.68, 3], [0.88, 5], [1, 5]]);
  const volume = curve([[0, 108], [0.10, 120], [0.18, 120], [0.45, 50], [0.53, 50], [0.68, 100], [0.88, 108], [1, 108]]);

  const PHASES = [
    { name: "Atrial systole", from: 0, to: 0.10, color: "#7bdff2", mitral: true, aortic: false,
      desc: "The atria contract and top up the ventricles." },
    { name: "Isovolumetric contraction", from: 0.10, to: 0.18, color: "#ff9f68", mitral: false, aortic: false,
      desc: "All valves are closed while pressure builds in the ventricle." },
    { name: "Ventricular ejection", from: 0.18, to: 0.45, color: "#ff6b81", mitral: false, aortic: true,
      desc: "The aortic valve opens and blood is pumped out to the body." },
    { name: "Isovolumetric relaxation", from: 0.45, to: 0.53, color: "#c084fc", mitral: false, aortic: false,
      desc: "All valves are closed again as the ventricle relaxes." },
    { name: "Rapid filling", from: 0.53, to: 0.68, color: "#60a5fa", mitral: true, aortic: false,
      desc: "The mitral valve opens and blood rushes into the ventricle." },
    { name: "Diastasis (slow filling)", from: 0.68, to: 1, color: "#34d399", mitral: true, aortic: false,
      desc: "Slow filling continues until the next atrial contraction." }
  ];

  function phaseIndex(p) {
    for (let i = 0; i < PHASES.length; i++) {
      if (p >= PHASES[i].from && p < PHASES[i].to) return i;
    }
    return PHASES.length - 1;
  }

  // Convert the cycle phase into a horizontal position on the diagram image
  function imageX(p) {
    const i = phaseIndex(p);
    const ph = PHASES[i];
    const t = (p - ph.from) / (ph.to - ph.from);
    return IMAGE_X[i] + t * (IMAGE_X[i + 1] - IMAGE_X[i]);
  }

  // Calibration lines
  if (location.search.indexOf("debug") !== -1) {
    IMAGE_X.forEach(function (x, i) {
      const b = document.createElement("div");
      b.className = "boundary";
      b.style.left = (x * 100) + "%";
      const s = document.createElement("span");
      s.textContent = i === 6 ? "end" : String(i + 1);
      b.appendChild(s);
      wrap.appendChild(b);
    });
  }

  // ---------- 3D heart ----------
  const HEART_HEIGHT = 340;
  const THEMES = {
    red:  { color: 0xd9142f, glow: 0xff2a4d, sheen: 0xff8fa3 },
    pink: { color: 0xff5fa2, glow: 0xff7ac0, sheen: 0xffd1e8 }
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  const shape = new THREE.Shape();
  shape.moveTo(0.25, 0.25);
  shape.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
  shape.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
  shape.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
  shape.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
  shape.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
  shape.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.4, bevelEnabled: true, bevelThickness: 0.2,
    bevelSize: 0.18, bevelSegments: 16, curveSegments: 48
  });
  geometry.center();

  const material = new THREE.MeshPhysicalMaterial({
    color: THEMES.red.color, roughness: 0.25, metalness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.15,
    emissive: THEMES.red.color, emissiveIntensity: 0.12
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.z = Math.PI;

  const heart = new THREE.Group();
  heart.add(mesh);
  heart.scale.set(2.4, 2.4, 2.4);
  scene.add(heart);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);
  const sheenLight = new THREE.PointLight(THEMES.red.sheen, 0.8, 20);
  sheenLight.position.set(-3, 2, 4);
  scene.add(sheenLight);
  const glowLight = new THREE.PointLight(THEMES.red.glow, 1.2, 12);
  glowLight.position.set(0, 0, 3);
  scene.add(glowLight);

  function setTheme(name) {
    const t = THEMES[name];
    material.color.setHex(t.color);
    material.emissive.setHex(t.color);
    sheenLight.color.setHex(t.sheen);
    glowLight.color.setHex(t.glow);
  }
  document.getElementById("btn-red").addEventListener("click", function () { setTheme("red"); });
  document.getElementById("btn-pink").addEventListener("click", function () { setTheme("pink"); });

  // ---------- Controls ----------
  let bpm = 70;
  let paused = false;
  bpmSlider.addEventListener("input", function () {
    bpm = Number(bpmSlider.value);
    bpmValue.textContent = bpm;
  });
  pauseBtn.addEventListener("click", function () {
    paused = !paused;
    pauseBtn.textContent = paused ? "Play" : "Pause";
  });

  function resize() {
    const w = container.clientWidth;
    if (!w) return;
    renderer.setSize(w, HEART_HEIGHT);
    camera.aspect = w / HEART_HEIGHT;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // Drag to rotate (eases back to a gentle sway when released)
  let dragging = false, lastX = 0, lastY = 0, userY = 0, userX = 0;
  renderer.domElement.addEventListener("pointerdown", function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    renderer.domElement.style.cursor = "grabbing";
  });
  window.addEventListener("pointerup", function () {
    dragging = false;
    renderer.domElement.style.cursor = "grab";
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    userY += (e.clientX - lastX) * 0.01;
    userX += (e.clientY - lastY) * 0.01;
    userX = Math.max(-0.8, Math.min(0.8, userX));
    lastX = e.clientX; lastY = e.clientY;
  });

  // ---------- Animation loop ----------
  let phase = 0;
  let activeIdx = -1;
  let last = performance.now();

  function render(now) {
    const p = phase;
    const idx = phaseIndex(p);

    if (idx !== activeIdx) {
      const ph = PHASES[idx];
      phaseNameEl.textContent = ph.name;
      phaseNameEl.style.color = ph.color;
      phaseDescEl.textContent = ph.desc;
      mitralEl.classList.toggle("open", ph.mitral);
      mitralEl.textContent = "Mitral valve · " + (ph.mitral ? "open" : "closed");
      aorticEl.classList.toggle("open", ph.aortic);
      aorticEl.textContent = "Aortic valve · " + (ph.aortic ? "open" : "closed");
      activeIdx = idx;
    }

    playhead.style.left = (imageX(p) * 100) + "%";

    // The heart squeezes with ventricular volume and glows with pressure
    const pv = vent(p), vv = volume(p);
    const squeeze = (vv - 85) / 35;
    const pn = pv / 122;
    heart.scale.setScalar(2.4 * (1 + 0.07 * squeeze));
    glowLight.intensity = 0.8 + 2.2 * pn * pn;
    material.emissiveIntensity = 0.08 + 0.45 * pn * pn;

    if (!dragging) { userY *= 0.97; userX *= 0.97; }
    heart.rotation.y = Math.sin(now / 1800) * 0.4 + userY;
    heart.rotation.x = userX;

    renderer.render(scene, camera);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (cycleEl.hidden) { last = now; return; }
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.1));
    last = now;
    if (!paused) phase = (phase + dt * bpm / 60) % 1;
    render(now);
  }

  // Show everything once a birth date has been entered
  function checkVisible() {
    if (!statsEl.hidden && cycleEl.hidden) {
      cycleEl.hidden = false;
      resize();
    }
  }
  setInterval(checkVisible, 300);
  checkVisible();

  requestAnimationFrame(frame);
})();