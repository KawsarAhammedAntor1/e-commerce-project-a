// API_BASE_URL is global


document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Authentication failed. Please Login.");
        window.location.href = 'admin_login.html';
        return;
    }

    // 2. Logout Logic
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        // Settings Button Removed as per request

        logoutBtn.addEventListener('click', () => {
            if (window.logout) {
                window.logout('admin_login.html');
            } else {
                if (confirm("Are you sure you want to logout?")) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'admin_login.html';
                }
            }
        });
    }

    // 3. Load Data
    loadOrders();
    loadProducts();

    // 4. Product Upload Handler
    const uploadForm = document.getElementById('product-upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validation: Check Stock
            const stockInput = uploadForm.querySelector('input[name="stock"]');
            if (stockInput && Number(stockInput.value) < 1) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Stock',
                    text: 'Minimum stock must be 1 to upload a product.', // Use SweetAlert instead of alert()
                    confirmButtonText: 'OK'
                });
                return;
            }



            // Validation: Check Price (Prevent 0 or Negative)
            const priceInput = uploadForm.querySelector('input[name="regularPrice"]');
            const regularPrice = priceInput ? Number(priceInput.value) : 0;

            if (regularPrice <= 0 || (priceInput && priceInput.value.trim() === '')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Price',
                    text: 'Regular Price must be greater than 0.',
                    confirmButtonText: 'OK'
                });
                return;
            }

            // Validation: Check Offer Price (Optional but strict)
            const offerPriceInput = uploadForm.querySelector('input[name="offerPrice"]');
            const offerPrice = offerPriceInput && offerPriceInput.value.trim() !== '' ? Number(offerPriceInput.value) : null;

            if (offerPrice !== null) {
                if (offerPrice <= 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Offer Price',
                        text: 'Offer Price must be greater than 0.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
                if (offerPrice >= regularPrice) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Offer Price',
                        text: 'Offer Price must be less than Regular Price.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
            }

            const formData = new FormData(uploadForm);

            // Loading State
            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = 'Uploading...';

            try {
                const response = await fetch(`${API_BASE_URL}/products`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const data = await response.json();

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: 'Product Uploaded Successfully',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        allowOutsideClick: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            uploadForm.reset();
                            loadProducts();
                            // Enable button after reset
                            submitBtn.disabled = false;
                            submitBtn.innerText = originalBtnText;
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Upload Failed',
                        text: data.message || 'Unknown error occurred'
                    });
                    // Enable button on error
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    icon: 'error',
                    title: 'Server Error',
                    text: 'Could not connect to the server.'
                });
                // Enable button on error
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        });
    }
});

