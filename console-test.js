// === Item Sources Console Test ===
// Paste this into the browser console on https://source-chunk.github.io/chunk-picker-v2/?sevs-view
// Wait for the map to fully load and tasks to calculate before pasting.

// --- Inject CSS ---
(function() {
    let style = document.createElement('style');
    style.textContent = `
        #highest3Modal > .modal-content { height: 67%; width: 45%; margin-top: -5%; }
        .highest3-searchcontainer { padding: 5px 15px; font-size: 1.7vh; flex-shrink: 0; }
        input#searchHighest3 { font-size: 2.1vh; }
        .highest3-title { font-size: 1.2vw; display: inline-flex; width: 100%; font-weight: bold; background-color: var(--color2); flex-shrink: 0; }
        .highest3-data { overflow-y: auto; flex: 1; }
        .h3-style-button { padding: 10px 1vw; text-align: center; display: flex; align-items: center; cursor: pointer; -webkit-transition-duration: 0.4s; transition-duration: 0.4s; }
        .h3-style-button:hover { background-color: var(--color8); }
        .h3-style-button.h3-active-tab { background-color: var(--color9); }
        .highest3-item { padding: 8px 15px; border-bottom: 1px solid var(--color4); }
        .highest3-item-name { font-weight: bold; padding-bottom: 4px; }
        .highest3-item-source { padding-left: 15px; font-size: 0.9em; color: var(--colorTextAlt); }
        .highest3-item.searchhide { display: none; }
        .highest3-chunk-link { margin-left: 5px; }
        .highest3-chunk-toggle { margin-left: 5px; }
        .highest3-chunk-list { padding-left: 30px; padding-top: 2px; }
        .highest3-chunk-entry { padding: 1px 0; }
    `;
    document.head.appendChild(style);
})();

// --- Inject modal template ---
modalContents['highest3Modal'] = `
    <i class="manual-close pic fa-solid fa-times noscrollhard" onclick="closeHighest3()"></i>
    <div id="highest3-searchcontainer" class="highest3-searchcontainer noscroll">
        <input type="text" placeholder="Search items..." id="searchHighest3" class="noscrollhard"
        oninput="searchHighest3()" autocomplete="off" />
    </div>
    <div id="highest3-title" class="highest3-title noscroll"></div>
    <div id="highest3-data" class="highest3-data noscroll"></div>
`;

// --- State ---
window.highest3ModalOpen = false;
window.highestTab3 = undefined;
window.h3ChunkUid = 0;

// --- Functions ---
window.closeHighest3 = function() {
    highest3ModalOpen = false;
    modalOutsideTime = Date.now();
    $('#highest3Modal').remove();
}

window.switchHighest3Tab = function(tab) {
    highestTab3 = tab;
    $('#highest3-data .h3-style-body').hide();
    $('#highest3-title .h3-style-button').removeClass('h3-active-tab');
    $('#highest3-title .h3-' + tab + '-button').addClass('h3-active-tab');
    $('#highest3-data .h3-' + tab + '-body').show();
    document.getElementById('highest3-data').scrollTop = 0;
}

window.searchHighest3 = function() {
    let searchTemp = ($('#searchHighest3').val() || '').toLowerCase();
    $('#highest3-data .highest3-item').each(function() {
        if ($(this).text().toLowerCase().includes(searchTemp)) {
            $(this).removeClass('searchhide').show();
        } else {
            $(this).addClass('searchhide').hide();
        }
    });
}

window.formatSourceType = function(type) {
    if (type === 'primary-drop') return 'Drop';
    if (type === 'secondary-drop') return 'Drop';
    if (type === 'primary-spawn') return 'Spawn';
    if (type === 'secondary-spawn') return 'Spawn (secondary)';
    if (type === 'shop') return 'Shop';
    if (type.startsWith('multi-')) return 'Processing (' + type.split('-')[1] + ')';
    if (type.startsWith('primary-')) return type.split('-')[1];
    if (type.startsWith('secondary-')) return type.split('-')[1] + ' (secondary)';
    return type;
}

