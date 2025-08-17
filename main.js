<<<<<<< HEAD
/* Smart Cart – Frontend (rewritten) */

(function ($) {
  // ==== Config ====
  const API_ENDPOINT = "http://localhost:3000/detect";
  const CONFIDENCE_THRESHOLD = 0.5;
  const HISTORY_LENGTH = 10;
  const MIN_DETECTION_FRAMES = 3;

  // Colors and prices (deduped + stable keys)
  const PRODUCT_COLORS = {
    "WaiWai": "#FFD700",
    "Ariel": "#2ECC40",
    "Coke": "#FF4136",
    "Dettol": "#0074D9",
    "Hajmola Rasilo Candy": "#40100e",
    "Parachute Coconut Oil": "#0b429c",
    "Colgate": "#9c0b4c",
    "Horlicks": "#0b9c6e",
    "Ketchup": "#800311",
    "KitKat": "#b0515c",
    "Oreo": "#0b2d54",
    "Patanjali Dish Soap": "#23b067",
    "Colin": "#4c6ad4",
    "Thai Inhaler": "#128c2d",
    "Vaseline": "#d2d918"
  };

  const ITEM_PRICES = {
    "Coke": 100,
    "Dettol": 25,
    "WaiWai": 20,
    "Ariel": 520,                 // keep one canonical value
    "Hajmola Rasilo Candy": 2,
    "Parachute Coconut Oil": 250,
    "Colgate": 170,
    "Horlicks": 280,
    "Ketchup": 320,
    "KitKat": 20,
    "Oreo": 25,
    "Patanjali Dish Soap": 35,
    "Colin": 175,
    "Thai Inhaler": 315,
    "Vaseline": 205
  };

  // ==== State ====
  let detectedItems = {};
  let detectedItemPositions = {};
  let detectionHistory = [];
  let isProcessingFrame = false;
  let prevTime = null;
  let pastFrameTimes = [];
  let checkoutClicked = false;
  let lastUniquePredictions = null;

  // DOM refs
  const $video = $("#video");
  const videoEl = $video[0];
  const $videoSection = $(".video-section");

  // Canvas overlay
  let $canvas = null;
  let ctx = null;

  // ==== Boot ====
  $(init);

  async function init() {
    addReceiptStyles();
    const $status = createStatusIndicator();
    createInstructions();

    try {
      $status.text("Initializing camera...");
      const okCamera = await initializeCamera();
      if (!okCamera) {
        failStatus($status, "Camera initialization failed");
        return;
      }

      ensureCanvas();                 // create canvas now that video has metadata
      onResize();                     // size canvas to container

      $status.text("Connecting to detection server...");
      const okAPI = await testApiConnection();
      if (!okAPI) {
        failStatus($status, `Cannot connect to detection server at ${API_ENDPOINT}`);
        return;
      }

      $status.text("Starting detection...");
      setTimeout(() => {
        $status.css("background", "rgba(0,128,0,0.7)").text("Ready! Point camera at products");
        setTimeout(() => $status.fadeOut(800), 2500);
        requestAnimationFrame(captureAndSendFrame);
      }, 600);
    } catch (e) {
      console.error(e);
      alert("Initialization error: " + e.message);
=======
$(function () {
    // Remove the InferenceEngine initialization since we're using HTTP API now
    let detectedItems = {};
    let detectedItemPositions = {};
    let checkoutClicked = false;
    let prevTime = null;
    let pastFrameTimes = [];
    let detectionHistory = [];
    const historyLength = 10;
    const confidenceThreshold = 0.5;
    const minDetectionFrames = 3;
    const productColors = {
        "WaiWai": "#FFD700",
        "Ariel": "#2ECC40",
        "Coke": "#FF4136",
        "Dettol": "#0074D9",
        "Hajmola Rasilo Candy": "#40100e",
        "Ariel": "#25852f",
        "Parachute Coconut Oil": "#0b429c",
        "Colgate": "#9c0b4c",
        "Horlicks": "#0b9c6e",
        "Ketchup": "#800311",
        "KitKat": "#b0515c",
        "Oreo": "#0b2d54",
        "Patanjali Dish Soap": "#23b067",
        "Colin": "#4c6ad4",
        "Thai Inhaler": "#128c2d",
        "Vaseline": "#d2d918"
    };
    
    const video = document.getElementById('video');
    let canvas, ctx;
    let isProcessingFrame = false;
    const apiEndpoint = "https://smartcart-backend-3yr2.onrender.com/predict";
    
    async function initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            video.srcObject = stream;
            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Camera initialization error:', error);
            handleCameraError(error);
            return false;
        }
>>>>>>> ab1b448715f24fa55127b494e980e39ef65dfac3
    }

    // events
    $(window).on("resize", onResize);
    $("#checkoutButton").on("click", onCheckout);
  }

  // ==== Camera ====
  async function initializeCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      videoEl.srcObject = stream;
      await new Promise(res => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(res);
        };
      });
      return true;
    } catch (err) {
      console.error("Camera init error:", err);
      alert(err.name === "NotAllowedError"
        ? "Camera access denied. Please allow camera access to use Smart Cart."
        : `Camera error: ${err.message}`);
      return false;
    }
  }

  function ensureCanvas() {
    if ($canvas && $canvas.length) return;
    $canvas = $("<canvas/>", { id: "overlay-canvas" })
      .css({
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 20
      });
    $videoSection.css("position", "relative").append($canvas);
    ctx = $canvas[0].getContext("2d");
  }

  function onResize() {
    if (!$canvas) return;
    const containerW = $videoSection.width();
    const containerH = $videoSection.height();
    $canvas.attr({ width: containerW, height: containerH });

    // Re-render last known predictions after resize so boxes stay aligned
    if (lastUniquePredictions) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawPredictions(lastUniquePredictions);
      drawConnectionLines();
    }
  }

  // ==== Server connectivity ====
  async function testApiConnection() {
    try {
      const res = await fetch("http://localhost:3000/");
      return res.ok;
    } catch {
      return false;
    }
  }

  // ==== Detection loop ====
  function captureAndSendFrame() {
    if (checkoutClicked || isProcessingFrame || !videoEl.videoWidth) {
      requestAnimationFrame(captureAndSendFrame);
      return;
    }
    isProcessingFrame = true;

    // Grab a full-res frame that matches videoEl.videoWidth/Height
    const tCan = document.createElement("canvas");
    tCan.width = videoEl.videoWidth;
    tCan.height = videoEl.videoHeight;
    const tCtx = tCan.getContext("2d");
    tCtx.drawImage(videoEl, 0, 0, tCan.width, tCan.height);

    tCan.toBlob(async (blob) => {
      try {
        const fd = new FormData();
        fd.append("image", blob, "frame.jpg");
        const res = await fetch(API_ENDPOINT, { method: "POST", body: fd });
        if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        const json = await res.json();

        // Server returns Roboflow-like data: data.predictions[]
        const rawPreds = (json && json.data && Array.isArray(json.data.predictions))
          ? json.data.predictions : [];

        const formatted = rawPreds.map(p => ({
          class: p.class ?? p.label ?? "unknown",
          confidence: Number(p.confidence ?? p.score ?? 0),
          bbox: Array.isArray(p.bbox) ? p.bbox : [p.x - p.width/2, p.y - p.height/2, p.x + p.width/2, p.y + p.height/2] // fallback
        }));

        // Filter by confidence and run classwise NMS
        const { counts, predictionsByClass } = deduplicateDetections(formatted);

        // Update cart + positions
        updateHistory(counts);
        detectedItems = computeStableItems();
        updateItemPositions(predictionsByClass);
        renderCart();

        // Draw
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        lastUniquePredictions = predictionsByClass;
        drawPredictions(predictionsByClass);
        drawConnectionLines();

        // FPS
        updateFPS();

      } catch (err) {
        console.error("Detection error:", err);
      } finally {
        isProcessingFrame = false;
        requestAnimationFrame(captureAndSendFrame);
      }
    }, "image/jpeg", 0.8);
  }

  function updateFPS() {
    if (prevTime) {
      pastFrameTimes.push(Date.now() - prevTime);
      if (pastFrameTimes.length > 60) pastFrameTimes.shift();
      const totalSec = pastFrameTimes.reduce((a, t) => a + t / 1000, 0);
      const fps = totalSec > 0 ? (pastFrameTimes.length / totalSec) : 0;
      $("#fps").text(Math.round(fps));
    }
    prevTime = Date.now();
  }

  // ==== Dedupe / NMS ====
  function deduplicateDetections(predictions) {
    const byClass = {};
    for (const p of predictions) {
      if (p.confidence >= CONFIDENCE_THRESHOLD) {
        (byClass[p.class] ||= []).push(p);
      }
    }
    const out = {};
    for (const cls of Object.keys(byClass)) {
      out[cls] = nonMaxSuppression(byClass[cls]);
    }
    // counts per class
    const counts = {};
    for (const [cls, arr] of Object.entries(out)) counts[cls] = arr.length;
    return { counts, predictionsByClass: out };
  }

  function nonMaxSuppression(preds) {
    if (!preds.length) return [];
    const sorted = [...preds].sort((a, b) => b.confidence - a.confidence);
    const selected = [];
    for (const p of sorted) {
      let keep = true;
      for (const s of selected) {
        if (iouXYXY(p.bbox, s.bbox) > 0.5) { keep = false; break; }
      }
      if (keep) selected.push(p);
    }
    return selected;
  }

  function iouXYXY(a, b) {
    const [ax1, ay1, ax2, ay2] = a;
    const [bx1, by1, bx2, by2] = b;
    const x1 = Math.max(ax1, bx1);
    const y1 = Math.max(ay1, by1);
    const x2 = Math.min(ax2, bx2);
    const y2 = Math.min(ay2, by2);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const areaA = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
    const areaB = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);
    const denom = areaA + areaB - inter;
    return denom > 0 ? inter / denom : 0;
  }

  // ==== Cart stability ====
  function updateHistory(frameCounts) {
    detectionHistory.push(frameCounts);
    if (detectionHistory.length > HISTORY_LENGTH) detectionHistory.shift();
  }

  function computeStableItems() {
    // count frames where an item appears at any quantity
    const framePresence = {};
    for (const fc of detectionHistory) {
      for (const [item, count] of Object.entries(fc)) {
        framePresence[item] = (framePresence[item] || 0) + 1;
      }
    }
    const stable = {};
    for (const [item, frames] of Object.entries(framePresence)) {
      if (frames >= MIN_DETECTION_FRAMES) {
        // choose most common quantity across history
        const buckets = {};
        for (const fc of detectionHistory) {
          if (fc[item]) buckets[fc[item]] = (buckets[fc[item]] || 0) + 1;
        }
        let bestQ = 0, bestC = -1;
        for (const [q, c] of Object.entries(buckets)) {
          const ci = Number(c), qi = Number(q);
          if (ci > bestC) { bestC = ci; bestQ = qi; }
        }
        stable[item] = bestQ;
      }
    }
    return stable;
  }

  // ==== Positions (for lines/labels) ====
  function updateItemPositions(predictionsByClass) {
    detectedItemPositions = {};
    const scaleX = ctx.canvas.width / videoEl.videoWidth;
    const scaleY = ctx.canvas.height / videoEl.videoHeight;

    for (const [cls, arr] of Object.entries(predictionsByClass)) {
      if (!arr.length) continue;
      const p = arr[0];
      const [x1, y1, x2, y2] = p.bbox;
      const cx = ((x1 + x2) / 2) * scaleX;
      const cy = ((y1 + y2) / 2) * scaleY;
      detectedItemPositions[cls] = { x: cx, y: cy, confidence: p.confidence };
    }
  }

  // ==== Rendering ====
  function drawPredictions(predictionsByClass) {
    const scaleX = ctx.canvas.width / videoEl.videoWidth;
    const scaleY = ctx.canvas.height / videoEl.videoHeight;

    for (const [cls, arr] of Object.entries(predictionsByClass)) {
      const color = PRODUCT_COLORS[cls] || "#6B7BF7";
      for (const p of arr) {
        const [x1, y1, x2, y2] = p.bbox;
        const x = x1 * scaleX;
        const y = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        // 1) Bounding box
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, w, h);

        // 2) Label background
        const label = `${cls} (${(p.confidence * 100).toFixed(0)}%)`;
        ctx.font = "16px sans-serif";
        const pad = 6;
        const labelW = ctx.measureText(label).width + pad * 2;
        const labelH = 22;
        const lx = x;
        const ly = Math.max(0, y - labelH - 2);

        ctx.fillStyle = color;
        ctx.fillRect(lx, ly, labelW, labelH);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, lx + pad, ly + labelH - 6);

        // 3) Center marker with initial
        const cx = x + w / 2;
        const cy = y + h / 2;
        drawItemIdentifier(cx, cy, cls, color);

        ctx.restore();
      }
    }
  }

  function drawItemIdentifier(x, y, cls, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cls.charAt(0), x, y);
    ctx.restore();
  }

  function drawConnectionLines() {
    if (checkoutClicked) return;
    const sidebar = $("#detection-sidebar");
    if (!sidebar.length) return;

    const videoRect = $videoSection[0].getBoundingClientRect();

    for (const [item, pos] of Object.entries(detectedItemPositions)) {
      const sel = `#sidebar-item-${item.replace(/\s+/g, "-").toLowerCase()}`;
      const $it = $(sel);
      if (!$it.length) continue;

      const r = $it[0].getBoundingClientRect();
      const startX = r.right - videoRect.left;
      const startY = (r.top + r.bottom) / 2 - videoRect.top;
      const endX = pos.x;
      const endY = pos.y;
      const color = PRODUCT_COLORS[item] || "#6B7BF7";

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // arrow at mid
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const ang = Math.atan2(endY - startY, endX - startX);
      const hl = 10;
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX - hl * Math.cos(ang - Math.PI / 6),
        midY - hl * Math.sin(ang - Math.PI / 6)
      );
      ctx.lineTo(
        midX - hl * Math.cos(ang + Math.PI / 6),
        midY - hl * Math.sin(ang + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
  }

  // ==== Cart / UI ====
  function renderCart() {
    if (checkoutClicked) return;
    const $list = $("#detections");
    let html = "";
    let total = 0;

    for (const [item, count] of Object.entries(detectedItems)) {
      const price = (ITEM_PRICES[item] || 0) * count;
      total += price;
      const color = PRODUCT_COLORS[item] || "#6B7BF7";
      html += `
        <div class="cart-item" data-item="${item}" style="border-left:4px solid ${color};">
          <span class="item-name">${item} × ${count}</span>
          <span class="item-price">Rs. ${price}</span>
        </div>`;
    }
    if (total > 0) {
      html += `
        <div class="cart-item total">
          <span>Total</span>
          <span>Rs. ${total}</span>
        </div>`;
    }
    $list.html(html);
  }

  function onCheckout() {
    if (Object.keys(detectedItems).length === 0) {
      alert("No items detected in cart!");
      return;
    }
    checkoutClicked = true;
    const $btn = $("#checkoutButton");
    $btn.prop("disabled", true).html('<i class="fas fa-spinner fa-spin"></i> Processing...');
    $("#detection-sidebar").fadeOut();

    let total = 0;
    for (const [item, count] of Object.entries(detectedItems)) {
      total += (ITEM_PRICES[item] || 0) * count;
    }

    setTimeout(() => {
      const $receipt = createReceiptModal(detectedItems, total);
      $receipt.find("#confirmReceipt").on("click", () => {
        $receipt.fadeOut(300, () => {
          $receipt.remove();
          showQRCodeScreen(total * 1.13);
        });
      });
    }, 800);
  }

  function createStatusIndicator() {
    const $el = $('<div id="detectionStatus" style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.7);color:#fff;padding:6px 10px;border-radius:6px;z-index:30">Initializing...</div>');
    $videoSection.append($el);
    return $el;
  }
  function failStatus($el, msg) {
    $el.css("background", "rgba(255,0,0,0.7)").text(msg);
  }

  function createInstructions() {
    const $el = $(`
      <div id="instructions" style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:10px 14px;border-radius:6px;text-align:center;font-size:14px;z-index:25;max-width:80%">
        <p style="margin:0 0 4px 0;"><b>How to use:</b> Point camera at products to detect them</p>
        <p style="margin:0;">Live boxes and labels show detected items</p>
        <button id="hideInstructions" style="background:#555;border:none;color:white;padding:4px 10px;border-radius:4px;margin-top:8px;cursor:pointer">Got it</button>
      </div>`);
    $videoSection.append($el);
    $("#hideInstructions").on("click", function(){ $(this).parent().fadeOut(); });
  }

  function addReceiptStyles() {
    const css = `
      @media print {
        body * { visibility: hidden; }
        #receiptModal, #receiptModal * { visibility: visible; }
        #receiptModal { position: absolute; left:0; top:0; width:100%; }
        #receiptModal .receipt-actions { display: none !important; }
      }
      @keyframes fadeIn { from {opacity:0; transform: translateY(20px);} to {opacity:1; transform:none;} }
      #receiptModal .receipt-content, #qrCodeScreen { animation: fadeIn .5s ease-out; }`;
    $("head").append($("<style/>").text(css));
  }

  // ====== Receipt + QR (same UX, cleaned) ======
  function createReceiptModal(items, total) {
    const $modal = $(`
      <div id="receiptModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:2000">
        <div class="receipt-content" style="background:#fff;width:90%;max-width:420px;border-radius:10px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,.2)">
          <div class="receipt-header" style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:12px;margin-bottom:12px">
            <h2 style="margin:0;color:#333;">किराना Cart</h2>
            <p style="margin:5px 0;color:#666;">Receipt</p>
            <p style="margin:5px 0;font-size:12px;color:#888;">${new Date().toLocaleString()}</p>
          </div>
          <div class="receipt-items" style="margin-bottom:12px;border-bottom:1px dashed #ccc;padding-bottom:12px">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="border-bottom:1px solid #eee;">
                  <th style="text-align:left;padding:5px 0;">Item</th>
                  <th style="text-align:center;padding:5px 0;">Qty</th>
                  <th style="text-align:right;padding:5px 0;">Price</th>
                  <th style="text-align:right;padding:5px 0;">Subtotal</th>
                </tr>
              </thead>
              <tbody id="receiptItems"></tbody>
            </table>
          </div>
          <div class="receipt-total" style="text-align:right;margin-bottom:18px;padding-bottom:12px;border-bottom:2px dashed #ccc">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Subtotal:</span><span>Rs. ${total}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Tax (13%):</span><span>Rs. ${(total*0.13).toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.1em"><span>TOTAL:</span><span>Rs. ${(total*1.13).toFixed(2)}</span></div>
          </div>
          <div class="receipt-actions" style="display:flex;justify-content:center">
            <button id="confirmReceipt" style="background:#4CAF50;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:16px;cursor:pointer">Confirm & Pay</button>
          </div>
        </div>
      </div>`);
    const $tbody = $modal.find("#receiptItems");
    for (const [item, qty] of Object.entries(items)) {
      const price = ITEM_PRICES[item] || 0;
      const sub = price * qty;
      $tbody.append(`
        <tr style="border-bottom:1px solid #f8f8f8">
          <td style="padding:8px 0">${item}</td>
          <td style="text-align:center;padding:8px 0">${qty}</td>
          <td style="text-align:right;padding:8px 0">Rs. ${price}</td>
          <td style="text-align:right;padding:8px 0">Rs. ${sub}</td>
        </tr>`);
    }
    $("body").append($modal);
    return $modal;
  }

  function showQRCodeScreen(amount) {
    const txId = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const $qr = $(`
      <div id="qrCodeScreen" style="position:fixed;inset:0;background:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:3000;text-align:center">
        <h2 style="margin:0 0 16px;color:#333">Scan to Pay</h2>
        <p style="margin:0 0 24px;color:#666">Amount: Rs. ${amount.toFixed(2)}</p>
        <div id="qrcode" style="background:#fff;padding:20px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,.1);margin-bottom:24px">
          <!-- placeholder QR svg -->
          <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect x="0" y="0" width="200" height="200" fill="#FFFFFF"/>
            <g transform="scale(4)">
              <rect x="0" y="0" width="50" height="50" fill="#FFFFFF"/>
              <rect x="0" y="0" width="7" height="7" fill="#000000"/>
              <rect x="1" y="1" width="5" height="5" fill="#FFFFFF"/>
              <rect x="2" y="2" width="3" height="3" fill="#000000"/>
              <rect x="43" y="0" width="7" height="7" fill="#000000"/>
              <rect x="44" y="1" width="5" height="5" fill="#FFFFFF"/>
              <rect x="45" y="2" width="3" height="3" fill="#000000"/>
              <rect x="0" y="43" width="7" height="7" fill="#000000"/>
              <rect x="1" y="44" width="5" height="5" fill="#FFFFFF"/>
              <rect x="2" y="45" width="3" height="3" fill="#000000"/>
              <rect x="10" y="10" width="2" height="2" fill="#000000"/>
              <rect x="14" y="10" width="2" height="2" fill="#000000"/>
              <rect x="18" y="12" width="2" height="2" fill="#000000"/>
              <rect x="22" y="8" width="2" height="2" fill="#000000"/>
              <rect x="26" y="15" width="2" height="2" fill="#000000"/>
              <rect x="30" y="20" width="2" height="2" fill="#000000"/>
              <rect x="34" y="25" width="2" height="2" fill="#000000"/>
              <rect x="38" y="30" width="2" height="2" fill="#000000"/>
              <rect x="10" y="35" width="2" height="2" fill="#000000"/>
              <rect x="15" y="40" width="2" height="2" fill="#000000"/>
              <rect x="20" y="30" width="2" height="2" fill="#000000"/>
              <rect x="25" y="25" width="2" height="2" fill="#000000"/>
              <rect x="30" y="35" width="2" height="2" fill="#000000"/>
            </g>
          </svg>
        </div>
        <p style="margin:0 0 8px;color:#888">Transaction ID: ${txId}</p>
        <button id="completePayment" style="background:#4CAF50;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:16px;cursor:pointer;margin-top:16px">Complete Payment</button>
      </div>`);
    $("body").append($qr);
    $qr.find("#completePayment").on("click", () => {
      $qr.fadeOut(300, () => {
        $qr.remove();
        const $ty = $(`
          <div style="position:fixed;inset:0;background:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:3000;text-align:center">
            <h1 style="color:#4CAF50;margin-bottom:16px">Thank You!</h1>
            <p style="font-size:18px;margin-bottom:24px">Your payment has been processed successfully.</p>
            <div style="margin-bottom:24px">
              <svg width="80" height="80" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="11" fill="#4CAF50"/>
                <path d="M7 13l3 3 7-7" stroke="#fff" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <p style="color:#666;margin-bottom:24px">Receipt has been sent to your email.</p>
            <button id="returnToShopping" style="background:#2196F3;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:16px;cursor:pointer">Return to Shopping</button>
          </div>`);
        $("body").append($ty);
        $ty.find("#returnToShopping").on("click", () => window.location.reload());
      });
    });
<<<<<<< HEAD
  }

})(jQuery);

