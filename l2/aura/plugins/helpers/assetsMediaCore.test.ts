/// <mls fileReference="_102020_/l2/aura/plugins/helpers/assetsMediaCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ACCEPT_ATTR, MAX_UPLOAD_BYTES, assetUrl, assetsLocation, categoryOf, checkUpload, formatSize,
    hasImagePreview, isProjectMediaFile, toStorName,
} from '/_102020_/l2/aura/plugins/helpers/assetsMediaCore.js';

test('the project media lives in l3/assets, with one URL for Studio and app', () => {
    assert.deepEqual(assetsLocation(102052), { project: 102052, level: 3, folder: 'assets' });
    assert.equal(assetUrl(102052, 'assets', 'logo', '.png'), '/_102052_/l3/assets/logo.png');
    assert.equal(assetUrl(102052, 'assets/brand', 'logo', '.svg'), '/_102052_/l3/assets/brand/logo.svg');
});

test('the stor name drops accents and spaces and keeps the last extension lowercased', () => {
    assert.deepEqual(toStorName('Logo Ação Final.PNG'), { shortName: 'Logo-Acao-Final', extension: '.png' });
    assert.deepEqual(toStorName('banner.v2.webp'), { shortName: 'bannerv2', extension: '.webp' });
    assert.deepEqual(toStorName('my_font  --  bold.woff2'), { shortName: 'my_font-bold', extension: '.woff2' });
});

test('a name with no usable base or no extension is refused', () => {
    assert.equal(toStorName('semextensao'), null);
    assert.equal(toStorName('.gitignore'), null);
    assert.equal(toStorName('arquivo.'), null);
    assert.equal(toStorName('###.png'), null);
});

test('checkUpload accepts media, refuses other extensions and oversized files', () => {
    assert.deepEqual(checkUpload({ name: 'foto.jpg', size: 1000 }),
        { ok: true, shortName: 'foto', extension: '.jpg', category: 'image' });
    assert.deepEqual(checkUpload({ name: 'setup.exe', size: 10 }), { ok: false, reason: 'extension' });
    assert.deepEqual(checkUpload({ name: 'video.mp4', size: MAX_UPLOAD_BYTES + 1 }), { ok: false, reason: 'size' });
    assert.deepEqual(checkUpload({ name: 'video.mp4', size: MAX_UPLOAD_BYTES }).ok, true);
    assert.deepEqual(checkUpload({ name: '!!!.png', size: 10 }), { ok: false, reason: 'name' });
});

test('fonts are their own category and are in the accept list', () => {
    for (const ext of ['.woff', '.woff2', '.ttf', '.otf']) {
        assert.equal(categoryOf(ext), 'font');
        assert.ok(ACCEPT_ATTR.split(',').includes(ext));
    }
    assert.equal(categoryOf('.SVG'), 'icon');
    assert.equal(categoryOf('.txt'), 'other');
});

test('only images and svg get a real thumbnail', () => {
    assert.equal(hasImagePreview('image'), true);
    assert.equal(hasImagePreview('icon'), true);
    assert.equal(hasImagePreview('font'), false);
    assert.equal(hasImagePreview('video'), false);
});

test('the list takes only live l3/assets media of the project, subfolders included', () => {
    const base = { project: 102052, level: 3, folder: 'assets', extension: '.png', status: 'nochange' };
    assert.equal(isProjectMediaFile(base, 102052), true);
    assert.equal(isProjectMediaFile({ ...base, folder: 'assets/brand' }, 102052), true);
    assert.equal(isProjectMediaFile({ ...base, level: 2 }, 102052), false, 'l2 is not served as an asset');
    assert.equal(isProjectMediaFile({ ...base, status: 'deleted' }, 102052), false);
    assert.equal(isProjectMediaFile({ ...base, folder: 'assetsX' }, 102052), false);
    assert.equal(isProjectMediaFile({ ...base, folder: 'cafeFlow/assets' }, 102052), false, 'module seed data is not project media');
    assert.equal(isProjectMediaFile({ ...base, project: 102051 }, 102052), false);
    assert.equal(isProjectMediaFile({ ...base, extension: '.ts' }, 102052), false);
});

test('formatSize', () => {
    assert.equal(formatSize(undefined), '');
    assert.equal(formatSize(512), '512 B');
    assert.equal(formatSize(2048), '2.0 KB');
    assert.equal(formatSize(3 * 1024 * 1024), '3.0 MB');
});
