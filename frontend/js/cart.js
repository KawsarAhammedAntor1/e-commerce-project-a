document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartSummary = document.getElementById('cart-summary');
    const subtotalDisplay = document.getElementById('subtotal-display');
    const deliveryChargeDisplay = document.getElementById('delivery-charge-display');
    const grandTotalDisplay = document.getElementById('grand-total-display');
    const proceedToCheckoutBtn = document.getElementById('proceed-to-checkout-btn');

    // Buttons
    const btnStartShopping = document.getElementById('btn-start-shopping');
    const btnSignupShopping = document.getElementById('btn-signup-shopping');

    // API Config
    // API_BASE_URL and SERVER_URL are global

    const DELIVERY_CHARGE = 60.00;

    const getImageUrl = window.getImageUrl || function (path) {
        if (!path) return 'https://via.placeholder.com/150';
        if (path.startsWith('http')) return path;
        return `${SERVER_URL}/${path.replace(/\\/g, '/')}`;
    };

    // UI Helper: Handle Empty Cart State
    function handleEmptyCartUI(isLoggedIn) {
        if (emptyCartMessage) emptyCartMessage.style.display = 'block';
        if (cartItemsContainer) cartItemsContainer.style.display = 'none';

        // Hide Summary and Checkout Button explicitly
        if (cartSummary) cartSummary.style.display = 'none';
        if (proceedToCheckoutBtn) proceedToCheckoutBtn.style.display = 'none';

        if (isLoggedIn) {
            // USER LOGGED IN: Show "Start Shopping", Hide "Sign Up"
            if (btnStartShopping) btnStartShopping.style.display = 'inline-block';
            if (btnSignupShopping) btnSignupShopping.style.display = 'none';
        } else {
            // USER NOT LOGGED IN: Hide "Start Shopping", Show "Sign Up"
            if (btnStartShopping) btnStartShopping.style.display = 'none';
            if (btnSignupShopping) btnSignupShopping.style.display = 'inline-block';
        }
    }

    window.loadCart = async function () {
        const token = localStorage.getItem('token');

        // SCENARIO 1: User Not Logged In
        if (!token) {
            handleEmptyCartUI(false); // false = Not Logged In
            return;
        }

        // SCENARIO 2: User Logged In
        try {
            const response = await fetch(`${API_BASE_URL}/cart`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch cart');
            }

            const data = await response.json();
            const cartItems = Array.isArray(data) ? data : (data.items || []);

            // SYNC LOCAL STORAGE ON PAGE LOAD
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            // Update badge immediately using the fresh data
            if (window.updateCartCount) window.updateCartCount();

            if (cartItems.length === 0) {
                handleEmptyCartUI(true); // true = Logged In
            } else {
                // Cart Has Items
                if (emptyCartMessage) emptyCartMessage.style.display = 'none';
                if (cartItemsContainer) cartItemsContainer.style.display = 'block';
                if (cartSummary) cartSummary.style.display = 'block';
                if (proceedToCheckoutBtn) proceedToCheckoutBtn.style.display = 'block';

                renderCartItems(cartItems);
                calculateTotals(cartItems);
            }

        } catch (error) {
            console.error('Error loading cart:', error);
            handleEmptyCartUI(true);
            if (window.showToast) window.showToast('Could not load cart items.', 'error');
        }
    };

    async function renderCartItems(items) {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';

        for (const item of items) {
            const product = item.product || item.productId;
            if (!product) continue;

            const price = Number(product.offerPrice || product.regularPrice || product.price || 0);
            const totalItemPrice = price * item.quantity;
            const imageUrl = getImageUrl(product.image);

            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item-card';
            itemDiv.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 15px; border-bottom: 1px solid #eee; gap: 15px;";

            itemDiv.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px; flex:1;">
                    <img src="${imageUrl}" alt="${product.name}" class="cart-item-image" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px;">
                    <div class="cart-item-details">
                        <h4 class="cart-item-name" style="margin: 0 0 5px 0;">${product.name}</h4>
                        <p class="cart-item-price" style="margin:0; color:#666;">
                            <span id="price-${product._id}">${totalItemPrice.toFixed(2)}</span> BDT 
                            <span style="font-size:0.85em">(${price.toFixed(2)} BDT / unit)</span>
                        </p>
                    </div>
                </div>

                <!-- Quantity Control -->
                <div class="quantity-controls" style="display: flex; align-items: center; gap: 8px; margin-right: 15px;">
                    <button class="qty-btn-minus" data-id="${product._id}" style="width: 25px; height: 25px; border: 1px solid #ddd; background: #f8f8f8; cursor: pointer; border-radius: 4px;">-</button>
                    <span id="qty-${product._id}" style="font-weight: bold; min-width: 20px; text-align: center;">${item.quantity}</span>
                    <button class="qty-btn-plus" data-id="${product._id}" style="width: 25px; height: 25px; border: 1px solid #ddd; background: #f8f8f8; cursor: pointer; border-radius: 4px;">+</button>
                </div>

                <button class="remove-from-cart-btn" data-product-id="${product._id}" style="background:none; border:none; color:red; font-size:1.5rem; cursor:pointer;">&times;</button>
            `;
            cartItemsContainer.appendChild(itemDiv);
        }

        // Event Listeners
        document.querySelectorAll('.remove-from-cart-btn').forEach(btn => btn.addEventListener('click', removeFromCart));
        document.querySelectorAll('.qty-btn-minus').forEach(btn => btn.addEventListener('click', (e) => updateItemQuantity(e.target.dataset.id, -1)));
        document.querySelectorAll('.qty-btn-plus').forEach(btn => btn.addEventListener('click', (e) => updateItemQuantity(e.target.dataset.id, 1)));
    }

    async function updateItemQuantity(productId, change) {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 1. Update Local State (Instant Feedback)
        const cartItemsStr = localStorage.getItem('cartItems');
        let cartItems = [];
        try {
            if (cartItemsStr) cartItems = JSON.parse(cartItemsStr);
        } catch (e) { console.error(e); }

        const itemIndex = cartItems.findIndex(item => {
            const pId = item.product ? (item.product._id || item.product) : item.productId;
            return pId === productId;
        });

        if (itemIndex === -1) return;

        const currentQty = cartItems[itemIndex].quantity;
        const newQty = currentQty + change;

        if (newQty < 1) return; // Prevent < 1

        const product = cartItems[itemIndex].product || cartItems[itemIndex]; // Fallback
        const currentStock = Number(product.stock || 9999); // Default to high if not tracked/populated

        if (change > 0 && newQty > currentStock) {
            if (window.showToast) window.showToast(`Out of Stock! Only ${currentStock} available.`, 'error');
            else alert(`Out of Stock! Only ${currentStock} available.`);
            return;
        }

        cartItems[itemIndex].quantity = newQty;
        localStorage.setItem('cartItems', JSON.stringify(cartItems));

        // 2. Update UI (DOM directly to avoid full Flicker, or re-render - re-render is safer for totals)
        // Updating only text for speed
        const qtySpan = document.getElementById(`qty-${productId}`);
        const priceSpan = document.getElementById(`price-${productId}`);

        if (qtySpan) qtySpan.textContent = newQty;

        // Recalc Item Price
        // product is already defined above at line 166
        const unitPrice = Number(product.offerPrice || product.regularPrice || product.price || 0);
        if (priceSpan) priceSpan.textContent = (unitPrice * newQty).toFixed(2);

        // Recalc Totals
        calculateTotals(cartItems);

        // 3. Sync with Backend
        try {
            await fetch(`${API_BASE_URL}/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ productId, quantity: change }) // +1 or -1 works with backend logic
            });
            // Optional: Re-fetch cart to ensure sync, providing 100% accuracy
            // window.loadCart(); // Maybe too heavy? Let's rely on logic correctness.
        } catch (error) {
            console.error('Failed to sync qty:', error);
            // Rollback if needed (complex), but we'll assume stability for now
        }
    }

    async function removeFromCart(event) {
        const productId = event.target.closest('button').dataset.productId;
        const token = localStorage.getItem('token');

        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/cart/remove/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                if (window.showToast) window.showToast('Item removed', 'success');
                window.loadCart();
                if (window.updateCartCount) window.updateCartCount();
            } else {
                const data = await response.json();
                if (window.showToast) window.showToast(data.message || 'Failed to remove', 'error');
            }
        } catch (error) {
            console.error(error);
        }
    }

    function calculateTotals(items) {
        let subtotal = 0;
        items.forEach(item => {
            const product = item.product || item.productId;
            if (product) {
                const price = Number(product.offerPrice || product.regularPrice || product.price || 0);
                subtotal += price * item.quantity;
            }
        });
        const grandTotal = subtotal + DELIVERY_CHARGE;

        if (subtotalDisplay) subtotalDisplay.textContent = `${subtotal.toFixed(2)} BDT`;
        if (deliveryChargeDisplay) deliveryChargeDisplay.textContent = `${DELIVERY_CHARGE.toFixed(2)} BDT`;
        if (grandTotalDisplay) grandTotalDisplay.textContent = `${grandTotal.toFixed(2)} BDT`;
    }

    // FIX: This ensures clicking "Proceed to Checkout" goes to checkout.html
    if (proceedToCheckoutBtn) {
        proceedToCheckoutBtn.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (token) {
                // STRICT HIERARCHY FIX:
                // When coming from Cart, we MUST clear any previous "Buy Now" data
                // to ensure the checkout page loads the *Cart Items*, not the stale Buy Now item.
                localStorage.removeItem('directBuyItem');

                window.location.href = 'checkout.html';
            } else {
                if (window.showToast) window.showToast('Please login to proceed to checkout', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        });
    }

    // Auto load
    window.loadCart();
});