export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
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

    /* ========== HORIZONTAL GUIDE ========== */

    hRuler.addEventListener("mousedown", (e) => {
      e.preventDefault();

      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed;
        left: 15px;
        width: 100%;
        height: 17px;
        cursor: row-resize;
        pointer-events: auto;
        z-index: 999999999;
      `;

      const line = document.createElement("div");
      line.style.cssText = `
        position: absolute;
        top: 8px;
        left: 0;
        width: 100%;
        height: 1px;
        background: #ff0000ff;
        box-shadow:
          0 0 4px rgba(255, 0, 0, 0.8),
          0 0 8px rgba(255, 0, 0, 0.6);
      `;

      wrapper.appendChild(line);
      overlay.appendChild(wrapper);

      document.body.style.cursor = "row-resize";

      const move = (ev: MouseEvent) => {
        wrapper.style.top = `${ev.clientY - 8}px`; // 👈 GAP FIX
      };

      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        document.body.style.cursor = "";
      };

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up, { once: true });
    });

    /* ========== VERTICAL GUIDE ========= */
    vRuler.addEventListener("mousedown", (e) => {
      e.preventDefault();

      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed;
        top: 15px;
        height: 100%;
        width: 17px;
        cursor: col-resize;
        pointer-events: auto;
        z-index: 999999999;
      `;

      const line = document.createElement("div");
      line.style.cssText = `
        position: absolute;
        left: 8px;
        top: 0;
        height: 100%;
        width: 1px;
        background: #ff0000ff;
        box-shadow:
          0 0 4px rgba(255, 0, 0, 0.8),
          0 0 8px rgba(255, 0, 0, 0.6);
      `;

      wrapper.appendChild(line);
      overlay.appendChild(wrapper);

      document.body.style.cursor = "col-resize";

      const move = (ev: MouseEvent) => {
        wrapper.style.left = `${ev.clientX - 8}px`; // 👈 GAP FIX
      };

      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        document.body.style.cursor = "";
      };

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up, { once: true });
    });

    /* ================= MEASUREMENT MODE ================= */
    intersection.addEventListener("click", () => {
      measuring = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    document.addEventListener("mousedown", (e) => {
      if (!measuring) return;
      startX = e.clientX;
      startY = e.clientY;
    });

    document.addEventListener("mousemove", (e) => {
      if (!measuring) return;

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
      measuring = false;
    });

    /* ================= KEYS ================= */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Shift") shiftPressed = true;
      if (e.key === "Escape") ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "Shift") shiftPressed = false;
    });
  },
});
