/* --- LOGIC CHATBOT --- */
let chatState = 'MENU'; // MENU, WAIT_ORDER, WAIT_CUSTOMER, WAIT_HISTORY, WAIT_PRODUCT


// Khởi tạo
function toggleChatWindow() {
    const win = document.getElementById('chat-window');
    if (win.style.display === 'none' || !win.style.display) {
        win.style.display = 'flex';
        if(document.getElementById('chatBody').innerHTML.trim() === "") {
            showMainMenu();
        }
        // Focus input
        setTimeout(() => document.getElementById('chatInput').focus(), 100);
    } else {
        win.style.display = 'none';
    }
}


function addMessage(text, type) {
    const body = document.getElementById('chatBody');
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerHTML = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}


function showMainMenu() {
    chatState = 'MENU';
    const menuHTML = `
        Xin chào! Tôi có thể giúp gì cho bạn?
        <div class="chat-options">
            <button class="chip-btn" onclick="askOrder()">🔍 Tra cứu đơn hàng</button>
            <button class="chip-btn" onclick="askCustomer()">👤 Khách hàng</button>
            <button class="chip-btn" onclick="askHistory()">🕒 Lịch sử mua</button>
            <button class="chip-btn" onclick="askDebt()">📒 Tổng quan nợ</button>
            <button class="chip-btn" onclick="askCustomerDebt()">💸 Soi nợ khách</button>
            <button class="chip-btn" onclick="showDailyStats()">💰 Doanh thu hôm nay</button>
            <button class="chip-btn" onclick="showProductList()">📦 Các loại thẻ</button>
        </div>
    `;
    addMessage(menuHTML, 'bot');
}


function handleChatKey(e) {
    if(e.key === 'Enter') sendUserMessage();
}


function sendUserMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if(!text) return;


    addMessage(text, 'user');
    input.value = '';


    // Xử lý phản hồi
    setTimeout(() => processBotLogic(text), 500);
}


function processBotLogic(text) {
    const lowerText = text.toLowerCase();


    // Lệnh quay về menu
    if (lowerText === 'menu' || lowerText === 'thoát' || lowerText === 'huy') {
        showMainMenu();
        return;
    }


    switch (chatState) {
        case 'WAIT_ORDER':
            lookupOrder(text);
            break;
        case 'WAIT_CUSTOMER':
            lookupCustomerInfo(text);
            break;
        case 'WAIT_HISTORY':
            lookupCustomerHistory(text);
            break;
        case 'WAIT_DEBT_LOOKUP': // --- [MỚI] Xử lý khi đang đợi nhập SĐT soi nợ
            lookupCustomerDebt(text);
            break;
        case 'WAIT_PRODUCT':
            lookupProductDetail(text);
            break;
        default:
            // Nếu đang ở menu mà người dùng gõ phím tắt
            if(lowerText.includes('đơn')) askOrder();
            else if(lowerText.includes('khách')) askCustomer();
            else if(lowerText.includes('nợ khách')) askCustomerDebt(); // --- [MỚI] Lệnh tắt soi nợ
            else if(lowerText.includes('nợ')) askDebt();
            else if(lowerText.includes('doanh thu')) showDailyStats();
            else if(lowerText.includes('thẻ')) showProductList();
            else {
                addMessage("Tôi chưa hiểu ý bạn. Vui lòng chọn chức năng bên dưới:", 'bot');
                showMainMenu(); // Show lại nút
            }
            break;
    }
}


/* --- CÁC CHỨC NĂNG CỤ THỂ --- */


// 1. TRA CỨU ĐƠN HÀNG
function askOrder() {
    chatState = 'WAIT_ORDER';
    addMessage("Vui lòng nhập <b>Mã đơn hàng</b> (VD: TB123...)", 'bot');
}


function lookupOrder(id) {
    let history = JSON.parse(localStorage.getItem('invoiceHistory') || "[]");
    // Tìm gần đúng (không phân biệt hoa thường)
    let order = history.find(x => x.id.toLowerCase() === id.toLowerCase());


    if (order) {
        let html = `✅ <b>Tìm thấy đơn ${order.id.toUpperCase()}:</b><br>
        - Khách: ${order.name}<br>
        - Tổng: ${formatMoney(order.total)} đ<br>
        - TT: ${order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}<br>
        <span class="chat-link" onclick="botViewOrder('${order.id}')">👉 Click để xem chi tiết</span>`;
        addMessage(html, 'bot');
        chatState = 'MENU';
    } else {
        addMessage(`❌ Không tìm thấy đơn hàng nào có mã "${id}". Thử lại hoặc gõ "menu" để thoát.`, 'bot');
    }
}


