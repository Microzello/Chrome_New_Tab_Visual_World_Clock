import { formatClock, formatShift, localTimeZone, wallClock } from "./time.js";

const NEAR = 18;
const FAR = 260;
const MAX_MINUTES = 720;
const SNAP_MINUTES = 6;
const WHEEL_MINUTES_PER_PX = 0.15;
const KEY_MINUTES = 15;

const KEY_DIRECTION = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };

const smooth = (t) => t * t * (3 - 2 * t);

function distanceToRect(r, x, y) {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

export function createDock({ onShift, onEdit }) {
  const dock = document.getElementById("dock");
  const scrub = document.getElementById("scrub");
  const slider = document.getElementById("slider");
  const fill = document.getElementById("scrub-fill");
  const readout = document.getElementById("readout");
  const readoutShift = readout.querySelector(".shift");
  const readoutTime = readout.querySelector(".when");
  const edit = document.getElementById("edit-button");
  const parts = [scrub, edit];

  let pointer = null;
  let dragging = false;
  let minutes = 0;
  let frame = 0;
  let wheelAccum = 0;

  function applyVisibility() {
    frame = 0;
    const active = document.activeElement;
    const focusInside = !!active && dock.contains(active) && active.matches(":focus-visible");
    let scrubOpacity = 0;
    for (const el of parts) {
      let o = 0;
      if (pointer) {
        const d = distanceToRect(el.getBoundingClientRect(), pointer.x, pointer.y);
        o = 1 - smooth(Math.min(1, Math.max(0, (d - NEAR) / (FAR - NEAR))));
      }
      if (dragging || focusInside) o = 1;
      el.style.opacity = o.toFixed(3);
      el.classList.toggle("is-hidden", o < 0.04);
      if (el === scrub) scrubOpacity = o;
    }
    const readoutOpacity = Math.max(scrubOpacity, minutes ? 0.92 : 0);
    readout.style.opacity = readoutOpacity.toFixed(3);
    readout.classList.toggle("is-hidden", readoutOpacity < 0.04);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(applyVisibility);
  }

  function paintFill() {
    const pct = (v) => ((v + MAX_MINUTES) / (2 * MAX_MINUTES)) * 100;
    fill.style.left = `${Math.min(pct(0), pct(minutes))}%`;
    fill.style.width = `${Math.abs(pct(minutes) - pct(0))}%`;
    dock.classList.toggle("is-shifted", minutes !== 0);
    readout.classList.toggle("is-shifted", minutes !== 0);
  }

  function setMinutes(next) {
    next = Math.max(-MAX_MINUTES, Math.min(MAX_MINUTES, Math.round(next)));
    slider.value = String(next);
    if (next === minutes) return;
    minutes = next;
    paintFill();
    schedule();
    onShift(minutes);
  }

  document.addEventListener(
    "pointermove",
    (e) => {
      pointer = { x: e.clientX, y: e.clientY };
      schedule();
    },
    { passive: true }
  );
  const leave = () => {
    pointer = null;
    schedule();
  };
  document.documentElement.addEventListener("mouseleave", leave);
  window.addEventListener("blur", leave);
  dock.addEventListener("focusin", schedule);
  dock.addEventListener("focusout", () => setTimeout(schedule));

  slider.addEventListener("input", () => {
    const value = +slider.value;
    setMinutes(Math.abs(value) <= SNAP_MINUTES ? 0 : value);
  });
  slider.addEventListener("keydown", (e) => {
    const dir = KEY_DIRECTION[e.key];
    if (!dir) return;
    e.preventDefault();
    setMinutes(minutes + dir * (e.shiftKey ? 60 : KEY_MINUTES));
  });
  slider.addEventListener("pointerdown", () => {
    dragging = true;
    schedule();
  });
  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    schedule();
  });
  slider.addEventListener("dblclick", () => setMinutes(0));
  readout.addEventListener("click", () => setMinutes(0));
  edit.addEventListener("click", () => onEdit());

  dock.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      wheelAccum += (e.deltaMode === 1 ? delta * 40 : delta) * WHEEL_MINUTES_PER_PX;
      const whole = Math.trunc(wheelAccum);
      if (whole) {
        wheelAccum -= whole;
        setMinutes(minutes + whole);
      }
    },
    { passive: false }
  );

  paintFill();
  applyVisibility();

  return {
    get minutes() {
      return minutes;
    },
    reset() {
      setMinutes(0);
    },
    refresh() {
      schedule();
    },
    setTime(ms, twelve) {
      const wall = wallClock(localTimeZone, ms);
      const { time, period } = formatClock(wall.hour, wall.minute, twelve);
      readoutShift.textContent = formatShift(minutes);
      readoutTime.textContent = `${wall.weekday} ${time}${period ? ` ${period}` : ""}`;
      readout.title = minutes ? "Back to now" : "";
    },
  };
}
