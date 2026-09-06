/* ==========================================================================
   TEMPO TIMEPIECES — script.js
   ใช้ไฟล์เดียวร่วมกันทุกหน้า: product.html / order.html / admin.html
   หน้าไหนไม่มี element ที่เกี่ยวข้อง โค้ดส่วนนั้นจะไม่ทำงาน (ปลอดภัย ไม่ error)
   ========================================================================== */

/* --------------------------------------------------------------------------
   ตั้งค่าที่ต้องแก้เอง
   -------------------------------------------------------------------------- */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwteCuxMkZcuIwvj2LBs4j_68ymVQ_fPp2SqaBSjDU8aDy4e0UXsRJHviKjuW1i5GS4Vg/exec';
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0pdOYeITzpElcIuwpPMg5TSgiEhCLpA9V1-0N-oxuPb-WSnMbFw1c38q44DHHHIIV7h0I7gfT-ER1/pub?gid=0&single=true&output=csv';

// รายการ mood ที่ใช้กรอง ต้องตรงกับค่า mood ใน products.json
const MOOD_FILTERS = [
  { value: 'all',       label: 'ทั้งหมด' },
  { value: 'minimal',   label: 'Minimal' },
  { value: 'executive', label: 'Executive' },
  { value: 'sport',     label: 'Sport' }
];

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.querySelector('#ordersTable tbody')) initAdminPage();
});

/* ==========================================================================
   1. product.html — โหลดสินค้า + ตัวกรอง mood
   ========================================================================== */
function initProductPage() {
  const filterBar = document.getElementById('filter-bar');
  const productList = document.getElementById('product-list');

  const urlParams = new URLSearchParams(window.location.search);
  const initialMood = urlParams.get('mood') || 'all';

  fetch('products.json')
    .then((res) => {
      if (!res.ok) throw new Error('โหลด products.json ไม่สำเร็จ');
      return res.json();
    })
    .then((data) => {
      const products = data.products || [];
      renderFilterBar(filterBar, initialMood, (selectedMood) => {
        renderProductList(productList, products, selectedMood);
      });
      renderProductList(productList, products, initialMood);
    })
    .catch((error) => {
      console.error(error);
      productList.innerHTML = '<p class="muted">ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>';
    });
}

function renderFilterBar(filterBar, activeMood, onSelect) {
  if (!filterBar) return;
  filterBar.innerHTML = '';

  MOOD_FILTERS.forEach(({ value, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-bar__item';
    btn.textContent = label;
    btn.dataset.mood = value;
    btn.setAttribute('aria-selected', String(value === activeMood));

    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('.filter-bar__item').forEach((el) => {
        el.setAttribute('aria-selected', 'false');
      });
      btn.setAttribute('aria-selected', 'true');
      onSelect(value);

      // อัปเดต URL ให้ตรงกับตัวกรองที่เลือก โดยไม่รีโหลดหน้า
      const params = new URLSearchParams(window.location.search);
      if (value === 'all') {
        params.delete('mood');
      } else {
        params.set('mood', value);
      }
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    });

    filterBar.appendChild(btn);
  });
}

function renderProductList(productList, products, mood) {
  if (!productList) return;

  const filtered = mood === 'all' ? products : products.filter((p) => p.mood === mood);

  if (filtered.length === 0) {
    productList.innerHTML = '<p class="muted">ไม่พบสินค้าในหมวดนี้</p>';
    return;
  }

  productList.innerHTML = filtered.map((product) => buildProductCard(product)).join('');
}

function buildProductCard(product) {
  const { name, size, price, image, mood, description } = product;
  const orderUrl = `order.html?item=${encodeURIComponent(name)}&price=${encodeURIComponent(price)}`;

  return `
    <article class="product-card" data-mood="${escapeHtml(mood)}">
      <div class="product-card__image">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">
      </div>
      <div class="product-card__body">
        <span class="product-card__mood">${escapeHtml(capitalize(mood))}</span>
        <h3 class="product-card__name">${escapeHtml(name)}</h3>
        <p class="product-card__meta">ขนาด ${escapeHtml(size)}</p>
        <p class="product-card__price">${formatNumber(price)}</p>
        ${description ? `<p class="muted">${escapeHtml(description)}</p>` : ''}
        <a class="btn btn--gold" href="${orderUrl}">สั่งซื้อ</a>
      </div>
    </article>
  `;
}