// --- Function to Load Orders (Only Layout Fix) ---
async function loadOrders() {
    const container = document.getElementById('orders-list');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch orders");
        const orders = await response.json();

        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">No orders found.</p>';
            return;
        }

        // Ensuring container layout is clean
        container.style.display = 'block';

        container.innerHTML = orders.map(order => {
            const s = order.status;

            // Logic: Determine which options should be disabled based on current status
            const isOptionDisabled = (opt) => {
                if (s === opt) return ''; // Current status always enabled
                if (s === 'Pending' && (opt === 'Processing' || opt === 'Cancelled')) return '';
                if (s === 'Processing' && opt === 'Shipped') return '';
                if (s === 'Shipped' && opt === 'Delivered') return '';
                return 'disabled';
            };

            // Logic: Disable entire select if Cancelled or Delivered
            const isSelectDisabled = (s === 'Cancelled' || s === 'Delivered') ? 'disabled' : '';

            // Determine Background Class
            let bgClass = '';
            if (s === 'Delivered') bgClass = 'status-bg-delivered';
            if (s === 'Cancelled') bgClass = 'status-bg-cancelled';

            return `
            <div class="order-card ${bgClass}" onclick="window.location.href='order.html?id=${order._id}'" style="cursor: pointer; display: block; margin-bottom: 20px;">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                    <h3>Order #${order._id.slice(-6).toUpperCase()}</h3>
                    <span class="order-status status-${order.status.toLowerCase()}">${order.status}</span>
                </div>
                <div class="order-body" style="margin-bottom: 15px;">
                    <p><strong>User:</strong> ${order.user ? order.user.name : 'Guest'}</p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                    <p><strong>Total:</strong> $${order.totalAmount}</p>
                </div>
                <div class="order-actions" onclick="event.stopPropagation()" style="border-top: 1px dashed #ddd; padding-top: 10px; display: flex; flex-direction: column; gap: 10px;">
                    <select onchange="updateOrderStatus('${order._id}', this.value)" ${isSelectDisabled} style="padding: 8px;">
                        <option value="Pending" ${s === 'Pending' ? 'selected' : ''} ${isOptionDisabled('Pending')}>Pending</option>
                        <option value="Processing" ${s === 'Processing' ? 'selected' : ''} ${isOptionDisabled('Processing')}>Processing</option>
                        <option value="Shipped" ${s === 'Shipped' ? 'selected' : ''} ${isOptionDisabled('Shipped')}>Shipped</option>
                        <option value="Delivered" ${s === 'Delivered' ? 'selected' : ''} ${isOptionDisabled('Delivered')}>Delivered</option>
                        <option value="Cancelled" ${s === 'Cancelled' ? 'selected' : ''} ${isOptionDisabled('Cancelled')}>Cancelled</option>
                    </select>
                    <button class="delete-btn" onclick="deleteOrder('${order._id}')" style="background: #ff4d4d; color: white; border: none; padding: 10px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">
                        <i class="fas fa-trash"></i> Delete Order History
                    </button>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color:red; text-align:center;">Error loading orders.</p>';
    }
}

// --- Function to Update Order Status (Unchanged) ---
async function updateOrderStatus(orderId, newStatus) {
    const token = localStorage.getItem('token');

    const result = await Swal.fire({
        title: 'Update Status?',
        text: `Change status to ${newStatus}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, update it!'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            Swal.fire('Updated!', 'Status updated successfully!', 'success');
            loadOrders();
        } else {
            const data = await response.json();
            Swal.fire('Failed!', `Failed: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error!', 'Error updating status.', 'error');
    }
}

// --- Function to Delete Order (Unchanged) ---
async function deleteOrder(orderId) {
    const token = localStorage.getItem('token');
    const result = await Swal.fire({
        title: 'Delete Order?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            Swal.fire('Deleted!', 'Order has been deleted.', 'success');
            loadOrders();
        } else {
            const data = await response.json();
            Swal.fire('Failed!', data.message || 'Failed to delete order.', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error!', 'Server error.', 'error');
    }
}

// --- Remaining functions (loadProducts, deleteProduct, switchTab) remain exactly as they were ---
async function loadProducts() {
    const container = document.getElementById('products-delete-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE_URL}/products?showAll=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const products = await response.json();
        if (products.length === 0) {
            container.innerHTML = '<p style="text-align:center;">No products available.</p>';
            return;
        }
        container.innerHTML = products.map(product => {
            const stock = typeof product.stock === 'number' ? product.stock : 0;

            let stockHtml = '';
            if (stock === 0) {
                stockHtml = `<span style="color: red; font-weight: bold;"><i class="fas fa-times-circle"></i> Out of Stock</span>`;
            } else if (stock < 5) {
                stockHtml = `<span style="color: #e65100; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> Low Stock: ${stock}</span>`;
            } else {
                stockHtml = `<span style="color: green; font-weight: bold;">Current Stock: ${stock}</span>`;
            }

            return `
            <div class="product-item">
                <div class="product-info">
                    <img src="${product.image}" alt="img" class="product-thumb">
                    <span>
                        <strong>${product.name}</strong> <br>
                        <small>
                            ${stockHtml} 
                            | Price: ${product.regularPrice}
                        </small>
                    </span>
                </div>
                <button class="delete-btn" onclick="deleteProduct('${product._id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
            `;
        }).join('');
    } catch (error) { console.error(error); }
}

async function deleteProduct(productId) {
    const token = localStorage.getItem('token');
    const result = await Swal.fire({
        title: 'Are you sure?', text: "You won't be able to revert this!", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) { Swal.fire('Deleted!', 'Product has been deleted.', 'success'); loadProducts(); }
    } catch (error) { console.error(error); }
}

function switchTab(tabId) {
    document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active-section'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetSection = document.getElementById(tabId);
    if (targetSection) targetSection.classList.add('active-section');
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => { if (btn.getAttribute('onclick').includes(tabId)) btn.classList.add('active'); });
}

window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.deleteProduct = deleteProduct;
window.switchTab = switchTab;