// ============================================
// PORTFOLIO — Glassmorphism + Soft Depth
// Morph blobs, 3D tilt, bidirectional scroll
// ============================================

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const allowsMotion = !prefersReducedMotion.matches;
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isLowPowerDevice = (
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4)
    );

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
    let glowRaf;

    if (cursorGlow && allowsMotion && isFinePointer) {
        window.addEventListener('pointermove', (e) => {
            if (e.pointerType && e.pointerType !== 'mouse') return;

            targetX = e.clientX;
            targetY = e.clientY;
            cursorGlow.style.opacity = '1';

            if (!glowRaf) {
                glowX = targetX;
                glowY = targetY;
                updateGlow();
            }
        }, { passive: true });

        window.addEventListener('pointerleave', () => {
            cursorGlow.style.opacity = '0';
        });

        function updateGlow() {
            const dx = targetX - glowX;
            const dy = targetY - glowY;

            if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                glowRaf = null;
                return;
            }

            glowX += dx * 0.1;
            glowY += dy * 0.1;
            cursorGlow.style.transform = `translate3d(${glowX - 225}px, ${glowY - 225}px, 0)`;
            glowRaf = requestAnimationFrame(updateGlow);
        }
    } else if (cursorGlow) {
        cursorGlow.style.display = 'none';
    }


    // =============================================
    // NAVIGATION
    // =============================================
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    // Note: Scroll listener moved to single consolidated handler at the bottom

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('open');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            const t = document.querySelector(href);
            if (t) window.scrollTo({ top: t.offsetTop - 80, behavior: 'smooth' });
        });
    });


    // =============================================
    // BIDIRECTIONAL SCROLL REVEAL
    // Elements animate in AND out when entering/leaving
    // =============================================
    const revealEls = document.querySelectorAll('[data-reveal]');

    const revealCountsByParent = new WeakMap();
    revealEls.forEach(el => {
        const parent = el.parentElement;
        const revealIndex = revealCountsByParent.get(parent) || 0;
        el.dataset.revealDelay = String(revealIndex * 90);
        revealCountsByParent.set(parent, revealIndex + 1);
    });

    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.style.transitionDelay = entry.isIntersecting
                ? `${entry.target.dataset.revealDelay || 0}ms`
                : '0ms';
            entry.target.classList.toggle('revealed', entry.isIntersecting);
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObs.observe(el));


    // =============================================
    // SECTION TITLE — Word-by-word bouncy reveal
    // =============================================
    document.querySelectorAll('.section-title').forEach(title => {
        const words = title.textContent.split(' ');
        title.innerHTML = words.map((word, i) =>
            `<span class="word-wrap" style="display:inline-block;transition:transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s, opacity 0.6s ease ${i * 0.07}s"><span style="display:inline-block">${word}</span></span>`
        ).join(' ');
    });

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


    // =============================================
    // 3D TILT — Cards with data-tilt (desktop only)
    // =============================================
    if (allowsMotion && isFinePointer) {
        document.querySelectorAll('[data-tilt]').forEach(card => {
            let rect;
            let tiltRaf = null;
            let pointerX = 0;
            let pointerY = 0;

            function renderTilt() {
                tiltRaf = null;
                if (!rect) return;

                const x = (pointerX - rect.left) / rect.width - 0.5;
                const y = (pointerY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-6px) scale(1.02)`;
            }

            card.addEventListener('pointerenter', () => {
                rect = card.getBoundingClientRect();
            });
 
            card.addEventListener('pointermove', (e) => {
                if (!rect) return;
                pointerX = e.clientX;
                pointerY = e.clientY;
                if (!tiltRaf) tiltRaf = requestAnimationFrame(renderTilt);
            }, { passive: true });
 
            card.addEventListener('pointerleave', () => {
                rect = null;
                if (tiltRaf) {
                    cancelAnimationFrame(tiltRaf);
                    tiltRaf = null;
                }
                card.style.transform = '';
            });
        });
    }


    // =============================================
    // THREE.JS DATA CORE
    // =============================================
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer && window.THREE && allowsMotion && window.innerWidth > 900) {
        const maxPixelRatio = isLowPowerDevice ? 1.25 : 1.5;
        const numParticles = isLowPowerDevice ? 260 : 420;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 100);

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: !isLowPowerDevice,
            powerPreference: isLowPowerDevice ? 'default' : 'high-performance'
        });
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
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

        function resizeThreeScene() {
            camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        }
        window.addEventListener('resize', resizeThreeScene, { passive: true });

        const clock = new THREE.Clock();
        let isHeroVisible = true;
        let threeRaf = null;
        let isThreeRunning = false;
        const minThreeFrameInterval = isLowPowerDevice ? (1000 / 48) : 0;
        let lastThreeFrameTime = 0;
        
        const heroSection = document.getElementById('hero');
        const heroObserver = new IntersectionObserver(([e]) => {
            isHeroVisible = e.isIntersecting;
            syncThreeLoop();
        }, { threshold: 0.1 });
        heroObserver.observe(heroSection);

        function animate(now) {
            threeRaf = requestAnimationFrame(animate);
            if (minThreeFrameInterval && now - lastThreeFrameTime < minThreeFrameInterval) return;
            lastThreeFrameTime = now;

            const t = clock.getElapsedTime();
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

        function stopThreeLoop() {
            if (threeRaf) {
                cancelAnimationFrame(threeRaf);
                threeRaf = null;
            }
            if (isThreeRunning) {
                clock.stop();
                isThreeRunning = false;
            }
        }

        function startThreeLoop() {
            if (threeRaf || document.hidden || !isHeroVisible) return;
            if (!isThreeRunning) {
                clock.start();
                isThreeRunning = true;
            }
            lastThreeFrameTime = 0;
            threeRaf = requestAnimationFrame(animate);
        }

        function syncThreeLoop() {
            if (document.hidden || !isHeroVisible) stopThreeLoop();
            else startThreeLoop();
        }

        document.addEventListener('visibilitychange', syncThreeLoop);
        window.addEventListener('pagehide', stopThreeLoop);
        syncThreeLoop();
        
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
    // STAT COUNTER — Bouncy (hero)
    // =============================================
    let statsAnimated = false;
    const statCounters = document.querySelectorAll('.stat-number');

    function animateStats() {
        if (statsAnimated) return;
        statsAnimated = true;
        statCounters.forEach(counter => {
            const target = parseInt(counter.dataset.count);
            const duration = 1200;
            const start = performance.now();

            function easeOutBack(t) {
                const c1 = 1.70158, c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            }

            function tick(now) {
                const p = Math.min((now - start) / duration, 1);
                counter.textContent = Math.round(target * easeOutBack(p));
                if (p < 1) requestAnimationFrame(tick);
                else counter.textContent = target;
            }
            requestAnimationFrame(tick);
        });
    }

    const heroObs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) animateStats();
    }, { threshold: 0.3 });
    heroObs.observe(document.getElementById('hero'));

    // =============================================
    // LIVE METRIC TICKER (Featured Card Hover)
    // =============================================
    document.querySelectorAll('.bento-card').forEach(card => {
        const metricEl = card.querySelector('.metric-value');
        if (!metricEl) return;
        
        let hasTicked = false;
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
                if (p < 1) requestAnimationFrame(tick);
                else metricEl.textContent = target;
            }
            requestAnimationFrame(tick);
            
            setTimeout(() => hasTicked = false, 5000); 
        });
    });

    // =============================================
    // TIMELINE PROGRESS DRAW-ON SCROLL
    // =============================================
    const timeline = document.querySelector('.timeline');
    const timelineFill = document.getElementById('timelineProgress');
    let timelineMetrics = null;

    function buildTimelineMetrics() {
        if (!timeline) {
            timelineMetrics = null;
            return;
        }

        timelineMetrics = {
            top: timeline.offsetTop,
            height: timeline.offsetHeight
        };
    }
    buildTimelineMetrics();

    // =============================================
    // MAGNETIC — Contact card icons
    // =============================================
    if (allowsMotion && isFinePointer) {
        document.querySelectorAll('.contact-card').forEach(card => {
            let rect;
            let magneticRaf = null;
            let pointerX = 0;
            let pointerY = 0;
            const svg = card.querySelector('svg');

            function renderMagnetic() {
                magneticRaf = null;
                if (!rect || !svg) return;

                const x = pointerX - rect.left - rect.width / 2;
                const y = pointerY - rect.top - rect.height / 2;
                svg.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px) scale(1.12)`;
            }

            card.addEventListener('pointerenter', () => {
                rect = card.getBoundingClientRect();
            });
            
            card.addEventListener('pointermove', (e) => {
                if (!rect || !svg) return;
                pointerX = e.clientX;
                pointerY = e.clientY;
                if (!magneticRaf) magneticRaf = requestAnimationFrame(renderMagnetic);
            }, { passive: true });

            card.addEventListener('pointerleave', () => {
                rect = null;
                if (magneticRaf) {
                    cancelAnimationFrame(magneticRaf);
                    magneticRaf = null;
                }
                if (svg) svg.style.transform = '';
            });
        });
    }


    // =============================================
    // ICON FLOAT — About cards
    // =============================================
    if (allowsMotion) {
        document.querySelectorAll('.about-card-icon').forEach((icon, i) => {
            icon.style.animation = `iconFloat 3.5s ease-in-out ${i * 0.4}s infinite`;
        });
    }

    const floatStyle = document.createElement('style');
    floatStyle.textContent = `@keyframes iconFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`;
    document.head.appendChild(floatStyle);


    // =============================================
    // ACTIVE NAV HIGHLIGHT
    // =============================================
    const sections = document.querySelectorAll('section[id]');
    const navLinkEls = document.querySelectorAll('.nav-link');

    // Pre-cache section positions to avoid layout reads in scroll handler
    let sectionCache = [];
    let sectionCacheFrame = null;
    function buildSectionCache() {
        sectionCache = Array.from(sections).map(section => ({
            id: section.getAttribute('id'),
            top: section.offsetTop,
            bottom: section.offsetTop + section.offsetHeight
        }));
    }
    function scheduleSectionCacheBuild() {
        if (sectionCacheFrame) return;
        sectionCacheFrame = requestAnimationFrame(() => {
            sectionCacheFrame = null;
            buildSectionCache();
            buildTimelineMetrics();
        });
    }
    buildSectionCache();
    // Rebuild when layout can legitimately shift after first paint.
    window.addEventListener('resize', scheduleSectionCacheBuild, { passive: true });
    window.addEventListener('load', scheduleSectionCacheBuild);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleSectionCacheBuild).catch(() => {});
    }
    if (window.ResizeObserver) {
        const sectionResizeObserver = new ResizeObserver(() => {
            scheduleSectionCacheBuild();
        });
        sections.forEach(section => sectionResizeObserver.observe(section));
    }

    // =============================================
    // SCROLL PROGRESS
    // =============================================
    const scrollProgress = document.getElementById('scrollProgress');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollProgress) {
        // Note: moved to unified handler
    }

    // =============================================
    // PROJECT MODALS
    // =============================================
    const modal = document.getElementById('projectModal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');

    if (modal && modalBody && modalClose) {
        document.querySelectorAll('.bento-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.bento-link')) return;

                const titleElem = card.querySelector('h3');
                const pElem = card.querySelector('p');
                const tagsElem = card.querySelector('.bento-tags');
                const visElem = card.querySelector('.bento-visual');

                if (!titleElem) return; // Only title is strictly required

                const title = titleElem.textContent;
                const text = pElem ? pElem.textContent : '';
                const tags = tagsElem ? tagsElem.innerHTML : '';
                const icon = visElem ? visElem.innerHTML : '';

                modalBody.innerHTML = `
                    <div class="modal-visual">${icon}</div>
                    <div class="modal-info">
                        <div class="bento-tags" style="margin-bottom:12px;">${tags}</div>
                        <h2>${title}</h2>
                        <p class="modal-desc">${text}</p>
                        <p class="modal-details">This project focused on establishing rigorous data pipelines, deploying advanced predictive models, and creating highly intuitive dashboards for stakeholders. By combining <strong>${title}</strong> techniques, we achieved significant improvements in processing time and reporting accuracy.</p>
                        <div class="modal-actions">
                            <a href="#" class="btn btn-primary" target="_blank" rel="noopener noreferrer"><span>Live Dashboard</span></a>
                            <a href="#" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Source Code</a>
                        </div>
                    </div>
                `;

                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
            
            // Keyboard accessibility for bento cards
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });

        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
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
    // FAST TYPEWRITER EFFECT
    // =============================================
    const twElements = document.querySelectorAll('.typewriter-fx');
    twElements.forEach(el => {
        const text = el.getAttribute('data-text');
        if (!text) return;
        if (!allowsMotion) {
            el.textContent = text;
            return;
        }

        el.textContent = '';
        
        setTimeout(() => {
            const start = performance.now();
            const charDuration = 45;

            function typeFrame(now) {
                const nextLength = Math.min(text.length, Math.floor((now - start) / charDuration));
                if (el.textContent.length !== nextLength) {
                    el.textContent = text.slice(0, nextLength);
                    scheduleSectionCacheBuild();
                }

                if (nextLength < text.length) requestAnimationFrame(typeFrame);
            }

            requestAnimationFrame(typeFrame);
        }, 600); // Start typing shortly after fade-in
    });

    // =============================================
    // GLOBAL OPTIMIZED SCROLL HANDLER
    // =============================================
    let scrollFrame = null;
    function applyScrollState() {
        scrollFrame = null;
        const scrollY = window.scrollY;
        
        nav.classList.toggle('scrolled', scrollY > 50);
        
        const pos = scrollY + 200;
        let activeId = null;
        for (let i = 0; i < sectionCache.length; i++) {
            if (pos >= sectionCache[i].top && pos < sectionCache[i].bottom) {
                activeId = sectionCache[i].id;
                break;
            }
        }
        if (activeId) {
            navLinkEls.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
            });
        }

        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgressValue = totalHeight > 0 ? (scrollY / totalHeight) : 0;
        if (scrollProgress) {
            scrollProgress.style.transform = `scaleX(${Math.min(Math.max(scrollProgressValue, 0), 1)})`;
        }

        if (scrollIndicator) {
            scrollIndicator.classList.toggle('hidden', scrollY > totalHeight - 150);
        }

        if (timelineFill && timelineMetrics) {
            const startDist = (timelineMetrics.top - scrollY) - (window.innerHeight * 0.5);
            const endDist = timelineMetrics.height || 1;
            const progress = startDist < 0
                ? Math.min(Math.max(Math.abs(startDist) / endDist, 0), 1)
                : 0;
            timelineFill.style.transform = `scaleY(${progress})`;
        }

        if (backToTop) {
            backToTop.classList.toggle('visible', scrollY > 500);
        }
    }

    window.addEventListener('scroll', () => {
        if (!scrollFrame) scrollFrame = window.requestAnimationFrame(applyScrollState);
    }, { passive: true });
    window.addEventListener('resize', () => {
        if (!scrollFrame) scrollFrame = window.requestAnimationFrame(applyScrollState);
    }, { passive: true });
    applyScrollState();

    let isScrolling = true;
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                
                // 1. Nav shadow
                nav.classList.toggle('scrolled', scrollY > 50);
                
                // 2. Active Section Highlight (uses pre-cached values — no layout reads)
                const pos = scrollY + 200;
                let activeId = null;
                for (let i = 0; i < sectionCache.length; i++) {
                    if (pos >= sectionCache[i].top && pos < sectionCache[i].bottom) {
                        activeId = sectionCache[i].id;
                        break;
                    }
                }
                if (activeId) {
                    navLinkEls.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
                    });
                }

                // 3. Scroll Progress Bar
                const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (scrollProgress) {
                    scrollProgress.style.width = (scrollY / totalHeight) * 100 + '%';
                }

                // 3.5 Hide Scroll Indicator at bottom
                if (scrollIndicator) {
                    if (scrollY > totalHeight - 150) {
                        scrollIndicator.classList.add('hidden');
                    } else {
                        scrollIndicator.classList.remove('hidden');
                    }
                }

                // 4. Timeline Draw-On Progress
                if (timeline && timelineFill) {
                    const rect = timeline.getBoundingClientRect();
                    const startDist = rect.top - (window.innerHeight * 0.5);
                    const endDist = rect.height;
                    
                    if (startDist < 0) {
                        let progress = Math.abs(startDist) / endDist;
                        progress = Math.min(Math.max(progress, 0), 1);
                        timelineFill.style.height = `${progress * 100}%`;
                    } else {
                        timelineFill.style.height = '0%';
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
