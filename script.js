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
    let glowVisible = false;

    if (cursorGlow && finePointer && !prefersReducedMotion) {
        document.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            if (!glowVisible) {
                cursorGlow.style.opacity = '1';
                glowVisible = true;
            }
            
            // Start loop if not running
            if (!glowRaf) {
                lastGlowFrameTime = performance.now();
                glowRaf = requestAnimationFrame(updateGlow);
            }
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            if (!glowVisible) return;
            cursorGlow.style.opacity = '0';
            glowVisible = false;
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
            cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;
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

                // Filtering changes document flow; refresh cached scroll math.
                refreshLayoutMetrics();
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
        'Payment Fraud Detection': {
            problem: 'Payment authorization performance dropped sharply during specific windows, increasing failed transactions and fraud exposure.',
            approach: 'Built SQL and Python analytics with fraud pattern detection and retry-window diagnostics, then presented findings in a Power BI decision dashboard.',
            result: 'Recovered up to 15% failed transactions, detected 2.4K+ fraud events with AUC 0.96, and surfaced controls for rapid-repeat fraud patterns.',
            tools: 'SQL, Python, Power BI, Predictive Modeling',
            liveUrl: 'https://public.tableau.com/views/RegionalSampleWorkbook/College?showVizHome=no',
            codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
            proofs: ['2.4K+ Fraud Events', 'AUC 0.96', '15% Recovery Potential']
        },
        'Clinical Workflow Analytics': {
            problem: 'Clinical teams lacked visibility into where patients were dropping off in the diagnosis pathway.',
            approach: 'Modeled the journey across 4,969 records and built an end-to-end SQL/Python analytics workflow with stage-level bottleneck analysis.',
            result: 'Identified two 44% drop-off stages and projected a 19% diagnosis-rate improvement through targeted intervention design.',
            tools: 'SQL, Python, Workflow Analytics',
            liveUrl: 'https://public.tableau.com/views/RegionalSampleWorkbook/Stocks?showVizHome=no',
            codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
            proofs: ['4,969 Patient Records', '19% Projected Lift', '3x Faster Delay Trend']
        },
        'Supply Chain SLA Analytics': {
            problem: 'SLA breach handling treated all delayed orders equally, exposing high-margin orders to preventable risk.',
            approach: 'Built a value-aware supply chain pipeline across GCP, dbt, SQL, and Python to prioritize fulfillment decisions by margin and reliability impact.',
            result: 'Flagged $2.77M in high-profit orders at SLA risk and isolated the top 5 lanes causing 40.67% of breaches for targeted controls.',
            tools: 'GCP BigQuery, dbt, SQL, Python',
            liveUrl: 'https://public.tableau.com/views/RegionalSampleWorkbook/Flights?showVizHome=no',
            codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
            proofs: ['$2.77M At-Risk Profit', '40.67% Breach Concentration', '180K+ Orders']
        },
        'Content Investment Analysis': {
            problem: 'Content investment teams needed a portfolio-level view of audience value, downside risk, and franchise decay to improve allocation decisions.',
            approach: 'Built a Python analytics workflow over 4,562 films (2000-2024) to evaluate audience value, capital efficiency, language-era shifts, and risk across low-budget, mid-budget, big-budget, and highest-budget tiers.',
            result: 'Found that 70% of sequels underperformed prior installments, highest-budget films had the lowest loss rate (8.9%), and top-tier directors delivered 9.7x higher median audience value than low-tier peers.',
            tools: 'Python, Pandas, Portfolio Analytics, Power BI (in progress)',
            liveUrl: '#live-dashboard',
            codeUrl: 'https://github.com/Udaylakkaraju?tab=repositories',
            proofs: ['4,562 Films (2000-2024)', '70% Sequel Underperformance', '8.9% Loss Rate (Highest-budget)']
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
    let navIsScrolled = false;
    let indicatorHidden = false;
    let backToTopVisible = false;
    let lastProgressWidth = -1;
    let lastTimelineProgress = -1;
    let lastHeroTransform = '';
    let lastHeroOpacity = '';
    const heroParallaxEnabled = !prefersReducedMotion && heroSection && heroInner;
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                
                // 1. Nav shadow
                if (nav) {
                    const shouldScrollNav = scrollY > 50;
                    if (shouldScrollNav !== navIsScrolled) {
                        nav.classList.toggle('scrolled', shouldScrollNav);
                        navIsScrolled = shouldScrollNav;
                    }
                }
                
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
                    const progress = Math.min(Math.max((scrollY / totalScrollableHeight) * 100, 0), 100);
                    if (Math.abs(progress - lastProgressWidth) > 0.2) {
                        scrollProgress.style.width = `${progress}%`;
                        lastProgressWidth = progress;
                    }
                }

                // 3.5 Hide Scroll Indicator at bottom
                if (scrollIndicator) {
                    const shouldHideIndicator = scrollY > totalScrollableHeight - 150;
                    if (shouldHideIndicator !== indicatorHidden) {
                        scrollIndicator.classList.toggle('hidden', shouldHideIndicator);
                        indicatorHidden = shouldHideIndicator;
                    }
                }

                // 4. Timeline Draw-On Progress
                if (timeline && timelineFill) {
                    const viewportAnchor = scrollY + (window.innerHeight * 0.5);
                    const rawProgress = (viewportAnchor - timelineTop) / timelineHeight;
                    const progress = Math.min(Math.max(rawProgress, 0), 1);
                    if (Math.abs(progress - lastTimelineProgress) > 0.003) {
                        timelineFill.style.transform = `scaleY(${progress})`;
                        lastTimelineProgress = progress;
                    }
                }

                // 4.5 Hero scroll parallax
                if (heroParallaxEnabled) {
                    if (scrollY <= heroHeightCached * 1.2) {
                        const heroProgress = Math.min(Math.max(scrollY / (heroHeightCached * 0.9), 0), 1);
                        const nextTransform = `translateY(${heroProgress * 55}px)`;
                        const nextOpacity = `${1 - (heroProgress * 0.35)}`;
                        if (nextTransform !== lastHeroTransform) {
                            heroInner.style.transform = nextTransform;
                            lastHeroTransform = nextTransform;
                        }
                        if (nextOpacity !== lastHeroOpacity) {
                            heroInner.style.opacity = nextOpacity;
                            lastHeroOpacity = nextOpacity;
                        }
                    } else if (lastHeroTransform || lastHeroOpacity) {
                        heroInner.style.transform = '';
                        heroInner.style.opacity = '';
                        lastHeroTransform = '';
                        lastHeroOpacity = '';
                    }
                }

                // 5. Back to Top visibility
                if (backToTop) {
                    const shouldShowBackToTop = scrollY > 500;
                    if (shouldShowBackToTop !== backToTopVisible) {
                        backToTop.classList.toggle('visible', shouldShowBackToTop);
                        backToTopVisible = shouldShowBackToTop;
                    }
                }

                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });

})();
