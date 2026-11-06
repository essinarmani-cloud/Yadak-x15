
/* =====================================
   YADAK X15 - Main Script
   نسخه جدید با فیلتر خودرو
===================================== */

const db = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY
);

let products = [];
let shown = [];
let cart = [];

let activeCategory = "همه";
let activeVehicle = "";

/* =====================================
   سبد خرید
===================================== */

try {
  cart = JSON.parse(
    localStorage.getItem("yadakx15-cart") || "[]"
  );

  if (!Array.isArray(cart)) cart = [];
} catch (error) {
  cart = [];
}

const fa = n =>
  Number(n || 0).toLocaleString("fa-IR");

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/* =====================================
   یکسان سازی متن فارسی
===================================== */

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

/* =====================================
   استخراج خودروهای محصولات
===================================== */

function getVehicleList(product) {
  const value = product.compatible_cars || "";

  const cars = Array.isArray(value)
    ? value
    : String(value).split(/[,،;؛|\n]+/);

  return cars
    .map(car => String(car).trim())
    .filter(Boolean);
}

/* =====================================
   ساخت فیلتر خودرو در صفحه
===================================== */

function createVehicleFilter() {
  const grid = document.getElementById("product-grid");

  if (!grid) return;

  let filterBox = document.getElementById("vehicle-filter");

  if (!filterBox) {
    filterBox = document.createElement("div");
    filterBox.id = "vehicle-filter";

    filterBox.style.cssText = `
      background:#fff;
      border:1px solid #e2e8f0;
      border-radius:14px;
      padding:15px;
      margin:15px 0;
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      align-items:center;
    `;

    filterBox.innerHTML = `
      <div style="flex:1;min-width:180px">
        <label for="vehicle-select"
          style="display:block;margin-bottom:7px;font-weight:bold">
          🚗 قطعه مناسب خودروی خودت را پیدا کن
        </label>

        <select id="vehicle-select"
          style="width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit">

          <option value="">همه خودروها</option>

        </select>
      </div>

      <button id="clear-filters"
        type="button"
        style="padding:12px 18px;background:#334155;color:white;border:0;border-radius:9px;cursor:pointer">
        پاک کردن فیلترها
      </button>

      <small id="vehicle-help"
        style="width:100%;color:#64748b">
        خودروی خودت را انتخاب کن تا قطعات سازگار نمایش داده شوند.
      </small>
    `;

    grid.parentNode.insertBefore(filterBox, grid);

    document.getElementById("vehicle-select")
      .addEventListener("change", event => {
        activeVehicle = event.target.value;
        applyFilters();
      });

    document.getElementById("clear-filters")
      .addEventListener("click", clearFilters);
  }

  updateVehicleOptions();
}

/* =====================================
   به روزرسانی فهرست خودروها
===================================== */

function updateVehicleOptions() {
  const select = document.getElementById("vehicle-select");

  if (!select) return;

  const vehicles = new Map();

  products.forEach(product => {
    getVehicleList(product).forEach(car => {
      const key = normalize(car);

      if (key && !vehicles.has(key)) {
        vehicles.set(key, car);
      }
    });
  });

  const sortedVehicles = [...vehicles.values()]
    .sort((a, b) => a.localeCompare(b, "fa"));

  select.innerHTML = `
    <option value="">همه خودروها</option>
    ${sortedVehicles.map(car => `
      <option value="${safe(car)}"
        ${normalize(car) === normalize(activeVehicle) && activeVehicle ? "selected" : ""}>
        ${safe(car)}
      </option>
    `).join("")}
  `;

  const help = document.getElementById("vehicle-help");

  if (help) {
    help.textContent = sortedVehicles.length
      ? "خودروی خودت را انتخاب کن تا قطعات سازگار نمایش داده شوند."
      : "هنوز خودروی سازگاری برای محصولات ثبت نشده است. از پنل مدیریت مشخصات خودرو را وارد کن.";
  }
}

/* =====================================
   دریافت محصولات از Supabase
===================================== */

async function loadProducts() {
  const grid = document.getElementById("product-grid");

  if (grid) {
    grid.innerHTML = "<p>در حال دریافت محصولات...</p>";
  }

  const { data, error } = await db
    .from("products")
    .select(`
      id,
      name,
      brand,
      product_code,
      category,
      compatible_cars,
      price,
      stock,
      image_url,
      description,
      is_active
    `)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Products error:", error);

    if (grid) {
      grid.innerHTML =
        "<p>خطا در دریافت محصولات: " +
        safe(error.message) +
        "</p>";
    }

    renderCart();
    return;
  }

  products = (data || []).map(p => ({
    ...p,
    fit: p.compatible_cars || p.description || "اطلاعات محصول",
    icon: "⚙"
  }));

  const validIds = new Set(
    products.map(p => String(p.id))
  );

  cart = cart.filter(item =>
    validIds.has(String(item.id))
  );

  localStorage.setItem(
    "yadakx15-cart",
    JSON.stringify(cart)
  );

  createVehicleFilter();
  applyFilters();
  saveCart();
}

