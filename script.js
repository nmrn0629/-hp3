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

            // If it's a page navigation, wait for effect
            if (!isInternal && href && href !== '#') {
                e.preventDefault();

                // Mobile Transition Effect
                // Check if mobile menu is active (window width check + active class)
                if (window.innerWidth <= 768 && navList && navList.classList.contains('active')) {
                    navList.classList.add('transitioning');
                    if (menuBtn) menuBtn.classList.add('transitioning');
                }

                setTimeout(() => {
                    window.location.href = href;
                }, 800); // 800ms delay for visual
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
});
