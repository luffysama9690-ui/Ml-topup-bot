const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const chatId = tg.initDataUnsafe?.user?.id || null;

// ============================================================
// TAB NAVIGATION
// ============================================================
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(tabId) {
  document.querySelectorAll(".tab-screen").forEach((t) => (t.style.display = "none"));
  document.getElementById(tabId).style.display = "block";
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));

  if (tabId === "walletTab") loadWallet();
  if (tabId === "ordersTab") loadOrders();
}

// ============================================================
// SHOP TAB
// ============================================================
let packages = [];
let selectedPackage = null;
let selectedMethod = null;

const packageGrid = document.getElementById("packageGrid");
const totalPrice = document.getElementById("totalPrice");
const submitBtn = document.getElementById("submitBtn");
const gameIdInput = document.getElementById("gameId");
const serverIdInput = document.getElementById("serverId");

fetch("/api/packages")
  .then((r) => r.json())
  .then((data) => {
    packages = data;
    renderPackages();
  });

function renderPackages() {
  packageGrid.innerHTML = "";
  packages.forEach((pkg) => {
    const card = document.createElement("div");
    card.className = "package-card";
    card.dataset.id = pkg.id;
    card.innerHTML = `
      <div class="amount">${pkg.label}</div>
      ${pkg.originalPrice ? `<div class="old-price">${pkg.originalPrice.toLocaleString()} ကျပ်</div>` : ""}
      <div class="price">${pkg.price.toLocaleString()} ကျပ်</div>
    `;
    card.addEventListener("click", () => selectItem("package", pkg, card));
    packageGrid.appendChild(card);
  });
}

function selectItem(kind, pkg, card) {
  document.querySelectorAll(".package-card").forEach((c) => c.classList.remove("selected"));
  card.classList.add("selected");
  selectedPackage = pkg;
  totalPrice.textContent = `${pkg.price.toLocaleString()} ကျပ်`;
  validateShop();
}

document.querySelectorAll(".pay-methods .pay-btn").forEach((btn) => {
  if (!btn.classList.contains("topup-pay-btn")) {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#shopTab .pay-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedMethod = btn.dataset.method;
      validateShop();
    });
  }
});

[gameIdInput, serverIdInput].forEach((el) => {
  el.addEventListener("input", () => {
    el.value = el.value.replace(/[^0-9]/g, "");
    validateShop();
  });
});

function validateShop() {
  const ok = selectedPackage && selectedMethod && gameIdInput.value.trim() && serverIdInput.value.trim();
  submitBtn.disabled = !ok;
}

submitBtn.addEventListener("click", async () => {
  submitBtn.disabled = true;
  submitBtn.textContent = "တင်နေပါသည်...";

  if (!chatId) {
    tg.showAlert("Telegram user ID ကို မတွေ့ပါ။ Telegram app ထဲကနေ ပြန်ဖွင့်ကြည့်ပါ။");
    submitBtn.disabled = false;
    submitBtn.textContent = "Order တင်မည်";
    return;
  }

  try {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        packageId: selectedPackage.id,
        gameId: gameIdInput.value.trim(),
        serverId: serverIdInput.value.trim(),
        paymentMethod: selectedMethod,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.error === "insufficient_balance") {
        tg.showAlert(
          `Wallet ထဲမှာ ငွေမလုံလောက်ပါ။ လက်ကျန် ${data.balance.toLocaleString()} ကျပ်, လိုအပ်သည် ${data.needed.toLocaleString()} ကျပ်။ Wallet tab ကနေ အရင်ဖြည့်ပါ။`
        );
        submitBtn.disabled = false;
        submitBtn.textContent = "Order တင်မည်";
        return;
      }
      throw new Error(data.error || "Order failed");
    }

    if (data.walletPaid) {
      showProcessingScreen(data);
    } else {
      showPaymentScreen(data, "order");
    }
  } catch (err) {
    tg.showAlert("Order တင်ရာတွင် အမှားရှိနေပါသည်။ ထပ်မံကြိုးစားပါ။");
    submitBtn.disabled = false;
    submitBtn.textContent = "Order တင်မည်";
  }
});

