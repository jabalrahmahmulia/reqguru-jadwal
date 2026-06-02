/* ============================================================
   JadwalGuru — Utilities & Constants
   ============================================================ */

const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxxsak_bMwHiapBd5lopzvd1sK-bDSpo-diRAczZMImoPYciRFGA_IXQHU00SjFo0nGtQ/exec',
  SCHOOL_NAME: 'SMP Nasional Plus',
  SCHOOL_FULL: 'Yayasan Pendidikan Jabal Rahmah Mulia',
  HARI: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  KELAS: [],
  GRADE_MAP: {},
  TOAST_DURATION: 4000,
  SKELETON_DELAY: 300
};

/* ---------- DOM Helpers ---------- */
function $(selector, parent) {
  return (parent || document).querySelector(selector);
}

function $$(selector, parent) {
  return Array.from((parent || document).querySelectorAll(selector));
}

function createElement(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([key, val]) => {
      if (key === 'className') el.className = val;
      else if (key === 'dataset') Object.assign(el.dataset, val);
      else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
      else el.setAttribute(key, val);
    });
  }
  if (children !== undefined) {
    if (typeof children === 'string') el.innerHTML = children;
    else if (Array.isArray(children)) children.forEach(c => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    });
    else if (children instanceof Node) el.appendChild(children);
  }
  return el;
}

function cleanPhone(noHp) {
  if (!noHp) return '';
  let cleaned = String(noHp).trim().replace(/[^0-9]/g, '');
  if (cleaned.indexOf('628') === 0) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.indexOf('08') === 0) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/* ---------- Time Formatting ---------- */
function formatTime(timeStr) {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  if (str.indexOf('T') !== -1) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    } catch (e) {}
  }
  if (str.split(':').length >= 2) {
    const parts = str.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return str;
}

function formatTimeRange(start, end) {
  if (!start || !end) return '';
  return `${formatTime(start)} - ${formatTime(end)}`;
}

/* ---------- Toast Notifications ---------- */
let toastCounter = 0;
function showToast(message, type, title) {
  type = type || 'info';
  const container = $('#toast-container');
  if (!container) return;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  const titles = {
    success: 'Berhasil',
    error: 'Error',
    info: 'Info',
    warning: 'Perhatian'
  };

  const id = 'toast-' + (++toastCounter);
  const toast = createElement('div', {
    className: `toast toast--${type}`,
    id: id
  }, `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <div class="toast__content">
      <div class="toast__title">${title || titles[type] || ''}</div>
      <div class="toast__message">${escapeHtml(message)}</div>
    </div>
    <button class="toast__close" data-toast-close="${id}">✕</button>
  `);

  container.appendChild(toast);

  const closeBtn = toast.querySelector('.toast__close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      dismissToast(id);
    });
  }

  setTimeout(function () {
    dismissToast(id);
  }, CONFIG.TOAST_DURATION);

  return id;
}

function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;
  toast.classList.add('toast--exiting');
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 300);
}

/* ---------- Loading Overlay ---------- */
let loadingCount = 0;
function showLoading(text) {
  loadingCount++;
  let overlay = $('#loading-overlay');
  if (!overlay) {
    overlay = createElement('div', { id: 'loading-overlay', className: 'loading-overlay' }, `
      <div style="text-align:center">
        <div class="loading-spinner"></div>
        <div class="loading-text">${text || 'Memuat...'}</div>
      </div>
    `);
    document.body.appendChild(overlay);
  } else {
    const loadingText = overlay.querySelector('.loading-text');
    if (loadingText && text) loadingText.textContent = text;
  }
  requestAnimationFrame(function () { overlay.classList.add('show'); });
}

function hideLoading() {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount > 0) return;
  const overlay = $('#loading-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(function () {
      if (overlay.parentNode && loadingCount === 0) overlay.parentNode.removeChild(overlay);
    }, 300);
  }
}

/* ---------- Subject Color Mapping ---------- */
const SUBJECT_COLORS = {};
const COLOR_PALETTE = [
  '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12',
  '#1ABC9C', '#E67E22', '#2980B9', '#27AE60', '#8E44AD',
  '#D35400', '#16A085', '#C0392B', '#2C3E50', '#7F8C8D',
  '#F1C40F', '#E91E63', '#00BCD4', '#4CAF50', '#FF5722',
  '#673AB7', '#009688', '#795548', '#607D8B', '#FF9800'
];
let colorIndex = 0;

