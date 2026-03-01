document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navList = document.querySelector('.nav-list');

    if (menuBtn && navList) {
        menuBtn.addEventListener('click', () => {
            navList.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });
    }

    // Sticky header background on scroll
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (header) {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });

    // Smooth scrolling for anchor links (internal links only)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Menu Leaf Effect
    const menuLinks = document.querySelectorAll('.nav-list a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            console.log('Menu link clicked', this.href);
            // Only apply effect if it's a navigation link (not just a hash)
            // But user might want it for all.
            // If it's a hash link on the same page, we might want the effect too?
            // "Menu select" usually implies navigation.
            // Let's apply to all, but handle navigation delay.

            const href = this.getAttribute('href');
            const isInternal = href.startsWith('#');

            // Create leaf element
            const leaf = document.createElement('span');
            leaf.classList.add('leaf-effect');

            // Position relative to click
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            leaf.style.left = `${x}px`;
            leaf.style.top = `${y}px`;

            this.appendChild(leaf);

            // If it's a page navigation, wait for effect ONLY on mobile
            if (!isInternal && href && href !== '#') {
                // Mobile Transition Effect
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    if (navList && navList.classList.contains('active')) {
                        navList.classList.add('transitioning');
                        if (menuBtn) menuBtn.classList.add('transitioning');
                    }
                    setTimeout(() => {
                        window.location.href = href;
                    }, 700); // Transition earlier (0.7s)
                }
                // On desktop, do nothing (allow default navigation)
            }

            // Clean up leaf after animation (for internal links or if stays on page)
            setTimeout(() => {
                leaf.remove();
            }, 600);
        });
    });

    // Scroll Animation (Fade Up)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Run once
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.feature-card, .service-item');
    fadeElements.forEach(el => {
        observer.observe(el);
    });

    // Smooth scroll to anchor on page load (for cross-page navigation)
    if (window.location.hash) {
        const hash = window.location.hash;
        // Remove hash from URL to prevent browser auto-jump
        history.replaceState(null, '', window.location.pathname + window.location.search);
        // Force scroll to top
        window.scrollTo(0, 0);

        const targetEl = document.querySelector(hash);
        if (targetEl) {
            // Wait for page to settle at top, then start smooth scroll
            setTimeout(() => {
                window.scrollTo(0, 0); // Ensure we're at top
                const targetY = targetEl.getBoundingClientRect().top + window.pageYOffset;
                const startY = 0;
                const distance = targetY;
                const duration = 2500; // 2.5 seconds
                let startTime = null;
                let cancelled = false;

                function easeInOutCubic(t) {
                    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                }

                // Cancel animation if user interacts
                function cancelScroll() {
                    cancelled = true;
                    window.removeEventListener('wheel', cancelScroll);
                    window.removeEventListener('touchmove', cancelScroll);
                }
                window.addEventListener('wheel', cancelScroll, { once: true });
                window.addEventListener('touchmove', cancelScroll, { once: true });

                function scrollStep(timestamp) {
                    if (cancelled) return;
                    if (!startTime) startTime = timestamp;
                    const elapsed = timestamp - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = easeInOutCubic(progress);
                    window.scrollTo(0, startY + distance * ease);
                    if (progress < 1) {
                        requestAnimationFrame(scrollStep);
                    } else {
                        window.removeEventListener('wheel', cancelScroll);
                        window.removeEventListener('touchmove', cancelScroll);
                    }
                }

                requestAnimationFrame(scrollStep);
            }, 250);
        }
    }
});
