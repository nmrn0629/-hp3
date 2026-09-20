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
            const href = this.getAttribute('href');
            // href が "#" のみだと querySelector('#') が例外を投げるため除外
            if (href === '#') return;
            const target = document.querySelector(href);
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
            const isMobile = window.innerWidth <= 768;
            const scrollDelay = isMobile ? 500 : 250;
            // Wait for page to settle at top, then start smooth scroll
            setTimeout(() => {
                window.scrollTo(0, 0); // Ensure we're at top
                const elRect = targetEl.getBoundingClientRect();
                const elTop = elRect.top + window.pageYOffset;
                // On mobile, center the element on screen
                const targetY = isMobile
                    ? elTop - (window.innerHeight / 2) + (elRect.height / 2)
                    : elTop;
                const startY = 0;
                const distance = targetY;
                const duration = isMobile ? 5000 : 2500;
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
            }, scrollDelay);
        }
    }

    // Topics Floating Button & Bubble Logic
    const fab = document.getElementById('topics-fab');
    const bubble = document.getElementById('topics-bubble');
    const closeBtn = document.getElementById('close-topics');

    if (fab && bubble) {
        let isDragging = false;
        let startX, startY;
        let initialX, initialY;
        let hasMoved = false;

        const onStart = (e) => {
            isDragging = true;
            hasMoved = false;
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;
            
            const rect = fab.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            fab.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!isDragging) return;
            
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                hasMoved = true;
                bubble.classList.remove('active'); // 実際に移動を開始した時だけ閉じる
            }

            let newX = initialX + dx;
            let newY = initialY + dy;

            // Boundary checks
            const fabWidth = fab.offsetWidth;
            const fabHeight = fab.offsetHeight;
            newX = Math.max(10, Math.min(window.innerWidth - fabWidth - 10, newX));
            newY = Math.max(10, Math.min(window.innerHeight - fabHeight - 10, newY));

            fab.style.left = `${newX}px`;
            fab.style.top = `${newY}px`;
            fab.style.bottom = 'auto';
            fab.style.right = 'auto';
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            fab.style.transition = 'transform 0.3s ease';
        };

        // dragging events
        fab.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);

        fab.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);

        // Click to toggle bubble
        fab.addEventListener('click', (e) => {
            // ドラッグ直後はクリックイベントを無視
            if (hasMoved) {
                e.preventDefault();
                return;
            }
            
            const isActive = bubble.classList.contains('active');
            if (!isActive) {
                renderTopics();
                bubble.classList.add('active');
            } else {
                bubble.classList.remove('active');
            }
            updateBubblePosition();
        });

        const renderTopics = () => {
            const list = bubble.querySelector('.topics-list');
            if (list && window.topicsData) {
                // archive.html と同じ実装。innerHTML 挿入前に値をエスケープして XSS を防ぐ
                const escapeHtml = function (str) {
                    return String(str).replace(/[&<>"']/g, function (c) {
                        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
                    });
                };
                // 表示は日付の降順。ただし「先頭 BASE_LIMIT 件」は必ず残す。
                // 単純に日付順の上位だけを出すと、追加したばかりの古い日付のトピックが
                // その場で表示枠から落ちてしまうため。
                // そのうえで、隠れる側に「表示中の最古の日付より新しいもの」が残らないよう、
                // 該当分は表示件数を増やして引き上げる。
                const BASE_LIMIT = 10;
                const all = window.topicsData;
                const base = all.slice(0, BASE_LIMIT);
                const cutoff = base.length
                    ? base.reduce((min, t) => ((t.date || '') < min ? (t.date || '') : min), base[0].date || '')
                    : '';
                const visible = base.length
                    ? base
                        .concat(all.slice(BASE_LIMIT).filter(t => (t.date || '') >= cutoff))
                        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                    : [];
                const total = (window.topicsArchiveData || all).length;
                const hasArchive = total > visible.length;
                const itemsHtml = visible.map(topic => `
                    <li>
                        <span class="topics-date">${escapeHtml(topic.date)}${topic.dateType ? `<span class="topics-datetype">（${escapeHtml(topic.dateType)}）</span>` : ''}</span>
                        ${escapeHtml(topic.content)}
                        ${topic.url ? `<br><a href="${escapeHtml(topic.url)}" class="topics-link">詳細はこちら</a>` : ''}
                    </li>
                `).join('');
                const hasType = visible.some(t => t.dateType);
                const legendHtml = hasType
                    ? `<li class="topics-legend">※発出日＝国税庁が通達を出した日／掲載日＝国税庁ホームページに掲載された日／実施日＝変更が始まる日</li>`
                    : '';
                const archiveHtml = hasArchive
                    ? `<li class="topics-archive-link-item"><a href="archive.html" class="topics-archive-link">過去のTOPICS →</a></li>`
                    : '';
                list.innerHTML = itemsHtml + legendHtml + archiveHtml;
            }
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                bubble.classList.remove('active');
            });
        }

        const updateBubblePosition = () => {
            const fabRect = fab.getBoundingClientRect();
            const bubbleWidth = bubble.offsetWidth;
            
            // Positions relative to FAB
            let bLeft = fabRect.left - bubbleWidth + 40;
            let bTop = fabRect.top - bubble.offsetHeight - 15;

            // Boundary checks for bubble
            if (bLeft < 10) bLeft = 10;
            if (bTop < 80) bTop = fabRect.bottom + 15; // Show below if no space above

            bubble.style.left = `${bLeft}px`;
            bubble.style.top = `${bTop}px`;
            bubble.style.bottom = 'auto';
            bubble.style.right = 'auto';
            
            // Adjust tail position
            const tail = bubble.querySelector('.topics-bubble-tail');
            if (tail) {
                const relativeX = fabRect.left + (fabRect.width / 2) - bLeft;
                tail.style.left = `${relativeX - 10}px`;
                tail.style.right = 'auto';
                
                if (bTop > fabRect.bottom) {
                    tail.style.top = '-10px';
                    tail.style.bottom = 'auto';
                    tail.style.borderRight = 'none';
                    tail.style.borderBottom = 'none';
                    tail.style.borderTop = '2px solid var(--color-primary)';
                    tail.style.borderLeft = '2px solid var(--color-primary)';
                } else {
                    tail.style.top = 'auto';
                    tail.style.bottom = '-10px';
                    tail.style.borderTop = 'none';
                    tail.style.borderLeft = 'none';
                    tail.style.borderRight = '2px solid var(--color-primary)';
                    tail.style.borderBottom = '2px solid var(--color-primary)';
                }
            }
        };

        window.addEventListener('resize', () => {
            if (bubble.classList.contains('active')) {
                updateBubblePosition();
            }
        });
    }
});

