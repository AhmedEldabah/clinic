/* Studio: a live customizer so a clinic can preview the site in its own style.
   Settings persist in localStorage and can be shared as a link (#studio=...). */
(function () {
    'use strict';

    var root = document.documentElement;
    var STORE_KEY = 'ivory-studio';
    var HINT_KEY = 'ivory-studio-hint';
    var OPTIONS = {
        theme: ['noir', 'pearl', 'emerald', 'sapphire', 'rose'],
        font: ['classic', 'modern', 'editorial', 'minimal', 'deco'],
        radius: ['sharp', 'soft', 'round'],
        motion: ['full', 'calm', 'off'],
        hero: ['classic', 'mirrored', 'centered']
    };
    var FONT_URLS = {
        modern: 'family=Syne:wght@500;600;700',
        editorial: 'family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Montserrat:wght@300;400;500;600;700&family=Noto+Naskh+Arabic:wght@500;600',
        minimal: 'family=Outfit:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700',
        deco: 'family=Italiana&family=Jost:wght@300;400;500;600;700&family=Reem+Kufi:wght@400;500;600&family=Tajawal:wght@300;400;500;700'
    };
    var THEME_BG = { noir: '#0B0B0C', pearl: '#EEEEEC', emerald: '#06120E', sapphire: '#0A1022', rose: '#0F0C0D' };
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var container = document.getElementById('sections');
    var SECTION_KEYS = Array.prototype.map.call(container.children, function (s) { return s.getAttribute('data-section'); });
    var DEFAULTS = { theme: 'noir', accent: '', font: 'classic', radius: 'soft', motion: 'full', hero: 'classic', brand: '', order: SECTION_KEYS.slice(), hidden: [], edits: { en: {}, ar: {} } };

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function I() { return window.Ivory; }
    function t(k) { return I().t(k); }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    function normalize(raw) {
        var s = clone(DEFAULTS);
        if (!raw || typeof raw !== 'object') return s;
        Object.keys(OPTIONS).forEach(function (k) { if (OPTIONS[k].indexOf(raw[k]) >= 0) s[k] = raw[k]; });
        if (typeof raw.accent === 'string' && /^#[0-9a-f]{6}$/i.test(raw.accent)) s.accent = raw.accent.toLowerCase();
        if (typeof raw.brand === 'string') s.brand = raw.brand.replace(/[<>]/g, '').trim().slice(0, 24);
        if (Array.isArray(raw.order)) {
            var order = raw.order.filter(function (k, i, a) { return SECTION_KEYS.indexOf(k) >= 0 && a.indexOf(k) === i; });
            SECTION_KEYS.forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
            s.order = order;
        }
        if (Array.isArray(raw.hidden)) s.hidden = raw.hidden.filter(function (k) { return SECTION_KEYS.indexOf(k) >= 0; });
        if (raw.edits && typeof raw.edits === 'object') s.edits = raw.edits;
        return s;
    }
    function encode(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
    function decode(str) { return JSON.parse(decodeURIComponent(escape(atob(str)))); }

    var state;
    var fromLink = /[#&]studio=([^&]+)/.exec(location.hash);
    try {
        state = normalize(fromLink ? decode(decodeURIComponent(fromLink[1])) : JSON.parse(localStorage.getItem(STORE_KEY) || 'null'));
    } catch (e) { state = clone(DEFAULTS); }

    function save() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(compact())); } catch (e) {}
    }
    function compact() { // only what differs from the defaults
        var out = {};
        Object.keys(DEFAULTS).forEach(function (k) {
            if (k === 'edits') {
                var ed = I().getEdits();
                if (Object.keys(ed.en).length || Object.keys(ed.ar).length) out.edits = ed;
            } else if (JSON.stringify(state[k]) !== JSON.stringify(DEFAULTS[k])) out[k] = state[k];
        });
        return out;
    }

    /* ---------- Applying settings ---------- */
    function loadFont(name) {
        if (!FONT_URLS[name] || document.getElementById('font-' + name)) return;
        var l = document.createElement('link');
        l.id = 'font-' + name;
        l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?' + FONT_URLS[name] + '&display=swap';
        document.head.appendChild(l);
    }
    function applyLook() {
        ['theme', 'font', 'radius', 'hero'].forEach(function (k) { root.setAttribute('data-' + k, state[k]); });
        root.setAttribute('data-motion', reducedMotion ? 'off' : state.motion);
        if (state.accent) root.style.setProperty('--accent-custom', state.accent);
        else root.style.removeProperty('--accent-custom');
        loadFont(state.font);
        var meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEME_BG[state.theme]);
    }
    function applySections(animate) {
        var before = {};
        if (animate) $$('#sections > section').forEach(function (s) { before[s.getAttribute('data-section')] = s.getBoundingClientRect().top; });
        state.order.forEach(function (k) { container.appendChild(container.querySelector('[data-section="' + k + '"]')); });
        $$('#sections > section').forEach(function (s) {
            var k = s.getAttribute('data-section');
            if (state.hidden.indexOf(k) >= 0) s.setAttribute('data-hidden', ''); else s.removeAttribute('data-hidden');
        });
        if (animate && root.getAttribute('data-motion') !== 'off') {
            $$('#sections > section').forEach(function (s) { // FLIP: glide from the old position
                var k = s.getAttribute('data-section');
                var dy = before[k] - s.getBoundingClientRect().top;
                if (dy && Math.abs(dy) < window.innerHeight * 2.5) {
                    s.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
                }
            });
        }
        if (I()) I().resetRibbon();
    }
    function applyAll(opts) {
        opts = opts || {};
        applyLook();
        I().setBrand(state.brand);
        if (opts.edits) I().setEdits(state.edits);
        applySections(!!opts.animate);
        I().refreshMotion();
        syncUI();
        save();
    }

    /* ---------- Panel UI ---------- */
    var panel = $('#studio');
    var scrim = $('#studioScrim');
    var openBtn = $('#studioOpen');
    var closeBtn = $('#studioClose');
    var toast = $('#studioToast');
    var brandInput = $('#stBrand');
    var accentInput = $('#stAccent');
    var editToggle = $('#stEdit');
    var list = $('#sectionList');
    $('.studio-body', panel).setAttribute('data-lenis-prevent', '');
    var isMobile = window.matchMedia('(max-width: 767.98px)');

    function setOpen(open) {
        panel.classList.toggle('is-open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
        openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        scrim.hidden = !(open && isMobile.matches);
        document.body.classList.toggle('studio-open-mobile', open && isMobile.matches);
        hideHint();
        if (open) {
            loadFont('preview');
            setTimeout(function () { closeBtn.focus(); }, 50);
        } else {
            openBtn.focus({ preventScroll: true });
        }
    }
    openBtn.addEventListener('click', function () { setOpen(!panel.classList.contains('is-open')); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    scrim.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false); });
    // Small "Aa" previews of every pairing (Google Fonts can serve just those two letters)
    FONT_URLS.preview = 'family=Syne:wght@600&family=Playfair+Display:wght@500&family=Outfit:wght@500&family=Italiana&text=Aa';

    function syncUI() {
        $$('[data-setting]', panel).forEach(function (group) {
            var k = group.getAttribute('data-setting');
            $$('[data-value]', group).forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-value') === state[k] ? 'true' : 'false'); });
        });
        var preset = false;
        $$('[data-accent]', panel).forEach(function (b) {
            var on = b.getAttribute('data-accent') === state.accent;
            if (on) preset = true;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        $('.dot-custom', panel).classList.toggle('is-on', !!state.accent && !preset);
        if (state.accent) accentInput.value = state.accent;
        if (document.activeElement !== brandInput) brandInput.value = state.brand;
        editToggle.checked = I().isEditing();
        renderList();
    }

    // Radio groups (theme, font, corners, motion, hero)
    $$('[data-setting]', panel).forEach(function (group) {
        var k = group.getAttribute('data-setting');
        $$('[data-value]', group).forEach(function (b) {
            b.addEventListener('click', function () {
                state[k] = b.getAttribute('data-value');
                applyLook();
                if (k === 'motion') I().refreshMotion();
                if (k === 'font' || k === 'hero') I().resetRibbon();
                syncUI();
                save();
            });
        });
        group.addEventListener('keydown', function (e) { // arrow keys move between options
            var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
            if (!keys[e.key]) return;
            e.preventDefault();
            var btns = $$('[data-value]', group);
            var dir = keys[e.key] * (root.dir === 'rtl' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? -1 : 1);
            var i = btns.indexOf(document.activeElement);
            var next = btns[(i + dir + btns.length) % btns.length];
            next.focus();
            next.click();
        });
    });
    $$('[data-accent]', panel).forEach(function (b) {
        b.addEventListener('click', function () { state.accent = b.getAttribute('data-accent'); applyLook(); syncUI(); save(); });
    });
    accentInput.addEventListener('input', function () { state.accent = accentInput.value.toLowerCase(); applyLook(); syncUI(); save(); });
    brandInput.addEventListener('input', function () {
        state.brand = brandInput.value.replace(/[<>]/g, '').slice(0, 24);
        I().setBrand(state.brand);
        save();
    });
    editToggle.addEventListener('change', function () {
        I().setEditing(editToggle.checked);
        if (editToggle.checked && isMobile.matches) setOpen(false);
    });
    document.addEventListener('ivory:edit', save);
    document.addEventListener('ivory:lang', function () { if (I()) renderList(); });

    /* Section list: drag to reorder (mouse), arrows (touch / keyboard), eye to hide */
    var dragKey = null;
    function renderList() {
        list.innerHTML = '';
        state.order.forEach(function (k, i) {
            var li = document.createElement('li');
            li.draggable = true;
            li.setAttribute('data-key', k);
            var off = state.hidden.indexOf(k) >= 0;
            li.classList.toggle('is-off', off);
            li.innerHTML =
                '<span class="grip" aria-hidden="true"><svg class="icon"><use href="#i-drag"/></svg></span>' +
                '<span class="name"></span>' +
                '<button type="button" data-act="up"><svg class="icon"><use href="#i-up"/></svg></button>' +
                '<button type="button" data-act="down"><svg class="icon"><use href="#i-down"/></svg></button>' +
                '<button type="button" data-act="eye"><svg class="icon"><use href="#i-' + (off ? 'eyeoff' : 'eye') + '"/></svg></button>';
            var name = t('sec.' + k);
            $('.name', li).textContent = name;
            $('[data-act="up"]', li).setAttribute('aria-label', t('studio.up') + ': ' + name);
            $('[data-act="down"]', li).setAttribute('aria-label', t('studio.down') + ': ' + name);
            $('[data-act="eye"]', li).setAttribute('aria-label', (off ? t('studio.show') : t('studio.hide')) + ': ' + name);
            $('[data-act="eye"]', li).setAttribute('aria-pressed', off ? 'true' : 'false');
            $('[data-act="up"]', li).disabled = i === 0;
            $('[data-act="down"]', li).disabled = i === state.order.length - 1;
            list.appendChild(li);
        });
    }
    function moveTo(key, index, refocus) {
        var from = state.order.indexOf(key);
        if (from < 0 || index < 0 || index >= state.order.length || index === from) return;
        state.order.splice(from, 1);
        state.order.splice(index, 0, key);
        applySections(true);
        renderList();
        save();
        if (refocus) { var b = $('li[data-key="' + key + '"] [data-act="' + refocus + '"]', list); if (b && !b.disabled) b.focus(); }
    }
    list.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-act]');
        if (!b) return;
        var key = b.closest('li').getAttribute('data-key');
        var i = state.order.indexOf(key);
        var act = b.getAttribute('data-act');
        if (act === 'up') moveTo(key, i - 1, 'up');
        else if (act === 'down') moveTo(key, i + 1, 'down');
        else {
            var h = state.hidden.indexOf(key);
            if (h >= 0) state.hidden.splice(h, 1); else state.hidden.push(key);
            applySections(false);
            renderList();
            save();
            $('li[data-key="' + key + '"] [data-act="eye"]', list).focus();
        }
    });
    list.addEventListener('dragstart', function (e) {
        var li = e.target.closest('li');
        if (!li) return;
        dragKey = li.getAttribute('data-key');
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragKey); } catch (err) {}
    });
    list.addEventListener('dragover', function (e) {
        if (!dragKey) return;
        e.preventDefault();
        $$('.drop-target', list).forEach(function (x) { x.classList.remove('drop-target'); });
        var li = e.target.closest('li');
        if (li && li.getAttribute('data-key') !== dragKey) li.classList.add('drop-target');
    });
    list.addEventListener('drop', function (e) {
        e.preventDefault();
        var li = e.target.closest('li');
        if (dragKey && li) {
            var r = li.getBoundingClientRect();
            var target = state.order.indexOf(li.getAttribute('data-key'));
            var from = state.order.indexOf(dragKey);
            var after = e.clientY > r.top + r.height / 2;
            var index = target + (after ? 1 : 0) - (from < target + (after ? 1 : 0) ? 1 : 0);
            moveTo(dragKey, index);
        }
    });
    list.addEventListener('dragend', function () {
        dragKey = null;
        $$('.dragging, .drop-target', list).forEach(function (x) { x.classList.remove('dragging', 'drop-target'); });
    });

    /* Share + reset */
    var toastTimer;
    function say(msg) {
        toast.textContent = msg;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.textContent = ''; }, 4500);
    }
    $('#stShare').addEventListener('click', function () {
        var url = location.href.split('#')[0] + '#studio=' + encodeURIComponent(encode(compact()));
        var done = function () { say(t('studio.copied')); };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(done, function () { history.replaceState(null, '', url); say(t('studio.copyFail')); });
        } else {
            history.replaceState(null, '', url);
            say(t('studio.copyFail'));
        }
    });
    $('#stReset').addEventListener('click', function () {
        I().setEditing(false);
        state = clone(DEFAULTS);
        applyAll({ edits: true, animate: true });
        try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        say(t('studio.resetDone'));
    });

    /* First-visit nudge so clinics discover the panel */
    var hint = $('#studioHint');
    var hintTimer;
    function hideHint() { clearTimeout(hintTimer); if (!hint.hidden) hint.hidden = true; }
    try {
        if (!localStorage.getItem(HINT_KEY) && !fromLink) {
            hintTimer = setTimeout(function () {
                hint.hidden = false;
                localStorage.setItem(HINT_KEY, '1');
                hintTimer = setTimeout(hideHint, 7000);
            }, 4500);
        }
    } catch (e) {}

    /* Boot (app.js runs first; both are deferred) */
    function boot() {
        applyAll({ edits: true, animate: false });
        if (fromLink) history.replaceState(null, '', location.pathname + location.search);
    }
    if (window.Ivory) boot(); else document.addEventListener('ivory:ready', boot);
    // A share link pasted into a tab that is already on the site only changes the hash
    window.addEventListener('hashchange', function () { if (/[#&]studio=/.test(location.hash)) location.reload(); });
})();
