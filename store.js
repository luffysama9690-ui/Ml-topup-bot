const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "orders.json");

function readAll() {
  if (!fs.existsSync(DB_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeAll(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function createOrder(order) {
  const all = readAll();
  all[order.id] = order;
  writeAll(all);
  return order;
}

function getOrder(id) {
  const all = readAll();
  return all[id];
}

function updateOrder(id, patch) {
  const all = readAll();
  if (!all[id]) return null;
  all[id] = { ...all[id], ...patch };
  writeAll(all);
  return all[id];
}

module.exports = { createOrder, getOrder, updateOrder };
