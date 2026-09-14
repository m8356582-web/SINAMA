/* ============================================
   AUTH - احراز هویت کاربران
   ============================================ */

// ===== USERS =====
async function getUsers() {
    if (mock) return mockUsers.slice();
    var { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    return data || [];
}

async function getUserByPhone(phone) {
    if (mock) return mockUsers.find(function (u) { return u.phone === phone; }) || null;
    var { data } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    return data;
}

async function insertUser(userData) {
    if (mock) {
        var newUser = {
            id: String(mockUsers.length + 1),
            code: generateCode(),
            total_points: 0,
            invite_code: 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase()
        };
        Object.assign(newUser, userData);
        mockUsers.push(newUser);
        return newUser;
    }
    // تولید کد دعوت
    userData.invite_code = 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    userData.total_points = 0;
    var { data, error } = await supabase.from('users').insert(userData).select().single();
    if (error) throw error;
    return data;
}

async function updateUser(id, data) {
    if (mock) {
        var idx = mockUsers.findIndex(function (u) { return String(u.id) === String(id); });
        if (idx === -1) throw new Error('کاربر یافت نشد');
        Object.assign(mockUsers[idx], data);
        return mockUsers[idx];
    }
    var { data: result, error } = await supabase.from('users').update(data).eq('id', String(id)).select();
    if (error) throw error;
    return result ? result[0] : null;
}

async function deleteUser(id) {
    if (mock) {
        var idx = mockUsers.findIndex(function (u) { return String(u.id) === String(id); });
        if (idx === -1) throw new Error('کاربر یافت نشد');
        mockUsers.splice(idx, 1);
        return;
    }
    var { error } = await supabase.from('users').delete().eq('id', String(id));
    if (error) throw error;
}

// ===== INVITATIONS - دعوت دوستان =====
async function getInvitationByCode(code) {
    if (mock) {
        var inviter = mockUsers.find(function (u) { return u.invite_code === code; });
        return inviter ? { inviter_id: inviter.id, invite_code: code } : null;
    }
    var { data } = await supabase.from('invitations').select('*').eq('invite_code', code).eq('status', 'pending').maybeSingle();
    if (data) return data;
    // اگه توی جدول invitations نبود، مستقیم از users بگرد
    var { data: userData } = await supabase.from('users').select('id').eq('invite_code', code).maybeSingle();
    return userData ? { inviter_id: userData.id, invite_code: code } : null;
}

async function createInvitation(inviterId, inviteCode) {
    if (mock) {
        return { id: 'inv' + Date.now(), inviter_id: inviterId, invite_code: inviteCode, status: 'pending' };
    }
    try {
        var { data, error } = await supabase.from('invitations').insert({
            inviter_id: inviterId,
            invite_code: inviteCode,
            status: 'pending'
        }).select().single();
        if (error) throw error;
        return data;
    } catch (e) { console.log('خطا در ایجاد دعوت:', e); }
}

async function acceptInvitation(inviteCode, invitedUserId) {
    if (mock) return;
    try {
        await supabase.from('invitations').update({
            invited_id: invitedUserId,
            status: 'accepted'
        }).eq('invite_code', inviteCode).eq('status', 'pending');
    } catch (e) { console.log(e); }
}

// ===== INIT AUTH =====
function initAuth() {
    var saved = localStorage.getItem('cinema_user');
    if (saved) {
        try {
            var u = JSON.parse(saved);
            user = u;
            role = u.role || 'user';
            updateUI();
            if (typeof loadData === 'function') loadData();
        } catch (e) { }
    }

    // دکمه ورود
    var loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function () {
            if (user) { logout(); } else { openModal('loginModal'); }
        });
    }

    // دکمه ثبت‌نام
    var registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function () {
            if (user) { toast('شما وارد شده‌اید', 'info'); } else { openModal('registerModal'); }
        });
    }

    // فرم ورود
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var phone = document.getElementById('loginPhone').value.trim();
            var password = document.getElementById('loginPassword').value.trim();
            if (!phone || !password) {
                toast('❌ همه فیلدها را پر کنید', 'error');
                return;
            }
            var u = await getUserByPhone(phone);
            if (!u || u.password !== password) {
                toast('❌ شماره یا رمز اشتباه است', 'error');
                return;
            }
            user = u;
            role = u.role || 'user';
            localStorage.setItem('cinema_user', JSON.stringify(u));
            updateUI();
            if (typeof loadData === 'function') loadData();
            closeModal('loginModal');
            toast('✅ خوش آمدید ' + user.first_name + '!', 'success');
            if (typeof updateNotifBadge === 'function') updateNotifBadge();
        });
    }

    // فرم ثبت‌نام
    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var phone = document.getElementById('regPhone').value.trim();
            var firstName = document.getElementById('regFirstName').value.trim();
            var lastName = document.getElementById('regLastName').value.trim();
            var fatherName = document.getElementById('regFatherName').value.trim();
            var password = document.getElementById('regPassword').value.trim();
            var inviteCode = document.getElementById('regInviteCode') ? document.getElementById('regInviteCode').value.trim().toUpperCase() : '';

            if (!phone || !firstName || !lastName || !fatherName || !password) {
                toast('❌ همه فیلدها را پر کنید', 'error');
                return;
            }
            if (password.length < 6) {
                toast('❌ رمز عبور حداقل ۶ کاراکتر باشد', 'error');
                return;
            }

            var existing = await getUserByPhone(phone);
            if (existing) {
                toast('❌ این شماره قبلاً ثبت شده', 'error');
                return;
            }

            try {
                var userData = {
                    phone: phone,
                    first_name: firstName,
                    last_name: lastName,
                    father_name: fatherName,
                    password: password,
                    role: 'user'
                };

                var newUser = await insertUser(userData);

                // اگه کد دعوت داشت
                if (inviteCode) {
                    var inviter = await getInvitationByCode(inviteCode);
                    if (inviter) {
                        await updateUser(newUser.id, { invited_by: inviter.inviter_id });
                        await acceptInvitation(inviteCode, newUser.id);
                        // امتیاز به دعوت‌کننده
                        if (typeof addUserPoints === 'function') {
                            await addUserPoints(inviter.inviter_id, 50, 'دعوت دوست');
                        }
                        // امتیاز به کاربر جدید
                        if (typeof addUserPoints === 'function') {
                            await addUserPoints(newUser.id, 50, 'ثبت‌نام با کد دعوت');
                        }
                        newUser.total_points = 50;
                        toast('🎁 50 امتیاز هدیه دریافت کردید!', 'success');
                    }
                }

                user = newUser;
                role = 'user';
                localStorage.setItem('cinema_user', JSON.stringify(newUser));
                updateUI();
                if (typeof loadData === 'function') loadData();
                closeModal('registerModal');
                toast('✅ ثبت‌نام موفق! کد: ' + newUser.code, 'success');
            } catch (e) {
                console.error(e);
                toast('❌ خطا در ثبت‌نام: ' + e.message, 'error');
            }
        });
    }

    // فرم ویرایش پروفایل
    var editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!user) return;
            var phone = document.getElementById('editPhone').value.trim();
            var firstName = document.getElementById('editFirstName').value.trim();
            var lastName = document.getElementById('editLastName').value.trim();
            var fatherName = document.getElementById('editFatherName').value.trim();
            var password = document.getElementById('editPassword').value.trim();

            if (!phone || !firstName || !lastName) {
                toast('❌ فیلدهای ضروری را پر کنید', 'error');
                return;
            }
            try {
                var data = {
                    phone: phone,
                    first_name: firstName,
                    last_name: lastName,
                    father_name: fatherName
                };
                if (password && password.length >= 6) data.password = password;
                else if (password) {
                    toast('❌ رمز عبور حداقل ۶ کاراکتر', 'error');
                    return;
                }
                var updated = await updateUser(user.id, data);
                if (!updated) throw new Error('به‌روزرسانی ناموفق');
                user = updated;
                localStorage.setItem('cinema_user', JSON.stringify(updated));
                updateUI();
                closeModal('editProfileModal');
                toast('✅ پروفایل به‌روز شد!', 'success');
            } catch (e) {
                toast('❌ خطا: ' + e.message, 'error');
            }
        });
    }
}

