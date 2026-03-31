#!/usr/bin/env node

// Enriches chunkpicker-chunkinfo-export.json with spawn coordinates from the OSRS wiki.
//
// Reads all unique spawn item names from the chunk data, batch-queries the OSRS wiki
// MediaWiki API for their wikitext, parses ItemSpawnLine templates to extract x,y
// coordinates, and writes the result into a top-level "spawnCoordinates" key.
//
// Usage:
//   node scripts/enrichSpawnCoordinates.js
//
// Can be run manually or as part of an automated pipeline (e.g., git hook after
// upstream JSON updates). Idempotent — safe to re-run at any time.
//
// Requires: node 18+ (for native fetch) or install node-fetch

const fs = require('fs');
const path = require('path');

const JSON_FILE = path.join(__dirname, '../chunkpicker-chunkinfo-export.json');
const BATCH_SIZE = 50;
const API_BASE = 'https://oldschool.runescape.wiki/api.php';
const REQUEST_DELAY_MS = 200;

let collectSpawnItems = function(chunkInfo) {
    let items = new Set();
    !!chunkInfo['chunks'] && Object.keys(chunkInfo['chunks']).forEach((chunkId) => {
        let chunk = chunkInfo['chunks'][chunkId];
        !!chunk['Spawn'] && Object.keys(chunk['Spawn']).forEach((item) => { items.add(item); });
        !!chunk['Sections'] && Object.keys(chunk['Sections']).forEach((section) => {
            !!chunk['Sections'][section]['Spawn'] && Object.keys(chunk['Sections'][section]['Spawn']).forEach((item) => { items.add(item); });
        });
    });
    return [...items];
}

let parseSpawnLines = function(wikitext, itemName) {
    let spawns = [];
    let regex = /\{\{ItemSpawnLine\|((?:[^{}]|\{\{[^}]*\}\})*)\}\}/g;
    let match;
    while ((match = regex.exec(wikitext)) !== null) {
        let params = match[1];
        let location = '';
        let locationMatch = params.match(/location=\[\[([^\]|]+)/);
        if (locationMatch) {
            location = locationMatch[1];
        } else {
            let locationMatch2 = params.match(/location=([^|]+)/);
            if (locationMatch2) { location = locationMatch2[1].replace(/\[\[/g, '').replace(/\]\]/g, ''); }
        }
        let coordRegex = /\|(\d{3,4}),(\d{3,5})(?:,qty:\d+)?\|/g;
        let allParams = '|' + params + '|';
        let coordMatch;
        while ((coordMatch = coordRegex.exec(allParams)) !== null) {
            let x = parseInt(coordMatch[1]);
            let y = parseInt(coordMatch[2]);
            if (x >= 960 && x <= 4031 && y >= 2048 && y <= 4223) {
                spawns.push({ x: x, y: y, location: location });
            }
        }
    }
    return spawns;
}

let sleep = function(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let fetchBatch = async function(itemNames) {
    let titles = itemNames.map((name) => name.replaceAll(/ /g, '_')).join('|');
    let url = API_BASE + '?action=query&titles=' + encodeURIComponent(titles) + '&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*';
    let response = await fetch(url);
    let data = await response.json();
    let results = {};
    !!data && !!data.query && !!data.query.pages && Object.values(data.query.pages).forEach((page) => {
        if (!!page.revisions && page.revisions.length > 0) {
            let content = page.revisions[0].slots.main['*'];
            let title = page.title;
            let spawns = parseSpawnLines(content, title);
            if (spawns.length > 0) {
                results[title] = spawns;
            }
        }
    });
    return results;
}

let main = async function() {
    console.log('Reading', JSON_FILE);
    let raw = fs.readFileSync(JSON_FILE, 'utf8');
    let chunkInfo = JSON.parse(raw);

    let items = collectSpawnItems(chunkInfo);
    console.log('Found', items.length, 'unique spawn items');

    if (items.length === 0) {
        console.log('No spawn items found. Exiting.');
        process.exit(0);
    }

    let batches = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
    }
    console.log('Fetching from OSRS wiki in', batches.length, 'batches...');

    let allSpawns = {};
    for (let i = 0; i < batches.length; i++) {
        console.log('  Batch', (i + 1) + '/' + batches.length, '(' + batches[i].length + ' items)');
        try {
            let results = await fetchBatch(batches[i]);
            Object.keys(results).forEach((title) => { allSpawns[title] = results[title]; });
        } catch (e) {
            console.error('  Error fetching batch', (i + 1) + ':', e.message);
        }
        if (i < batches.length - 1) { await sleep(REQUEST_DELAY_MS); }
    }

    let totalCoords = 0;
    Object.values(allSpawns).forEach((arr) => { totalCoords += arr.length; });
    console.log('Parsed', Object.keys(allSpawns).length, 'items with', totalCoords, 'total spawn coordinates');

    chunkInfo['spawnCoordinates'] = allSpawns;

    console.log('Writing enriched JSON...');
    fs.writeFileSync(JSON_FILE, JSON.stringify(chunkInfo, null, '\t'), 'utf8');
    console.log('Done.');
}

main().catch((e) => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
