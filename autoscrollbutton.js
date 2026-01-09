(function () {
    'use strict';

    const ICON_CLASS = 'material-symbols-outlined';
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

    // --- Google Fonts: komplette Schrift laden ---
    function injectFont() {
        if (document.getElementById('jf-material-symbols')) return;
        const link = document.createElement('link');
        link.id = 'jf-material-symbols';
        link.rel = 'stylesheet';
        // komplette Schrift, ohne Einschränkung auf einzelne Icons
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
        document.head.appendChild(link);
    }

    function injectStyle() {
        if (document.getElementById('jf-scroll-style')) return;
        const style = document.createElement('style');
        style.id = 'jf-scroll-style';
        style.textContent = `
            .${ICON_CLASS} {
                font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
                font-size:24px;
                display:inline-block;
                vertical-align:middle;
            }
            #${BUTTON_ID} {
                background:transparent;
                border:none;
                padding:4px;
                cursor:pointer;
                color:inherit;
            }
            #${BUTTON_ID}:hover {
                background:rgba(255,255,255,0.1);
                border-radius:4px;
            }
            .timer-display {
                margin-left:4px;
                font-weight:bold;
                font-size:14px;
                vertical-align:middle;
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

        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.className = 'headerButton';
        btn.title = 'Autoscroll';

        const icon = document.createElement('span');
        icon.className = ICON_CLASS;
        icon.textContent = 'arrow_circle_down';
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
                    icon.textContent = scrolling ? 'pause' : 'arrow_circle_down';
                    if (scrolling) startScroll(scrollContainer);
                } else if (clickCount === 2) {
                    speedIndex = (speedIndex + 1) % speeds.length;
                    icon.textContent = `counter_${speedIndex + 1}`;
                    setTimeout(() => {
                        icon.textContent = scrolling ? 'pause' : 'arrow_circle_down';
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
                injectFont();
                injectStyle();
                createButton();
            }
        }, 200);
    }

    waitForHeader();
})();
