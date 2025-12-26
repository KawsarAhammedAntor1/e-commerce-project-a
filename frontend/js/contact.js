document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.querySelector('.contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Stop actual submission for now

            // Basic validation (optional, as HTML 'required' handles empty fields)
            const name = document.getElementById('name').value;
            const message = document.getElementById('message').value;

            if (name && message) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Thanks, your message sent successfully.',
                    confirmButtonColor: '#28a745', // Green to match theme
                    confirmButtonText: 'OK'
                }).then(() => {
                    // Start fresh
                    contactForm.reset();
                });
            }
        });
    }
});

// --- Dynamic Contact Info ---
document.addEventListener('DOMContentLoaded', async () => {
    const socialLinksContainer = document.getElementById('social-links-container');
    const fbLink = document.getElementById('fb-link');
    const emailLink = document.getElementById('email-link');

    if (socialLinksContainer && fbLink && emailLink) {
        try {
            const res = await fetch(`${API_BASE_URL}/settings`);
            if (res.ok) {
                const data = await res.json();

                let hasLink = false;

                if (data.facebookUrl) {
                    fbLink.href = data.facebookUrl;
                    fbLink.style.display = 'inline-block';
                    hasLink = true;
                } else {
                    fbLink.style.display = 'none';
                }

                if (data.supportEmail) {
                    emailLink.href = `mailto:${data.supportEmail}`;
                    emailLink.style.display = 'inline-block';
                    hasLink = true;
                } else {
                    emailLink.style.display = 'none';
                }

                if (hasLink) {
                    socialLinksContainer.style.display = 'block';
                }
            }
        } catch (err) {
            console.error("Failed to load contact settings", err);
        }
    }
});