// Wallet ကနေ instant ဝယ်လိုက်ရင် (screenshot မလို) ပြမည့် screen
function showProcessingScreen(data) {
  const { order, newBalance } = data;
  document.getElementById("payTitle").textContent = "Diamond ပေးပို့နေပါသည်";
  document.getElementById("payOrderId").textContent = "Order ID: " + order.id;
  document.getElementById("paySummary").innerHTML = `
    <div class="row"><span>Package</span><span>${order.packageLabel}</span></div>
    <div class="row"><span>Wallet ကနေ နှုတ်ယူ</span><span>${order.price.toLocaleString()} ကျပ်</span></div>
    <div class="row"><span>လက်ကျန်ငွေ</span><span>${newBalance.toLocaleString()} ကျပ်</span></div>
    <div class="row"><span>Game ID</span><span>${order.gameId}</span></div>
    <div class="row"><span>Server</span><span>${order.serverId}</span></div>
  `;
  document.getElementById("payAccountBlock").style.display = "none";
  document.getElementById("payNote").innerHTML =
    "ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ — <strong>Admin</strong> က Diamond ကို Game ID ထဲသို့ မကြာမီ ထည့်သွင်းပေးပါလိမ့်မယ်။";
  document.getElementById("doneBtn").textContent = "ရပါပြီ";
  document.getElementById("orderScreen").style.display = "none";
  document.getElementById("paymentScreen").classList.add("show");
}

// KBZPay/WavePay manual payment screen (Shop order သို့ Wallet top-up နှစ်ခုစလုံးအတွက် သုံးသည်)
function showPaymentScreen(data, context) {
  const { order, payInfo } = data;

  document.getElementById("payTitle").textContent = "Order တင်ပြီးပါပြီ";
  document.getElementById("payOrderId").textContent = "Order ID: " + order.id;

  document.getElementById("paySummary").innerHTML =
    context === "topup"
      ? `<div class="row"><span>Wallet ဖြည့်ငွေ</span><span>${order.amount.toLocaleString()} ကျပ်</span></div>`
      : `
        <div class="row"><span>Package</span><span>${order.packageLabel}</span></div>
        <div class="row"><span>ဈေးနှုန်း</span><span>${order.price.toLocaleString()} ကျပ်</span></div>
        <div class="row"><span>Game ID</span><span>${order.gameId}</span></div>
        <div class="row"><span>Server</span><span>${order.serverId}</span></div>
      `;

  document.getElementById("payAccountBlock").style.display = "block";
  document.getElementById("payMethodLabel").textContent = payInfo.label + " သို့ ငွေလွှဲပါ";
  document.getElementById("payQr").src = payInfo.qrDataUrl;
  document.getElementById("payAccountNumber").textContent = payInfo.number;
  document.getElementById("payAccountName").textContent = payInfo.name;
  document.getElementById("payNote").innerHTML =
    "အထက်ပါ အကောင့်သို့ ငွေလွှဲပြီးရင်၊ ငွေလွှဲပြေစာ screenshot ကို <strong>Bot chat ထဲ</strong>သို့ ပြန်ပို့ပေးပါ။";
  document.getElementById("doneBtn").textContent = "ငွေလွှဲပြီးပါပြီ, Bot Chat ဆီသွားမည်";

  document.getElementById("orderScreen").style.display = "none";
  document.getElementById("paymentScreen").classList.add("show");
}

document.getElementById("copyBtn").addEventListener("click", () => {
  const number = document.getElementById("payAccountNumber").textContent;
  const btn = document.getElementById("copyBtn");
  navigator.clipboard.writeText(number).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1500);
  });
});

document.getElementById("doneBtn").addEventListener("click", () => {
  tg.close();
});

document.getElementById("newOrderBtn").addEventListener("click", () => {
  document.getElementById("paymentScreen").classList.remove("show");
  document.getElementById("orderScreen").style.display = "block";
  submitBtn.disabled = true;
  submitBtn.textContent = "Order တင်မည်";
  document.querySelectorAll(".package-card").forEach((c) => c.classList.remove("selected"));
  document.querySelectorAll("#shopTab .pay-btn").forEach((b) => b.classList.remove("selected"));
  selectedPackage = null;
  selectedMethod = null;
  gameIdInput.value = "";
  serverIdInput.value = "";
  totalPrice.textContent = "— MMK";
  loadWalletMini();
});

// ============================================================
// WALLET TAB
// ============================================================
let selectedTopupAmount = null;
let selectedTopupMethod = null;

const topupGrid = document.getElementById("topupGrid");
const customAmountInput = document.getElementById("customAmount");
const topupSubmitBtn = document.getElementById("topupSubmitBtn");

