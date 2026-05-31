/* ============================================================
 * OLD POCHMANN BLD SOLVER — SCRIPT
 *
 * SECTIONS:
 *   1.  Constants
 *   2.  Color Picker UI          (original logic — PRESERVED)
 *   3.  Cube Data Collection     (original logic — PRESERVED)
 *   4.  Cube Validation          (original logic — PRESERVED + bug fixes)
 *   5.  RubiksCubeVisualizer     (Three.js 3D cube)
 *   6.  StepController           (playback / navigation)
 *   7.  Results Display          (card-based UI)
 *   8.  API Handler              (sendColors)
 *   9.  Clear Handler            (clearColors)
 * ============================================================ */

"use strict";

/* ============================================================
 * SECTION 1 — CONSTANTS
 * ============================================================ */

/** Rubik's Cube face colour hex values used in Three.js materials */
const CUBE_COLORS = {
  R: 0xe82020, // Red   — Right face   (x = +1)
  L: 0xff8c00, // Orange — Left face   (x = -1)
  U: 0xf0f0f0, // White  — Up face     (y = +1)
  D: 0xffe000, // Yellow — Down face   (y = -1)
  F: 0x00a820, // Green  — Front face  (z = +1)
  B: 0x1040ff, // Blue   — Back face   (z = -1)
  I: 0x0a0e1a, // Inner  — hidden interior faces
};

/**
 * Move definitions for Three.js animation.
 * axis   : which axis to rotate around ('x' | 'y' | 'z')
 * layers : which integer layer coordinates are in this move
 * angle  : base rotation angle in radians (for a single, non-prime turn)
 *
 * Angle derivation (right-hand coordinate system, Y-up, Z toward viewer):
 *   U  → CW from +Y  → negative rotation around Y  → -π/2
 *   D  → CW from -Y  → positive rotation around Y  → +π/2
 *   R  → CW from +X  → negative rotation around X  → -π/2
 *   L  → CW from -X  → positive rotation around X  → +π/2
 *   F  → CW from +Z  → negative rotation around Z  → -π/2
 *   B  → CW from -Z  → positive rotation around Z  → +π/2
 */
const API_URL = "http://127.0.0.1:8000/api";

const MOVE_DEFS = {
  // Single-layer moves
  U: { axis: "y", layers: [1], angle: -Math.PI / 2 },
  D: { axis: "y", layers: [-1], angle: Math.PI / 2 },
  R: { axis: "x", layers: [1], angle: -Math.PI / 2 },
  L: { axis: "x", layers: [-1], angle: Math.PI / 2 },
  F: { axis: "z", layers: [1], angle: -Math.PI / 2 },
  B: { axis: "z", layers: [-1], angle: Math.PI / 2 },
  // Slice moves
  M: { axis: "x", layers: [0], angle: Math.PI / 2 }, // like L
  E: { axis: "y", layers: [0], angle: Math.PI / 2 }, // like D
  S: { axis: "z", layers: [0], angle: -Math.PI / 2 }, // like F
  // Wide (two-layer) moves
  u: { axis: "y", layers: [1, 0], angle: -Math.PI / 2 },
  d: { axis: "y", layers: [-1, 0], angle: Math.PI / 2 },
  r: { axis: "x", layers: [1, 0], angle: -Math.PI / 2 },
  l: { axis: "x", layers: [-1, 0], angle: Math.PI / 2 },
  f: { axis: "z", layers: [1, 0], angle: -Math.PI / 2 },
  b: { axis: "z", layers: [-1, 0], angle: Math.PI / 2 },
  // Whole-cube rotations
  x: { axis: "x", layers: [-1, 0, 1], angle: -Math.PI / 2 },
  y: { axis: "y", layers: [-1, 0, 1], angle: -Math.PI / 2 },
  z: { axis: "z", layers: [-1, 0, 1], angle: -Math.PI / 2 },
};
/* ============================================================
 * TOAST SYSTEM (CUSTOM ALERTS)
 * ============================================================ */
function showToast(message, type = "error") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;

  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;

  container.appendChild(toast);

  // Автоматичне видалення через 5 секунд
  const timer = setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 5000);

  // Закриття по кліку на хрестик
  toast.querySelector(".toast-close").addEventListener("click", () => {
    clearTimeout(timer);
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  });
}
/* ============================================================
 * SECTION 2 — COLOUR PICKER UI  (original logic preserved)
 * ============================================================ */

let selectedColorCode = null;

// Highlight the clicked colour swatch; store its code
document.querySelectorAll(".color-box").forEach((box) => {
  box.addEventListener("click", () => {
    document
      .querySelectorAll(".color-box")
      .forEach((b) => b.classList.remove("selected"));
    box.classList.add("selected");
    selectedColorCode = box.getAttribute("data-code");
  });
});

// Paint a cell with the selected colour when clicked
document.querySelectorAll(".cell").forEach((cell) => {
  if (cell.classList.contains("center")) return; // skip center cells

  cell.addEventListener("click", () => {
    if (!selectedColorCode) {
      showToast("Спочатку виберіть колір із палітри", "warning");
      return;
    }

    // Map colour code → CSS colour string
    const colorMap = {
      R: "red",
      G: "green",
      B: "blue",
      O: "orange",
      W: "white",
      Y: "yellow",
    };

    cell.style.backgroundColor = colorMap[selectedColorCode] || "";

    // White cells need a visible border so they show up on the dark background
    if (selectedColorCode === "W") {
      cell.style.border = "1px solid #ccc";
    } else {
      cell.style.border = "";
    }

    cell.setAttribute("data-color", selectedColorCode);
  });
});

