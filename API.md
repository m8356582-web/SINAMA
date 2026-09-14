# مستندات API

## احراز هویت

- initAuth() - راه‌اندازی سیستم
- getUserByPhone(phone) - دریافت کاربر
- insertUser(data) - ثبت‌نام
- updateUser(id, data) - به‌روزرسانی
- logout() - خروج

## فیلم‌ها

- getMovies() - لیست فیلم‌ها
- insertMovie(movie) - افزودن
- updateMovie(id, data) - ویرایش
- deleteMovie(id) - حذف
- loadMovies(id, filter) - نمایش
- showMovieInfo(id) - اطلاعات
- showTrailer(id) - تریلر
- showGallery(id, name) - گالری

## رزرو

- getBookings() - همه رزروها
- insertBooking(data) - ثبت
- updateBooking(id, data) - ویرایش
- loadMyBookings() - رزروهای من
- cancelMyBooking(id) - لغو
- showTicket(id) - نمایش بلیط
- printTicket() - چاپ
- downloadTicketPDF() - PDF

## ادمین

- renderAdminTabs() - تب‌ها
- loadAdmin(tab) - لود
- renderUsers(c) - کاربران
- renderBookings(c) - رزروها
- approvePayment(id) - تایید
- rejectPayment(id) - رد
- confirmPaymentReceived(id) - دریافت
- checkIn(id) - حضور
- checkOut(id) - خروج

## اضافی

- toggleFavorite(id) - علاقه‌مندی
- toggleWatchlist(id) - تماشای بعدی
- toggleCompare(id) - مقایسه
- openScanner() - اسکنر
- openChat() - چت
- showNotifications() - اعلان‌ها

## کمکی

- toPersian(date) - تاریخ شمسی
- formatCurrency(n) - فرمت قیمت
- toast(msg) - پیام
- openModal(id) - مودال
- closeModal(id) - بستن