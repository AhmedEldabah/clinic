/* Ivory Dental Studio: core behaviour (language, motion, booking).
   Concept project by Ahmed Eldabah. */
(function () {
    'use strict';

    var root = document.documentElement;
    var DICT = window.IVORY_I18N || { ar: {}, en: {} };
    var LANG_KEY = 'ivory-lang';
    var WA_NUMBER = '97140000000'; // +971 4 000 0000 (fictional)
    var MAP_BASE = 'https://www.google.com/maps?q=Jumeirah+Beach+Road,+Jumeirah+1,+Dubai,+UAE&z=14&output=embed&hl=';
    var DEFAULT_BRAND = 'Ivory';
    // Phones hand wa.me links to the WhatsApp app; a new tab there is left stuck on about:blank
    var IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var finePointer = window.matchMedia('(pointer: fine)').matches;

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function motion() { return root.getAttribute('data-motion') || 'full'; }
    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

    if (IS_MOBILE) $$('.wa-link, #successWa').forEach(function (a) { a.removeAttribute('target'); });

    /* ------------------------------------------------------------------
       1. Text: translations, brand name, Studio text edits
       ------------------------------------------------------------------ */
    var lang = 'en';
    var brand = DEFAULT_BRAND;
    var edits = { en: {}, ar: {} };
    var editing = false;
    var EN = DICT.en;
    var AR = DICT.ar;
    var textEls = $$('[data-i18n]');
    var attrEls = $$('[data-i18n-attr]');
    function attrPairs(el) { return el.getAttribute('data-i18n-attr').split(';').map(function (p) { return p.split(':'); }); }
    textEls.forEach(function (el) { var k = el.getAttribute('data-i18n'); if (EN[k] === undefined) EN[k] = el.innerHTML; });
    attrEls.forEach(function (el) { attrPairs(el).forEach(function (p) { if (EN[p[1]] === undefined) EN[p[1]] = el.getAttribute(p[0]) || ''; }); });
    EN['meta.title'] = document.title;

    function withBrand(str) {
        if (brand === DEFAULT_BRAND || typeof str !== 'string') return str;
        return str.replace(/IVORY/g, brand.toUpperCase()).replace(/Ivory/g, brand).replace(/آيفوري/g, brand);
    }
    function t(key) {
        var dict = lang === 'ar' ? AR : EN;
        var v = dict[key] !== undefined ? dict[key] : (EN[key] !== undefined ? EN[key] : key);
        return withBrand(v);
    }
    function textFor(key) { // page copy, including Studio edits
        var e = edits[lang] && edits[lang][key];
        return e !== undefined ? e : t(key);
    }

    // Only allow harmless inline markup in edited text (edits can arrive via share links)
    var SAFE_TAGS = { EM: 1, STRONG: 1, BR: 1, B: 1, I: 1, SPAN: 1 };
    function sanitize(html) {
        var tpl = document.createElement('template');
        tpl.innerHTML = String(html);
        (function clean(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
                if (ch.nodeType === 1) {
                    if (!SAFE_TAGS[ch.tagName]) { ch.replaceWith(document.createTextNode(ch.textContent)); return; }
                    var keepLtr = ch.tagName === 'SPAN' && ch.classList.contains('ltr');
                    Array.prototype.slice.call(ch.attributes).forEach(function (a) { ch.removeAttribute(a.name); });
                    if (keepLtr) ch.className = 'ltr';
                    clean(ch);
                } else if (ch.nodeType !== 3) {
                    ch.remove();
                }
            });
        })(tpl.content);
        return tpl.innerHTML;
    }

    /* Split headings into masked words for the rise-in reveal */
    function splitWords(el) {
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        var i = 0;
        nodes.forEach(function (node) {
            var parts = node.nodeValue.split(/(\s+)/);
            var frag = document.createDocumentFragment();
            parts.forEach(function (part) {
                if (!part) return;
                if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
                var w = document.createElement('span');
                w.className = 'w';
                var inner = document.createElement('span');
                inner.textContent = part;
                inner.style.setProperty('--i', i++);
                w.appendChild(inner);
                frag.appendChild(w);
            });
            node.parentNode.replaceChild(frag, node);
        });
    }

    function renderText(el) {
        var key = el.getAttribute('data-i18n');
        var html = textFor(key);
        if (el.tagName === 'textPath' || el.tagName === 'OPTION') { el.textContent = html.replace(/<[^>]+>/g, ''); return; }
        el.innerHTML = html;
        if (el.hasAttribute('data-split') && !editing) splitWords(el);
    }

    var langToggle = $('#langToggle');
    var mapFrame = $('#mapFrame');

    function applyLang(next, save) {
        lang = next === 'ar' ? 'ar' : 'en';
        root.lang = lang;
        root.dir = lang === 'ar' ? 'rtl' : 'ltr';
        textEls.forEach(renderText);
        attrEls.forEach(function (el) { attrPairs(el).forEach(function (p) { el.setAttribute(p[0], t(p[1])); }); });
        $$('.brand-name').forEach(function (el) { el.textContent = brand; });
        document.title = t('meta.title');
        langToggle.setAttribute('aria-label', t('lang.switch'));
        langToggle.querySelectorAll('[data-lang]').forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-lang') === lang); });
        var mapSrc = MAP_BASE + lang;
        if (mapFrame.getAttribute('src') !== mapSrc) mapFrame.setAttribute('src', mapSrc);
        $$('.wa-link').forEach(function (a) { a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(t('wa.hello')); });
        updateStatus();
        if (attempted) showErrors(currentErrors);
        if (lastBooking) renderSuccess(lastBooking);
        if (editing) setEditing(true);
        if (save) { try { localStorage.setItem(LANG_KEY, lang); } catch (e) {} }
        document.dispatchEvent(new CustomEvent('ivory:lang', { detail: lang }));
    }

    langToggle.addEventListener('click', function () {
        var next = lang === 'ar' ? 'en' : 'ar';
        if (motion() === 'off') { applyLang(next, true); return; }
        document.body.classList.add('lang-swap');
        document.body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).onfinish = function () {
            applyLang(next, true);
            $$('[data-split]').forEach(function (el) { if (el.classList.contains('in')) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); } });
            ribbon.reset();
            document.body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
        };
    });

    function setBrand(name) {
        var clean = String(name || '').replace(/[<>]/g, '').trim().slice(0, 24);
        brand = clean || DEFAULT_BRAND;
        applyLang(lang, false);
        ribbon.reset();
    }

    /* Edit-text mode (driven by the Studio panel) */
    var EDIT_SKIP = 'option, textPath, #studio *, .curtain *, .ba-tag, .ribbon *, .chip-price';
    function setEditing(on) {
        editing = !!on;
        root.classList.toggle('editing', editing);
        textEls.forEach(function (el) {
            if (el.matches(EDIT_SKIP)) return;
            if (editing) {
                if (el.hasAttribute('data-split')) el.innerHTML = textFor(el.getAttribute('data-i18n'));
                el.setAttribute('contenteditable', 'true');
                el.setAttribute('spellcheck', 'false');
            } else if (el.hasAttribute('contenteditable')) {
                el.removeAttribute('contenteditable');
                el.removeAttribute('spellcheck');
                if (el.hasAttribute('data-split')) { renderText(el); el.classList.add('in'); }
            }
        });
    }
    document.addEventListener('input', function (e) {
        var el = e.target.closest && e.target.closest('[data-i18n][contenteditable="true"]');
        if (!el) return;
        var key = el.getAttribute('data-i18n');
        edits[lang][key] = sanitize(el.innerHTML);
        textEls.forEach(function (other) { if (other !== el && other.getAttribute('data-i18n') === key) other.innerHTML = edits[lang][key]; });
        document.dispatchEvent(new CustomEvent('ivory:edit'));
    });
    document.addEventListener('click', function (e) { // don't follow links while editing their text
        if (editing && e.target.closest('[contenteditable="true"]')) e.preventDefault();
    }, true);
    document.addEventListener('paste', function (e) {
        if (!e.target.closest || !e.target.closest('[contenteditable="true"]')) return;
        e.preventDefault();
        document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });
    function setEdits(next) {
        edits = { en: {}, ar: {} };
        ['en', 'ar'].forEach(function (l) {
            var src = next && next[l];
            if (!src || typeof src !== 'object') return;
            Object.keys(src).forEach(function (k) { if (typeof src[k] === 'string' && (EN[k] !== undefined)) edits[l][k] = sanitize(src[k]); });
        });
        applyLang(lang, false);
    }

    /* ------------------------------------------------------------------
       2. Live "open now" status in Dubai time
       ------------------------------------------------------------------ */
    function dubaiNow() {
        var parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit',
            weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        }).formatToParts(new Date());
        var get = function (type) { return parts.filter(function (p) { return p.type === type; })[0].value; };
        var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        return { iso: get('year') + '-' + get('month') + '-' + get('day'), dow: days[get('weekday')], mins: (+get('hour') % 24) * 60 + (+get('minute')) };
    }
    function hoursFor(dow) { return dow === 0 ? [10, 18] : [9, 21]; } // Mon-Sat 9-9, Sun 10-6
    function fmtHour(h) {
        var h12 = h % 12 || 12;
        return lang === 'ar' ? h12 + ' ' + (h < 12 ? 'ص' : 'م') : h12 + ' ' + (h < 12 ? 'AM' : 'PM');
    }
    function localeFor() { return lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB'; }
    var statusWrap = $('#openStatus');
    var statusText = $('#statusText');
    function updateStatus() {
        var now = dubaiNow();
        var h = hoursFor(now.dow);
        var key, time, open = false;
        if (now.mins >= h[0] * 60 && now.mins < h[1] * 60) { key = 'status.open'; time = fmtHour(h[1]); open = true; }
        else if (now.mins < h[0] * 60) { key = 'status.opensToday'; time = fmtHour(h[0]); }
        else { key = 'status.opensTomorrow'; time = fmtHour(hoursFor((now.dow + 1) % 7)[0]); }
        statusText.textContent = t(key).replace('{t}', time);
        statusWrap.classList.toggle('is-open', open);
        $('#todayDate').textContent = new Intl.DateTimeFormat(localeFor(), { timeZone: 'Asia/Dubai', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
        $('#todayHours').textContent = t('status.today').replace('{h}', fmtHour(h[0]) + ' - ' + fmtHour(h[1]));
    }
    setInterval(updateStatus, 60000);

    /* ------------------------------------------------------------------
       3. Navigation
       ------------------------------------------------------------------ */
    var nav = $('#navbar');
    var navLinks = $('#navLinks');
    var hamburger = $('#hamburger');
    function setMenu(open) {
        navLinks.classList.toggle('active', open);
        hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('menu-open', open);
        if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    }
    hamburger.addEventListener('click', function () { setMenu(!navLinks.classList.contains('active')); });
    $$('a', navLinks).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && navLinks.classList.contains('active')) { setMenu(false); hamburger.focus(); } });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

    // Highlight the nav link of the section in view
    var linkFor = {};
    $$('.nav-link').forEach(function (a) { linkFor[a.getAttribute('href').slice(1)] = a; });
    if ('IntersectionObserver' in window) {
        var navIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                var a = linkFor[en.target.id];
                if (a && en.isIntersecting) { $$('.nav-link.active').forEach(function (x) { x.classList.remove('active'); }); a.classList.add('active'); }
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        Object.keys(linkFor).forEach(function (id) { var s = document.getElementById(id); if (s) navIO.observe(s); });
    }

    /* ------------------------------------------------------------------
       4. Smooth scroll (Lenis, if loaded) + one rAF loop for scroll effects
       ------------------------------------------------------------------ */
    var lenis = null;
    function setupLenis() {
        var want = motion() === 'full' && typeof window.Lenis === 'function' && !IS_MOBILE;
        if (want && !lenis) {
            lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
        } else if (!want && lenis) {
            lenis.destroy();
            lenis = null;
        }
    }
    // Anchor links go through Lenis so they glide instead of jumping
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a || editing) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: id === '#home' ? 0 : -70, duration: 1.4 });
        else target.scrollIntoView({ behavior: motion() === 'off' ? 'auto' : 'smooth' });
        history.replaceState(null, '', id);
    });

    var progressBar = $('#progressBar');
    var parallaxEls = $$('[data-parallax]');
    var steps = $$('.step');
    var stepsList = $('#steps');
    var expSection = $('#experience');
    var expPhoto = $('.exp-photo img');
    var footerMark = $('.footer-mark');
    var lastY = -1, lastDir = 0, velocity = 0;

    function onFrame(time) {
        if (lenis) lenis.raf(time);
        var y = window.scrollY;
        var vh = window.innerHeight;
        var dy = y - (lastY < 0 ? y : lastY);
        velocity = velocity * 0.85 + dy * 0.15;
        ribbon.tick(velocity);
        if (y !== lastY) {
            var max = document.documentElement.scrollHeight - vh;
            progressBar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
            nav.classList.toggle('scrolled', y > 40);
            if (Math.abs(dy) > 4) lastDir = dy > 0 ? 1 : -1;
            nav.classList.toggle('is-hidden', lastDir > 0 && y > vh * 0.6 && !document.body.classList.contains('menu-open'));

            var full = motion() === 'full';
            if (y < vh * 1.2) parallaxEls.forEach(function (el) {
                el.style.transform = full ? 'translate3d(0,' + (y * parseFloat(el.getAttribute('data-parallax'))).toFixed(1) + 'px,0)' : '';
            });

            if (expSection) {
                var r = expSection.getBoundingClientRect();
                if (r.top < vh && r.bottom > 0) {
                    var p = clamp((vh - r.top) / (r.height + vh), 0, 1);
                    if (expPhoto && full) expPhoto.style.setProperty('--zoom', (1.16 - p * 0.16).toFixed(4));
                    if (stepsList) {
                        var sr = stepsList.getBoundingClientRect();
                        stepsList.style.setProperty('--steps-p', clamp((vh * 0.55 - sr.top) / sr.height, 0, 1).toFixed(4));
                        var active = 0;
                        steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < vh * 0.58) active = i; });
                        steps.forEach(function (s, i) { s.classList.toggle('is-active', i === active); });
                    }
                }
            }
            if (footerMark) {
                var fr = footerMark.getBoundingClientRect();
                if (fr.top < vh) footerMark.style.setProperty('--sheen', (clamp(1 - fr.top / vh, 0, 1) * 100).toFixed(1) + '%');
            }
            lastY = y;
        }
        requestAnimationFrame(onFrame);
    }

    /* The single marquee: drifts on its own, speeds up with scroll velocity */
    var ribbon = (function () {
        var track = $('#ribbonTrack');
        var x = 0, groupW = 0;
        function build() {
            $$('.ribbon-group[aria-hidden]', track).forEach(function (g) { g.remove(); });
            var first = $('.ribbon-group', track);
            groupW = first.getBoundingClientRect().width;
            var copies = Math.max(1, Math.ceil(window.innerWidth / Math.max(groupW, 1)) + 1);
            for (var i = 0; i < copies; i++) {
                var c = first.cloneNode(true);
                c.setAttribute('aria-hidden', 'true');
                $$('[data-i18n]', c).forEach(function (n) { n.removeAttribute('data-i18n'); });
                track.appendChild(c);
            }
        }
        return {
            reset: function () { x = 0; build(); },
            tick: function (v) {
                var m = motion();
                if (m === 'off' || !groupW) { track.style.transform = ''; return; }
                var speed = 0.45 + (m === 'full' ? Math.min(Math.abs(v) * 0.35, 14) : 0);
                x -= speed;
                if (-x >= groupW) x += groupW;
                var dirX = root.dir === 'rtl' ? -x : x;
                track.style.transform = 'translate3d(' + dirX.toFixed(2) + 'px,0,0)';
            }
        };
    })();

    /* ------------------------------------------------------------------
       5. Reveals, counters, micro-interactions
       ------------------------------------------------------------------ */
    function countUp(el) {
        var end = parseFloat(el.getAttribute('data-count'));
        var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
        var fmt = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
        if (motion() === 'off') { el.textContent = fmt(end); return; }
        var start = performance.now(), dur = 1800;
        (function step(now) {
            var p = Math.min(1, (now - start) / dur);
            el.textContent = fmt(end * (1 - Math.pow(1 - p, 4)));
            if (p < 1) requestAnimationFrame(step);
        })(start);
    }

    function revealNow(el) {
        el.classList.add('in');
        $$('[data-count]', el).forEach(countUp);
    }
    var revealTargets = $$('[data-reveal], [data-split]').filter(function (el) { return !el.closest('.hero'); });
    if ('IntersectionObserver' in window) {
        // A fully clip-path'd element counts as invisible to IntersectionObserver,
        // so mask reveals are triggered by watching their parent instead.
        var watchers = new Map();
        revealTargets.forEach(function (el) {
            var w = el.getAttribute('data-reveal') === 'mask' ? el.parentElement : el;
            if (!watchers.has(w)) watchers.set(w, []);
            watchers.get(w).push(el);
        });
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                watchers.get(en.target).forEach(revealNow);
                io.unobserve(en.target);
            });
        }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
        watchers.forEach(function (_, w) { io.observe(w); });
    } else {
        revealTargets.forEach(revealNow);
    }
    // Hero plays once the curtain lifts
    setTimeout(function () {
        $$('.hero [data-reveal], .hero [data-split]').forEach(revealNow);
    }, motion() === 'off' ? 0 : 620);

    // Magnetic buttons
    if (finePointer) $$('.magnetic').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
            if (motion() !== 'full') return;
            var r = el.getBoundingClientRect();
            var mx = (e.clientX - r.left - r.width / 2) * 0.28;
            var my = (e.clientY - r.top - r.height / 2) * 0.35;
            el.style.transform = 'translate(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px)';
        });
        el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    // Spotlight that follows the pointer
    $$('.spotlight').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
            var r = el.getBoundingClientRect();
            el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
    });

    // Implant tilt follows the pointer
    var stage = $('#implantStage');
    var hero = $('#home');
    if (finePointer) {
        var tiltRaf = 0;
        hero.addEventListener('pointermove', function (e) {
            if (tiltRaf || motion() !== 'full') return;
            tiltRaf = requestAnimationFrame(function () {
                tiltRaf = 0;
                var r = hero.getBoundingClientRect();
                stage.style.setProperty('--tilt-y', (((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2) + 'deg');
                stage.style.setProperty('--tilt-x', (-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(2) + 'deg');
            });
        });
        hero.addEventListener('pointerleave', function () { stage.style.setProperty('--tilt-y', '0deg'); stage.style.setProperty('--tilt-x', '0deg'); });
    }

    // Treatment accordion (one open at a time)
    $$('.t-item').forEach(function (item) {
        var head = $('.t-head', item);
        head.addEventListener('click', function () {
            var open = !item.classList.contains('is-open');
            $$('.t-item.is-open').forEach(function (o) { o.classList.remove('is-open'); $('.t-head', o).setAttribute('aria-expanded', 'false'); });
            item.classList.toggle('is-open', open);
            head.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    });

    // Experience photo fallback
    if (expPhoto) {
        var markFailed = function () { expPhoto.closest('.exp-photo').classList.add('is-failed'); };
        if (expPhoto.complete && expPhoto.naturalWidth === 0 && expPhoto.currentSrc) markFailed();
        expPhoto.addEventListener('error', markFailed);
    }

    // Before / after sliders
    $$('.ba').forEach(function (ba) {
        var range = $('.ba-range', ba);
        var dragging = false;
        function set(v) { range.value = v; ba.style.setProperty('--pos', range.value + '%'); }
        function fromPointer(e) { var r = ba.getBoundingClientRect(); set(clamp((e.clientX - r.left) / r.width * 100, 0, 100)); }
        range.addEventListener('input', function () { set(range.value); });
        ba.addEventListener('pointerdown', function (e) { dragging = true; ba.setPointerCapture(e.pointerId); fromPointer(e); });
        ba.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
        ba.addEventListener('pointerup', function () { dragging = false; });
        ba.addEventListener('pointercancel', function () { dragging = false; });
        set(50);
        $$('img', ba).forEach(function (img) {
            function fail() { ba.classList.add('is-failed'); }
            if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
            img.addEventListener('error', fail);
        });
    });

    /* ------------------------------------------------------------------
       6. Booking form → validated WhatsApp message
       ------------------------------------------------------------------ */
    var form = $('#bookingForm');
    var success = $('#bookingSuccess');
    var fields = { name: form.elements.name, phone: form.elements.phone, treatment: form.elements.treatment, date: form.elements.date, note: form.elements.note };
    var timeGroup = $('.segmented', form);
    var FIELD_ORDER = ['name', 'phone', 'treatment', 'date', 'time'];
    var attempted = false;
    var currentErrors = {};
    var lastBooking = null;

    function addMonths(iso, n) {
        var p = iso.split('-').map(Number);
        return new Date(Date.UTC(p[0], p[1] - 1 + n, p[2])).toISOString().slice(0, 10);
    }
    function setDateBounds() { fields.date.min = dubaiNow().iso; fields.date.max = addMonths(fields.date.min, 6); }
    setDateBounds();

    function toLatinDigits(s) {
        return s.replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 0x0660; })
                .replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 0x06F0; });
    }
    // Accepts 050 123 4567, 50 123 4567, +971 50 123 4567, 00971..., 04 000 0000 -> "+971 50 123 4567"
    function normalizePhone(raw) {
        var s = toLatinDigits(raw).replace(/[\s\-().]/g, '');
        if (!/^\+?\d+$/.test(s)) return null;
        s = s.replace(/^\+/, '');
        if (s.indexOf('00971') === 0) s = s.slice(5);
        else if (s.indexOf('971') === 0 && s.length >= 11) s = s.slice(3);
        if (s.charAt(0) === '0') s = s.slice(1);
        if (/^5[024568]\d{7}$/.test(s)) return '+971 ' + s.slice(0, 2) + ' ' + s.slice(2, 5) + ' ' + s.slice(5);
        if (/^[234679]\d{7}$/.test(s)) return '+971 ' + s.charAt(0) + ' ' + s.slice(1, 4) + ' ' + s.slice(4);
        return null;
    }
    function selectedTime() { var r = $('input[name="time"]:checked', form); return r ? r.value : ''; }

    function validate() {
        var e = {};
        var name = fields.name.value.trim();
        if (name.length < 2 || !/\p{L}/u.test(name)) e.name = 'err.name';
        if (!fields.phone.value.trim()) e.phone = 'err.phoneEmpty';
        else if (!normalizePhone(fields.phone.value)) e.phone = 'err.phone';
        if (!fields.treatment.value) e.treatment = 'err.treatment';
        setDateBounds();
        var date = fields.date.value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'err.date';
        else if (date < fields.date.min) e.date = 'err.datePast';
        else if (date > fields.date.max) e.date = 'err.dateFar';
        var time = selectedTime();
        if (!time) e.time = 'err.time';
        else if (!e.date) {
            var p = date.split('-').map(Number);
            var dow = new Date(p[0], p[1] - 1, p[2]).getDay();
            var close = hoursFor(dow)[1];
            var slotEnd = { morning: 12, afternoon: 16, evening: 21 }[time];
            if (dow === 0 && time === 'evening') e.time = 'err.sundayEvening';
            else if (date === fields.date.min && dubaiNow().mins >= Math.min(slotEnd, close) * 60) e.time = 'err.timePassed';
        }
        return e;
    }
    function showErrors(e) {
        currentErrors = e;
        FIELD_ORDER.forEach(function (k) {
            var msg = document.getElementById('err-' + k);
            msg.innerHTML = '';
            if (e[k]) {
                msg.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg>';
                msg.appendChild(document.createTextNode(t(e[k])));
            }
            msg.closest('.form-group').classList.toggle('is-invalid', !!e[k]);
            (k === 'time' ? timeGroup : fields[k]).setAttribute('aria-invalid', e[k] ? 'true' : 'false');
        });
    }
    function revalidate() { if (attempted) showErrors(validate()); }
    form.addEventListener('input', revalidate);
    form.addEventListener('change', revalidate);

    function optionLabel(value) { var o = $('option[value="' + value + '"]', fields.treatment); return o ? o.textContent : value; }
    function timeLabel(value) { return t('time.' + value) + ' (' + t('time.' + value + '.h') + ')'; }
    function dateLabel(iso) {
        var p = iso.split('-').map(Number);
        return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(localeFor(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    function bookingRows(b) {
        var rows = [['msg.name', b.name], ['msg.phone', b.phone], ['msg.treatment', optionLabel(b.treatment)], ['msg.date', dateLabel(b.date)], ['msg.time', timeLabel(b.time)]];
        if (b.note) rows.push(['msg.note', b.note]);
        return rows;
    }
    function whatsappUrl(b) {
        var lines = [t('msg.greeting'), t('msg.intro'), ''];
        bookingRows(b).forEach(function (r) {
            var v = r[0] === 'msg.phone' && lang === 'ar' ? '‎' + r[1] : r[1];
            lines.push('- ' + t(r[0]) + ': ' + v);
        });
        lines.push('', t('msg.thanks'));
        return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
    }
    function renderSuccess(b) {
        $('#successTitle').textContent = t('ok.title').replace('{name}', b.name.split(/\s+/)[0]);
        var dl = $('#successSummary');
        dl.innerHTML = '';
        bookingRows(b).forEach(function (r) {
            var row = document.createElement('div');
            var dt = document.createElement('dt');
            var dd = document.createElement('dd');
            dt.textContent = t(r[0]);
            dd.textContent = r[1];
            if (r[0] === 'msg.phone') dd.className = 'ltr';
            row.appendChild(dt);
            row.appendChild(dd);
            dl.appendChild(row);
        });
        $('#successWa').href = whatsappUrl(b);
    }
    form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        attempted = true;
        var e = validate();
        showErrors(e);
        var first = FIELD_ORDER.filter(function (k) { return e[k]; })[0];
        if (first) {
            (first === 'time' ? ($('input[name="time"]:checked', form) || $('input[name="time"]', form)) : fields[first]).focus();
            return;
        }
        lastBooking = {
            name: fields.name.value.trim().replace(/\s+/g, ' '),
            phone: normalizePhone(fields.phone.value),
            treatment: fields.treatment.value,
            date: fields.date.value,
            time: selectedTime(),
            note: fields.note.value.trim()
        };
        var url = whatsappUrl(lastBooking);
        if (!IS_MOBILE) window.open(url, '_blank', 'noopener');
        renderSuccess(lastBooking);
        form.hidden = true;
        success.hidden = false;
        success.focus({ preventScroll: true });
        success.closest('.booking-card').scrollIntoView({ behavior: motion() === 'off' ? 'auto' : 'smooth', block: 'center' });
        if (IS_MOBILE) window.location.href = url;
    });
    $('#bookAnother').addEventListener('click', function () {
        form.reset();
        attempted = false;
        lastBooking = null;
        showErrors({});
        success.hidden = true;
        form.hidden = false;
        fields.name.focus();
    });
    // "Book a visit" on a treatment pre-selects it
    $$('[data-treatment]').forEach(function (a) {
        a.addEventListener('click', function () { fields.treatment.value = a.getAttribute('data-treatment'); revalidate(); });
    });

    /* ------------------------------------------------------------------
       7. Copyright watermark guard: puts the stamp back if it is removed or hidden
       ------------------------------------------------------------------ */
    var WM = [{ id: 'wm', cls: 'wm' }, { id: 'wmStamp', cls: 'wm-stamp' }];
    WM.forEach(function (w) { w.backup = document.getElementById(w.id).cloneNode(true); });
    var wmWatch = 'MutationObserver' in window ? new MutationObserver(function () { guardWatermark(); }) : null;
    function guardWatermark() {
        WM.forEach(function (w) {
            var el = document.getElementById(w.id);
            if (!el || el.parentNode !== document.body) {
                if (el) el.remove();
                el = w.backup.cloneNode(true);
                document.body.appendChild(el);
            }
            if (el.getAttribute('style') !== null) el.removeAttribute('style');
            if (el.hasAttribute('hidden')) el.removeAttribute('hidden');
            if (el.className !== w.cls) el.className = w.cls;
            if (el.textContent !== w.backup.textContent) el.textContent = w.backup.textContent;
            if (wmWatch && el !== w.watched) {
                w.watched = el;
                wmWatch.observe(el, { attributes: true, childList: true, characterData: true, subtree: true });
            }
        });
    }
    guardWatermark();
    if (wmWatch) wmWatch.observe(document.body, { childList: true });
    setInterval(guardWatermark, 3000);

    /* ------------------------------------------------------------------
       8. Boot
       ------------------------------------------------------------------ */
    function refreshMotion() {
        setupLenis();
        if (motion() !== 'full') {
            parallaxEls.forEach(function (el) { el.style.transform = ''; });
            if (expPhoto) expPhoto.style.removeProperty('--zoom');
            $$('.magnetic').forEach(function (el) { el.style.transform = ''; });
        }
        if (motion() === 'off') $$('[data-reveal], [data-split]').forEach(function (el) { el.classList.add('in'); });
        lastY = -1;
    }

    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
    applyLang(saved === 'ar' ? 'ar' : 'en', false);
    ribbon.reset();
    setupLenis();
    requestAnimationFrame(onFrame);
    window.addEventListener('resize', function () { ribbon.reset(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ribbon.reset(); });

    window.Ivory = {
        t: t,
        getLang: function () { return lang; },
        applyLang: applyLang,
        setBrand: setBrand,
        getBrand: function () { return brand; },
        setEditing: setEditing,
        isEditing: function () { return editing; },
        getEdits: function () { return edits; },
        setEdits: setEdits,
        refreshMotion: refreshMotion,
        resetRibbon: function () { ribbon.reset(); },
        lenis: function () { return lenis; }
    };
    document.dispatchEvent(new CustomEvent('ivory:ready'));
})();