function getSubjectColor(subject) {
  if (!subject) return '#94A3B8';
  const key = subject.trim().toLowerCase();
  if (!SUBJECT_COLORS[key]) {
    SUBJECT_COLORS[key] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    colorIndex++;
  }
  return SUBJECT_COLORS[key];
}

function getSubjectColorWithAlpha(subject, alpha) {
  const hex = getSubjectColor(subject);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ---------- Skeleton Loaders ---------- */
function renderSkeleton(type, count) {
  count = count || 1;
  let html = '';
  for (let i = 0; i < count; i++) {
    switch (type) {
      case 'card':
        html += '<div class="skeleton skeleton--card"></div>';
        break;
      case 'text':
        html += `
          <div class="skeleton skeleton--title"></div>
          <div class="skeleton skeleton--text"></div>
          <div class="skeleton skeleton--text" style="width:70%"></div>
          <div class="skeleton skeleton--text-sm" style="width:50%"></div>
        `;
        break;
      case 'table-row':
        html += `
          <tr>
            <td><div class="skeleton skeleton--text" style="width:60px;margin:0"></div></td>
            ${Array(5).fill('<td><div class="skeleton skeleton--cell"></div></td>').join('')}
          </tr>
        `;
        break;
      case 'grid':
        html += `
          <div class="guru-info" style="padding:16px">
            <div class="skeleton skeleton--avatar"></div>
            <div style="flex:1">
              <div class="skeleton skeleton--title" style="width:120px"></div>
              <div class="skeleton skeleton--text-sm" style="width:80px"></div>
            </div>
          </div>
          <div class="skeleton skeleton--card" style="height:200px"></div>
        `;
        break;
      case 'stat':
        html += '<div class="skeleton" style="height:110px;border-radius:16px"></div>';
        break;
      default:
        html += '<div class="skeleton skeleton--text"></div>';
    }
  }
  return html;
}

/* ---------- HTML Escaping ---------- */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Phone Number Formatting ---------- */
function formatPhone(phone) {
  return cleanPhone(phone);
}

function isValidPhone(phone) {
  const cleaned = cleanPhone(phone);
  return cleaned.length >= 8 && cleaned.length <= 13 && cleaned.startsWith('8');
}

/* ---------- Debounce ---------- */
function debounce(fn, delay) {
  let timer;
  return function () {
    const ctx = this;
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(ctx, args);
    }, delay);
  };
}

/* ---------- Deep Clone ---------- */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ---------- Get Initials ---------- */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/* ---------- Short Kelas Name ---------- */
function shortKelas(kelas) {
  if (!kelas) return '';
  return kelas.replace('Kelas ', '').replace('Bin Khattab', 'B.K.').replace('Bin Affan', 'B.A.');
}

/* ---------- Filter Kelas by Grade ---------- */
function filterKelasByGrade(grade) {
  if (!grade || grade === 'Semua') return CONFIG.KELAS;
  return CONFIG.GRADE_MAP[grade] || CONFIG.KELAS;
}

/* ---------- Session Storage Helpers ---------- */
function saveSession(key, data) {
  try {
    sessionStorage.setItem('jg_' + key, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

function loadSession(key) {
  try {
    const data = sessionStorage.getItem('jg_' + key);
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
}

function clearSession(key) {
  try {
    if (key) sessionStorage.removeItem('jg_' + key);
    else {
      Object.keys(sessionStorage).forEach(function (k) {
        if (k.startsWith('jg_')) sessionStorage.removeItem(k);
      });
    }
  } catch (e) { /* ignore */ }
}

/* ---------- Local Storage Helpers ---------- */
function saveLocal(key, data) {
  try {
    localStorage.setItem('jg_' + key, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

function loadLocal(key) {
  try {
    const data = localStorage.getItem('jg_' + key);
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
}

/* ---------- Unique ID ---------- */
let uidCounter = 0;
function uid(prefix) {
  return (prefix || 'uid') + '-' + (++uidCounter);
}

/* ---------- Day helper ---------- */
function getCurrentHariIndex() {
  const dayMap = [6, 0, 1, 2, 3, 4, 5]; // JS Sunday=0 -> Sabtu=5, Mon=1->Senin=0
  const jsDay = new Date().getDay();
  const idx = dayMap[jsDay];
  return idx >= 0 && idx < 6 ? idx : 0;
}
