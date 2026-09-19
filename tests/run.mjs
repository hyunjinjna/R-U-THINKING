// lib/*.js는 ESM(import/export)이지만 확장자가 .js라 node가 CJS로 읽는다 → 임시 복사해서 실행
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
rmSync('/tmp/rt', { recursive: true, force: true }); mkdirSync('/tmp/rt/lib', { recursive: true }); mkdirSync('/tmp/rt/tests');
cpSync('lib', '/tmp/rt/lib', { recursive: true }); cpSync('tests', '/tmp/rt/tests', { recursive: true });
writeFileSync('/tmp/rt/package.json', '{"type":"module"}');
// 상대 import에 .js 확장자 붙이기
import { readdirSync, readFileSync } from 'node:fs';
for (const f of readdirSync('/tmp/rt/lib')) { const p = '/tmp/rt/lib/' + f; writeFileSync(p, readFileSync(p, 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.js'")); }
await import('/tmp/rt/tests/dashboard.test.mjs');
await import('/tmp/rt/tests/week.test.mjs');