// ===== UPDATE UI =====
function updateUI() {
    var nameEl = document.getElementById('userName');
    var loginBtn = document.getElementById('loginBtn');
    var registerBtn = document.getElementById('registerBtn');
    var profileLink = document.getElementById('profileLink');
    var adminLink = document.getElementById('adminLink');
    var favLink = document.getElementById('favLink');
    var watchlistLink = document.getElementById('watchlistLink');
    var notifBtn = document.getElementById('notifBtn');
    var scanBtn = document.getElementById('scanBtn');
    var chatBtn = document.getElementById('chatBtn');

    if (user) {
        if (nameEl) nameEl.textContent = user.first_name + ' ' + user.last_name;
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> خروج';
            loginBtn.className = 'btn btn-danger btn-sm';
        }
        if (registerBtn) registerBtn.style.display = 'none';
        if (profileLink) profileLink.style.display = 'inline';
        if (favLink) favLink.style.display = 'inline';
        if (watchlistLink) watchlistLink.style.display = 'inline';
        if (adminLink) adminLink.style.display = (role === 'admin1' || role === 'admin2') ? 'inline' : 'none';
        if (notifBtn) notifBtn.style.display = 'inline-flex';
        if (chatBtn) chatBtn.style.display = 'inline-flex';
        if (scanBtn && (role === 'admin1' || role === 'admin2')) {
            scanBtn.style.display = 'flex';
        }

        if (typeof loadProfile === 'function') loadProfile();
        if ((role === 'admin1' || role === 'admin2') && typeof renderAdminTabs === 'function') {
            renderAdminTabs();
            if (typeof loadAdmin === 'function') loadAdmin('bookings');
        }
        if (typeof loadStats === 'function') loadStats();
        if (typeof updateNotifBadge === 'function') updateNotifBadge();
    } else {
        if (nameEl) nameEl.textContent = 'میهمان';
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ورود';
            loginBtn.className = 'btn btn-primary btn-sm';
        }
        if (registerBtn) {
            registerBtn.style.display = 'inline-flex';
            registerBtn.className = 'btn btn-success btn-sm';
        }
        if (profileLink) profileLink.style.display = 'none';
        if (favLink) favLink.style.display = 'none';
        if (watchlistLink) watchlistLink.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (notifBtn) notifBtn.style.display = 'none';
        if (scanBtn) scanBtn.style.display = 'none';
        if (chatBtn) chatBtn.style.display = 'none';

        var profileInfo = document.getElementById('profileInfo');
        if (profileInfo) profileInfo.innerHTML = 'لطفاً وارد شوید';
        var myBookings = document.getElementById('myBookings');
        if (myBookings) myBookings.innerHTML = '';

        var statsContainer = document.getElementById('homeStats');
        if (statsContainer) {
            statsContainer.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.5;grid-column:1/-1;"><i class="fas fa-lock" style="font-size:24px;color:#ffd700;"></i><p style="margin-top:10px;">آمار فقط برای ادمین کل قابل مشاهده است</p></div>';
        }
    }
}