let selectedEdgeMethod = "M2"; // Значення за замовчуванням

document.querySelectorAll(".edge-method-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // Забираємо клас active у всіх кнопок ребер
    document
      .querySelectorAll(".edge-method-btn")
      .forEach((b) => b.classList.remove("active"));
    // Додаємо клас active на клікнуту
    e.target.classList.add("active");
    // Зберігаємо обраний метод
    selectedEdgeMethod = e.target.getAttribute("data-method");

    // Оновлюємо заголовок (H1), щоб показувати поточні методи
    const headerTitle = document.querySelector(".header-text h1");
    if (headerTitle) {
      headerTitle.textContent = `OP/${selectedEdgeMethod}`;
    }
  });
});
/* ============================================================
 * SECTION 3 — CUBE DATA COLLECTION  (original logic preserved)
 * ============================================================ */

/**
 * Collect all corner and edge colour codes from the DOM.
 * Returns { corners: string(24), edges: string(24) }
 * Unfilled cells are represented as 'X'.
 */
function collectColors() {
  let corners = "";
  for (let i = 1; i <= 24; i++) {
    const el = document.querySelector(`.corner.c${i}`);
    corners += el ? el.getAttribute("data-color") || "X" : "X";
  }

  let edges = "";
  for (let i = 1; i <= 24; i++) {
    const el = document.querySelector(`.edge.e${i}`);
    edges += el ? el.getAttribute("data-color") || "X" : "X";
  }

  return { corners, edges };
}

/* ============================================================
 * SECTION 4 — CUBE VALIDATION  (original logic preserved; alert text fixed)
 * ============================================================ */

/**
 * Check that no single piece (corner or edge) contains two colours
 * that belong to opposite faces (e.g. White + Yellow cannot appear
 * on the same corner piece).
 */
function checkColorConflicts(cornerColors, edgeColors) {
  const opposites = [
    ["W", "Y"],
    ["G", "B"],
    ["R", "O"],
  ];

  const cornerMap = {};
  const edgeMap = {};

  for (let i = 0; i < 8; i++) {
    cornerMap[`cor${i + 1}`] = [
      cornerColors[i * 3],
      cornerColors[i * 3 + 1],
      cornerColors[i * 3 + 2],
    ];
  }

  for (let i = 0; i < 12; i++) {
    edgeMap[`ed${i + 1}`] = [edgeColors[i * 2], edgeColors[i * 2 + 1]];
  }

  const hasOpposite = (colors) => {
    for (const [a, b] of opposites) {
      if (colors.includes(a) && colors.includes(b)) return `${a}-${b}`;
    }
    return null;
  };

  /*r (const [key, colors] of Object.entries(cornerMap)) {
    const opp = hasOpposite(colors);
    if (opp) {
      alert(`Елемент ${key} містить протилежні кольори: ${opp}`);
      return false;
    }
    if (new Set(colors).size !== colors.length) {
      alert(`Елемент ${key} містить однакові кольори: ${colors.join('')}`);
      return false;
    }
  }*/

  /*r (const [key, colors] of Object.entries(edgeMap)) {
    const opp = hasOpposite(colors);
    if (opp) {
      alert(`Елемент ${key} містить протилежні кольори: ${opp}`);
      return false;
    }
    if (new Set(colors).size !== colors.length) {
      alert(`Елемент ${key} містить однакові кольори: ${colors.join("")}`);
      return false;
    }
  }*/

  return true;
}

/**
 * Validate that every cell is filled and that each of the 6 colours
 * appears exactly 4 times in corners and exactly 4 times in edges.
 */
function validateCubeInput(corners, edges) {
  const colors = ["R", "G", "B", "O", "W", "Y"];
  const colorNamesUA = {
    R: "Червоний",
    G: "Зелений",
    B: "Синій",
    O: "Помаранчевий",
    W: "Білий",
    Y: "Жовтий",
  };

  if (corners.includes("X") || edges.includes("X")) {
    showToast(
      "Всі клітинки кути і ребра повинні бути заповнені кольорами.",
      "error",
    );
    return false;
  }

  const countColors = (str) => {
    const counts = {};
    for (const c of colors) counts[c] = 0;
    for (const ch of str) {
      if (Object.prototype.hasOwnProperty.call(counts, ch)) {
        counts[ch]++;
      } else {
        showToast("Знайдено недопустимий колір: " + ch, "error");
        return null;
      }
    }
    return counts;
  };

  const cornerCounts = countColors(corners);
  if (!cornerCounts) return false;

  const edgeCounts = countColors(edges);
  if (!edgeCounts) return false;

  for (const c of colors) {
    if (cornerCounts[c] !== 4) {
      showToast(
        `Колір <b>${colorNamesUA[c]}</b> зустрічається у кутах не 4 рази, а ${cornerCounts[c]}.`,
        "error",
      );
      return false;
    }
    if (edgeCounts[c] !== 4) {
      showToast(
        `Колір <b>${colorNamesUA[c]}</b> зустрічається у ребрах не 4 рази, а ${edgeCounts[c]}.`,
        "error",
      );
      return false;
    }
  }

  return true;
}
/* ============================================================
 * SECTION 5 — RUBIKS CUBE VISUALIZER  (Three.js)
 * ============================================================ */

