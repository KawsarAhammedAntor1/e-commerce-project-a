document.addEventListener('DOMContentLoaded', async () => {
    // API_BASE_URL is now global from config.js

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');

    // 1. Auth Check - Redirect if not logged in or not admin (optional security)
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (!orderId) {
        alert('Invalid Order ID');
        window.location.href = 'admin.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch order details');
        }

        const order = await response.json();
        renderOrderDetails(order);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading-message').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }

    // Dynamic Back Button Logic
    const backBtn = document.querySelector('.back-btn');
    const storedUser = JSON.parse(localStorage.getItem('user'));

    if (storedUser && storedUser.role !== 'admin') {
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Profile';
        backBtn.href = 'profile.html';
    }
});

function renderOrderDetails(order) {
    const loadingMsg = document.getElementById('loading-message');
    const orderContent = document.getElementById('order-content');

    // Hide loader, show content
    loadingMsg.style.display = 'none';
    orderContent.style.display = 'block';

    // 1. Meta Data
    document.getElementById('order-id').textContent = `ID: #${order._id.slice(-8).toUpperCase()}`;
    document.getElementById('order-date').textContent = `Date: ${new Date(order.createdAt).toLocaleString()}`;
    document.getElementById('order-status').textContent = `Status: ${order.status}`;

    // 2. Customer Info
    const user = order.user || {};
    const address = order.shippingAddress || {};

    document.getElementById('customer-name').textContent = address.name || user.name || 'N/A';

    // Validate keys for Phone in address object
    document.getElementById('customer-phone').textContent = address.phone || 'N/A';

    // Parse City/Area & District
    // Stored format in checkout: "Area, District"
    let area = 'N/A';
    let district = 'N/A';

    if (address.city) {
        if (address.city.includes(',')) {
            const parts = address.city.split(',').map(s => s.trim());
            // Assume format matches checkout: Area first, then District
            if (parts.length >= 2) {
                area = parts[0];
                district = parts[parts.length - 1]; // Last part is district
            } else {
                area = address.city;
            }
        } else {
            // Legacy data fallback
            area = address.city;
        }
    }

    document.getElementById('shipping-district').textContent = district;
    document.getElementById('shipping-area').textContent = area;

    // Full Address (Raw Textarea)
    document.getElementById('shipping-address').textContent = address.address || 'Address not provided';


    // 3. Product List
    const tbody = document.getElementById('product-list-body');
    let subtotal = 0;

    tbody.innerHTML = order.orderItems.map(item => {
        const itemTotal = item.qty * item.price;
        subtotal += itemTotal;

        // FIX: Handle image URL (prepend backend URL if relative path)
        // Fallback to item.product.image (if populated) if item.image is missing (for older orders)
        let rawImage = item.image;
        if (!rawImage && item.product && item.product.image) {
            rawImage = item.product.image;
        }

        let imageUrl = rawImage || 'https://via.placeholder.com/50';

        if (imageUrl && !imageUrl.startsWith('http')) {
            // Replace backslashes with forward slashes for Windows paths
            imageUrl = imageUrl.replace(/\\/g, '/');
            // Ensure leading slash if not present
            if (!imageUrl.startsWith('/')) {
                imageUrl = '/' + imageUrl;
            }
            imageUrl = 'https://e-commerce-project-2-7n1r.onrender.com' + imageUrl; // Prepend backend URL
        }

        // Determine Product ID safely (handle populated object or raw ID)
        const productId = (item.product && item.product._id) || item.product;

        return `
        <tr>
            <td>
                <a href="product-details.html?id=${productId}" style="text-decoration: none; cursor: pointer;">
                    <img src="${imageUrl}" alt="${item.productName}" class="product-img" onerror="this.src='https://via.placeholder.com/50'">
                </a>
            </td>
            <td>
                <div style="font-weight: bold;">${item.productName || 'Product'}</div>
            </td>
            <td>${item.qty}</td>
            <td>${item.price} BDT</td>
        </tr>
    `}).join('');


    // --- Timeline Rendering ---
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'section-box';

    // Check status for background color
    const currentStatus = (order.status || '').toLowerCase();
    if (currentStatus === 'delivered') {
        timelineContainer.classList.add('status-bg-delivered');
    } else if (currentStatus === 'cancelled') {
        timelineContainer.classList.add('status-bg-cancelled');
    }

    timelineContainer.innerHTML = '<h3>Order Timeline</h3>';

    // Check if statusHistory exists
    const history = order.statusHistory || [];
    // Sort chronological (oldest first)
    // history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); 

    const timelineList = document.createElement('div');
    timelineList.style.cssText = 'border-left: 2px solid #ddd; padding-left: 20px; margin-left: 10px;';

    timelineList.innerHTML = history.map(h => {
        const date = new Date(h.timestamp).toLocaleString();

        let statusColor = 'var(--primary-orange)'; // Default
        let textColor = '#333'; // Default text

        const statusValues = (h.status || '').trim().toLowerCase();

        if (statusValues === 'delivered') {
            statusColor = '#007BFF';
            textColor = '#007BFF';
        } else if (statusValues === 'cancelled') {
            statusColor = '#DC3545';
            textColor = '#DC3545';
        }

        return `
        <div style="position: relative; margin-bottom: 20px;">
            <div style="position: absolute; left: -26px; top: 0; width: 12px; height: 12px; background: ${statusColor}; border-radius: 50%;"></div>
            <div style="font-weight: bold; color: ${textColor};" class="status-${h.status.toLowerCase()}">${h.status}</div>
            <div style="font-size: 0.85rem; color: #777;">${date}</div>
        </div>
        `;
    }).join('');

    if (history.length === 0) {
        timelineList.innerHTML = '<p>No history available.</p>';
    }

    timelineContainer.appendChild(timelineList);

    // Insert Timeline AFTER Summary (Append to container)
    const summaryBox = document.querySelector('.section-box:last-child'); // Payment Summary
    summaryBox.parentNode.appendChild(timelineContainer);


    // 4. Summary & Calculations (Updated Layout)
    const grandTotal = Number(order.totalAmount || 0);
    const deliveryCharge = grandTotal - subtotal;
    // Dynamic Payment Status Text
    const method = (order.paymentMethod || '').toLowerCase();
    const statusText = (method === 'bkash') ? '(Paid)' : '(COD)';

    document.getElementById('product-price').textContent = `${subtotal.toFixed(2)} BDT`;
    document.getElementById('delivery-charge').textContent = `${deliveryCharge.toFixed(2)} BDT`;

    // Format: "2450.00 BDT (COD)" or "(Paid)"
    document.getElementById('total-amount').textContent = `${grandTotal.toFixed(2)} BDT ${statusText}`;
}
