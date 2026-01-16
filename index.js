const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const { Vec3 } = require("vec3");

/* ================================
   SERVER INFO
================================ */
const SERVER_HOST = "mtbcraft.minekeep.gg";
const SERVER_PORT = 25565;
const BOT_USERNAME = "Axiom";
const MC_VERSION = "1.21";

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
    console.log("🧠 Axiom has awakened");

    setTimeout(() => bot.chat("/gamemode creative"), 3000);

    const mcData = require("minecraft-data")(bot.version);
    const movements = new Movements(bot, mcData);
    movements.canDig = true;
    movements.allowParkour = false;
    movements.allow1by1towers = false;

    bot.pathfinder.setMovements(movements);

    // MAIN BRAIN LOOP
    setInterval(() => autonomousThink(bot), 1500);
  });

  bot.on("end", () => {
    console.log("🔄 Reconnecting...");
    setTimeout(startBot, 10000);
  });

  bot.on("error", err => console.log("⚠️", err));
}

/* ================================
   AUTONOMOUS BRAIN
================================ */
function autonomousThink(bot) {
  if (!bot.entity) return;

  // 1️⃣ COMBAT PRIORITY
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

  // 2️⃣ MINING PRIORITY
  if (targetBlock && bot.canDigBlock(targetBlock)) {
    bot.dig(targetBlock).catch(() => {});
    targetBlock = null;
    return;
  }

  targetBlock = bot.findBlock({
    matching: block =>
      block.name.includes("stone") ||
      block.name.includes("ore"),
    maxDistance: 12
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

  // 3️⃣ BUILDING BEHAVIOR
  const pos = bot.entity.position.floored();
  const baseBlock = bot.blockAt(pos.offset(0, -1, 0));

  if (baseBlock) {
    bot.placeBlock(baseBlock, new Vec3(0, 1, 0))
      .catch(() => {});
    return;
  }

  // 4️⃣ WANDER
  const range = 8;
  const wanderX = pos.x + Math.floor(Math.random() * range * 2 - range);
  const wanderZ = pos.z + Math.floor(Math.random() * range * 2 - range);

  bot.pathfinder.setGoal(
    new goals.GoalBlock(wanderX, pos.y, wanderZ)
  );
}

startBot();