/**
 * RubiksCubeVisualizer
 * --------------------
 * Creates a Three.js scene inside the given container element,
 * renders 27 coloured cubies, and animates move sequences.
 *
 * Public API:
 *   fullReset()                  – rebuild solved cube, clear queue
 *   applyAlgorithmInstant(str)   – execute a move sequence with no animation
 *   queueAlgorithm(str, cb)      – push moves into the animation queue
 *   setAnimSpeed(level 1–5)      – change animation speed
 */
class RubiksCubeVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.cubies = []; // all 27 THREE.Mesh objects
    this.moveQueue = []; // pending animated moves
    this.currentAnim = null; // currently running animation state
    this.animSpeed = 0.04; // progress fraction per frame (→ speed level 3)
    this.isDragging = false;

    this._init();
  }

  /* ---- Initialisation ---- */

  _init() {
    /* Scene */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1228);

    /* Subtle fog for depth */
    this.scene.fog = new THREE.FogExp2(0x0c1228, 0.08);

    /* Camera */
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(4.5, 3.2, 5.5);
    this.camera.lookAt(0, 0, 0);

    /* Renderer */
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    /* Lights */
    const ambient = new THREE.AmbientLight(0x8899cc, 0.7);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 8, 8);
    key.castShadow = true;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x4466bb, 0.35);
    fill.position.set(-5, -3, -4);
    this.scene.add(fill);

    /* Group that holds all cubies; we rotate this for "orbit" dragging */
    this.cubeGroup = new THREE.Group();
    /* Slight initial tilt so 3 faces are visible */
    this.cubeGroup.rotation.x = 0.28;
    this.cubeGroup.rotation.y = 0.55;
    this.scene.add(this.cubeGroup);

    /* Create the 27 cubies */
    this._buildCube();

    /* Controls & resize */
    this._setupMouseControls();
    this._setupResize();

    /* Start render loop */
    this._tick();
  }

  /* ---- Cube Construction ---- */

  /**
   * Build (or rebuild) the 27 cubies in a solved state.
   * Clears any pending animations first.
   */
  _buildCube() {
    /* Remove previous cubies */
    while (this.cubeGroup.children.length) {
      this.cubeGroup.remove(this.cubeGroup.children[0]);
    }
    this.cubies = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const mesh = this._makeCubie(x, y, z);
          this.cubeGroup.add(mesh);
          this.cubies.push(mesh);
        }
      }
    }
  }

  /**
   * Create one cubie mesh at logical position (x, y, z).
   * BoxGeometry material indices:  0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z
   */
  _makeCubie(x, y, z) {
    const geo = new THREE.BoxGeometry(0.93, 0.93, 0.93);

    const mats = [
      this._mat(x === 1 ? CUBE_COLORS.R : CUBE_COLORS.I),
      this._mat(x === -1 ? CUBE_COLORS.L : CUBE_COLORS.I),
      this._mat(y === 1 ? CUBE_COLORS.U : CUBE_COLORS.I),
      this._mat(y === -1 ? CUBE_COLORS.D : CUBE_COLORS.I),
      this._mat(z === 1 ? CUBE_COLORS.F : CUBE_COLORS.I),
      this._mat(z === -1 ? CUBE_COLORS.B : CUBE_COLORS.I),
    ];

    const mesh = new THREE.Mesh(geo, mats);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _mat(color) {
    return new THREE.MeshPhongMaterial({
      color,
      shininess: color === CUBE_COLORS.I ? 0 : 60,
      specular: color === CUBE_COLORS.I ? 0x000000 : 0x333333,
    });
  }

  /* ---- Move Parsing ---- */

  /**
   * Parse a standard Rubik's cube algorithm string into an array of move objects.
   * Handles: U D R L F B M E S x y z (and primes, doubles, wide 'w' suffix)
   *
   * @param {string} algStr  e.g. "R U R' U' R' F R2 U' R' U' R U R' F'"
   * @returns {{ base: string, mod: string }[]}
   */
  _parseMoves(algStr) {
    if (!algStr || typeof algStr !== "string") return [];
    const moves = [];
    /* Matches: move letter, optional 'w' (wide), optional ' or 2 */
    const re = /([UDLRFBMESxyzudlrfb])(w?)('|2)?/g;
    let m;
    while ((m = re.exec(algStr)) !== null) {
      let base = m[1];
      const wide = m[2] === "w";
      const mod = m[3] || "";

      /* Normalise capital + w  →  lowercase wide move  (e.g. Uw → u) */
      if (wide && /[UDLRFB]/.test(base)) base = base.toLowerCase();

      if (!MOVE_DEFS[base]) continue; // unknown / unsupported move
      moves.push({ base, mod });
    }
    return moves;
  }

  /** Compute the actual rotation angle for a parsed move */
  _moveAngle(base, mod) {
    let angle = MOVE_DEFS[base].angle;
    if (mod === "'") angle = -angle;
    if (mod === "2") angle *= 2;
    return angle;
  }

  /* ---- Instant Move Execution (no animation) ---- */

  /**
   * Execute a single parsed move immediately (no tween).
   * Uses a temporary pivot Object3D to rotate the affected layer,
   * then re-attaches cubies to cubeGroup with their world transform intact.
   */
  _execMoveInstant(base, mod) {
    const def = MOVE_DEFS[base];
    const angle = this._moveAngle(base, mod);
    const axis = def.axis;

    const affected = this.cubies.filter((c) =>
      def.layers.some((l) => Math.round(c.position[axis]) === l),
    );

    const pivot = new THREE.Object3D();
    this.cubeGroup.add(pivot);
    affected.forEach((c) => pivot.attach(c));

    pivot.rotation[axis] = angle;
    pivot.updateMatrixWorld(true);

    affected.forEach((c) => {
      this.cubeGroup.attach(c);
      c.position.x = Math.round(c.position.x);
      c.position.y = Math.round(c.position.y);
      c.position.z = Math.round(c.position.z);
    });

    this.cubeGroup.remove(pivot);
  }

  /** Apply a full algorithm string instantly (no animation). */
  applyAlgorithmInstant(algStr) {
    this._parseMoves(algStr).forEach(({ base, mod }) =>
      this._execMoveInstant(base, mod),
    );
  }

  /* ---- Animated Move Queue ---- */

  /**
   * Push all moves from algStr into the animation queue.
   * @param {string}   algStr
   * @param {Function} [onComplete]  called when the last move finishes
   */
  queueAlgorithm(algStr, onComplete) {
    const moves = this._parseMoves(algStr);
    moves.forEach((m) => this.moveQueue.push(m));
    if (typeof onComplete === "function") {
      /* Sentinel object: not a real move, just a callback */
      this.moveQueue.push({ __cb: onComplete });
    }
  }

  /** Start processing the queue (called internally by the render loop). */
  _processQueue() {
    if (!this.moveQueue.length || this.currentAnim) return;

    const item = this.moveQueue[0];

    /* Handle callback sentinels */
    if (item.__cb) {
      this.moveQueue.shift();
      item.__cb();
      this._processQueue();
      return;
    }

    const { base, mod } = item;
    const def = MOVE_DEFS[base];
    const angle = this._moveAngle(base, mod);
    const axis = def.axis;

    const affected = this.cubies.filter((c) =>
      def.layers.some((l) => Math.round(c.position[axis]) === l),
    );

    const pivot = new THREE.Object3D();
    this.cubeGroup.add(pivot);
    affected.forEach((c) => pivot.attach(c));

    this.currentAnim = {
      pivot,
      axis,
      targetAngle: angle,
      progress: 0,
      onComplete: () => {
        affected.forEach((c) => {
          this.cubeGroup.attach(c);
          c.position.x = Math.round(c.position.x);
          c.position.y = Math.round(c.position.y);
          c.position.z = Math.round(c.position.z);
        });
        this.cubeGroup.remove(pivot);
        this.moveQueue.shift();
        this.currentAnim = null;
        this._processQueue();
      },
    };
  }

  /* ---- Render Loop ---- */

  /** Smooth ease-in-out curve for animations */
  _ease(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  _tick() {
    requestAnimationFrame(() => this._tick());

    /* Advance current animation */
    if (this.currentAnim) {
      this.currentAnim.progress = Math.min(
        1,
        this.currentAnim.progress + this.animSpeed,
      );
      const { pivot, axis, targetAngle, progress, onComplete } =
        this.currentAnim;

      pivot.rotation[axis] = targetAngle * this._ease(progress);

      if (progress >= 1) onComplete();
    } else if (this.moveQueue.length) {
      this._processQueue();
    }

    /* Slow auto-rotate when idle and not being dragged */
    if (this.autoRotate && !this.isDragging && !this.currentAnim) {
      this.cubeGroup.rotation.y += 0.004;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /* ---- Public Controls ---- */

  /** Completely reset the cube to solved state and clear all queued moves. */
  fullReset() {
    this.moveQueue = [];
    this.currentAnim = null;
    this.autoRotate = true;
    this._buildCube();
  }

  /** Set animation speed (1 = slow … 5 = fast). */
  setAnimSpeed(level) {
    /* Map 1–5 → 0.022 – 0.10 progress per frame (~45fps assumed) */
    this.animSpeed = 0.022 + (level - 1) * 0.02;
  }

  /* ---- Mouse / Touch Drag Controls ---- */

  _setupMouseControls() {
    const el = this.renderer.domElement;
    let prevX = 0,
      prevY = 0;

    const onStart = (x, y) => {
      this.isDragging = true;
      this.autoRotate = false;
      prevX = x;
      prevY = y;
    };
    const onMove = (x, y) => {
      if (!this.isDragging) return;
      this.cubeGroup.rotation.y += (x - prevX) * 0.012;
      this.cubeGroup.rotation.x += (y - prevY) * 0.012;
      prevX = x;
      prevY = y;
    };
    const onEnd = () => {
      this.isDragging = false;
    };

    el.addEventListener("mousedown", (e) => onStart(e.clientX, e.clientY));
    el.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    el.addEventListener("mouseup", onEnd);
    el.addEventListener("mouseleave", onEnd);

    el.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: false },
    );
    el.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: false },
    );
    el.addEventListener("touchend", onEnd);
  }

  _setupResize() {
    new ResizeObserver(() => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }).observe(this.container);
  }
}

