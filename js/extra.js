/* ============================================
   EXTRA - قابلیت‌های اضافی
   ============================================ */

// ============================================
// 1. QR SCANNER
// ============================================
window.openScanner = function() {
    if (!user) { toast('⚠️ لطفاً وارد شوید', 'error'); return; }
    if (role !== 'admin1' && role !== 'admin2') {
        toast('❌ فقط ادمین‌ها دسترسی دارند', 'error');
        return;
    }
    
    openModal('scannerModal');
    
    var resultDiv = document.getElementById('scanResult');
    if (resultDiv) resultDiv.innerHTML = '';
    
    var qrReaderDiv = document.getElementById('qr-reader');
    if (qrReaderDiv) qrReaderDiv.innerHTML = '';
    
    var scanDone = false;
    
    setTimeout(function() {
        if (typeof Html5Qrcode === 'undefined') {
            if (qrReaderDiv) {
                qrReaderDiv.innerHTML = '<p style="text-align:center;color:#f87171;padding:20px;">کتابخانه اسکنر لود نشده</p>';
            }
            return;
        }
        
        html5QrCode = new Html5Qrcode("qr-reader");
        
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async function(decodedText) {
                if (scanDone) return;
                scanDone = true;
                
                console.log('📱 QR اسکن شد:', decodedText);
                
                if (html5QrCode) {
                    try {
                        await html5QrCode.stop();
                        html5QrCode.clear();
                    } catch(e) {}
                    html5QrCode = null;
                }
                
                var bookingCode = '';
                
                try {
                    var data = JSON.parse(decodedText);
                    bookingCode = data.code || data.booking_code || '';
                } catch(e) {
                    bookingCode = decodedText.trim();
                }
                
                console.log('🔍 کد بلیط:', bookingCode);
                
                if (!bookingCode) {
                    resultDiv.innerHTML = 
                        '<div style="padding:20px;background:rgba(248,113,113,.15);border-radius:16px;border:2px solid #f87171;text-align:center;">' +
                            '<i class="fas fa-times-circle" style="font-size:48px;color:#f87171;margin-bottom:15px;display:block;"></i>' +
                            '<h3 style="color:#f87171;">❌ کد خالی</h3>' +
                        '</div>';
                    return;
                }
                
                var bookings = await getBookings();
                var booking = bookings.find(function(b) { return b.booking_code === bookingCode; });
                
                if (booking) {
                    var atts = await getAttendances();
                    var existing = atts.find(function(x) { return x.booking_id === booking.id; });
                    
                    if (existing) {
                        resultDiv.innerHTML = 
                            '<div style="padding:20px;background:rgba(255,215,0,.15);border-radius:16px;border:2px solid #ffd700;text-align:center;">' +
                                '<i class="fas fa-exclamation-triangle" style="font-size:48px;color:#ffd700;margin-bottom:15px;display:block;"></i>' +
                                '<h3 style="color:#ffd700;margin-bottom:10px;">⚠️ قبلاً ثبت شده</h3>' +
                                '<p style="font-size:14px;">کد: ' + booking.booking_code + '</p>' +
                                '<p style="font-size:12px;opacity:0.7;margin-top:5px;">این بلیط قبلاً اسکن شده</p>' +
                                '<button class="btn btn-primary" onclick="openScanner()" style="margin-top:15px;">' +
                                    '<i class="fas fa-redo"></i> اسکن مجدد' +
                                '</button>' +
                            '</div>';
                    } else {
                        resultDiv.innerHTML = 
                            '<div style="padding:20px;background:rgba(74,222,128,.15);border-radius:16px;border:2px solid #4ade80;text-align:center;">' +
                                '<i class="fas fa-check-circle" style="font-size:48px;color:#4ade80;margin-bottom:15px;display:block;"></i>' +
                                '<h3 style="color:#4ade80;margin-bottom:10px;">✅ بلیط معتبر</h3>' +
                                '<p style="font-size:14px;margin:5px 0;">کد: ' + booking.booking_code + '</p>' +
                                '<p style="font-size:14px;margin:5px 0;">تعداد: ' + booking.ticket_count + ' نفر</p>' +
                                '<button class="btn btn-success" onclick="scanCheckIn(\'' + booking.id + '\')" style="margin-top:15px;">' +
                                    '<i class="fas fa-user-check"></i> ثبت حضور' +
                                '</button>' +
                                '<button class="btn btn-glass" onclick="openScanner()" style="margin-top:10px;">' +
                                    '<i class="fas fa-redo"></i> اسکن بلیط بعدی' +
                                '</button>' +
                            '</div>';
                    }
                } else {
                    resultDiv.innerHTML = 
                        '<div style="padding:20px;background:rgba(248,113,113,.15);border-radius:16px;border:2px solid #f87171;text-align:center;">' +
                            '<i class="fas fa-times-circle" style="font-size:48px;color:#f87171;margin-bottom:15px;display:block;"></i>' +
                            '<h3 style="color:#f87171;margin-bottom:10px;">❌ بلیط نامعتبر</h3>' +
                            '<p style="font-size:12px;opacity:0.7;">کد اسکن شده: ' + bookingCode + '</p>' +
                            '<button class="btn btn-primary" onclick="openScanner()" style="margin-top:15px;">' +
                                '<i class="fas fa-redo"></i> اسکن مجدد' +
                            '</button>' +
                        '</div>';
                }
            },
            function(errorMessage) {}
        ).catch(function(err) {
            console.error('خطا در دوربین:', err);
            if (qrReaderDiv) {
                qrReaderDiv.innerHTML = 
                    '<p style="text-align:center;color:#f87171;padding:20px;">خطا در دسترسی به دوربین<br><small>' + err.message + '</small></p>';
            }
        });
    }, 500);
};

