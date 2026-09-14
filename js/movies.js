/* ============================================
   MOVIES - فیلم‌ها، گالری، تریلر، اطلاعات کامل
   ============================================ */

// ===== MOVIE CRUD =====
async function getMovies() {
    if (mock) return mockMovies.slice();
    var { data } = await supabase.from('movies').select('*').order('release_date');
    return data || [];
}

async function insertMovie(movie) {
    if (mock) {
        var newMovie = { id: 'm' + (mockMovies.length + 1) };
        Object.assign(newMovie, movie);
        mockMovies.push(newMovie);
        return newMovie;
    }
    var { data, error } = await supabase.from('movies').insert(movie).select().single();
    if (error) throw error;
    return data;
}

async function updateMovie(id, data) {
    if (mock) {
        var idx = mockMovies.findIndex(function (m) { return m.id === id; });
        if (idx === -1) throw new Error('فیلم یافت نشد');
        Object.assign(mockMovies[idx], data);
        return mockMovies[idx];
    }
    var { data: result, error } = await supabase.from('movies').update(data).eq('id', id).select().single();
    if (error) throw error;
    return result;
}

async function deleteMovie(id) {
    if (mock) {
        var idx = mockMovies.findIndex(function (m) { return m.id === id; });
        if (idx === -1) throw new Error('فیلم یافت نشد');
        mockMovies.splice(idx, 1);
        return;
    }
    var { error } = await supabase.from('movies').delete().eq('id', id);
    if (error) throw error;
}

// ===== GALLERY =====
async function getMovieGallery(movieId) {
    if (mock) return [];
    var { data } = await supabase.from('movie_gallery').select('*').eq('movie_id', movieId).order('sort_order');
    return data || [];
}

async function addGalleryImage(movieId, imageUrl, title) {
    if (mock) return;
    await supabase.from('movie_gallery').insert({ movie_id: movieId, image_url: imageUrl, title: title || null });
}

