const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const { Vec3 } = require("vec3");

/* ================================
   SERVER INFO
================================ */
const SERVER_HOST = "emerald.magmanode.com";
const SERVER_PORT = 31177;
const BOT_USERNAME = "Axiom";
const MC_VERSION = "1.21";

/* ================================
   STATE
================================ */
let mode = "idle"; // idle | build | mine | combat
let targetBlock = null;
let combatTarget = null;

function startBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: MC_VERSION
  });

  bot.loadPlugin(pathfinder);

  bot.once("spawn", () => {
    console.log("🧠 Axiom online");

    // Creative if OP
    setTimeout(() => {
      bot.chat("/gamemode creative");
    }, 3000);

    const mcData = require("minecraft-data")(bot.version);
    const movements = new Movements(bot, mcData);
    movements.canDig = true;
    movements.allowParkour = false;
    movements.allow1by1towers = false;

    bot.pathfinder.setMovements(movements);

    // MAIN THINK LOOP (AUTONOMOUS)
    setInterval(() => {
      if (mode === "build") buildAI(bot);
      if (mode === "mine") mineAI(bot);
    }, 2000);
  });

  /* ================================
     CHAT COMMANDS
  ================================ */
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    if (message === "!build") {
      mode = "build";
      bot.chat("🧱 Axiom: building autonomously.");
    }

    if (message === "!mine") {
      mode = "mine";
      bot.chat("⛏️ Axiom: mining autonomously.");
    }

    if (message === "!combat") {
      mode = "combat";
      bot.chat("⚔️ Axiom: combat autonomous.");
    }

    if (message === "!stop") {
      mode = "idle";
      targetBlock = null;
      combatTarget = null;
      bot.pathfinder.stop();
      bot.chat("🛑 Axiom: standing by.");
    }
  });

  /* ================================
     COMBAT AI (AUTOMATIC)
  ================================ */
  bot.on("physicsTick", () => {
    if (mode !== "combat") return;

    if (!combatTarget || !combatTarget.isValid) {
      combatTarget = bot.nearestEntity(e =>
        e.type === "mob" && e.mobType !== "Armor Stand"
      );
    }

    if (!combatTarget) return;

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
  });

  bot.on("end", () => {
    console.log("🔄 Axiom disconnected, reconnecting...");
    setTimeout(startBot, 10000);
  });

  bot.on("error", err => console.log("⚠️ Error:", err));
}

/* ================================
   BUILDING AI
================================ */
function buildAI(bot) {
  const pos = bot.entity.position.floored();
  const baseBlock = bot.blockAt(pos.offset(0, -1, 0));
  if (!baseBlock) return;

  bot.placeBlock(baseBlock, new Vec3(0, 1, 0)).catch(() => {});
}

/* ================================
   MINING AI
================================ */
function mineAI(bot) {
  if (targetBlock && bot.canDigBlock(targetBlock)) {
    bot.dig(targetBlock).catch(() => {});
    targetBlock = null;
    return;
  }

  targetBlock = bot.findBlock({
    matching: block =>
      block.name.includes("stone") ||
      block.name.includes("ore"),
    maxDistance: 16
  });

  if (!targetBlock) return;

  bot.pathfinder.setGoal(
    new goals.GoalBlock(
      targetBlock.position.x,
      targetBlock.position.y,
      targetBlock.position.z
    )
  );
}

startBot();

