const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const { Vec3 } = require("vec3");

/* ================================
   SERVER INFO
================================ */
const SERVER_HOST = "MTB1-mLqH.aternos.me";
const SERVER_PORT = 59794;
const BOT_USERNAME = "Axiom";
const MC_VERSION = "1.21";

/* ================================
   INTERNAL STATE
================================ */
let reconnectDelay = 15000; // start with 15s
let creativeSet = false;
let targetBlock = null;
let combatTarget = null;
let thinkInterval = null;

function startBot() {
  console.log("⏳ Starting Axiom...");

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: MC_VERSION
  });

  bot.loadPlugin(pathfinder);

  bot.once("spawn", () => {
    console.log("✅ Axiom connected");

    reconnectDelay = 15000; // reset delay on success

    // Set creative ONLY ONCE
    if (!creativeSet) {
      setTimeout(() => {
        bot.chat("/gamemode creative");
        creativeSet = true;
      }, 6000);
    }

    const mcData = require("minecraft-data")(bot.version);
    const movements = new Movements(bot, mcData);
    movements.canDig = true;
    movements.allowParkour = false;
    movements.allow1by1towers = false;

    bot.pathfinder.setMovements(movements);

    // SAFE AI LOOP (slower)
    thinkInterval = setInterval(() => autonomousThink(bot), 3000);
  });

  bot.on("end", () => {
    cleanup(bot);
    scheduleReconnect("Disconnected");
  });

  bot.on("kicked", reason => {
    console.log("❌ Kicked:", reason);
    cleanup(bot);
    scheduleReconnect("Kicked");
  });

  bot.on("error", err => {
    if (err.code === "ECONNRESET") {
      console.log("⚠️ Connection reset by server (Aternos cooldown)");
    } else {
      console.log("⚠️ Error:", err);
    }
  });
}

function cleanup(bot) {
  try {
    if (thinkInterval) clearInterval(thinkInterval);
    bot.pathfinder.stop();
  } catch {}
}

function scheduleReconnect(reason) {
  console.log(`🔄 Reconnecting in ${reconnectDelay / 1000}s (${reason})`);
  setTimeout(startBot, reconnectDelay);

  // Exponential backoff (max 60s)
  reconnectDelay = Math.min(reconnectDelay * 1.5, 60000);
}

/* ================================
   AUTONOMOUS BRAIN (SAFE)
================================ */
function autonomousThink(bot) {
  if (!bot.entity) return;

  // 1️⃣ Combat
  combatTarget = bot.nearestEntity(e =>
    e.type === "mob" && e.mobType !== "Armor Stand"
  );

  if (combatTarget) {
    bot.lookAt(combatTarget.position.offset(0, 1.4, 0));
    const dist = bot.entity.position.distanceTo(combatTarget.position);

    if (dist > 3) {
      bot.pathfinder.setGoal(
        new goals.GoalFollow(combatTarget, 2),
        true
      );
    } else {
      bot.attack(combatTarget);
    }
    return;
  }

  // 2️⃣ Mining
  if (targetBlock && bot.canDigBlock(targetBlock)) {
    bot.dig(targetBlock).catch(() => {});
    targetBlock = null;
    return;
  }

  targetBlock = bot.findBlock({
    matching: block =>
      block.name.includes("stone") ||
      block.name.includes("ore"),
    maxDistance: 10
  });

  if (targetBlock) {
    bot.pathfinder.setGoal(
      new goals.GoalBlock(
        targetBlock.position.x,
        targetBlock.position.y,
        targetBlock.position.z
      )
    );
    return;
  }

  // 3️⃣ Light building (not spammy)
  const pos = bot.entity.position.floored();
  const base = bot.blockAt(pos.offset(0, -1, 0));

  if (base && Math.random() < 0.25) {
    bot.placeBlock(base, new Vec3(0, 1, 0))
      .catch(() => {});
  }
}

startBot();