// ===== LOAD MOVIES =====
async function loadMovies(containerId, filterType) {
    filterType = filterType || 'all';
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>بارگذاری...</p></div>';

    var movies = await getMovies();
    var filtered = movies;
    if (filterType !== 'all') {
        filtered = movies.filter(function (m) { return m.status === filterType; });
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p style="opacity:0.5;text-align:center;padding:30px;">🎬 هیچ فیلمی یافت نشد</p>';
        return;
    }

    var favorites = user && typeof getFavorites === 'function' ? await getFavorites(user.id) : [];
    var html = '';

    for (var i = 0; i < filtered.length; i++) {
        var m = filtered[i];
        var statusMap = { 'now_showing': 'در حال اکران', 'coming_soon': 'به زودی', 'ended': 'پایان یافته' };
        var cls = m.status === 'now_showing' ? '' : m.status === 'coming_soon' ? 'soon' : 'ended';
        var available = m.status === 'now_showing' && user;
        var date = toPersian(m.release_date);
        var isFav = favorites.some(function (f) { return f.movie_id === m.id; });
        var isCompare = compareList.indexOf(m.id) !== -1;

        html += '<div class="movie-card">';

        // دکمه علاقه‌مندی
        if (user && typeof toggleFavorite === 'function') {
            html += '<button class="fav-btn ' + (isFav ? 'active' : '') + '" onclick="toggleFavorite(\'' + m.id + '\', this)">' +
                '<i class="fas fa-heart"></i></button>';
        }

        // چک‌باکس مقایسه
        if (user && typeof toggleCompare === 'function') {
            html += '<input type="checkbox" class="compare-check" ' + (isCompare ? 'checked' : '') +
                ' onclick="toggleCompare(\'' + m.id + '\', \'' + m.name.replace(/'/g, "\\'") + '\')" title="مقایسه">';
        }

        // بج ویژه
        if (m.imdb_rating && m.imdb_rating >= 8) {
            html += '<div class="badge-new badge-hot">🔥 محبوب</div>';
        }

        // آیکن
        html += '<div class="icon"><i class="fas fa-film"></i></div>';
        html += '<h3>' + m.name + '</h3>';
        html += '<div class="badge ' + cls + '">' + (statusMap[m.status] || m.status) + '</div>';

        // اطلاعات فیلم
        if (m.director) {
            html += '<p style="font-size:12px;opacity:0.6;margin-top:5px;">🎬 ' + m.director + '</p>';
        }
        if (m.genre) {
            html += '<p style="font-size:12px;opacity:0.6;">🎭 ' + m.genre + '</p>';
        }
        if (m.duration) {
            html += '<p style="font-size:12px;opacity:0.6;">⏱️ ' + m.duration + ' دقیقه</p>';
        }
        if (m.imdb_rating) {
            html += '<p style="font-size:13px;color:#ffd700;font-weight:700;margin-top:5px;">⭐ IMDB: ' + m.imdb_rating + '</p>';
        }

        html += '<p style="opacity:0.6;font-size:13px;">📅 ' + date + '</p>';
        html += '<p style="opacity:0.5;font-size:12px;">ظرفیت: ' + m.capacity + ' نفر</p>';
        html += '<div class="price">' + formatCurrency(m.price) + ' تومان</div>';

        // شمارش معکوس برای به‌زودی‌ها
        if (m.status === 'coming_soon') {
            html += '<div class="countdown" id="countdown_' + m.id + '" data-date="' + m.release_date + '"></div>';
        }

        // دکمه‌ها
        html += '<div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">';

        if (available) {
            html += '<button class="btn btn-primary btn-sm" onclick="openBooking(\'' + m.id + '\')">' +
                '<i class="fas fa-ticket-alt"></i> رزرو</button>';
        } else if (m.status === 'now_showing' && !user) {
            html += '<button class="btn btn-glass btn-sm" onclick="toast(\'لطفاً وارد شوید\',\'error\')">' +
                '<i class="fas fa-ticket-alt"></i> رزرو</button>';
        }

        // دکمه اطلاعات
        html += '<button class="btn btn-glass btn-sm" onclick="showMovieInfo(\'' + m.id + '\')">' +
            '<i class="fas fa-info-circle"></i> اطلاعات</button>';

        // دکمه تریلر
        if (m.trailer_url) {
            html += '<button class="btn btn-glass btn-sm" onclick="showTrailer(\'' + m.id + '\')">' +
                '<i class="fas fa-video"></i> تریلر</button>';
        }

        // دکمه گالری
        html += '<button class="btn btn-glass btn-sm" onclick="showGallery(\'' + m.id + '\', \'' + m.name.replace(/'/g, "\\'") + '\')">' +
            '<i class="fas fa-images"></i> گالری</button>';

        // دکمه نظرات
        html += '<button class="btn btn-glass btn-sm" onclick="openReviews(\'' + m.id + '\', \'' + m.name.replace(/'/g, "\\'") + '\')">' +
            '<i class="fas fa-star"></i> نظرات</button>';

        // دکمه watchlist
        if (user && typeof toggleWatchlist === 'function') {
            html += '<button class="btn btn-glass btn-sm" onclick="toggleWatchlist(\'' + m.id + '\', this)">' +
                '<i class="fas fa-clock"></i> تماشای بعدی</button>';
        }

        html += '</div>';
        html += '</div>';
    }

    container.innerHTML = html;

    // راه‌اندازی شمارش معکوس‌ها
    updateAllCountdowns();
}

// ===== COUNTDOWN =====
function updateAllCountdowns() {
    var countdowns = document.querySelectorAll('[id^="countdown_"]');
    countdowns.forEach(function (el) {
        var targetDate = el.dataset.date;
        if (!targetDate) return;
        updateCountdown(el, targetDate);
    });
}

function updateCountdown(el, targetDate) {
    var target = new Date(targetDate).getTime();

    var interval = setInterval(function () {
        var now = new Date().getTime();
        var diff = target - now;

        if (diff <= 0) {
            el.innerHTML = '<span style="color:#4ade80;font-weight:700;">🎉 اکران شد!</span>';
            clearInterval(interval);
            return;
        }

        var days = Math.floor(diff / (1000 * 60 * 60 * 24));
        var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((diff % (1000 * 60)) / 1000);

        el.innerHTML =
            '<div class="countdown-item"><div class="num">' + days + '</div><div class="lbl">روز</div></div>' +
            '<div class="countdown-item"><div class="num">' + hours + '</div><div class="lbl">ساعت</div></div>' +
            '<div class="countdown-item"><div class="num">' + minutes + '</div><div class="lbl">دقیقه</div></div>' +
            '<div class="countdown-item"><div class="num">' + seconds + '</div><div class="lbl">ثانیه</div></div>';
    }, 1000);
}

// ===== SHOW MOVIE INFO =====
window.showMovieInfo = async function (movieId) {
    var movies = await getMovies();
    var m = movies.find(function (x) { return x.id === movieId; });
    if (!m) { toast('❌ فیلم یافت نشد', 'error'); return; }

    var date = toPersian(m.release_date);
    var statusMap = { 'now_showing': 'در حال اکران', 'coming_soon': 'به زودی', 'ended': 'پایان یافته' };

    var infoHTML =
        '<div class="info-panel">' +
        '<div class="title"><i class="fas fa-film"></i> اطلاعات فیلم</div>' +
        '<div class="content">' +
        '<div class="movie-info-grid">' +
        '<div class="movie-info-item"><div class="label">نام</div><div class="value">' + m.name + '</div></div>' +
        '<div class="movie-info-item"><div class="label">تاریخ اکران</div><div class="value">' + date + '</div></div>' +
        '<div class="movie-info-item"><div class="label">وضعیت</div><div class="value">' + (statusMap[m.status] || m.status) + '</div></div>' +
        (m.director ? '<div class="movie-info-item"><div class="label">کارگردان</div><div class="value">' + m.director + '</div></div>' : '') +
        (m.genre ? '<div class="movie-info-item"><div class="label">ژانر</div><div class="value">' + m.genre + '</div></div>' : '') +
        (m.duration ? '<div class="movie-info-item"><div class="label">مدت</div><div class="value">' + m.duration + ' دقیقه</div></div>' : '') +
        (m.age_rating ? '<div class="movie-info-item"><div class="label">رده سنی</div><div class="value">' + m.age_rating + '</div></div>' : '') +
        (m.imdb_rating ? '<div class="movie-info-item"><div class="label">امتیاز IMDB</div><div class="value">⭐ ' + m.imdb_rating + '</div></div>' : '') +
        '<div class="movie-info-item"><div class="label">ظرفیت</div><div class="value">' + m.capacity + ' نفر</div></div>' +
        '<div class="movie-info-item"><div class="label">قیمت</div><div class="value">' + formatCurrency(m.price) + ' تومان</div></div>' +
        '</div>' +
        (m.actors ? '<div style="margin-top:15px;"><strong style="color:#ffd700;">🎭 بازیگران:</strong><br>' + m.actors + '</div>' : '') +
        (m.description ? '<div style="margin-top:15px;"><strong style="color:#ffd700;">📖 خلاصه داستان:</strong><br>' + m.description + '</div>' : '') +
        '</div>' +
        '</div>';

    // نمایش در یک مودال ساده
    showInfoModal(m.name, infoHTML);
};

// ===== SHOW TRAILER =====
window.showTrailer = async function (movieId) {
    var movies = await getMovies();
    var m = movies.find(function (x) { return x.id === movieId; });
    if (!m || !m.trailer_url) { toast('❌ تریلر موجود نیست', 'error'); return; }

    var trailerTitle = document.getElementById('trailerTitle');
    var trailerContent = document.getElementById('trailerContent');

    trailerTitle.textContent = '🎥 تریلر ' + m.name;

    // استخراج ID ویدیو از URL
    var videoUrl = m.trailer_url;
    var embedUrl = videoUrl;

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        var videoId = '';
        if (videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        } else if (videoUrl.includes('watch?v=')) {
            videoId = videoUrl.split('watch?v=')[1].split('&')[0];
        }
        embedUrl = 'https://www.youtube.com/embed/' + videoId;
    } else if (videoUrl.includes('aparat.com')) {
        // برای آپارات
        var aparatId = videoUrl.split('/v/')[1];
        if (aparatId) {
            embedUrl = 'https://www.aparat.com/video/video/embed/videohash/' + aparatId + '/vt/frame';
        }
    }

    trailerContent.innerHTML = '<iframe src="' + embedUrl + '" allowfullscreen></iframe>';
    openModal('trailerModal');
};

// ===== SHOW GALLERY =====
window.showGallery = async function (movieId, movieName) {
    var galleryTitle = document.getElementById('galleryTitle');
    var galleryContent = document.getElementById('galleryContent');

    galleryTitle.textContent = '📸 گالری ' + movieName;
    galleryContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    openModal('galleryModal');

    var images = await getMovieGallery(movieId);

    if (images.length === 0) {
        galleryContent.innerHTML = '<p style="text-align:center;padding:30px;opacity:0.5;grid-column:1/-1;">' +
            '📷 هنوز تصویری برای این فیلم ثبت نشده</p>';
        return;
    }

    var html = '';
    images.forEach(function (img) {
        html += '<div class="gallery-thumb" onclick="window.open(\'' + img.image_url + '\', \'_blank\')">' +
            '<img src="' + img.image_url + '" alt="' + (img.title || movieName) + '" loading="lazy">' +
            '</div>';
    });
    galleryContent.innerHTML = html;
};

// ===== SHOW INFO MODAL (کمکی) =====
function showInfoModal(title, content) {
    // اگه مودال اطلاعات وجود نداره، بساز
    var modal = document.getElementById('infoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'infoModal';
        modal.innerHTML =
            '<div class="modal" style="max-width:700px;">' +
            '<button class="close-btn" onclick="closeModal(\'infoModal\')"><i class="fas fa-times"></i></button>' +
            '<h2 id="infoModalTitle"></h2>' +
            '<div id="infoModalContent"></div>' +
            '</div>';
        document.body.appendChild(modal);
    }

    document.getElementById('infoModalTitle').textContent = '📋 ' + title;
    document.getElementById('infoModalContent').innerHTML = content;
    openModal('infoModal');
}

// ===== FILTER =====
window.filterMovies = function (filterType) {
    filter = filterType;
    loadMovies('moviesList', filterType);
};

// ===== MOVIES ADMIN =====
async function renderMoviesAdmin(container) {
    if (role !== 'admin1') {
        container.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.6;">' +
            '<i class="fas fa-lock" style="font-size:48px;color:#ffd700;margin-bottom:15px;display:block;"></i>' +
            '<p>🔒 مدیریت فیلم‌ها فقط برای ادمین کل</p></div>';
        return;
    }

    var movies = await getMovies();
    var html = '<div class="glass-title" style="font-size:18px;">🎬 فیلم‌ها (' + movies.length + ')</div>' +
        '<div class="table-wrap"><table><thead><tr>' +
        '<th>نام</th><th>تاریخ</th><th>ظرفیت</th><th>قیمت</th><th>وضعیت</th><th>IMDB</th><th>عملیات</th>' +
        '</tr></thead><tbody>';

    movies.forEach(function (m) {
        html += '<tr>' +
            '<td>' + m.name + '</td>' +
            '<td>' + toPersian(m.release_date) + '</td>' +
            '<td>' + m.capacity + '</td>' +
            '<td>' + formatCurrency(m.price) + ' تومان</td>' +
            '<td>' + m.status + '</td>' +
            '<td>' + (m.imdb_rating || '-') + '</td>' +
            '<td><div class="table-actions">' +
            '<button class="btn btn-warning btn-xs" onclick="editMovie(\'' + m.id + '\')">' +
            '<i class="fas fa-edit"></i></button>' +
            '<button class="btn btn-info btn-xs" onclick="addMovieGallery(\'' + m.id + '\')">' +
            '<i class="fas fa-images"></i></button>' +
            '<button class="btn btn-danger btn-xs" onclick="deleteMovieAdmin(\'' + m.id + '\')">' +
            '<i class="fas fa-trash"></i></button>' +
            '</div></td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

window.editMovie = async function (movieId) {
    var movies = await getMovies();
    var m = movies.find(function (x) { return x.id === movieId; });
    if (!m) return;

    var name = prompt('نام:', m.name); if (!name) return;
    var capacity = prompt('ظرفیت:', m.capacity); if (!capacity) return;
    var price = prompt('قیمت:', m.price); if (!price) return;
    var status = prompt('وضعیت (now_showing/coming_soon/ended):', m.status); if (!status) return;
    var director = prompt('کارگردان:', m.director || '');
    var genre = prompt('ژانر:', m.genre || '');
    var duration = prompt('مدت (دقیقه):', m.duration || '');
    var imdb = prompt('امتیاز IMDB:', m.imdb_rating || '');
    var trailer = prompt('لینک تریلر:', m.trailer_url || '');

    try {
        await updateMovie(movieId, {
            name: name.trim(),
            capacity: parseInt(capacity),
            price: parseInt(price),
            status: status.trim(),
            director: director.trim() || null,
            genre: genre.trim() || null,
            duration: duration ? parseInt(duration) : null,
            imdb_rating: imdb ? parseFloat(imdb) : null,
            trailer_url: trailer.trim() || null
        });
        toast('✅ به‌روز شد', 'success');
        loadAdmin('movies');
        loadMovies('homeMovies', 'all');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

window.deleteMovieAdmin = async function (movieId) {
    if (!confirm('حذف فیلم؟')) return;
    try {
        await deleteMovie(movieId);
        toast('✅ حذف شد', 'success');
        loadAdmin('movies');
        loadMovies('homeMovies', 'all');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
};

window.addMovieGallery = function (movieId) {
    var url = prompt('لینک تصویر:');
    if (!url) return;
    var title = prompt('عنوان تصویر (اختیاری):') || '';
    addGalleryImage(movieId, url, title).then(function () {
        toast('✅ تصویر اضافه شد', 'success');
    }).catch(function (e) {
        toast('❌ ' + e.message, 'error');
    });
};

// ===== EXPORT =====
window.getMovies = getMovies;
window.insertMovie = insertMovie;
window.updateMovie = updateMovie;
window.deleteMovie = deleteMovie;
window.loadMovies = loadMovies;
window.renderMoviesAdmin = renderMoviesAdmin;
window.getMovieGallery = getMovieGallery;