/* =====================================
   اعمال تمام فیلترها
===================================== */

function applyFilters() {
  const search = document.getElementById("search");

  const q = normalize(search ? search.value : "");
  const vehicle = normalize(activeVehicle);

  shown = products.filter(p => {

    const text = normalize([
      p.name,
      p.brand,
      p.category,
      p.compatible_cars,
      p.description,
      p.product_code
    ].join(" "));

    const matchSearch = !q || text.includes(q);

    const matchCategory =
      activeCategory === "همه" ||
      normalize(p.category).includes(normalize(activeCategory));

    const matchVehicle =
      !vehicle ||
      getVehicleList(p).some(car =>
        normalize(car) === vehicle
      );

    return matchSearch && matchCategory && matchVehicle;
  });

  renderProducts();
}

/* =====================================
   نمایش محصولات
===================================== */

function renderProducts() {
  const grid = document.getElementById("product-grid");

  if (!grid) return;

  grid.innerHTML = shown.map(p => `
    <article class="product">

      <div class="product-visual">
        ${
          p.image_url
            ? `<img
                src="${safe(p.image_url)}"
                alt="${safe(p.name)}"
                style="width:100%;height:150px;object-fit:contain"
              >`
            : `<span>${p.icon}</span>`
        }
      </div>

      <h3>${safe(p.name)}</h3>

      <p>
        ${safe(p.brand || "")}
        ${safe(p.fit || "")}
      </p>

      <div class="price">
        ${fa(p.price)}
        <small>تومان</small>
      </div>

      <p>موجودی: ${fa(p.stock)}</p>

      <button class="add"
        onclick="addToCart('${safe(p.id)}')"
        ${Number(p.stock) <= 0 ? "disabled" : ""}>
        ${Number(p.stock) <= 0 ? "ناموجود" : "افزودن به سبد خرید +"}
      </button>

    </article>
  `).join("") || "<p>محصولی پیدا نشد.</p>";
}

/* =====================================
   جستجوی محصولات
===================================== */

function searchProducts() {
  applyFilters();

  const section = document.getElementById("products");

  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
}

/* =====================================
   فیلتر دسته بندی
===================================== */

function filterCategory(category) {
  activeCategory = category || "همه";

  applyFilters();

  const section = document.getElementById("products");

  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
}

/* =====================================
   پاک کردن فیلترها
===================================== */

function clearFilters() {
  activeCategory = "همه";
  activeVehicle = "";

  const search = document.getElementById("search");
  const select = document.getElementById("vehicle-select");

  if (search) search.value = "";
  if (select) select.value = "";

  applyFilters();

  toast("فیلترها پاک شدند");
}

/* =====================================
   افزودن به سبد خرید
===================================== */

function addToCart(id) {
  const product = products.find(
    p => String(p.id) === String(id)
  );

  if (!product) {
    toast("محصول پیدا نشد");
    return;
  }

  const item = cart.find(
    x => String(x.id) === String(id)
  );

  const currentQty = item
    ? Number(item.qty)
    : 0;

  if (Number(product.stock) <= currentQty) {
    toast("موجودی این محصول کافی نیست");
    return;
  }

  if (item) {
    item.qty++;
  } else {
    cart.push({
      id: String(id),
      qty: 1
    });
  }

  saveCart();
  toast("به سبد خرید اضافه شد");
}

/* =====================================
   ذخیره سبد خرید
===================================== */

function saveCart() {
  localStorage.setItem(
    "yadakx15-cart",
    JSON.stringify(cart)
  );

  const count = cart.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0
  );

  const countElement =
    document.getElementById("cart-count");

  if (countElement) {
    countElement.textContent = fa(count);
  }

  renderCart();
}

/* =====================================
   نمایش سبد خرید
===================================== */

