document.addEventListener('DOMContentLoaded', async () => {

    // Auth Check
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'admin') {
        alert("Access Denied. Admins Only.");
        window.location.href = 'index.html';
        return;
    }

    const form = document.getElementById('settings-form');
    const siteNameInput = document.getElementById('siteName');
    const deleteLogoBtn = document.getElementById('delete-logo-btn');
    const deleteBannerBtn = document.getElementById('delete-banner-btn');
    const facebookUrlInput = document.getElementById('facebookUrl');
    const supportEmailInput = document.getElementById('supportEmail');

    // Load current settings
    try {
        const res = await fetch(`${API_BASE_URL}/settings`);
        const data = await res.json();

        if (data) {
            siteNameInput.value = data.siteName || '';
            facebookUrlInput.value = data.facebookUrl || '';
            supportEmailInput.value = data.supportEmail || '';

            // We can't set file inputs value, but we can show preview if URL exists
            if (data.logoUrl) {
                if (deleteLogoBtn) deleteLogoBtn.style.display = 'block';
            }

            if (data.bannerUrl) {
                if (deleteBannerBtn) deleteBannerBtn.style.display = 'block';
            }
        }
    } catch (err) {
        console.error("Failed to load settings", err);
    }

    // Delete Image Handler
    async function deleteImage(type) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `This will permanently delete the ${type}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                // Show loading
                Swal.fire({
                    title: 'Deleting...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const res = await fetch(`${API_BASE_URL}/settings/image/${type}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.ok) {
                    Swal.fire('Deleted!', `Your ${type} has been deleted.`, 'success');

                    if (type === 'logo') {
                        previewLogo.style.display = 'none';
                        previewLogo.src = '';
                        if (deleteLogoBtn) deleteLogoBtn.style.display = 'none';
                    } else if (type === 'banner') {
                        if (deleteBannerBtn) deleteBannerBtn.style.display = 'none';
                    }
                } else {
                    Swal.fire('Error!', 'Failed to delete image.', 'error');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Error!', 'Something went wrong.', 'error');
            }
        }
    }

    if (deleteLogoBtn) {
        deleteLogoBtn.addEventListener('click', () => deleteImage('logo'));
    }

    if (deleteBannerBtn) {
        deleteBannerBtn.addEventListener('click', () => deleteImage('banner'));
    }

    // Handle Submit with FormData
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('siteName', siteNameInput.value);
        formData.append('facebookUrl', facebookUrlInput.value);
        formData.append('supportEmail', supportEmailInput.value);

        const logoFile = document.getElementById('logoFile').files[0];
        const bannerFile = document.getElementById('bannerFile').files[0];

        if (logoFile) formData.append('logo', logoFile);
        if (bannerFile) formData.append('banner', bannerFile);

        // Show loading state
        Swal.fire({
            title: 'Uploading...',
            text: 'Please wait, uploading images...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: {
                    // Start Authorization header, but DO NOT set Content-Type for FormData
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Settings updated successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire('Error', 'Failed to update settings', 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Server error occurred', 'error');
        }
    });
});
