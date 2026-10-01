(function () {
    'use strict';

    // Run only on Windows browsers
    const isWindows = navigator.userAgent.includes('Windows') || navigator.platform.includes('Win');
    if (!isWindows) return;

    const ICON_CLASS = 'material-icons';
    const BUTTON_ID = 'jf-scroll-btn';
    const HEADER_SELECTOR = '.headerRight';

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

    function createButton() {
        const header = document.querySelector(HEADER_SELECTOR);
        if (!header || document.getElementById(BUTTON_ID)) return;

        // Same classes as Jellyfin's own header buttons (SyncPlay, Cast,
        // Search), so size, round hover/active highlight and colour come
        // from Jellyfin's stylesheet and the active theme, 1:1.
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = BUTTON_ID;
        btn.className = 'headerButton headerButtonRight paper-icon-button-light';
        btn.title = 'Autoscroll';

        const icon = document.createElement('span');
        icon.className = ICON_CLASS;
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = iconSvg('arrow_circle_down');
        btn.appendChild(icon);

        const display = document.createElement('span');
        display.className = 'timer-display';
        btn.appendChild(display);

        const scrollContainer = document.querySelector('.main-content') || document.documentElement;

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

        header.insertBefore(btn, header.firstChild);

        setInterval(() => {
            if (window.location.href !== lastPage) {
                lastPage = window.location.href;
                if (scrolling) {
                    scrollContainer.scrollTop = 0;
                    delayTopPending = true;
                }
            }
        }, 200);
    }

    function waitForHeader() {
        const interval = setInterval(() => {
            if (document.querySelector(HEADER_SELECTOR)) {
                clearInterval(interval);
                injectStyle();
                createButton();
            }
        }, 200);
    }

    waitForHeader();
})();
