const input = document.getElementById("birthdate");
const stats = document.getElementById("stats");
const shareBar = document.getElementById("share-bar");
const shareBtn = document.getElementById("share-btn");
const shareNote = document.getElementById("share-note");
const milestonesSection = document.getElementById("milestones");
const list = document.getElementById("milestone-list");

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_MIN = 1000 * 60;

// Average rates (estimates)
const HEART_PER_MIN = 70;
const BREATH_PER_MIN = 16;
const BLINK_PER_MIN_AWAKE = 15;
const AWAKE_FRACTION = 16 / 24;

const MILESTONES = [1000, 5000, 10000, 15000, 20000, 25000, 30000];

let birth = null;
let timer = null;

function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function format(n) {
  return Math.floor(n).toLocaleString();
}

function update() {
  const elapsed = Date.now() - birth.getTime();
  const minutes = elapsed / MS_PER_MIN;

  document.getElementById("days").textContent = format(elapsed / MS_PER_DAY);
  document.getElementById("heartbeats").textContent = format(minutes * HEART_PER_MIN);
  document.getElementById("breaths").textContent = format(minutes * BREATH_PER_MIN);
  document.getElementById("blinks").textContent = format(minutes * BLINK_PER_MIN_AWAKE * AWAKE_FRACTION);
}

function renderMilestones() {
  list.innerHTML = "";
  const today = new Date();
  MILESTONES.forEach(function (n) {
    const date = new Date(birth);
    date.setDate(date.getDate() + n);
    const dateText = date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    const daysAway = Math.ceil((date - today) / MS_PER_DAY);

    const li = document.createElement("li");
    if (daysAway <= 0) {
      li.textContent = "You reached " + n.toLocaleString() + " days on " + dateText;
      li.className = "done";
    } else {
      li.textContent = "You will reach " + n.toLocaleString() + " days on " + dateText + " (" + daysAway.toLocaleString() + " days to go)";
    }
    list.appendChild(li);
  });
}

function start(value) {
  birth = parseDate(value);
  if (isNaN(birth) || birth > new Date()) return;

  stats.hidden = false;
  shareBar.hidden = false;
  milestonesSection.hidden = false;
  update();
  renderMilestones();

  clearInterval(timer);
  timer = setInterval(update, 100);
}

input.addEventListener("change", function () {
  if (!input.value) return;
  try { localStorage.setItem("birthdate", input.value); } catch (e) {}
  start(input.value);
});

// Remember the birth date on reload
try {
  const saved = localStorage.getItem("birthdate");
  if (saved) {
    input.value = saved;
    start(saved);
  }
} catch (e) {}

// ---------- Share card ----------
const FONT = '"Segoe UI", system-ui, Arial, sans-serif';

function showShareNote(text) {
  shareNote.textContent = text;
  setTimeout(function () { shareNote.textContent = ""; }, 4000);
}

function drawHeart(ctx, cx, cy, size) {
  const t = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + t * 0.9);
  ctx.bezierCurveTo(cx - t * 1.6, cy - t * 0.2, cx - t * 0.9, cy - t * 1.3, cx, cy - t * 0.45);
  ctx.bezierCurveTo(cx + t * 0.9, cy - t * 1.3, cx + t * 1.6, cy - t * 0.2, cx, cy + t * 0.9);
  ctx.closePath();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function buildCard() {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#ff6fa5");
  bg.addColorStop(0.5, "#f0476b");
  bg.addColorStop(1, "#b3122e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft glow behind the heart
  const glow = ctx.createRadialGradient(W / 2, 360, 20, W / 2, 360, 420);
  glow.addColorStop(0, "rgba(255,255,255,0.35)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 60px " + FONT;
  ctx.fillText("My Life Counter", W / 2, 130);

  // Heart
  drawHeart(ctx, W / 2, 380, 300);
  ctx.shadowColor = "rgba(120, 0, 30, 0.4)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fill();
  ctx.shadowBlur = 0;

  // Days lived
  const days = document.getElementById("days").textContent;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 150px " + FONT;
  ctx.fillText(days, W / 2, 700);
  ctx.font = "600 44px " + FONT;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("days lived", W / 2, 765);

  // Counter rows
  const rows = [
    ["Heartbeats", document.getElementById("heartbeats").textContent],
    ["Breaths", document.getElementById("breaths").textContent],
    ["Blinks", document.getElementById("blinks").textContent]
  ];
  rows.forEach(function (row, i) {
    const y = 810 + i * 140;
    roundedRect(ctx, 60, y, W - 120, 120, 28);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 40px " + FONT;
    ctx.fillText(row[0], 100, y + 76);

    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 56px " + FONT;
    ctx.fillText(row[1], W - 100, y + 78);
  });

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "500 30px " + FONT;
  let footer = "Life Counter";
  if (location.protocol.indexOf("http") === 0) {
    footer = location.host + location.pathname.replace(/index\.html$/, "");
  }
  ctx.fillText(footer, W / 2, 1295);

  return canvas;
}

async function shareCard() {
  if (stats.hidden) return;

  const canvas = buildCard();
  const blob = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); });
  if (!blob) {
    showShareNote("Sorry, the card could not be created.");
    return;
  }

  const file = new File([blob], "my-life-counter.png", { type: "image/png" });

  // Phones and some browsers: open the share sheet
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My Life Counter", text: "My life counter" });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return; // person closed the share sheet
    }
  }

  // Everyone else: download the image
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-life-counter.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  showShareNote("Card saved as an image. You can share it from your downloads.");
}

shareBtn.addEventListener("click", shareCard);