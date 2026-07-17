// Guide description texts
const guideDescriptions = {
  thirds: "<strong>三分割法 (Rule of Thirds)</strong>画面を縦横3等分し、その交点に主題を配置する古典的で安定性の高いレイアウト。主要な被写体や視線を集める要素を交点付近に置くのがお勧めです。",
  golden_spiral: "<strong>黄金螺旋 (Golden Spiral)</strong>黄金比に基づいて描かれる対数螺旋。螺旋の収束点（中心）に視線を誘導するように主題を配置します。螺旋の向きを切り替えて、主要な被写体とマッチさせてください。",
  dynamic_symmetry: "<strong>動的対称性 (Dynamic Symmetry)</strong>対角線とそこから対角に下ろした垂線による複雑なグリッド。西洋美術や古典絵画（ルネサンス期など）で非常によく使われ、視線の自然な流れや画面の動き（ダイナミズム）を設計できます。",
  golden_triangle: "<strong>黄金三角形 (Golden Triangles)</strong>対角線とその他の角から引いた垂線で分割される三角形。動きのある被写体や対角線の方向性を強調し、緊張感とバランスを両立させます。"
};

// DOM Elements
const logo = document.getElementById('logo');
const uploadZone = document.getElementById('uploadZone');
const editorZone = document.getElementById('editorZone');
const controlPanel = document.getElementById('controlPanel');
const fileInfoPanel = document.getElementById('fileInfoPanel');
const fileDetails = document.getElementById('fileDetails');
const btnSelectFile = document.getElementById('btnSelectFile');
const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('cropCanvas');
const ctx = canvas.getContext('2d');
const togglePreview = document.getElementById('togglePreview');
const compositionInfo = document.getElementById('compositionInfo');
const btnCrop = document.getElementById('btnCrop');
const btnReset = document.getElementById('btnReset');
const spiralControls = document.getElementById('spiralControls');
const inputSaturation = document.getElementById('inputSaturation');
const satVal = document.getElementById('satVal');
const inputBrightness = document.getElementById('inputBrightness');
const brightVal = document.getElementById('brightVal');
const btnResetAdjustments = document.getElementById('btnResetAdjustments');

// State Variables
let img = new Image();
let imgLoaded = false;
let originalFileName = 'cropped_composition.jpg';

// Crop box coordinates in normalized scale [0..1]
let cropBox = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }; 
let currentRatio = 'free'; // 'free' or float value
let activeGuide = 'thirds'; // 'thirds', 'golden_spiral', ...
let spiralDirection = 0; // 0: TL, 1: TR, 2: BR, 3: BL
let isPreviewMode = false;
let saturationValue = 100;
let brightnessValue = 100;

// Interaction variables
let isDragging = false;
let isResizing = false;
let dragStart = { x: 0, y: 0 };
let activeHandle = null; // 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r', 'move'

const HANDLE_SIZE = 12;

// Trigger File Input Click
btnSelectFile.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('click', (e) => {
  if (e.target !== btnSelectFile) {
    fileInput.click();
  }
});

// Drag and Drop files
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--color-brand)';
  uploadZone.style.background = 'rgba(139, 92, 246, 0.08)';
});

uploadZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'rgba(139, 92, 246, 0.3)';
  uploadZone.style.background = 'rgba(17, 19, 31, 0.6)';
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleImageFile(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleImageFile(e.target.files[0]);
  }
});

logo.addEventListener('click', () => {
  resetUpload();
});

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('画像ファイルを選択してください。');
    return;
  }
  originalFileName = file.name;
  
  // Hide upload zone
  uploadZone.classList.add('hidden');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

img.onload = () => {
  imgLoaded = true;
  
  // Update File details
  fileDetails.innerText = `画質: ${img.naturalWidth} x ${img.naturalHeight} | ${originalFileName}`;
  fileInfoPanel.classList.remove('hidden');

  // Setup editor UI
  initCropBox();
  
  // Show editor and controls
  editorZone.classList.remove('hidden');
  controlPanel.classList.remove('hidden');
  
  // Resize canvas based on visible area
  resizeCanvas();
  
  draw();
};

