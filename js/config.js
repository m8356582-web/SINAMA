/* ============================================
   CONFIG - تنظیمات اصلی
   ============================================ */

// ===== اطلاعات Supabase =====
const SUPABASE_URL = 'https://ufwzjqnnfajgdaifqobz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmd3pqcW5uZmFqZ2RhaWZxb2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzE3NzIsImV4cCI6MjEwMzUwNzc3Mn0.vlVNwSNcUNwM7D4BAPlkx8g1_iBVsmJgnjJWvF3FVnI';

// ===== متغیرهای عمومی =====
let supabase = null;
let user = null;
let role = 'user';
let mock = false;
let selectedMovie = null;
let filter = 'all';
let passengerCount = 1;
let currentReviewMovie = null;
let currentRating = 0;
let currentDiscount = null;
let compareList = [];
let html5QrCode = null;
let chatInterval = null;
let currentChatUser = null;

// ===== داده‌های Mock (برای حالت آفلاین) =====
const mockUsers = [
    {
        id: '1',
        phone: '09120000001',
        first_name: 'علی',
        last_name: 'رضایی',
        father_name: 'محمد',
        role: 'admin1',
        code: 'SINA-1001',
        password: '123456',
        card_number: '6037-9912-3456-7890',
        can_manage_users: true,
        can_manage_movies: true,
        can_manage_bookings: true,
        can_view_reports: true,
        can_manage_attendance: true,
        total_points: 500,
        invite_code: 'INV-ADMIN001'
    },
    {
        id: '2',
        phone: '09122222222',
        first_name: 'رضا',
        last_name: 'کریمی',
        father_name: 'علی',
        role: 'admin2',
        code: 'SINA-1002',
        password: '123456',
        can_manage_bookings: true,
        can_manage_attendance: true,
        total_points: 200,
        invite_code: 'INV-ADMIN002'
    },
    {
        id: '3',
        phone: '09123456789',
        first_name: 'مریم',
        last_name: 'احمدی',
        father_name: 'حسین',
        role: 'user',
        code: 'SINA-1003',
        password: '123456',
        total_points: 120,
        invite_code: 'INV-USER003'
    }
];

const mockMovies = [
    {
        id: 'm1',
        name: 'تایتانیک',
        release_date: '2024-01-15',
        capacity: 100,
        price: 150000,
        status: 'now_showing',
        director: 'جیمز کامرون',
        actors: 'لئوناردو دی‌کاپریو، کیت وینسلت',
        genre: 'درام، عاشقانه',
        duration: 195,
        age_rating: '+12',
        trailer_url: '',
        poster_url: '',
        description: 'داستان عاشقانه‌ای در کشتی تایتانیک',
        imdb_rating: 7.9
    },
    {
        id: 'm2',
        name: 'اینسپشن',
        release_date: '2024-02-20',
        capacity: 80,
        price: 200000,
        status: 'now_showing',
        director: 'کریستوفر نولان',
        actors: 'لئوناردو دی‌کاپریو، تام هاردی',
        genre: 'اکشن، علمی-تخیلی',
        duration: 148,
        age_rating: '+15',
        imdb_rating: 8.8
    },
    {
        id: 'm3',
        name: 'جنگ ستارگان',
        release_date: '2024-03-10',
        capacity: 120,
        price: 180000,
        status: 'coming_soon',
        director: 'جورج لوکاس',
        genre: 'علمی-تخیلی',
        duration: 121,
        age_rating: '+12',
        imdb_rating: 8.6
    }
];

const mockBookings = [];
const mockAttendances = [];
const mockReviews = [];
const mockNotifications = [];
const mockFavorites = [];
const mockWatchlist = [];
const mockShowtimes = [];
const mockChatMessages = [];

const mockDiscounts = [
    {
        id: 'd1',
        code: 'WELCOME10',
        discount_type: 'percent',
        discount_value: 10,
        max_uses: 100,
        used_count: 0,
        min_amount: 0,
        is_active: true
    },
    {
        id: 'd2',
        code: 'VIP20',
        discount_type: 'percent',
        discount_value: 20,
        max_uses: 50,
        used_count: 0,
        min_amount: 200000,
        is_active: true
    },
    {
        id: 'd3',
        code: 'OFF50000',
        discount_type: 'fixed',
        discount_value: 50000,
        max_uses: 30,
        used_count: 0,
        min_amount: 150000,
        is_active: true
    }
];

