/* ============================================
   BOOKINGS - رزرو، QR، لغو با جریمه
   ============================================ */

// ===== BOOKINGS CRUD =====
async function getBookings() {
    if (mock) return mockBookings.slice();
    try {
        var { data: bookings, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
        if (error) { console.error('خطا:', error); return []; }
        if (!bookings || bookings.length === 0) return [];
        var { data: users } = await supabase.from('users').select('id, first_name, last_name, phone');
        var { data: movies } = await supabase.from('movies').select('id, name, price, release_date');
        bookings.forEach(function (b) {
            var u = users ? users.find(function (x) { return x.id === b.user_id; }) : null;
            var m = movies ? movies.find(function (x) { return x.id === b.movie_id; }) : null;
            b.users = u || null;
            b.movies = m || null;
        });
        return bookings;
    } catch (e) { console.error(e); return []; }
}

async function insertBooking(booking) {
    var receiptUrl = null;
    var fileInput = document.getElementById('receiptImage');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        var file = fileInput.files[0];
        var ext = file.name.split('.').pop();
        var fileName = 'receipts/' + Date.now() + '.' + ext;
        if (!mock) {
            try {
                var { error } = await supabase.storage.from('receipts').upload(fileName, file);
                if (!error) {
                    var { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
                    receiptUrl = urlData.publicUrl;
                }
            } catch (e) { console.error('خطا در آپلود:', e); }
        } else {
            receiptUrl = 'mock-receipt-' + Date.now() + '.jpg';
        }
    }

    var notes = document.getElementById('receiptNotes') ? document.getElementById('receiptNotes').value : null;
    var bookingData = {
        user_id: booking.user_id,
        movie_id: booking.movie_id,
        ticket_count: booking.ticket_count,
        passengers: booking.passengers,
        total_price: booking.total_price,
        original_price: booking.original_price || booking.total_price,
        discount_code: booking.discount_code || null,
        discount_amount: booking.discount_amount || 0,
        receipt_image: receiptUrl,
        receipt_uploaded_at: new Date().toISOString(),
        receipt_notes: notes,
        payment_status: 'waiting_for_approval',
        status: 'active',
        expiry_date: new Date(Date.now() + 86400000 * 2).toISOString()
    };

    if (mock) {
        var newBooking = {
            id: 'b' + (mockBookings.length + 1),
            booking_code: 'BOK-' + String(mockBookings.length + 1).padStart(4, '0')
        };
        Object.assign(newBooking, bookingData);
        mockBookings.push(newBooking);
        return newBooking;
    }

    var { data, error } = await supabase.from('bookings').insert(bookingData).select().single();
    if (error) throw error;

    // افزایش تعداد استفاده کد تخفیف
    if (data && currentDiscount && typeof incrementDiscountUse === 'function') {
        await incrementDiscountUse(currentDiscount.id);
    }

    // اعلان به ادمین
    if (data) {
        try {
            var users = await getUsers();
            var admin = users.find(function (u) { return u.role === 'admin1'; });
            if (admin && typeof createNotification === 'function') {
                await createNotification(admin.id, '🎫 رزرو جدید', 'یک رزرو جدید ثبت شد', 'booking', 'bookings');
                // پخش صدا
                playNotificationSound();
            }
        } catch (e) { }
    }

    return data;
}

async function updateBooking(id, data) {
    if (mock) {
        var idx = mockBookings.findIndex(function (b) { return b.id === id; });
        if (idx === -1) throw new Error('رزرو یافت نشد');
        Object.assign(mockBookings[idx], data);
        return mockBookings[idx];
    }
    var cleanData = {};
    for (var key in data) {
        if (data[key] !== undefined && data[key] !== null) {
            cleanData[key] = data[key];
        }
    }
    var { data: result, error } = await supabase.from('bookings').update(cleanData).eq('id', id).select().single();
    if (error) throw error;
    return result;
}

// ===== NOTIFICATION SOUND =====
function playNotificationSound() {
    try {
        var audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(function () { });
    } catch (e) { }
}

// ===== CANCEL BOOKING WITH FEE =====
window.cancelMyBooking = async function (bookingId) {
    var bookings = await getBookings();
    var b = bookings.find(function (x) { return x.id === bookingId; });
    if (!b) { toast('❌ رزرو یافت نشد', 'error'); return; }

    if (b.status !== 'active') {
        toast('⚠️ این رزرو قابل لغو نیست', 'error');
        return;
    }

    // محاسبه جریمه
    var createdAt = new Date(b.created_at);
    var now = new Date();
    var hoursSince = (now - createdAt) / (1000 * 60 * 60);

    var fee = 0;
    var refund = b.total_price;
    var feeMessage = '';

    // اگه کمتر از 24 ساعت از رزرو گذشته
    if (hoursSince < 24) {
        fee = Math.floor(b.total_price * 0.2);
        refund = b.total_price - fee;
        feeMessage = '⚠️ چون کمتر از 24 ساعت از رزرو گذشته، 20% جریمه کسر می‌شود.\n\n';
    } else {
        feeMessage = '✅ لغو بدون جریمه.\n\n';
    }

    var confirmMsg = feeMessage +
        '💰 مبلغ کل: ' + formatCurrency(b.total_price) + ' تومان\n' +
        '💸 جریمه: ' + formatCurrency(fee) + ' تومان\n' +
        '💵 مبلغ بازگشتی: ' + formatCurrency(refund) + ' تومان\n\n' +
        'آیا از لغو این رزرو اطمینان دارید؟';

    if (!confirm(confirmMsg)) return;

    try {
        await updateBooking(bookingId, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_fee: fee,
            refund_amount: refund
        });

        toast('✅ رزرو لغو شد. مبلغ بازگشتی: ' + formatCurrency(refund) + ' تومان', 'success');
        loadMyBookings();
        loadStats();
    } catch (e) {
        toast('❌ خطا: ' + e.message, 'error');
    }
};

