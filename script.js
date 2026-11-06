
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
    const p = products.find(
      p => String(p.id) === String(x.id)
    );

    if (!p) {
      return `<div class="cart-row">
        <span>در حال دریافت اطلاعات محصول...</span>
      </div>`;
    }

    return `
      <div class="cart-row">
        <span>${p.name}<br>
          ${fa(x.qty)} × ${fa(p.price)} تومان
        </span>
        <span>
          <b>${fa(x.qty * p.price)}</b><br>
          <button onclick="removeItem('${String(p.id)}')">حذف</button>
        </span>
      </div>
    `;
  }).join("") || "<p>سبد خرید خالی است.</p>";

  document.getElementById("cart-total").textContent =
    fa(cart.reduce((s, x) => {
      const p = products.find(
        p => String(p.id) === String(x.id)
      );
      return s + (p ? p.price * x.qty : 0);
    }, 0)) + " تومان";
}
}

  if (!document.getElementById("order-modal")) {
    const modal = document.createElement("div");
    modal.id = "order-modal";
    modal.style.cssText = `
      position:fixed;inset:0;background:#0009;z-index:99999;
      display:flex;align-items:center;justify-content:center;
      padding:15px;overflow:auto;
    `;

    modal.innerHTML = `
      <div style="background:white;color:#222;padding:22px;border-radius:15px;
      width:100%;max-width:450px;max-height:90vh;overflow:auto;direction:rtl">
        <h2 style="margin-top:0">ثبت سفارش آنلاین</h2>
        <p>لطفاً اطلاعات خود را وارد کنید.</p>

        <form id="order-form">
          <input name="customer_name" placeholder="نام و نام خانوادگی"
          required maxlength="120"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box">

          <input name="phone" type="tel" placeholder="شماره موبایل"
          required maxlength="20"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box">

          <input name="city" placeholder="شهر"
          required maxlength="100"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box">

          <textarea name="address" placeholder="آدرس کامل"
          required maxlength="1000"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"></textarea>

          <textarea name="description" placeholder="توضیحات سفارش (اختیاری)"
          maxlength="1000"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"></textarea>

          <button id="submit-order" type="submit"
          style="width:100%;padding:14px;background:#087b45;color:white;
          border:0;border-radius:8px;margin-top:10px;font-size:16px">
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
    document.getElementById("order-form").addEventListener("submit", submitOrder);
  }

  document.getElementById("order-modal").style.display = "flex";
}

function closeOrderForm() {
  const modal = document.getElementById("order-modal");
  if (modal) modal.remove();
}

// ارسال سفارش به Supabase
async function submitOrder(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = document.getElementById("submit-order");
  const data = new FormData(form);

  const items = cart.map(item => ({
    product_id: Number(item.id),
    quantity: Number(item.qty)
  }));

  button.disabled = true;
  button.textContent = "در حال ثبت سفارش...";

  const { data: orderId, error } = await db.rpc("create_order", {
    p_customer_name: String(data.get("customer_name")).trim(),
    p_phone: String(data.get("phone")).trim(),
    p_city: String(data.get("city")).trim(),
    p_address: String(data.get("address")).trim(),
    p_description: String(data.get("description") || "").trim(),
    p_items: items
  });

  if (error) {
    console.error("Order error:", error);
    toast("خطا در ثبت سفارش: " + error.message);
    button.disabled = false;
    button.textContent = "ثبت نهایی سفارش";
    return;
  }

  cart = [];
  saveCart();

  document.getElementById("order-modal").innerHTML = `
    <div style="background:white;color:#222;padding:30px;border-radius:15px;
    text-align:center;max-width:400px;width:100%;direction:rtl">
      <h2 style="color:green">سفارش شما ثبت شد</h2>
      <p>از خرید شما سپاسگزاریم.</p>
      <p>کد پیگیری سفارش:</p>
      <b style="font-size:14px;word-break:break-all">${orderId}</b>
      <p>برای هماهنگی سفارش با شما تماس گرفته خواهد شد.</p>
      <button onclick="closeOrderForm()"
      style="padding:12px 25px;background:#087b45;color:white;border:0;
      border-radius:8px">بستن</button>
    </div>
  `;

  document.getElementById("order-modal").style.display = "flex";
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
