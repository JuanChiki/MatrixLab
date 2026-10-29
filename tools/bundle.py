import re, sys, os
root = sys.argv[1]; entry = sys.argv[2]; out = sys.argv[3]
mods = {}; order = []
imp_re = re.compile(r'^import\s+(.+?)\s+from\s+"(\.{1,2}/[^"]+)";?[ \t]*$', re.M | re.S)
def load(path):
    path = os.path.normpath(path)
    if path in mods: return
    src = open(path, encoding='utf-8').read()
    mods[path] = None
    deps = []
    def repl(m):
        spec, rel = m.group(1).strip(), m.group(2)
        dep = os.path.normpath(os.path.join(os.path.dirname(path), rel))
        load(dep)
        key = repr(os.path.relpath(dep, root))
        if spec.startswith('* as '):
            return f'const {spec[5:].strip()} = __req({key});'
        names = spec.strip('{} \n')
        names = ', '.join(n.strip().replace(' as ', ': ') for n in names.split(',') if n.strip())
        return f'const {{ {names} }} = __req({key});'
    body = imp_re.sub(repl, src)
    exports = []
    def exp(m):
        exports.append(m.group(3))
        return m.group(1) + m.group(2) + ' ' + m.group(3)
    body = re.sub(r'^(export )(async function\*?|function\*?|class|const|let|var)\s+(\w+)', lambda m: (exports.append(m.group(3)) or m.group(2) + ' ' + m.group(3)), body, flags=re.M)
    body = re.sub(r'^export \{([^}]*)\};?', lambda m: exports.extend(n.strip() for n in m.group(1).split(',') if n.strip()) or '', body, flags=re.M)
    assert not re.search(r'^\s*(import|export)\s', body, re.M), path
    assert 'import.meta' not in body
    # multi-const exports like "export const a = 1, b = 2" not expected
    mods[path] = (body, exports); order.append(path)
load(os.path.join(root, entry))
parts = ['(function () {\n"use strict";\nconst __defs = {}, __cache = {};\nfunction __req(k) { if (!__cache[k]) { const e = __cache[k] = {}; __defs[k](e); } return __cache[k]; }\n']
for p in order:
    body, ex = mods[p]
    key = repr(os.path.relpath(p, root))
    parts.append(f'__defs[{key}] = function (__exports) {{\n{body}\n' + ''.join(f'__exports.{n} = {n};\n' for n in ex) + '};\n')
parts.append(f'__req({os.path.relpath(os.path.join(root, entry), root)!r});\n}})();\n')
open(out, 'w', encoding='utf-8').write(''.join(parts))
print(len(order), 'módulos')
