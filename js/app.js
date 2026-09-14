/* ============================================
   APP - فایل اصلی راه‌اندازی
   ============================================ */

// ===== NAV =====
function initNav() {
    document.querySelectorAll('[data-page]').forEach(function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            var page = this.dataset.page;

            // تغییر صفحه
            document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
            var targetPage = document.getElementById('page-' + page);
            if (targetPage) targetPage.classList.add('active');

            // لود محتوا بر اساس صفحه
            if (page === 'home') {
                loadMovies('homeMovies', 'all');
                loadStats();
                loadRecommendations();
                loadFeatured();
            } else if (page === 'movies') {
                loadMovies('moviesList', filter);
            } else if (page === 'favorites') {
                loadFavorites();
            } else if (page === 'watchlist') {
                loadWatchlist();
            } else if (page === 'showtimes') {
                loadShowtimes();
            } else if (page === 'leaderboard') {
                loadLeaderboard();
            } else if (page === 'profile' && user) {
                loadProfile();
            } else if (page === 'admin') {
                renderAdminTabs();
                loadAdmin('bookings');
            }
        });
    });
}

// ===== LOAD DATA =====
function loadData() {
    loadMovies('homeMovies', 'all');
    loadStats();
    loadRecommendations();
    loadFeatured();
    if (user) loadProfile();
}

// ===== STATS =====
async function loadStats() {
    var container = document.getElementById('homeStats');
    if (!container) return;

    if (!user || user.role !== 'admin1') {
        container.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.5;grid-column:1/-1;">' +
            '<i class="fas fa-lock" style="font-size:24px;color:#ffd700;"></i>' +
            '<p style="margin-top:10px;">🔒 آمار فقط برای ادمین کل</p></div>';
        return;
    }

    try {
        var users = await getUsers();
        var movies = await getMovies();
        var bookings = await getBookings();
        var attendances = await getAttendances();

        var revenue = 0;
        bookings.forEach(function (b) {
            if (b.payment_status === 'paid') revenue += b.total_price || 0;
        });

        var present = attendances.filter(function (a) { return a.status === 'present'; }).length;
        var waiting = bookings.filter(function (b) { return b.payment_status === 'waiting_for_approval'; }).length;

        container.innerHTML =
            '<div class="stat-card"><i class="fas fa-users"></i><div class="number">' + users.length + '</div><div class="label">کاربران</div></div>' +
            '<div class="stat-card"><i class="fas fa-film"></i><div class="number">' + movies.length + '</div><div class="label">فیلم‌ها</div></div>' +
            '<div class="stat-card"><i class="fas fa-check-circle"></i><div class="number">' + bookings.length + '</div><div class="label">رزروها</div></div>' +
            '<div class="stat-card"><i class="fas fa-dollar-sign"></i><div class="number">' + formatCurrency(revenue) + '</div><div class="label">درآمد</div></div>' +
            '<div class="stat-card"><i class="fas fa-clock"></i><div class="number">' + waiting + '</div><div class="label">در انتظار</div></div>' +
            '<div class="stat-card"><i class="fas fa-user-check"></i><div class="number">' + present + '</div><div class="label">حاضر</div></div>';
    } catch (e) { console.error(e); }
}

