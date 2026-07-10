# Mobile Legends Diamond Top-up — Telegram Mini App + Bot

Mobile Legends diamond ရောင်းချရန် Telegram Bot + Mini App (webapp) MVP တစ်ခုပါ။
Payment ကို **manual confirm** နည်းလမ်းနဲ့ လုပ်ထားပါတယ် (user က screenshot ပို့ → admin approve).

## ဘယ်လိုအလုပ်လုပ်လဲ (Flow)

1. User က bot ကို `/start` နှိပ်ပြီး "💎 Diamond ဝယ်မည်" ခလုတ်ကနေ Mini App ဖွင့်တယ်
2. Mini App ထဲမှာ Game ID / Server / Package / Payment method ရွေးတယ်
3. "Order တင်မည်" နှိပ်ရင် backend က order တစ်ခု create လုပ်ပြီး ငွေလွှဲရန် KBZPay/WavePay အချက်အလက်ပြတယ်
4. User က ငွေလွှဲပြီး screenshot ကို bot chat ထဲကို ပြန်ပို့တယ်
5. Bot က screenshot ကို admin ဆီ Approve/Reject button နဲ့ forward လုပ်ပေးတယ်
6. Admin approve နှိပ်ရင် user ဆီ "ပြီးပါပြီ" message အလိုအလျောက်ပို့တယ်

## Setup လုပ်ရန် အဆင့်များ

### 1. Bot Token ရယူခြင်း
1. Telegram ထဲမှာ **@BotFather** ကို message ပို့ပါ
2. `/newbot` ရိုက်ပြီး instructions အတိုင်းလုပ်ပါ
3. ရလာတဲ့ token ကို `.env` ဖိုင်ထဲက `BOT_TOKEN` မှာ ထည့်ပါ

### 2. Admin Chat ID ရှာခြင်း
1. **@userinfobot** ကို Telegram ထဲမှာ message ပို့ပါ
2. ရလာတဲ့ ID နံပါတ်ကို `.env` ထဲက `ADMIN_CHAT_ID` မှာ ထည့်ပါ

### 3. Dependencies install လုပ်ခြင်း
```bash
npm install
```

### 4. `.env` ဖိုင်ပြင်ဆင်ခြင်း
`.env.example` ကို `.env` အဖြစ် copy ကူးပြီး—BOT_TOKEN, ADMIN_CHAT_ID, KBZPAY/WAVEPAY အချက်အလက်တွေ ဖြည့်ပါ။

```bash
cp .env.example .env
```

### 5. Hosting (Deploy)
Telegram Mini App က **https** URL ရှိမှ အလုပ်လုပ်ပါတယ်။ Localhost နဲ့ မရပါ။
အခမဲ့/စျေးသက်သာတဲ့ options -

- **Render.com** (Web Service, free tier ရှိ) — အလွယ်ဆုံး
- **Railway.app**
- **Fly.io**

Deploy ပြီးရင် ရလာတဲ့ URL (ဥပမာ `https://your-app.onrender.com`) ကို `.env` ထဲက `WEBAPP_URL` မှာ ထည့်ပါ။

Local test လုပ်ချင်ရင် **ngrok** သုံးနိုင်ပါတယ်:
```bash
ngrok http 3000
```
ရလာတဲ့ https URL ကို `WEBAPP_URL` မှာ ထည့်ပါ။

### 6. BotFather မှာ Menu Button သတ်မှတ်ခြင်း (optional, UI ပိုကောင်းစေရန်)
1. **@BotFather** ကို `/mybots` ပို့ပါ → bot ရွေးပါ
2. **Bot Settings → Menu Button → Configure Menu Button**
3. WEBAPP_URL ကို ထည့်ပေးပါ

### 7. Run
```bash
npm start
```

## ဖိုင်တွေရဲ့ တာဝန်

| ဖိုင် | လုပ်ဆောင်ချက် |
|---|---|
| `bot.js` | Bot logic + API server (order create, screenshot handling, admin approve/reject) |
| `packages.js` | Diamond package စျေးနှုန်းစာရင်း — ဒီမှာ ပြင်ရင်ရပါတယ် |
| `store.js` | Order data သိမ်းဆည်းမှု (JSON file — MVP အတွက်) |
| `webapp/` | Mini App UI (HTML/CSS/JS) |

## နောက်ထပ် တိုးတက်အောင်လုပ်နိုင်တာများ

- `store.js` ကို JSON file အစား **real database** (Postgres, MongoDB) သို့ ပြောင်းပါ — server restart လုပ်ရင် data ပျောက်နိုင်လို့
- Order history ကြည့်ရန် `/myorders` command ကို ပြည့်စုံအောင်ဆက်ရေးပါ
- KBZPay/WavePay Business API ရှိရင် automatic verify လုပ်အောင် ချိတ်ဆက်နိုင်ပါတယ် (manual confirm မလိုတော့ပါ)
- Diamond ID/Server ID format ကို validate လုပ်ဖို့ Mobile Legends API (unofficial) စစ်ဆေးမှု ထည့်နိုင်ပါတယ်
- Rate limiting / spam-order ကာကွယ်ဖို့ logic ထည့်သင့်ပါတယ်

## သတိပေးချက်

ဒီ code က **MVP/starter template** ဖြစ်ပါတယ်။ တကယ်တမ်း ငွေရေးကြေးရေး လုပ်ငန်းအနေနဲ့ အသုံးပြုမယ်ဆိုရင် -
- Local law/regulation များ လိုက်နာပါ (ဂိမ်း top-up ရောင်းချခြင်းအတွက် business registration လိုအပ်ချက်များ)
- User data (Game ID, chat ID, payment screenshots) ကို လုံခြုံစွာ သိမ်းဆည်းပါ
- Refund policy ရှင်းရှင်းလင်းလင်း ထားပါ
