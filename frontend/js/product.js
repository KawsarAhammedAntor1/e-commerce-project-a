document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT: Backend URL Hardcoded (To avoid undefined error) ---
    // API_BASE_URL and SERVER_URL are global from config.js


    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');

    const categoryTitle = document.getElementById('category-title');
    const productContainer = document.getElementById('product-container');

    // --- Helper to format image URL (Local fallback) ---
    function getImageUrl(imagePath) {
        if (!imagePath) return 'https://via.placeholder.com/150x150.png?text=No+Image';
        if (imagePath.startsWith('http')) return imagePath;
        const cleanPath = imagePath.replace(/\\/g, '/');
        const finalPath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
        return `${SERVER_URL}/${finalPath}`;
    }

    // --- Set Title ---
    if (category) {
        if (categoryTitle) categoryTitle.textContent = category;
    } else {
        if (categoryTitle) categoryTitle.textContent = 'All Products';
    }

    // --- Fetch Products Function ---
    async function fetchCategoryProducts(categoryName = '') {
        if (!productContainer) return;

        productContainer.innerHTML = '<p style="text-align: center;">Loading products...</p>';

        try {
            // URL তৈরি করা
            const url = categoryName
                ? `${API_BASE_URL}/products?category=${encodeURIComponent(categoryName)}`
                : `${API_BASE_URL}/products`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const products = await response.json();
            productContainer.innerHTML = '';

            // যদি কোনো প্রোডাক্ট না থাকে
            if (products.length === 0) {
                productContainer.innerHTML = `
                    <div class="no-results-wrapper" style="width: 100%; min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
                        <div class="no-results-card" style="background: transparent; box-shadow: none; border: none; padding: 0; text-align: center; width: 100%; max-width: 600px;">
                            <i class="fas fa-shopping-cart" style="font-size: 5rem; color: #bdc3c7; margin-bottom: 25px; text-shadow: 2px 2px 0px #95a5a6, 4px 4px 5px rgba(0,0,0,0.1);"></i>
                            <h3 style="font-size: 20px; font-weight: 700; color: #333; margin-bottom: 15px; line-height: 1.4;">No products matching your selection were found.</h3>
                            <p style="font-size: 15px; color: #888; margin-bottom: 30px; font-style: italic;">Perhaps try a different search?</p>
                            <button onclick="window.location.href='index.html'" style="background: linear-gradient(90deg, #6a11cb 0%, #2575fc 100%); color: white; border: none; padding: 12px 35px; font-size: 16px; font-weight: 600; border-radius: 50px; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 5px 15px rgba(37, 117, 252, 0.3); transition: transform 0.2s;">
                                Continue Shopping <i class="fas fa-arrow-left"></i>
                            </button>
                        </div>
                    </div>
                `;
                return;
            }

            // ইউজার এডমিন কিনা চেক করা
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const isAdmin = user && user.role === 'admin';

            // প্রোডাক্ট রেন্ডার করা
            products.forEach(product => {
                // প্রাইস ক্যালকুলেশন (যাতে NaN না আসে)
                const rawPrice = product.offerPrice || product.regularPrice || product.price || 0;
                const priceToDisplay = Number(rawPrice).toFixed(2);

                const productCard = document.createElement('div');
                productCard.className = 'product-card';

                const buttonHtml = isAdmin ? '' : '<button class="btn-order-green btn-add-to-cart">Add to Cart</button>';

                productCard.innerHTML = `
                    <div class="product-click-area" onclick="window.location.href='product-details.html?id=${product._id}'" style="cursor: pointer;">
                        <img src="${getImageUrl(product.image)}" alt="${product.name}" class="product-img">
                        <div class="product-info">
                            <h4>${product.name}</h4>
                            <p class="price">
                                ${(product.offerPrice && Number(product.offerPrice) > 0) ?
                        `<del style="color: #999; font-size: 0.9em; margin-right: 5px;">${Number(product.regularPrice || product.price).toFixed(2)}</del> 
                                 <span class="new-price" style="font-weight: bold; color: var(--primary-orange);">${Number(product.offerPrice).toFixed(2)} BDT</span>`
                        : `<span class="new-price">${priceToDisplay} BDT</span>`}
                            </p>
                        </div>
                    </div>
                    <div style="padding: 0 0.5rem 0.5rem;">
                        ${buttonHtml}
                    </div>
                `;
                productContainer.appendChild(productCard);

                // --- Add to Cart Logic ---
                if (!isAdmin) {
                    const addToCartBtn = productCard.querySelector('.btn-add-to-cart');
                    if (addToCartBtn) {
                        addToCartBtn.addEventListener('click', () => {
                            // আমরা global.js এর addToCart ফাংশন ব্যবহার করছি
                            // এটি কনসিস্টেন্সি বজায় রাখবে এবং টোকেন অটোমেটিক হ্যান্ডেল করবে
                            if (window.addToCart) {
                                window.addToCart(product);
                            } else {
                                alert("System Error: addToCart function missing. Please reload.");
                            }
                        });
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching products:', error);
            if (productContainer) {
                productContainer.innerHTML = '<p style="text-align: center; color: red;">Failed to load products. Check console for details.</p>';
            }
        }
    }

    // ফাংশন কল করা
    fetchCategoryProducts(category);
});