// (AI Analysis function removed)

function resetUpload() {
  imgLoaded = false;
  fileInput.value = '';
  editorZone.classList.add('hidden');
  controlPanel.classList.add('hidden');
  fileInfoPanel.classList.add('hidden');
  uploadZone.classList.remove('hidden');
}

btnReset.addEventListener('click', resetUpload);

function initCropBox() {
  // Initial large crop area
  cropBox = { x: 0.15, y: 0.15, w: 0.7, h: 0.7 };
  applyAspectRatio();
}

function applyAspectRatio() {
  if (currentRatio === 'free') return;
  
  const targetRatio = parseFloat(currentRatio);
  const imgRatio = img.naturalWidth / img.naturalHeight;
  
  const cx = cropBox.x + cropBox.w / 2;
  const cy = cropBox.y + cropBox.h / 2;
  
  let newW = cropBox.w;
  let newH = newW / targetRatio * imgRatio;
  
  if (newH > 0.95) {
    newH = 0.8;
    newW = newH * targetRatio / imgRatio;
  }
  
  cropBox.w = newW;
  cropBox.h = newH;
  cropBox.x = cx - newW / 2;
  cropBox.y = cy - newH / 2;
  
  boundCropBox();
}

function boundCropBox() {
  cropBox.w = Math.max(0.05, Math.min(1.0, cropBox.w));
  cropBox.h = Math.max(0.05, Math.min(1.0, cropBox.h));
  
  if (cropBox.x < 0) cropBox.x = 0;
  if (cropBox.y < 0) cropBox.y = 0;
  if (cropBox.x + cropBox.w > 1) {
    cropBox.x = 1 - cropBox.w;
  }
  if (cropBox.y + cropBox.h > 1) {
    cropBox.y = 1 - cropBox.h;
  }
}

// Set canvas dimensions relative to workspace container
function resizeCanvas() {
  if (!imgLoaded) return;
  
  const workspace = document.querySelector('.workspace');
  const maxW = workspace.clientWidth - 48;
  const maxH = workspace.clientHeight - 48;
  
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  
  let w = imgW;
  let h = imgH;
  
  if (w > maxW) {
    w = maxW;
    h = (imgH * maxW) / imgW;
  }
  if (h > maxH) {
    h = maxH;
    w = (imgW * maxH) / imgH;
  }
  
  canvas.width = w;
  canvas.height = h;
}

window.addEventListener('resize', () => {
  if (imgLoaded) {
    resizeCanvas();
    draw();
  }
});

function toCanvasCoords(box) {
  return {
    x: box.x * canvas.width,
    y: box.y * canvas.height,
    w: box.w * canvas.width,
    h: box.h * canvas.height
  };
}

// DRAW loop
function draw() {
  if (!imgLoaded) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Apply saturation and brightness filters to image draw only
  ctx.save();
  ctx.filter = `saturate(${saturationValue}%) brightness(${brightnessValue}%)`;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  const cb = toCanvasCoords(cropBox);
  
  // Shadow mask outside crop box
  ctx.fillStyle = isPreviewMode ? 'rgba(0, 0, 0, 1.0)' : 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, cb.y); // top
  ctx.fillRect(0, cb.y + cb.h, canvas.width, canvas.height - (cb.y + cb.h)); // bottom
  ctx.fillRect(0, cb.y, cb.x, cb.h); // left
  ctx.fillRect(cb.x + cb.w, cb.y, canvas.width - (cb.x + cb.w), cb.h); // right
  
  // Crop border, guides, and handles (only when preview mode is OFF)
  if (!isPreviewMode) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);
    
    // Render composition overlays
    drawGuide(cb);

    // Drag handles
    drawHandles(cb);
  }
}