/* ============================================================
 * SECTION 6 — STEP CONTROLLER
 * ============================================================ */

/**
 * StepController
 * --------------
 * Manages step-by-step playback of the BLD solution.
 *
 * Flow:
 *   1. load(data)    – parse corner/parity/edge steps; scramble cube with
 *                      reverse_solution; reset currentStep to -1
 *   2. next()        – animate the next step's algorithm
 *   3. prev()        – reset + replay all steps up to (currentStep - 1)
 *   4. play()        – auto-advance through all remaining steps
 *   5. goToStep(n)   – jump to state after step n has been applied
 */
class StepController {
  constructor(visualizer) {
    this.viz = visualizer;
    this.steps = []; // { type, label, alg, moves[] }
    this.currentStep = -1; // -1 = initial (scrambled) state
    this.currentMoveIndex = -1; // -1 = before any move in current step
    this.reverseAlg = "";
    this.isPlaying = false;
    this._bindControls();
  }

  load(data) {
    this.steps = this._buildSteps(data);
    this.reverseAlg = data.reverse_solution || "";
    this.currentStep = -1;
    this.currentMoveIndex = -1;
    this._applyInitial();
    this._updateUI();
  }

  next() {
    if (
      this.currentStep >= this.steps.length - 1 &&
      (this.currentStep < 0 ||
        this.currentMoveIndex >= this.steps[this.currentStep].moves.length - 1)
    ) {
      this._stopPlay();
      return;
    }
    if (this.viz.moveQueue.length || this.viz.currentAnim) return;

    let step = this.currentStep >= 0 ? this.steps[this.currentStep] : null;
    let movesToQueue = [];
    let startIndex = 0;

    if (step && this.currentMoveIndex < step.moves.length - 1) {
      startIndex = this.currentMoveIndex + 1;
      movesToQueue = step.moves.slice(startIndex);
    } else {
      this.currentStep++;
      this.currentMoveIndex = -1;
      step = this.steps[this.currentStep];
      startIndex = 0;
      movesToQueue = step.moves;
    }

    this.viz.autoRotate = false;
    movesToQueue.forEach((m, offset) => {
      const moveTargetIndex = startIndex + offset;

      this.viz.moveQueue.push({
        __cb: () => {
          this.currentMoveIndex = moveTargetIndex;
          this._updateUI();
        },
      });
      this.viz.moveQueue.push({ base: m.base, mod: m.mod });
    });

    this.viz.moveQueue.push({
      __cb: () => {
        if (this.isPlaying) {
          const delay = Math.max(100, 600 - this.viz.animSpeed * 4000);
          setTimeout(() => this.next(), delay);
        }
      },
    });
  }

