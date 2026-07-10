const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

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
    card.addEventListener("click", () => selectPackage(pkg, card));
    packageGrid.appendChild(card);
  });
}

function selectPackage(pkg, card) {
  document.querySelectorAll(".package-card").forEach((c) => c.classList.remove("selected"));
  card.classList.add("selected");
  selectedPackage = pkg;
  totalPrice.textContent = `${pkg.price.toLocaleString()} ကျပ်`;
  validate();
}

document.querySelectorAll(".pay-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pay-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedMethod = btn.dataset.method;
    validate();
  });
});

// Game ID / Server ID ထဲကို ဂဏန်းမှလွဲပြီး တခြားစာလုံး ရိုက်လို့မရအောင် filter လုပ်ထားသည်
[gameIdInput, serverIdInput].forEach((el) => {
  el.addEventListener("input", () => {
    el.value = el.value.replace(/[^0-9]/g, "");
    validate();
  });
});

function validate() {
  const ok = selectedPackage && selectedMethod && gameIdInput.value.trim() && serverIdInput.value.trim();
  submitBtn.disabled = !ok;
}

submit_btn_listener();

function submit_btn_listener() {
  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = "တင်နေပါသည်...";

    const chatId = tg.initDataUnsafe?.user?.id;
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

      if (!res.ok) throw new Error(data.error || "Order failed");

      showPaymentScreen(data);
    } catch (err) {
      tg.showAlert("Order တင်ရာတွင် အမှားရှိနေပါသည်။ ထပ်မံကြိုးစားပါ။");
      submitBtn.disabled = false;
      submitBtn.textContent = "Order တင်မည်";
    }
  });
}

// NEW: alert+close အစား Mini App ထဲမှာပဲ ငွေလွှဲအချက်အလက် screen ပြသည်
function showPaymentScreen(data) {
  const { order, payInfo } = data;

  document.getElementById("payOrderId").textContent = "Order ID: " + order.id;

  document.getElementById("paySummary").innerHTML = `
    <div class="row"><span>Package</span><span>${order.packageLabel}</span></div>
    <div class="row"><span>ဈေးနှုန်း</span><span>${order.price.toLocaleString()} ကျပ်</span></div>
    <div class="row"><span>Game ID</span><span>${order.gameId}</span></div>
    <div class="row"><span>Server</span><span>${order.serverId}</span></div>
  `;

  document.getElementById("payMethodLabel").textContent = payInfo.label + " သို့ ငွေလွှဲပါ";
  document.getElementById("payAccountNumber").textContent = payInfo.number;
  document.getElementById("payAccountName").textContent = payInfo.name;

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
  // Bot chat ထဲကို ပြန်ခေါ်ပြီး Mini App ကိုပိတ်သည် — user က screenshot ကို chat ထဲမှာ ပို့ရမည်
  tg.close();
});

document.getElementById("newOrderBtn").addEventListener("click", () => {
  document.getElementById("paymentScreen").classList.remove("show");
  document.getElementById("orderScreen").style.display = "block";
  submitBtn.disabled = true;
  submitBtn.textContent = "Order တင်မည်";
  document.querySelectorAll(".package-card").forEach((c) => c.classList.remove("selected"));
  document.querySelectorAll(".pay-btn").forEach((b) => b.classList.remove("selected"));
  selectedPackage = null;
  selectedMethod = null;
  gameIdInput.value = "";
  serverIdInput.value = "";
  totalPrice.textContent = "— MMK";
});
