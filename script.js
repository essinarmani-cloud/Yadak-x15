const db = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY
);

let products = [];
let shown = [];
let cart = [];

try {
  cart = JSON.parse(localStorage.getItem("yadakx15-cart") || "[]");
  if (!Array.isArray(cart)) cart = [];
} catch {
  cart = [];
}

const fa = n => Number(n || 0).toLocaleString("fa-IR");

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function loadProducts() {
  const grid = document.getElementById("product-grid");
  if (grid) grid.innerHTML = "<p>در حال دریافت محصولات...</p>";

  const { data, error } = await db
    .from("products")
    .select("id,name,brand,product_code,category,compatible_cars,price,stock,image_url,description,is_active")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Products error:", error);
    if (grid) grid.innerHTML =
      "<p>خطا در دریافت محصولات: " + safe(error.message) + "</p>";
    renderCart();
    return;
  }

  products = (data || []).map(p => ({
    ...p,
    fit: p.compatible_cars || p.description || "اطلاعات محصول",
    icon: "⚙"
  }));

  shown = products.slice();
  renderProducts();
  renderCart();
}

function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  grid.innerHTML = shown.map(p => `
    <article class="product">
      <div class="product-visual">
        ${p.image_url
          ? `<img src="${safe(p.image_url)}" alt="${safe(p.name)}"
             style="width:100%;height:150px;object-fit:contain">`
          : `<span>${p.icon}</span>`}
      </div>
      <h3>${safe(p.name)}</h3>
      <p>${safe(p.brand || "")} ${safe(p.fit || "")}</p>
      <div class="price">${fa(p.price)} <small>تومان</small></div>
      <p>موجودی: ${fa(p.stock)}</p>
      <button class="add"
        onclick="addToCart('${safe(p.id)}')">
        افزودن به سبد خرید +
      </button>
    </article>
  `).join("") || "<p>محصولی پیدا نشد.</p>";
}

function searchProducts() {
  const q = document.getElementById("search").value.trim().toLowerCase();

  shown = products.filter(p =>
    [
      p.name, p.brand, p.category, p.fit, p.product_code
    ].join(" ").toLowerCase().includes(q)
  );

  renderProducts();
  document.getElementById("products").scrollIntoView({ behavior: "smooth" });
}

function filterCategory(category) {
  shown = category === "همه"
    ? products.slice()
    : products.filter(p =>
        String(p.category || "").includes(category)
      );

  renderProducts();
  document.getElementById("products").scrollIntoView({ behavior: "smooth" });
}

function addToCart(id) {
  const product = products.find(p => String(p.id) === String(id));

  if (!product) {
    toast("محصول پیدا نشد");
    return;
  }

  const item = cart.find(x => String(x.id) === String(id));
  const currentQty = item ? Number(item.qty) : 0;

  if (Number(product.stock) <= currentQty) {
    toast("موجودی این محصول کافی نیست");
    return;
  }

  if (item) {
    item.qty++;
  } else {
    cart.push({ id: String(id), qty: 1 });
  }

  saveCart();
  toast("به سبد خرید اضافه شد");
}

function saveCart() {
  localStorage.setItem("yadakx15-cart", JSON.stringify(cart));

  const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const countElement = document.getElementById("cart-count");

  if (countElement) countElement.textContent = fa(count);

  renderCart();
}

