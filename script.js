const db = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY
);

let products = [];
let shown = [];
let cart = JSON.parse(localStorage.getItem("yadakx15-cart") || "[]");

const fa = n => Number(n || 0).toLocaleString("fa-IR");

async function loadProducts() {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = "<p>در حال دریافت محصولات...</p>";

  const { data, error } = await db
    .from("products")
    .select("id,name,brand,product_code,category,compatible_cars,price,stock,image_url,description,is_active")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) {
    grid.innerHTML = "<p>خطا در دریافت محصولات: " + error.message + "</p>";
    return;
  }

  products = (data || []).map(p => ({
    ...p,
    fit: p.compatible_cars || p.description || "اطلاعات محصول",
    icon: "⚙"
  }));

  shown = products.slice();
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("product-grid");

  grid.innerHTML = shown.map(p => `
    <article class="product">
      <div class="product-visual">
        ${p.image_url
          ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:150px;object-fit:contain">`
          : `<span>${p.icon}</span>`}
      </div>
      <h3>${p.name}</h3>
      <p>${p.brand || ""} ${p.fit || ""}</p>
      <div class="price">${fa(p.price)} <small>تومان</small></div>
      <p>موجودی: ${fa(p.stock)}</p>
      <button class="add" onclick="addToCart('${String(p.id).replace(/'/g, "\\'")}')">
        افزودن به سبد خرید +
      </button>
    </article>
  `).join("") || "<p>محصولی پیدا نشد.</p>";
}

function searchProducts() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  shown = products.filter(p =>
    [p.name, p.brand, p.category, p.fit, p.product_code]
      .join(" ").toLowerCase().includes(q)
  );
  renderProducts();
  document.getElementById("products").scrollIntoView({behavior:"smooth"});
}

function filterCategory(c) {
  shown = c === "همه"
    ? products.slice()
    : products.filter(p => p.category === c);
  renderProducts();
  document.getElementById("products").scrollIntoView({behavior:"smooth"});
}

function addToCart(id) {
  const item = cart.find(x => String(x.id) === String(id));
  if (item) item.qty++;
  else cart.push({id, qty:1});
  saveCart();
  toast("به سبد خرید اضافه شد");
}

function saveCart() {
  localStorage.setItem("yadakx15-cart", JSON.stringify(cart));
  document.getElementById("cart-count").textContent =
    fa(cart.reduce((s,x) => s+x.qty, 0));
  renderCart();
}

function renderCart() {
  const root = document.getElementById("cart-items");
  root.innerHTML = cart.map(x => {
    const p = products.find(p => String(p.id) === String(x.id));
    if (!p) return "";
    return `
      <div class="cart-row">
        <span>${p.name}<br>${fa(x.qty)} × ${fa(p.price)} تومان</span>
        <span><b>${fa(x.qty*p.price)}</b><br>
        <button onclick="removeItem('${String(p.id).replace(/'/g, "\\'")}')">حذف</button></span>
      </div>`;
  }).join("") || "<p>سبد خرید خالی است.</p>";

  document.getElementById("cart-total").textContent =
    fa(cart.reduce((s,x) => {
      const p = products.find(p => String(p.id) === String(x.id));
      return s + (p ? p.price*x.qty : 0);
    }, 0)) + " تومان";
}

function removeItem(id) {
  cart = cart.filter(x => String(x.id) !== String(id));
  saveCart();
}

function toggleCart() {
  document.getElementById("cart-panel").classList.toggle("hidden");
}

function checkout() {
  if (!cart.length) {
    toast("سبد خرید خالی است");
    return;
  }
  toast("برای ثبت سفارش واقعی باید سیستم سفارش و پرداخت متصل شود.");
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 3200);
}

document.addEventListener("DOMContentLoaded", () => {
  saveCart();
  loadProducts();
});
