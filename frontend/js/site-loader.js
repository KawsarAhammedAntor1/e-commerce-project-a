// site-loader.js
// Runs on every page to inject dynamic White-Label settings

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Use window.API_BASE_URL if available (from config.js), otherwise relative path logic could be needed
        // Assuming global.js or config.js sets this.
        const apiUrl = window.API_BASE_URL ? `${window.API_BASE_URL}/settings` : '/api/settings';

        const res = await fetch(apiUrl);
        if (!res.ok) return;

        const settings = await res.json();

        if (!settings) return;

        // 1. Update Site Title (Tab Title)
        if (settings.siteName) {
            document.title = settings.siteName + (document.title.includes('-') ? ' - ' + document.title.split('-')[1] : '');
        }

        // 2. Update Navbar Brand / Logo
        const brandNames = document.querySelectorAll('.logo, .navbar-brand, h1 a, .footer-logo, .header-logo');
        brandNames.forEach(el => {
            // If it's an image logo
            if (settings.logoUrl && el.tagName === 'IMG') {
                el.src = settings.logoUrl;
            }
            // If it's a CONTAINER (like h1, div, a)
            else {
                // Check if it HAS an image inside
                const img = el.querySelector('img');
                if (img && settings.logoUrl) {
                    img.src = settings.logoUrl;
                }
                // If NO image, update TEXT
                else if (settings.siteName && !img) {
                    // Check if it has child elements like <i> (icons)
                    const icon = el.querySelector('i');
                    if (icon) {
                        // Preserve icon, update text
                        // This assumes icon is first.
                        const textNode = Array.from(el.childNodes).find(node => node.nodeType === 3 && node.textContent.trim().length > 0);
                        if (textNode) {
                            textNode.textContent = ' ' + settings.siteName;
                        } else {
                            el.innerHTML = '';
                            el.appendChild(icon);
                            el.append(' ' + settings.siteName);
                        }
                    } else {
                        // Pure text element
                        el.textContent = settings.siteName;
                    }
                }
            }
        });

        // 3. Update Text Logo Specifically (Common in this template)
        // Adjust this selector if your specific logo element has a specific ID or class
        const textLogo = document.querySelector('a.logo');
        if (textLogo && settings.siteName) {
            // Check if it has an icon
            const icon = textLogo.querySelector('i');
            if (icon) {
                // Keep icon, update text node only
                textLogo.innerHTML = '';
                textLogo.appendChild(icon);
                textLogo.append(' ' + settings.siteName);
            } else {
                textLogo.textContent = settings.siteName;
            }
        }

        // 4. Update Main Banner (Index Page)
        if (settings.bannerUrl) {
            const banner = document.querySelector('#hero'); // Standard ID for hero sections
            if (banner) {
                banner.style.backgroundImage = `url('${settings.bannerUrl}')`;
            }
        }

        // 5. Update Mobile Sidebar Name
        // Try ID first, then class if ID fails (Robustness)
        const mobileSideName = document.getElementById('mobile-site-name') || document.querySelector('.side-nav-logo');

        if (mobileSideName) {
            mobileSideName.innerHTML = ''; // Clear previous content

            // 2b-1. Prepend Logo if exists
            if (settings.logoUrl) {
                const img = document.createElement('img');
                // Robust URL handling
                img.src = window.getImageUrl ? window.getImageUrl(settings.logoUrl) : settings.logoUrl;
                img.alt = settings.siteName || 'Logo';

                // Styling for Circular Logo
                img.style.width = '35px';
                img.style.height = '35px';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                img.style.marginRight = '8px';
                img.style.verticalAlign = 'middle';

                // Error Handler
                img.onerror = () => {
                    // console.error("Failed to load logo image:", img.src);
                    img.style.display = 'none';
                };

                mobileSideName.appendChild(img);
            }

            // 2b-2. Append Text
            const textSpan = document.createElement('span');
            textSpan.textContent = settings.siteName || "Girl's Fashion";
            textSpan.style.verticalAlign = 'middle';
            mobileSideName.appendChild(textSpan);
        }

    } catch (error) {
        console.warn('Failed to load site settings:', error);
    }
});
