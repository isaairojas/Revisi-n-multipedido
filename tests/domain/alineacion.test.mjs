/**
 * Alineación demo ↔ specs. La verdad vive en el `sdd/` de exodus-gtm-pwa (principio 5); la demo la sigue.
 * `tests/alineacion/escenarios-spec.json` es la foto de esas specs (se regenera con `npm run specs:foto`).
 * Esta demo solo cubre la finalización del surtido: los escenarios de `tests/alineacion/alcance-revision.json`. El resto
 * vive en la demo de surtido multipedido (https://github.com/isaairojas/HH-Surtido-Multiorden). Desde el 2026-11-26 la
 * demo es para el usuario final y no muestra los escenarios de `tests/alineacion/fuera-demo-usuario.json`.
 *
 * - Cada caso del catálogo nombra un requisito y un escenario que existen en la spec, con el nombre exacto.
 * - Cada escenario de la spec tiene caso en la demo, o está en `pendientes.json` con el motivo.
 * - `pendientes.json` solo baja: un pendiente que ya tiene caso hace fallar la prueba hasta quitarlo.
 *
 * Correr con: npm run test:domain
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { CASOS as TODOS } from '../../src/navigation/catalogo.ts';

// Los casos de una propuesta sin spec (revisión multipedido) no se comparan con la foto de las specs.
const CASOS = TODOS.filter((x) => !x.propuesta);

const leer = (archivo) => JSON.parse(fs.readFileSync(new URL(`../alineacion/${archivo}`, import.meta.url), 'utf8'));
const alcance = leer('alcance-revision.json');
const pendientes = leer('pendientes.json');
const fueraDemo = leer('fuera-demo-usuario.json');

const clave = (x) => `${x.cambio} · ${x.requisito} · ${x.escenario}`;
const enAlcanceEsc = new Set(alcance.escenarios.map(clave));
const enAlcance = (x) => alcance.requisitos.some((r) => r.cambio === x.cambio && r.requisito === x.requisito) || enAlcanceEsc.has(clave(x));
const fuera = new Set(fueraDemo.escenarios.map(clave));
const foto = { escenarios: leer('escenarios-spec.json').escenarios.filter((x) => enAlcance(x) && !fuera.has(clave(x))) };
const enSpec = new Set(foto.escenarios.map(clave));
const enDemo = new Set(CASOS.map(clave));
const faltan = new Set(pendientes.faltan.map((p) => clave(p)));
const desalineados = new Set(pendientes.desalineados.map((p) => clave(p)));

test('cada caso de la demo nombra un escenario que existe en la spec', () => {
  const sueltos = CASOS.filter((x) => !enSpec.has(clave(x)) && !desalineados.has(clave(x))).map(clave);
  assert.deepEqual(sueltos, [], 'Casos con requisito o escenario que no están en la spec (¿se renombró? corre `npm run specs:foto`)');
});

test('cada escenario de la spec tiene caso en la demo o está pendiente con su motivo', () => {
  const sinCaso = foto.escenarios.filter((x) => !enDemo.has(clave(x)) && !faltan.has(clave(x))).map(clave);
  assert.deepEqual(sinCaso, [], 'Escenarios de la spec sin caso en la demo');
});

test('los pendientes no están ya resueltos', () => {
  const resueltos = [
    ...pendientes.faltan.filter((p) => enDemo.has(clave(p))),
    ...pendientes.desalineados.filter((p) => enSpec.has(clave(p)) || !enDemo.has(clave(p))),
  ].map(clave);
  assert.deepEqual(resueltos, [], 'Quita de pendientes.json lo que ya está alineado');
  for (const p of [...pendientes.faltan, ...pendientes.desalineados]) assert.ok(p.motivo, `Pendiente sin motivo: ${clave(p)}`);
});

test('el alcance nombra requisitos y escenarios que existen en la spec', () => {
  const todos = leer('escenarios-spec.json').escenarios;
  const sueltos = [
    ...alcance.requisitos.filter((r) => !todos.some((x) => x.cambio === r.cambio && x.requisito === r.requisito)).map((r) => `${r.cambio} · ${r.requisito}`),
    ...alcance.escenarios.filter((e) => !todos.some((x) => clave(x) === clave(e))).map(clave),
  ];
  assert.deepEqual(sueltos, [], 'Revisa alcance-revision.json (¿se renombró en la spec?)');
});

test('ningún caso es "regla" si su nombre ya es un escenario de la spec', () => {
  const reglas = CASOS.filter((x) => x.extra && enSpec.has(clave(x))).map(clave);
  assert.deepEqual(reglas, [], 'Quita `extra: true`: ya tienen Scenario en la spec');
});

test('lo que quedó fuera de la demo existe en la spec y no tiene caso', () => {
  const todos = new Set(leer('escenarios-spec.json').escenarios.map(clave));
  const sueltos = fueraDemo.escenarios.filter((x) => !todos.has(clave(x))).map(clave);
  assert.deepEqual(sueltos, [], 'Revisa fuera-demo-usuario.json (¿se renombró en la spec?)');
  const conCaso = fueraDemo.escenarios.filter((x) => enDemo.has(clave(x))).map(clave);
  assert.deepEqual(conCaso, [], 'Quita de fuera-demo-usuario.json lo que ya tiene caso en la demo');
});