fetch("/api/topup-presets")
  .then((r) => r.json())
  .then((presets) => {
    topupGrid.innerHTML = "";
    presets.forEach((amt) => {
      const chip = document.createElement("div");
      chip.className = "topup-chip";
      chip.textContent = amt.toLocaleString() + " ကျပ်";
      chip.addEventListener("click", () => {
        document.querySelectorAll(".topup-chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        customAmountInput.value = "";
        selectedTopupAmount = amt;
        validateTopup();
      });
      topupGrid.appendChild(chip);
    });
  });

customAmountInput.addEventListener("input", () => {
  customAmountInput.value = customAmountInput.value.replace(/[^0-9]/g, "");
  document.querySelectorAll(".topup-chip").forEach((c) => c.classList.remove("selected"));
  selectedTopupAmount = customAmountInput.value ? Number(customAmountInput.value) : null;
  validateTopup();
});

document.querySelectorAll(".topup-pay-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".topup-pay-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTopupMethod = btn.dataset.method;
    validateTopup();
  });
});

function validateTopup() {
  topupSubmitBtn.disabled = !(selectedTopupAmount && selectedTopupAmount >= 1000 && selectedTopupMethod);
}

topupSubmitBtn.addEventListener("click", async () => {
  if (!chatId) {
    tg.showAlert("Telegram user ID ကို မတွေ့ပါ။");
    return;
  }
  topupSubmitBtn.disabled = true;
  topupSubmitBtn.textContent = "တင်နေပါသည်...";

  try {
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, amount: selectedTopupAmount, paymentMethod: selectedTopupMethod }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Top-up failed");

    // Shop tab ရဲ့ payment screen ကိုပဲ ပြန်သုံးသည်
    switchTab("shopTab");
    showPaymentScreen(data, "topup");
  } catch (err) {
    tg.showAlert("ငွေဖြည့်ရာတွင် အမှားရှိနေပါသည်။ ထပ်မံကြိုးစားပါ။");
  } finally {
    topupSubmitBtn.disabled = false;
    topupSubmitBtn.textContent = "ငွေဖြည့်မည်";
  }
});

function loadWallet() {
  if (!chatId) return;
  fetch(`/api/wallet?chatId=${chatId}`)
    .then((r) => r.json())
    .then((data) => {
      document.getElementById("walletBalance").textContent = data.balance.toLocaleString();
    });
}

function loadWalletMini() {
  if (!chatId) return;
  fetch(`/api/wallet?chatId=${chatId}`)
    .then((r) => r.json())
    .then((data) => {
      document.getElementById("walletMiniBalance").textContent = data.balance.toLocaleString();
    });
}

// ============================================================
// ORDERS TAB
// ============================================================
const STATUS_LABEL = {
  awaiting_payment: "ငွေလွှဲရန် စောင့်ဆိုင်းနေသည်",
  pending_review: "Admin စစ်ဆေးနေသည်",
  paid_awaiting_delivery: "ငွေရပြီး, ပေးပို့နေသည်",
  completed: "ပြီးစီးပါပြီ",
  rejected: "ငြင်းပယ်ခံရသည်",
};

function loadOrders() {
  if (!chatId) return;
  const list = document.getElementById("ordersList");
  list.innerHTML = `<p class="orders-empty">Order များ Loading လုပ်နေပါသည်...</p>`;

  fetch(`/api/orders?chatId=${chatId}`)
    .then((r) => r.json())
    .then((data) => {
      const orders = data.orders || [];
      if (orders.length === 0) {
        list.innerHTML = `<p class="orders-empty">Order မှတ်တမ်း မရှိသေးပါ။</p>`;
        return;
      }
      list.innerHTML = "";
      orders.forEach((o) => {
        const card = document.createElement("div");
        card.className = "order-card";
        const title = o.type === "topup" ? "Wallet ငွေဖြည့်ခြင်း" : o.packageLabel;
        const amount = o.type === "topup" ? o.amount : o.price;
        const meta =
          o.type === "topup"
            ? `${amount.toLocaleString()} ကျပ် • ${new Date(o.createdAt).toLocaleString("my-MM")}`
            : `${amount.toLocaleString()} ကျပ် • Game ID ${o.gameId} • ${new Date(o.createdAt).toLocaleString("my-MM")}`;

        card.innerHTML = `
          <div class="order-card-top">
            <span class="order-card-title">${title}</span>
            <span class="order-status status-${o.status}">${STATUS_LABEL[o.status] || o.status}</span>
          </div>
          <div class="order-card-meta">${meta}</div>
          <div class="order-card-id">#${o.id}</div>
        `;
        list.appendChild(card);
      });
    });
}

// Shop tab ဖွင့်တာနဲ့ wallet mini balance ကို ပြသည်
loadWalletMini();