function renderCart() {
  const root = document.getElementById("cart-items");
  const totalElement = document.getElementById("cart-total");

  if (!root || !totalElement) return;

  if (cart.length === 0) {
    root.innerHTML = "<p>سبد خرید خالی است.</p>";
    totalElement.textContent = "۰ تومان";
    return;
  }

  let total = 0;

  root.innerHTML = cart.map(item => {
    const product = products.find(
      p => String(p.id) === String(item.id)
    );
if (!product) {
  return `
    <div class="cart-row">
      <span style="color:#b91c1c">
        محصول قدیمی یا غیرفعال
      </span>
      <button onclick="removeItem('${safe(item.id)}')">
        حذف
      </button>
    </div>
    }
    const qty = Number(item.qty || 0);
    const subtotal = Number(product.price || 0) * qty;
    total += subtotal;

    return `
      <div class="cart-row">
        <span>
          ${safe(product.name)}<br>
          ${fa(qty)} × ${fa(product.price)} تومان
        </span>
        <span>
          <b>${fa(subtotal)} تومان</b><br>
          <button onclick="removeItem('${safe(product.id)}')">حذف</button>
        </span>
      </div>
    `;
  }).join("");

  totalElement.textContent = fa(total) + " تومان";
}

function removeItem(id) {
  cart = cart.filter(item => String(item.id) !== String(id));
  saveCart();
  toast("محصول از سبد حذف شد");
}

function toggleCart() {
  const panel = document.getElementById("cart-panel");
  if (panel) panel.classList.toggle("hidden");
  renderCart();
}

function checkout() {
  if (cart.length === 0) {
    toast("سبد خرید شما خالی است");
    return;
  }

  const missingProduct = cart.some(item =>
    !products.some(p => String(p.id) === String(item.id))
  );

  if (missingProduct) {
    toast("لطفاً چند لحظه صبر کنید تا اطلاعات محصولات دریافت شود");
    return;
  }

  let modal = document.getElementById("order-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "order-modal";
    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:#0009;
      z-index:99999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:15px;
      overflow:auto;
    `;

    modal.innerHTML = `
      <div style="
        background:white;
        color:#222;
        padding:22px;
        border-radius:15px;
        width:100%;
        max-width:450px;
        max-height:90vh;
        overflow:auto;
        direction:rtl
      ">
        <h2 style="margin-top:0">ثبت سفارش آنلاین</h2>
        <p>لطفاً اطلاعات خود را وارد کنید.</p>

        <form id="order-form">
          <input name="customer_name"
            placeholder="نام و نام خانوادگی"
            required maxlength="120"
            style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box">

          <input name="phone" type="tel"
            placeholder="شماره موبایل"
            required maxlength="20"
            style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box">

          <input name="city"
            placeholder="شهر"
            required maxlength="100"
            style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box">

          <textarea name="address"
            placeholder="آدرس کامل"
            required maxlength="1000"
            style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"></textarea>

          <textarea name="description"
            placeholder="توضیحات سفارش (اختیاری)"
            maxlength="1000"
            style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"></textarea>

          <button id="submit-order" type="submit"
            style="width:100%;padding:14px;background:#087b45;color:white;border:0;border-radius:8px;margin-top:10px;font-size:16px">
            ثبت نهایی سفارش
          </button>

          <button type="button" onclick="closeOrderForm()"
            style="width:100%;padding:12px;margin-top:8px">
            انصراف
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("order-form")
      .addEventListener("submit", submitOrder);
  } else {
    modal.style.display = "flex";
  }
}

function closeOrderForm() {
  const modal = document.getElementById("order-modal");
  if (modal) modal.remove();
}

async function submitOrder(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = document.getElementById("submit-order");
  const formData = new FormData(form);

  const items = cart.map(item => ({
    product_id: String(item.id),
    quantity: Number(item.qty)
  }));

  button.disabled = true;
  button.textContent = "در حال ثبت سفارش...";

  try {
    const { data: orderId, error } = await db.rpc("create_order", {
      p_customer_name: String(formData.get("customer_name")).trim(),
      p_phone: String(formData.get("phone")).trim(),
      p_city: String(formData.get("city")).trim(),
      p_address: String(formData.get("address")).trim(),
      p_description: String(formData.get("description") || "").trim(),
      p_items: items
    });

    if (error) throw error;

    if (!orderId) {
      throw new Error("کد سفارش از سرور دریافت نشد");
    }

    cart = [];
    saveCart();

    const modal = document.getElementById("order-modal");
    modal.innerHTML = `
      <div style="
        background:white;
        color:#222;
        padding:30px;
        border-radius:15px;
        text-align:center;
        max-width:400px;
        width:100%;
        direction:rtl
      ">
        <h2 style="color:green">سفارش شما ثبت شد</h2>
        <p>از خرید شما سپاسگزاریم.</p>
        <p>کد پیگیری سفارش:</p>
        <b style="font-size:14px;word-break:break-all">${safe(orderId)}</b>
        <p>برای هماهنگی سفارش با شما تماس گرفته خواهد شد.</p>
        <button onclick="closeOrderForm()"
          style="padding:12px 25px;background:#087b45;color:white;border:0;border-radius:8px">
          بستن
        </button>
      </div>
    `;

    modal.style.display = "flex";

    const panel = document.getElementById("cart-panel");
    if (panel) panel.classList.add("hidden");

    // موجودی و محصولات را دوباره از سرور دریافت می‌کنیم
    await loadProducts();

  } catch (error) {
    console.error("Order error:", error);
    toast("خطا در ثبت سفارش: " + (error.message || "خطای نامشخص"));
    button.disabled = false;
    button.textContent = "ثبت نهایی سفارش";
  }
}

function toast(message) {
  const element = document.getElementById("toast");
  if (!element) return;

  element.textContent = message;
  element.style.display = "block";

  setTimeout(() => {
    element.style.display = "none";
  }, 3200);
}

document.addEventListener("DOMContentLoaded", () => {
  saveCart();
  loadProducts();
});
