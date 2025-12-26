document.addEventListener('DOMContentLoaded', async () => {
    const bannerContainer = document.getElementById('banner-container');
    const bannerImg = document.getElementById('banner-img');

    if (bannerContainer && bannerImg) {
        try {
            const res = await fetch(`${API_BASE_URL}/settings`);
            if (res.ok) {
                const data = await res.json();

                if (data.bannerUrl) {
                    bannerImg.src = data.bannerUrl;
                    bannerImg.onerror = function () {
                        // Hide if image fails to load
                        bannerContainer.style.display = 'none';
                    };
                    bannerContainer.style.display = 'block';
                } else {
                    bannerContainer.style.display = 'none';
                }
            }
        } catch (err) {
            console.error("Failed to load banner settings", err);
            bannerContainer.style.display = 'none';
        }
    }
});