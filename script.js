const products = [
 {id:1,name:"لنت ترمز جلو",category:"لنت ترمز",fit:"نمونه سازگار با خودروهای منتخب",price:1850000,icon:"◉"},
 {id:2,name:"تسمه تایم EF7",category:"تسمه تایم",fit:"مناسب برخی مدل‌های سمند و دنا",price:1290000,icon:"〰"},
 {id:3,name:"شمع موتور",category:"شمع",fit:"انتخاب براساس کد فنی خودرو",price:650000,icon:"ϟ"},
 {id:4,name:"فیلتر روغن",category:"فیلتر",fit:"برای خودروهای منتخب",price:380000,icon:"▤"},
 {id:5,name:"روغن موتور",category:"روغن",fit:"ویسکوزیته را بررسی کنید",price:2950000,icon:"▥"},
 {id:6,name:"فیلتر هوا",category:"فیلتر",fit:"انتخاب براساس مدل خودرو",price:420000,icon:"▦"},
 {id:7,name:"لنت ترمز عقب",category:"لنت ترمز",fit:"سازگاری را پیش از خرید بررسی کنید",price:1150000,icon:"◉"},
 {id:8,name:"تسمه دینام",category:"تسمه تایم",fit:"کد فنی قبل از خرید بررسی شود",price:540000,icon:"〰"}
];
let cart = JSON.parse(localStorage.getItem("yadakx15-cart") || "[]");
let shown = products.slice();
const fa = n => n.toLocaleString("fa-IR");
function renderProducts(){
 const grid=document.getElementById("product-grid");
 grid.innerHTML=shown.map(p=>`<article class="product"><div class="product-visual"><span class="tag">محصول نمونه</span>${p.icon}</div><h3>${p.name}</h3><p>${p.fit}</p><div class="price">${fa(p.price)} <small>تومان</small></div><button class="add" onclick="addToCart(${p.id})">افزودن به سبد خرید +</button></article>`).join("") || "<p>محصولی پیدا نشد.</p>";
}
function searchProducts(){const q=document.getElementById("search").value.trim().toLowerCase();shown=products.filter(p=>(p.name+" "+p.category+" "+p.fit).toLowerCase().includes(q));renderProducts();document.getElementById("products").scrollIntoView({behavior:"smooth"});}
function filterCategory(c){shown=c==="همه"?products.slice():products.filter(p=>p.category===c);renderProducts();document.getElementById("products").scrollIntoView({behavior:"smooth"});}
function addToCart(id){const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});saveCart();toast("به سبد خرید اضافه شد");}
function saveCart(){localStorage.setItem("yadakx15-cart",JSON.stringify(cart));document.getElementById("cart-count").textContent=fa(cart.reduce((s,x)=>s+x.qty,0));renderCart();}
function renderCart(){const root=document.getElementById("cart-items");root.innerHTML=cart.map(x=>{const p=products.find(p=>p.id===x.id);return `<div class="cart-row"><span>${p.name}<br>${fa(x.qty)} × ${fa(p.price)} تومان</span><span><b>${fa(x.qty*p.price)}</b><br><button onclick="removeItem(${p.id})">حذف</button></span></div>`}).join("")||"<p>سبد خرید خالی است.</p>";document.getElementById("cart-total").textContent=fa(cart.reduce((s,x)=>s+products.find(p=>p.id===x.id).price*x.qty,0))+" تومان";}
function removeItem(id){cart=cart.filter(x=>x.id!==id);saveCart();}
function toggleCart(){document.getElementById("cart-panel").classList.toggle("hidden");}
function checkout(){if(!cart.length){toast("سبد خرید خالی است");return;}toast("این نسخه نمایشی است؛ برای ثبت سفارش و پرداخت واقعی باید بک‌اند و درگاه پرداخت متصل شود.");}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.style.display="block";setTimeout(()=>el.style.display="none",3200);}
renderProducts();saveCart();
