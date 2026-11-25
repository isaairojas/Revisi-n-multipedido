/**
 * Revisión multipedido (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md). Cada prueba nombra la regla del
 * intent que comprueba, sobre las semillas que usa el catálogo de la demo.
 *
 * Correr con: npm run test:domain
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { etiqueta } from '../../src/domain/codigos.ts';
import {
  avance,
  evaluarLectura,
  indicador,
  ordenarPartidas,
  pasoFinalizar,
  pedidoEnCurso,
  revisionReducer,
} from '../../src/domain/revision.ts';
import { SIMULACION_INICIAL } from '../../src/domain/simulacion.ts';
import { ESCENARIOS } from '../../src/navigation/escenarios.ts';
import { CASOS } from '../../src/navigation/catalogo.ts';

const rev = (id) => ESCENARIOS[id].revision;
const ids = (s) => s.pedidos.map((p) => `${p.letra}·${p.id}`);

test('R4 · la revisión sigue el orden del surtido y abre el primer pedido', () => {
  const s = rev('revision');
  assert.deepEqual(ids(s), ['A·1001', 'B·1002', 'C·1003']);
  assert.equal(pedidoEnCurso(s).id, '1001');
  assert.deepEqual(indicador(s), { n: 1, total: 3 });
  assert.deepEqual(pedidoEnCurso(s).partidas.map((x) => x.codigo).sort(), ['0486600', '1365800', '1394010', '2389475']);
});

test('R5 · un pedido retirado en el surtido no entra y las letras no cambian', () => {
  const s = rev('revision-sin-b');
  assert.deepEqual(ids(s), ['A·1001', 'C·1003']);
  assert.deepEqual(indicador(s), { n: 1, total: 2 });
});

test('R5 · un pedido negado por completo no entra', () => {
  assert.deepEqual(ids(rev('revision-b-negado')), ['A·1001', 'C·1003']);
});

test('R1 · la bandera de revisión multipedido viene encendida: al finalizar el surtido sigue la revisión', () => {
  assert.equal(SIMULACION_INICIAL.revisionMultipedidoEnHH, true);
  assert.equal(ESCENARIOS['revision-fin-surtido'].simulacion.revisionMultipedidoEnHH, true);
  assert.equal(ESCENARIOS['revision-sin-bandera'].simulacion.revisionMultipedidoEnHH, false);
});

test('R7 · finalizar un pedido abre el siguiente con "Pedido 2 de 3"', () => {
  let s = rev('revision-a-casi');
  const a = pedidoEnCurso(s);
  const r = evaluarLectura(a, etiqueta('1365800', 1));
  assert.deepEqual(r, { tipo: 'ok', codigo: '1365800', cantidad: 1 });
  s = revisionReducer(s, { type: 'sumar', codigo: '1365800', cantidad: 1 });
  assert.equal(avance(pedidoEnCurso(s)), 100);
  assert.deepEqual(pasoFinalizar(pedidoEnCurso(s)), { tipo: 'confirmar', sinDiferencias: true });
  s = revisionReducer(s, { type: 'finalizarPedido' });
  assert.equal(pedidoEnCurso(s).id, '1002');
  assert.equal(pedidoEnCurso(s).letra, 'B');
  assert.deepEqual(indicador(s), { n: 2, total: 3 });
});

test('R8 · al finalizar el último no queda pedido en curso', () => {
  let s = rev('revision-c-ultimo');
  assert.equal(pedidoEnCurso(s).id, '1003');
  s = revisionReducer(s, { type: 'fijar', codigo: '2010000', cantidad: 1 });
  s = revisionReducer(s, { type: 'finalizarPedido' });
  assert.equal(pedidoEnCurso(s), null);
});

test('R9 y R10 · salir descarta el avance del pedido en curso y conserva los finalizados', () => {
  let s = rev('revision-retomar');
  assert.equal(pedidoEnCurso(s).id, '1002');
  assert.ok(avance(pedidoEnCurso(s)) > 0);
  s = revisionReducer(s, { type: 'descartarAvance' });
  assert.equal(s.pedidos[0].estado, 'revisado');
  assert.equal(pedidoEnCurso(s).id, '1002');
  assert.equal(avance(pedidoEnCurso(s)), 0);
  assert.deepEqual(indicador(s), { n: 2, total: 3 });
});

test('R11 · orden de la lista: parciales, sin revisar, completos; por código', () => {
  const s = revisionReducer(revisionReducer(rev('revision'), { type: 'sumar', codigo: '0486600', cantidad: 3 }), {
    type: 'fijar',
    codigo: '1394010',
    cantidad: 4,
  });
  assert.deepEqual(ordenarPartidas(pedidoEnCurso(s).partidas).map((x) => x.codigo), ['0486600', '1365800', '2389475', '1394010']);
});

test('R12 · rechazos del escaneo en el pedido en curso', () => {
  const a = pedidoEnCurso(rev('revision'));
  assert.equal(evaluarLectura(a, '12345').tipo, 'invalido');
  assert.equal(evaluarLectura(a, etiqueta('9999999', 1)).tipo, 'incorrecto');
  // 2012000 está en B y C, no en A.
  assert.equal(evaluarLectura(a, etiqueta('2012000', 1)).tipo, 'incorrecto');
  assert.equal(evaluarLectura(a, '0486600').tipo, 'manual');
  assert.equal(evaluarLectura(a, etiqueta('0486600', 12)).tipo, 'sobrante');
  assert.equal(evaluarLectura(a, '1394010').tipo, 'simplificada');
  assert.equal(evaluarLectura(a, etiqueta('1394010', 1)).tipo, 'simplificada');
});

test('R16 · orden al finalizar: promoción, discrepancias y corporativo', () => {
  const promo = pasoFinalizar(pedidoEnCurso(rev('revision-promocion')));
  assert.equal(promo.tipo, 'promocion');
  assert.deepEqual(promo.codigos.map((x) => `${x.codigo} ${x.revisado} de ${x.surtido}`), ['0486600 5 de 11', '2389475 2 de 2']);

  let s = rev('revision-discrepancias');
  assert.deepEqual(pasoFinalizar(pedidoEnCurso(s)), { tipo: 'discrepancias', codigos: ['0486600', '1365800'] });
  s = revisionReducer(s, { type: 'negar', codigo: '0486600', negacion: { tipo: 'parcialidad', motivo: 'Sin existencia' } });
  s = revisionReducer(s, { type: 'negar', codigo: '1365800', negacion: { tipo: 'negado', motivo: 'Sin existencia' } });
  assert.deepEqual(pasoFinalizar(pedidoEnCurso(s)), { tipo: 'confirmar', sinDiferencias: false });
  s = revisionReducer(s, { type: 'quitarNegaciones' });
  assert.equal(pasoFinalizar(pedidoEnCurso(s)).tipo, 'discrepancias');

  const corp = rev('revision-corporativo');
  assert.equal(pedidoEnCurso(corp).id, '1002');
  assert.deepEqual(pasoFinalizar(pedidoEnCurso(corp)), { tipo: 'corporativo' });
  const tras = revisionReducer(corp, { type: 'retirarPedido' });
  assert.equal(pedidoEnCurso(tras).id, '1003');
  assert.deepEqual(indicador(tras), { n: 3, total: 3 });
});

test('cada caso de revisión del catálogo apunta a una semilla que existe', () => {
  const sueltos = CASOS.filter((x) => x.propuesta && !ESCENARIOS[x.semilla]).map((x) => x.id);
  assert.deepEqual(sueltos, []);
});
