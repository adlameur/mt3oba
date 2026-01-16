const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");

/* ================================
   SERVER INFO
================================ */
const SERVER_HOST = "MTB1-mLqH.aternos.me";
const SERVER_PORT = 59794;
const BOT_USERNAME = "Axiom_Traveler";
const MC_VERSION = "1.21";

/* ================================
   RECONNECT CONTROL
================================ */
let reconnectDelay = 20000;
let wanderInterval = null;

function startBot() {
  console.log("🧭 Axiom starting...");

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: MC_VERSION
  });

  bot.loadPlugin(pathfinder);

  bot.once("spawn", () => {
    console.log("✅ Axiom is traveling");

    reconnectDelay = 20000;

    const mcData = require("minecraft-data")(bot.version);
    const movements = new Movements(bot, mcData);
    movements.canDig = false;
    movements.allowParkour = false;
    movements.allow1by1towers = false;

    bot.pathfinder.setMovements(movements);

    // Look around sometimes
    setInterval(() => {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0);
    }, 15000);

    // Wander loop (SAFE + SLOW)
    wanderInterval = setInterval(() => {
      if (!bot.entity) return;

      const pos = bot.entity.position;
      const range = 12;

      const x = Math.floor(
        pos.x + Math.random() * range * 2 - range
      );
      const z = Math.floor(
        pos.z + Math.random() * range * 2 - range
      );

      bot.pathfinder.setGoal(
        new goals.GoalBlock(x, pos.y, z)
      );
    }, 10000);
  });

  bot.on("end", () => {
    cleanup();
    scheduleReconnect("Disconnected");
  });

  bot.on("kicked", reason => {
    console.log("❌ Kicked:", reason);
    cleanup();
    scheduleReconnect("Kicked");
  });

  bot.on("error", err => {
    if (err.code === "ECONNRESET") {
      console.log("⚠️ Connection reset (Aternos throttle)");
    } else {
      console.log("⚠️ Error:", err);
    }
  });

  function cleanup() {
    if (wanderInterval) clearInterval(wanderInterval);
    try {
      bot.pathfinder.stop();
    } catch {}
  }
}

function scheduleReconnect(reason) {
  console.log(`🔄 Reconnecting in ${reconnectDelay / 1000}s (${reason})`);
  setTimeout(startBot, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 1.5, 60000);
}

startBot();