// ===== FEATURED SLIDER =====
async function loadFeatured() {
    var container = document.getElementById('featuredMovies');
    if (!container) return;

    var movies = await getMovies();
    var featured = movies.filter(function (m) { return m.status === 'now_showing'; }).slice(0, 5);

    if (featured.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:30px;opacity:0.5;">فیلم ویژه‌ای موجود نیست</p>';
        return;
    }

    var html = '<div class="featured-slider">';
    featured.forEach(function (m) {
        var date = toPersian(m.release_date);
        html += '<div class="featured-card" onclick="openBooking(\'' + m.id + '\')">' +
            '<div class="movie-icon"><i class="fas fa-film"></i></div>' +
            '<h3 style="font-size:18px;margin:10px 0;">' + m.name + '</h3>' +
            '<p style="font-size:12px;opacity:0.6;margin:5px 0;">📅 ' + date + '</p>' +
            (m.imdb_rating ? '<p style="font-size:13px;color:#ffd700;font-weight:700;">⭐ ' + m.imdb_rating + '</p>' : '') +
            '<div style="font-size:18px;font-weight:900;color:#ffd700;margin-top:10px;">' +
            formatCurrency(m.price) + ' تومان</div>' +
            '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

// ===== RECOMMENDATIONS =====
async function loadRecommendations() {
    var container = document.getElementById('recommendMovies');
    if (!container) return;

    try {
        var movies = await getMovies();
        var recommended = [];

        if (user) {
            // بر اساس علاقه‌مندی‌ها و رزروهای قبلی
            var favorites = await getFavorites(user.id);
            var bookings = await getBookings();
            var myBookings = bookings.filter(function (b) { return b.user_id === user.id; });

            var favMovieIds = favorites.map(function (f) { return f.movie_id; });
            var bookedMovieIds = myBookings.map(function (b) { return b.movie_id; });

            // فیلم‌هایی که در حال اکران هستن و کاربر ندیده
            var available = movies.filter(function (m) {
                return m.status === 'now_showing' && bookedMovieIds.indexOf(m.id) === -1;
            });

            // مرتب‌سازی بر اساس محبوبیت
            var moviesWithRating = [];
            for (var i = 0; i < available.length; i++) {
                var reviews = await getReviews(available[i].id);
                var avgRating = 0;
                if (reviews.length > 0) {
                    var total = 0;
                    reviews.forEach(function (r) { total += r.rating; });
                    avgRating = total / reviews.length;
                }
                moviesWithRating.push({
                    movie: available[i],
                    rating: avgRating,
                    reviewCount: reviews.length
                });
            }

            moviesWithRating.sort(function (a, b) {
                if (b.rating !== a.rating) return b.rating - a.rating;
                return b.reviewCount - a.reviewCount;
            });

            recommended = moviesWithRating.slice(0, 4).map(function (x) { return x.movie; });
        } else {
            // برای میهمان‌ها
            var availableMovies = movies.filter(function (m) { return m.status === 'now_showing'; });
            recommended = availableMovies.slice(0, 4);
        }

        if (recommended.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:30px;opacity:0.5;">پیشنهادی موجود نیست</p>';
            return;
        }

        var favorites = user ? await getFavorites(user.id) : [];
        var html = '';

        recommended.forEach(function (m) {
            var date = toPersian(m.release_date);
            var isFav = favorites.some(function (f) { return f.movie_id === m.id; });

            html += '<div class="recommend-card">' +
                (user ? '<button class="fav-btn ' + (isFav ? 'active' : '') + '" onclick="toggleFavorite(\'' + m.id + '\', this)"><i class="fas fa-heart"></i></button>' : '') +
                '<div class="movie-icon"><i class="fas fa-film"></i></div>' +
                '<h3 style="font-size:18px;margin:10px 0;">' + m.name + '</h3>' +
                '<div style="font-size:12px;opacity:0.6;margin:5px 0;">📅 ' + date + '</div>' +
                (m.genre ? '<div style="font-size:12px;opacity:0.6;">🎭 ' + m.genre + '</div>' : '') +
                '<div style="font-size:18px;font-weight:900;color:#ffd700;margin-top:10px;">' +
                formatCurrency(m.price) + ' تومان</div>' +
                (user ? '<button class="btn btn-primary btn-sm" onclick="openBooking(\'' + m.id + '\')" style="margin-top:12px;">' +
                    '<i class="fas fa-ticket-alt"></i> رزرو</button>' : '') +
                '</div>';
        });

        container.innerHTML = html;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center;padding:30px;opacity:0.5;">خطا</p>';
    }
}

// ===== FAVORITES =====
async function loadFavorites() {
    if (!user) return;
    var container = document.getElementById('favoritesList');
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    var favorites = await getFavorites(user.id);
    if (favorites.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;opacity:0.5;">' +
            '❤️ هنوز فیلمی به علاقه‌مندی‌ها اضافه نکرده‌اید</p>';
        return;
    }

    var movies = await getMovies();
    var html = '';

    favorites.forEach(function (f) {
        var m = movies.find(function (x) { return x.id === f.movie_id; });
        if (!m) return;

        var date = toPersian(m.release_date);
        var statusMap = { 'now_showing': 'در حال اکران', 'coming_soon': 'به زودی', 'ended': 'پایان یافته' };
        var cls = m.status === 'now_showing' ? '' : m.status === 'coming_soon' ? 'soon' : 'ended';

        html += '<div class="movie-card">' +
            '<button class="fav-btn active" onclick="toggleFavorite(\'' + m.id + '\', this)"><i class="fas fa-heart"></i></button>' +
            '<div class="icon"><i class="fas fa-film"></i></div>' +
            '<h3>' + m.name + '</h3>' +
            '<div class="badge ' + cls + '">' + (statusMap[m.status] || m.status) + '</div>' +
            '<p style="opacity:0.6;font-size:13px;">📅 ' + date + '</p>' +
            '<div class="price">' + formatCurrency(m.price) + ' تومان</div>' +
            (m.status === 'now_showing' ?
                '<button class="btn btn-primary btn-sm" onclick="openBooking(\'' + m.id + '\')">' +
                '<i class="fas fa-ticket-alt"></i> رزرو</button>' : '') +
            '</div>';
    });

    container.innerHTML = html;
}

// ===== EXPORT EXCEL =====
window.exportExcel = async function () {
    var users = await getUsers();
    var csv = 'نام کامل,تلفن,کد یکتا,نقش,امتیاز\n';
    users.forEach(function (u) {
        csv += '"' + u.first_name + ' ' + u.last_name + '","' + u.phone + '","' + (u.code || '') + '","' + u.role + '","' + (u.total_points || 0) + '"\n';
    });
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'گزارش_کاربران.csv';
    link.click();
    toast('✅ دانلود شد', 'success');
};

window.exportBookingsExcel = async function () {
    var bookings = await getBookings();
    var csv = 'کاربر,فیلم,تعداد,قیمت,کد رزرو,وضعیت,پرداخت\n';
    bookings.forEach(function (b) {
        var userName = b.users ? (b.users.first_name + ' ' + b.users.last_name) : '-';
        var movieName = b.movies ? b.movies.name : '-';
        csv += '"' + userName + '","' + movieName + '","' + b.ticket_count + '","' + (b.total_price || 0) + '","' + (b.booking_code || '-') + '","' + b.status + '","' + b.payment_status + '"\n';
    });
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'گزارش_رزروها.csv';
    link.click();
    toast('✅ دانلود شد', 'success');
};

window.exportAttendanceExcel = async function () {
    var atts = await getAttendances();
    var csv = 'کاربر,فیلم,ورود,خروج,وضعیت\n';
    atts.forEach(function (a) {
        var userName = a.users ? (a.users.first_name + ' ' + a.users.last_name) : '-';
        var movieName = a.movies ? a.movies.name : '-';
        csv += '"' + userName + '","' + movieName + '","' + (a.check_in_time || '') + '","' + (a.check_out_time || '') + '","' + a.status + '"\n';
    });
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'گزارش_حضور.csv';
    link.click();
    toast('✅ دانلود شد', 'success');
};

// ===== REPORT =====
function renderReport(container) {
    if (role !== 'admin1') {
        container.innerHTML = '🔒 فقط ادمین کل';
        return;
    }

    container.innerHTML =
        '<div class="glass-title" style="font-size:18px;">📊 گزارشات</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;">' +
        '<button class="btn btn-primary" onclick="exportExcel()"><i class="fas fa-file-excel"></i> کاربران</button>' +
        '<button class="btn btn-primary" onclick="exportBookingsExcel()"><i class="fas fa-file-excel"></i> رزروها</button>' +
        '<button class="btn btn-primary" onclick="exportAttendanceExcel()"><i class="fas fa-file-excel"></i> حضور</button>' +
        '<button class="btn btn-danger" onclick="exportReportPDF()"><i class="fas fa-file-pdf"></i> گزارش PDF</button>' +
        '</div>' +
        '<div id="reportStats"><div class="stats-row">' +
        '<div class="stat-card"><i class="fas fa-users"></i><div class="number" id="reportUsers">-</div><div class="label">کاربران</div></div>' +
        '<div class="stat-card"><i class="fas fa-film"></i><div class="number" id="reportMovies">-</div><div class="label">فیلم‌ها</div></div>' +
        '<div class="stat-card"><i class="fas fa-ticket-alt"></i><div class="number" id="reportBookings">-</div><div class="label">رزروها</div></div>' +
        '<div class="stat-card"><i class="fas fa-dollar-sign"></i><div class="number" id="reportRevenue">-</div><div class="label">درآمد</div></div>' +
        '</div></div>' +
        '<div class="glass" style="margin-top:20px;">' +
        '<div class="glass-title" style="font-size:18px;">📈 نمودار درآمد 7 روز اخیر</div>' +
        '<div id="revenueChart"></div>' +
        '</div>';

    getUsers().then(function (users) {
        var el = document.getElementById('reportUsers');
        if (el) el.textContent = users.length;
    });
    getMovies().then(function (movies) {
        var el = document.getElementById('reportMovies');
        if (el) el.textContent = movies.length;
    });
    getBookings().then(function (bookings) {
        var el = document.getElementById('reportBookings');
        if (el) el.textContent = bookings.length;

        var revenue = 0;
        bookings.forEach(function (b) {
            if (b.payment_status === 'paid') revenue += b.total_price || 0;
        });
        var el2 = document.getElementById('reportRevenue');
        if (el2) el2.textContent = formatCurrency(revenue) + ' تومان';
    });

    setTimeout(function () {
        renderRevenueChart(document.getElementById('revenueChart'));
    }, 500);
}

// ===== REVENUE CHART =====
async function renderRevenueChart(container) {
    if (!container) return;

    var bookings = await getBookings();
    var data = [], labels = [];

    for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        var dayStr = d.toISOString().split('T')[0];
        var dayRevenue = 0;

        bookings.forEach(function (b) {
            if (b.payment_status === 'paid' && b.payment_date) {
                var bDay = new Date(b.payment_date).toISOString().split('T')[0];
                if (bDay === dayStr) dayRevenue += b.total_price || 0;
            }
        });

        labels.push(toPersian(d).split(' ').slice(0, 2).join(' '));
        data.push(dayRevenue);
    }

    var maxRevenue = Math.max.apply(null, data) || 1;
    var html = '<div style="display:flex;justify-content:space-around;align-items:flex-end;height:250px;gap:10px;padding:20px;background:rgba(255,255,255,.02);border-radius:16px;">';

    for (var j = 0; j < data.length; j++) {
        var height = (data[j] / maxRevenue) * 180;
        html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;">' +
            '<div style="font-size:11px;color:#ffd700;font-weight:700;">' + formatCurrency(data[j]) + '</div>' +
            '<div class="revenue-bar" style="height:' + Math.max(height, 5) + 'px;"></div>' +
            '<div style="font-size:10px;opacity:0.6;text-align:center;">' + labels[j] + '</div>' +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
}

// ===== ADD MOVIE (ADMIN) =====
function renderAddMovie(container) {
    if (role !== 'admin1') {
        container.innerHTML = '🔒 فقط ادمین کل';
        return;
    }

    container.innerHTML =
        '<div class="glass-title" style="font-size:18px;">➕ افزودن فیلم جدید</div>' +
        '<form id="addMovieForm">' +
        '<div class="form-group"><label>نام فیلم</label><input type="text" id="mName" placeholder="تایتانیک" required></div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>سال</label><input type="number" id="mYear" placeholder="1403" min="1300" max="1450" required></div>' +
        '<div class="form-group"><label>ماه</label><select id="mMonth" required>' +
        '<option value="">انتخاب</option>' +
        '<option value="1">فروردین</option>' +
        '<option value="2">اردیبهشت</option>' +
        '<option value="3">خرداد</option>' +
        '<option value="4">تیر</option>' +
        '<option value="5">مرداد</option>' +
        '<option value="6">شهریور</option>' +
        '<option value="7">مهر</option>' +
        '<option value="8">آبان</option>' +
        '<option value="9">آذر</option>' +
        '<option value="10">دی</option>' +
        '<option value="11">بهمن</option>' +
        '<option value="12">اسفند</option>' +
        '</select></div>' +
        '<div class="form-group"><label>روز</label><input type="number" id="mDay" min="1" max="31" required></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>ساعت</label><input type="time" id="mTime"></div>' +
        '<div class="form-group"><label>ظرفیت</label><input type="number" id="mCapacity" placeholder="100" required></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>قیمت (تومان)</label><input type="number" id="mPrice" placeholder="150000" required></div>' +
        '<div class="form-group"><label>وضعیت</label><select id="mStatus">' +
        '<option value="coming_soon">به زودی</option>' +
        '<option value="now_showing">در حال اکران</option>' +
        '<option value="ended">پایان یافته</option>' +
        '</select></div>' +
        '</div>' +
        '<div class="form-group"><label>کارگردان</label><input type="text" id="mDirector" placeholder="جیمز کامرون"></div>' +
        '<div class="form-group"><label>بازیگران</label><input type="text" id="mActors" placeholder="لئوناردو دی‌کاپریو، کیت وینسلت"></div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>ژانر</label><input type="text" id="mGenre" placeholder="درام، عاشقانه"></div>' +
        '<div class="form-group"><label>مدت (دقیقه)</label><input type="number" id="mDuration" placeholder="120"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>رده سنی</label><input type="text" id="mAgeRating" placeholder="+12"></div>' +
        '<div class="form-group"><label>IMDB</label><input type="number" id="mImdb" placeholder="8.5" step="0.1" min="0" max="10"></div>' +
        '</div>' +
        '<div class="form-group"><label>لینک تریلر</label><input type="url" id="mTrailer" placeholder="https://youtube.com/watch?v=..."></div>' +
        '<div class="form-group"><label>خلاصه داستان</label><textarea id="mDescription" rows="3" placeholder="خلاصه فیلم..."></textarea></div>' +
        '<button type="submit" class="btn btn-success"><i class="fas fa-plus"></i> افزودن فیلم</button>' +
        '</form>';

    document.getElementById('addMovieForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        var name = document.getElementById('mName').value.trim();
        var year = parseInt(document.getElementById('mYear').value);
        var month = parseInt(document.getElementById('mMonth').value);
        var day = parseInt(document.getElementById('mDay').value);
        var time = document.getElementById('mTime').value || null;
        var capacity = parseInt(document.getElementById('mCapacity').value);
        var price = parseInt(document.getElementById('mPrice').value);
        var status = document.getElementById('mStatus').value;
        var director = document.getElementById('mDirector').value.trim() || null;
        var actors = document.getElementById('mActors').value.trim() || null;
        var genre = document.getElementById('mGenre').value.trim() || null;
        var duration = document.getElementById('mDuration').value ? parseInt(document.getElementById('mDuration').value) : null;
        var ageRating = document.getElementById('mAgeRating').value.trim() || null;
        var imdb = document.getElementById('mImdb').value ? parseFloat(document.getElementById('mImdb').value) : null;
        var trailer = document.getElementById('mTrailer').value.trim() || null;
        var description = document.getElementById('mDescription').value.trim() || null;

        if (!name || !year || !month || !day || !capacity || !price) {
            toast('❌ همه فیلدهای ضروری را پر کنید', 'error');
            return;
        }

        var greg = toGregorian(year, month, day);
        var date = greg.toISOString().split('T')[0];

        try {
            await insertMovie({
                name: name,
                release_date: date,
                release_time: time,
                capacity: capacity,
                price: price,
                status: status,
                director: director,
                actors: actors,
                genre: genre,
                duration: duration,
                age_rating: ageRating,
                imdb_rating: imdb,
                trailer_url: trailer,
                description: description
            });
            toast('✅ فیلم اضافه شد!', 'success');
            loadAdmin('movies');
            loadMovies('homeMovies', 'all');
            loadStats();
            document.getElementById('addMovieForm').reset();
        } catch (e) {
            toast('❌ ' + e.message, 'error');
        }
    });
}

// ===== INIT EVERYTHING =====
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🎬 شروع راه‌اندازی سینما...');

    // 1. راه‌اندازی Supabase
    await initSupabase();
    console.log('✅ Supabase راه‌اندازی شد');

    // 2. راه‌اندازی احراز هویت
    initAuth();
    console.log('✅ احراز هویت راه‌اندازی شد');

    // 3. راه‌اندازی تم (با لود تم ذخیره‌شده)
    if (typeof initTheme === 'function') {
        initTheme();
        console.log('✅ تم راه‌اندازی شد');
    }

    // 4. راه‌اندازی ناوبری
    initNav();
    console.log('✅ ناوبری راه‌اندازی شد');

    // 5. لود داده‌های اولیه
    loadData();
    console.log('✅ داده‌ها لود شدند');

    // 6. راه‌اندازی زیرنویس Enter برای چت
    var chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof sendChatMessage === 'function') sendChatMessage();
            }
        });
    }

    // 7. بررسی حالت شب
    if (typeof checkNightMode === 'function') checkNightMode();

    // 8. بروزرسانی اعلان‌ها هر 30 ثانیه
    setInterval(function () {
        if (user && typeof updateNotifBadge === 'function') updateNotifBadge();
    }, 30000);

});

// ===== EXPORT =====
window.initNav = initNav;
window.loadData = loadData;
window.loadStats = loadStats;
window.loadRecommendations = loadRecommendations;
window.loadFavorites = loadFavorites;
window.loadFeatured = loadFeatured;
window.renderReport = renderReport;
window.renderAddMovie = renderAddMovie;
window.renderRevenueChart = renderRevenueChart;