function botViewOrder(id) {
    viewHistoryDetail(id); // Gọi hàm gốc
    // Cuộn màn hình về vùng modal (đề phòng đang ở đâu đó)
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// 2. KHÁCH HÀNG
function askCustomer() {
    chatState = 'WAIT_CUSTOMER';
    addMessage("Nhập <b>Số điện thoại</b> khách hàng để tra cứu hồ sơ:", 'bot');
}


function lookupCustomerInfo(phone) {
    let customers = JSON.parse(localStorage.getItem('thebao_customers') || "[]");
    let cus = customers.find(c => c.phone.includes(phone));


    if (cus) {
        let html = `👤 <b>Hồ sơ khách hàng:</b><br>
        - Tên: ${cus.name}<br>
        - SĐT: ${cus.phone}<br>
        <span class="chat-link" onclick="botOpenCRM('${cus.phone}')">👉 Click để mở Hồ sơ CRM</span>`;
        addMessage(html, 'bot');
        chatState = 'MENU';
    } else {
        addMessage(`❌ Không tìm thấy khách hàng có SĐT chứa "${phone}".`, 'bot');
        showMainMenu();
    }
}


function botOpenCRM(phone) {
    openCRM(phone); // Gọi hàm gốc
}


// 3. LỊCH SỬ ĐƠN HÀNG (5 ĐƠN GẦN NHẤT)
function askHistory() {
    chatState = 'WAIT_HISTORY';
    addMessage("Nhập <b>Số điện thoại</b> để xem 5 đơn mua gần nhất:", 'bot');
}


function lookupCustomerHistory(phone) {
    let history = JSON.parse(localStorage.getItem('invoiceHistory') || "[]");
    let userOrders = history.filter(x => x.phone === phone);


    if (userOrders.length > 0) {
        // Lấy 5 đơn mới nhất
        let top5 = userOrders.slice(0, 5);
        let listHtml = top5.map(o => 
            `<li><a href="#" onclick="botViewOrder('${o.id}')">${o.id}</a> - ${formatMoney(o.total)}đ</li>`
        ).join('');


        let html = `🕒 <b>Lịch sử mua của ${phone}:</b><br>
        <ul>${listHtml}</ul>
        <span class="chat-link" onclick="botOpenCRM('${phone}')">👉 Xem toàn bộ trong CRM</span>`;
        addMessage(html, 'bot');
        chatState = 'MENU';
    } else {
        addMessage(`❌ Khách hàng SĐT ${phone} chưa có đơn hàng nào.`, 'bot');
        showMainMenu();
    }
}
// 4. CÔNG NỢ
function askDebt() {
    let debts = JSON.parse(localStorage.getItem('thebao_debt_list') || "[]");
    let activeDebts = debts.filter(d => d.remainingAmount > 0);
    let totalDebt = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);


    if (activeDebts.length === 0) {
        addMessage("🎉 Tuyệt vời! Hiện tại không có khách nào đang nợ.", 'bot');
    } else {
        let topDebtors = activeDebts.slice(0, 3).map(d => `- ${d.name}: ${formatMoney(d.remainingAmount)}đ`).join('<br>');
        let html = `📒 <b>Tổng nợ phải thu: <span style="color:red">${formatMoney(totalDebt)} đ</span></b><br>
        Số khách nợ: ${activeDebts.length}<br>
        ----------------<br>
        Top nợ:<br>${topDebtors}<br>
        ...<br>
        <span class="chat-link" onclick="botOpenDebt()">👉 Click xem chi tiết Sổ Nợ</span>`;
        addMessage(html, 'bot');
    }
    showMainMenu();
}


function botOpenDebt() {
    openDebtModal(); // Gọi hàm gốc
    switchDebtTab('active');
}


