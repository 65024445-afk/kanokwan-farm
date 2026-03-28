                            // ===== SCRIPT.JS ===== //

// ===== CONNECT DATABASE ===== //
const API_BASE = 'http://10.0.2.2/kanokwan_farm/backend/api/';

function getImagePath(name) {
    if (!name) return 'no-image.png';

    if (name.includes('.')) {
        return name;
    }

    // ใช้ webp เป็นหลัก //
    return name + '.webp';
}

// ===== STATE =====
let currentUser = null;
let cart = [];
let products = [];
let currentProduct = null;
let isRegisterMode = false;
let pageHistory = ['home'];

// ตัวเช็ค login //
function requireLogin() {
    if (!currentUser) {
        showToast("กรุณาเข้าสู่ระบบก่อน");
        document.getElementById('page-auth').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
        return false;
    }
    return true;
}

// ===== สลับโหมดเข้าสู่ระบบ ===== //
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;

    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-submit');
    const text = document.getElementById('switch-text');
    const link = document.querySelector('.switch-link a');
    const fields1 = document.getElementById('register-fields');
    const fields2 = document.getElementById('register-fields2');
    const card = document.querySelector('.login-card');

    // reset animation //
    card.classList.remove('fade-slide', 'slide-left', 'slide-right', 'scale-in');
    void card.offsetWidth;

    if (isRegisterMode) {

        // animation ไป register //
        card.classList.add('slide-left', 'scale-in', 'register-mode');

        title.textContent = 'สมัครสมาชิก';
        btn.textContent = 'สมัครสมาชิก';
        text.textContent = 'มีบัญชีแล้ว?';
        link.textContent = 'เข้าสู่ระบบ';

        fields1.style.display = 'flex';
        fields2.style.display = 'block';

    } else {

        // animation กลับ login //
        card.classList.add('slide-right', 'scale-in');
        card.classList.remove('register-mode');

        title.textContent = 'เข้าสู่ระบบ';
        btn.textContent = 'เข้าสู่ระบบ';
        text.textContent = 'ยังไม่มีบัญชี?';
        link.textContent = 'สมัครสมาชิก';

        fields1.style.display = 'none';
        fields2.style.display = 'none';
    }
}

// ===== LOGIN + REGISTER ===== //
async function handleAuth() {

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        showToast('กรุณากรอกข้อมูล');
        return;
    }

    const action = isRegisterMode ? 'register' : 'login';

    let bodyData = {
        action: action,
        email: email,
        password: password
    };

    try {
        const res = await fetch(API_BASE + 'user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await res.json();

        if (data.success) {
            showToast(isRegisterMode ? 'สมัครสมาชิกสำเร็จ' : 'เข้าสู่ระบบสำเร็จ');

            if (!isRegisterMode) {

                localStorage.clear();

                currentUser = data.user;

                localStorage.setItem('user', JSON.stringify(currentUser));

                await enterApp();
                showPage('home');
            } else {
                toggleAuthMode();
            }
        }
            else {
                showToast(data.message || 'เกิดข้อผิดพลาด');
            }

            } catch (err) {
                console.error(err);
                showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
            }
}

async function enterApp() {
    document.getElementById('page-auth').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';

    pageHistory = ['home'];

    if (!productCache) {
        loadHome();
    }

    updateProfileUI();

    await loadPoints(); // รอให้ได้แต้มก่อน //
}

// ===== SEARCH PRODUCT ===== //
function searchProducts(keyword) {

    keyword = keyword.toLowerCase();

    //  ถ้าว่าง = แสดงทั้งหมด //
    if (!keyword) {
        renderProducts(products);
        return;
    }

    //  ค้นหา ชื่อ + ประเภท //
    const filtered = products.filter(p =>
        p.product_name.toLowerCase().includes(keyword) ||
        p.product_tag_name.toLowerCase().includes(keyword)
    );

    //  ไม่พบสินค้าแสดง //
    if (filtered.length === 0) {
        const grid = document.getElementById('product-grid');

        grid.classList.add('empty');

        grid.innerHTML = `
            <div class="no-product">
                <div class="icon">🔍</div>
                <div>ไม่พบสินค้า</div>
                <small>ลองค้นหาคำอื่น</small>
            </div>
        `;
        return;
    }
}

