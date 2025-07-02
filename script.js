// --- CONFIG ---
// Numbers in numeric order
const rouletteNumbers = Array.from({length: 37}, (_, i) => i);
const colors = rouletteNumbers.map(n => {
  if (n === 0) return '#2ecc40'; // green
  // 1-36 alternate red/black, starting with red for 1
  return n % 2 === 0 ? '#000' : '#c0392b';
});
const colorNames = rouletteNumbers.map(n => {
  if (n === 0) return 'green';
  return n % 2 === 0 ? 'black' : 'red';
});
const wheelRadius = 200;
const center = 210;
// const pointerAngle = -Math.PI / 2; // Upwards (no longer needed)
const ballRadius = 10;
const ballTrackRadius = wheelRadius - 24;

const resultDisplay = document.getElementById('resultDisplay');
const moneyDisplay = document.getElementById('moneyDisplay');
const betForm = document.getElementById('betForm');
const betType = document.getElementById('betType');
const betColor = document.getElementById('betColor');
const betNumber = document.getElementById('betNumber');
const betAmount = document.getElementById('betAmount');
const placeBetBtn = document.getElementById('placeBetBtn');
const rollBtn = document.getElementById('rollBtn');
const winningNumberDisplay = document.getElementById('winningNumberDisplay');
const betResultDisplay = document.getElementById('betResultDisplay');

// Fill betNumber options
for (let i = 0; i <= 36; i++) {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = i;
  betNumber.appendChild(opt);
}

// Show/hide betColor/betNumber based on betType
betType.addEventListener('change', () => {
  if (betType.value === 'color') {
    betColor.style.display = 'inline-block';
    betNumber.style.display = 'none';
  } else {
    betColor.style.display = 'none';
    betNumber.style.display = 'inline-block';
  }
});

// --- MONEY & BET STATE ---
let money = 1000;
let currentBet = null;
let canBet = true;

function updateMoneyDisplay() {
  if (money < 0) {
    moneyDisplay.textContent = `-$${Math.abs(money)}`;
    moneyDisplay.style.color = '#ff5555';
  } else {
    moneyDisplay.textContent = `$${money}`;
    moneyDisplay.style.color = '#fffbe6';
  }
}
updateMoneyDisplay();

function getChipBreakdown(amount) {
  const denominations = [1000, 500, 100, 25, 10, 5, 1];
  const chips = [];
  for (let denom of denominations) {
    let count = Math.floor(amount / denom);
    for (let i = 0; i < count; i++) {
      chips.push(denom);
    }
    amount -= count * denom;
  }
  return chips;
}

function renderChips(amount) {
  const chipStack = document.getElementById('chipStack');
  chipStack.innerHTML = '';
  if (!amount || amount < 1) return;
  const denominations = [1000, 500, 100, 25, 10, 5, 1];
  const chipsByDenom = {};
  for (let denom of denominations) chipsByDenom[denom] = 0;
  let left = amount;
  for (let denom of denominations) {
    let count = Math.floor(left / denom);
    chipsByDenom[denom] = count;
    left -= count * denom;
  }
  denominations.forEach(denom => {
    if (chipsByDenom[denom] > 0) {
      const col = document.createElement('div');
      col.className = 'chip-column';
      for (let i = 0; i < chipsByDenom[denom]; i++) {
        const div = document.createElement('div');
        div.className = `chip chip-${denom}`;
        div.innerHTML = `<div class='chip-stripes'></div><span class="chip-value">$${denom}</span>`;
        col.appendChild(div);
      }
      chipStack.appendChild(col);
    }
  });
}

function resetBet() {
  currentBet = null;
  rollBtn.disabled = true;
  canBet = true;
  placeBetBtn.disabled = false;
  renderChips(0);
}