// 5. DOANH THU TRONG NGÀY
function showDailyStats() {
    // Tận dụng hàm calculateTodayRevenue đã có để update DOM, sau đó lấy text từ DOM
    calculateTodayRevenue();
    
    let total = document.getElementById('dailyTotalDisplay').innerText;
    let cash = document.getElementById('revCash').innerText;
    let transfer = document.getElementById('revTransfer').innerText;
    let debt = document.getElementById('revDebt').innerText;


    // Đếm số đơn hôm nay
    const today = new Date().toISOString().slice(0,10);
    const history = JSON.parse(localStorage.getItem('invoiceHistory') || "[]");
    const count = history.filter(x => x.date === today).length;


    let html = `📊 <b>Thống kê hôm nay (${today}):</b><br>
    - Tổng đơn: <b>${count}</b> đơn<br>
    - Doanh thu: <b style="color:blue; font-size:16px;">${total}</b><br>
    ----------------<br>
    - Tiền mặt: ${cash}<br>
    - Chuyển khoản: ${transfer}<br>
    - Nợ: ${debt}`;
    
    addMessage(html, 'bot');
    showMainMenu();
}


// 6. CÁC LOẠI THẺ (SẢN PHẨM)
function showProductList() {
    chatState = 'WAIT_PRODUCT';
    let catalog = JSON.parse(localStorage.getItem('thebao_catalog_v6') || "[]");
    
    if (catalog.length === 0) {
        addMessage("Chưa có sản phẩm nào trong hệ thống.", 'bot');
        showMainMenu();
        return;
    }


    let listHtml = catalog.map((cat, idx) => {
        return `<b>${idx + 1}. ${cat.name}</b>: ` + 
               cat.products.map(p => p.name).join(', ');
    }).join('<br>');


    addMessage(`📦 <b>Danh sách sản phẩm:</b><br>${listHtml}<br><br>👉 Gõ <b>Tên thẻ</b> (VD: Garena) hoặc <b>Số thứ tự</b> danh mục để xem giá bán chi tiết.`, 'bot');
}


function lookupProductDetail(input) {
    let catalog = JSON.parse(localStorage.getItem('thebao_catalog_v6') || "[]");
    let foundProds = [];


    // Nếu nhập số
    if (!isNaN(input) && parseInt(input) > 0 && parseInt(input) <= catalog.length) {
        let cat = catalog[parseInt(input) - 1];
        addMessage(`📂 <b>Danh mục ${cat.name}:</b>`, 'bot');
        foundProds = cat.products;
    } else {
        // Tìm theo tên thẻ
        catalog.forEach(cat => {
            cat.products.forEach(p => {
                if (p.name.toLowerCase().includes(input.toLowerCase())) {
                    foundProds.push(p);
                }
            });
        });
    }


    if (foundProds.length > 0) {
        let html = foundProds.map(p => {
            let prices = p.prices.map(pr => `[${formatMoney(pr.face)} ➔ ${formatMoney(pr.sell)}]`).join(', ');
            return `- <b>${p.name}</b>: ${prices || 'Chưa cấu hình giá'}`;
        }).join('<br>');
        
        addMessage(html + `<br><span class="chat-link" onclick="botScrollToShop()">👉 Click để chọn thẻ ngay</span>`, 'bot');
        chatState = 'MENU';
    } else {
        addMessage(`❌ Không tìm thấy thẻ nào tên "${input}". Vui lòng thử lại.`, 'bot');
    }
}


