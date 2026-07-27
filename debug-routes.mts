import * as employees from './resources/js/routes/employees/index.ts';

console.log('--- employees.index (callable) ---');
const callable = employees.index;
console.log('typeof callable:', typeof callable);
const r1 = (callable as any)();
console.log('callable() returns:', r1);
console.log('typeof callable().url:', typeof r1?.url);

console.log('--- employees.index.url (bound) ---');
const urlFn = (callable as any).url;
console.log('typeof urlFn:', typeof urlFn);
console.log('urlFn():', urlFn());

console.log('--- route() through helper ---');
import('./resources/js/lib/route.ts').then(({ route }) => {
    console.log("route('employees.index') =", JSON.stringify(route('employees.index')));
    console.log("route('employees.show', 1) =", JSON.stringify(route('employees.show', 1)));
});