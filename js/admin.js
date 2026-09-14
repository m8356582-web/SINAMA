/* ============================================
   ADMIN - پنل مدیریت کامل
   ============================================ */

// ===== TABS =====
function renderAdminTabs() {
    var container = document.getElementById('adminTabs');
    if (!container) return;

    var html = '';
    if (role === 'admin1') {
        html += '<button class="btn btn-primary btn-sm" data-tab="users"><i class="fas fa-users"></i> کاربران</button>';
        html += '<button class="btn btn-primary btn-sm" data-tab="movies"><i class="fas fa-film"></i> فیلم‌ها</button>';
        html += '<button class="btn btn-primary btn-sm" data-tab="addMovie"><i class="fas fa-plus"></i> افزودن فیلم</button>';
        html += '<button class="btn btn-primary btn-sm" data-tab="report"><i class="fas fa-chart-bar"></i> گزارش</button>';
        html += '<button class="btn btn-warning btn-sm" data-tab="card"><i class="fas fa-credit-card"></i> شماره کارت</button>';
        html += '<button class="btn btn-info btn-sm" data-tab="reviews"><i class="fas fa-star"></i> نظرات</button>';
        html += '<button class="btn btn-purple btn-sm" data-tab="discounts"><i class="fas fa-tag"></i> کد تخفیف</button>';
        html += '<button class="btn btn-info btn-sm" data-tab="showtimes"><i class="fas fa-calendar"></i> سانس‌ها</button>';
    }
    if (role === 'admin1' || role === 'admin2') {
        html += '<button class="btn btn-primary btn-sm" data-tab="bookings"><i class="fas fa-ticket-alt"></i> رزروها</button>';
        html += '<button class="btn btn-primary btn-sm" data-tab="attendance"><i class="fas fa-user-check"></i> حضور و غیاب</button>';
        html += '<button class="btn btn-info btn-sm" data-tab="chats"><i class="fas fa-comments"></i> چت‌ها</button>';
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-tab]').forEach(function (el) {
        el.addEventListener('click', function () { loadAdmin(this.dataset.tab); });
    });
}

// ===== LOAD ADMIN =====
async function loadAdmin(tab) {
    var container = document.getElementById('adminContent');
    if (!user || (role !== 'admin1' && role !== 'admin2')) {
        container.innerHTML = '🔒 دسترسی ندارید';
        return;
    }

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        if (tab === 'users') await renderUsers(container);
        else if (tab === 'movies') await renderMoviesAdmin(container);
        else if (tab === 'bookings') await renderBookings(container);
        else if (tab === 'addMovie') renderAddMovie(container);
        else if (tab === 'report') renderReport(container);
        else if (tab === 'attendance') await renderAttendance(container);
        else if (tab === 'card') await renderCardSettings(container);
        else if (tab === 'reviews') await renderReviewsAdmin(container);
        else if (tab === 'discounts') await renderDiscountsAdmin(container);
        else if (tab === 'showtimes') await renderShowtimesAdmin(container);
        else if (tab === 'chats') await renderChatsAdmin(container);
    } catch (e) {
        console.error('خطا:', e);
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;"><p>خطا: ' + e.message + '</p></div>';
    }
}

