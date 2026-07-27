import { route } from './resources/js/lib/route.ts';

const cases: [string, unknown[]][] = [
    ['dashboard', []],
    ['employees.index', []],
    ['employees.create', []],
    ['employees.show', [1]],
    ['employees.edit', [1]],
    ['employees.store', []],
    ['employees.update', [1]],
    ['employees.destroy', [1]],
    ['users.index', []],
    ['users.create', []],
    ['users.show', [1]],
    ['users.edit', [1]],
    ['users.store', []],
    ['users.update', [1]],
    ['users.destroy', [1]],
    ['roles.index', []],
    ['roles.create', []],
    ['roles.show', [1]],
    ['roles.edit', [1]],
    ['roles.store', []],
    ['roles.update', [1]],
    ['roles.destroy', [1]],
    ['permissions.index', []],
    ['permissions.create', []],
    ['permissions.show', [1]],
    ['permissions.edit', [1]],
    ['permissions.store', []],
    ['permissions.update', [1]],
    ['permissions.destroy', [1]],
];

let pass = 0;
let fail = 0;
for (const [name, args] of cases) {
    try {
        const url = route(name, ...args);
        if (typeof url !== 'string' || url.length === 0) {
            fail++;
            console.error(`FAIL ${name}: empty URL`);
            continue;
        }
        if (!url.startsWith('/') && !url.startsWith('http')) {
            fail++;
            console.error(`FAIL ${name}: unexpected URL "${url}"`);
            continue;
        }
        pass++;
        console.log(`  OK  ${name.padEnd(22)} -> ${url}`);
    } catch (e) {
        fail++;
        console.error(`FAIL ${name}: ${(e as Error).message}`);
    }
}

try {
    route('totally.unknown.route');
    fail++;
    console.error('FAIL  unknown-name: did not throw');
} catch {
    pass++;
    console.log('  OK  unknown-name (throws as expected)');
}

console.log(`\n=== RESULT ===\nPass: ${pass}\nFail: ${fail}\n`);
process.exit(fail === 0 ? 0 : 1);