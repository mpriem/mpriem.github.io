// The live demo: MediaPipe hand and face tracking, all on-device.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

export function demo(el) {
  const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MODELS = {
    hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
  };
  const HAND = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
  const q = s => el.querySelector(s);
  const video = q('video'), canvas = q('canvas'), ctx = canvas.getContext('2d');
  const idle = q('.idle'), msg = q('.msg'), startBtn = q('.start'), stopBtn = q('.stop'), hud = q('.hud');
  const hudFace = q('.h-face'), hudHands = q('.h-hands'), hudScore = q('.h-score');
  let trackers, tk, stream, raf, running = false, session = 0;
  let W = 0, H = 0, lastVideoTime = -1, handRes, faceRes;
  let cubes = [], pieces = [], score = 0, lastSpawn = 0, whoa = 0;

  function loadTrackers() {
    trackers ||= (async () => {
      const { FilesetResolver, HandLandmarker, FaceLandmarker } = await import(`${MP}/vision_bundle.mjs`);
      const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
      const create = async (Task, opts) => {
        try { return await Task.createFromOptions(files, { ...opts, baseOptions: { ...opts.baseOptions, delegate: 'GPU' } }); }
        catch { return Task.createFromOptions(files, { ...opts, baseOptions: { ...opts.baseOptions, delegate: 'CPU' } }); }
      };
      const [hands, face] = await Promise.all([
        create(HandLandmarker, { baseOptions: { modelAssetPath: MODELS.hand }, runningMode: 'VIDEO', numHands: 2 }),
        create(FaceLandmarker, { baseOptions: { modelAssetPath: MODELS.face }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true })
      ]);
      return { hands, face };
    })().catch(err => { trackers = null; throw err; });
    return trackers;
  }

  function message(text, error) {
    msg.textContent = text;
    msg.classList.toggle('error', !!error);
  }

  async function start() {
    if (running) return;
    const me = ++session;
    startBtn.disabled = true;
    message('Asking for your camera…');
    if (!navigator.mediaDevices?.getUserMedia) {
      startBtn.disabled = false;
      return message('This browser cannot share a camera with web pages.', true);
    }
    const loading = loadTrackers();
    loading.catch(() => {});
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch {
      startBtn.disabled = false;
      return message('No camera access. Allow the camera for this site and try again.', true);
    }
    if (me !== session) return stopStream();
    video.srcObject = stream;
    await video.play().catch(() => {});
    message('Loading the tracking models (a few MB, first time only)…');
    try {
      tk = await loading;
    } catch {
      stopStream();
      startBtn.disabled = false;
      return message('Could not load the tracking models. Check your connection and try again.', true);
    }
    if (me !== session) return stopStream();
    running = true;
    cubes = []; pieces = []; score = 0; lastSpawn = 0;
    hudScore.textContent = '0';
    gsap.to(idle, { autoAlpha: 0, duration: 0.4 });
    hud.hidden = stopBtn.hidden = false;
    raf = requestAnimationFrame(frame);
  }

  function stopStream() {
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
  }

  function stop() {
    session++;
    running = false;
    cancelAnimationFrame(raf);
    stopStream();
    hud.hidden = stopBtn.hidden = true;
    startBtn.disabled = false;
    startBtn.textContent = score ? `Play again (score ${score})` : 'Start the camera';
    message('Runs entirely in your browser. No video leaves your device.');
    gsap.set(idle, { autoAlpha: 1 });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);

  function fit() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    fit();
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw) return;
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const t = performance.now();
      handRes = tk.hands.detectForVideo(video, t);
      faceRes = tk.face.detectForVideo(video, t);
    }

    // Mirror the camera like a selfie and cover the panel; landmarks use the same mapping.
    const s = Math.max(W / vw, H / vh), dw = vw * s, dh = vh * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
    const map = p => ({ x: W - (dx + p.x * dw), y: dy + p.y * dh });
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, dx, dy, dw, dh);
    ctx.restore();
    ctx.fillStyle = 'rgba(6,6,26,.28)';
    ctx.fillRect(0, 0, W, H);

    const face = faceRes?.faceLandmarks?.[0];
    if (face) drawFace(face, map);

    const sabers = [];
    (handRes?.landmarks || []).forEach((hand, i) => {
      // MediaPipe labels handedness for a mirrored image; our input is unmirrored, so "Right" is the user's left hand.
      const isLeft = handRes.handednesses?.[i]?.[0]?.categoryName === 'Right';
      sabers.push(drawHand(hand.map(map), isLeft ? '#ff3355' : '#3a86ff'));
    });

    updateCubes(now, sabers);
    updatePieces();

    hudFace.textContent = face ? '✓' : '–';
    hudHands.textContent = sabers.length;
  }

  function drawFace(lm, map) {
    ctx.fillStyle = 'rgba(0,229,255,.55)';
    for (let i = 0; i < 468; i += 3) {
      const p = map(lm[i]);
      ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
    }
    let a = map(lm[33]), b = map(lm[263]);
    if (a.x > b.x) [a, b] = [b, a];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const bridge = map(lm[168]);
    const cx = (a.x + b.x) / 4 + bridge.x / 2, cy = (a.y + b.y) / 4 + bridge.y / 2;
    const w = dist * 1.6, h = dist * 0.62;

    const shapes = faceRes.faceBlendshapes?.[0]?.categories || [];
    const jaw = shapes.find(c => c.categoryName === 'jawOpen')?.score || 0;
    if (jaw > 0.45) whoa = 1; else whoa *= 0.94;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.shadowColor = whoa > 0.1 ? '#ffcf4a' : '#00e5ff';
    ctx.shadowBlur = 24 + whoa * 30;
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, 'rgba(0,229,255,.78)');
    g.addColorStop(1, 'rgba(255,43,214,.78)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.45);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + h * 0.25, -h / 2 + h * 0.14, w - h * 0.5, h * 0.16, h * 0.08);
    ctx.fill();
    ctx.fillStyle = '#06061a';
    ctx.font = `700 ${Math.round(h * 0.34)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(whoa > 0.3 ? 'WHOA!' : `SCORE ${score}`, 0, h * 0.06);
    ctx.restore();

    if (whoa > 0.3) {
      for (let i = 0; i < 2; i++) pieces.push({ x: cx, y: cy + h, vx: rand(-3, 3), vy: rand(-6, -2), life: 1, kind: 'spark', color: pick(['#ffcf4a', '#ff2bd6', '#00e5ff']) });
    }
  }

  function drawHand(pts, color) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    HAND.forEach(([i, j]) => { ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); });
    ctx.stroke();
    ctx.fillStyle = color;
    pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });

    // The saber grows out of the index fingertip, in the direction the finger points.
    const base = pts[5], tip = pts[8];
    const fx = tip.x - base.x, fy = tip.y - base.y, flen = Math.hypot(fx, fy) || 1;
    const len = Math.max(60, flen * 2.8);
    const end = { x: tip.x + (fx / flen) * len, y: tip.y + (fy / flen) * len };
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 28;
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    return { a: tip, b: end };
  }

  function segDist(p, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  }

  function updateCubes(now, sabers) {
    if (cubes.length < 4 && now - lastSpawn > 900) {
      lastSpawn = now;
      cubes.push({ x: rand(0.15, 0.85) * W, y: rand(0.22, 0.72) * H, born: now, size: Math.min(W, H) * rand(0.09, 0.13), rot: rand(0, Math.PI * 2), vr: rand(-0.02, 0.02), color: pick(['#ff3355', '#3a86ff']) });
    }
    cubes = cubes.filter(c => {
      const age = (now - c.born) / 1000;
      if (age > 6) return false;
      c.rot += c.vr;
      const grow = Math.min(1, age / 0.4), fade = age > 5.4 ? (6 - age) / 0.6 : 1;
      const pos = { x: c.x, y: c.y + Math.sin(age * 2.4 + c.born) * 6 };
      const hit = grow === 1 && sabers.find(sb => segDist(pos, sb.a, sb.b) < c.size * 0.6);
      if (hit) {
        const cut = Math.atan2(hit.b.y - hit.a.y, hit.b.x - hit.a.x), ang = cut + Math.PI / 2;
        [-1, 1].forEach(side => pieces.push({ x: pos.x, y: pos.y, vx: Math.cos(ang) * side * 5, vy: Math.sin(ang) * side * 5 - 2, r: c.rot, vr: side * 0.08, life: 1, kind: 'half', side, size: c.size, color: c.color, cut }));
        for (let i = 0; i < 14; i++) pieces.push({ x: pos.x, y: pos.y, vx: rand(-7, 7), vy: rand(-7, 4), life: 1, kind: 'spark', color: c.color });
        score++;
        hudScore.textContent = score;
        return false;
      }
      drawCube(pos.x, pos.y, c.size * grow, c.rot, c.color, fade);
      return true;
    });
  }

  function drawCube(x, y, s, rot, color, alpha, clipSide, cutAng) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(x, y);
    if (clipSide) {
      ctx.rotate(cutAng);
      ctx.beginPath();
      ctx.rect(-s, clipSide < 0 ? -s : 0, s * 2, s);
      ctx.clip();
      ctx.rotate(-cutAng);
    }
    ctx.rotate(rot);
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.24, s * 0.12); ctx.lineTo(0, s * 0.3); ctx.lineTo(s * 0.24, s * 0.12);
    ctx.stroke();
    ctx.restore();
  }

  function updatePieces() {
    pieces = pieces.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.life -= p.kind === 'half' ? 0.025 : 0.04;
      if (p.life <= 0) return false;
      if (p.kind === 'half') {
        p.r += p.vr;
        drawCube(p.x, p.y, p.size, p.r, p.color, p.life, p.side, p.cut);
      } else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.globalAlpha = 1;
      }
      return true;
    });
  }

  return {
    leave() { if (running || stream || startBtn.disabled) stop(); }
  };
}
