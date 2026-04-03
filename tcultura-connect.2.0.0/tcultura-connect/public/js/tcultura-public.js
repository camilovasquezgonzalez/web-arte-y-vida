/**
 * TCultura Connect – Frontend Filter & Sort
 *
 * Pure vanilla JS, no dependencies. Self-initialising IIFE.
 */
(function () {
    'use strict';

    /* ── DOM refs ──────────────────────────────────────────────────── */

    var root    = document.getElementById('tcultura-root');
    if (!root) return; // shortcode not on this page

    var search  = document.getElementById('tcultura-search');
    var catSel  = document.getElementById('tcultura-filter-cat');
    var sortSel = document.getElementById('tcultura-sort');
    var grid    = document.getElementById('tcultura-grid');
    var empty   = document.getElementById('tcultura-empty');
    var counter = document.getElementById('tcultura-counter');
    var clearBtn= document.getElementById('tcultura-clear');

    if (!grid || !search || !catSel || !sortSel) return;

    var cards = Array.from(grid.querySelectorAll('.tcultura-card'));


    /* ── Traducir meses a español ─────────────────────────────── */

    var mesesEN = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
    var mesesES = ['enero','febrero','marzo','abril','mayo','junio',
                'julio','agosto','septiembre','octubre','noviembre','diciembre'];

    cards.forEach(function (card) {
        var metaItems = card.querySelectorAll('.tcultura-meta-item');
        metaItems.forEach(function (item) {
            var textNode = item.querySelector('.tcultura-date-text');
            if (!textNode) return;
            var txt = textNode.textContent;
            mesesEN.forEach(function (en, i) {
                txt = txt.replace(en, mesesES[i]);
            });
            textNode.textContent = txt;
        });
    });

    /* ── Init ──────────────────────────────────────────────────────── */

    buildCategoryOptions();
    updateView();

    search.addEventListener('input',  debounce(updateView, 200));
    catSel.addEventListener('change', updateView);
    sortSel.addEventListener('change', updateView);

    if (clearBtn) {
        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            search.value   = '';
            catSel.value   = '';
            sortSel.value  = 'date-asc';
            updateView();
            search.focus();
        });
    }

    /* ── Build category <option>s from cards ───────────────────────── */

    function buildCategoryOptions() {
        var seen = {};
        cards.forEach(function (c) {
            var cat = (c.getAttribute('data-category') || '').trim();
            if (cat && !seen[cat]) {
                seen[cat] = true;
                var opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                catSel.appendChild(opt);
            }
        });
    }

    /* ── Master update ─────────────────────────────────────────────── */

    function updateView() {
        var term = normalize(search.value);
        var cat  = catSel.value;
        var visible = 0;

        cards.forEach(function (card) {
            var title    = normalize(card.getAttribute('data-title') || '');
            var cardCat  = card.getAttribute('data-category') || '';

            var matchSearch = !term || title.indexOf(term) !== -1;
            var matchCat    = !cat  || cardCat === cat;
            var show        = matchSearch && matchCat;

            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        sortCards();
        toggleEmpty(visible);
        updateCounter(visible, cards.length);
    }

    /* ── Sort ──────────────────────────────────────────────────────── */

    function sortCards() {
        var mode = sortSel.value;

        var sorted = cards.slice().sort(function (a, b) {
            if (mode === 'date-asc' || mode === 'date-desc') {
                var dA = new Date(a.getAttribute('data-date') || 0);
                var dB = new Date(b.getAttribute('data-date') || 0);
                return mode === 'date-asc' ? dA - dB : dB - dA;
            }
            var tA = (a.getAttribute('data-title') || '');
            var tB = (b.getAttribute('data-title') || '');
            return tA.localeCompare(tB, 'es', { sensitivity: 'base' });
        });

        sorted.forEach(function (card) { grid.appendChild(card); });
    }

    /* ── Helpers ───────────────────────────────────────────────────── */

    function normalize(s) {
        return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    function toggleEmpty(count) {
        if (empty) {
            empty.hidden = count > 0;
        }
        grid.style.display = count > 0 ? '' : 'none';
    }

    function updateCounter(visible, total) {
        if (!counter) return;
        if (visible === total) {
            counter.textContent = total + (total === 1 ? ' evento' : ' eventos');
        } else {
            counter.textContent = visible + ' de ' + total + ' eventos';
        }
    }

    function debounce(fn, ms) {
        var t;
        return function () {
            clearTimeout(t);
            t = setTimeout(fn, ms);
        };
    }

})();