function drawGuide(cb) {
  ctx.save();
  
  if (activeGuide === 'thirds') {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    // vertical
    ctx.moveTo(cb.x + cb.w / 3, cb.y);
    ctx.lineTo(cb.x + cb.w / 3, cb.y + cb.h);
    ctx.moveTo(cb.x + (cb.w * 2) / 3, cb.y);
    ctx.lineTo(cb.x + (cb.w * 2) / 3, cb.y + cb.h);
    
    // horizontal
    ctx.moveTo(cb.x, cb.y + cb.h / 3);
    ctx.lineTo(cb.x + cb.w, cb.y + cb.h / 3);
    ctx.moveTo(cb.x, cb.y + (cb.h * 2) / 3);
    ctx.lineTo(cb.x + cb.w, cb.y + (cb.h * 2) / 3);
    ctx.stroke();
  } 
  else if (activeGuide === 'golden_spiral') {
    drawSpiralCurve(cb.x, cb.y, cb.w, cb.h, spiralDirection);
  } 
  else if (activeGuide === 'dynamic_symmetry') {
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // Main diagonals
    ctx.moveTo(cb.x, cb.y);
    ctx.lineTo(cb.x + cb.w, cb.y + cb.h);
    ctx.moveTo(cb.x, cb.y + cb.h);
    ctx.lineTo(cb.x + cb.w, cb.y);
    
    // Reciprocals (intersection points)
    const w2 = cb.w * cb.w;
    const h2 = cb.h * cb.h;
    const t = w2 / (w2 + h2);
    
    ctx.moveTo(cb.x + cb.w, cb.y);
    ctx.lineTo(cb.x + t * cb.w, cb.y + t * cb.h);
    
    ctx.moveTo(cb.x, cb.y + cb.h);
    ctx.lineTo(cb.x + (1-t)*cb.w, cb.y + (1-t)*cb.h);
    
    ctx.moveTo(cb.x, cb.y);
    ctx.lineTo(cb.x + (1-t)*cb.w, cb.y + t*cb.h);
    
    ctx.moveTo(cb.x + cb.w, cb.y + cb.h);
    ctx.lineTo(cb.x + t*cb.w, cb.y + (1-t)*cb.h);
    
    ctx.stroke();
  } 
  else if (activeGuide === 'golden_triangle') {
    ctx.strokeStyle = 'rgba(132, 204, 22, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    ctx.moveTo(cb.x, cb.y + cb.h);
    ctx.lineTo(cb.x + cb.w, cb.y);
    
    const w2 = cb.w * cb.w;
    const h2 = cb.h * cb.h;
    const t = w2 / (w2 + h2);
    
    ctx.moveTo(cb.x, cb.y);
    ctx.lineTo(cb.x + t * cb.w, cb.y + (1 - t) * cb.h);
    
    ctx.moveTo(cb.x + cb.w, cb.y + cb.h);
    ctx.lineTo(cb.x + (1 - t) * cb.w, cb.y + t * cb.h);
    
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawSpiralCurve(x, y, w, h, direction) {
  ctx.save();

  let drawW = w;
  let drawH = h;

  // Move origin to the center of the crop box
  ctx.translate(x + w / 2, y + h / 2);

  // Apply flip based on selected quadrant direction
  if (direction === 1) {
    ctx.scale(-1, 1);
  } else if (direction === 2) {
    ctx.scale(-1, -1);
  } else if (direction === 3) {
    ctx.scale(1, -1);
  }

  // Rotate 90 degrees if height is larger than width (Portrait orientation)
  if (w < h) {
    ctx.rotate(Math.PI / 2);
    ctx.translate(-h / 2, -w / 2);
    drawW = h;
    drawH = w;
  } else {
    ctx.translate(-w / 2, -h / 2);
  }

  const phi = 1.61803398875;
  
  // Determine the size and offset of the virtual golden rectangle that fits inside [0, 0, drawW, drawH]
  let w_gold, h_gold;
  let x_off = 0, y_off = 0;
  
  if (drawW / drawH >= phi) {
    // Wide crop box: fit by height
    h_gold = drawH;
    w_gold = drawH * phi;
    x_off = (drawW - w_gold) / 2;
  } else {
    // Narrow/Tall crop box: fit by width
    w_gold = drawW;
    h_gold = drawW / phi;
    y_off = (drawH - h_gold) / 2;
  }

  // We partition the virtual golden rectangle [x_off, y_off, w_gold, h_gold]
  let x1 = x_off, x2 = x_off + w_gold, y1 = y_off, y2 = y_off + h_gold;
  let squares = [];
  
  for (let i = 0; i < 8; i++) {
    let s;
    const mod = i % 4;
    if (mod === 0) {
      s = y2 - y1;
      squares.push({
        cx: x1 + s,
        cy: y1 + s,
        r: s,
        startAngle: Math.PI,
        endAngle: 1.5 * Math.PI
      });
      x1 += s;
    } else if (mod === 1) {
      s = x2 - x1;
      squares.push({
        cx: x1,
        cy: y1 + s,
        r: s,
        startAngle: 1.5 * Math.PI,
        endAngle: 2 * Math.PI
      });
      y1 += s;
    } else if (mod === 2) {
      s = y2 - y1;
      squares.push({
        cx: x2 - s,
        cy: y1,
        r: s,
        startAngle: 0,
        endAngle: 0.5 * Math.PI
      });
      x2 -= s;
    } else if (mod === 3) {
      s = x2 - x1;
      squares.push({
        cx: x1 + s,
        cy: y2 - s,
        r: s,
        startAngle: 0.5 * Math.PI,
        endAngle: Math.PI
      });
      y2 -= s;
    }
  }

  // 1. Draw Fibonacci partition lines (grid)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.lineWidth = 1;
  
  let gx1 = x_off, gx2 = x_off + w_gold, gy1 = y_off, gy2 = y_off + h_gold;
  for (let i = 0; i < 7; i++) {
    const mod = i % 4;
    if (mod === 0) {
      let s = gy2 - gy1;
      ctx.moveTo(gx1 + s, gy1);
      ctx.lineTo(gx1 + s, gy2);
      gx1 += s;
    } else if (mod === 1) {
      let s = gx2 - gx1;
      ctx.moveTo(gx1, gy1 + s);
      ctx.lineTo(gx2, gy1 + s);
      gy1 += s;
    } else if (mod === 2) {
      let s = gy2 - gy1;
      ctx.moveTo(gx2 - s, gy1);
      ctx.lineTo(gx2 - s, gy2);
      gx2 -= s;
    } else if (mod === 3) {
      let s = gx2 - gx1;
      ctx.moveTo(gx1, gy2 - s);
      ctx.lineTo(gx2, gy2 - s);
      gy2 -= s;
    }
  }
  ctx.stroke();

  // 2. Draw continuous golden spiral curve
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.lineWidth = 1.8;

  // Start at the first point
  const first = squares[0];
  const startX = first.cx + first.r * Math.cos(first.startAngle);
  const startY = first.cy + first.r * Math.sin(first.startAngle);
  ctx.moveTo(startX, startY);

  squares.forEach(sq => {
    ctx.arc(sq.cx, sq.cy, sq.r, sq.startAngle, sq.endAngle, false);
  });

  ctx.stroke();
  ctx.restore();
}



function drawHandles(cb) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  
  const corners = [
    { x: cb.x, y: cb.y },
    { x: cb.x + cb.w, y: cb.y },
    { x: cb.x, y: cb.y + cb.h },
    { x: cb.x + cb.w, y: cb.y + cb.h }
  ];
  
  corners.forEach(c => {
    ctx.fillRect(c.x - HANDLE_SIZE/2, c.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(c.x - HANDLE_SIZE/2, c.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
  });
  
  if (currentRatio === 'free') {
    const edges = [
      { x: cb.x + cb.w/2, y: cb.y },
      { x: cb.x + cb.w/2, y: cb.y + cb.h },
      { x: cb.x, y: cb.y + cb.h/2 },
      { x: cb.x + cb.w, y: cb.y + cb.h/2 }
    ];
    
    edges.forEach(e => {
      ctx.fillRect(e.x - HANDLE_SIZE/2, e.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeRect(e.x - HANDLE_SIZE/2, e.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
    });
  }
}



// Canvas Interactive Events
canvas.addEventListener('mousedown', (e) => {
  if (isPreviewMode) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  
  const cb = toCanvasCoords(cropBox);
  activeHandle = getClickedHandle(mx, my, cb);
  
  if (activeHandle) {
    isResizing = true;
    dragStart.x = mx;
    dragStart.y = my;
  } 
  else if (mx > cb.x && mx < cb.x + cb.w && my > cb.y && my < cb.y + cb.h) {
    isDragging = true;
    dragStart.x = mx;
    dragStart.y = my;
  }
});

function getClickedHandle(mx, my, cb) {
  const tolerance = HANDLE_SIZE + 4;
  if (Math.abs(mx - cb.x) < tolerance && Math.abs(my - cb.y) < tolerance) return 'tl';
  if (Math.abs(mx - (cb.x + cb.w)) < tolerance && Math.abs(my - cb.y) < tolerance) return 'tr';
  if (Math.abs(mx - cb.x) < tolerance && Math.abs(my - (cb.y + cb.h)) < tolerance) return 'bl';
  if (Math.abs(mx - (cb.x + cb.w)) < tolerance && Math.abs(my - (cb.y + cb.h)) < tolerance) return 'br';
  
  if (currentRatio === 'free') {
    if (Math.abs(mx - (cb.x + cb.w/2)) < tolerance && Math.abs(my - cb.y) < tolerance) return 't';
    if (Math.abs(mx - (cb.x + cb.w/2)) < tolerance && Math.abs(my - (cb.y + cb.h)) < tolerance) return 'b';
    if (Math.abs(mx - cb.x) < tolerance && Math.abs(my - (cb.y + cb.h/2)) < tolerance) return 'l';
    if (Math.abs(mx - (cb.x + cb.w)) < tolerance && Math.abs(my - (cb.y + cb.h/2)) < tolerance) return 'r';
  }
  return null;
}

canvas.addEventListener('mousemove', (e) => {
  if (isPreviewMode) {
    canvas.style.cursor = 'default';
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  
  if (!isDragging && !isResizing) {
    const cb = toCanvasCoords(cropBox);
    const handle = getClickedHandle(mx, my, cb);
    if (handle) {
      if (handle === 'tl' || handle === 'br') canvas.style.cursor = 'nwse-resize';
      else if (handle === 'tr' || handle === 'bl') canvas.style.cursor = 'nesw-resize';
      else if (handle === 't' || handle === 'b') canvas.style.cursor = 'ns-resize';
      else if (handle === 'l' || handle === 'r') canvas.style.cursor = 'ew-resize';
    } else if (mx > cb.x && mx < cb.x + cb.w && my > cb.y && my < cb.y + cb.h) {
      canvas.style.cursor = 'move';
    } else {
      canvas.style.cursor = 'default';
    }
  }
  
  if (isDragging) {
    const dx = (mx - dragStart.x) / canvas.width;
    const dy = (my - dragStart.y) / canvas.height;
    
    cropBox.x += dx;
    cropBox.y += dy;
    boundCropBox();
    
    dragStart.x = mx;
    dragStart.y = my;
    draw();
  } 
  else if (isResizing) {
    const dx = (mx - dragStart.x) / canvas.width;
    const dy = (my - dragStart.y) / canvas.height;
    
    resizeCropBox(dx, dy);
    
    dragStart.x = mx;
    dragStart.y = my;
    draw();
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  isResizing = false;
  activeHandle = null;
});

function resizeCropBox(dx, dy) {
  const cb = { ...cropBox };
  const ratio = currentRatio === 'free' ? null : parseFloat(currentRatio);
  const imgRatio = img.naturalWidth / img.naturalHeight;
  
  if (activeHandle === 'tl') {
    cb.x += dx;
    cb.w -= dx;
    cb.y += dy;
    cb.h -= dy;
    if (ratio) {
      const targetH = cb.w / ratio * imgRatio;
      cb.y += (cb.h - targetH);
      cb.h = targetH;
    }
  } 
  else if (activeHandle === 'tr') {
    cb.w += dx;
    cb.y += dy;
    cb.h -= dy;
    if (ratio) {
      const targetH = cb.w / ratio * imgRatio;
      cb.y += (cb.h - targetH);
      cb.h = targetH;
    }
  } 
  else if (activeHandle === 'bl') {
    cb.x += dx;
    cb.w -= dx;
    cb.h += dy;
    if (ratio) {
      cb.h = cb.w / ratio * imgRatio;
    }
  } 
  else if (activeHandle === 'br') {
    cb.w += dx;
    cb.h += dy;
    if (ratio) {
      cb.h = cb.w / ratio * imgRatio;
    }
  }
  else if (activeHandle === 't') {
    cb.y += dy;
    cb.h -= dy;
  }
  else if (activeHandle === 'b') {
    cb.h += dy;
  }
  else if (activeHandle === 'l') {
    cb.x += dx;
    cb.w -= dx;
  }
  else if (activeHandle === 'r') {
    cb.w += dx;
  }

  if (cb.w > 0.05 && cb.h > 0.05 && cb.x >= 0 && cb.y >= 0 && cb.x + cb.w <= 1.0 && cb.y + cb.h <= 1.0) {
    cropBox = cb;
  }
}

togglePreview.addEventListener('change', () => {
  isPreviewMode = togglePreview.checked;
  draw();
});

inputSaturation.addEventListener('input', (e) => {
  saturationValue = parseInt(e.target.value);
  satVal.innerText = `${saturationValue}%`;
  draw();
});

inputBrightness.addEventListener('input', (e) => {
  brightnessValue = parseInt(e.target.value);
  brightVal.innerText = `${brightnessValue}%`;
  draw();
});

btnResetAdjustments.addEventListener('click', () => {
  saturationValue = 100;
  brightnessValue = 100;
  inputSaturation.value = 100;
  inputBrightness.value = 100;
  satVal.innerText = '100%';
  brightVal.innerText = '100%';
  draw();
});

// Orientation State
let currentOrientation = 'landscape'; // 'landscape' or 'portrait'

const btnLandscape = document.getElementById('btnLandscape');
const btnPortrait = document.getElementById('btnPortrait');

function updateRatiosForOrientation() {
  const isPortrait = (currentOrientation === 'portrait');
  
  btnLandscape.classList.toggle('active', !isPortrait);
  btnPortrait.classList.toggle('active', isPortrait);
  
  const btn43 = document.getElementById('ratio43');
  btn43.dataset.ratio = isPortrait ? '0.75' : '1.333';
  btn43.querySelector('.ratio-label').innerText = isPortrait ? '3:4 (縦向き標準)' : '4:3 (標準画角)';
  btn43.querySelector('.ratio-sub').innerText = isPortrait ? '縦向き肖像画・キャンバス' : '古典的な油絵キャンバス比';
  
  const btn32 = document.getElementById('ratio32');
  btn32.dataset.ratio = isPortrait ? '0.667' : '1.5';
  btn32.querySelector('.ratio-label').innerText = isPortrait ? '2:3 (縦向き写真)' : '3:2 (写真標準)';
  btn32.querySelector('.ratio-sub').innerText = isPortrait ? '縦向き構図・ポートレート' : '絵画的風景画に最適';

  const btn169 = document.getElementById('ratio169');
  btn169.dataset.ratio = isPortrait ? '0.562' : '1.777';
  btn169.querySelector('.ratio-label').innerText = isPortrait ? '9:16 (モバイル)' : '16:9 (シネマ)';
  btn169.querySelector('.ratio-sub').innerText = isPortrait ? 'スマートフォン・縦長動画' : 'ダイナミックな映画風横長';

  const btnGolden = document.getElementById('ratioGolden');
  btnGolden.dataset.ratio = isPortrait ? '0.618' : '1.618';
  btnGolden.querySelector('.ratio-label').innerText = isPortrait ? '1:1.618 (縦黄金比)' : '1.618 (黄金長方形)';
  btnGolden.querySelector('.ratio-sub').innerText = isPortrait ? '美の調和・縦長キャンバス' : '最も調和する美の比率';

  // Update the active ratio value and crop box
  const activeBtn = document.querySelector('.btn-opt.active');
  if (activeBtn) {
    currentRatio = activeBtn.dataset.ratio;
    applyAspectRatio();
    draw();
  }
}

btnLandscape.addEventListener('click', () => {
  if (currentOrientation !== 'landscape') {
    currentOrientation = 'landscape';
    updateRatiosForOrientation();
  }
});

btnPortrait.addEventListener('click', () => {
  if (currentOrientation !== 'portrait') {
    currentOrientation = 'portrait';
    updateRatiosForOrientation();
  }
});

// Ratio selectors
document.querySelectorAll('.btn-opt').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('active'));
    const targetBtn = e.target.closest('.btn-opt');
    targetBtn.classList.add('active');
    
    currentRatio = targetBtn.dataset.ratio;
    applyAspectRatio();
    draw();
  });
});

// Guides selectors
document.querySelectorAll('.guide-item').forEach(item => {
  item.addEventListener('click', (e) => {
    document.querySelectorAll('.guide-item').forEach(i => i.classList.remove('active'));
    const targetItem = e.target.closest('.guide-item');
    targetItem.classList.add('active');
    
    activeGuide = targetItem.dataset.guide;
    
    if (activeGuide === 'golden_spiral') {
      spiralControls.classList.remove('hidden');
    } else {
      spiralControls.classList.add('hidden');
    }
    
    compositionInfo.innerHTML = guideDescriptions[activeGuide];
    draw();
  });
});

// Spiral directional control buttons
document.querySelectorAll('.btn-spiral-ctrl').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-spiral-ctrl').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    spiralDirection = parseInt(e.target.dataset.dir);
    draw();
  });
});

// EXPORT HIGH RES CROP
btnCrop.addEventListener('click', () => {
  if (!imgLoaded) return;
  
  const exportCanvas = document.createElement('canvas');
  const exCtx = exportCanvas.getContext('2d');
  
  const realX = cropBox.x * img.naturalWidth;
  const realY = cropBox.y * img.naturalHeight;
  const realW = cropBox.w * img.naturalWidth;
  const realH = cropBox.h * img.naturalHeight;
  
  exportCanvas.width = realW;
  exportCanvas.height = realH;
  
  // Apply saturation and brightness filters to exported image crop
  exCtx.filter = `saturate(${saturationValue}%) brightness(${brightnessValue}%)`;
  exCtx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);
  exCtx.filter = 'none';
  
  // Save
  const link = document.createElement('a');
  const dotIndex = originalFileName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalFileName.substring(0, dotIndex) : originalFileName;
  const ext = dotIndex !== -1 ? originalFileName.substring(dotIndex) : '.jpg';
  
  link.download = `${baseName}_cropped_composition${ext}`;
  link.href = exportCanvas.toDataURL('image/jpeg', 0.95);
  link.click();
});