window.closeScanner = function() {
    if (html5QrCode) {
        try {
            html5QrCode.stop().then(function() {
                html5QrCode.clear();
                html5QrCode = null;
            }).catch(function() {
                html5QrCode = null;
            });
        } catch(e) {
            html5QrCode = null;
        }
    }
    closeModal('scannerModal');
    var resultDiv = document.getElementById('scanResult');
    if (resultDiv) resultDiv.innerHTML = '';
};

window.scanCheckIn = async function(bookingId) {
    try {
        await checkIn(bookingId);
        closeScanner();
    } catch(e) { toast('❌ ' + e.message, 'error'); }
};

// ============================================
// 2. WATCHLIST (تماشای بعدی)
// ============================================
async function getWatchlist(userId) {
    if (mock) return mockWatchlist.filter(function(w) { return w.user_id === userId; });
    var { data } = await supabase.from('watchlist').select('*').eq('user_id', userId);
    return data || [];
}

async function addToWatchlist(userId, movieId) {
    if (mock) {
        if (!mockWatchlist.find(function(w) { return w.user_id === userId && w.movie_id === movieId; })) {
            mockWatchlist.push({ id: 'w' + (mockWatchlist.length + 1), user_id: userId, movie_id: movieId });
        }
        return;
    }
    await supabase.from('watchlist').insert({ user_id: userId, movie_id: movieId });
}

async function removeFromWatchlist(userId, movieId) {
    if (mock) {
        var idx = mockWatchlist.findIndex(function(w) { return w.user_id === userId && w.movie_id === movieId; });
        if (idx !== -1) mockWatchlist.splice(idx, 1);
        return;
    }
    await supabase.from('watchlist').delete().eq('user_id', userId).eq('movie_id', movieId);
}

window.toggleWatchlist = async function(movieId, btn) {
    if (!user) { toast('⚠️ لطفاً وارد شوید', 'error'); return; }
    try {
        var watchlist = await getWatchlist(user.id);
        var exists = watchlist.some(function(w) { return w.movie_id === movieId; });
        
        if (exists) {
            await removeFromWatchlist(user.id, movieId);
            if (btn) {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-clock"></i> تماشای بعدی';
            }
            toast('🗑️ از لیست حذف شد', 'info');
        } else {
            await addToWatchlist(user.id, movieId);
            if (btn) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-check"></i> در لیست';
            }
            toast('✅ به لیست اضافه شد', 'success');
        }
    } catch(e) { toast('❌ ' + e.message, 'error'); }
};

