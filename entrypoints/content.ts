export default defineContentScript({
  registration:'runtime',
  main() {
    // If the content script already ran, a second click should clean it up.
    if ((window as any).__gridRulerCleanup) {
      (window as any).__gridRulerCleanup();
      return;
    }

    const cleanupFns: Array<() => void> = [];
    type ListenerTarget = Document | Window | HTMLElement;
    const on = <E extends Event>(
      target: ListenerTarget,
      type: string,
      handler: (ev: E) => void,
      options?: boolean | AddEventListenerOptions,
    ) => {
      const listener = handler as EventListener;
      target.addEventListener(type, listener, options);
      cleanupFns.push(() => target.removeEventListener(type, listener, options));
    };

    let measurementMode = false;
    let measuring = false;
    let shiftPressed = false;
    let startX = 0;
    let startY = 0;

    /* ================= OVERLAY ================= */
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999998;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);

    /* ================= RULERS ================= */

    const hRuler = document.createElement("div");
    hRuler.style.cssText = `
      position: fixed;
      top: 0;
      left: 15px;
      height: 15px;
      width: 100%;
      background: white;
      border-bottom: 1px solid black;
      z-index: 1000000002;
      pointer-events: auto;
    `;

    const vRuler = document.createElement("div");
    vRuler.style.cssText = `
      position: fixed;
      top: 15px;
      left: 0;
      width: 15px;
      height: 100%;
      background: white;
      border-right: 1px solid black;
      z-index: 1000000002;
      pointer-events: auto;
    `;

const PX_PER_INCH = 100;
const HALF_INCH = 50

    /* ===== TICKS ===== */

    function updateHorizontalRuler() {
      hRuler.innerHTML = '';
      for (let i = 0; i < window.innerWidth; i += 10) {
        const tick = document.createElement("div");

        let height = 5;

        if (i % PX_PER_INCH === 0) {
          height = 15; // full inch
        } else if (i % HALF_INCH === 0) {
          height = 8; // half inch
        }

        tick.style.cssText = `
        position: absolute;
        left: ${i}px;
        bottom: 0;
        width: 1px;
        height: ${height}px;
        background: #000;
      `;

        hRuler.appendChild(tick);
      }
    }

    function updateVerticalRuler() {
      vRuler.innerHTML = '';
      for (let i = 0; i < window.innerHeight; i += 10) {
        const tick = document.createElement("div");

        let width = 5;

        if (i % PX_PER_INCH === 0) {
          width = 15; // full inch
        } else if (i % HALF_INCH === 0) {
          width = 8; // half inch
        }

        tick.style.cssText = `
        position: absolute;
        top: ${i}px;
        right: 0;
        height: 1px;
        width: ${width}px;
        background: #000;
      `;

        vRuler.appendChild(tick);
      }
    }
    
    function updateRuler(){
      updateHorizontalRuler();
      updateVerticalRuler();
    }

    updateRuler()

    on(window,"resize",updateRuler)


    const intersection = document.createElement("div");
    intersection.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 15px;
      height: 15px;
      background: white;
      border-right: 1px solid black;
      border-bottom: 1px solid black;
      z-index: 1000000003;
      cursor: crosshair;
      pointer-events: auto;
    `;
    intersection.title = "Click here to switch measurement mode"

    overlay.append(hRuler, vRuler, intersection);

    /* ================= CANVAS ================= */
    const canvas = document.createElement("canvas");
    canvas.style.pointerEvents = "none";
    overlay.appendChild(canvas);

    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    on(window, "resize", resizeCanvas);

    type GuideOrientation = "horizontal" | "vertical";

    const startGuideDrag = (
      wrapper: HTMLDivElement,
      orientation: GuideOrientation,
      startEvent: MouseEvent,
      fixedOffset?: number,
    ) => {
      if (measurementMode) return;
      startEvent.preventDefault();
      startEvent.stopPropagation();

      const cursor = orientation === "horizontal" ? "row-resize" : "col-resize";
      const offset =
        fixedOffset ??
        (orientation === "horizontal"
          ? startEvent.clientY - wrapper.getBoundingClientRect().top
          : startEvent.clientX - wrapper.getBoundingClientRect().left);

      const applyPosition = (ev: MouseEvent) => {
        if (orientation === "horizontal") {
          wrapper.style.top = `${ev.clientY - offset}px`;
        } else {
          wrapper.style.left = `${ev.clientX - offset}px`;
        }
      };

      applyPosition(startEvent);

      const move = (ev: MouseEvent) => applyPosition(ev);
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.body.style.cursor = "";
      };

      document.body.style.cursor = cursor;
      on(document, "mousemove", move);
      on(document, "mouseup", up, { once: true });
    };

    const createGuide = (orientation: GuideOrientation) => {
      const wrapper = document.createElement("div");
      const isHorizontal = orientation === "horizontal";

      wrapper.style.cssText = `
        position: fixed;
        ${isHorizontal ? "left: 15px; width: 100%; height: 17px;" : "top: 15px; height: 100%; width: 17px;"}
        cursor: ${isHorizontal ? "row-resize" : "col-resize"};
        pointer-events: auto;
        z-index: 999999999;
      `;

      const line = document.createElement("div");
      line.style.cssText = `
        position: absolute;
        ${isHorizontal ? "top: 8px; left: 0; width: 100%; height: 1px;" : "left: 8px; top: 0; height: 100%; width: 1px;"}
        background: #ff0000ff;
        box-shadow:
          0 0 4px rgba(255, 0, 0, 0.8),
          0 0 8px rgba(255, 0, 0, 0.6);
      `;

      wrapper.appendChild(line);
      wrapper.addEventListener("mousedown", (ev) => startGuideDrag(wrapper, orientation, ev));

      return wrapper;
    };

    /* ========== HORIZONTAL GUIDE ========== */
    on<MouseEvent>(hRuler, "mousedown", (e) => {
      if (measurementMode) return;
      const wrapper = createGuide("horizontal");
      overlay.appendChild(wrapper);
      startGuideDrag(wrapper, "horizontal", e, 8); 
    });

    /* ========== VERTICAL GUIDE ========= */
    on<MouseEvent>(vRuler, "mousedown", (e) => {
      if (measurementMode) return;
      const wrapper = createGuide("vertical");
      overlay.appendChild(wrapper);
      startGuideDrag(wrapper, "vertical", e, 8); 
    });

    /* ================= MEASUREMENT MODE ================= */
    const setMeasurementUi = () => {
      intersection.style.background = measurementMode ? "#ff0000ff" : "white";
      intersection.style.borderColor = measurementMode ? "#ff0000ff" : "black";
      document.body.style.cursor = measurementMode ? "pointer !important" : "";
    };

    on<MouseEvent>(intersection, "click", () => {
      measurementMode = !measurementMode;
      if (!measurementMode) {
        measuring = false;
        document.body.style.userSelect = 'all'
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      document.body.style.userSelect = 'none'
      setMeasurementUi();
    });

    on<MouseEvent>(document, "mousedown", (e) => {
      if (!measurementMode) return;
      measuring = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    on<MouseEvent>(document, "mousemove", (e) => {
      if (!measurementMode || !measuring) return;

      let x = e.clientX;
      let y = e.clientY;

      if (shiftPressed) {
        Math.abs(x - startX) > Math.abs(y - startY)
          ? (y = startY)
          : (x = startX);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the main measurement line in turquoise
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#ff0000ff"; 
      ctx.lineWidth = 1.5;
      ctx.stroke();

      
      const bracketLength = 8; 
      const dx = x - startX;
      const dy = y - startY;
      const lineLength = Math.hypot(dx, dy);
      
      if (lineLength > 0) {
        
        const perpX = -dy / lineLength;
        const perpY = dx / lineLength;
        const halfBracket = bracketLength / 2;
        
        ctx.beginPath();
        
        ctx.moveTo(startX + perpX * halfBracket, startY + perpY * halfBracket);
        ctx.lineTo(startX - perpX * halfBracket, startY - perpY * halfBracket);
        
        ctx.moveTo(x + perpX * halfBracket, y + perpY * halfBracket);
        ctx.lineTo(x - perpX * halfBracket, y - perpY * halfBracket);
        ctx.stroke();
      }

      // Calculate distance and prepare text
      const dist = Math.hypot(x - startX, y - startY).toFixed(0);
      const text = `${dist}px`;
      
      // Measure text for background sizing
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = 16; // Approximate text height
      const padding = 6;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = textHeight + padding * 2;
      
      // Position text box above the end point
      const boxX = x - boxWidth / 2; 
      const boxY = y - boxHeight - 12; 
      const borderRadius = 4;
      
      // Draw white rounded rectangle background - ensure fully opaque
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgb(255, 255, 255)";
      ctx.beginPath();
      // Manually create rounded rectangle path to ensure proper filling
      const rectX = boxX;
      const rectY = boxY;
      const rectW = boxWidth;
      const rectH = boxHeight;
      const rectR = borderRadius;
      ctx.moveTo(rectX + rectR, rectY);
      ctx.lineTo(rectX + rectW - rectR, rectY);
      ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + rectR);
      ctx.lineTo(rectX + rectW, rectY + rectH - rectR);
      ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - rectR, rectY + rectH);
      ctx.lineTo(rectX + rectR, rectY + rectH);
      ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - rectR);
      ctx.lineTo(rectX, rectY + rectR);
      ctx.quadraticCurveTo(rectX, rectY, rectX + rectR, rectY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      // Draw black text
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillText(text, boxX + padding, boxY + textHeight + padding / 2);
      ctx.restore();
    });

    on<MouseEvent>(document, "mouseup", () => {
      if (!measurementMode) return;
      measuring = false;
    });

    /* ================= KEYS ================= */
    on<KeyboardEvent>(document, "keydown", (e) => {
      if (e.key === "Shift") shiftPressed = true;
      if (e.key === "Escape") {
        measurementMode = false;
        measuring = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setMeasurementUi();
      }
    });

    on<KeyboardEvent>(document, "keyup", (e) => {
      if (e.key === "Shift") shiftPressed = false;
    });

    // Ensure UI reflects default state when script loads
    setMeasurementUi();

    (window as any).__gridRulerCleanup = () => {
      cleanupFns.forEach((fn) => fn());
      overlay.remove();
      document.body.style.cursor = "";
      delete (window as any).__gridRulerCleanup;
    };
  },
});
 