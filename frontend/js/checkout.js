document.addEventListener('DOMContentLoaded', () => {
    const checkoutItemsContainer = document.getElementById('checkout-items-container');
    const subtotalDisplay = document.getElementById('subtotal-display');
    const deliveryChargeDisplay = document.getElementById('delivery-charge-display');
    const grandTotalDisplay = document.getElementById('grand-total-display');
    const placeOrderBtn = document.getElementById('place-order-btn');

    // Shipping form inputs
    const shippingNameInput = document.getElementById('shipping-name');
    const shippingPhoneInput = document.getElementById('shipping-phone');
    const shippingAddressInput = document.getElementById('shipping-address');

    // New Inputs
    const shippingCountrySelect = document.getElementById('shipping-country');
    const shippingDistrictSelect = document.getElementById('shipping-district');
    const shippingDistrictInput = document.getElementById('shipping-district-input');
    const shippingAreaSelect = document.getElementById('shipping-area');
    const shippingAreaInput = document.getElementById('shipping-area-input');

    // --- NEW: Check Server Config for bKash Visibility ---
    async function checkPaymentSettings() {
        try {
            // API_BASE_URL is global (from config.js)
            const response = await fetch(`${API_BASE_URL}/config`);
            const data = await response.json();

            // checkout.html এ যে ID বসানো হয়েছে
            const bkashOption = document.getElementById('bkash-payment-option');

            if (bkashOption) {
                if (data.enableBkash === false) {
                    // সার্ভারে false থাকলে বাটন গায়েব
                    bkashOption.style.display = 'none';

                    // যদি কেউ ভুল করে আগেই বিকাশ সিলেক্ট করে রাখে, তবে অটোমেটিক COD করে দেওয়া হবে
                    const bkashInput = bkashOption.querySelector('input');
                    if (bkashInput && bkashInput.checked) {
                        const codInput = document.querySelector('input[value="cod"]');
                        if (codInput) codInput.checked = true;
                    }
                } else {
                    // সার্ভারে true থাকলে বাটন দেখাবে
                    bkashOption.style.display = 'flex'; // CSS class অনুযায়ী flex বা block হতে পারে
                }
            }
        } catch (error) {
            console.error("Error fetching payment config:", error);
        }
    }

    // পেজ লোড হলে ফাংশনটি কল করা হচ্ছে
    checkPaymentSettings();
    // -----------------------------------------------------------

    // --- Country to ISO Mapping for Phone Sync ---
    const countryToIsoMap = {
        "Bangladesh": "bd", "United States": "us", "United Kingdom": "gb", "Canada": "ca", "Australia": "au",
        "India": "in", "Saudi Arabia": "sa", "United Arab Emirates": "ae", "Malaysia": "my", "Singapore": "sg",
        "Germany": "de", "France": "fr", "Italy": "it", "Spain": "es", "Netherlands": "nl", "Japan": "jp", "South Korea": "kr",
        "Qatar": "qa", "Kuwait": "kw", "Oman": "om", "Bahrain": "bh", "China": "cn", "Brazil": "br", "Russia": "ru", "South Africa": "za"
    };

    // --- 1. Intl Tel Input Setup (Text Only Mode) ---
    let iti = null;
    if (shippingPhoneInput) {
        iti = window.intlTelInput(shippingPhoneInput, {
            initialCountry: "bd",
            separateDialCode: false, // Code is part of the input value
            nationalMode: false,     // Force international format (with +CODE)
            allowDropdown: false,    // Disable generic dropdown interaction
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
        });

        // Validation on blur
        shippingPhoneInput.addEventListener('blur', () => {
            const isValid = iti.isValidNumber();
            if (!isValid) {
                shippingPhoneInput.classList.add('error-border');
            } else {
                shippingPhoneInput.classList.remove('error-border');
            }
        });
    }

    // API_BASE_URL is global


    // --- Location Data (BD) ---
    const bdLocationData = {
        "Dhaka": ["Dhaka City", "Savar", "Dhamrai", "Keraniganj", "Nawabganj", "Dohar"],
        "Gazipur": ["Gazipur City", "Kaliakair", "Kapasia", "Sreepur", "Kaliganj"],
        "Narayanganj": ["Narayanganj City", "Rupganj", "Sonargaon", "Araihazar", "Bandar"],
        "Manikganj": ["Manikganj Sadar", "Singair", "Shivalaya", "Saturia", "Harirampur", "Ghior", "Daulatpur"],
        "Munshiganj": ["Munshiganj Sadar", "Sreenagar", "Sirajdikhan", "Louhajang", "Gazaria", "Tongibari"],
        "Narsingdi": ["Narsingdi Sadar", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"],
        "Tangail": ["Tangail Sadar", "Sakhipur", "Basail", "Madhupur", "Ghatail", "Kalihati", "Nagarpur", "Mirzapur", "Gopalpur", "Delduar", "Bhuapur", "Dhanbari"],
        "Kishoreganj": ["Kishoreganj Sadar", "Bhairab", "Bajitpur", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail", "Austagram"],
        "Faridpur": ["Faridpur Sadar", "Boalmari", "Alfadanga", "Madhukhali", "Bhanga", "Nagarkanda", "Charbhadrasan", "Sadarpur", "Shaltha"],
        "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
        "Madaripur": ["Madaripur Sadar", "Kalkini", "Rajoir", "Shibchar"],
        "Rajbari": ["Rajbari Sadar", "Goalanda", "Pangsha", "Baliakandi", "Kalukhali"],
        "Shariatpur": ["Shariatpur Sadar", "Naria", "Zajira", "Gosairhat", "Bhedarganj", "Damudya"],
        "Chattogram": ["Chattogram City", "Sitakunda", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Fatikchhari", "Hathazari", "Boalkhali", "Anwara", "Chandanaish", "Satkania", "Lohagara", "Banshkhali", "Sandwip"],
        "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Kutubdia", "Ukhiya", "Moheshkhali", "Pekua", "Ramu", "Teknaf"],
        "Cumilla": ["Cumilla Sadar", "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Muradnagar", "Nangalkot", "Meghna", "Titas", "Monohargonj", "Lalmai"],
        "Brahmanbaria": ["Brahmanbaria Sadar", "Ashuganj", "Nasirnagar", "Nabinagar", "Sarail", "Kasba", "Akhaura", "Bancharampur", "Bijoynagar"],
        "Chandpur": ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab North", "Matlab South", "Shahrasti"],
        "Lakshmipur": ["Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati", "Kamalnagar"],
        "Noakhali": ["Noakhali Sadar", "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Kabirhat"],
        "Feni": ["Feni Sadar", "Daganbhuiyan", "Chhagalnaiya", "Parshuram", "Fulgazi", "Sonagazi"],
        "Khagrachhari": ["Khagrachhari Sadar", "Dighinala", "Panchhari", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Ramgarh", "Guimara"],
        "Rangamati": ["Rangamati Sadar", "Kaptai", "Kawkhali", "Baghaichhari", "Barkal", "Langadu", "Rajasthali", "Belaichhari", "Juraichhari", "Naniarchar"],
        "Bandarban": ["Bandarban Sadar", "Ali Kadam", "Naikhongchhari", "Rowangchhari", "Lama", "Ruma", "Thanchi"],
        "Sylhet": ["Sylhet Sadar", "Beanibazar", "Bishwanath", "Dakshin Surma", "Balaganj", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Zakiganj", "Osmani Nagar"],
        "Moulvibazar": ["Moulvibazar Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"],
        "Habiganj": ["Habiganj Sadar", "Azmiriganj", "Bahubal", "Baniyachong", "Chunarughat", "Lakhai", "Madhabpur", "Nabiganj", "Shayestaganj"],
        "Sunamganj": ["Sunamganj Sadar", "Bishwamvarpur", "Chhatak", "Derai", "Dharamapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sullah", "Tahirpur", "South Sunamganj", "Shantiganj"],
        "Rajshahi": ["Rajshahi City", "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"],
        "Chapainawabganj": ["Chapainawabganj Sadar", "Gomastapur", "Nachol", "Bholahat", "Shibganj"],
        "Natore": ["Natore Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Naldanga"],
        "Naogaon": ["Naogaon Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mohadevpur", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
        "Pabna": ["Pabna Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"],
        "Sirajganj": ["Sirajganj Sadar", "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Tarash", "Ullahpara"],
        "Bogura": ["Bogura Sadar", "Adamdighi", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Sherpur", "Shibganj", "Sonatala"],
        "Joypurhat": ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"],
        "Rangpur": ["Rangpur Sadar", "Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"],
        "Dinajpur": ["Dinajpur Sadar", "Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Fulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"],
        "Kurigram": ["Kurigram Sadar", "Bhurungamari", "Char Rajibpur", "Chilmari", "Phulbari", "Nageshwari", "Rajarhat", "Rowmari", "Ulipur"],
        "Lalmonirhat": ["Lalmonirhat Sadar", "Aditmari", "Hatibandha", "Kaliganj", "Patgram"],
        "Nilphamari": ["Nilphamari Sadar", "Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Saidpur"],
        "Panchagarh": ["Panchagarh Sadar", "Atwari", "Boda", "Debiganj", "Tetulia"],
        "Thakurgaon": ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Pirganj", "Ranishankail"],
        "Gaibandha": ["Gaibandha Sadar", "Fulchhari", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
        "Khulna": ["Khulna City", "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Terokhada"],
        "Jashore": ["Jashore Sadar", "Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
        "Satkhira": ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"],
        "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
        "Narail": ["Narail Sadar", "Kalia", "Lohagara"],
        "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
        "Jhenaidah": ["Jhenaidah Sadar", "Harinakunda", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
        "Chuadanga": ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"],
        "Meherpur": ["Meherpur Sadar", "Gangni", "Mujibnagar"],
        "Kushtia": ["Kushtia Sadar", "Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Mirpur"],
        "Barishal": ["Barishal Sadar", "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
        "Bhola": ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
        "Patuakhali": ["Patuakhali Sadar", "Bauphal", "Dashmina", "Galachipa", "Kalapara", "Mirzaganj", "Rangabali", "Dumki"],
        "Pirojpur": ["Pirojpur Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Indurkani"],
        "Jhalokathi": ["Jhalokathi Sadar", "Kathalia", "Nalchity", "Rajapur"],
        "Barguna": ["Barguna Sadar", "Amtali", "Bamna", "Betagi", "Patharghata", "Taltali"],
        "Mymensingh": ["Mymensingh Sadar", "Bhaluka", "Dhobaura", "Fulbaria", "Gafargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Nandail", "Phulpur", "Trishal", "Tara Khanda"],
        "Jamalpur": ["Jamalpur Sadar", "Baksiganj", "Dewanganj", "Islampur", "Madarganj", "Melandaha", "Sarishabari"],
        "Sherpur": ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"],
        "Netrokona": ["Netrokona Sadar", "Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Purbadhala"]
    };

    // Populate Districts for BD
    function populateBDDistricts() {
        shippingDistrictSelect.innerHTML = '<option value="" disabled selected>Select District</option>';
        Object.keys(bdLocationData).sort().forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            shippingDistrictSelect.appendChild(option);
        });
    }

    // Populate Countries and Init Sync
    if (shippingCountrySelect) {
        shippingCountrySelect.innerHTML = '';
        Object.keys(countryToIsoMap).forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            if (country === 'Bangladesh') option.selected = true;
            shippingCountrySelect.appendChild(option);
        });

        // Initialize
        populateBDDistricts();
        toggleAddressFields('Bangladesh');

        // Country Change Listener
        shippingCountrySelect.addEventListener('change', function () {
            const country = this.value;
            toggleAddressFields(country);

            // SYNC PHONE COUNTRY (Auto Insert Code)
            const iso = countryToIsoMap[country];
            if (iso && iti) {
                iti.setCountry(iso);
                // Also auto-insert the dial code into the input
                // iti.setNumber('') clears it, but we want the prefix.
                // We must use getSelectedCountryData after setCountry
                const dialCode = iti.getSelectedCountryData().dialCode;
                if (dialCode) {
                    iti.setNumber("+" + dialCode);
                }
            }

            if (country === 'Bangladesh') {
                const currentDistrict = shippingDistrictSelect.value;
                if (currentDistrict) {
                    handleDeliveryChargeAutomated(currentDistrict);
                } else {
                    // Reset to default
                    document.getElementById('delivery-location-group').style.display = 'block';
                    document.getElementById('intl-shipping-msg').style.display = 'none';
                    deliveryCharge = 100;
                    calculateCheckoutTotals(cartData);
                }
            } else {
                updateDeliveryChargeForInternational();
            }
        });
    }

    function toggleAddressFields(country) {
        const deliveryGroup = document.getElementById('delivery-location-group');
        const intlMsg = document.getElementById('intl-shipping-msg');

        if (country === 'Bangladesh') {
            if (shippingDistrictSelect) shippingDistrictSelect.style.display = 'block';
            if (shippingAreaSelect) shippingAreaSelect.style.display = 'block';
            if (shippingDistrictInput) shippingDistrictInput.style.display = 'none';
            if (shippingAreaInput) shippingAreaInput.style.display = 'none';
            if (deliveryGroup) deliveryGroup.style.display = 'block';
            if (intlMsg) intlMsg.style.display = 'none';
        } else {
            if (shippingDistrictInput) shippingDistrictInput.style.display = 'block';
            if (shippingAreaInput) shippingAreaInput.style.display = 'block';
            if (shippingDistrictSelect) shippingDistrictSelect.style.display = 'none';
            if (shippingAreaSelect) shippingAreaSelect.style.display = 'none';
            if (deliveryGroup) deliveryGroup.style.display = 'none';
            if (intlMsg) intlMsg.style.display = 'block';
        }
    }

    // --- District Change Listener (BD Only) ---
    if (shippingDistrictSelect) {
        shippingDistrictSelect.addEventListener('change', function () {
            const selectedDistrict = this.value;
            if (!bdLocationData[selectedDistrict]) return;

            const areas = bdLocationData[selectedDistrict] || [];
            shippingAreaSelect.disabled = false;
            shippingAreaSelect.innerHTML = '<option value="" disabled selected>Select City / Area</option>';

            areas.sort().forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = area;
                shippingAreaSelect.appendChild(option);
            });

            handleDeliveryChargeAutomated(selectedDistrict);
        });
    }

    // --- Delivery Logic ---
    let deliveryCharge = 100.00;

    function handleDeliveryChargeAutomated(district) {
        const radios = document.querySelectorAll('input[name="deliveryLocation"]');
        let selectedVal = 100;

        if (district === 'Dhaka') {
            selectedVal = 100;
        } else {
            selectedVal = 150;
        }

        radios.forEach(radio => {
            const val = Number(radio.value);
            const label = radio.parentElement;

            if (val === selectedVal) {
                radio.checked = true;
                radio.disabled = false; // Enable active one
                label.style.opacity = '1';
                label.style.cursor = 'pointer';
                label.style.pointerEvents = 'auto'; // Make clickable just in case logic changes
            } else {
                radio.checked = false;
                radio.disabled = true; // Disable inactive one
                label.style.opacity = '0.5';
                label.style.cursor = 'not-allowed';
                label.style.pointerEvents = 'none';
            }
        });

        deliveryCharge = selectedVal;
        calculateCheckoutTotals(cartData);
    }

    function updateDeliveryChargeForInternational() {
        deliveryCharge = 0;
        calculateCheckoutTotals(cartData);
    }

    let cartData = [];

    window.loadCheckout = async function () {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const directBuyItemStr = localStorage.getItem('directBuyItem');
            if (directBuyItemStr) {
                const directItem = JSON.parse(directBuyItemStr);
                cartData = [directItem];
            } else {
                const response = await fetch(`${API_BASE_URL}/cart`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch cart items');
                const data = await response.json();
                cartData = Array.isArray(data) ? data : (data.items || []);
            }

            if (cartData.length === 0) {
                checkoutItemsContainer.innerHTML = `<p style="text-align: center; padding: 20px;">Your cart is empty.</p> <div style="text-align: center;"><a href="index.html" class="confirm-order-btn" style="width: auto; padding: 10px 20px; display: inline-block;">Start Shopping</a></div>`;
                if (subtotalDisplay) subtotalDisplay.textContent = '৳0.00';
                if (deliveryChargeDisplay) deliveryChargeDisplay.textContent = '৳0.00';
                if (grandTotalDisplay) grandTotalDisplay.textContent = '৳0.00';
                if (placeOrderBtn) placeOrderBtn.style.display = 'none';
                return;
            }

            renderCheckoutItems(cartData);
            calculateCheckoutTotals(cartData);
            if (placeOrderBtn) {
                placeOrderBtn.style.display = 'block';
                placeOrderBtn.disabled = false;
            }

        } catch (error) {
            console.error('Error loading checkout:', error);
            if (window.showToast) window.showToast('Error loading checkout details.', 'error');
            checkoutItemsContainer.innerHTML = `<p style="text-align: center; color: red;">Error: ${error.message}</p>`;
            if (placeOrderBtn) placeOrderBtn.disabled = true;
        }
    };

    function renderCheckoutItems(items) {
        checkoutItemsContainer.innerHTML = '';
        items.forEach(item => {
            const product = item.product || item.productId;
            if (!product) return;
            const name = product.name || 'Unknown Product';
            const price = Number(product.offerPrice || product.regularPrice || product.price || 0);
            const totalItemPrice = price * item.quantity;
            const imageUrl = window.getImageUrl(product.image);

            const itemDiv = document.createElement('div');
            itemDiv.className = 'checkout-item';
            itemDiv.innerHTML = `
                <img src="${imageUrl}" alt="${name}" class="item-img">
                <div class="item-info">
                    <p class="item-name">${name}</p>
                    <p class="item-qty">Qty: ${item.quantity}</p>
                </div>
                <div class="item-price">${totalItemPrice.toFixed(2)} BDT</div>
            `;
            checkoutItemsContainer.appendChild(itemDiv);
        });
    }

    function calculateCheckoutTotals(items) {
        let subtotal = 0;
        items.forEach(item => {
            const product = item.product || item.productId;
            if (product) {
                const price = Number(product.offerPrice || product.regularPrice || product.price || 0);
                subtotal += price * item.quantity;
            }
        });
        const grandTotal = subtotal + deliveryCharge;
        if (subtotalDisplay) subtotalDisplay.textContent = `${subtotal.toFixed(2)} BDT`;
        if (deliveryChargeDisplay) deliveryChargeDisplay.textContent = `${deliveryCharge.toFixed(2)} BDT`;
        if (grandTotalDisplay) grandTotalDisplay.textContent = `${grandTotal.toFixed(2)} BDT`;
        return { subtotal, grandTotal };
    }

    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async () => {
            const fullName = shippingNameInput.value.trim();
            const address = shippingAddressInput.value.trim();

            // SMART PHONE VALIDATION
            let phoneNumber = shippingPhoneInput.value.trim();
            let isValidPhone = false;

            if (iti) {
                if (iti.isValidNumber()) {
                    isValidPhone = true;
                    phoneNumber = iti.getNumber(); // Get full international format
                } else {
                    isValidPhone = false;
                }
            } else {
                isValidPhone = (phoneNumber.length > 5);
            }

            const country = shippingCountrySelect.value;
            let district, area;

            if (country === 'Bangladesh') {
                district = shippingDistrictSelect.value;
                area = shippingAreaSelect.value;
            } else {
                district = shippingDistrictInput.value.trim();
                area = shippingAreaInput.value.trim();
            }

            if (!fullName || !phoneNumber || !address || !district || !area) {
                if (window.showToast) window.showToast('Please fill in all shipping details.', 'error');
                return;
            }

            const nameRegex = /^[a-zA-Z\s.]+$/;
            if (!nameRegex.test(fullName)) {
                Swal.fire({ icon: 'error', title: 'Invalid Name', text: "Please enter a valid name using only characters.", confirmButtonText: 'OK' });
                return;
            }

            if (!isValidPhone) {
                const countryName = iti ? iti.getSelectedCountryData().name.split(' (')[0] : "selected country";
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Phone Number',
                    text: `The phone number entered is not valid for ${countryName}. Please check the format and length.`,
                    confirmButtonText: 'OK'
                });
                return;
            }

            const addressHasText = /[a-zA-Z]/.test(address);
            if (!addressHasText) {
                Swal.fire({ icon: 'error', title: 'Invalid Address', text: "Please enter a valid shipping address.", confirmButtonText: 'OK' });
                return;
            }

            if (cartData.length === 0) {
                if (window.showToast) window.showToast('Cart is empty.', 'error');
                return;
            }

            const { grandTotal } = calculateCheckoutTotals(cartData);
            const orderItems = cartData.map(item => {
                const product = item.product || item.productId;
                if (!product) return null;
                const price = Number(product.offerPrice || product.regularPrice || product.price || 0);
                return { name: product.name, qty: item.quantity, image: product.image, price: price, product: product._id };
            }).filter(item => item !== null);

            const orderData = {
                orderItems,
                shippingAddress: {
                    name: fullName,
                    phone: phoneNumber,
                    address: address,
                    city: `${area}, ${district}, ${country}`,
                    country: country
                },
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
                totalAmount: grandTotal,
            };

            // *** বিকাশ রেস্ট্রিকশন এখান থেকে সরিয়ে ফেলা হয়েছে (অপরিবর্তিত) ***

            const token = localStorage.getItem('token');
            try {
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = 'Placing Order...';

                // Defaulting to Orders API
                const response = await fetch(`${API_BASE_URL}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(orderData),
                });
                if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Order failed'); }
                const result = await response.json();
                if (window.showToast) window.showToast(`Order Placed! ID: ${result._id.slice(-6)}`, 'success');
                localStorage.removeItem('cartItems');
                localStorage.removeItem('directBuyItem');
                if (window.updateCartCount) window.updateCartCount();
                setTimeout(() => { window.location.href = 'profile.html'; }, 1500);

            } catch (error) {
                console.error('Order Error:', error);
                if (window.showToast) window.showToast(error.message, 'error');
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Confirm Order';
            }
        });
    }

    if (window.location.pathname.endsWith('checkout.html')) {
        window.loadCheckout();
    }
});