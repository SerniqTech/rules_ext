export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
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
      left: 0;
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
      top: 0;
      left: 0;
      width: 15px;
      height: 100%;
      background: white;
      border-right: 1px solid black;
      z-index: 1000000002;
      pointer-events: auto;
    `;

const PX_PER_INCH = 100; // 1 inch = 15px
const HALF_INCH = 50

/* ===== TICKS ===== */
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

  for (let i = 0; i < window.innerWidth; i += 10) {
    const tick = document.createElement("div");

    let width = 5;
    
    if (i % PX_PER_INCH === 0) {
      width = 15; // full inch
    } else if (i % HALF_INCH === 0) {
      width = 8; // half inch
    }

    tick.style.cssText = `
      position: absolute;
      bottom: ${i}px;
      right: 0;
      height: 1px;
      width: ${width}px;
      background: #000;
    `;

    vRuler.appendChild(tick);
  }

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

    overlay.append(hRuler, vRuler, intersection);

    /* ================= CANVAS ================= */
    const canvas = document.createElement("canvas");
    canvas.style.pointerEvents = "none";
    overlay.appendChild(canvas);

    const ctx = canvas.getContext("2d")!;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    type GuideOrientation = "horizontal" | "vertical";

    const startGuideDrag = (
      wrapper: HTMLDivElement,
      orientation: GuideOrientation,
      startEvent: MouseEvent,
      fixedOffset?: number,
    ) => {
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
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up, { once: true });
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
    hRuler.addEventListener("mousedown", (e) => {
      const wrapper = createGuide("horizontal");
      overlay.appendChild(wrapper);
      startGuideDrag(wrapper, "horizontal", e, 8); 
    });

    /* ========== VERTICAL GUIDE ========= */
    vRuler.addEventListener("mousedown", (e) => {
      const wrapper = createGuide("vertical");
      overlay.appendChild(wrapper);
      startGuideDrag(wrapper, "vertical", e, 8); 
    });

    /* ================= MEASUREMENT MODE ================= */
    const setMeasurementUi = () => {
      intersection.style.background = measurementMode ? "#ffebee" : "white";
      intersection.style.borderColor = measurementMode ? "#ff0000" : "black";
      document.body.style.cursor = measurementMode ? "crosshair" : "";
    };

    intersection.addEventListener("click", () => {
      measurementMode = !measurementMode;
      if (!measurementMode) {
        measuring = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setMeasurementUi();
    });

    document.addEventListener("mousedown", (e) => {
      if (!measurementMode) return;
      measuring = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    document.addEventListener("mousemove", (e) => {
      if (!measurementMode || !measuring) return;

      let x = e.clientX;
      let y = e.clientY;

      if (shiftPressed) {
        Math.abs(x - startX) > Math.abs(y - startY)
          ? (y = startY)
          : (x = startX);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#ff0000ff";
      ctx.lineWidth = 1;
      ctx.stroke();

      const dist = Math.hypot(x - startX, y - startY).toFixed(0);
      ctx.fillStyle = "#ff0000ff";
      ctx.fillText(`${dist}px`, x + 6, y - 6);
    });

    document.addEventListener("mouseup", () => {
      if (!measurementMode) return;
      measuring = false;
    });

    /* ================= KEYS ================= */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Shift") shiftPressed = true;
      if (e.key === "Escape") {
        measurementMode = false;
        measuring = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setMeasurementUi();
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "Shift") shiftPressed = false;
    });

    // Ensure UI reflects default state when script loads
    setMeasurementUi();
  },
});
 