// ===== LOAD MY BOOKINGS =====
async function loadMyBookings() {
    if (!user) return;
    var container = document.getElementById('myBookings');
    if (!container) return;

    var bookings = await getBookings();
    var myBookings = bookings.filter(function (b) { return b.user_id === user.id; });

    if (myBookings.length === 0) {
        container.innerHTML = '<p style="opacity:0.5;">🎫 هیچ رزروی ندارید</p>';
        return;
    }

    var html = '<table><thead><tr>' +
        '<th>فیلم</th><th>تعداد</th><th>تماشاگران</th><th>قیمت</th><th>کد</th><th>وضعیت</th><th>پرداخت</th><th>بلیط</th><th>عملیات</th>' +
        '</tr></thead><tbody>';

    for (var i = 0; i < myBookings.length; i++) {
        var b = myBookings[i];
        var movieName = b.movies ? b.movies.name : '-';
        var passengers = b.passengers || [];
        var names = passengers.map(function (p) { return p.full_name; }).join('، ') || '-';
        var total = b.total_price || 0;

        var ps = b.payment_status === 'waiting_for_approval' ? '⏳ در انتظار تایید' :
            b.payment_status === 'approved' ? '✅ تایید شده' :
                b.payment_status === 'rejected' ? '❌ رد شده' :
                    b.payment_status === 'paid' ? '✅ پرداخت شده' : '❌ پرداخت نشده';

        // دکمه بلیط - برای همه به جز لغو شده‌ها
        var ticketBtn = '-';
        if (b.status !== 'cancelled') {
            ticketBtn = '<button class="btn btn-warning btn-xs" onclick="showTicket(\'' + b.id + '\')">' +
                '<i class="fas fa-ticket-alt"></i></button>';
        }

        // دکمه لغو - فقط برای فعال‌ها
        var cancelBtn = '-';
        if (b.status === 'active') {
            cancelBtn = '<button class="btn btn-danger btn-xs" onclick="cancelMyBooking(\'' + b.id + '\')">' +
                '<i class="fas fa-times"></i> لغو</button>';
        }

        html += '<tr>' +
            '<td>' + movieName + '</td>' +
            '<td>' + b.ticket_count + '</td>' +
            '<td style="font-size:12px;">' + names + '</td>' +
            '<td>' + formatCurrency(total) + ' تومان</td>' +
            '<td style="color:#ffd700;">' + (b.booking_code || '-') + '</td>' +
            '<td>' + (b.status === 'active' ? '✅ فعال' : b.status === 'cancelled' ? '❌ لغو شده' : '⏰ منقضی') + '</td>' +
            '<td>' + ps + '</td>' +
            '<td>' + ticketBtn + '</td>' +
            '<td>' + cancelBtn + '</td>' +
            '</tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===== OPEN BOOKING =====
window.openBooking = async function (movieId) {
    if (!user) { toast('⚠️ لطفاً وارد شوید', 'error'); return; }
    selectedMovie = movieId;
    currentDiscount = null;

    try {
        var movies = await getMovies();
        var movie = movies.find(function (m) { return m.id === movieId; });
        if (!movie) { toast('❌ فیلم یافت نشد', 'error'); return; }

        document.getElementById('bookingMovieName').value = movie.name;
        document.getElementById('bookingPrice').value = formatCurrency(movie.price) + ' تومان';
        document.getElementById('bookingTicketCount').value = 1;
        document.getElementById('bookingTicketCount').max = movie.capacity;
        document.getElementById('discountCodeInput').value = '';
        document.getElementById('discountBox').classList.remove('show');
        passengerCount = 1;
        renderPassengers(movie.price);

        var cardNumber = await getCardNumber();
        document.getElementById('cardNumberDisplay').textContent = cardNumber;

        openModal('bookingModal');
    } catch (e) { toast('❌ خطا: ' + e.message, 'error'); }
};

// ===== GET CARD NUMBER =====
async function getCardNumber() {
    try {
        var users = await getUsers();
        var admin = users.find(function (u) { return u.role === 'admin1'; });
        return admin && admin.card_number ? admin.card_number : 'شماره کارت ثبت نشده است';
    } catch (e) { return 'شماره کارت ثبت نشده است'; }
}

// ===== RENDER PASSENGERS =====
function renderPassengers(price) {
    var container = document.getElementById('passengersContainer');
    if (!container) return;

    var html = '';
    for (var i = 0; i < passengerCount; i++) {
        html += '<div class="passenger-box">' +
            '<div class="passenger-title">🧑 تماشاگر ' + (i + 1) + '</div>' +
            '<div class="form-row">' +
            '<div class="form-group">' +
            '<label>نام و نام خانوادگی</label>' +
            '<input type="text" class="passenger-name" placeholder="علی رضایی" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>شماره تلفن</label>' +
            '<input type="tel" class="passenger-phone" placeholder="09123456789" required>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>کد ملی</label>' +
            '<input type="text" class="passenger-national" placeholder="1234567890">' +
            '</div>' +
            '</div>';
    }
    container.innerHTML = html;
    updateTotalPrice(price);
}

// ===== ADD PASSENGER =====
window.addPassenger = async function () {
    var movies = await getMovies();
    var movie = movies.find(function (m) { return m.id === selectedMovie; });
    if (movie) {
        var current = parseInt(document.getElementById('bookingTicketCount').value) || 1;
        if (current < movie.capacity) {
            passengerCount++;
            document.getElementById('bookingTicketCount').value = current + 1;
            renderPassengers(movie.price);
        } else {
            toast('❌ ظرفیت سالن کامل است', 'error');
        }
    }
};

// ===== REMOVE PASSENGER =====
window.removePassenger = async function () {
    if (passengerCount > 1) {
        passengerCount--;
        var movies = await getMovies();
        var movie = movies.find(function (m) { return m.id === selectedMovie; });
        document.getElementById('bookingTicketCount').value = passengerCount;
        if (movie) renderPassengers(movie.price);
    } else {
        toast('❌ حداقل یک تماشاگر باید باشد', 'error');
    }
};

// ===== UPDATE TOTAL PRICE =====
function updateTotalPrice(price) {
    var count = parseInt(document.getElementById('bookingTicketCount').value) || 1;
    var total = count * price;

    if (currentDiscount) {
        var discountAmount = 0;
        if (currentDiscount.discount_type === 'percent') {
            discountAmount = Math.floor(total * currentDiscount.discount_value / 100);
        } else {
            discountAmount = currentDiscount.discount_value;
        }
        var finalTotal = Math.max(0, total - discountAmount);

        document.getElementById('originalPriceDisplay').textContent = formatCurrency(total) + ' تومان';
        document.getElementById('discountAmountDisplay').textContent = '-' + formatCurrency(discountAmount) + ' تومان';
        document.getElementById('discountPercent').textContent = currentDiscount.discount_type === 'percent' ?
            currentDiscount.discount_value + '%' : 'ثابت';
        document.getElementById('bookingTotalPrice').value = formatCurrency(finalTotal) + ' تومان';
    } else {
        document.getElementById('bookingTotalPrice').value = formatCurrency(total) + ' تومان';
    }
}

// ===== APPLY DISCOUNT =====
window.applyDiscount = async function () {
    var code = document.getElementById('discountCodeInput').value.trim().toUpperCase();
    if (!code) { toast('❌ کد تخفیف را وارد کنید', 'error'); return; }

    if (typeof getDiscountByCode !== 'function') {
        toast('❌ سیستم تخفیف در دسترس نیست', 'error');
        return;
    }

    var discount = await getDiscountByCode(code);
    if (!discount) { toast('❌ کد تخفیف نامعتبر است', 'error'); return; }

    if (discount.used_count >= discount.max_uses) {
        toast('❌ این کد به حداکثر استفاده رسیده', 'error');
        return;
    }

    var movies = await getMovies();
    var movie = movies.find(function (m) { return m.id === selectedMovie; });
    var count = parseInt(document.getElementById('bookingTicketCount').value) || 1;
    var total = count * movie.price;

    if (total < discount.min_amount) {
        toast('⚠️ حداقل مبلغ برای این کد ' + formatCurrency(discount.min_amount) + ' تومان است', 'error');
        return;
    }

    currentDiscount = discount;
    document.getElementById('discountBox').classList.add('show');
    updateTotalPrice(movie.price);
    toast('✅ کد تخفیف اعمال شد!', 'success');
};

// ===== BOOKING FORM SUBMIT =====
document.addEventListener('DOMContentLoaded', function () {
    var bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!user || !selectedMovie) { toast('❌ خطا در رزرو', 'error'); return; }

            var movies = await getMovies();
            var movie = movies.find(function (m) { return m.id === selectedMovie; });
            if (!movie) { toast('❌ فیلم یافت نشد', 'error'); return; }

            var count = parseInt(document.getElementById('bookingTicketCount').value) || 1;
            var inputs = document.querySelectorAll('.passenger-box');
            var passengers = [];
            var valid = true;

            inputs.forEach(function (box, idx) {
                var name = box.querySelector('.passenger-name').value.trim();
                var phone = box.querySelector('.passenger-phone').value.trim();
                var national = box.querySelector('.passenger-national').value.trim() || null;
                if (!name || !phone) {
                    toast('❌ اطلاعات تماشاگر ' + (idx + 1) + ' کامل نیست', 'error');
                    valid = false;
                    return;
                }
                passengers.push({ full_name: name, phone: phone, national_code: national });
            });

            if (!valid) return;

            var fileInput = document.getElementById('receiptImage');
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                toast('❌ لطفاً تصویر رسید را بارگذاری کنید', 'error');
                return;
            }

            var originalTotal = count * movie.price;
            var finalTotal = originalTotal;
            var discountAmount = 0;

            if (currentDiscount) {
                if (currentDiscount.discount_type === 'percent') {
                    discountAmount = Math.floor(originalTotal * currentDiscount.discount_value / 100);
                } else {
                    discountAmount = currentDiscount.discount_value;
                }
                finalTotal = Math.max(0, originalTotal - discountAmount);
            }

            try {
                var booking = await insertBooking({
                    user_id: user.id,
                    movie_id: selectedMovie,
                    ticket_count: count,
                    passengers: passengers,
                    total_price: finalTotal,
                    original_price: originalTotal,
                    discount_code: currentDiscount ? currentDiscount.code : null,
                    discount_amount: discountAmount
                });

                // امتیاز کاربر
                if (typeof addUserPoints === 'function') {
                    await addUserPoints(user.id, count * 10, 'رزرو ' + count + ' بلیط');
                }

                toast('✅ رزرو موفق! کد: ' + booking.booking_code, 'success');
                currentDiscount = null;
                closeModal('bookingModal');
                loadMyBookings();
                loadStats();
                loadMovies('homeMovies', 'all');
                if (typeof loadRecommendations === 'function') loadRecommendations();
                if (document.getElementById('page-movies').classList.contains('active')) {
                    loadMovies('moviesList', filter);
                }
                document.getElementById('bookingForm').reset();
                document.getElementById('passengersContainer').innerHTML = '';
                document.getElementById('discountBox').classList.remove('show');
            } catch (e) {
                toast('❌ خطا: ' + e.message, 'error');
            }
        });
    }

    // تغییر تعداد بلیط
    var ticketCount = document.getElementById('bookingTicketCount');
    if (ticketCount) {
        ticketCount.addEventListener('change', async function () {
            var movies = await getMovies();
            var movie = movies.find(function (m) { return m.id === selectedMovie; });
            if (movie) {
                var val = parseInt(this.value) || 1;
                if (val < 1) val = 1;
                if (val > movie.capacity) {
                    val = movie.capacity;
                    toast('⚠️ حداکثر ' + movie.capacity + ' بلیط', 'info');
                }
                this.value = val;
                passengerCount = val;
                renderPassengers(movie.price);
                if (currentDiscount) updateTotalPrice(movie.price);
            }
        });
    }
});

