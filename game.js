// ==== SETUP ====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ==== INPUT ====
const keys = {};
const mouse = { x: 0, y: 0 };
let shooting = false;

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
canvas.addEventListener("mousedown", () => shooting = true);
canvas.addEventListener("mouseup", () => shooting = false);

// ==== PLAYER ====
const player = {
    x: 400,
    y: 300,
    speed: 4,
    fireRate: 200,
    lastShot: 0,
    alive: true,
    shield: false,
    maxHealth: 1,
    health: 1
};

// ==== SCORE, WAVE & SPAWN ====
let score = 0;
let wave = 1;
let spawnRate = 1500;

// ==== SCREEN SHAKE & PARTICLES ====
let screenShake = 0;
const particles = [];
const floatingScores = [];

// ==== BULLETS ====
const bullets = [];

function shoot() {
    if (!player.alive) return;
    const now = Date.now();
    if (now - player.lastShot < player.fireRate) return;
    player.lastShot = now;

    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const spread = (Math.random() - 0.5) * 0.15;
    const finalAngle = angle + spread;

    bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(finalAngle) * 10,
        dy: Math.sin(finalAngle) * 10,
        life: 60
    });

    screenShake = 3;
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;
        b.life--;
        if (b.life <= 0) bullets.splice(i, 1);
    }
}

function drawBullets() {
    ctx.fillStyle = "#ff3";
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ==== ENEMIES ====
const enemies = [];

function spawnEnemy() {
    const types = ["chaser", "shooter", "exploder", "shielded"];
    const type = types[Math.floor(Math.random() * types.length)];
    enemies.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 14,
        speed: type === "chaser" ? 2 : type === "shooter" ? 1.5 : 1,
        type: type,
        hp: type === "shielded" ? 2 : 1
    });
}

setInterval(() => {
    if (player.alive) spawnEnemy();
}, spawnRate);

function updateEnemies() {
    enemies.forEach(e => {
        let angle = Math.atan2(player.y - e.y, player.x - e.x);
        const dist = Math.hypot(player.x - e.x, player.y - e.y);

        if (e.type === "chaser") {
            e.x += Math.cos(angle) * e.speed;
            e.y += Math.sin(angle) * e.speed;
        } else if (e.type === "shooter") {
            if (dist > 200) {
                e.x += Math.cos(angle) * e.speed;
                e.y += Math.sin(angle) * e.speed;
            } else {
                e.x += Math.cos(angle + Math.PI / 2) * e.speed;
                e.y += Math.sin(angle + Math.PI / 2) * e.speed;
            }
        } else if (e.type === "exploder") {
            e.x += Math.cos(angle) * (e.speed / 2);
            e.y += Math.sin(angle) * (e.speed / 2);
        } else if (e.type === "shielded") {
            e.x += Math.cos(angle) * e.speed;
            e.y += Math.sin(angle) * e.speed;
        }
    });
}

function drawEnemies() {
    enemies.forEach(e => {
        if (e.type === "chaser") ctx.fillStyle = "#f44";
        else if (e.type === "shooter") ctx.fillStyle = "#4f4";
        else if (e.type === "exploder") ctx.fillStyle = "#ff8";
        else if (e.type === "shielded") ctx.fillStyle = "#88f";

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ==== PARTICLES & FLOATING SCORES ====
function spawnParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 0.5) * 6,
            life: 30
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    ctx.fillStyle = "#ff0";
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;

    // Floating scores
    floatingScores.forEach((f, idx) => {
        ctx.fillStyle = "#ff0";
        ctx.globalAlpha = f.life / 30;
        ctx.font = "20px Arial";
        ctx.fillText("+" + f.value, f.x, f.y);
        f.y -= 0.5;
        f.life--;
        if (f.life <= 0) floatingScores.splice(idx, 1);
    });
    ctx.globalAlpha = 1;
}

// ==== COLLISIONS ====
function checkCollisions() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const dist = Math.hypot(dx, dy);

            if (dist < e.r) {
                bullets.splice(j, 1);
                spawnParticles(e.x, e.y);
                floatingScores.push({ x: e.x, y: e.y, value: 1, life: 30 });
                score++;
                enemies.splice(i, 1);

                // Waves
                if (score % 10 === 0) {
                    wave++;
                    spawnRate = Math.max(500, spawnRate - 100);
                }

                screenShake = 8;
                break;
            }
        }
    }

    for (let e of enemies) {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist < e.r + 10 && !player.shield) {
            player.alive = false;
        }
    }
}

// ==== PLAYER ====
function updatePlayer() {
    if (!player.alive) return;

    if (keys["w"]) player.y -= player.speed;
    if (keys["s"]) player.y += player.speed;
    if (keys["a"]) player.x -= player.speed;
    if (keys["d"]) player.x += player.speed;

    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

    if (shooting) shoot();
}

function drawPlayer() {
    if (!player.alive) return;
    ctx.fillStyle = "#4af";

    // Body
    ctx.fillRect(player.x - 5, player.y - 10, 10, 20);
    // Head
    ctx.beginPath();
    ctx.arc(player.x, player.y - 15, 5, 0, Math.PI * 2);
    ctx.fill();
    // Arms
    ctx.fillRect(player.x - 12, player.y - 5, 24, 4);

    // Shield bar
    if (player.shield) {
        ctx.strokeStyle = "#0ff";
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x - 12, player.y - 18, 24, 3);
        ctx.lineWidth = 1;
    }
}

function drawAim() {
    if (!player.alive) return;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();
}

// ==== UI & GAME OVER ====
function drawUI() {
    // Score & wave
    ctx.fillStyle = "#ff0";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 30);
    ctx.fillText("Wave: " + wave, 10, 60);

    // Enemy legend
    ctx.fillStyle = "#f44";
    ctx.fillText("Chaser", canvas.width - 100, 30);
    ctx.fillStyle = "#4f4";
    ctx.fillText("Shooter", canvas.width - 100, 60);
    ctx.fillStyle = "#ff8";
    ctx.fillText("Exploder", canvas.width - 100, 90);
    ctx.fillStyle = "#88f";
    ctx.fillText("Shielded", canvas.width - 100, 120);

    // Game over menu
    if (!player.alive) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#f44";
        ctx.font = "50px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2 - 150, canvas.height / 2 - 50);

        ctx.fillStyle = "#fff";
        ctx.font = "30px Arial";
        ctx.fillText("Press R to Restart", canvas.width / 2 - 140, canvas.height / 2 + 20);
        ctx.fillText("Press Q to Quit", canvas.width / 2 - 120, canvas.height / 2 + 60);

        if (keys["r"]) restartGame();
        if (keys["q"]) quitGame();
    }
}

// ==== RESTART / QUIT ====
function restartGame() {
    player.x = 400;
    player.y = 300;
    player.alive = true;
    player.health = player.maxHealth;
    bullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    floatingScores.length = 0;
    score = 0;
    wave = 1;
    spawnRate = 1500;
}

function quitGame() {
    alert("Thanks for playing!");
    window.location.reload();
}

// ==== GAME LOOP ====
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.85;
    }

    updatePlayer();
    updateBullets();
    updateEnemies();
    updateParticles();
    checkCollisions();

    drawBullets();
    drawEnemies();
    drawParticles();
    drawPlayer();
    drawAim();
    drawUI();

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

gameLoop();