// ===== LOAD PRODUCTS HOMEPAGE ===== //
let productCache = null;

async function loadHome() {
    console.log("PRODUCTS:", products);
    const grid = document.getElementById('product-grid');
    grid.classList.remove('empty');

    if (!productCache) {
        grid.innerHTML = `
            <div class="loading-full">
                <div class="loading-box">
                    <div class="loading-icon">⏳</div>
                    <div>กำลังโหลดสินค้า...</div>
                </div>
            </div>
        `;
    }

    if (productCache && productCache.length > 0) {
        products = productCache;
        renderCategories(products);
        renderProducts(products);
        return;
    }

    try {
        const res = await fetch(API_BASE + 'product.php');
        const data = await res.json();

        console.log("API DATA:", data);

        products = data.data || data;
        productCache = products;

        products.slice(0, 8).forEach(p => {
            const img = new Image();
            img.fetchPriority = "high";
            img.src = "http://10.0.2.2/kanokwan_farm/images/" + getImagePath(p.product_img);
        });

        renderCategories(products);
        renderProducts(products);

    } catch (err) {
        console.error(err);

        grid.innerHTML = `
            <div style="text-align:center;padding:40px;color:red;">
                โหลดสินค้าไม่สำเร็จ
            </div>
        `;

        showToast('โหลดสินค้าไม่สำเร็จ');
    }

    renderProducts(products);
}

// ===== CATEGORY ===== //
function renderCategories(items) {

    const iconMap = {
        "หมู": "🐷",
        "ไก่": "🐔",
        "ไข่": "🥚"
    };

    const tags = [...new Map(items.map(p => [p.product_tag_id, p])).values()];

    let html = `
        <div class="cat-item active" onclick="filterByTag(0, this)">
            <div class="icon">🏪</div>
            <span>ทั้งหมด</span>
        </div>
    `;

    html += tags.map(t => `
        <div class="cat-item" onclick="filterByTag(${t.product_tag_id}, this)">
            <div class="icon">${iconMap[t.product_tag_name] || '📦'}</div>
            <span>${t.product_tag_name}</span>
        </div>
    `).join('');

    document.getElementById('categories').innerHTML = html;
}

