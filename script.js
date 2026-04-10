// ============================================
// PORTFOLIO — Glassmorphism + Soft Depth
// Morph blobs, 3D tilt, bidirectional scroll
// ============================================

(function () {
    'use strict';

    // Keep motion behavior enabled consistently across sessions.
    const prefersReducedMotion = false;
    const finePointer = window.matchMedia('(pointer:fine)').matches;

    // =============================================
    // DARK MODE TOGGLE
    // =============================================
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (document.documentElement.getAttribute('data-theme') === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // =============================================
    // CURSOR GLOW — Follows mouse with lerp (Optimized)
    // =============================================
    const cursorGlow = document.getElementById('cursorGlow');
    let glowX = 0, glowY = 0, targetX = 0, targetY = 0;
    let glowRaf = 0;
    let lastGlowFrameTime = 0;

    if (cursorGlow && finePointer && !prefersReducedMotion) {
        document.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            cursorGlow.style.opacity = '1';
            
            // Start loop if not running
            if (!glowRaf) {
                lastGlowFrameTime = performance.now();
                glowRaf = requestAnimationFrame(updateGlow);
            }
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            cursorGlow.style.opacity = '0';
        });
    } else if (cursorGlow) {
        cursorGlow.style.display = 'none';
    }

    function updateGlow(now) {
        const frameInterval = 1000 / 60;
        if (now - lastGlowFrameTime < frameInterval) {
            glowRaf = requestAnimationFrame(updateGlow);
            return;
        }
        lastGlowFrameTime = now;

        const dx = targetX - glowX;
        const dy = targetY - glowY;
        
        // If movement is small enough, stop looping.
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            glowRaf = 0;
            return; 
        }

        glowX += dx * 0.06;
        glowY += dy * 0.06;
        if (cursorGlow) {
            cursorGlow.style.left = glowX + 'px';
            cursorGlow.style.top = glowY + 'px';
        }
        glowRaf = requestAnimationFrame(updateGlow);
    }


    // =============================================
    // NAVIGATION
    // =============================================
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const navLinkEls = Array.from(document.querySelectorAll('.nav-link'));
    const navLinkByTarget = new Map(
        navLinkEls
            .filter(link => (link.getAttribute('href') || '').startsWith('#'))
            .map(link => [link.getAttribute('href'), link])
    );

    // Note: Scroll listener moved to single consolidated handler at the bottom

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('open');
        });
    }

    navLinkEls.forEach(link => {
        link.addEventListener('click', () => {
            if (navToggle) navToggle.classList.remove('active');
            if (navLinks) navLinks.classList.remove('open');
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (this.matches('[data-dashboard-switch]')) return; // Handled by dashboard switcher logic
            if (href === '#') return; // Ignore empty anchor tags like Back to Top
            e.preventDefault();
            const targetId = href.slice(1);
            const t = targetId ? document.getElementById(targetId) : null;
            if (t) {
                const y = t.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
            }
        });
    });

    // =============================================
    // PROJECT FILTER TABS
    // =============================================
    const projectFilterButtons = document.querySelectorAll('.project-filter-btn');
    const projectCards = document.querySelectorAll('.bento-grid .bento-card');

    if (projectFilterButtons.length && projectCards.length) {
        projectFilterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');

                projectFilterButtons.forEach(btn => {
                    btn.classList.toggle('active', btn === button);
                    btn.setAttribute('aria-pressed', btn === button ? 'true' : 'false');
                });

                projectCards.forEach(card => {
                    const categories = (card.getAttribute('data-category') || '').split(' ').filter(Boolean);
                    const isMatch = filter === 'all' || categories.includes(filter);
                    card.classList.toggle('is-hidden', !isMatch);
                });
            });
        });
    }


    // =============================================
    // BIDIRECTIONAL SCROLL REVEAL
    // Elements animate in AND out when entering/leaving
    // =============================================
    const revealEls = document.querySelectorAll('[data-reveal]');
    if (prefersReducedMotion) {
        revealEls.forEach(el => {
            el.classList.add('revealed');
            el.classList.remove('reveal-pop');
        });
    } else {
        const revealTimers = new WeakMap();
        const revealObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const el = entry.target;
                if (entry.isIntersecting) {
                    el.classList.add('revealed');
                    if (!el.classList.contains('reveal-pop')) {
                        el.classList.add('reveal-pop');
                        const activeTimer = revealTimers.get(el);
                        if (activeTimer) clearTimeout(activeTimer);
                        const timerId = setTimeout(() => {
                            el.classList.remove('reveal-pop');
                            revealTimers.delete(el);
                        }, 1100);
                        revealTimers.set(el, timerId);
                    }
                } else {
                    // Reset visibility state so animation can replay on re-entry.
                    el.classList.remove('revealed', 'reveal-pop');
                }
            });
        }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });

        revealEls.forEach(el => revealObs.observe(el));
    }


    // =============================================
    // SECTION TITLE — Word-by-word bouncy reveal
    // =============================================
    document.querySelectorAll('.section-title').forEach(title => {
        const words = title.textContent.split(' ');
        title.innerHTML = words.map((word, i) =>
            `<span class="word-wrap" style="display:inline-block;transition:transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s, opacity 0.6s ease ${i * 0.07}s"><span style="display:inline-block">${word}</span></span>`
        ).join(' ');
    });

    if (prefersReducedMotion) {
        document.querySelectorAll('.section-title .word-wrap').forEach(w => {
            w.style.transform = 'translateY(0)';
            w.style.opacity = '1';
        });
    } else {
        const titleObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const wraps = entry.target.querySelectorAll('.word-wrap');
                if (entry.isIntersecting) {
                    wraps.forEach(w => { w.style.transform = 'translateY(0)'; w.style.opacity = '1'; });
                } else {
                    wraps.forEach(w => { w.style.transform = 'translateY(100%)'; w.style.opacity = '0'; });
                }
            });
        }, { threshold: 0.3 });

        document.querySelectorAll('.section-title').forEach(t => {
            t.querySelectorAll('.word-wrap').forEach(w => {
                w.style.transform = 'translateY(100%)';
                w.style.opacity = '0';
            });
            titleObs.observe(t);
        });
    }


    // =============================================
    // 3D TILT — Cards with data-tilt (Optimized)
    // =============================================
    if (finePointer && !prefersReducedMotion) {
        document.querySelectorAll('[data-tilt]').forEach(card => {
        let rect;
        let tiltRaf = 0;
        card.addEventListener('mouseenter', () => {
            rect = card.getBoundingClientRect();
        });

        card.addEventListener('mousemove', (e) => {
            if (!rect) return; // Fallback
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            // Use requestAnimationFrame for smoother hardware-accelerated paint
            cancelAnimationFrame(tiltRaf);
            tiltRaf = requestAnimationFrame(() => {
                card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-6px) scale(1.02)`;
            });
        });

        card.addEventListener('mouseleave', () => {
            rect = null;
            cancelAnimationFrame(tiltRaf);
            tiltRaf = requestAnimationFrame(() => {
                card.style.transform = '';
            });
        });
        });
    }


    // =============================================
    // THREE.JS DATA CORE
    // =============================================
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer && window.THREE) {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 100);

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: !isMobile,
            powerPreference: 'high-performance'
        });
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.5));
        canvasContainer.appendChild(renderer.domElement);

        // Scale up camera slightly to fit the bigger elements without cutting the ring off the viewport
        camera.position.z = 10.5;

        // 3D Animated Scatter Plot (Data Clustered Graph)
        const chartGroup = new THREE.Group();

        // 4 distinct data cluster categories with high-contrast UI colors
        const clusters = [
            { color: new THREE.Color(0xfd79a8), center: new THREE.Vector3(-2, 2, -2) }, // Neon Coral
            { color: new THREE.Color(0x00cec9), center: new THREE.Vector3(2, -2, 2) }, // Cyber Teal
            { color: new THREE.Color(0x6c5ce7), center: new THREE.Vector3(3, 2, -1) }, // Brand Purple
            { color: new THREE.Color(0xfdcb6e), center: new THREE.Vector3(-2, -2, 2) } // Electric Yellow
        ];

        const numParticles = window.innerWidth < 768 ? 180 : 380;
        const positions = new Float32Array(numParticles * 3);
        const colors = new Float32Array(numParticles * 3);
        const particleData = [];

        for (let i = 0; i < numParticles; i++) {
            // Assign to random cluster
            const clusterIndex = Math.floor(Math.random() * clusters.length);
            const cluster = clusters[clusterIndex];

            // Random offset from cluster center (creates the dense "cloud/cluster" look)
            const r = Math.random() * 2.8; 
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            const offsetX = r * Math.sin(phi) * Math.cos(theta);
            const offsetY = r * Math.sin(phi) * Math.sin(theta);
            const offsetZ = r * Math.cos(phi);

            positions[i*3] = cluster.center.x + offsetX;
            positions[i*3+1] = cluster.center.y + offsetY;
            positions[i*3+2] = cluster.center.z + offsetZ;

            colors[i*3] = cluster.color.r;
            colors[i*3+1] = cluster.color.g;
            colors[i*3+2] = cluster.color.b;

            // Store orbital logic data
            particleData.push({
                clusterIndex: clusterIndex,
                offsetX: offsetX,
                offsetY: offsetY,
                offsetZ: offsetZ,
                speed: 0.15 + Math.random() * 0.6,
                angle: Math.random() * Math.PI * 2
            });
        }

        const scatterGeo = new THREE.BufferGeometry();
        scatterGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        scatterGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Draw glowing circular sprites 
        const circleCanvas = document.createElement('canvas');
        circleCanvas.width = 32; circleCanvas.height = 32;
        const ctx = circleCanvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        const circleTexture = new THREE.CanvasTexture(circleCanvas);

        // High contrast glowing material
        const scatterMat = new THREE.PointsMaterial({
            size: 0.22, // Size boosted slightly to punch through the void
            map: circleTexture,
            transparent: true,
            opacity: 0.9,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const pointCloud = new THREE.Points(scatterGeo, scatterMat);
        chartGroup.add(pointCloud);

        // --- OPTION 3: THE SOFT DATA FLOOR (GRID WITH RADIAL FADE) ---
        const gridHelper = new THREE.GridHelper(50, 50, 0x6c5ce7, 0x4a4a4a);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.05;
        gridHelper.position.y = -3.5;
        
        // Add a secondary pulsing glow on the center of the grid for depth
        const gridGlowGeo = new THREE.PlaneGeometry(60, 60);
        const gridGlowMat = new THREE.MeshBasicMaterial({
            color: 0x6c5ce7,
            transparent: true,
            opacity: 0.03,
            side: THREE.DoubleSide
        });
        const gridGlow = new THREE.Mesh(gridGlowGeo, gridGlowMat);
        gridGlow.rotation.x = Math.PI / 2;
        gridGlow.position.y = -3.51; 
        chartGroup.add(gridGlow);

        chartGroup.add(gridHelper);

        scene.add(chartGroup);

        window.addEventListener('resize', () => {
            if (!canvasContainer) return;
            camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        });

        let heroInView = true;
        const heroHost = document.getElementById('hero');

        const clock = new THREE.Clock();
        let lastRenderTime = 0;
        let threeRaf = 0;

        function stopThreeLoop() {
            if (!threeRaf) return;
            cancelAnimationFrame(threeRaf);
            threeRaf = 0;
        }

        function runThreeLoop() {
            if (threeRaf || !heroInView || document.hidden) return;
            clock.getDelta(); // Reset long idle delta before resuming.
            threeRaf = requestAnimationFrame(animate);
        }

        function animate() {
            if (!heroInView || document.hidden) {
                threeRaf = 0;
                return;
            }
            threeRaf = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
            if (t - lastRenderTime < (1 / 45)) return;
            lastRenderTime = t;

            // Chart gently revolves
            chartGroup.rotation.y = t * 0.05;
            chartGroup.rotation.x = Math.sin(t * 0.1) * 0.1;

            // Animate particles organically orbiting inside their data clusters
            const pos = scatterGeo.attributes.position.array;
            
            for (let i = 0; i < numParticles; i++) {
                const pData = particleData[i];
                pData.angle += pData.speed * 0.02;

                const clusterCenter = clusters[pData.clusterIndex].center;

                // Wobble the offset to make the cluster cloud look alive and fluid
                const currentOffsetX = pData.offsetX * Math.cos(pData.angle) + pData.offsetZ * Math.sin(pData.angle);
                const currentOffsetZ = pData.offsetZ * Math.cos(pData.angle) - pData.offsetX * Math.sin(pData.angle);
                const currentOffsetY = pData.offsetY + Math.sin(pData.angle * 2) * 0.2;

                pos[i * 3] = clusterCenter.x + currentOffsetX;
                pos[i * 3 + 1] = clusterCenter.y + currentOffsetY;
                pos[i * 3 + 2] = clusterCenter.z + currentOffsetZ;
            }
            
            // Subtle pulse on the grid surface
            gridHelper.material.opacity = 0.05 + Math.sin(t * 0.5) * 0.02;

            // Finalize geometry updates
            scatterGeo.attributes.position.needsUpdate = true;

            renderer.render(scene, camera);
        }
        if (heroHost) {
            const heroObs = new IntersectionObserver((entries) => {
                heroInView = entries.some(entry => entry.isIntersecting);
                if (heroInView) runThreeLoop();
                else stopThreeLoop();
            }, { threshold: 0.02 });
            heroObs.observe(heroHost);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stopThreeLoop();
            else runThreeLoop();
        }, { passive: true });

        runThreeLoop();
        
        // Add fade up entrance CSS trigger
        setTimeout(() => canvasContainer.style.opacity = 1, 400);
    }


    // =============================================
    // SKILL BARS — Animate on scroll (Optimized)
    // =============================================
    const skillObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle('animated', entry.isIntersecting);
        });
    }, { threshold: 0.3 });
    
    document.querySelectorAll('.skill-bar').forEach(bar => {
        skillObs.observe(bar);
    });

    // =============================================
    // LIVE METRIC TICKER (Featured Card Hover)
    // =============================================
    document.querySelectorAll('.bento-card').forEach(card => {
        const metricEl = card.querySelector('.metric-value');
        if (!metricEl) return;
        
        let hasTicked = false;
        let metricRaf = 0;
        let resetTimer = 0;
        card.addEventListener('mouseenter', () => {
            if (hasTicked) return;
            hasTicked = true;
            
            const target = 94.2; 
            const duration = 1500;
            const start = performance.now();
            
            function easeOutQuart(x) {
                return 1 - Math.pow(1 - x, 4);
            }
            
            function tick(now) {
                const p = Math.min((now - start) / duration, 1);
                metricEl.textContent = (target * easeOutQuart(p)).toFixed(1);
                if (p < 1) {
                    metricRaf = requestAnimationFrame(tick);
                    return;
                }
                metricEl.textContent = target;
                metricRaf = 0;
            }
            metricRaf = requestAnimationFrame(tick);
            
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => { hasTicked = false; }, 5000); 
        });
    });

    // =============================================
    // TIMELINE PROGRESS DRAW-ON SCROLL
    // =============================================
    const timeline = document.querySelector('.timeline');
    const timelineFill = document.getElementById('timelineProgress');

    // =============================================
    // MAGNETIC — Contact card icons
    // =============================================
    if (finePointer && !prefersReducedMotion) {
        document.querySelectorAll('.contact-card').forEach(card => {
            let rect;
            let iconRaf = 0;
            const svg = card.querySelector('svg');
            if (!svg) return;
            card.addEventListener('mouseenter', () => { rect = card.getBoundingClientRect(); });
            
            card.addEventListener('mousemove', (e) => {
                if (!rect) return;
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                cancelAnimationFrame(iconRaf);
                iconRaf = requestAnimationFrame(() => {
                    svg.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px) scale(1.12)`;
                });
            });

            card.addEventListener('mouseleave', () => {
                rect = null;
                cancelAnimationFrame(iconRaf);
                iconRaf = requestAnimationFrame(() => { svg.style.transform = ''; });
            });
        });
    }
    // =============================================
    // ACTIVE NAV HIGHLIGHT
    // =============================================
    const sections = document.querySelectorAll('section[id]');
    let activeSectionId = '';
    const heroSection = document.getElementById('hero');
    const heroInner = document.querySelector('.hero-inner');
    let heroHeightCached = 1;
    let timelineTop = 0;
    let timelineHeight = 1;
    let totalScrollableHeight = 1;
    let sectionRanges = [];

    const refreshLayoutMetrics = () => {
        sectionRanges = Array.from(sections).map(section => ({
            id: section.getAttribute('id'),
            top: section.offsetTop,
            bottom: section.offsetTop + section.offsetHeight
        })).filter(section => section.id);

        heroHeightCached = heroSection ? Math.max(heroSection.offsetHeight, 1) : 1;
        if (timeline) {
            timelineTop = timeline.offsetTop;
            timelineHeight = Math.max(timeline.offsetHeight, 1);
        }
        totalScrollableHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    };
    refreshLayoutMetrics();
    window.addEventListener('resize', refreshLayoutMetrics, { passive: true });
    window.addEventListener('load', refreshLayoutMetrics, { passive: true });

    // Note: Scroll listener for active link moved to single handler

    // =============================================
    // SCROLL PROGRESS
    // =============================================
    const scrollProgress = document.getElementById('scrollProgress');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollProgress) {
        // Note: moved to unified handler
    }

    // =============================================
    // CONTACT FORM (FORMSPREE)
    // =============================================
    const contactForm = document.getElementById('contactForm');
    const contactSubmit = document.getElementById('contactSubmit');
    const contactFormStatus = document.getElementById('contactFormStatus');

    if (contactForm && contactSubmit && contactFormStatus) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const actionUrl = contactForm.getAttribute('action') || '';

            if (!actionUrl || !actionUrl.startsWith('https://formspree.io/f/')) {
                contactFormStatus.textContent = 'Contact form endpoint is not configured correctly.';
                contactFormStatus.className = 'contact-form-status error';
                return;
            }

            contactSubmit.disabled = true;
            contactSubmit.querySelector('span').textContent = 'Sending...';
            contactFormStatus.textContent = '';
            contactFormStatus.className = 'contact-form-status';

            try {
                const response = await fetch(actionUrl, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: new FormData(contactForm)
                });

                if (!response.ok) throw new Error('Form submission failed');

                contactForm.reset();
                contactFormStatus.textContent = 'Thanks, your message was sent successfully.';
                contactFormStatus.className = 'contact-form-status success';
            } catch (err) {
                contactFormStatus.textContent = 'Unable to send right now. Please try again or email me directly.';
                contactFormStatus.className = 'contact-form-status error';
            } finally {
                contactSubmit.disabled = false;
                contactSubmit.querySelector('span').textContent = 'Send Message';
            }
        });
    }

    // =============================================
    // DASHBOARD EMBED SWITCHER
    // =============================================
    const dashboardEmbed = document.getElementById('dashboardEmbed');
    const dashboardSwitchButtons = document.querySelectorAll('.dashboard-switch-btn');
    const dashboardActionButtons = document.querySelectorAll('.bento-action-button[data-dashboard-switch]');
    const dashboardSection = document.getElementById('live-dashboard');

    const setActiveDashboard = (dashboardId) => {
        if (!dashboardEmbed || !dashboardSwitchButtons.length) return;

        const activeButton = Array.from(dashboardSwitchButtons).find(
            btn => btn.dataset.dashboard === dashboardId
        ) || dashboardSwitchButtons[0];

        if (!activeButton) return;

        dashboardSwitchButtons.forEach(btn => {
            const isActive = btn === activeButton;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

        const nextSrc = activeButton.dataset.src;
        const nextTitle = activeButton.dataset.title || 'Live Dashboard';
        if (nextSrc && dashboardEmbed.src !== nextSrc) {
            dashboardEmbed.src = nextSrc;
        }
        dashboardEmbed.title = nextTitle;
    };

    if (dashboardSwitchButtons.length) {
        dashboardSwitchButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setActiveDashboard(btn.dataset.dashboard);
            });
        });
    }

    if (dashboardActionButtons.length) {
        dashboardActionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                setActiveDashboard(btn.dataset.dashboardSwitch);
                dashboardSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // =============================================
    // PROJECT MODALS
    // =============================================
    const modal = document.getElementById('projectModal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const projectCaseStudies = {
        'Fraud Detection System': {
            problem: 'Manual fraud reviews were slow and generated too many false positives on highly imbalanced transaction data.',
            approach: 'Built a classification pipeline with feature engineering, SMOTE balancing, and XGBoost tuning to prioritize high-risk events.',
            result: 'Reached 94% recall and reduced false positives by 12%, improving analyst review efficiency and decision confidence.',
            tools: 'Python, XGBoost, SMOTE, Pandas, SQL',
            liveUrl: 'https://public.tableau.com/views/RegionalSampleWorkbook/College?showVizHome=no',
            codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
            proofs: ['94% Recall', '-12% False Positives', '284K Transactions']
        },
        'CHD Risk Dashboard': {
            problem: 'Stakeholders lacked a clear view of how CHD risk varied across demographic and clinical factors.',
            approach: 'Modeled risk cohorts and built an interactive Power BI dashboard with drill-down filters and KPI summaries.',
            result: 'Surfaced a 15% risk variance across age buckets and improved speed of risk insight reviews.',
            tools: 'Power BI, DAX, Power Query, Excel',
            liveUrl: 'https://public.tableau.com/views/RegionalSampleWorkbook/Stocks?showVizHome=no',
            codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
            proofs: ['15% Risk Variance', 'Drill-Down Filters', 'KPI Summary View']
        },
        'Fintech Payments': {
            problem: 'Payment trend analysis queries were too slow for timely reporting and anomaly checks.',
            approach: 'Refactored SQL with CTE optimization, indexing strategy, and cleaner aggregation patterns for faster analysis.',
            result: 'Improved query performance by 30% and enabled faster threshold analysis for operations teams.',
            tools: 'SQL, Python, BigQuery, Excel',
            liveUrl: 'https://public.tableau.com/views/RegionalSampleWorkbook/Flights?showVizHome=no',
            codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
            proofs: ['30% Faster Queries', 'CTE Refactor', 'Threshold Monitoring']
        },
        'HR Analytics Dashboard': {
            problem: 'HR reporting required manual consolidation, making attrition and workforce insights hard to access.',
            approach: 'Built a Tableau dashboard with role-based filters, attrition views, and reusable metric calculations.',
            result: 'Reduced reporting turnaround from hours to minutes and improved visibility into workforce trends.',
            tools: 'Tableau, Excel, SQL',
            liveUrl: 'https://public.tableau.com/views/RegionalSampleWorkbook/College?showVizHome=no',
            codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
            proofs: ['Hours to Minutes', 'Role-Based Filters', 'Attrition Insights']
        }
    };

    const openModal = () => {
        const scrollbarWidth = Math.max(window.innerWidth - document.documentElement.clientWidth, 0);
        document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
        document.body.classList.add('modal-open');
        modal.classList.add('active');
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('--scrollbar-width');
    };

    if (modal && modalBody && modalClose) {
        document.querySelectorAll('.bento-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.bento-link') || e.target.closest('.bento-action-button')) return;

                const titleElem = card.querySelector('h3');
                const pElem = card.querySelector('p');
                const tagsElem = card.querySelector('.bento-tags');
                const visElem = card.querySelector('.bento-visual');

                if (!titleElem) return; // Only title is strictly required

                const title = titleElem.textContent;
                const text = pElem ? pElem.textContent : '';
                const tags = tagsElem ? tagsElem.innerHTML : '';
                const icon = visElem ? visElem.innerHTML : '';
                const caseStudy = projectCaseStudies[title] || {
                    problem: text || 'Business context and challenge details can be added for this project.',
                    approach: 'Summarize how you designed the solution and key technical choices.',
                    result: 'Quantify impact with one to two metrics or measurable outcomes.',
                    tools: tagsElem ? Array.from(tagsElem.querySelectorAll('.tag')).map(tag => tag.textContent).join(', ') : 'Python, SQL, BI',
                    liveUrl: '#live-dashboard',
                    codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
                    proofs: ['Key Metric', 'Validated Outcome', 'Production-Ready']
                };

                const proofChips = (caseStudy.proofs || [])
                    .map(proof => `<span class="proof-chip">${proof}</span>`)
                    .join('');

                modalBody.innerHTML = `
                    <div class="modal-visual">${icon}</div>
                    <div class="modal-info">
                        <div class="bento-tags" style="margin-bottom:12px;">${tags}</div>
                        <h2>${title}</h2>
                        <p class="modal-desc">${text}</p>
                        <div class="case-proof-chips">${proofChips}</div>
                        <div class="case-study-grid">
                            <div class="case-study-item">
                                <span class="case-label">Problem</span>
                                <p class="modal-details">${caseStudy.problem}</p>
                            </div>
                            <div class="case-study-item">
                                <span class="case-label">Approach</span>
                                <p class="modal-details">${caseStudy.approach}</p>
                            </div>
                            <div class="case-study-item">
                                <span class="case-label">Result</span>
                                <p class="modal-details">${caseStudy.result}</p>
                            </div>
                            <div class="case-study-item">
                                <span class="case-label">Tools</span>
                                <p class="modal-details">${caseStudy.tools}</p>
                            </div>
                        </div>
                        <div class="modal-actions">
                            <a href="${caseStudy.liveUrl}" class="btn btn-primary" target="_blank" rel="noopener noreferrer"><span>Live Dashboard</span></a>
                            <a href="${caseStudy.codeUrl}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Source Code</a>
                        </div>
                    </div>
                `;

                openModal();
            });
            
            // Keyboard accessibility for bento cards
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });

        modalClose.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    // =============================================
    // BACK TO TOP BUTTON
    // =============================================
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        // Note: moved to unified handler

        backToTop.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // =============================================
    // GLOBAL OPTIMIZED SCROLL HANDLER
    // =============================================
    let isScrolling = false;
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                
                // 1. Nav shadow
                if (nav) nav.classList.toggle('scrolled', scrollY > 50);
                
                // 2. Active Section Highlight
                const pos = scrollY + 200;
                for (const section of sectionRanges) {
                    if (pos >= section.top && pos < section.bottom) {
                        const id = section.id;
                        if (id && id !== activeSectionId) {
                            navLinkByTarget.get(`#${activeSectionId}`)?.classList.remove('active');
                            navLinkByTarget.get(`#${id}`)?.classList.add('active');
                            activeSectionId = id;
                        }
                        break;
                    }
                }

                // 3. Scroll Progress Bar
                if (scrollProgress) {
                    const progress = (scrollY / totalScrollableHeight) * 100;
                    scrollProgress.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
                }

                // 3.5 Hide Scroll Indicator at bottom
                if (scrollIndicator) {
                    if (scrollY > totalScrollableHeight - 150) {
                        scrollIndicator.classList.add('hidden');
                    } else {
                        scrollIndicator.classList.remove('hidden');
                    }
                }

                // 4. Timeline Draw-On Progress
                if (timeline && timelineFill) {
                    const viewportAnchor = scrollY + (window.innerHeight * 0.5);
                    const rawProgress = (viewportAnchor - timelineTop) / timelineHeight;
                    const progress = Math.min(Math.max(rawProgress, 0), 1);
                    timelineFill.style.transform = `scaleY(${progress})`;
                }

                // 4.5 Hero scroll parallax
                if (!prefersReducedMotion && heroSection && heroInner && canvasContainer) {
                    if (scrollY <= heroHeightCached * 1.2) {
                        const heroProgress = Math.min(Math.max(scrollY / (heroHeightCached * 0.9), 0), 1);
                        heroInner.style.transform = `translateY(${heroProgress * 55}px)`;
                        heroInner.style.opacity = `${1 - (heroProgress * 0.35)}`;
                        canvasContainer.style.transform = `translateY(${heroProgress * 95}px) scale(${1 - (heroProgress * 0.06)})`;
                    }
                }

                // 5. Back to Top visibility
                if (backToTop) {
                    if (scrollY > 500) backToTop.classList.add('visible');
                    else backToTop.classList.remove('visible');
                }

                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });

})();