// ===== SHOW TICKET =====
window.showTicket = async function (bookingId) {
    try {
        var bookings = await getBookings();
        var b = bookings.find(function (x) { return x.id === bookingId; });
        if (!b) { toast('❌ یافت نشد', 'error'); return; }

        var movieName = b.movies ? b.movies.name : '-';
        var userName = b.users ? (b.users.first_name + ' ' + b.users.last_name) : '-';
        var releaseDate = b.movies ? toPersian(b.movies.release_date) : '-';
        var passengers = b.passengers || [];

        var qrText = JSON.stringify({
            code: b.booking_code,
            name: userName,
            movie: movieName,
            date: releaseDate,
            count: b.ticket_count
        });

        var ticketHTML =
            '<div style="margin-bottom:20px;">' +
            '<div style="font-size:20px;font-weight:900;color:#ffd700;margin-bottom:10px;">🎬 سینما</div>' +
            '<div style="font-size:14px;opacity:0.6;">بلیط ورود به سینما</div>' +
            '</div>' +
            '<div style="background:white;border-radius:16px;padding:16px;margin-bottom:20px;display:inline-block;">' +
            '<div id="qrcode"></div>' +
            '</div>' +
            '<div style="text-align:right;font-size:13px;">' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1);">' +
            '<span style="opacity:0.6;">کد بلیط:</span>' +
            '<strong style="color:#ffd700;">' + b.booking_code + '</strong>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1);">' +
            '<span style="opacity:0.6;">نام:</span>' +
            '<strong>' + userName + '</strong>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1);">' +
            '<span style="opacity:0.6;">فیلم:</span>' +
            '<strong>' + movieName + '</strong>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1);">' +
            '<span style="opacity:0.6;">تاریخ:</span>' +
            '<strong>' + releaseDate + '</strong>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1);">' +
            '<span style="opacity:0.6;">تعداد:</span>' +
            '<strong>' + b.ticket_count + ' نفر</strong>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;">' +
            '<span style="opacity:0.6;">تماشاگران:</span>' +
            '<strong style="font-size:12px;">' + passengers.map(function (p) { return p.full_name; }).join('، ') + '</strong>' +
            '</div>' +
            '</div>' +
            '<div style="font-size:11px;opacity:0.5;margin-top:15px;">' +
            '📌 این بلیط را چاپ کرده و هنگام ورود تحویل دهید' +
            '</div>';

        document.getElementById('ticketContent').innerHTML = ticketHTML;
        openModal('ticketModal');

        // ساخت QR
        setTimeout(function () {
            var qrDiv = document.getElementById('qrcode');
            if (!qrDiv) return;
            qrDiv.innerHTML = '';

            if (typeof QRCode !== 'undefined') {
                try {
                    new QRCode(qrDiv, {
                        text: qrText,
                        width: 200,
                        height: 200,
                        colorDark: '#0a1628',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    console.log('✅ QR با کتابخانه ساخته شد');
                    return;
                } catch (e) {
                    console.error('خطا در QRCode:', e);
                }
            }

            // پشتیبان: API آنلاین
            var apiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrText);
            qrDiv.innerHTML = '<img src="' + apiUrl + '" width="200" height="200" alt="QR Code" style="display:block;">';
            console.log('✅ QR با API ساخته شد');
        }, 200);

    } catch (e) { toast('❌ خطا: ' + e.message, 'error'); }
};

// ===== PRINT TICKET =====
window.printTicket = function () {
    var content = document.getElementById('ticketContent').innerHTML;
    var printWindow = window.open('', '', 'height=700,width=500');
    printWindow.document.write('<html dir="rtl"><head><title>چاپ بلیط</title>');
    printWindow.document.write('<style>body{font-family:Tahoma,sans-serif;padding:20px;text-align:center;background:white;color:black;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(function () { printWindow.print(); }, 500);
};

// ===== DOWNLOAD PDF =====
window.downloadTicketPDF = function () {
    var element = document.getElementById('ticketContent');
    var opt = {
        margin: 0.5,
        filename: 'cinema-ticket-' + Date.now() + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#0a1628' },
        jsPDF: { unit: 'in', format: 'a5', orientation: 'portrait' }
    };
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
        toast('📥 در حال دانلود PDF...', 'success');
    } else {
        toast('❌ کتابخانه PDF لود نشده', 'error');
    }
};

// ===== EXPORT =====
window.getBookings = getBookings;
window.insertBooking = insertBooking;
window.updateBooking = updateBooking;
window.loadMyBookings = loadMyBookings;
window.getCardNumber = getCardNumber;