  /** Go back one step (reset cube + replay). */
  prev() {
    this._stopPlay();
    if (this.currentStep < 0) return;
    this._replayUpTo(this.currentStep - 1);
  }

  /**
   * CHANGE 4 — Jump to state BEFORE step n begins.
   * goToStep(0)  → scrambled initial state (before any step)
   * goToStep(1)  → state after step 0 has been applied (= before step 1)
   * goToStep(n)  → state after steps 0..n-1 applied  (= before step n)
   *
   * This is used both by the ⏮/⏭ controls AND by step-card clicks.
   * The old goToStep(i+1) called from cards becomes goToStep(i) here.
   */
  goToStep(n) {
    this._stopPlay();
    // Захист від виходу за межі масиву кроків
    const targetStep = Math.max(0, Math.min(n, this.steps.length - 1));
    // Перемотуємо рівно до кроку targetStep, але без жодного виконаного ходу (moveIdx = -1)
    this._replayUpToWithMoves(targetStep, -1);
  }

  /** Toggle play / pause. */
  play() {
    if (this.isPlaying) {
      this._stopPlay();
    } else {
      this.isPlaying = true;
      this._updatePlayBtn();
      this.next();
    }
  }

  /* ---------- Sub-move API (CHANGE 3) ---------- */

  /**
   * Execute the NEXT individual move within the current step.
   * If we're between steps (currentStep = -1), advance to step 0 first.
   * If we're past the last move of the current step, advance to next step's
   * first move.
   */
  nextMove() {
    if (this.viz.moveQueue.length || this.viz.currentAnim) return;
    this._stopPlay();

    // If no step is active yet, start step 0
    if (this.currentStep === -1) {
      if (this.steps.length === 0) return;
      this.currentStep = 0;
      this.currentMoveIndex = -1;
    }

    const step = this.steps[this.currentStep];

    // If we've exhausted all moves in the current step, move to next step
    if (this.currentMoveIndex >= step.moves.length - 1) {
      if (this.currentStep >= this.steps.length - 1) return; // already at end
      this.currentStep++;
      this.currentMoveIndex = -1;
    }

    this.currentMoveIndex++;
    const { base, mod } =
      this.steps[this.currentStep].moves[this.currentMoveIndex];

    this.viz.autoRotate = false;
    // Queue just this one move, with callback to update UI
    this.viz.moveQueue.push({ base, mod });
    this.viz.moveQueue.push({
      __cb: () => this._updateUI(),
    });

    this._updateUI(); // optimistic update to highlight the move immediately
  }

