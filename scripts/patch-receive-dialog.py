"""
Patch receive-order-dialog.tsx : ajoute l'affichage avance + reste à payer
"""
import sys

path = r'src\app\dashboard\clients\[id]\_components\receive-order-dialog.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target: closing of the "Prix Vente Client" nested div block (LF line endings)
old = '                  </div>\n                </div>\n              </div>\n            </div>\n          </div>'

new = (
    '                  </div>\n'
    '                </div>\n'
    '\n'
    '                {/* Avance versee + Reste a payer (BUG FIX) */}\n'
    '                {Number(order.amountPaid ?? 0) > 0 && (\n'
    '                  <>\n'
    '                    <div className="flex items-center justify-between mt-2">\n'
    '                      <span className="text-xs font-medium text-emerald-600">Avance versee</span>\n'
    '                      <span className="font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg text-sm">\n'
    '                        -{Number(order.amountPaid).toFixed(2)} DH\n'
    '                      </span>\n'
    '                    </div>\n'
    '                    <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 mt-1">\n'
    '                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Reste a payer client</span>\n'
    '                      <span className="font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg">\n'
    '                        {Math.max(0, parseFloat(order.sellingPrice) - Number(order.amountPaid ?? 0)).toFixed(2)} DH\n'
    '                      </span>\n'
    '                    </div>\n'
    '                  </>\n'
    '                )}\n'
    '              </div>\n'
    '            </div>\n'
    '          </div>'
)

if old in content:
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('✅ Patch applied successfully!')
else:
    print('❌ Pattern not found. Showing lines 190-210:')
    lines = content.split('\n')
    for i, line in enumerate(lines[189:210], start=190):
        print(f'L{i}: {repr(line)}')
    sys.exit(1)