// ===== FILTER =====
function filterByTag(tagId, el) {

    let filtered = products;

    if (tagId !== 0) {
        filtered = products.filter(p => p.product_tag_id == tagId);
    }

    renderProducts(filtered);

    document.querySelectorAll('.cat-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
}

// ===== PRODUCT ===== //
function renderProducts(items) {
    const grid = document.getElementById('product-grid');

    if (!items || items.length === 0) {
        grid.innerHTML = '<p>ไม่มีสินค้า</p>';
        return;
    }

    const html = items.map(p => `
        <div class="product-card" onclick="showDetail(${p.product_id})">

            <img src="http://10.0.2.2/kanokwan_farm/images/${getImagePath(p.product_img)}"
                 loading="lazy"
                 onerror="this.src='http://10.0.2.2/kanokwan_farm/images/${p.product_img.includes('.') ? p.product_img : p.product_img + '.jpg'}'"
                 style="width:100%; height:120px; object-fit:cover; border-radius:10px;">

            <div class="product-info">
                <div class="name">${p.product_name}</div>
                <div class="price">฿${parseFloat(p.product_price).toFixed(2)}</div>
            </div>
        </div>
    `).join('');

    grid.innerHTML = html;
}

// ===== DETAIL ===== //
function showDetail(id) {
    currentProduct = products.find(p => p.product_id == id);
    if (!currentProduct) return;

    document.getElementById('detail-img').src =
        `http://10.0.2.2/kanokwan_farm/images/${currentProduct.product_img}`;

    document.getElementById('detail-name').textContent = currentProduct.product_name;
    document.getElementById('detail-price').textContent = `฿${currentProduct.product_price}`;
    document.getElementById('detail-desc').textContent = currentProduct.product_description || '';
    document.getElementById('detail-stock').textContent = `คงเหลือ: ${currentProduct.product_stock}`;

    currentQty = 1;
    document.getElementById('detail-qty').textContent = currentQty;

    showPage('detail');
}

function changeQty(amount) {

    currentQty = Number(currentQty) + amount;

    if (currentQty < 1) currentQty = 1;

    if (currentProduct && currentQty > currentProduct.product_stock) {
        currentQty = currentProduct.product_stock;
    }

    document.getElementById('detail-qty').textContent = currentQty;
}

function updateQtyByIndex(index, change) {

    const item = cart[index];
    if (!item) return;

    item.qty = Number(item.qty) + change;

    if (item.qty <= 0) {
        cart.splice(index, 1);
    }

    renderCart();
    updateCartBadge();
}

// ===== CART ===== //
function addToCart() {

    if (!requireLogin()) return;
    if (!currentProduct) return;

    const existing = cart.find(item =>
        Number(item.product_id) === Number(currentProduct.product_id)
    );

    if (existing) {
        existing.qty += Number(currentQty);
    } else {
        cart.push({
            product_id: Number(currentProduct.product_id),
            name: currentProduct.product_name,
            price: Number(currentProduct.product_price),
            img: currentProduct.product_img,
            qty: Number(currentQty)
        });
    }

    showToast("เพิ่มสินค้าแล้ว 🛒");

    renderCart();
    updateCartBadge();
}

function renderCart() {

    const container = document.getElementById('cart-items');
    const footer = document.getElementById('cart-footer');

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;">
                🛒 ยังไม่มีสินค้า
            </div>
        `;
        footer.innerHTML = '';
        return;
    }

    let total = 0;
    let totalQty = 0;

    container.innerHTML = cart.map((item, index) => {

        const itemTotal = item.price * item.qty;
        total += itemTotal;
        totalQty += item.qty;

        return `
            <div class="cart-item">

                <img src="http://10.0.2.2/kanokwan_farm/images/${item.img}" class="cart-img">

                <div class="cart-info">
                    <div class="cart-name">${item.name}</div>

                    <div class="cart-price">฿${itemTotal.toLocaleString()}</div>

                    <div class="cart-qty">
                        <button onclick="updateQtyByIndex(${index}, -1)">−</button>
                        <span>${item.qty}</span>
                        <button onclick="updateQtyByIndex(${index}, 1)">+</button>
                    </div>
                </div>

                <button class="delete-btn" onclick="removeItemByIndex(${index})">
                    <span class="material-icons">delete_outline</span>
                </button>

            </div>
        `;
    }).join('');

    footer.innerHTML = `
        <div class="cart-box">
            <div class="row">
                <span>รวมสินค้า (${totalQty} ชิ้น)</span>
                <span>฿${total.toLocaleString()}</span>
            </div>

            <div class="row">
                <span>ค่าจัดส่ง</span>
                <span style="color:green;">ฟรี</span>
            </div>

            <hr>

            <div class="row total">
                <span>ยอดรวมทั้งสิ้น</span>
                <span>฿${total.toLocaleString()}</span>
            </div>
        </div>

        <button class="pay-btn" onclick="showPage('checkout')">
            ชำระเงิน (฿${total.toLocaleString()})
        </button>
    `;
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');

    const total = cart.reduce((sum, item) => sum + item.qty, 0);

    badge.textContent = total;

    if (total === 0) {
        badge.style.display = 'none';
    } else {
        badge.style.display = 'flex';
    }
}

// ==== สั่งซื้อ ==== //
function renderCheckout() {

    const itemsBox = document.getElementById('checkout-items');
    const summaryBox = document.getElementById('checkout-summary');
    const addressBox = document.getElementById('checkout-address');

    if (cart.length === 0) {
        itemsBox.innerHTML = `<p>ไม่มีสินค้า</p>`;
        return;
    }

    let total = 0;
    let totalQty = 0;

    itemsBox.innerHTML = cart.map(item => {

        const itemTotal = item.price * item.qty;
        total += itemTotal;
        totalQty += item.qty;

        return `
            <div class="checkout-item">
                <img src="http://10.0.2.2/kanokwan_farm/images/${getImagePath(item.img)}"
                     onerror="this.onerror=null; this.src='http://10.0.2.2/kanokwan_farm/images/no-image.png';"
                     style="width:60px; height:60px; object-fit:cover; border-radius:10px;">

                <div class="checkout-info">
                    <div>${item.name} x ${item.qty}</div>
                    <div class="price">฿${itemTotal.toLocaleString()}</div>
                </div>
            </div>
        `;
    }).join('');

    // ===== ระบบแต้ม ===== //
    const checkbox = document.getElementById('use-all-points');
    const usePoints = checkbox?.checked ? (currentUser.points || 0) : 0;

    // คำนวณส่วนลด //
    const discount = Math.floor(usePoints / 10) * 5;

    // ยอดสุทธิ //
    const finalTotal = Math.max(total - discount, 0);

    // แต้มที่ได้ //
    const earned = Math.floor(finalTotal / 100);

    setTimeout(() => {
        const checkbox = document.getElementById('use-all-points');

        if (checkbox) {
            checkbox.addEventListener('change', () => {
                renderCheckout(); // re-render ใหม่ //
            });
        }
    }, 0);

    // ===== แสดงผล ===== //
    summaryBox.innerHTML = `
        <div class="cart-box">

            <div class="row">
                <span>รวมสินค้า (${totalQty} ชิ้น)</span>
                <span>฿${total.toLocaleString()}</span>
            </div>

            <div class="row">
                <span>ค่าจัดส่ง</span>
                <span class="free">ฟรี</span>
            </div>

            <div class="row">
                <span>ส่วนลดจากแต้ม</span>
                <span style="color:red;">-฿${discount}</span>
            </div>

            <hr>

            <div class="row total">
                <span>ยอดชำระรวม</span>
                <span>฿${finalTotal.toLocaleString()}</span>
            </div>

            <div class="row">
                <span>แต้มที่จะได้รับ</span>
                <span style="color:#ff9800;">${earned} แต้ม</span>
            </div>

            <div class="use-point-section">
                <div class="use-point-title">ใช้แต้มสะสม</div>

                <label class="use-point-row">
                    <input type="checkbox" id="use-all-points">
                    <span>ใช้แต้มสะสม (${currentUser.points || 0} แต้ม)</span>
                </label>
            </div>

        </div>
    `;

    // ที่อยู่ user //
    if (currentUser && currentUser.address) {
        addressBox.value = currentUser.address;
    }
}

function getValidPoints() {


    const maxPoints = currentUser?.points || 0;

    if (usePoints > maxPoints) {
        usePoints = maxPoints;
        input.value = maxPoints;
    }

    if (usePoints < 0) usePoints = 0;

    return usePoints;
}

function calculateDiscount(points) {
    return Math.floor(points / 10) * 5;
}

// ==== หน้าอีปโหลดสลิป ==== //
async function confirmPayment() {

    const input = document.getElementById('slip-input');
    const file = input.files[0];

    const checkbox = document.getElementById('use-all-points');
    const usePoints = checkbox?.checked ? (currentUser.points || 0) : 0;

    const discount = Math.floor(usePoints / 10) * 5;

    if (!file) {
        showToast("กรุณาอัปโหลดสลิป");
        return;
    }

    let total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const finalTotal = Math.max(total - discount, 0);

    try {
        const res = await fetch(API_BASE + 'order.php?action=create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                total_amount: finalTotal,
                use_points: usePoints,
                discount_amount: discount,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.qty,
                    price: item.price
                }))
            })
        });

        const data = await res.json();

        console.log("ORDER CREATE:", data);

        if (!data.success) {
            showToast("สั่งซื้อไม่สำเร็จ");
            return;
        }

        showToast("สั่งซื้อสำเร็จ 🎉");

        cart = [];
        updateCartBadge();

        await loadPoints(); // อัปเดตแต้มใหม่ //

        showPage('orders');

    } catch (err) {
        console.error(err);
        showToast("เกิดข้อผิดพลาด");
    }
}

// ===== PROFILE ===== //
function updateProfileUI() {
    if (!currentUser) return;

    document.getElementById('profile-name').textContent =
        currentUser.user_fname + ' ' + currentUser.user_lname;

    document.getElementById('profile-email').textContent =
        currentUser.email;
}

// ==== SHOW PAGE ==== //
async function showPage(pageId, isBack = false, el = null) {

    // ซ่อนปุ่ม add cart ทุกหน้า //
    const addBtn = document.querySelector('.add-cart-btn');
    if (addBtn) {
        addBtn.style.display = (pageId === 'detail') ? 'flex' : 'none';
    }

    const pages = document.querySelectorAll('.page');

    pages.forEach(p => {
        p.classList.remove('active', 'enter', 'back');
    });

    const page = document.getElementById('page-' + pageId);
    if (!page) return;

    // โหลดข้อมูลแต่ละหน้า //
    if (pageId === 'cart') {
        renderCart();
    }

    if (pageId === 'checkout') {
        renderCheckout();
    }

    if (pageId === 'payment') {
        renderPayment();
    }

    if (pageId === 'points') {
        if (!requireLogin()) return;

        await loadPoints();
        renderPoints();
        await renderPointHistory();
    }

    if (pageId === 'orders') {
        renderOrders();
    }

    if (pageId === 'profile') {
        if (!requireLogin()) return;
        updateProfileUI();
    }

    // เปลี่ยนชื่อ header //
    const title = document.querySelector('.header-title');

    if (title) {
        const titles = {
            home: 'กนกวรรณ&ศรีสุดาฟาร์ม',
            detail: 'รายระเอียดสินค้า',
            cart: 'ตะกร้าสินค้า',
            checkout: 'สรุปรายการสั่งซื้อ',
            payment: 'ช่องทางชำระเงิน',
            orders: 'ประวิติการสั่งซื้อ',
            profile: 'โปรไฟล์'
        };

        title.textContent = titles[pageId] || 'กนกวรรณ&ศรีสุดาฟาร์ม';
    }

    // animation //
    if (isBack) {
        page.classList.add('back');
    } else {
        page.classList.add('enter');
    }

    setTimeout(() => {
        page.classList.add('active');
    }, 10);

    // history //
    if (!isBack && pageHistory[pageHistory.length - 1] !== pageId) {
        pageHistory.push(pageId);
    }

    // back button //
    const backBtn = document.querySelector('.back-btn-header');

    // ถ้ามาจาก nav → ซ่อน //
    if (el && el.classList.contains('nav-item')) {
        backBtn.style.display = 'none';
    }

    // ถ้าเป็นหน้าแรก → ซ่อน //
    else if (pageId === 'home') {
        backBtn.style.display = 'none';
    }

    // ถ้าไม่มี history → ซ่อน //
    else if (pageHistory.length <= 1) {
        backBtn.style.display = 'none';
    }

    // กรณีอื่น → แสดง //
    else {
        backBtn.style.display = 'flex';
    }

    // ACTIVE NAV //
    const map = {
        home: 0,
        cart: 1,
        points: 2,
        orders: 3,
        profile: 4
    };

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    if (map[pageId] !== undefined) {
        navItems[map[pageId]].classList.add('active');
    }
}

async function loadPoints() {

    if (!currentUser) return;

    const userId = currentUser.user_id || currentUser.id;

    try {
        console.log("USER:", currentUser);
        console.log("USER ID (FIX):", userId);

        const res = await fetch(API_BASE + 'point.php?action=balance&user_id=' + userId);
        const data = await res.json();

        console.log("POINT:", data);

        if (data.success && data.data) {
            currentUser.points = Number(data.data.point_balance) || 0;
            renderPoints();
        }

    } catch (err) {
        console.error("โหลดแต้มไม่ได้:", err);
    }
}

function renderPoints() {

    const el = document.getElementById('user-points');

    if (!el) {
        console.log("❌ ไม่เจอ user-points");
        return;
    }

    el.textContent = currentUser.points || 0;
}

async function renderPointHistory() {

    const box = document.getElementById('point-history');

    if (!box) return;

    try {
        const res = await fetch(API_BASE + 'point.php?action=history&user_id=' + currentUser.user_id);
        const data = await res.json();

        const history = data.data;

        if (!history || history.length === 0) {
            box.innerHTML = `
                <div class="no-history-box">
                    <span class="material-icons">history</span>
                    <p>ยังไม่มีประวัติการใช้แต้ม</p>
                </div>
            `;
            return;
        }

        box.innerHTML = history.map(h => `
            <div style="background:#fff;padding:10px;margin:10px;border-radius:10px;">
                ใช้ ${h.point_used} แต้ม
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
    }
}