// ===== LOGOUT =====
async function logout() {
    user = null;
    role = 'user';
    compareList = [];
    if (typeof updateComparePanel === 'function') updateComparePanel();
    localStorage.removeItem('cinema_user');
    updateUI();
    toast('👋 خارج شدید', 'info');
}

// ===== LOAD PROFILE =====
async function loadProfile() {
    if (!user) return;
    var code = user.code || generateCode();
    if (!user.code) {
        try {
            await updateUser(user.id, { code: code });
            user.code = code;
            localStorage.setItem('cinema_user', JSON.stringify(user));
        } catch (e) { }
    }

    var points = 0;
    if (typeof getUserPoints === 'function') {
        points = await getUserPoints(user.id);
    } else {
        points = user.total_points || 0;
    }

    var roleName = user.role === 'admin1' ? '⭐ ادمین کل' : user.role === 'admin2' ? 'ادمین دوم' : 'کاربر';
    var level = user.role === 'admin1' ? '🔓 کامل' : user.role === 'admin2' ? '🔓 محدود' : '🔒 عادی';
    var profileInfo = document.getElementById('profileInfo');
    if (!profileInfo) return;

    profileInfo.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:10px;">' +
        '<div><span style="opacity:0.5;">نام</span><br><strong>' + user.first_name + ' ' + user.last_name + '</strong></div>' +
        '<div><span style="opacity:0.5;">نام پدر</span><br><strong>' + (user.father_name || '-') + '</strong></div>' +
        '<div><span style="opacity:0.5;">تلفن</span><br><strong>' + user.phone + '</strong></div>' +
        '<div><span style="opacity:0.5;">کد یکتا</span><br><span style="background:linear-gradient(135deg,#ffd700,#f0a500);color:#1a1a2e;padding:4px 16px;border-radius:30px;font-weight:700;">' + code + '</span></div>' +
        '<div><span style="opacity:0.5;">نقش</span><br><strong>' + roleName + '</strong></div>' +
        '<div><span style="opacity:0.5;">امتیاز شما</span><br><span class="points-badge">🏆 ' + points + ' امتیاز</span></div>' +
        '</div>' +
        '<div style="margin-top:15px;display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button class="btn btn-warning btn-sm" onclick="openEditProfile()"><i class="fas fa-edit"></i> ویرایش پروفایل</button>' +
        '<button class="btn btn-info btn-sm" onclick="showInviteCode()"><i class="fas fa-user-plus"></i> دعوت دوستان</button>' +
        '</div>';

    if (typeof loadMyBookings === 'function') loadMyBookings();
}

// ===== OPEN EDIT PROFILE =====
window.openEditProfile = function () {
    if (!user) return;
    document.getElementById('editPhone').value = user.phone || '';
    document.getElementById('editFirstName').value = user.first_name || '';
    document.getElementById('editLastName').value = user.last_name || '';
    document.getElementById('editFatherName').value = user.father_name || '';
    document.getElementById('editPassword').value = '';
    openModal('editProfileModal');
};

// ===== SHOW INVITE CODE =====
window.showInviteCode = function () {
    if (!user) { toast('⚠️ وارد شوید', 'error'); return; }
    var code = user.invite_code;
    if (!code) {
        code = 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        updateUser(user.id, { invite_code: code });
        user.invite_code = code;
        localStorage.setItem('cinema_user', JSON.stringify(user));
    }

    var msg = '🎁 کد دعوت شما:\n\n' + code + '\n\nاین کد رو به دوستات بده. هر کی با این کد ثبت‌نام کنه، هر دوتون 50 امتیاز می‌گیرید!';
    alert(msg);

    // کپی به کلیپ‌بورد
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
            toast('✅ کد دعوت کپی شد!', 'success');
        }).catch(function () { });
    }
};

// ===== EXPORT =====
window.getUsers = getUsers;
window.getUserByPhone = getUserByPhone;
window.insertUser = insertUser;
window.updateUser = updateUser;
window.deleteUser = deleteUser;
window.initAuth = initAuth;
window.updateUI = updateUI;
window.logout = logout;
window.loadProfile = loadProfile;