=======
    
    function createStatusIndicator() {
        const statusDiv = $('<div id="detectionStatus" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 5px; z-index: 1000;">Initializing...</div>');
        $(".video-section").append(statusDiv);
        return statusDiv;
    }
    
    function createInstructions() {
        const instructions = $(`
            <div id="instructions" style="
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                text-align: center;
                font-size: 14px;
                z-index: 90;
                max-width: 80%;
            ">
                <p style="margin: 0 0 5px 0;"><b>How to use:</b> Point camera at products to detect them</p>
                <p style="margin: 0;">Item locations shown on left sidebar with directional indicators</p>
                <button id="hideInstructions" style="
                    background: #555;
                    border: none;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 3px;
                    margin-top: 8px;
                    cursor: pointer;
                ">Got it</button>
            </div>
        `);
        
        $(".video-section").append(instructions);
        
        $("#hideInstructions").click(function() {
            $(this).parent().fadeOut();
        });
    }
    
    // Add styling for the receipt
    function addReceiptStyles() {
        const receiptStyles = $(`
            <style>
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #receiptModal, #receiptModal * {
                        visibility: visible;
                    }
                    #receiptModal {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    #receiptModal .receipt-actions {
                        display: none !important;
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                #receiptModal .receipt-content {
                    animation: fadeIn 0.5s ease-out;
                }
                
                #qrCodeScreen {
                    animation: fadeIn 0.5s ease-out;
                }
            </style>
        `);
        
        $("head").append(receiptStyles);
    }
    
    // Test connection to API server
    async function testApiConnection() {
        try {
            const response = await fetch(apiEndpoint.replace('/predict', '/'));
            if (!response.ok) {
                throw new Error(`API server not responding: ${response.status}`);
            }
            return true;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
    
    async function initialize() {
        const statusIndicator = createStatusIndicator();
        
        // Add receipt styles
        addReceiptStyles();
        
        try {
            statusIndicator.text("Initializing camera...");
            const cameraInitialized = await initializeCamera();
            
            if (!cameraInitialized) {
                statusIndicator.css("background", "rgba(255,0,0,0.7)").text("Camera initialization failed");
                return;
            }
            
            statusIndicator.text("Connecting to detection server...");
            const apiConnected = await testApiConnection();
            
            if (!apiConnected) {
                statusIndicator.css("background", "rgba(255,0,0,0.7)")
                    .text("Cannot connect to detection server at " + apiEndpoint);
                return;
            }
            
            statusIndicator.text("Starting detection...");
            resizeCanvas();
            
            createInstructions();
            
            setTimeout(() => {
                statusIndicator.css("background", "rgba(0,128,0,0.7)").text("Ready! Point camera at products");
                setTimeout(() => {
                    statusIndicator.fadeOut(1000);
                }, 3000);
                captureAndSendFrame();
            }, 1000);
        } catch (error) {
            console.error('Initialization error:', error);
            statusIndicator.css("background", "rgba(255,0,0,0.7)").text("Error: " + error.message);
        }
    }
    
    initialize().catch(error => {
        console.error('Global initialization error:', error);
        alert("Failed to initialize application: " + error.message);
    });
    
    $(window).resize(function() {
        resizeCanvas();
    });
});
>>>>>>> ab1b448715f24fa55127b494e980e39ef65dfac3