  /**
   * Execute the PREVIOUS individual move (reverse the last applied move).
   * If at start of current step, step back into the previous step's last move.
   */
  prevMove() {
    if (this.viz.moveQueue.length || this.viz.currentAnim) return;
    this._stopPlay();

    // Nothing to undo
    if (this.currentStep === -1) return;

    const step = this.steps[this.currentStep];

    if (this.currentMoveIndex < 0) {
      // We're at the start of a step; jump to end of previous step
      if (this.currentStep === 0) {
        // Already at very beginning — go back to initial state
        this._replayUpTo(-1);
        return;
      }

      // Крок назад (зменшуємо індекс поточного кроку на 1)
      this.currentStep--;
      const prevStep = this.steps[this.currentStep];

      // ВИПРАВЛЕНО: Перебудовуємо кубик рівно до поточного (вже зменшеного) кроку
      // та ставимо вказівник на його останній рух
      this._replayUpToWithMoves(this.currentStep, prevStep.moves.length - 1);
      return;
    }

    // Rebuild state from scratch up to (currentMoveIndex - 1) to stay clean
    this.currentMoveIndex--;
    this._replayUpToWithMoves(this.currentStep, this.currentMoveIndex);
  }

  /* ---- Private helpers ---- */

  /**
   * Parse API data into a flat steps array.
   * Each step now also carries a pre-parsed `moves` array for sub-stepping.
   */
  _buildSteps(data) {
    const steps = [];

    (data.edge_solution || []).forEach(([letter, alg]) => {
      steps.push({
        type: "edge",
        label: letter,
        alg,
        moves: this.viz._parseMoves(alg),
      });
    });

    if (data.parity) {
      steps.push({
        type: "parity",
        label: "Parity",
        alg: data.parity,
        moves: this.viz._parseMoves(data.parity),
      });
    }

    (data.corner_solution || []).forEach(([letter, alg]) => {
      steps.push({
        type: "corner",
        label: letter,
        alg,
        moves: this.viz._parseMoves(alg),
      });
    });

    return steps;
  }

  /** Reset cube and apply reverse_solution to reach scrambled state. */
  _applyInitial() {
    this.viz.fullReset();
    if (this.reverseAlg) {
      this.viz.applyAlgorithmInstant(this.reverseAlg);
    }
  }

  /**
   * Reset cube to scrambled, then instantly replay all FULL steps
   * up to and including index `targetIdx` (−1 = just scrambled state).
   * Also resets currentMoveIndex to -1 (before any move in the new current step).
   */
  _replayUpTo(targetIdx) {
    // Якщо індекс менше 0, значить ми повертаємось у початковий (скремблований) стан
    if (targetIdx < 0) {
      this._replayUpToWithMoves(-1, -1);
      return;
    }

    // Знаходимо валідний індекс кроку
    const until = Math.min(targetIdx, this.steps.length - 1);

    // Щоб стати рівно в КІНЕЦЬ виконаного кроку, знаходимо індекс його останнього ходу
    const lastMove = this.steps[until].moves.length - 1;
    this._replayUpToWithMoves(until, lastMove);
  }

  /**
   * (CHANGE 3) Reset cube, replay full steps 0..stepIdx-1, then replay
   * individual moves 0..moveIdx within step stepIdx.
   * Used by prevMove() to rewind one move at a time cleanly.
   */
  _replayUpToWithMoves(stepIdx, moveIdx) {
    this.viz.moveQueue = [];
    this.viz.currentAnim = null;

    this._applyInitial();

    // Apply all complete steps before stepIdx
    for (let i = 0; i < stepIdx; i++) {
      this.viz.applyAlgorithmInstant(this.steps[i].alg);
    }

    // Apply partial moves within stepIdx
    if (stepIdx >= 0 && stepIdx < this.steps.length) {
      const step = this.steps[stepIdx];
      const until = Math.min(moveIdx, step.moves.length - 1);
      for (let m = 0; m <= until; m++) {
        this.viz._execMoveInstant(step.moves[m].base, step.moves[m].mod);
      }
    }

    this.currentStep = stepIdx;
    this.currentMoveIndex = moveIdx;
    this._updateUI();
  }

  _stopPlay() {
    this.isPlaying = false;
    this._updatePlayBtn();
  }

  /* ---- UI updates ---- */

