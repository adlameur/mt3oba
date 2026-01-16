const mineflayer = require("mineflayer");

/* ================================
   SERVER CONFIG (EDIT THIS)
================================ */
const SERVER_HOST = "emerald.magmanode.com"; // IP or domain
const SERVER_PORT = 31177;
const BOT_USERNAME = "AFK_Bot_1"; // Offline-mode name
const MC_VERSION = "1.21";

/* ================================
   BOT LOGIC
================================ */

function startBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: MC_VERSION
  });

  bot.once("spawn", () => {
    console.log("✅ Bot spawned and online");

    // Anti-AFK jump
    setInterval(() => {
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 500);
    }, 30000);

    // Look around randomly
    setInterval(() => {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0);
    }, 15000);
  });

  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    if (message === "!ping") {
      bot.chat("Pong! AFK bot online 😎");
    }

    if (message === "!status") {
      bot.chat("Still connected and not AFK.");
    }
  });

  bot.on("kicked", reason => {
    console.log("❌ Kicked:", reason);
  });

  bot.on("end", () => {
    console.log("🔄 Disconnected. Reconnecting in 10 seconds...");
    setTimeout(startBot, 10000);
  });

  bot.on("error", err => {
    console.log("⚠️ Error:", err);
  });
}

startBot();
