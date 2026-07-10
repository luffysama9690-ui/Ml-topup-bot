require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const path = require("path");
const { customAlphabet } = require("nanoid");
const packages = require("./packages");
const store = require("./store");

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const WEBAPP_URL = process.env.WEBAPP_URL;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !ADMIN_CHAT_ID || !WEBAPP_URL) {
  console.error("BOT_TOKEN, ADMIN_CHAT_ID, WEBAPP_URL — .env ဖိုင်ထဲမှာ အကုန်ဖြည့်ထားဖို့ လိုပါတယ်။");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "webapp")));

// Tracks which chat currently has a pending "awaiting screenshot" order
const pendingByChat = new Map();

// ---------- Bot commands ----------
bot.start((ctx) => {
  ctx.reply(
    "SAKURA Diamond Shop မှ ကြိုဆိုပါတယ်! 💎\nMobile Legends diamond ဝယ်ယူဖို့ အောက်က ခလုတ်ကိုနှိပ်ပါ။",
    Markup.keyboard([
      Markup.button.webApp("💎 Diamond ဝယ်မည်", WEBAPP_URL),
    ]).resize()
  );
});

bot.command("myorders", async (ctx) => {
  ctx.reply("Order history ကို ကြည့်ရန် admin ကို ဆက်သွယ်ပါ (feature ဆက်ထည့်နိုင်ပါတယ်)။");
});

// ---------- API used by the Mini App ----------
// Creates a new order and returns payment instructions
app.post("/api/order", (ctx_req, res) => {
  const { chatId, packageId, gameId, serverId, paymentMethod } = ctx_req.body || {};

  if (!chatId || !packageId || !gameId || !serverId || !paymentMethod) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const pkg = packages.find((p) => p.id === packageId);
  if (!pkg) return res.status(400).json({ error: "Invalid package" });

  const order = {
    id: nanoid(),
    chatId: String(chatId),
    packageId,
    packageLabel: pkg.label,
    price: pkg.price,
    gameId,
    serverId,
    paymentMethod,
    status: "awaiting_payment",
    createdAt: new Date().toISOString(),
  };
  store.createOrder(order);
  pendingByChat.set(String(chatId), order.id);

  const payInfo =
    paymentMethod === "kbzpay"
      ? { number: process.env.KBZPAY_NUMBER, name: process.env.KBZPAY_NAME, label: "KBZPay" }
      : { number: process.env.WAVEPAY_NUMBER, name: process.env.WAVEPAY_NAME, label: "WavePay" };

  res.json({ order, payInfo });

  // Message the user in the bot chat too, so instructions persist after they close the Mini App
  bot.telegram
    .sendMessage(
      order.chatId,
      `✅ Order တင်ပြီးပါပြီ (${order.id})\n\n📦 ${pkg.label}\n💰 ${pkg.price.toLocaleString()} MMK\n🎮 Game ID: ${gameId} (${serverId})\n\n${payInfo.label} သို့ ${payInfo.number} (${payInfo.name}) ကို ငွေလွှဲပြီး, ငွေလွှဲပြေစာ screenshot ကို ဒီ chat ထဲကို ပို့ပေးပါ။`
    )
    .catch((e) => console.error("sendMessage failed:", e.message));
});

// ---------- Receiving payment screenshots ----------
bot.on("photo", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const orderId = pendingByChat.get(chatId);
  if (!orderId) {
    return ctx.reply("လက်ရှိ pending order မရှိပါ။ Diamond ဝယ်ဖို့ /start ကိုနှိပ်ပြီးမှ ပြန်ကြိုးစားပါ။");
  }

  const order = store.getOrder(orderId);
  if (!order || order.status !== "awaiting_payment") {
    return ctx.reply("ဒီ order အတွက် screenshot လက်ခံပြီးသားဖြစ်ပါတယ်။");
  }

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  store.updateOrder(orderId, { status: "pending_review", screenshotFileId: photo.file_id });
  pendingByChat.delete(chatId);

  await ctx.reply("📨 လက်ခံရရှိပါပြီ! Admin စစ်ဆေးနေပါတယ်၊ ခဏစောင့်ပေးပါ။");

  // Forward to admin with Approve/Reject buttons
  await bot.telegram.sendPhoto(ADMIN_CHAT_ID, photo.file_id, {
    caption:
      `🆕 Order #${order.id}\n` +
      `👤 Chat ID: ${order.chatId}\n` +
      `📦 ${order.packageLabel}\n` +
      `💰 ${order.price.toLocaleString()} MMK\n` +
      `🎮 Game ID: ${order.gameId} (Server ${order.serverId})\n` +
      `💳 ${order.paymentMethod}`,
    ...Markup.inlineKeyboard([
      Markup.button.callback("✅ Approve", `approve:${order.id}`),
      Markup.button.callback("❌ Reject", `reject:${order.id}`),
    ]),
  });
});

// ---------- Admin approve/reject ----------
bot.action(/approve:(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = store.updateOrder(orderId, { status: "completed" });
  if (!order) return ctx.answerCbQuery("Order not found");

  await ctx.answerCbQuery("Approved ✅");
  await ctx.editMessageCaption(ctx.update.callback_query.message.caption + "\n\n✅ APPROVED");
  await bot.telegram.sendMessage(
    order.chatId,
    `🎉 Order #${order.id} အတည်ပြုပြီးပါပြီ!\n${order.packageLabel} ကို Game ID ${order.gameId} ထဲသို့ ပို့ပေးပြီးပါပြီ။ ကျေးဇူးတင်ပါတယ်! 💎`
  );
});

bot.action(/reject:(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = store.updateOrder(orderId, { status: "rejected" });
  if (!order) return ctx.answerCbQuery("Order not found");

  await ctx.answerCbQuery("Rejected ❌");
  await ctx.editMessageCaption(ctx.update.callback_query.message.caption + "\n\n❌ REJECTED");
  await bot.telegram.sendMessage(
    order.chatId,
    `⚠️ Order #${order.id} ကို ငွေပေးချေမှု မအတည်ပြုနိုင်ပါ။ Screenshot ကို ပြန်စစ်ပြီး admin ကို ဆက်သွယ်ပါ။`
  );
});

// ---------- Start everything ----------
app.get("/api/packages", (_req, res) => res.json(packages));

app.listen(PORT, () => console.log(`Web server on :${PORT}`));
bot.launch().then(() => console.log("Bot started"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