  _updateUI() {
    const total = this.steps.length;
    const current = this.currentStep + 1; // 0 = initial

    /* Counter */
    const counterEl = document.getElementById("stepCounter");
    if (counterEl) counterEl.textContent = `Крок ${current} / ${total}`;

    /* Progress bar */
    const fill = document.getElementById("stepProgressFill");
    if (fill) fill.style.width = total ? `${(current / total) * 100}%` : "0%";

    /* Step detail */
    const tagEl = document.getElementById("stepTypeTag");
    const letterEl = document.getElementById("stepLetter");
    const algInnerEl = document.getElementById("stepAlgInner");

    if (this.currentStep === -1) {
      if (tagEl) {
        tagEl.textContent = "—";
        tagEl.className = "step-type-tag";
      }
      if (letterEl) letterEl.textContent = "—";
      if (algInnerEl)
        algInnerEl.innerHTML = this.reverseAlg
          ? "Куб скремблований. Натисніть ▶ для початку."
          : "Куб у розв'язаному стані.";
    } else {
      const step = this.steps[this.currentStep];
      if (tagEl) {
        tagEl.textContent =
          step.type === "edge"
            ? "РЕБРО"
            : step.type === "corner"
              ? "КУТ"
              : "PARITY";
        tagEl.className = `step-type-tag ${step.type}`;
      }
      if (letterEl) letterEl.textContent = step.label;

      /*
       * CHANGE 3 — Render move tokens with highlighting.
       * Tokens before currentMoveIndex → done (dim)
       * Token AT currentMoveIndex      → active (highlighted)
       * Tokens after                   → pending (muted)
       */
      if (algInnerEl) {
        if (step.moves.length === 0) {
          algInnerEl.textContent = step.alg;
        } else {
          // Re-tokenise the raw alg string to preserve original notation
          // (e.g. "R U R'") while mapping each parsed move to a display token.
          const rawTokens =
            step.alg.match(/([UDLRFBMESxyzudlrfb]w?['2]?)/g) || [];
          algInnerEl.innerHTML = rawTokens
            .map((tok, idx) => {
              let cls = "move-token ";
              if (idx < this.currentMoveIndex) cls += "move-done";
              else if (idx === this.currentMoveIndex) cls += "move-active";
              else cls += "move-pending";
              return `<span class="${cls}">${tok}</span>`;
            })
            .join(" ");
        }
      }
    }

    /* Move sub-counter */
    const moveCtrEl = document.getElementById("stepMoveCounter");
    if (moveCtrEl) {
      if (
        this.currentStep >= 0 &&
        this.steps[this.currentStep].moves.length > 0
      ) {
        const moveTotal = this.steps[this.currentStep].moves.length;
        const moveCur = this.currentMoveIndex + 1;
        moveCtrEl.textContent = `Хід ${moveCur}/${moveTotal}`;
        moveCtrEl.classList.add("visible");
      } else {
        moveCtrEl.textContent = "";
        moveCtrEl.classList.remove("visible");
      }
    }

    /* Highlight active step card in the results list */
    document.querySelectorAll(".step-card").forEach((card, i) => {
      card.classList.toggle("active", i === this.currentStep);
      card.classList.toggle("done", i < this.currentStep);
    });

    /* Disable/enable prev button */
    const prevBtn = document.getElementById("ctrlPrev");
    if (prevBtn) prevBtn.disabled = this.currentStep < 0;

    const nextBtn = document.getElementById("ctrlNext");
    if (nextBtn) nextBtn.disabled = this.currentStep >= this.steps.length - 1;

    /* Sub-move buttons */
    const movePrevBtn = document.getElementById("ctrlMovePrev");
    const moveNextBtn = document.getElementById("ctrlMoveNext");
    if (movePrevBtn) {
      movePrevBtn.disabled =
        this.currentStep === -1 && this.currentMoveIndex < 0;
    }
    if (moveNextBtn) {
      const atEnd =
        this.currentStep >= this.steps.length - 1 &&
        this.currentStep >= 0 &&
        this.currentMoveIndex >= this.steps[this.currentStep].moves.length - 1;
      moveNextBtn.disabled = atEnd || this.steps.length === 0;
    }
  }

  _updatePlayBtn() {
    const btn = document.getElementById("ctrlPlay");
    if (!btn) return;
    btn.textContent = this.isPlaying ? "⏸" : "▶";
    btn.classList.toggle("playing", this.isPlaying);
  }

  /* ---- Control button bindings ---- */

  _bindControls() {
    const safe = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    };

    safe("ctrlReset", () => {
      this._stopPlay();
      this._replayUpTo(-1);
    });
    safe("ctrlPrev", () => this.prev());
    safe("ctrlPlay", () => this.play());
    safe("ctrlNext", () => this.next());
    safe("ctrlEnd", () => {
      this._stopPlay();
      this._replayUpTo(this.steps.length - 1);
    });

    /* CHANGE 3 — Sub-move buttons */
    safe("ctrlMovePrev", () => this.prevMove());
    safe("ctrlMoveNext", () => this.nextMove());

    const speedEl = document.getElementById("speedRange");
    const speedVal = document.getElementById("speedVal");
    if (speedEl) {
      speedEl.addEventListener("input", () => {
        const v = parseInt(speedEl.value, 10);
        if (speedVal) speedVal.textContent = v;
        this.viz.setAnimSpeed(v);
      });
    }
  }
}

/* ============================================================
 * SECTION 7 — RESULTS DISPLAY
 * ============================================================ */

/**
 * Render the solution data as card-based UI inside #resultsContainer.
 * Also provides the list of step cards that sync with the StepController.
 */
function displayResults(data, controller) {
  const container = document.getElementById("resultsContainer");
  container.innerHTML = "";

  /* Helper: insert commas every 2 letters for readability */
  const fmt = (str) => (str ? (str.match(/.{1,2}/g) || []).join(", ") : "—");

  /* ---- Letter Sequence Card (shows letter_seq + memo) ---- */
  const seqCard = document.createElement("div");
  seqCard.className = "seq-card";

  // Build memo HTML blocks only when the field exists in the response
  const cornersMemoHTML = data.corners_memo
    ? `<div class="memo-block">
         <div class="memo-label">Мнемонічні підказки для кутів</div>
         <div class="memo-value memo-corners">${data.corners_memo}</div>
       </div>`
    : "";
  const edgesMemoHTML = data.edges_memo
    ? `<div class="memo-block">
         <div class="memo-label">Мнемонічні підказки для ребер</div>
         <div class="memo-value memo-edges">${data.edges_memo}</div>
       </div>`
    : "";

  seqCard.innerHTML = `
    <div class="result-card-title">Послідовності літер</div>
    <div class="seq-row">
      <span class="seq-label">Ребра:</span>
      <span class="seq-value">${fmt(data.edge_letter_seq)}</span>
    </div>
    <div class="seq-row">
      <span class="seq-label">Кути:</span>
      <span class="seq-value">${fmt(data.corner_letter_seq)}</span>
    </div>
    ${edgesMemoHTML}
    ${cornersMemoHTML}
  `;
  container.appendChild(seqCard);

  /* ---- Steps List ---- */
  const stepsTitle = document.createElement("div");
  stepsTitle.className = "result-card-title";
  stepsTitle.style.cssText =
    "padding: 4px 0 8px; font-family: var(--font-mono); font-size:11px; letter-spacing:2px; color: var(--text-muted); text-transform:uppercase;";
  stepsTitle.textContent = "Кроки розв'язання";
  container.appendChild(stepsTitle);

  const stepsList = document.createElement("div");
  stepsList.className = "steps-list";

  /* Build a combined ordered list identical to what StepController uses */
  const allSteps = [];
  (data.edge_solution || []).forEach(([l, a]) =>
    allSteps.push({ type: "edge", label: l, alg: a }),
  );
  if (data.parity) {
    allSteps.push({ type: "parity", label: "Parity", alg: data.parity });
  }
  (data.corner_solution || []).forEach(([l, a]) =>
    allSteps.push({ type: "corner", label: l, alg: a }),
  );

  allSteps.forEach((step, i) => {
    const card = document.createElement("div");
    card.className = `step-card step-${step.type}`;
    card.innerHTML = `
      <span class="step-num">${i + 1}</span>
      <span class="step-type-badge">${
        step.type === "corner"
          ? "КУТ"
          : step.type === "edge"
            ? "РЕБРО"
            : "PARITY"
      }</span>
      <span class="step-letter-disp">${step.label}</span>
      <code class="step-alg-disp">${step.alg}</code>
    `;

    /**
     * CHANGE 4: Clicking a step card now jumps to the state BEFORE that step
     * begins (i.e. after step i-1 has been applied), so the user can then
     * press Play or the sub-move › button to watch the step execute live.
     *
     * Previously: controller.goToStep(i + 1)  — jumped PAST the step.
     * Now:        controller.goToStep(i)       — positions BEFORE the step.
     */
    card.addEventListener("click", () => {
      if (controller) controller.goToStep(i);
    });
    stepsList.appendChild(card);
  });

  container.appendChild(stepsList);
}

/* ============================================================
 * SECTION 8 — API HANDLER  (sendColors)
 * ============================================================ */

/* Module-level references so they persist across solves */
let visualizer = null;
let stepController = null;

document.getElementById("sendColors").addEventListener("click", () => {
  /* Collect and validate cube input (original logic) */
  const { corners, edges } = collectColors();
  if (!validateCubeInput(corners, edges)) return;
  if (!checkColorConflicts(corners, edges)) return;

  /* Update button state */
  const btn = document.getElementById("sendColors");
  btn.disabled = true;
  btn.innerHTML = '<span style="opacity:.6">⏳</span> Розв\'язуємо…';

  fetch(`${API_URL}/solve/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      corners: corners,
      edges: edges,
      edges_method: selectedEdgeMethod,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Неправильно введений кубик");
      return res.json();
    })
    .then((data) => {
      if (data.error) {
        showToast("Неправильно введений кубик", "error");
        return;
      }

      /* Show the results panel */
      const panel = document.getElementById("resultsPanel");
      panel.classList.add("visible");
      panel.style.display = "flex";

      /* Lazily create the Three.js visualizer the first time */
      if (!visualizer) {
        /* Remove placeholder text now that Three.js takes over the canvas */
        const ph = document.querySelector(".canvas-placeholder");
        if (ph) ph.style.display = "none";

        visualizer = new RubiksCubeVisualizer("cubeCanvas");
        stepController = new StepController(visualizer);
      }

      /* Load solution data */
      stepController.load(data);

      /* Render results cards */
      displayResults(data, stepController);

      /* Smooth scroll to results */
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    })
    .catch((err) => {
      showToast("Неправильно введений кубик", "error");
    })
    .finally(() => {
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="3,2 14,8 3,14"/>
        </svg>
        Розв'язати`;
    });
});

document.getElementById("clearColors").addEventListener("click", () => {
  /* Reset all corner and edge cells to unpainted state */
  document.querySelectorAll(".cell.corner, .cell.edge").forEach((cell) => {
    cell.style.backgroundColor = "";
    cell.style.border = "";
    cell.removeAttribute("data-color");
  });

  /* Hide results panel */
  const panel = document.getElementById("resultsPanel");
  panel.classList.remove("visible");
  panel.style.display = "none";

  /* Clear results container */
  const rc = document.getElementById("resultsContainer");
  if (rc) rc.innerHTML = "";

  /* Reset the 3D cube to solved state if it exists */
  if (visualizer) {
    visualizer.fullReset();
  }
  if (stepController) {
    stepController.steps = [];
    stepController.currentStep = -1;
    stepController.isPlaying = false;
  }
});

/* ============================================================
 * LAYOUT MODAL  (CHANGE 2)
 * Opens/closes the "Розкладка" modal showing the letter scheme.
 * ============================================================ */

(function initLayoutModal() {
  const openBtn = document.getElementById("openLayoutBtn");
  const modal = document.getElementById("layoutModal");
  const closeBtn = document.getElementById("closeLayoutBtn");

  if (!openBtn || !modal || !closeBtn) return;

  const open = () => modal.classList.add("open");
  const close = () => modal.classList.remove("open");

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  /* Close when clicking the dark overlay (outside the panel) */
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  /* Close on Escape key */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });
})();
