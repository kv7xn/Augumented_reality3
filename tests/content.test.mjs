import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';
import { bodies } from '../site/content.js';

test('Both physics models have complete, unique topics and references', () => {
  assert.deepEqual(Object.keys(bodies), ['earth', 'sun']);
  for (const body of Object.values(bodies)) {
    assert.equal(body.topics.length, 8);
    assert.equal(new Set(body.topics.map(topic => topic.id)).size, 8);
    assert.equal(body.stats.length, 3);
    assert.ok(body.source.startsWith('https://science.nasa.gov/'));
    for (const topic of body.topics) {
      assert.ok(topic.description.length > 100);
      assert.ok(topic.equation.length > 10);
      assert.ok(['surface', 'cutaway', 'field'].includes(topic.view));
      if (topic.view === 'cutaway') assert.ok(Number.isInteger(topic.layer));
    }
  }
});

test('Build includes actual compiled recognition data and PNG pictures', async () => {
  assert.ok((await stat('public/targets/planets.mind')).size > 1000);
  for (const name of ['earth', 'sun']) {
    const png = await readFile(`public/targets/${name}.png`);
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16),720);
    assert.equal(png.readUInt32BE(20),900);
  }
});

test('Deployed entry points use relative links and no QR dependencies', async () => {
  const html = await readFile('public/index.html', 'utf8');
  assert.ok(html.includes('lang="en"'));
  assert.ok(html.includes('./app.js'));
  assert.ok(html.includes('./responsive.css'));
  assert.ok(!html.includes('src="/'));
});