// ===== USERS =====
async function renderUsers(container) {
    if (role !== 'admin1') {
        container.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.6;">' +
            '<i class="fas fa-lock" style="font-size:48px;color:#ffd700;margin-bottom:15px;display:block;"></i>' +
            '<p>🔒 مدیریت کاربران فقط برای ادمین کل</p></div>';
        return;
    }

    var users = await getUsers();
    var html = '<div class="glass-title" style="font-size:18px;">👥 کاربران (' + users.length + ')</div>' +
        '<div class="table-wrap"><table><thead><tr>' +
        '<th>نام</th><th>تلفن</th><th>کد</th><th>نقش</th><th>امتیاز</th><th>عملیات</th>' +
        '</tr></thead><tbody>';

    for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var r = u.role === 'admin1' ? '⭐ ادمین کل' : u.role === 'admin2' ? 'ادمین دوم' : 'کاربر';
        var self = String(u.id) === String(user.id);
        var code = u.code || generateCode();

        html += '<tr>' +
            '<td>' + u.first_name + ' ' + u.last_name + '</td>' +
            '<td>' + u.phone + '</td>' +
            '<td style="color:#ffd700;">' + code + '</td>' +
            '<td>' + r + '</td>' +
            '<td>🏆 ' + (u.total_points || 0) + '</td>' +
            '<td><div class="table-actions">';

        html += '<button class="btn btn-warning btn-xs" onclick="editUser(\'' + u.id + '\')">' +
            '<i class="fas fa-edit"></i></button>';

        if (u.role === 'admin2' && !self) {
            html += '<button class="btn btn-info btn-xs" onclick="editPermissions(\'' + u.id + '\')">' +
                '<i class="fas fa-key"></i></button>';
        }

        if (!self) {
            html += '<button class="btn btn-success btn-xs" onclick="promoteUser(\'' + u.id + '\')">' +
                '<i class="fas fa-arrow-up"></i></button>';

            if (u.role !== 'admin1') {
                html += '<button class="btn btn-danger btn-xs" onclick="demoteUser(\'' + u.id + '\')">' +
                    '<i class="fas fa-arrow-down"></i></button>';
                html += '<button class="btn btn-danger btn-xs" onclick="deleteUserAccount(\'' + u.id + '\')">' +
                    '<i class="fas fa-trash"></i></button>';
            }
        }

        html += '</div></td></tr>';
    }
    html += '</tbody></table></div>';
    html += '<button class="btn btn-primary" onclick="exportExcel()" style="margin-top:15px;">' +
        '<i class="fas fa-file-excel"></i> خروجی اکسل</button>';

    container.innerHTML = html;
}

window.editUser = async function (userId) {
    var users = await getUsers();
    var u = users.find(function (x) { return String(x.id) === String(userId); });
    if (!u) return;

    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserPhone').value = u.phone || '';
    document.getElementById('editUserFirstName').value = u.first_name || '';
    document.getElementById('editUserLastName').value = u.last_name || '';
    document.getElementById('editUserFatherName').value = u.father_name || '';
    document.getElementById('editUserRole').value = u.role || 'user';
    openModal('editUserModal');
};

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('editUserForm');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var userId = document.getElementById('editUserId').value;
            try {
                await updateUser(userId, {
                    phone: document.getElementById('editUserPhone').value.trim(),
                    first_name: document.getElementById('editUserFirstName').value.trim(),
                    last_name: document.getElementById('editUserLastName').value.trim(),
                    father_name: document.getElementById('editUserFatherName').value.trim(),
                    role: document.getElementById('editUserRole').value
                });
                closeModal('editUserModal');
                toast('✅ به‌روز شد', 'success');
                loadAdmin('users');
            } catch (e) { toast('❌ ' + e.message, 'error'); }
        });
    }

    // Permissions form
    var permForm = document.getElementById('permissionsForm');
    if (permForm) {
        permForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var userId = document.getElementById('permUserId').value;
            try {
                await updateUser(userId, {
                    can_manage_users: document.getElementById('permCanUsers').checked,
                    can_manage_movies: document.getElementById('permCanMovies').checked,
                    can_manage_bookings: document.getElementById('permCanBookings').checked,
                    can_view_reports: document.getElementById('permCanReports').checked,
                    can_manage_attendance: document.getElementById('permCanAttendance').checked,
                    card_number: document.getElementById('permCardNumber').value.trim()
                });
                closeModal('permissionsModal');
                toast('✅ ذخیره شد!', 'success');
                loadAdmin('users');
            } catch (e) { toast('❌ ' + e.message, 'error'); }
        });
    }
});

window.editPermissions = async function (userId) {
    var users = await getUsers();
    var u = users.find(function (x) { return String(x.id) === String(userId); });
    if (!u) return;

    document.getElementById('permUserId').value = userId;
    document.getElementById('permCanUsers').checked = u.can_manage_users || false;
    document.getElementById('permCanMovies').checked = u.can_manage_movies || false;
    document.getElementById('permCanBookings').checked = u.can_manage_bookings || false;
    document.getElementById('permCanReports').checked = u.can_view_reports || false;
    document.getElementById('permCanAttendance').checked = u.can_manage_attendance || false;
    document.getElementById('permCardNumber').value = u.card_number || '';
    openModal('permissionsModal');
};

