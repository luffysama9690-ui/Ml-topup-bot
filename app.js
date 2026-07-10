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

[gameIdInput, serverIdInput].forEach((el) => el.addEventListener("input", validate));

function validate() {
  const ok = selectedPackage && selectedMethod && gameIdInput.value.trim() && serverIdInput.value.trim();
  submitBtn.disabled = !ok;
}

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

    tg.showAlert(
      `Order တင်ပြီးပါပြီ! ${data.payInfo.label} ${data.payInfo.number} (${data.payInfo.name}) ကို ငွေလွှဲပြီး Bot chat ထဲမှာ screenshot ပို့ပေးပါ။`,
      () => tg.close()
    );
  } catch (err) {
    tg.showAlert("Order တင်ရာတွင် အမှားရှိနေပါသည်။ ထပ်မံကြိုးစားပါ။");
    submitBtn.disabled = false;
    submitBtn.textContent = "Order တင်မည်";
  }
});