/* ==========================================================================
   2. order.html — เติมฟอร์มจาก URL param + ส่งคำสั่งซื้อ
   ========================================================================== */
function initOrderPage() {
  const form = document.getElementById('orderForm');
  const itemsField = document.getElementById('items');
  const totalField = document.getElementById('total');

  // เติมค่าจาก URL parameter ทันทีที่โหลดหน้า
  const urlParams = new URLSearchParams(window.location.search);
  const item = urlParams.get('item');
  const price = urlParams.get('price');

  if (item && itemsField) {
    itemsField.value = item;
  }
  if (price && totalField) {
    totalField.value = price;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => {
        window.location.href = 'thankyou.html';
      })
      .catch((error) => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
  });
}

/* ==========================================================================
   3. admin.html — โหลด CSV มาแสดงเป็นตาราง (parse CSV เอง)
   ========================================================================== */
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');

  fetch(CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error('โหลดข้อมูล CSV ไม่สำเร็จ');
      return res.text();
    })
    .then((csvText) => {
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">ยังไม่มีรายการสั่งซื้อ</td></tr>';
        return;
      }

      // แถวแรกเป็น header
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== ''));

      // หาตำแหน่งคอลัมน์จากชื่อ header (รองรับทั้งชื่อ field และภาษาไทย)
      const colIndex = {
        timestamp: findColumn(header, ['timestamp', 'วันเวลา', 'date', 'time']),
        customerName: findColumn(header, ['customername', 'ชื่อลูกค้า', 'name']),
        contact: findColumn(header, ['contact', 'เบอร์โทร/line', 'เบอร์โทร', 'line', 'phone']),
        items: findColumn(header, ['items', 'รายการสินค้า', 'item']),
        total: findColumn(header, ['total', 'จำนวนเงินรวม', 'ยอดรวม', 'price']),
        note: findColumn(header, ['note', 'หมายเหตุ'])
      };

      // เรียงจากล่าสุดขึ้นก่อน (สมมติแถวใหม่ถูกเพิ่มต่อท้ายไฟล์เสมอ จึงกลับลำดับ)
      const sortedRows = dataRows.slice().reverse();

      tbody.innerHTML = sortedRows
        .map((row) => {
          const cell = (key, fallbackIdx) => {
            const idx = colIndex[key] !== -1 ? colIndex[key] : fallbackIdx;
            return escapeHtml((row[idx] || '').trim());
          };

          return `
            <tr>
              <td>${cell('timestamp', 0)}</td>
              <td>${cell('customerName', 1)}</td>
              <td>${cell('contact', 2)}</td>
              <td>${cell('items', 3)}</td>
              <td>${cell('total', 4)}</td>
              <td>${cell('note', 5)}</td>
            </tr>
          `;
        })
        .join('');
    })
    .catch((error) => {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</td></tr>';
    });
}

function findColumn(header, possibleNames) {
  for (const name of possibleNames) {
    const idx = header.indexOf(name);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * แปลงข้อความ CSV ให้เป็น array of rows (array of cells)
 * รองรับ: cell ที่ครอบด้วย double quote, comma ภายใน quote, quote escape ("") , ขึ้นบรรทัดใหม่ภายใน quote
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  // ตัด BOM ถ้ามี (พบบ่อยเวลา export จาก Google Sheets)
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        i++; // ข้าม quote คู่
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\r') {
        // ข้าม \r เฉยๆ รอจัดการที่ \n
      } else if (char === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }

  // เก็บ cell/row สุดท้ายที่ไม่มี newline ปิดท้าย
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/* ==========================================================================
   Utilities
   ========================================================================== */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatNumber(num) {
  const n = Number(num);
  if (Number.isNaN(n)) return num;
  return n.toLocaleString('th-TH');
}
