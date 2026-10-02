(function () {
    'use strict';

    /* jfcompat 1.0 - one script for Jellyfin web 10.10.7 and 12.1.
     * Paste this block unchanged at the top of a script (inside its IIFE).
     * It is pure: no side effects at load, no globals except window.jfcompat
     * (set only when absent, for console checks; scripts use the local const).
     * Rule: on 10.10.7 every answer equals what the scripts computed before. */
    const jfcompat = (function () {
        'use strict';
        const VERSION = '1.0';

        // ---------- version ----------
        // The web client ships with the server, so the server version decides.
        // ApiClient.appVersion() is not used: inside Jellyfin Media Player or the
        // Android app NativeShell replaces it with the app's own number
        // (apphost.js 10.10.7:417-419, 12.1:399-401).
        // Before ApiClient knows the server, <html data-theme> is a 12.x-only hint
        // (12.1 scripts/themeManager.js:46; 10.10.7 never sets it).
        function serverVersion() {
            try {
                const api = window.ApiClient;
                const v = api && typeof api.serverVersion === 'function' && api.serverVersion();
                if (v) {
                    const [major, minor] = String(v).split('.').map(Number);
                    return { major: major, minor: minor || 0, raw: String(v) };
                }
            } catch (e) { /* ignore */ }
            return null;
        }
        // 12.x model: modern layout default, routes without .html, legacy auth off.
        // 10.11 was not audited; treated as the new model (live-check before relying on it).
        function isNewModel() {
            const v = serverVersion();
            if (v) return v.major > 10 || (v.major === 10 && v.minor >= 11);
            return document.documentElement.hasAttribute('data-theme');
        }

        // ---------- routes ----------
        // getRoute(): { name, params } with '#!' and '.html' removed, so one name
        // fits both: home, movies, tv, list, search, details, video, music, livetv ...
        function getRoute() {
            const h = window.location.hash || '';
            const m = /^#!?\/([^?]*)(?:\?(.*))?$/.exec(h);
            const name = m ? m[1].replace(/\.html$/i, '').toLowerCase() : '';
            return { name: name, params: new URLSearchParams(m && m[2] ? m[2] : '') };
        }
        function isRoute() {
            const n = getRoute().name;
            for (let i = 0; i < arguments.length; i++) if (arguments[i] === n) return true;
            return false;
        }
        // routeUrl('list', {parentId}) -> '#/list.html?...' on 10.10.7, '#/list?...' on 12.1.
        // details and video never had '.html' (10.10.7 appRouter.js:447,472).
        const NO_SUFFIX = ['details', 'video', ''];
        function routeUrl(name, params) {
            const q = params ? new URLSearchParams(params).toString() : '';
            const suffix = (!isNewModel() && NO_SUFFIX.indexOf(name) < 0) ? '.html' : '';
            return '#/' + name + suffix + (q ? '?' + q : '');
        }
        // Navigate inside the app (no reload). Emby.Page.show strips '#' and '!'
        // in both versions (appRouter.js 10.10.7:516, 12.1:552).
        function go(name, params) {
            const url = routeUrl(name, params);
            if (window.Emby && window.Emby.Page && typeof window.Emby.Page.show === 'function') {
                window.Emby.Page.show(url.slice(1));
            } else {
                window.location.hash = url;
            }
        }

        // ---------- layout ----------
        // 10.10.7: MUI only when localStorage.layout === 'experimental' (RootAppRouter.tsx:19-20).
        // 12.1:    classic only for desktop-legacy | mobile-legacy | tv
        //          (constants/layoutMode.ts, layoutManager.js:41); everything else,
        //          including a stale 'experimental', is MUI.
        // Both versions pick the layout once per page load, so the DOM answer is cached.
        const LEGACY_12 = ['desktop-legacy', 'mobile-legacy', 'tv'];
        const MUI_SEARCH = '.MuiAppBar-root a[href^="#/search"]';
        let cachedLayout = null;
        function getLayout() {
            if (cachedLayout) return cachedLayout;
            // 1) what the page shows (not on the video route: 12.1 draws an osdHeader there;
            //    not on dashboard pages: there the classic header is hidden in both layouts)
            if (getRoute().name !== 'video') {
                if (document.querySelector(MUI_SEARCH)) return (cachedLayout = 'mui');
                const sk = document.querySelector('.skinHeader:not(.osdHeader)');
                // .skinHeader is position:fixed, so offsetParent is always null; a
                // display:none ancestor (AppHeader isHidden) leaves it without client rects.
                if (sk && sk.getClientRects().length > 0 && sk.querySelector('.headerRight')) return (cachedLayout = 'classic');
            }
            // 2) the setting, read the way each version reads it (not cached)
            let v = '';
            try { v = localStorage.getItem('layout') || ''; } catch (e) { /* ignore */ }
            if (isNewModel()) return LEGACY_12.indexOf(v) >= 0 ? 'classic' : 'mui';
            return v === 'experimental' ? 'mui' : 'classic';
        }
        function isMui() { return getLayout() === 'mui'; }

        // ---------- header ----------
        // MUI: the search link sits in the right-hand button box with SyncPlay and
        // RemotePlay (components/toolbar/AppToolbar.tsx:84-85, both versions).
        // Its href is '#/search.html' on 10.10.7 and '#/search' on 12.1.
        // Classic: only a SHOWN header counts. 12.1 keeps the hidden classic header
        // in the DOM in the modern layout (AppHeader.tsx:20), and both versions hide
        // it on dashboard pages; a button placed there would never be seen.
        function isShown(el) { return !!el && el.getClientRects().length > 0; }
        function getSearchLink() {
            if (isMui()) return document.querySelector(MUI_SEARCH);
            const b = document.querySelector('.skinHeader:not(.osdHeader) .headerRight .headerSearchButton');
            return isShown(b) ? b : null;
        }
        function getHeaderBox() {
            if (isMui()) { const a = document.querySelector(MUI_SEARCH); return a ? a.parentElement : null; }
            const box = document.querySelector('.skinHeader:not(.osdHeader) .headerRight');
            return isShown(box) ? box : null;
        }
        // cb(box | null) whenever the box may have changed (the MUI toolbar unmounts
        // on /video and has no buttons on public pages). setTimeout, not rAF, so it
        // also runs in background tabs.
        function onHeaderBoxChange(cb) {
            let queued = false;
            const run = function () { queued = false; cb(getHeaderBox()); };
            const start = function () {
                if (!document.body) { setTimeout(start, 200); return; }
                run();
                new MutationObserver(function () {
                    if (!queued) { queued = true; setTimeout(run, 50); }
                }).observe(document.body, { childList: true, subtree: true });
            };
            start();
        }

        // ---------- theme ----------
        function getThemeId() {
            const d = document.documentElement.getAttribute('data-theme');          // 12.1
            if (d) return d;
            const link = document.querySelector('link[href*="themes/"][href$="theme.css"]'); // both
            const m = link && /themes\/([^/]+)\/theme\.css/.exec(link.getAttribute('href') || '');
            return m ? m[1] : 'dark';
        }
        // MUI IconButton (color inherit) hover = action.active at action.hoverOpacity.
        // 12.1 exposes it as CSS variables (themes/index.ts, prefix 'jf'); the
        // fallbacks are the 10.10.7 values (dark 8 % white, light/appletv 4 % black).
        function getMuiHoverColor() {
            const old = /^(light|appletv)$/.test(getThemeId()) ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)';
            if (!document.documentElement.hasAttribute('data-theme')) return old;
            const cs = getComputedStyle(document.documentElement);
            const ch = cs.getPropertyValue('--jf-palette-action-activeChannel').trim();
            const op = cs.getPropertyValue('--jf-palette-action-hoverOpacity').trim();
            return (ch && op) ? 'rgba(' + ch + ' / ' + op + ')' : old;
        }

        // ---------- auth for raw fetch ----------
        // 12.1 ignores X-Emby-Token, X-MediaBrowser-Token, X-Emby-Authorization and
        // ?api_key= unless EnableLegacyAuthorization (AuthorizationContext.cs:93-110).
        // The Authorization header and ?ApiKey= work in both versions.
        function accessToken() {
            try {
                const api = window.ApiClient;
                const t = api && typeof api.accessToken === 'function' && api.accessToken();
                if (t) return t;
            } catch (e) { /* ignore */ }
            try {
                const c = JSON.parse(localStorage.getItem('jellyfin_credentials') || '{}');
                const s = (c.Servers || []).find(function (x) { return x.AccessToken; });
                return s ? s.AccessToken : null;
            } catch (e) { return null; }
        }
        function authHeaders(extra) {
            const h = Object.assign({}, extra || {});
            const t = accessToken();
            if (t) h.Authorization = 'MediaBrowser Token="' + t + '"';
            return h;
        }
        // Adds ?ApiKey=<token> to a URL that cannot carry a header (img src, download link).
        function withApiKey(url) {
            const t = accessToken();
            if (!t) return url;
            return url + (url.indexOf('?') < 0 ? '?' : '&') + 'ApiKey=' + encodeURIComponent(t);
        }

        // ---------- pages ----------
        // React library pages in the 12.1 modern layout (apps/modern/routes/asyncRoutes/user.ts).
        // In 10.10.7 'experimental' some of these were React too; live-check before reuse there.
        const REACT_LIBRARY_ROUTES = ['movies', 'tv', 'music', 'livetv', 'boxsets', 'homevideos',
            'musicvideos', 'mixed', 'books', 'playlists', 'home'];
        function isReactLibraryPage() {
            return isNewModel() && isMui() && REACT_LIBRARY_ROUTES.indexOf(getRoute().name) >= 0;
        }

        // ---------- video OSD ----------
        // Legacy view in both (10.10.7 controllers/playback/video/index.html:30;
        // 12.1 apps/legacy/controllers/playback/video/index.html:30).
        function getOsdBar() {
            return document.querySelector('.videoOsdBottom .osdControls .buttons');
        }

        const api = {
            VERSION: VERSION, serverVersion: serverVersion, isNewModel: isNewModel,
            getRoute: getRoute, isRoute: isRoute, routeUrl: routeUrl, go: go,
            getLayout: getLayout, isMui: isMui,
            getSearchLink: getSearchLink, getHeaderBox: getHeaderBox, onHeaderBoxChange: onHeaderBoxChange,
            getThemeId: getThemeId, getMuiHoverColor: getMuiHoverColor,
            accessToken: accessToken, authHeaders: authHeaders, withApiKey: withApiKey,
            isReactLibraryPage: isReactLibraryPage, getOsdBar: getOsdBar
        };
        if (!window.jfcompat) window.jfcompat = api;
        return api;
    })();
    /* end jfcompat 1.0 */

    // Run only on Windows browsers
    const isWindows = navigator.userAgent.includes('Windows') || navigator.platform.includes('Win');
    if (!isWindows) return;

    const ICON_CLASS = 'material-icons';
    const BUTTON_ID = 'jf-scroll-btn';

    let scrolling = false;
    let speedIndex = 0;
    const speeds = [0.03, 0.06, 0.2];

    const delayStates = [0, 1, 3, 5, 10]; // Triple-Click Delay Optionen
    let currentDelayIndex = 0;
    const bottomDelay = 3000; // 3 Sekunden unten

    let clickCount = 0;
    let clickTimer = null;

    let lastPage = window.location.href;

    let delayTopPending = true;
    let delayBottomPending = false;

    // Inline SVG icons instead of relying on the "Material Symbols Outlined"
    // icon font loaded from fonts.googleapis.com: whenever that font couldn't
    // load (blocked, offline, privacy extensions) or hadn't loaded yet, the
    // ligature text (e.g. "arrow_circle_down") was shown instead of the icon. The
    // paths are the glyphs of the exact font file fonts.googleapis.com
    // serves for this family, drawn at the same 24px, so the icons look
    // exactly as before, and the font no longer needs to be requested.
    const ICON_PATHS = {
        arrow_circle_down: 'M480 -320 640 -480 584 -536 520 -472V-640H440V-472L376 -536L320 -480ZM480 -80Q397 -80 324.0 -111.5Q251 -143 197.0 -197.0Q143 -251 111.5 -324.0Q80 -397 80 -480Q80 -563 111.5 -636.0Q143 -709 197.0 -763.0Q251 -817 324.0 -848.5Q397 -880 480 -880Q563 -880 636.0 -848.5Q709 -817 763.0 -763.0Q817 -709 848.5 -636.0Q880 -563 880 -480Q880 -397 848.5 -324.0Q817 -251 763.0 -197.0Q709 -143 636.0 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707.0 -253.0Q800 -346 800 -480Q800 -614 707.0 -707.0Q614 -800 480 -800Q346 -800 253.0 -707.0Q160 -614 160 -480Q160 -346 253.0 -253.0Q346 -160 480 -160ZM480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Z',
        pause: 'M520 -200V-760H760V-200ZM200 -200V-760H440V-200ZM600 -280H680V-680H600ZM280 -280H360V-680H280ZM280 -680V-280ZM600 -680V-280Z',
        counter_1: 'M480 -80Q397 -80 324.0 -111.5Q251 -143 197.0 -197.0Q143 -251 111.5 -324.0Q80 -397 80 -480Q80 -563 111.5 -636.0Q143 -709 197.0 -763.0Q251 -817 324.0 -848.5Q397 -880 480 -880Q563 -880 636.0 -848.5Q709 -817 763.0 -763.0Q817 -709 848.5 -636.0Q880 -563 880 -480Q880 -397 848.5 -324.0Q817 -251 763.0 -197.0Q709 -143 636.0 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707.0 -253.0Q800 -346 800 -480Q800 -614 707.0 -707.0Q614 -800 480 -800Q346 -800 253.0 -707.0Q160 -614 160 -480Q160 -346 253.0 -253.0Q346 -160 480 -160ZM480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480ZM460 -280H540V-680H380V-600H460Z',
        counter_2: 'M480 -80Q397 -80 324.0 -111.5Q251 -143 197.0 -197.0Q143 -251 111.5 -324.0Q80 -397 80 -480Q80 -563 111.5 -636.0Q143 -709 197.0 -763.0Q251 -817 324.0 -848.5Q397 -880 480 -880Q563 -880 636.0 -848.5Q709 -817 763.0 -763.0Q817 -709 848.5 -636.0Q880 -563 880 -480Q880 -397 848.5 -324.0Q817 -251 763.0 -197.0Q709 -143 636.0 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707.0 -253.0Q800 -346 800 -480Q800 -614 707.0 -707.0Q614 -800 480 -800Q346 -800 253.0 -707.0Q160 -614 160 -480Q160 -346 253.0 -253.0Q346 -160 480 -160ZM480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480ZM360 -280H600V-360H440V-440Q440 -440 440.0 -440.0Q440 -440 440 -440H520Q553 -440 576.5 -463.5Q600 -487 600 -520V-600Q600 -633 576.5 -656.5Q553 -680 520 -680H360V-600H520Q520 -600 520.0 -600.0Q520 -600 520 -600V-520Q520 -520 520.0 -520.0Q520 -520 520 -520H440Q407 -520 383.5 -496.5Q360 -473 360 -440Z',
        counter_3: 'M480 -80Q397 -80 324.0 -111.5Q251 -143 197.0 -197.0Q143 -251 111.5 -324.0Q80 -397 80 -480Q80 -563 111.5 -636.0Q143 -709 197.0 -763.0Q251 -817 324.0 -848.5Q397 -880 480 -880Q563 -880 636.0 -848.5Q709 -817 763.0 -763.0Q817 -709 848.5 -636.0Q880 -563 880 -480Q880 -397 848.5 -324.0Q817 -251 763.0 -197.0Q709 -143 636.0 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707.0 -253.0Q800 -346 800 -480Q800 -614 707.0 -707.0Q614 -800 480 -800Q346 -800 253.0 -707.0Q160 -614 160 -480Q160 -346 253.0 -253.0Q346 -160 480 -160ZM480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480Q480 -480 480.0 -480.0Q480 -480 480 -480ZM360 -280H520Q553 -280 576.5 -303.5Q600 -327 600 -360V-420Q600 -446 583.0 -463.0Q566 -480 540 -480Q566 -480 583.0 -497.0Q600 -514 600 -540V-600Q600 -633 576.5 -656.5Q553 -680 520 -680H360V-600H520Q520 -600 520.0 -600.0Q520 -600 520 -600V-520Q520 -520 520.0 -520.0Q520 -520 520 -520H440V-440H520Q520 -440 520.0 -440.0Q520 -440 520 -440V-360Q520 -360 520.0 -360.0Q520 -360 520 -360H360Z'
    };

    // Sized 1em so the icon follows the font size Jellyfin gives its own
    // header icons (.paper-icon-button-light > .material-icons).
    function iconSvg(name) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style="display:block"><path d="' + ICON_PATHS[name] + '"/></svg>';
    }

    function injectStyle() {
        if (document.getElementById('jf-scroll-style')) return;
        const style = document.createElement('style');
        style.id = 'jf-scroll-style';
        style.textContent = `
            /* Overlaid on the icon, so the round button keeps its shape
               while the delay number is shown. */
            #${BUTTON_ID} .timer-display {
                position:absolute;
                inset:0;
                display:flex;
                align-items:center;
                justify-content:center;
                font-weight:bold;
                font-size:14px;
                z-index:2;
                pointer-events:none;
            }
            #${BUTTON_ID} .timer-display:empty {
                display:none;
            }
        `;
        document.head.appendChild(style);
    }

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    async function startScroll(scrollContainer) {
        while (scrolling) {
            if (scrollContainer.scrollTop === 0 && delayTopPending) {
                delayTopPending = false;
                if (delayStates[currentDelayIndex] > 0) {
                    await sleep(delayStates[currentDelayIndex] * 1000);
                }
            }

            scrollContainer.scrollTop += speeds[speedIndex] * 16;

            if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight) {
                if (!delayBottomPending) {
                    delayBottomPending = true;
                    await sleep(bottomDelay);
                    scrollContainer.scrollTop = 0;
                    delayBottomPending = false;
                    delayTopPending = true;
                }
            }

            await sleep(16);
        }
    }

    let scrollContainer = null;

    function buildButton() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = BUTTON_ID;
        btn.title = 'Autoscroll';

        const icon = document.createElement('span');
        icon.className = ICON_CLASS;
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = iconSvg(scrolling ? 'pause' : 'arrow_circle_down');
        btn.appendChild(icon);

        const display = document.createElement('span');
        display.className = 'timer-display';
        btn.appendChild(display);

        scrollContainer = document.querySelector('.main-content') || document.documentElement;

        btn.addEventListener('click', () => {
            clickCount++;
            if (clickTimer) clearTimeout(clickTimer);

            clickTimer = setTimeout(() => {
                if (clickCount === 1) {
                    scrolling = !scrolling;
                    icon.innerHTML = iconSvg(scrolling ? 'pause' : 'arrow_circle_down');
                    if (scrolling) startScroll(scrollContainer);
                } else if (clickCount === 2) {
                    speedIndex = (speedIndex + 1) % speeds.length;
                    icon.innerHTML = iconSvg(`counter_${speedIndex + 1}`);
                    setTimeout(() => {
                        icon.innerHTML = iconSvg(scrolling ? 'pause' : 'arrow_circle_down');
                    }, 500);
                } else if (clickCount === 3) {
                    currentDelayIndex = (currentDelayIndex + 1) % delayStates.length;
                    display.textContent = delayStates[currentDelayIndex];
                    setTimeout(() => { display.textContent = ''; }, 500);
                }
                clickCount = 0;
            }, 250);
        });
        return btn;
    }

    function watchPageChanges() {
        setInterval(() => {
            if (window.location.href !== lastPage) {
                lastPage = window.location.href;
                if (scrolling && scrollContainer) {
                    scrollContainer.scrollTop = 0;
                    delayTopPending = true;
                }
            }
        }, 200);
    }

    /**********************
     * HEADER LAYOUTS
     **********************/
    // Classic header (.headerRight) or the MUI toolbar: Experimental layout
    // in 10.10.x, the default ("modern") layout in 12.x. jfcompat decides
    // from what the page shows, so the choice is made each time the header
    // box may have changed, not once at load (12.x keeps a hidden classic
    // header in the DOM, and its version is not known that early).

    // Left-to-right order of the custom header buttons (Random, Autoscroll,
    // Fullscreen, Cinema), so they line up the same in both layouts no
    // matter which script runs first.
    const HEADER_BUTTON_ORDER = ['randomMovieButton', 'jf-scroll-btn', 'jf-fullscreen-btn', 'jf-cinema-btn'];

    // In the classic header Random sits in its own wrapper div.
    function headerButtonRank(el) {
        return el.id === 'randomMovieButtonContainer' ? 0 : HEADER_BUTTON_ORDER.indexOf(el.id);
    }

    // Puts el into box right before the first element that belongs after
    // it: a Jellyfin button or a custom button later in the order.
    function placeInOrder(box, el) {
        const myRank = headerButtonRank(el);
        let ref = null;
        for (const child of box.children) {
            if (child === el) continue;
            const rank = headerButtonRank(child);
            if (rank === -1 || rank > myRank) { ref = child; break; }
        }
        if (el.parentElement !== box || el.nextElementSibling !== ref) box.insertBefore(el, ref);
    }

    // Same box, padding, icon size, colour and hover transition as MUI's
    // <IconButton size="large" color="inherit"> (@mui/material 5.16.7):
    // 12px padding around a 1.5rem icon (SvgIcon 'medium'), round, icon
    // keeps the toolbar colour.
    function muiButtonCss(id) {
        return `
            #${id}.jf-mui-header-btn {
                display:inline-flex; align-items:center; justify-content:center;
                position:relative; box-sizing:border-box; flex:0 0 auto;
                padding:12px; margin:0; border:0; border-radius:50%;
                background-color:transparent; color:inherit; font-size:1.75rem;
                cursor:pointer; outline:0; vertical-align:middle;
                -webkit-tap-highlight-color:transparent;
                transition:background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
            }
            #${id}.jf-mui-header-btn > .material-icons { font-size:1.5rem; line-height:1; }
            @media (hover: hover) {
                #${id}.jf-mui-header-btn:hover { background-color:var(--jf-mui-hover, rgba(255, 255, 255, 0.08)); }
            }
        `;
    }

    function injectMuiStyle(styleId, buttonId) {
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = muiButtonCss(buttonId);
        document.head.appendChild(style);
    }

    // Called whenever the header box may have changed (the MUI toolbar
    // unmounts on the video route and has no buttons on the login/server
    // pages); jfcompat batches the DOM changes with a short timer.
    function placeButton(box) {
        if (!box) return;
        let btn = document.getElementById(BUTTON_ID);
        if (!btn) btn = buildButton();
        if (jfcompat.isMui()) {
            injectMuiStyle('jf-scroll-mui-style', BUTTON_ID);
            btn.className = 'jf-mui-header-btn';
            btn.style.setProperty('--jf-mui-hover', jfcompat.getMuiHoverColor());
        } else {
            // Same classes as Jellyfin's own header buttons (SyncPlay, Cast,
            // Search), so size, round hover/active highlight and colour come
            // from Jellyfin's stylesheet and the active theme, 1:1.
            btn.className = 'headerButton headerButtonRight paper-icon-button-light';
        }
        // Classic header: place once, as on 10.10.7; re-order only when the
        // button is not in the box (new header, layout switch). Re-ordering on
        // every DOM change would fight other header scripts that move themselves.
        if (!jfcompat.isMui() && btn.parentElement === box) return;
        // After Random, before Fullscreen, Cinema and Jellyfin's buttons.
        placeInOrder(box, btn);
    }

    injectStyle();
    watchPageChanges();
    jfcompat.onHeaderBoxChange(placeButton);
})();