function renderPayment() {

    const el = document.getElementById('payment-total');
    if (!el) return;

    if (!cart || cart.length === 0) {
        el.textContent = '฿0';
        return;
    }

    const total = cart.reduce((sum, item) => {
        return sum + (Number(item.price) * Number(item.qty));
    }, 0);

    el.textContent = '฿' + total.toLocaleString();
}

function goToPayment() {

    const address = document.getElementById('checkout-address').value;

    if (!address) {
        showToast("กรุณากรอกที่อยู่");
        return;
    }

    if (cart.length === 0) {
        showToast("ไม่มีสินค้า");
        return;
    }

    showPage('payment');
}

function goBack() {

    if (pageHistory.length <= 1) return;

    pageHistory.pop(); // ลบหน้าปัจจุบัน //

    const prevPage = pageHistory[pageHistory.length - 1];

    showPage(prevPage, true);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('th-TH');
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return 'รอชำระเงิน';
        case 'confirmed': return 'ยืนยันแล้ว';
        case 'shipping': return 'กำลังจัดส่ง';
        case 'delivered': return 'สำเร็จ';
        default: return status;
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'pending': return 'status-pending';
        case 'confirmed': return 'status-confirmed';
        case 'shipping': return 'status-shipping';
        case 'delivered': return 'status-delivered';
        default: return '';
    }
}