function botScrollToShop() {
    // Cuộn đến phần Chọn Sản Phẩm
    const section = document.querySelector('.section-card:nth-of-type(2)'); // Card thứ 2 là chọn sp
    if(section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Highlight nhẹ
    section.style.border = "2px solid #f39c12";
    setTimeout(() => section.style.border = "1px solid #e1e4e8", 2000);
}


// --- CHỨC NĂNG MỚI: TRA CỨU NỢ CỤ THỂ CỦA 1 KHÁCH ---


function askCustomerDebt() {
    chatState = 'WAIT_DEBT_LOOKUP';
    addMessage("Vui lòng nhập <b>Số điện thoại</b> khách hàng để soi công nợ chi tiết:", 'bot');
}


function lookupCustomerDebt(phone) {
    // Lấy danh sách nợ từ bộ nhớ
    let debts = JSON.parse(localStorage.getItem('thebao_debt_list') || "[]");
    
    // Lọc các khoản nợ CÒN DƯ (remainingAmount > 0) và khớp SĐT
    let customerDebts = debts.filter(d => d.phone.includes(phone) && d.remainingAmount > 0);


    if (customerDebts.length > 0) {
        // Tính tổng nợ
        let totalDebt = customerDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
        let cusName = customerDebts[0].name; // Lấy tên khách


        // Tạo danh sách các đơn nợ
        let listHtml = customerDebts.map((d, index) => {
            return `<li><b>${index + 1}. Đơn ${d.orderId}</b> (${d.date})<br>
                    &nbsp;&nbsp;&nbsp; - Đã trả: ${formatMoney(d.paidAmount)}<br>
                    &nbsp;&nbsp;&nbsp; - <span style="color:red">Còn nợ: ${formatMoney(d.remainingAmount)}đ</span></li>`;
        }).join('');


        let html = `💸 <b>Kết quả soi nợ khách ${cusName}:</b><br>
        ----------------<br>
        🔴 <b>TỔNG NỢ: <span style="color:red; font-size:16px;">${formatMoney(totalDebt)} đ</span></b><br>
        ----------------<br>
        <b>Chi tiết các đơn nợ:</b><br>
        <ul style="padding-left: 15px; margin-top: 5px;">${listHtml}</ul>
        <br>
        <span class="chat-link" onclick="botOpenDebtAndSearch('${phone}')">👉 Click để mở Sổ Nợ & Thanh toán</span>`;
        
        addMessage(html, 'bot');
    } else {
        // Kiểm tra xem khách có tồn tại không hay là không nợ
        let customers = JSON.parse(localStorage.getItem('thebao_customers') || "[]");
        let isExist = customers.some(c => c.phone.includes(phone));
        
        if(isExist) {
            addMessage(`✅ Khách hàng SĐT <b>${phone}</b> uy tín quá! Hiện tại <b>KHÔNG</b> có khoản nợ nào.`, 'bot');
        } else {
            addMessage(`❌ Không tìm thấy dữ liệu nợ nào liên quan đến SĐT "${phone}".`, 'bot');
        }
    }
    chatState = 'MENU'; // Quay về menu sau khi trả lời
}


// Hàm hỗ trợ mở sổ nợ và tự điền SĐT vào ô tìm kiếm
function botOpenDebtAndSearch(phone) {
    openDebtModal(); // Mở modal
    switchDebtTab('active'); // Chuyển tab đang nợ
    document.getElementById('inpSearchDebt').value = phone; // Điền sđt
    renderDebtList(); // Lọc danh sách
}


// --- [MỚI] HÀM TẢI BACKUP LỊCH SỬ TỪ CLOUD (JSONL) ---
// Hàm này tải file chuẩn định dạng để khôi phục (giữ nguyên tên sản phẩm)
window.downloadCloudHistoryJSONL = async function() {
    // 1. Kiểm tra đăng nhập
    if (!currentUser) return alert("⚠️ Vui lòng đăng nhập để tải dữ liệu Cloud!");
    
    if(typeof showProgressModal === 'function') showProgressModal("ĐANG TẢI LỊCH SỬ TỪ CLOUD...");


    try {
        const uid = currentUser.uid;
        const chunks = [];
        
        // Lấy dữ liệu từ Cloud (Sắp xếp mới nhất trước)
        const invSnap = await db.collection('UserData').doc(uid).collection('Invoices').orderBy('date', 'desc').get();
        
        let count = 0;
        const totalDocs = invSnap.size;


        if (totalDocs === 0) {
            if(typeof closeProgressModal === 'function') closeProgressModal();
            return alert("☁️ Không tìm thấy đơn hàng nào trên Cloud!");
        }


        // Đóng gói từng dòng JSON
        invSnap.forEach(doc => {
            // Thêm type: 'history' để máy nhận diện đúng khi khôi phục
            const line = JSON.stringify({type: 'history', data: doc.data()});
            chunks.push(line + '\n');
            count++;
        });


        // Tải file xuống
        const blob = new Blob(chunks, {type: "application/x-jsonlines"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const timeStr = new Date().toISOString().slice(0,10);
        a.download = `Cloud_History_Backup_${timeStr}.jsonl`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if(typeof closeProgressModal === 'function') closeProgressModal();
        alert(`✅ Đã tải xong ${count} đơn hàng!\nFile này dùng để khôi phục trong: Cài đặt -> Dữ liệu -> Lịch sử đơn hàng.`);


    } catch (e) {
        console.error(e);
        if(typeof closeProgressModal === 'function') closeProgressModal();
        alert("❌ Lỗi: " + e.message);
    }
};