window.getSourceChunks = function(sourceKey, sourceType) {
    if (sourceType.includes('spawn')) {
        let chunkId = sourceKey.split('-')[0];
        return chunkId.match(/^[0-9]+$/) ? [chunkId] : [];
    }
    if (sourceType.includes('drop') && !!baseChunkData['monsters'] && !!baseChunkData['monsters'][sourceKey]) {
        return Object.keys(baseChunkData['monsters'][sourceKey]);
    }
    if (sourceType === 'shop' && !!baseChunkData['shops'] && !!baseChunkData['shops'][sourceKey]) {
        return Object.keys(baseChunkData['shops'][sourceKey]);
    }
    return [];
}

window.getChunkLabel = function(chunkId) {
    let id = chunkId.split('-')[0];
    if (!!chunkInfo && !!chunkInfo['chunks'] && !!chunkInfo['chunks'][id] && !!chunkInfo['chunks'][id]['Nickname']) {
        return chunkInfo['chunks'][id]['Nickname'] + '(' + id + ')';
    }
    return id;
}

window.buildChunkLinksHtml = function(chunks) {
    if (chunks.length === 0) return '';
    if (chunks.length === 1) {
        let id = chunks[0].split('-')[0];
        return ` <span class='noscroll link highest3-chunk-link' onclick='closeHighest3(); scrollToChunkCanvas(${id})'>${getChunkLabel(chunks[0])}</span>`;
    }
    let uid = h3ChunkUid++;
    let html = ` <span class='noscroll highest3-chunk-toggle link' onclick='$(".h3-chunks-${uid}").toggle()'>${chunks.length} chunks ▾</span>`;
    html += `<div class='noscroll highest3-chunk-list h3-chunks-${uid}' style='display:none'>`;
    chunks.forEach((chunk) => {
        let id = chunk.split('-')[0];
        html += `<div class='noscroll highest3-chunk-entry'><span class='noscroll link' onclick='closeHighest3(); scrollToChunkCanvas(${id})'>${getChunkLabel(chunk)}</span></div>`;
    });
    html += `</div>`;
    return html;
}