async function renderOrders() {

    const box = document.getElementById('orders-list');

    if (!box) return;

    console.log("🔥 renderOrders ทำงาน");

    if (!currentUser) {
        box.innerHTML = "กรุณาเข้าสู่ระบบ";
        return;
    }

    try {
        const res = await fetch(API_BASE + 'order.php?action=list&user_id=' + currentUser.user_id);
        const data = await res.json();

        console.log("ORDERS:", data);

        const orders = data.data;

        if (!orders || orders.length === 0) {
            box.innerHTML = `
                <div style="text-align:center;padding:40px;">
                    ยังไม่มีคำสั่งซื้อ
                </div>
            `;
            return;
        }

        box.innerHTML = orders.map(o => `
            <div style="background:#fff;margin:10px;padding:15px;border-radius:12px;">
                <div>คำสั่งซื้อ #${o.order_id}</div>
                <div>${formatDate(o.order_date)}</div>
                <div style="color:red;">฿${parseFloat(o.total_amount).toLocaleString()}</div>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        box.innerHTML = "โหลดคำสั่งซื้อไม่สำเร็จ";
    }
}

// ===== TOAST ===== //
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
}

// ===== INIT ===== //
document.addEventListener('DOMContentLoaded', async () => {

    let saved = null;

    try {
        saved = localStorage.getItem('user');
    } catch (e) {
        console.error('localStorage error', e);
    }

    if (saved) {
        currentUser = JSON.parse(saved);
        await enterApp();;
        showPage('home');

    } else {
        showPage('home');
        loadHome();
    }

    const input = document.getElementById('slip-input');

    if (input) {
        input.addEventListener('change', function () {

            const file = this.files[0];
            if (!file) return;

            const preview = document.getElementById('slip-preview');
            const text = document.getElementById('upload-text');

            const reader = new FileReader();

            reader.onload = function (e) {
                if (preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }

                if (text) {
                    text.style.display = 'none';
                }
            };

            reader.readAsDataURL(file);
        });
    }

});

let deleteId = null;

function removeItemByIndex(index) {

    const item = cart[index];
    if (!item) return;

    deleteId = index;

    document.getElementById('confirm-text').textContent =
        `ลบ ${item.name} ออกจากตะกร้า?`;

    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('confirm-modal').style.display = 'none';
    deleteId = null;
}

function confirmDelete() {
    if (deleteId === null) return;

    cart.splice(deleteId, 1);

    renderCart();
    updateCartBadge();

    closeModal();
    showToast("ลบสินค้าแล้ว 🗑");
}

function updateProfileUI() {

    if (!currentUser) return;

    document.getElementById('profile-name').textContent =
        (currentUser.user_fname || '') + ' ' + (currentUser.user_lname || '');

    document.getElementById('profile-email').textContent =
        currentUser.email || '';
}