// ===== تم‌های آماده =====
const THEMES = {
    'سلطنتی': {
        background: 'linear-gradient(135deg, #0a1628, #1a2a4a, #0d1b2a)',
        primary: '#1a4a8a',
        accent: '#ffd700',
        text: '#e0e8f0'
    },
    'شب آبی': {
        background: 'linear-gradient(135deg, #0c0c1e, #1a1a3e, #0d0d2b)',
        primary: '#2a5a9a',
        accent: '#ffd700',
        text: '#d0d8e8'
    },
    'الماس': {
        background: 'linear-gradient(135deg, #f0f4f8, #dce4ec, #c8d0d8)',
        primary: '#1a4a8a',
        accent: '#f0a500',
        text: '#1a1a2e'
    },
    'پادشاهی': {
        background: 'linear-gradient(135deg, #0d0d0d, #1a1a1a, #2a2a2a)',
        primary: '#ffd700',
        accent: '#f0a500',
        text: '#f0e8d0'
    },
    'آبی یخی': {
        background: 'linear-gradient(135deg, #0a2a4a, #1a4a7a, #2a6aaa)',
        primary: '#4a8aba',
        accent: '#ffd700',
        text: '#e8f0f8'
    },
    'طلایی شب': {
        background: 'linear-gradient(135deg, #0a0a0a, #1a1a0a, #2a2a0a)',
        primary: '#ffd700',
        accent: '#f0a500',
        text: '#f0e8c0'
    },
    'مدرن': {
        background: 'linear-gradient(135deg, #e8ecf0, #d0d8e0, #b8c0c8)',
        primary: '#1a4a8a',
        accent: '#f0a500',
        text: '#1a1a2e'
    },
    'کلاسیک': {
        background: 'linear-gradient(135deg, #f8f0e0, #e8dcc8, #d8c8b0)',
        primary: '#8a2a1a',
        accent: '#ffd700',
        text: '#1a1a2e'
    },
    'دریا': {
        background: 'linear-gradient(135deg, #001a2a, #003a5a, #005a8a)',
        primary: '#2a7aaa',
        accent: '#ffd700',
        text: '#d0e8f0'
    },
    'شیشه‌ای': {
        background: 'linear-gradient(135deg, #0a1a2a, #1a2a4a, #2a3a5a)',
        primary: 'rgba(255,255,255,0.1)',
        accent: '#ffd700',
        text: '#e0e8f0'
    }
};

let currentTheme = {};

// ===== توابع عمومی =====
function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

function toast(msg, type) {
    type = type || 'info';
    var c = document.getElementById('toastContainer');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
}

function formatCurrency(n) {
    if (!n && n !== 0) return '0';
    return n.toLocaleString('fa-IR');
}

function generateCode() {
    return 'SINA-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + new Date().getFullYear();
}

// ===== توابع تاریخ شمسی =====
function toPersian(date) {
    if (!date) return '-';
    var d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    var gy = d.getFullYear();
    var gm = d.getMonth() + 1;
    var gd = d.getDate();
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var jy, jm, jd;

    if (gy > 1600) {
        var gy2 = gy - 1600;
        var days = (gy2 - 1) * 365 + Math.floor((gy2 - 1) / 4) - Math.floor((gy2 - 1) / 100) + Math.floor((gy2 - 1) / 400) + g_d_m[gm - 1] + gd - 1;
        if ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) { if (gm > 2) days++; }
        var j_days = days - 226899;
        var jy2 = Math.floor((j_days * 4 + 1) / 146097);
        var jy3 = jy2 + 1;
        var j_days2 = j_days - Math.floor((146097 * jy2) / 4);
        var jm2 = Math.floor((j_days2 * 100 + 1) / 3060);
        jd = j_days2 - Math.floor((3060 * jm2 - 1) / 100) + 1;
        jm = jm2 - 1;
        jy = jy3;
    } else {
        var days = (gy - 1) * 365 + Math.floor((gy - 1) / 4) - Math.floor((gy - 1) / 100) + Math.floor((gy - 1) / 400) + g_d_m[gm - 1] + gd - 1;
        if ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) { if (gm > 2) days++; }
        var j_days = days - 226899;
        var jy2 = Math.floor((j_days * 4 + 1) / 146097);
        var jy3 = jy2 + 1;
        var j_days2 = j_days - Math.floor((146097 * jy2) / 4);
        var jm2 = Math.floor((j_days2 * 100 + 1) / 3060);
        jd = j_days2 - Math.floor((3060 * jm2 - 1) / 100) + 1;
        jm = jm2 - 1;
        jy = jy3 - 620;
    }
    var months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return jd + ' ' + months[jm] + ' ' + jy;
}

function toGregorian(jy, jm, jd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var gy, gm, gd;
    if (jy > 979) {
        var gy2 = jy - 979;
        var days = 226899 + (gy2 - 1) * 365 + Math.floor((gy2 - 1) / 4) - Math.floor((gy2 - 1) / 100) + Math.floor((gy2 - 1) / 400);
        days += (jm - 1) * 30 + jd;
        if (jm > 6) days += (jm - 6) * 1;
        if (jm > 11) days += 1;
        var gy3 = 1600;
        var days2 = days;
        while (days2 > 366) {
            var isLeap = (gy3 % 4 === 0 && gy3 % 100 !== 0) || gy3 % 400 === 0;
            if (days2 > 366) { days2 -= isLeap ? 366 : 365; gy3++; } else break;
        }
        gy = gy3;
        var gd2 = days2;
        for (var i = 0; i < 12; i++) {
            var daysInMonth = 31;
            if (i === 1) daysInMonth = ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28;
            else if (i === 3 || i === 5 || i === 8 || i === 10) daysInMonth = 30;
            if (gd2 <= daysInMonth) { gm = i + 1; gd = gd2; break; }
            gd2 -= daysInMonth;
        }
    } else {
        gy = jy + 621;
        gm = jm;
        gd = jd;
    }
    return new Date(gy, gm - 1, gd);
}

// ===== راه‌اندازی Supabase =====
async function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        mock = true;
        console.log('⚠️ Supabase لود نشد - حالت Mock فعال شد');
        return;
    }
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        var { error } = await supabase.from('movies').select('id').limit(1);
        if (error) throw error;
        mock = false;
        console.log('✅ Supabase متصل شد');
    } catch (e) {
        mock = true;
        console.log('⚠️ حالت Mock فعال شد:', e.message);
    }
}

// ===== خروجی‌های عمومی =====
window.openModal = openModal;
window.closeModal = closeModal;
window.toast = toast;
window.formatCurrency = formatCurrency;
window.toPersian = toPersian;
window.toGregorian = toGregorian;