async function loadWatchlist() {
    if (!user) return;
    var container = document.getElementById('watchlistMovies');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    var watchlist = await getWatchlist(user.id);
    if (watchlist.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;opacity:0.5;">' +
            '🎬 هنوز فیلمی به لیست اضافه نکرده‌اید</p>';
        return;
    }
    
    var movies = await getMovies();
    var html = '';
    
    watchlist.forEach(function(w) {
        var m = movies.find(function(x) { return x.id === w.movie_id; });
        if (!m) return;
        
        var date = toPersian(m.release_date);
        var statusMap = { 'now_showing': 'در حال اکران', 'coming_soon': 'به زودی', 'ended': 'پایان یافته' };
        
        html += '<div class="watchlist-item">' +
            '<div class="watchlist-poster"><i class="fas fa-film"></i></div>' +
            '<div class="watchlist-info">' +
                '<h4>' + m.name + '</h4>' +
                '<div class="meta">📅 ' + date + ' • ' + (statusMap[m.status] || m.status) + '</div>' +
                '<div class="meta">💰 ' + formatCurrency(m.price) + ' تومان</div>' +
                '<div style="display:flex;gap:8px;margin-top:10px;">' +
                    (m.status === 'now_showing' ? 
                        '<button class="btn btn-primary btn-xs" onclick="openBooking(\'' + m.id + '\')">' +
                            '<i class="fas fa-ticket-alt"></i> رزرو</button>' : '') +
                    '<button class="btn btn-danger btn-xs" onclick="toggleWatchlist(\'' + m.id + '\'); loadWatchlist();">' +
                        '<i class="fas fa-trash"></i> حذف</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    });
    
    container.innerHTML = html || '<p style="text-align:center;padding:40px;opacity:0.5;">لیست خالی است</p>';
}

// ============================================
// 3. COMPARE
// ============================================
window.toggleCompare = function(movieId, movieName) {
    var idx = compareList.indexOf(movieId);
    if (idx !== -1) {
        compareList.splice(idx, 1);
    } else {
        if (compareList.length >= 3) {
            toast('⚠️ حداکثر 3 فیلم قابل مقایسه است', 'info');
            return;
        }
        compareList.push(movieId);
    }
    updateComparePanel();
};

window.updateComparePanel = async function() {
    var panel = document.getElementById('comparePanel');
    var grid = document.getElementById('compareGrid');
    if (!panel || !grid) return;
    
    if (compareList.length < 2) {
        panel.classList.remove('show');
        return;
    }
    
    panel.classList.add('show');
    var movies = await getMovies();
    var html = '';
    
    compareList.forEach(function(id) {
        var m = movies.find(function(x) { return x.id === id; });
        if (!m) return;
        
        var date = toPersian(m.release_date);
        var statusMap = { 'now_showing': 'در حال اکران', 'coming_soon': 'به زودی', 'ended': 'پایان یافته' };
        
        html += '<div class="compare-item">' +
            '<div style="font-size:32px;color:#ffd700;margin-bottom:10px;"><i class="fas fa-film"></i></div>' +
            '<h4 style="margin-bottom:10px;color:#ffd700;">' + m.name + '</h4>' +
            '<div style="font-size:12px;opacity:0.7;margin-bottom:6px;">📅 ' + date + '</div>' +
            '<div style="font-size:12px;opacity:0.7;margin-bottom:6px;">👥 ' + m.capacity + ' نفر</div>' +
            '<div style="font-size:12px;opacity:0.7;margin-bottom:6px;">📊 ' + (statusMap[m.status] || m.status) + '</div>' +
            (m.duration ? '<div style="font-size:12px;opacity:0.7;margin-bottom:6px;">⏱️ ' + m.duration + ' دقیقه</div>' : '') +
            (m.imdb_rating ? '<div style="font-size:12px;opacity:0.7;margin-bottom:6px;">⭐ IMDB: ' + m.imdb_rating + '</div>' : '') +
            '<div style="font-size:16px;font-weight:700;color:#ffd700;margin-top:10px;">' + 
                formatCurrency(m.price) + ' تومان</div>' +
        '</div>';
    });
    
    grid.innerHTML = html;
};

window.clearCompare = function() {
    compareList = [];
    document.querySelectorAll('.compare-check').forEach(function(cb) { cb.checked = false; });
    updateComparePanel();
    toast('مقایسه بسته شد', 'info');
};

// ============================================
// 4. LEADERBOARD
// ============================================
async function loadLeaderboard() {
    var container = document.getElementById('leaderboardContent');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    var users = await getUsers();
    var topUsers = users
        .filter(function(u) { return u.role === 'user' || u.role === 'admin2'; })
        .sort(function(a, b) { return (b.total_points || 0) - (a.total_points || 0); })
        .slice(0, 10);
    
    if (topUsers.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;opacity:0.5;">هنوز کاربری نیست</p>';
        return;
    }
    
    var html = '';
    
    if (topUsers.length >= 3) {
        html += '<div class="podium">';
        
        if (topUsers[1]) {
            html += '<div class="podium-item second">' +
                '<div class="podium-avatar">' + topUsers[1].first_name.charAt(0) + '</div>' +
                '<div class="podium-name">' + topUsers[1].first_name + ' ' + topUsers[1].last_name + '</div>' +
                '<div class="podium-points">🏆 ' + (topUsers[1].total_points || 0) + '</div>' +
            '</div>';
        }
        
        if (topUsers[0]) {
            html += '<div class="podium-item first">' +
                '<div style="font-size:32px;margin-bottom:5px;">👑</div>' +
                '<div class="podium-avatar">' + topUsers[0].first_name.charAt(0) + '</div>' +
                '<div class="podium-name">' + topUsers[0].first_name + ' ' + topUsers[0].last_name + '</div>' +
                '<div class="podium-points">🏆 ' + (topUsers[0].total_points || 0) + '</div>' +
            '</div>';
        }
        
        if (topUsers[2]) {
            html += '<div class="podium-item third">' +
                '<div class="podium-avatar">' + topUsers[2].first_name.charAt(0) + '</div>' +
                '<div class="podium-name">' + topUsers[2].first_name + ' ' + topUsers[2].last_name + '</div>' +
                '<div class="podium-points">🏆 ' + (topUsers[2].total_points || 0) + '</div>' +
            '</div>';
        }
        
        html += '</div>';
    }
    
    html += '<div style="margin-top:30px;">';
    topUsers.forEach(function(u, idx) {
        var rank = idx + 1;
        var rankClass = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
        
        html += '<div class="leaderboard-item">' +
            '<div class="leaderboard-rank ' + rankClass + '">' + rank + '</div>' +
            '<div style="flex:1;">' +
                '<div style="font-weight:700;">' + u.first_name + ' ' + u.last_name + '</div>' +
                '<div style="font-size:12px;opacity:0.6;">' + u.phone + '</div>' +
            '</div>' +
            '<div class="points-badge">🏆 ' + (u.total_points || 0) + '</div>' +
        '</div>';
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// ============================================
// 5. CHAT
// ============================================
async function getChatMessages(userId) {
    if (mock) return mockChatMessages.filter(function(m) { return m.user_id === userId; });
    var { data } = await supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    return data || [];
}

async function insertChatMessage(msg) {
    if (mock) {
        var newMsg = { id: 'c' + (mockChatMessages.length + 1), created_at: new Date().toISOString(), is_read: false };
        Object.assign(newMsg, msg);
        mockChatMessages.push(newMsg);
        return newMsg;
    }
    var { data, error } = await supabase.from('chat_messages').insert(msg).select().single();
    if (error) throw error;
    return data;
}

window.openChat = async function() {
    if (!user) { toast('⚠️ وارد شوید', 'error'); return; }
    
    currentChatUser = user.id;
    openModal('chatModal');
    await loadChatMessages();
    
    if (chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadChatMessages, 5000);
};

async function loadChatMessages() {
    if (!currentChatUser) return;
    
    var container = document.getElementById('chatMessages');
    if (!container) return;
    
    var messages = await getChatMessages(currentChatUser);
    
    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;opacity:0.5;">' +
            'هنوز پیامی نیست. اولین پیام را بفرستید!</p>';
        return;
    }
    
    var html = '';
    messages.forEach(function(m) {
        var cls = m.sender === 'user' ? 'user' : 'admin';
        html += '<div class="chat-message ' + cls + '">' +
            '<div>' + m.message + '</div>' +
            '<div style="font-size:10px;opacity:0.6;margin-top:4px;">' + 
                new Date(m.created_at).toLocaleTimeString('fa-IR') + '</div>' +
        '</div>';
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

window.sendChatMessage = async function() {
    if (!user) return;
    var input = document.getElementById('chatInput');
    if (!input) return;
    
    var message = input.value.trim();
    if (!message) return;
    
    try {
        await insertChatMessage({
            user_id: user.id,
            message: message,
            sender: 'user',
            is_read: false
        });
        input.value = '';
        await loadChatMessages();
    } catch(e) { toast('❌ خطا: ' + e.message, 'error'); }
};

async function renderChatsAdmin(container) {
    if (role !== 'admin1' && role !== 'admin2') {
        container.innerHTML = '🔒';
        return;
    }
    
    var allMessages = [];
    if (!mock) {
        var { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: false });
        allMessages = data || [];
    }
    
    var users = {};
    allMessages.forEach(function(m) {
        if (!users[m.user_id]) users[m.user_id] = [];
        users[m.user_id].push(m);
    });
    
    var usersList = await getUsers();
    var html = '<div class="glass-title" style="font-size:18px;">💬 چت‌های کاربران (' + Object.keys(users).length + ')</div>';
    
    if (Object.keys(users).length === 0) {
        html += '<p style="text-align:center;padding:40px;opacity:0.5;">هیچ چتی وجود ندارد</p>';
        container.innerHTML = html;
        return;
    }
    
    for (var userId in users) {
        var u = usersList.find(function(x) { return x.id === userId; });
        var userName = u ? (u.first_name + ' ' + u.last_name) : 'کاربر';
        var msgs = users[userId];
        var lastMsg = msgs[0];
        var unread = msgs.filter(function(m) { return !m.is_read && m.sender === 'user'; }).length;
        
        html += '<div class="info-panel" style="cursor:pointer;" onclick="openChatAsAdmin(\'' + userId + '\')">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<div>' +
                    '<strong style="color:#ffd700;">' + userName + '</strong>' +
                    (unread > 0 ? '<span class="count-badge" style="margin-right:8px;">' + unread + '</span>' : '') +
                '</div>' +
                '<div style="font-size:12px;opacity:0.5;">' + 
                    new Date(lastMsg.created_at).toLocaleString('fa-IR') + '</div>' +
            '</div>' +
            '<div style="font-size:13px;opacity:0.7;margin-top:5px;">' + 
                lastMsg.message.substring(0, 60) + (lastMsg.message.length > 60 ? '...' : '') + '</div>' +
        '</div>';
    }
    
    container.innerHTML = html;
}

window.openChatAsAdmin = async function(userId) {
    currentChatUser = userId;
    openModal('chatModal');
    await loadChatMessages();
    
    if (chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadChatMessages, 5000);
    
    if (!mock) {
        await supabase.from('chat_messages').update({ is_read: true }).eq('user_id', userId).eq('sender', 'user');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    var chatModal = document.getElementById('chatModal');
    if (chatModal) {
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(m) {
                if (!chatModal.classList.contains('active') && chatInterval) {
                    clearInterval(chatInterval);
                    chatInterval = null;
                }
            });
        });
        observer.observe(chatModal, { attributes: true });
    }
    
    var chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});

// ============================================
// 6. INVITE FRIENDS
// ============================================
async function getInvitationsByUser(userId) {
    if (mock) return [];
    var { data } = await supabase.from('invitations').select('*').eq('inviter_id', userId);
    return data || [];
}

async function showInviteStats() {
    if (!user) return;
    var invitations = await getInvitationsByUser(user.id);
    var accepted = invitations.filter(function(i) { return i.status === 'accepted'; });
    
    return {
        total: invitations.length,
        accepted: accepted.length,
        points: accepted.length * 50
    };
}

// ============================================
// 7. SHOWTIMES (جدول زمانی اکران)
// ============================================
async function getShowtimes(movieId) {
    if (mock) return mockShowtimes.filter(function(s) { return s.movie_id === movieId; });
    var query = supabase.from('showtimes').select('*');
    if (movieId) query = query.eq('movie_id', movieId);
    var { data } = await query.order('show_date').order('show_time');
    return data || [];
}

async function insertShowtime(data) {
    if (mock) {
        var newShowtime = { id: 's' + (mockShowtimes.length + 1), created_at: new Date().toISOString() };
        Object.assign(newShowtime, data);
        mockShowtimes.push(newShowtime);
        return newShowtime;
    }
    var { data: result, error } = await supabase.from('showtimes').insert(data).select().single();
    if (error) throw error;
    return result;
}

async function deleteShowtime(id) {
    if (mock) {
        var idx = mockShowtimes.findIndex(function(s) { return s.id === id; });
        if (idx !== -1) mockShowtimes.splice(idx, 1);
        return;
    }
    await supabase.from('showtimes').delete().eq('id', id);
}

async function loadShowtimes() {
    var container = document.getElementById('showtimesContent');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    var showtimes = await getShowtimes();
    var movies = await getMovies();
    
    if (showtimes.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:40px;opacity:0.5;">' +
            '📅 هنوز سانسی ثبت نشده است</p>';
        return;
    }
    
    var grouped = {};
    showtimes.forEach(function(s) {
        var dateKey = s.show_date;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(s);
    });
    
    var html = '';
    for (var date in grouped) {
        html += '<div style="margin-bottom:30px;">' +
            '<h3 style="color:#ffd700;margin-bottom:15px;">📅 ' + toPersian(date) + '</h3>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">';
        
        grouped[date].forEach(function(s) {
            var m = movies.find(function(x) { return x.id === s.movie_id; });
            var movieName = m ? m.name : '-';
            
            html += '<div class="showtime-card" onclick="openBooking(\'' + s.movie_id + '\')">' +
                '<div style="font-size:12px;color:#ffd700;font-weight:700;margin-bottom:5px;">' + movieName + '</div>' +
                '<div class="time">' + s.show_time.substring(0, 5) + '</div>' +
                '<div class="hall">🎭 ' + (s.hall || 'سالن 1') + '</div>' +
                '<div class="price">' + formatCurrency(s.price || (m ? m.price : 0)) + ' تومان</div>' +
            '</div>';
        });
        
        html += '</div></div>';
    }
    
    container.innerHTML = html;
}

async function renderShowtimesAdmin(container) {
    if (role !== 'admin1') { container.innerHTML = '🔒'; return; }
    
    var showtimes = await getShowtimes();
    var movies = await getMovies();
    
    var html = '<div class="glass-title" style="font-size:18px;">📅 سانس‌ها (' + showtimes.length + ')</div>';
    
    html += '<div class="glass" style="margin-bottom:20px;">' +
        '<div class="glass-title" style="font-size:16px;">➕ افزودن سانس جدید</div>' +
        '<form id="addShowtimeForm">' +
        '<div class="form-row">' +
            '<div class="form-group"><label>فیلم</label><select id="stMovie" required><option value="">انتخاب فیلم</option>';
    
    movies.forEach(function(m) {
        html += '<option value="' + m.id + '">' + m.name + '</option>';
    });
    
    html += '</select></div>' +
        '<div class="form-group"><label>سالن</label><input type="text" id="stHall" placeholder="سالن 1" value="سالن 1"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>تاریخ (میلادی)</label><input type="date" id="stDate" required></div>' +
            '<div class="form-group"><label>ساعت</label><input type="time" id="stTime" required></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>ظرفیت</label><input type="number" id="stCapacity" placeholder="100" value="100"></div>' +
            '<div class="form-group"><label>قیمت (تومان)</label><input type="number" id="stPrice" placeholder="150000"></div>' +
        '</div>' +
        '<button type="submit" class="btn btn-success"><i class="fas fa-plus"></i> افزودن</button>' +
        '</form></div>';
    
    html += '<div class="table-wrap"><table><thead><tr>' +
        '<th>فیلم</th><th>تاریخ</th><th>ساعت</th><th>سالن</th><th>ظرفیت</th><th>عملیات</th>' +
        '</tr></thead><tbody>';
    
    showtimes.forEach(function(s) {
        var m = movies.find(function(x) { return x.id === s.movie_id; });
        html += '<tr>' +
            '<td>' + (m ? m.name : '-') + '</td>' +
            '<td>' + toPersian(s.show_date) + '</td>' +
            '<td>' + s.show_time + '</td>' +
            '<td>' + (s.hall || '-') + '</td>' +
            '<td>' + s.capacity + '</td>' +
            '<td><button class="btn btn-danger btn-xs" onclick="deleteShowtimeAdmin(\'' + s.id + '\')">' +
                '<i class="fas fa-trash"></i></button></td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    
    container.innerHTML = html;
    
    document.getElementById('addShowtimeForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await insertShowtime({
                movie_id: document.getElementById('stMovie').value,
                show_date: document.getElementById('stDate').value,
                show_time: document.getElementById('stTime').value,
                hall: document.getElementById('stHall').value,
                capacity: parseInt(document.getElementById('stCapacity').value),
                price: parseInt(document.getElementById('stPrice').value) || null
            });
            toast('✅ سانس اضافه شد!', 'success');
            loadAdmin('showtimes');
        } catch(e) { toast('❌ ' + e.message, 'error'); }
    });
}

window.deleteShowtimeAdmin = async function(id) {
    if (!confirm('حذف این سانس؟')) return;
    try {
        await deleteShowtime(id);
        toast('✅ حذف شد', 'success');
        loadAdmin('showtimes');
    } catch(e) { toast('❌ ' + e.message, 'error'); }
};

// ============================================
// 8. PDF REPORT
// ============================================
window.exportReportPDF = async function() {
    var users = await getUsers();
    var movies = await getMovies();
    var bookings = await getBookings();
    var attendances = await getAttendances();
    
    var revenue = 0;
    bookings.forEach(function(b) { if (b.payment_status === 'paid') revenue += b.total_price || 0; });
    
    var reportHTML = '<div style="font-family:Tahoma,sans-serif;padding:30px;direction:rtl;background:white;color:#000;">';
    reportHTML += '<div style="text-align:center;border-bottom:3px solid #ffd700;padding-bottom:20px;margin-bottom:30px;">';
    reportHTML += '<h1 style="color:#1a4a8a;margin:0;">🎬 گزارش سینما</h1>';
    reportHTML += '<p style="color:#666;margin:10px 0;">تاریخ: ' + toPersian(new Date()) + '</p>';
    reportHTML += '</div>';
    
    reportHTML += '<h2 style="color:#1a4a8a;">📊 آمار کلی</h2>';
    reportHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:30px;">';
    reportHTML += '<tr><td style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">کاربران</td><td style="padding:10px;border:1px solid #ddd;">' + users.length + '</td></tr>';
    reportHTML += '<tr><td style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">فیلم‌ها</td><td style="padding:10px;border:1px solid #ddd;">' + movies.length + '</td></tr>';
    reportHTML += '<tr><td style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">رزروها</td><td style="padding:10px;border:1px solid #ddd;">' + bookings.length + '</td></tr>';
    reportHTML += '<tr><td style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">درآمد کل</td><td style="padding:10px;border:1px solid #ddd;color:#00b09b;font-weight:700;">' + formatCurrency(revenue) + ' تومان</td></tr>';
    reportHTML += '<tr><td style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">حضور</td><td style="padding:10px;border:1px solid #ddd;">' + attendances.length + '</td></tr>';
    reportHTML += '</table>';
    
    reportHTML += '<h2 style="color:#1a4a8a;">🎫 آخرین رزروها</h2>';
    reportHTML += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    reportHTML += '<thead><tr style="background:#1a4a8a;color:white;"><th style="padding:8px;border:1px solid #ddd;">کد</th><th style="padding:8px;border:1px solid #ddd;">کاربر</th><th style="padding:8px;border:1px solid #ddd;">فیلم</th><th style="padding:8px;border:1px solid #ddd;">قیمت</th><th style="padding:8px;border:1px solid #ddd;">وضعیت</th></tr></thead><tbody>';
    
    bookings.slice(0, 20).forEach(function(b) {
        var userName = b.users ? (b.users.first_name + ' ' + b.users.last_name) : '-';
        var movieName = b.movies ? b.movies.name : '-';
        reportHTML += '<tr>';
        reportHTML += '<td style="padding:8px;border:1px solid #ddd;">' + (b.booking_code || '-') + '</td>';
        reportHTML += '<td style="padding:8px;border:1px solid #ddd;">' + userName + '</td>';
        reportHTML += '<td style="padding:8px;border:1px solid #ddd;">' + movieName + '</td>';
        reportHTML += '<td style="padding:8px;border:1px solid #ddd;">' + formatCurrency(b.total_price) + '</td>';
        reportHTML += '<td style="padding:8px;border:1px solid #ddd;">' + b.payment_status + '</td>';
        reportHTML += '</tr>';
    });
    reportHTML += '</tbody></table>';
    
    reportHTML += '<div style="margin-top:30px;text-align:center;color:#999;font-size:11px;">گزارش تولید شده توسط سیستم سینما</div>';
    reportHTML += '</div>';
    
    var opt = {
        margin: 0.5,
        filename: 'cinema-report-' + new Date().toISOString().split('T')[0] + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(reportHTML).save();
        toast('📥 در حال دانلود گزارش PDF...', 'success');
    } else {
        toast('❌ کتابخانه PDF لود نشده', 'error');
    }
};

// ============================================
// 9. NOTIFICATION SOUND
// ============================================
function playNotificationSound() {
    try {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch(e) {
        console.log('صدا پخش نشد:', e);
    }
}

// ============================================
// 10. NIGHT MODE (خودکار)
// ============================================
function checkNightMode() {
    var hour = new Date().getHours();
    var isNight = hour >= 18 || hour < 6;
    
    if (isNight) {
        document.body.classList.add('night-mode');
        document.body.classList.remove('day-mode');
    } else {
        document.body.classList.add('day-mode');
        document.body.classList.remove('night-mode');
    }
}

setInterval(checkNightMode, 30 * 60 * 1000);

// ============================================
// EXPORT
// ============================================
window.getWatchlist = getWatchlist;
window.addToWatchlist = addToWatchlist;
window.removeFromWatchlist = removeFromWatchlist;
window.loadWatchlist = loadWatchlist;
window.loadLeaderboard = loadLeaderboard;
window.getChatMessages = getChatMessages;
window.insertChatMessage = insertChatMessage;
window.renderChatsAdmin = renderChatsAdmin;
window.getShowtimes = getShowtimes;
window.insertShowtime = insertShowtime;
window.deleteShowtime = deleteShowtime;
window.loadShowtimes = loadShowtimes;
window.renderShowtimesAdmin = renderShowtimesAdmin;
window.playNotificationSound = playNotificationSound;
window.checkNightMode = checkNightMode;