// --- DRAW WHEEL ---
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
function drawWheel(angle = 0, highlightIdx = null, ballAngle = null, ballTrail = null) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const segAngle = 2 * Math.PI / rouletteNumbers.length;
  for (let i = 0; i < rouletteNumbers.length; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, wheelRadius, segAngle * i + angle, segAngle * (i + 1) + angle);
    ctx.closePath();
    // Red and gold alternating segments
    ctx.fillStyle = i % 2 === 0 ? '#a80000' : '#ffd700';
    if (i === 0) ctx.fillStyle = '#d42d2d'; // 0 is a special deep red
    ctx.shadowColor = highlightIdx === i ? '#ffd700' : 'rgba(168,0,0,0.2)';
    ctx.shadowBlur = highlightIdx === i ? 40 : 6;
    ctx.fill();
    ctx.restore();
    // Draw text in gold, DragonFont
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(segAngle * (i + 0.5) + angle);
    ctx.textAlign = 'right';
    ctx.font = 'bold 1.3rem DragonFont, Orbitron, Arial';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#a80000';
    ctx.shadowBlur = 8;
    ctx.fillText(rouletteNumbers[i].toString(), wheelRadius - 18, 8);
    ctx.restore();
  }
  // Draw center circle (gold)
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, 60, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.restore();
  // Draw center highlight (red)
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, 30, 0, 2 * Math.PI);
  ctx.fillStyle = '#a80000';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
  // Draw the ball trail if provided (for motion blur)
  if (Array.isArray(ballTrail)) {
    for (let i = 0; i < ballTrail.length; i++) {
      const t = ballTrail[i];
      ctx.save();
      ctx.globalAlpha = 0.12 * (1 - i / ballTrail.length);
      ctx.beginPath();
      ctx.arc(center + ballTrackRadius * Math.cos(t), center + ballTrackRadius * Math.sin(t), ballRadius + 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.restore();
    }
  }
  // Draw the ball if ballAngle is provided
  if (ballAngle !== null) {
    ctx.save();
    // Outer glow
    ctx.beginPath();
    ctx.arc(center + ballTrackRadius * Math.cos(ballAngle), center + ballTrackRadius * Math.sin(ballAngle), ballRadius + 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffd70088';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();
    // Ball core
    ctx.save();
    ctx.beginPath();
    ctx.arc(center + ballTrackRadius * Math.cos(ballAngle), center + ballTrackRadius * Math.sin(ballAngle), ballRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 1;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();
    ctx.restore();
  }
  // Draw a dragon SVG overlay (badass look)
  const dragon = new window.Image();
  dragon.src = 'https://svgshare.com/i/15kA.svg';
  dragon.onload = function() {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.drawImage(dragon, center - 160, center - 160, 320, 320);
    ctx.restore();
  };
}
drawWheel();

// --- ANIMATION ---
let spinning = false;
let currentAngle = 0;
let lastFrame = null;
let targetAngle = 0;
let winnerIdx = 0;
let highlightTimeout = null;
let ballTargetAngle = 0;
let ballTrailArr = [];

function spinWheel() {
  if (spinning || !currentBet) return;
  spinning = true;
  rollBtn.disabled = true;
  placeBetBtn.disabled = true;
  canBet = false;
  // Clear displays at start
  winningNumberDisplay.innerHTML = '&nbsp;';
  betResultDisplay.innerHTML = '&nbsp;';
  // Pick a random winner
  winnerIdx = Math.floor(Math.random() * rouletteNumbers.length);
  // Calculate target angle so the ball lands in the winning section
  const segAngle = 2 * Math.PI / rouletteNumbers.length;
  const randomOffset = Math.random() * segAngle * 0.7 - segAngle * 0.35; // For realism
  const pointerAngle = -Math.PI / 2;
  targetAngle = (2 * Math.PI * 6) + (winnerIdx * segAngle) + segAngle / 2 + randomOffset - pointerAngle;
  const ballOrbits = 10 + Math.random() * 2;
  ballTargetAngle = -(2 * Math.PI * ballOrbits) + (winnerIdx * segAngle) + segAngle / 2 + randomOffset - pointerAngle;
  let start = null;
  let duration = 4200 + Math.random() * 600;
  let easeOut = t => 1 - Math.pow(1 - t, 3);
  function animateWheel(ts) {
    if (!start) start = ts;
    let elapsed = ts - start;
    let t = Math.min(elapsed / duration, 1);
    let eased = easeOut(t);
    currentAngle = (targetAngle) * eased;
    let ballAngle = (ballTargetAngle) * eased;
    // Ball trail for motion blur
    if (t < 1) {
      ballTrailArr.push(ballAngle % (2 * Math.PI));
      if (ballTrailArr.length > 10) ballTrailArr.shift();
    } else {
      ballTrailArr = [];
    }
    drawWheel(currentAngle % (2 * Math.PI), null, ballAngle % (2 * Math.PI), ballTrailArr);
    canvas.style.filter = `drop-shadow(0 0 10px #0006)`;
    if (t < 1) {
      requestAnimationFrame(animateWheel);
    } else {
      drawWheel(currentAngle % (2 * Math.PI), null, ballAngle % (2 * Math.PI), ballTrailArr);
      canvas.style.filter = 'drop-shadow(0 0 24px #bfa76f88)';
      let finalBallAngle = (ballAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      let relativeBallAngle = (finalBallAngle - (currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      let landedIdx = Math.floor((relativeBallAngle) / segAngle);
      if (landedIdx < 0) landedIdx += rouletteNumbers.length;
      if (landedIdx >= rouletteNumbers.length) landedIdx = 0;
      drawWheel(currentAngle % (2 * Math.PI), landedIdx, finalBallAngle, ballTrailArr);
      // Show result
      const winNum = rouletteNumbers[landedIdx];
      // Always display the number in gold
      winningNumberDisplay.innerHTML = `<span style='color:#ffd700;font-size:2.5rem;'>${winNum}</span>`;
      // --- BET RESOLUTION ---
      let betResult = false;
      let payout = 0;
      if (currentBet.type === 'number') {
        if (parseInt(currentBet.value) === winNum) {
          betResult = true;
          payout = currentBet.amount * 100;
        }
      } else if (currentBet.type === 'color') {
        if (currentBet.value === colorNames[landedIdx]) {
          betResult = true;
          payout = currentBet.amount * 2;
        }
      }
      if (betResult) {
        money += payout;
        betResultDisplay.innerHTML = `<span style='color:#ffd700;font-size:1.3rem;'>You won $${payout}!</span>`;
        launchGoldenFireworks(payout);
      } else {
        betResultDisplay.innerHTML = `<span style='color:#ffd700;font-size:1.3rem;'>You lost $${currentBet.amount}.</span>`;
      }
      updateMoneyDisplay();
      spinning = false;
      resetBet(); // Allow new bet and reroll after spin
    }
  }
  requestAnimationFrame(animateWheel);
}

// Play gong sound
function playGong() {
  const audio = new Audio('Assets/gong.mp3');
  audio.volume = 0.7;
  audio.play();
}

function playChineseNoise() {
  const audio = new Audio('Assets/chinesenoise.mp3');
  audio.volume = 1;
  audio.play();
}

rollBtn.addEventListener('click', () => {
  if (highlightTimeout) clearTimeout(highlightTimeout);
  playChineseNoise();
  spinWheel();
});

betForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!canBet) return;
  playGong();
  const amount = parseInt(betAmount.value);
  if (isNaN(amount) || amount < 1) {
    alert('Please enter a valid bet amount.');
    return;
  }
  let type = betType.value;
  let value = type === 'color' ? betColor.value : betNumber.value;
  currentBet = { type, value, amount };
  money -= amount;
  updateMoneyDisplay();
  rollBtn.disabled = false;
  placeBetBtn.disabled = true;
  canBet = false;
  renderChips(amount);
});

// Add animated gold sparkles to the background
(function createSparkles() {
  const sparkleContainer = document.querySelector('.bg-sparkle');
  if (!sparkleContainer) return;
  const sparkleCount = 32;
  for (let i = 0; i < sparkleCount; i++) {
    const s = document.createElement('span');
    const size = 8 + Math.random() * 18;
    s.style.width = s.style.height = size + 'px';
    s.style.left = Math.random() * 100 + 'vw';
    s.style.top = Math.random() * 100 + 'vh';
    s.style.animationDuration = (6 + Math.random() * 6) + 's';
    s.style.animationDelay = (Math.random() * 8) + 's';
    sparkleContainer.appendChild(s);
  }
})();

document.getElementById('addMoneyBtn').addEventListener('click', () => {
  money += 1000;
  updateMoneyDisplay();
  playGong();
});

// --- FIREWORKS EFFECT ---
let slotAudio = null;
function stopSlotAudio() {
  if (slotAudio) {
    slotAudio.pause();
    slotAudio.currentTime = 0;
    slotAudio = null;
  }
}
function launchGoldenFireworks(winAmount) {
  // Play fireworks sound
  try {
    const audio = new Audio('Assets/fireworks.mp3');
    audio.volume = 1.5;
    audio.play();
  } catch (e) {}
  // Play slotmachine sound in a loop during fireworks
  try {
    stopSlotAudio(); // Stop any previous
    slotAudio = new Audio('Assets/slotmachine.mp3');
    slotAudio.volume = 0.7;
    slotAudio.loop = true;
    slotAudio.play();
  } catch (e) {}
  // Show big win text overlay
  if (typeof winAmount === 'number' && winAmount > 0) {
    const winTextDiv = document.getElementById('win-flash-text');
    if (winTextDiv) {
      winTextDiv.innerHTML = `<span style="
        display:inline-block;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size:7vw;
        font-family:'DragonFont','Orbitron',Arial,sans-serif;
        color:#ffd700;
        text-shadow:0 0 32px #fff,0 0 16px #ffd700,0 2px 8px #a80000;
        font-weight:bold;
        letter-spacing:2px;
        animation: win-flash 0.5s alternate infinite;
        /* background:rgba(0,0,0,0.18);padding:0.2em 1em;border-radius:32px; */
      ">
        You won $${winAmount}!
      </span>`;
      winTextDiv.style.display = 'block';
      winTextDiv.style.opacity = '1';
      // Remove after 5s (match fireworks duration)
      setTimeout(() => {
        winTextDiv.style.transition = 'opacity 0.7s';
        winTextDiv.style.opacity = '0';
        setTimeout(() => {
          winTextDiv.style.display = 'none';
          winTextDiv.innerHTML = '';
          winTextDiv.style.transition = '';
          winTextDiv.style.opacity = '';
        }, 800);
      }, 5000);
    }
  }
  const container = document.getElementById('fireworks-container');
  if (!container) return;
  // Clear any existing fireworks
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const fireworks = [];
  const colors = ['#fffbe6', '#ffd700', '#fffde4', '#ffe066', '#fff8b0', '#e6c200', '#fff', '#ffef8a'];
  function randomBetween(a, b) { return a + Math.random() * (b - a); }
  function createFirework() {
    const x = randomBetween(window.innerWidth * 0.15, window.innerWidth * 0.85);
    const y = randomBetween(window.innerHeight * 0.18, window.innerHeight * 0.5);
    const particles = [];
    const count = 36 + Math.floor(Math.random() * 16); // Slightly more particles
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      const speed = randomBetween(4, 10);
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: randomBetween(8, 18), // Thicker and bigger
        color,
        gravity: 0.03 + Math.random() * 0.03
      });
    }
    fireworks.push({particles});
  }
  let frame = 0;
  let running = true;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const fw of fireworks) {
      for (const p of fw.particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, '#fffbe6');
        grad.addColorStop(0.15, '#fff');
        grad.addColorStop(0.3, p.color);
        grad.addColorStop(0.7, 'rgba(255, 215, 0, 0.7)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.alpha *= 0.96;
      }
    }
    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].particles = fireworks[i].particles.filter(p => p.alpha > 0.05);
      if (fireworks[i].particles.length === 0) fireworks.splice(i, 1);
    }
    // Continue animating until all particles are gone, even after running is false
    if (running || fireworks.length > 0) {
      requestAnimationFrame(animate);
    } else {
      container.innerHTML = '';
      stopSlotAudio();
    }
    frame++;
  }
  // Launch many fireworks, staggered over 5 seconds
  const launches = 18;
  for (let i = 0; i < launches; i++) {
    setTimeout(createFirework, Math.floor((5000 / launches) * i));
  }
  animate();
  // Stop launching after 5 seconds, but let particles fade out
  setTimeout(() => { running = false; }, 5000);
}

// Add keyframes for win-flash animation
(function addWinFlashKeyframes() {
  if (document.getElementById('win-flash-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'win-flash-keyframes';
  style.innerHTML = `@keyframes win-flash { 0%{filter:brightness(1);} 100%{filter:brightness(2.2) drop-shadow(0 0 32px #fffde4);} }`;
  document.head.appendChild(style);
})(); 