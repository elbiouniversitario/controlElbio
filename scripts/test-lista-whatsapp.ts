/**
 * Tests del parser de listas de WhatsApp, sin runner.
 * Correr:  node scripts/test-lista-whatsapp.ts   (Node 22.18+ / 24, type stripping)
 */
import { limpiarLinea, parsearLista, type CandidatoLista } from '../src/lib/listaWhatsapp.ts';

const plantel: CandidatoLista[] = [
  { id: 'p1', nombre: 'Agustín', apellido: 'Moreira', apodo: 'Tano' },
  { id: 'p2', nombre: 'Lucas', apellido: 'Méndez' },
  { id: 'p3', nombre: 'Santiago', apellido: 'Varela', apodo: 'Santi' },
  { id: 'p4', nombre: 'Mateo', apellido: 'Silveira' },
  { id: 'p5', nombre: 'Sebastián', apellido: 'Gómez' },
  { id: 'p6', nombre: 'Matías', apellido: 'Rivas' },
  { id: 'p7', nombre: 'Nicolás', apellido: 'Benítez' },
  { id: 'p8', nombre: 'Martín', apellido: 'Castro' },
  { id: 'p9', nombre: 'Joaquín', apellido: 'Méndez' },
];

let fallas = 0;
function igual<T>(real: T, esperado: T, que: string) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas++;
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${que}${ok ? '' : `\n      esperado ${JSON.stringify(esperado)}\n      real     ${JSON.stringify(real)}`}`);
}
const uno = (linea: string) => parsearLista(linea, plantel)[0];

// --- Limpieza ---
igual(limpiarLinea('1. Lucas Méndez'), 'Lucas Méndez', 'numeración "1."');
igual(limpiarLinea('12) Seba ⚽️'), 'Seba', 'numeración "12)" + emoji con selector');
igual(limpiarLinea('3 - Mateo (arquero)'), 'Mateo', 'guion y paréntesis');
igual(limpiarLinea('• Nico 👍🏽'), 'Nico', 'viñeta + emoji con tono');
igual(limpiarLinea('[11/11/26, 20:01] Juan Pérez: Martín Castro'), 'Martín Castro', 'prefijo de export de chat');

// --- Matcheo ---
igual([uno('Lucas Mendez').estado, uno('Lucas Mendez').jugadorId], ['seguro', 'p2'], 'nombre + apellido sin tilde');
igual([uno('MORERA').estado, uno('MORERA').jugadorId], ['seguro', 'p1'], 'apellido con un error de tipeo');
igual([uno('Seba').estado, uno('Seba').jugadorId], ['seguro', 'p5'], 'abreviatura de nombre');
igual([uno('Tano').estado, uno('Tano').jugadorId], ['seguro', 'p1'], 'apodo');
igual([uno('Santi V').estado, uno('Santi V').jugadorId], ['seguro', 'p3'], 'apodo + inicial');
igual(uno('Méndez').estado, 'duda', 'apellido compartido → duda');
igual(uno('Méndez').candidatos.map((c) => c.id).sort(), ['p2', 'p9'], 'duda ofrece los dos Méndez');
igual(uno('Mat').estado, 'duda', '"Mat" puede ser Mateo, Matías o Martín');
igual(uno('Federico').estado, 'no_encontrado', 'nombre que no está en el plantel');
igual(uno('❌ Lucas no voy').estado, 'ignorada', 'el que avisa que no va');
igual(uno('------').estado, 'ignorada', 'separador');

// --- Lista completa ---
const lista = `Práctica martes 20 hs Parque Rodó, anotarse 👇
1. Lucas Méndez
2. Seba
3. Tano ✅
4. Martin Castro
5. lucas mendez
6. Federico`;
const r = parsearLista(lista, plantel);
igual(
  r.map((l) => l.estado),
  ['ignorada', 'seguro', 'seguro', 'seguro', 'seguro', 'repetido', 'no_encontrado'],
  'lista completa: encabezado, 4 seguros, un repetido, uno desconocido'
);

// Encabezado corto (≤4 palabras) arriba de una lista numerada: también se ignora.
igual(
  parsearLista('Práctica jueves 20hs\n1. Lucas Méndez\n2. Federico', plantel).map((l) => l.estado),
  ['ignorada', 'seguro', 'no_encontrado'],
  'encabezado corto en lista numerada'
);
// Sin numeración, un nombre desconocido sigue siendo "no lo encuentro".
igual(
  parsearLista('Lucas Méndez\nFederico', plantel).map((l) => l.estado),
  ['seguro', 'no_encontrado'],
  'lista sin numerar'
);

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo ok');
process.exit(fallas ? 1 : 0);