window.openHighest3 = function() {
    if (!inEntry && !importMenuOpen && !manualModalOpen && !detailsModalOpen && !notesModalOpen && !highscoreMenuOpen && !helpMenuOpen) {
        modal.generate('highest3Modal', onMobile);
        onMobile && hideMobileMenu();
        highest3ModalOpen = true;
        h3ChunkUid = 0;
        $('#searchHighest3').val('');
        $('.highest3-title').empty();
        $('.highest3-data').empty();

        let categories = [
            { name: 'All', match: function() { return true; } },
            { name: 'Drops', match: function(t) { return t.includes('drop'); } },
            { name: 'Spawns', match: function(t) { return t.includes('spawn'); } },
            { name: 'Shops', match: function(t) { return t === 'shop'; } },
            { name: 'Processing', match: function(t) { return t.startsWith('multi-') || (t.startsWith('primary-') && !t.includes('drop') && !t.includes('spawn')) || (t.startsWith('secondary-') && !t.includes('drop') && !t.includes('spawn')); } },
            { name: 'Other', match: function(t) { return !t.includes('drop') && !t.includes('spawn') && t !== 'shop' && !t.startsWith('multi-') && !t.startsWith('primary-') && !t.startsWith('secondary-'); } }
        ];

        categories.forEach((cat) => {
            $('.highest3-title').append(`<div class='noscroll h3-style-button h3-${cat.name}-button' onclick='switchHighest3Tab("${cat.name}")'><span class='noscroll'>${cat.name}</span></div>`);
            $('.highest3-data').append(`<div class='noscroll h3-style-body h3-${cat.name}-body'></div>`);
        });

        if (!baseChunkData || !baseChunkData['items'] || Object.keys(baseChunkData['items']).length === 0) {
            categories.forEach((cat) => {
                $(`.h3-${cat.name}-body`).append(`<div class='noscroll highest3-item'><div class='noscroll highest3-item-name'>No items available. Unlock chunks and calculate tasks first.</div></div>`);
            });
        } else {
            Object.keys(baseChunkData['items']).filter((item) => !item.includes('^')).sort().forEach((itemName) => {
                let sources = baseChunkData['items'][itemName];
                let displayName = itemName.replaceAll(/~/g, '').replaceAll(/\|/g, '').replaceAll(/\*/g, '');
                let sourceEntries = [];
                Object.keys(sources).forEach((sourceKey) => {
                    let sourceType = sources[sourceKey];
                    let sourceDisplay = sourceKey.replaceAll(/~\|/g, '').replaceAll(/\|~/g, '').replaceAll(/~/g, '').replaceAll(/\|/g, '').replaceAll(/\*/g, '');
                    let chunks = getSourceChunks(sourceKey, sourceType);
                    let chunkLinksHtml = buildChunkLinksHtml(chunks);
                    let dropRate = sourceType.includes('drop') && !!dropRatesGlobal[sourceKey] && !!dropRatesGlobal[sourceKey][itemName] ? ' (' + dropRatesGlobal[sourceKey][itemName] + ')' : '';
                    let allHtml = sourceType.includes('spawn')
                        ? `<div class='noscroll highest3-item-source'>${formatSourceType(sourceType)}${chunkLinksHtml}</div>`
                        : `<div class='noscroll highest3-item-source'>${sourceDisplay} — ${formatSourceType(sourceType)}${dropRate}${chunkLinksHtml}</div>`;
                    let filteredHtml = sourceType.includes('spawn')
                        ? `<div class='noscroll highest3-item-source'>${chunkLinksHtml.trim() || formatSourceType(sourceType)}</div>`
                        : `<div class='noscroll highest3-item-source'>${sourceDisplay}${dropRate}${chunkLinksHtml}</div>`;
                    sourceEntries.push({ type: sourceType, allHtml: allHtml, filteredHtml: filteredHtml });
                });
                categories.forEach((cat) => {
                    let filtered = cat.name === 'All' ? sourceEntries : sourceEntries.filter((e) => cat.match(e.type));
                    if (filtered.length > 0) {
                        let itemHtml = `<div class='noscroll highest3-item'><div class='noscroll highest3-item-name'>${displayName}</div>`;
                        filtered.forEach((e) => { itemHtml += cat.name === 'All' ? e.allHtml : e.filteredHtml; });
                        itemHtml += `</div>`;
                        $(`.h3-${cat.name}-body`).append(itemHtml);
                    }
                });
            });
        }

        if (highestTab3 === undefined) {
            highestTab3 = 'All';
        }
        $('#highest3-data .h3-style-body').hide();
        $('.h3-' + highestTab3 + '-button').addClass('h3-active-tab');
        $('.h3-' + highestTab3 + '-body').show();
        $('#highest3Modal').show();
        modalOutsideTime = Date.now();
        document.getElementById('highest3-data').scrollTop = 0;
    }
}

// --- Quick data check ---
let itemCount = baseChunkData && baseChunkData['items'] ? Object.keys(baseChunkData['items']).length : 0;
let monsterCount = baseChunkData && baseChunkData['monsters'] ? Object.keys(baseChunkData['monsters']).length : 0;
let shopCount = baseChunkData && baseChunkData['shops'] ? Object.keys(baseChunkData['shops']).length : 0;
console.log(`[Item Sources] Ready. ${itemCount} items, ${monsterCount} monsters, ${shopCount} shops in baseChunkData.`);
if (itemCount === 0) {
    console.warn('[Item Sources] baseChunkData is empty. Make sure tasks have been calculated first (click "Calculate Tasks" in the chunk panel if needed).');
}
// Bind search input via jQuery since inline oninput can't see window-scoped functions in console context
$(document).on('input', '#searchHighest3', function() { searchHighest3(); });

// Block clicks from passing through the modal to the canvas (console-test only — real deployment uses guard conditions)
$(document).on('mousedown mouseup click touchstart touchend', '#highest3Modal', function(e) {
    if (!$(e.target).hasClass('link') && !$(e.target).hasClass('h3-style-button') && !$(e.target).closest('.h3-style-button').length && !$(e.target).hasClass('manual-close')) {
        e.stopPropagation();
    }
});

console.log('[Item Sources] Run openHighest3() to open the modal.');