function renderCart() {
  const root = document.getElementById("cart-items");
  const totalElement =
    document.getElementById("cart-total");

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
          <span>در حال دریافت اطلاعات محصول...</span>
        </div>
      `;
    }

    const qty = Number(item.qty || 0);
    const subtotal =
      Number(product.price || 0) * qty;

    total += subtotal;

    return `
      <div class="cart-row">

        <span>
          ${safe(product.name)}<br>
          ${fa(qty)} × ${fa(product.price)} تومان
        </span>

        <span>
          <b>${fa(subtotal)} تومان</b><br>

          <button onclick="removeItem('${safe(product.id)}')">
            حذف
          </button>
        </span>

      </div>
    `;
  }).join("");

  totalElement.textContent =
    fa(total) + " تومان";
}

/* =====================================
   حذف محصول از سبد
===================================== */

function removeItem(id) {
  cart = cart.filter(
    item => String(item.id) !== String(id)
  );

  saveCart();
  toast("محصول از سبد حذف شد");
}

/* =====================================
   باز و بسته کردن سبد خرید
===================================== */

function toggleCart() {
  const panel =
    document.getElementById("cart-panel");

  if (panel) {
    panel.classList.toggle("hidden");
  }

  renderCart();
}

/* =====================================
   باز کردن فرم ثبت سفارش
===================================== */

function checkout() {
  if (cart.length === 0) {
    toast("سبد خرید شما خالی است");
    return;
  }

  const missingProduct = cart.some(item =>
    !products.some(
      p => String(p.id) === String(item.id)
    )
  );

  if (missingProduct) {
    toast("اطلاعات محصولات کامل دریافت نشده است");
    return;
  }

  let modal =
    document.getElementById("order-modal");

  if (modal) {
    modal.style.display = "flex";
    return;
  }

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
      direction:rtl;
    ">

      <h2>ثبت سفارش آنلاین</h2>

      <p>لطفاً اطلاعات خود را وارد کنید.</p>

      <form id="order-form">

        <input
          name="customer_name"
          placeholder="نام و نام خانوادگی"
          required
          maxlength="120"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"
        >

        <input
          name="phone"
          type="tel"
          placeholder="شماره موبایل"
          required
          maxlength="20"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"
        >

        <input
          name="city"
          placeholder="شهر"
          required
          maxlength="100"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"
        >

        <textarea
          name="address"
          placeholder="آدرس کامل"
          required
          maxlength="1000"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"
        ></textarea>

        <textarea
          name="description"
          placeholder="توضیحات سفارش (اختیاری)"
          maxlength="1000"
          style="width:100%;padding:12px;margin:7px 0;box-sizing:border-box"
        ></textarea>

        <button
          id="submit-order"
          type="submit"
          style="width:100%;padding:14px;background:#087b45;color:white;border:0;border-radius:8px;margin-top:10px"
        >
          ثبت نهایی سفارش
        </button>

        <button
          type="button"
          onclick="closeOrderForm()"
          style="width:100%;padding:12px;margin-top:8px"
        >
          انصراف
        </button>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("order-form")
    .addEventListener("submit", submitOrder);
}

/* =====================================
   بستن فرم سفارش
===================================== */

function closeOrderForm() {
  const modal =
    document.getElementById("order-modal");

  if (modal) {
    modal.remove();
  }
}

/* =====================================
   ثبت سفارش در Supabase
===================================== */

async function submitOrder(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const button =
    document.getElementById("submit-order");

  const formData = new FormData(form);

  const items = cart.map(item => ({
    product_id: String(item.id),
    quantity: Number(item.qty)
  }));

  button.disabled = true;
  button.textContent = "در حال ثبت سفارش...";

  try {
    const { data: orderId, error } =
      await db.rpc("create_order", {

        p_customer_name:
          String(formData.get("customer_name")).trim(),

        p_phone:
          String(formData.get("phone")).trim(),

        p_city:
          String(formData.get("city")).trim(),

        p_address:
          String(formData.get("address")).trim(),

        p_description:
          String(formData.get("description") || "").trim(),

        p_items: items

      });

    if (error) throw error;

    if (!orderId) {
      throw new Error(
        "کد سفارش از سرور دریافت نشد"
      );
    }

    cart = [];
    saveCart();

    const modal =
      document.getElementById("order-modal");

    modal.innerHTML = `
      <div style="
        background:white;
        color:#222;
        padding:30px;
        border-radius:15px;
        text-align:center;
        max-width:400px;
        width:100%;
        direction:rtl;
      ">

        <h2 style="color:green">
          سفارش شما ثبت شد
        </h2>

        <p>از خرید شما سپاسگزاریم.</p>

        <p>کد پیگیری سفارش:</p>

        <b style="font-size:14px;word-break:break-all">
          ${safe(orderId)}
        </b>

        <p>
          برای هماهنگی سفارش با شما تماس گرفته خواهد شد.
        </p>

        <button
          onclick="closeOrderForm()"
          style="padding:12px 25px;background:#087b45;color:white;border:0;border-radius:8px"
        >
          بستن
        </button>

      </div>
    `;

    modal.style.display = "flex";

    const panel =
      document.getElementById("cart-panel");

    if (panel) {
      panel.classList.add("hidden");
    }

    await loadProducts();

  } catch (error) {
    console.error("Order error:", error);

    toast(
      "خطا در ثبت سفارش: " +
      (error.message || "خطای نامشخص")
    );

    button.disabled = false;
    button.textContent = "ثبت نهایی سفارش";
  }
}

/* =====================================
   پیام های سایت
===================================== */

function toast(message) {
  const element =
    document.getElementById("toast");

  if (!element) {
    alert(message);
    return;
  }

  element.textContent = message;
  element.style.display = "block";

  setTimeout(() => {
    element.style.display = "none";
  }, 3200);
}

/* =====================================
   اتصال توابع به HTML
===================================== */

window.addToCart = addToCart;
window.removeItem = removeItem;
window.toggleCart = toggleCart;
window.checkout = checkout;
window.closeOrderForm = closeOrderForm;
window.searchProducts = searchProducts;
window.filterCategory = filterCategory;
window.clearFilters = clearFilters;

/* =====================================
   شروع سایت
===================================== */

document.addEventListener("DOMContentLoaded", () => {
  saveCart();
  loadProducts();

  const search = document.getElementById("search");

  if (search) {
    search.addEventListener("input", applyFilters);
  }
});