window.promoteUser = async function (userId) {
    var users = await getUsers();
    var u = users.find(function (x) { return String(x.id) === String(userId); });
    if (!u || u.role === 'admin1') return;
    var newRole = u.role === 'admin2' ? 'admin1' : 'admin2';
    try {
        await updateUser(userId, { role: newRole });
        toast('✅ ارتقا یافت', 'success');
        loadAdmin('users');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

window.demoteUser = async function (userId) {
    var users = await getUsers();
    var u = users.find(function (x) { return String(x.id) === String(userId); });
    if (!u || String(u.id) === String(user.id) || u.role === 'admin1') return;
    try {
        await updateUser(userId, { role: 'user' });
        toast('✅ عزل شد', 'success');
        loadAdmin('users');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

window.deleteUserAccount = async function (userId) {
    var users = await getUsers();
    var u = users.find(function (x) { return String(x.id) === String(userId); });
    if (!u || String(u.id) === String(user.id) || u.role === 'admin1') return;
    if (!confirm('حذف کاربر؟')) return;
    try {
        await deleteUser(userId);
        toast('✅ حذف شد', 'success');
        loadAdmin('users');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

// ===== BOOKINGS =====
async function renderBookings(container) {
    try {
        var bookings = await getBookings();
        var attendances = await getAttendances();

        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<div class="glass-title" style="font-size:18px;">🎟️ رزروها (0)</div>' +
                '<p style="text-align:center;padding:40px;opacity:0.5;">هیچ رزروی وجود ندارد</p>';
            return;
        }

        var html = '<div class="glass-title" style="font-size:18px;">🎟️ رزروها (' + bookings.length + ')</div>' +
            '<div class="table-wrap"><table><thead><tr>' +
            '<th>کاربر</th><th>فیلم</th><th>تعداد</th><th>قیمت</th><th>کد</th><th>پرداخت</th><th>رسید</th><th>حضور</th><th>بلیط</th><th>عملیات</th>' +
            '</tr></thead><tbody>';

        for (var i = 0; i < bookings.length; i++) {
            var b = bookings[i];
            var userName = b.users ? (b.users.first_name + ' ' + b.users.last_name) : '-';
            var movieName = b.movies ? b.movies.name : '-';
            var total = b.total_price || 0;

            var ps = '', pa = '', receipt = '-';

            if (b.receipt_image && typeof b.receipt_image === 'string' && b.receipt_image.length > 5) {
                receipt = '<a href="' + b.receipt_image + '" target="_blank" style="color:#ffd700;font-size:12px;text-decoration:underline;">📷</a>';
            }

            if (b.payment_status === 'waiting_for_approval') {
                ps = '⏳ انتظار';
                if (role === 'admin1') {
                    pa = '<button class="btn btn-success btn-xs" onclick="approvePayment(\'' + b.id + '\')">' +
                        '<i class="fas fa-check"></i></button>' +
                        '<button class="btn btn-danger btn-xs" onclick="rejectPayment(\'' + b.id + '\')">' +
                        '<i class="fas fa-times"></i></button>';
                }
            } else if (b.payment_status === 'approved') {
                ps = '✅ تایید';
                if (role === 'admin1') {
                    pa = '<button class="btn btn-success btn-xs" onclick="confirmPaymentReceived(\'' + b.id + '\')">' +
                        '<i class="fas fa-money-bill"></i></button>';
                }
            } else if (b.payment_status === 'rejected') ps = '❌ رد';
            else if (b.payment_status === 'paid') ps = '✅ پرداخت';
            else ps = '❌ پرداخت نشده';

            var att = null;
            for (var k = 0; k < attendances.length; k++) {
                if (attendances[k].booking_id === b.id) { att = attendances[k]; break; }
            }
            var attStatus = att ? (att.status === 'present' ? '✅ حاضر' : '❌ غایب') : '⏳';
            var checkedIn = att !== null;
            var canCheckOut = att && (att.check_out_time === null || att.check_out_time === undefined);

            html += '<tr>' +
                '<td>' + userName + '</td>' +
                '<td>' + movieName + '</td>' +
                '<td>' + b.ticket_count + '</td>' +
                '<td>' + formatCurrency(total) + '</td>' +
                '<td style="color:#ffd700;">' + (b.booking_code || '-') + '</td>' +
                '<td>' + ps + '</td>' +
                '<td>' + receipt + '</td>' +
                '<td>' + attStatus + '</td>';

            html += '<td>';
            if (b.status !== 'cancelled') {
                html += '<button class="btn btn-warning btn-xs" onclick="showTicket(\'' + b.id + '\')">' +
                    '<i class="fas fa-ticket-alt"></i></button>';
            } else html += '-';
            html += '</td>';

            html += '<td><div class="table-actions">' + pa;

            if (b.status === 'active' && b.payment_status === 'paid' && !checkedIn) {
                html += '<button class="btn btn-success btn-xs" onclick="checkIn(\'' + b.id + '\')">' +
                    '<i class="fas fa-user-check"></i></button>';
            }
            if (checkedIn && canCheckOut) {
                html += '<button class="btn btn-warning btn-xs" onclick="checkOut(\'' + att.id + '\')">' +
                    '<i class="fas fa-user-times"></i></button>';
            }
            if (b.status === 'active') {
                html += '<button class="btn btn-danger btn-xs" onclick="cancelBooking(\'' + b.id + '\')">' +
                    '<i class="fas fa-times"></i></button>';
            }
            html += '</div></td></tr>';
        }
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;"><p>خطا: ' + e.message + '</p></div>';
    }
}

// ===== PAYMENT FUNCTIONS =====
window.approvePayment = async function (bookingId) {
    if (role !== 'admin1') { toast('❌ فقط ادمین کل', 'error'); return; }
    if (!confirm('تایید پرداخت؟')) return;
    try {
        await updateBooking(bookingId, {
            payment_status: 'approved',
            payment_date: new Date().toISOString(),
            payment_code: 'PAY-' + Math.random().toString(36).substring(2, 8).toUpperCase()
        });
        toast('✅ تایید شد!', 'success');
        loadAdmin('bookings');
        loadStats();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

window.rejectPayment = async function (bookingId) {
    if (role !== 'admin1') { toast('❌ فقط ادمین کل', 'error'); return; }
    var reason = prompt('دلیل رد:');
    if (reason === null) return;
    try {
        var bookings = await getBookings();
        var b = bookings.find(function (x) { return x.id === bookingId; });
        await updateBooking(bookingId, {
            payment_status: 'rejected',
            receipt_notes: (b ? b.receipt_notes || '' : '') + '\n📌 دلیل رد: ' + reason
        });
        toast('❌ رد شد', 'error');
        loadAdmin('bookings');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

window.confirmPaymentReceived = async function (bookingId) {
    if (role !== 'admin1') { toast('❌ فقط ادمین کل', 'error'); return; }
    if (!confirm('تایید دریافت واریز؟')) return;
    try {
        await updateBooking(bookingId, {
            payment_status: 'paid',
            payment_date: new Date().toISOString()
        });
        toast('✅ پرداخت نهایی تایید شد!', 'success');
        loadAdmin('bookings');
        loadStats();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

window.cancelBooking = async function (bookingId) {
    if (!confirm('لغو رزرو؟')) return;
    try {
        await updateBooking(bookingId, { status: 'cancelled' });
        toast('✅ لغو شد', 'success');
        loadAdmin('bookings');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

// ===== ATTENDANCE =====
async function getAttendances() {
    if (mock) return mockAttendances.slice();
    try {
        var { data: attendances } = await supabase.from('attendances').select('*').order('check_in_time', { ascending: false });
        if (!attendances) return [];
        var { data: users } = await supabase.from('users').select('id, first_name, last_name');
        var { data: movies } = await supabase.from('movies').select('id, name');
        attendances.forEach(function (a) {
            var u = users ? users.find(function (x) { return x.id === a.user_id; }) : null;
            var m = movies ? movies.find(function (x) { return x.id === a.movie_id; }) : null;
            a.users = u || null;
            a.movies = m || null;
        });
        return attendances;
    } catch (e) { return []; }
}

async function insertAttendance(att) {
    if (mock) {
        var newAtt = { id: 'a' + (mockAttendances.length + 1) };
        Object.assign(newAtt, att);
        mockAttendances.push(newAtt);
        return newAtt;
    }
    var { data, error } = await supabase.from('attendances').insert(att).select().single();
    if (error) throw error;
    return data;
}

async function updateAttendance(id, data) {
    if (mock) {
        var idx = mockAttendances.findIndex(function (a) { return a.id === id; });
        if (idx === -1) throw new Error('حضور یافت نشد');
        Object.assign(mockAttendances[idx], data);
        return mockAttendances[idx];
    }
    var { data: result, error } = await supabase.from('attendances').update(data).eq('id', id).select().single();
    if (error) throw error;
    return result;
}

window.checkIn = async function (bookingId) {
    try {
        var bookings = await getBookings();
        var b = bookings.find(function (x) { return x.id === bookingId; });
        if (!b) { toast('❌ یافت نشد', 'error'); return; }

        var atts = await getAttendances();
        var existing = atts.find(function (x) { return x.booking_id === bookingId; });
        if (existing) { toast('⚠️ قبلاً ثبت شده', 'info'); return; }

        await insertAttendance({
            booking_id: bookingId,
            user_id: b.user_id,
            movie_id: b.movie_id,
            check_in_time: new Date().toISOString(),
            status: 'present',
            notes: 'ثبت حضور'
        });
        toast('✅ حضور ثبت شد!', 'success');
        loadAdmin('bookings');
        loadStats();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

window.checkOut = async function (attendanceId) {
    if (!confirm('ثبت خروج؟')) return;
    try {
        await updateAttendance(attendanceId, { check_out_time: new Date().toISOString() });
        toast('✅ خروج ثبت شد', 'success');
        loadAdmin('bookings');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

async function renderAttendance(container) {
    if (role !== 'admin1' && role !== 'admin2') {
        container.innerHTML = '🔒 دسترسی ندارید';
        return;
    }

    var atts = await getAttendances();
    var html = '<div class="glass-title" style="font-size:18px;">👤 حضور و غیاب (' + atts.length + ')</div>' +
        '<div class="table-wrap"><table><thead><tr>' +
        '<th>کاربر</th><th>فیلم</th><th>زمان ورود</th><th>زمان خروج</th><th>وضعیت</th>' +
        '</tr></thead><tbody>';

    if (atts.length === 0) {
        html += '<tr><td colspan="5" style="text-align:center;padding:20px;opacity:0.5;">هیچ ثبت حضوری نیست</td></tr>';
    } else {
        atts.forEach(function (a) {
            var userName = a.users ? (a.users.first_name + ' ' + a.users.last_name) : '-';
            var movieName = a.movies ? a.movies.name : '-';
            var sm = { 'present': '✅ حاضر', 'absent': '❌ غایب', 'late': '⏰ دیر' };
            html += '<tr>' +
                '<td>' + userName + '</td>' +
                '<td>' + movieName + '</td>' +
                '<td>' + (a.check_in_time ? toPersian(a.check_in_time) + ' ' + new Date(a.check_in_time).toLocaleTimeString('fa-IR') : '-') + '</td>' +
                '<td>' + (a.check_out_time ? toPersian(a.check_out_time) + ' ' + new Date(a.check_out_time).toLocaleTimeString('fa-IR') : '-') + '</td>' +
                '<td>' + (sm[a.status] || a.status) + '</td>' +
                '</tr>';
        });
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ===== CARD SETTINGS =====
async function renderCardSettings(container) {
    if (role !== 'admin1') { container.innerHTML = '🔒'; return; }

    var users = await getUsers();
    var admin = users.find(function (u) { return u.role === 'admin1'; });
    var currentCard = admin && admin.card_number ? admin.card_number : 'تنظیم نشده';

    container.innerHTML =
        '<div class="glass-title" style="font-size:18px;"><i class="fas fa-credit-card"></i> شماره کارت</div>' +
        '<div class="card-settings-box">' +
        '<p class="label">شماره کارت فعلی:</p>' +
        '<p class="value">' + currentCard + '</p>' +
        '<p class="hint">به همه کاربران در زمان رزرو نمایش داده می‌شود</p>' +
        '</div>' +
        '<form id="cardForm">' +
        '<div class="form-group">' +
        '<label>💳 شماره کارت جدید</label>' +
        '<input type="text" id="cardNumberInput" placeholder="6037-9912-3456-7890" value="' + (currentCard !== 'تنظیم نشده' ? currentCard : '') + '" style="direction:ltr;font-family:monospace;font-size:18px;letter-spacing:3px;text-align:center;padding:16px;">' +
        '</div>' +
        '<button type="submit" class="btn btn-warning"><i class="fas fa-save"></i> ذخیره</button>' +
        '</form>';

    document.getElementById('cardForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        var newCard = document.getElementById('cardNumberInput').value.trim();
        if (!newCard) { toast('❌ شماره کارت را وارد کنید', 'error'); return; }
        var cleaned = newCard.replace(/-/g, '');
        if (cleaned.length < 16) { toast('⚠️ حداقل 16 رقم', 'error'); return; }
        try {
            await updateUser(admin.id, { card_number: newCard });
            if (user && user.role === 'admin1') {
                user.card_number = newCard;
                localStorage.setItem('cinema_user', JSON.stringify(user));
            }
            toast('✅ ذخیره شد!', 'success');
            loadAdmin('card');
        } catch (e) { toast('❌ ' + e.message, 'error'); }
    });
}

// ===== DISCOUNTS =====
async function getDiscountCodes() {
    if (mock) return mockDiscounts.slice();
    var { data } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
    return data || [];
}

async function getDiscountByCode(code) {
    if (mock) return mockDiscounts.find(function (d) { return d.code === code && d.is_active; }) || null;
    var { data } = await supabase.from('discount_codes').select('*').eq('code', code).eq('is_active', true).maybeSingle();
    return data;
}

async function insertDiscountCode(data) {
    if (mock) {
        var newCode = { id: 'd' + (mockDiscounts.length + 1), used_count: 0, created_at: new Date().toISOString() };
        Object.assign(newCode, data);
        mockDiscounts.push(newCode);
        return newCode;
    }
    var { data: result, error } = await supabase.from('discount_codes').insert(data).select().single();
    if (error) throw error;
    return result;
}

async function incrementDiscountUse(id) {
    if (mock) {
        var d = mockDiscounts.find(function (x) { return x.id === id; });
        if (d) d.used_count = (d.used_count || 0) + 1;
        return;
    }
    try {
        var { data } = await supabase.from('discount_codes').select('used_count').eq('id', id).maybeSingle();
        if (data) {
            await supabase.from('discount_codes').update({ used_count: (data.used_count || 0) + 1 }).eq('id', id);
        }
    } catch (e) { }
}

async function deleteDiscountCode(id) {
    if (mock) {
        var idx = mockDiscounts.findIndex(function (d) { return d.id === id; });
        if (idx !== -1) mockDiscounts.splice(idx, 1);
        return;
    }
    await supabase.from('discount_codes').delete().eq('id', id);
}

async function renderDiscountsAdmin(container) {
    if (role !== 'admin1') { container.innerHTML = '🔒'; return; }

    var codes = await getDiscountCodes();
    var html = '<div class="glass-title" style="font-size:18px;">🎁 کدهای تخفیف (' + codes.length + ')</div>';

    html += '<div class="glass" style="margin-bottom:20px;">' +
        '<div class="glass-title" style="font-size:16px;">➕ افزودن کد جدید</div>' +
        '<form id="addDiscountForm">' +
        '<div class="form-row">' +
        '<div class="form-group"><label>کد</label><input type="text" id="dcCode" placeholder="SUMMER2024" required style="text-transform:uppercase;"></div>' +
        '<div class="form-group"><label>نوع</label><select id="dcType"><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>مقدار</label><input type="number" id="dcValue" placeholder="10" required></div>' +
        '<div class="form-group"><label>حداکثر استفاده</label><input type="number" id="dcMaxUses" placeholder="100" value="100" required></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>حداقل مبلغ</label><input type="number" id="dcMinAmount" placeholder="0" value="0"></div>' +
        '<div class="form-group"><label>تاریخ انقضا</label><input type="date" id="dcExpires"></div>' +
        '</div>' +
        '<button type="submit" class="btn btn-purple"><i class="fas fa-plus"></i> افزودن</button>' +
        '</form></div>';

    html += '<div class="table-wrap"><table><thead><tr>' +
        '<th>کد</th><th>نوع</th><th>مقدار</th><th>استفاده</th><th>حداقل</th><th>وضعیت</th><th>عملیات</th>' +
        '</tr></thead><tbody>';

    codes.forEach(function (c) {
        var typeStr = c.discount_type === 'percent' ? c.discount_value + '%' : formatCurrency(c.discount_value) + ' تومان';
        html += '<tr>' +
            '<td style="color:#ffd700;font-weight:700;">' + c.code + '</td>' +
            '<td>' + (c.discount_type === 'percent' ? 'درصدی' : 'ثابت') + '</td>' +
            '<td>' + typeStr + '</td>' +
            '<td>' + c.used_count + '/' + c.max_uses + '</td>' +
            '<td>' + formatCurrency(c.min_amount) + '</td>' +
            '<td>' + (c.is_active ? '✅ فعال' : '❌ غیرفعال') + '</td>' +
            '<td><button class="btn btn-danger btn-xs" onclick="deleteDiscount(\'' + c.id + '\')">' +
            '<i class="fas fa-trash"></i></button></td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;

    document.getElementById('addDiscountForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
            await insertDiscountCode({
                code: document.getElementById('dcCode').value.trim().toUpperCase(),
                discount_type: document.getElementById('dcType').value,
                discount_value: parseInt(document.getElementById('dcValue').value),
                max_uses: parseInt(document.getElementById('dcMaxUses').value),
                min_amount: parseInt(document.getElementById('dcMinAmount').value) || 0,
                expires_at: document.getElementById('dcExpires').value || null,
                is_active: true,
                created_by: user.id
            });
            toast('✅ کد تخفیف اضافه شد!', 'success');
            loadAdmin('discounts');
        } catch (e) { toast('❌ ' + e.message, 'error'); }
    });
}

window.deleteDiscount = async function (id) {
    if (!confirm('حذف این کد؟')) return;
    try {
        await deleteDiscountCode(id);
        toast('✅ حذف شد', 'success');
        loadAdmin('discounts');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

// ===== REVIEWS ADMIN =====
async function getReviews(movieId) {
    if (mock) return mockReviews.filter(function (r) { return r.movie_id === movieId; });
    var { data } = await supabase.from('reviews').select('*').eq('movie_id', movieId).order('created_at', { ascending: false });
    return data || [];
}

async function insertReview(review) {
    if (mock) {
        var newReview = { id: 'r' + (mockReviews.length + 1), created_at: new Date().toISOString() };
        Object.assign(newReview, review);
        mockReviews.push(newReview);
        return newReview;
    }
    var { data, error } = await supabase.from('reviews').insert(review).select().single();
    if (error) throw error;
    return data;
}

async function renderReviewsAdmin(container) {
    if (role !== 'admin1') { container.innerHTML = '🔒'; return; }

    var reviews = [];
    if (!mock) {
        var { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
        reviews = data || [];
    }

    if (reviews.length === 0) {
        container.innerHTML = '<div class="glass-title" style="font-size:18px;">⭐ نظرات (0)</div>' +
            '<p style="text-align:center;padding:40px;opacity:0.5;">هنوز نظری ثبت نشده</p>';
        return;
    }

    var users = await getUsers();
    var movies = await getMovies();
    var html = '<div class="glass-title" style="font-size:18px;">⭐ نظرات (' + reviews.length + ')</div>' +
        '<div class="table-wrap"><table><thead><tr>' +
        '<th>کاربر</th><th>فیلم</th><th>امتیاز</th><th>نظر</th><th>تاریخ</th>' +
        '</tr></thead><tbody>';

    reviews.forEach(function (r) {
        var u = users.find(function (x) { return x.id === r.user_id; });
        var m = movies.find(function (x) { return x.id === r.movie_id; });
        var userName = u ? (u.first_name + ' ' + u.last_name) : 'کاربر';
        var movieName = m ? m.name : '-';
        var stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);

        html += '<tr>' +
            '<td>' + userName + '</td>' +
            '<td>' + movieName + '</td>' +
            '<td style="color:#ffd700;">' + stars + '</td>' +
            '<td style="font-size:12px;">' + (r.comment || '-') + '</td>' +
            '<td>' + toPersian(r.created_at) + '</td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ===== USER POINTS =====
async function getUserPoints(userId) {
    if (mock) {
        var u = mockUsers.find(function (x) { return String(x.id) === String(userId); });
        return u ? (u.total_points || 0) : 0;
    }
    var { data } = await supabase.from('users').select('total_points').eq('id', userId).maybeSingle();
    return data ? (data.total_points || 0) : 0;
}

async function addUserPoints(userId, points, reason) {
    try {
        if (mock) {
            var u = mockUsers.find(function (x) { return String(x.id) === String(userId); });
            if (u) u.total_points = (u.total_points || 0) + points;
            return;
        }
        var currentPoints = await getUserPoints(userId);
        await supabase.from('users').update({ total_points: currentPoints + points }).eq('id', userId);
        await supabase.from('user_points').insert({ user_id: userId, points: points, reason: reason });
    } catch (e) { }
}

// ===== NOTIFICATIONS =====
async function getNotifications(userId) {
    if (mock) return mockNotifications.filter(function (n) { return n.user_id === userId && !n.is_read; });
    var { data } = await supabase.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false });
    return data || [];
}

async function createNotification(userId, title, message, type, link) {
    try {
        if (mock) {
            mockNotifications.push({
                id: 'n' + (mockNotifications.length + 1),
                user_id: userId,
                title: title,
                message: message,
                type: type,
                link: link,
                is_read: false,
                created_at: new Date().toISOString()
            });
            return;
        }
        await supabase.from('notifications').insert({
            user_id: userId,
            title: title,
            message: message,
            type: type || 'info',
            link: link || null,
            is_read: false
        });
    } catch (e) { }
}

async function markNotificationRead(id) {
    try {
        if (mock) {
            var n = mockNotifications.find(function (x) { return x.id === id; });
            if (n) n.is_read = true;
            return;
        }
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (e) { }
}

// ===== SHOW NOTIFICATIONS =====
window.showNotifications = async function () {
    if (!user) { toast('⚠️ لطفاً وارد شوید', 'error'); return; }
    var notifs = await getNotifications(user.id);
    if (notifs.length === 0) { toast('🔔 اعلان جدیدی ندارید', 'info'); return; }

    var msg = '🔔 ' + notifs.length + ' اعلان جدید:\n\n';
    notifs.slice(0, 5).forEach(function (n) {
        msg += '• ' + n.title + ': ' + n.message + '\n';
    });
    alert(msg);

    for (var i = 0; i < notifs.length; i++) {
        await markNotificationRead(notifs[i].id);
    }
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
};

async function updateNotifBadge() {
    if (!user) {
        var badge = document.getElementById('notifBadge');
        if (badge) badge.style.display = 'none';
        return;
    }
    try {
        var notifs = await getNotifications(user.id);
        var badge = document.getElementById('notifBadge');
        if (badge) {
            if (notifs.length > 0) {
                badge.textContent = notifs.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) { }
}

// ===== FAVORITES =====
async function getFavorites(userId) {
    if (mock) return mockFavorites.filter(function (f) { return f.user_id === userId; });
    var { data } = await supabase.from('favorites').select('*').eq('user_id', userId);
    return data || [];
}

async function addFavorite(userId, movieId) {
    if (mock) {
        if (!mockFavorites.find(function (f) { return f.user_id === userId && f.movie_id === movieId; })) {
            mockFavorites.push({ id: 'f' + (mockFavorites.length + 1), user_id: userId, movie_id: movieId });
        }
        return;
    }
    await supabase.from('favorites').insert({ user_id: userId, movie_id: movieId });
}

async function removeFavorite(userId, movieId) {
    if (mock) {
        var idx = mockFavorites.findIndex(function (f) { return f.user_id === userId && f.movie_id === movieId; });
        if (idx !== -1) mockFavorites.splice(idx, 1);
        return;
    }
    await supabase.from('favorites').delete().eq('user_id', userId).eq('movie_id', movieId);
}

// ===== EXPORT =====
window.renderAdminTabs = renderAdminTabs;
window.loadAdmin = loadAdmin;
window.renderUsers = renderUsers;
window.renderBookings = renderBookings;
window.renderAttendance = renderAttendance;
window.renderCardSettings = renderCardSettings;
window.renderDiscountsAdmin = renderDiscountsAdmin;
window.renderReviewsAdmin = renderReviewsAdmin;
window.getAttendances = getAttendances;
window.insertAttendance = insertAttendance;
window.updateAttendance = updateAttendance;
window.getDiscountCodes = getDiscountCodes;
window.getDiscountByCode = getDiscountByCode;
window.insertDiscountCode = insertDiscountCode;
window.incrementDiscountUse = incrementDiscountUse;
window.deleteDiscountCode = deleteDiscountCode;
window.getReviews = getReviews;
window.insertReview = insertReview;
window.getUserPoints = getUserPoints;
window.addUserPoints = addUserPoints;
window.getNotifications = getNotifications;
window.createNotification = createNotification;
window.markNotificationRead = markNotificationRead;
window.updateNotifBadge = updateNotifBadge;
window.getFavorites = getFavorites;
window.addFavorite = addFavorite;
window.removeFavorite = removeFavorite;