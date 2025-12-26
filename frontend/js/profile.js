document.addEventListener('DOMContentLoaded', async () => {
    // --- IMPORTANT: Backend URL (Port 5000) ---
    // --- IMPORTANT: Backend URL (Port 5000) ---
    // API_BASE_URL is global


    // --- FIX: Force Remove Dark Mode if not enabled ---
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme !== 'dark') {
        document.body.classList.remove('dark-mode');
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
    }

    // ১. নাম ঠিক রাখা হলো ('token' ব্যবহার করা হলো)
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user'));

    const profileNameSpan = document.getElementById('profile-name');
    const profileEmailSpan = document.getElementById('profile-email');
    const logoutButton = document.getElementById('profile-logout-button');
    const myOrdersContainer = document.getElementById('my-orders-container');

    // ২. লগইন চেক
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // ৩. ইউজার ডাটা দেখানো
    // 3. User Data Display (Admin Override)
    if (storedUser) {
        if (profileNameSpan) {
            // Check if user is admin
            if (storedUser.role === 'admin' || storedUser.isAdmin) {
                profileNameSpan.textContent = "Admin";
            } else {
                profileNameSpan.textContent = storedUser.name;
            }
        }
        if (profileEmailSpan) profileEmailSpan.textContent = storedUser.email;
    }

    // ৪. লগআউট ফাংশন
    // 4. লগআউট ফাংশন
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Are you sure?',
                    text: "You will be logged out of your session.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, logout!'
                }).then((result) => {
                    if (result.isConfirmed) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('cartItems');
                        window.location.href = 'login.html';
                    }
                });
            } else {
                // Fallback if Swal fails
                if (confirm("Are you sure you want to log out?")) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('cartItems');
                    window.location.href = 'login.html';
                }
            }
        });
    }

    // --- NEW: Profile Picture Handling ---
    const profileImg = document.getElementById('profile-img');
    const defaultAvatar = document.getElementById('default-avatar');
    const profileUploadInput = document.getElementById('profile-upload');
    const avatarContainer = document.querySelector('.profile-avatar');

    // A. Click Container to Trigger Input
    if (avatarContainer && profileUploadInput) {
        avatarContainer.addEventListener('click', () => {
            // Avoid triggering if clicking the input itself (propagation) usually not issue with hidden input
            profileUploadInput.click();
        });
    }

    // B. Handle File Selection & Upload
    if (profileUploadInput) {
        profileUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 1. Immediate Preview
            const reader = new FileReader();
            reader.onload = function (event) {
                profileImg.src = event.target.result;
                profileImg.style.display = 'block';
                if (defaultAvatar) defaultAvatar.style.display = 'none';
            }
            reader.readAsDataURL(file);

            // 2. Upload to Backend
            const formData = new FormData();
            formData.append('profilePic', file);

            try {
                // Show uploading toast/loading if needed
                if (window.showToast) window.showToast('Uploading profile picture...', 'info');

                const response = await fetch(`${API_BASE_URL}/auth/profile-pic`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Content-Type not set strictly for FormData (browser handles boundary)
                    },
                    body: formData
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    if (window.showToast) window.showToast('Profile picture updated successfully!', 'success');
                    // Update LocalStorage user if we want to cache it (optional but good practice)
                    if (storedUser) {
                        storedUser.profilePic = data.photoUrl;
                        localStorage.setItem('user', JSON.stringify(storedUser));
                    }
                } else {
                    throw new Error(data.message || 'Upload failed');
                }

            } catch (error) {
                console.error('Upload Error:', error);
                if (window.showToast) window.showToast('Failed to update profile picture.', 'error');
                // Revert preview on failure validation if strictly needed, but might be jarring.
            }
        });
    }

    // C. Fetch Fresh User Data (To get Profile Pic)
    if (storedUser && storedUser._id) {
        try {
            const userRes = await fetch(`${API_BASE_URL}/auth/${storedUser._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userData = await userRes.json();

            if (userRes.ok && userData.success && userData.user.profilePic) {
                // Update UI
                profileImg.src = userData.user.profilePic;
                profileImg.style.display = 'block';
                if (defaultAvatar) defaultAvatar.style.display = 'none';

                // Update LocalStorage
                const updatedUser = { ...storedUser, ...userData.user };
                localStorage.setItem('user', JSON.stringify(updatedUser)); // Keep LS in sync
            }
        } catch (err) {
            console.log('Failed to fetch latest user data (Background sync)', err);
            // Fallback: Check if LS already has it (from previous session)
            if (storedUser.profilePic) {
                profileImg.src = storedUser.profilePic;
                profileImg.style.display = 'block';
                if (defaultAvatar) defaultAvatar.style.display = 'none';
            }
        }
    }

    // ৫. অর্ডার হিস্টোরি লোড করা
    if (storedUser && storedUser.role === 'admin') {
        const orderSection = document.querySelector('.my-orders-section');
        if (orderSection) {
            orderSection.style.display = 'none';
        }
    } else {
        loadMyOrders(token, myOrdersContainer);
    }
});

// Refactored: Load Orders Function
async function loadMyOrders(token, container) {
    if (!container) return;
    // API_BASE_URL is global from config.js


    try {
        const response = await fetch(`${API_BASE_URL}/orders/myorders`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server Error: Backend did not return JSON. Is Port 5000 running?");
        }

        const orders = await response.json();

        if (response.ok) {
            if (orders.length === 0) {
                container.innerHTML = '<p>You have not placed any orders yet.</p>';
            } else {
                let ordersHtml = '';

                orders.forEach(order => {
                    const date = new Date(order.createdAt).toLocaleDateString();
                    const price = order.totalPrice || order.totalAmount || 0;

                    // Payment Status Badge
                    let paymentStatusBadge = '';
                    const method = (order.paymentMethod || '').toLowerCase();
                    if (method.includes('bkash')) {
                        paymentStatusBadge = '<span style="padding: 3px 8px; border-radius: 4px; background: #28a745; color: #fff;">PAID</span>';
                    } else {
                        paymentStatusBadge = '<span style="padding: 3px 8px; border-radius: 4px; background: #ffc107; color: #000;">COD</span>';
                    }

                    // Background Color Logic
                    let bgClass = '';
                    if (order.status === 'Delivered') bgClass = 'status-bg-delivered';
                    if (order.status === 'Cancelled') bgClass = 'status-bg-cancelled';

                    // Latest Status Logic
                    let latestStatusHtml = '';

                    if (order.statusHistory && order.statusHistory.length > 0) {
                        const latestHistory = order.statusHistory[order.statusHistory.length - 1];
                        const historyDate = new Date(latestHistory.timestamp).toLocaleString();

                        latestStatusHtml = `
                            <div style="margin-top: 10px; font-size: 0.95rem; color: #555;">
                                <strong>${latestHistory.status}</strong> 
                                <span style="color: #888; font-size: 0.9rem;">(${historyDate})</span>
                            </div>
                        `;
                    } else {
                        latestStatusHtml = `<p>Current Status: ${order.status}</p>`;
                    }

                    ordersHtml += `
                    <div class="order-card ${bgClass}" onclick="window.location.href='order.html?id=${order._id}'" style="cursor: pointer; position: relative; overflow: hidden;">
                        
                        <div class="order-header-row">
                            <div>
                                <h3>Order #${order._id.slice(-8).toUpperCase()}</h3>
                                <p>Placed on ${date}</p>
                            </div>
                            <div class="order-price-col">
                                <p>${Number(price).toFixed(2)} BDT</p>
                                <div>${paymentStatusBadge}</div>
                            </div>
                        </div>
                        
                        ${latestStatusHtml}

                        <!-- Remove Button (Bottom Footer) -->
                        <button onclick="deleteMyOrder(event, '${order._id}')" class="remove-history-btn" 
                            style="display: block; width: calc(100% + 30px); margin: 15px -15px -15px -15px; background: #ff4d4d; color: white; border: none; padding: 12px; font-weight: bold; border-radius: 0 0 8px 8px; cursor: pointer; text-transform: uppercase; font-size: 0.9rem;">
                            <i class="fas fa-trash-alt"></i> Remove from History
                        </button>
                    </div>
                `;
                });

                container.innerHTML = ordersHtml;
            }
        } else {
            console.error('Failed to load orders:', orders.message);
            container.innerHTML = `<p style="color:red">Error: ${orders.message}</p>`;

            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        container.innerHTML = '<p style="color:red">Could not connect to Backend Server (Port 5000).</p>';
    }
}

// Global Delete Function for User
window.deleteMyOrder = async (event, orderId) => {
    event.stopPropagation(); // Prevent card click

    // SweetAlert2 Confirmation
    const result = await Swal.fire({
        title: 'Remove Order?',
        text: "This will maintain the order in our system but hide it from your history.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, hide it!',
        cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/myorders/${orderId}`, {

            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Update UI
            Swal.fire(
                'Removed!',
                'Order removed from your history view.',
                'success'
            );

            // Refresh List
            const myOrdersContainer = document.getElementById('my-orders-container');
            loadMyOrders(token, myOrdersContainer);
        } else {
            Swal.fire('Error', data.message || "Failed to remove order", 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', "Server Error", 'error');
    }
};