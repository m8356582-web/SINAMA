/* ============================================
   THEME - مدیریت تم‌ها (با رفع مشکل ذخیره‌سازی)
   ============================================ */

// ===== اعمال تم =====
function applyTheme(colors) {
    if (!colors) colors = THEMES['سلطنتی'];
    document.body.style.background = colors.background;
    document.body.style.color = colors.text;
    currentTheme = Object.assign({}, colors);
    updateColorPickers(colors);

    // ذخیره در localStorage
    try {
        localStorage.setItem('cinema_theme', JSON.stringify(colors));
    } catch (e) { }
}

// ===== لود تم ذخیره‌شده =====
async function loadSavedTheme() {
    // اول از localStorage
    try {
        var localTheme = localStorage.getItem('cinema_theme');
        if (localTheme) {
            var t = JSON.parse(localTheme);
            applyTheme(t);
            console.log('✅ تم از localStorage اعمال شد');
        } else {
            applyTheme(THEMES['سلطنتی']);
        }
    } catch (e) {
        applyTheme(THEMES['سلطنتی']);
    }

    // بعد از دیتابیس
    if (!mock && supabase) {
        try {
            var { data } = await supabase
                .from('settings')
                .select('*')
                .eq('key', 'theme_colors')
                .maybeSingle();

            if (data && data.value) {
                applyTheme(data.value);
                localStorage.setItem('cinema_theme', JSON.stringify(data.value));
                console.log('✅ تم از دیتابیس اعمال شد');
            }
        } catch (e) {
            console.log('خطا در لود تم از دیتابیس:', e);
        }
    }

    // بررسی حالت شب
    checkNightMode();
}

// ===== ذخیره تم در دیتابیس =====
async function saveThemeToDB() {
    if (!user) {
        toast('⚠️ ابتدا وارد شوید', 'error');
        return;
    }

    // همیشه در localStorage ذخیره کن
    localStorage.setItem('cinema_theme', JSON.stringify(currentTheme));

    if (mock) {
        toast('💾 تم ذخیره شد! (حالت آفلاین)', 'success');
        return;
    }

    try {
        var { error } = await supabase
            .from('settings')
            .upsert({
                key: 'theme_colors',
                value: currentTheme,
                updated_by: user.id
            }, { onConflict: 'key' });

        if (error) throw error;
        toast('💾 تم ذخیره شد!', 'success');
    } catch (e) {
        console.error(e);
        toast('⚠️ تم در حافظه ذخیره شد (دیتابیس در دسترس نیست)', 'info');
    }
}

// ===== رنگ‌پیکرها =====
function updateColorPickers(colors) {
    var container = document.getElementById('colorPickerContainer');
    if (!container) return;

    var fields = [
        { key: 'background', label: 'پس‌زمینه' },
        { key: 'primary', label: 'رنگ اصلی' },
        { key: 'accent', label: 'رنگ طلایی' },
        { key: 'text', label: 'رنگ متن' }
    ];

    var html = '';
    fields.forEach(function (f) {
        var val = colors[f.key] || '#ffffff';
        var colorVal = val;
        if (val.startsWith('linear-gradient') || val.startsWith('radial-gradient')) {
            colorVal = '#1a4a8a';
        }
        html += '<div class="color-row">' +
            '<label>' + f.label + '</label>' +
            '<input type="color" id="cp_' + f.key + '" value="' + colorVal + '" data-key="' + f.key + '">' +
            '<span style="font-size:12px;opacity:0.4;">' + val + '</span>' +
            '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('input[type="color"]').forEach(function (inp) {
        inp.addEventListener('input', function () {
            var key = this.dataset.key;
            currentTheme[key] = this.value;
            if (key === 'background') {
                var c = Object.assign({}, currentTheme);
                c.background = 'linear-gradient(135deg, ' + this.value + ', ' + darkenColor(this.value) + ')';
                applyTheme(c);
            } else {
                applyTheme(currentTheme);
            }
        });
    });
}

// ===== تیره کردن رنگ =====
function darkenColor(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return '#' + [
        Math.max(0, r - 40),
        Math.max(0, g - 40),
        Math.max(0, b - 40)
    ].map(function (c) {
        return c.toString(16).padStart(2, '0');
    }).join('');
}

// ===== نمایش تم‌های آماده =====
function renderThemePresets() {
    var container = document.getElementById('themePresets');
    if (!container) return;

    var html = '';
    for (var name in THEMES) {
        html += '<span class="theme-preset" data-theme=\'' + JSON.stringify(THEMES[name]) + '\'>' + name + '</span>';
    }
    container.innerHTML = html;

    container.querySelectorAll('.theme-preset').forEach(function (el) {
        el.addEventListener('click', function () {
            var colors = JSON.parse(this.dataset.theme);
            applyTheme(colors);
            toast('🎨 تم "' + this.textContent + '" اعمال شد', 'success');
        });
    });
}

// ===== بررسی حالت شب/روز خودکار =====
function checkNightMode() {
    var hour = new Date().getHours();
    var isNight = hour >= 18 || hour < 6;

    if (isNight) {
        document.body.classList.add('night-mode');
        document.body.classList.remove('day-mode');
        console.log('🌙 حالت شب فعال شد');
    } else {
        document.body.classList.add('day-mode');
        document.body.classList.remove('night-mode');
        console.log('☀️ حالت روز فعال شد');
    }
}

// هر 30 دقیقه چک کن
setInterval(checkNightMode, 30 * 60 * 1000);

// ===== INIT THEME =====
function initTheme() {
    // لود تم ذخیره‌شده
    loadSavedTheme();

    // راه‌اندازی دکمه ذخیره
    var saveBtn = document.getElementById('saveThemeBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            saveThemeToDB();
        });
    }

    // نمایش تم‌های آماده
    renderThemePresets();
}

// ===== EXPORT =====
window.applyTheme = applyTheme;
window.loadSavedTheme = loadSavedTheme;
window.saveThemeToDB = saveThemeToDB;
window.renderThemePresets = renderThemePresets;
window.updateColorPickers = updateColorPickers;
window.initTheme = initTheme;
window.checkNightMode = checkNightMode;