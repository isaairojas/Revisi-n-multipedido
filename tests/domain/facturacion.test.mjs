/**
 * Facturación y embarque de la ronda, tarea 35 (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md · R18–R27).
 * Cada prueba nombra la regla del intent que comprueba, sobre las semillas del catálogo de la demo.
 *
 * Correr con: npm run test:domain
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  embarquesCompatibles,
  facturacionDesdeRevision,
  facturacionReducer,
  indicador,
  pedidoEnCurso,
} from '../../src/domain/facturacion.ts';
import { revisionReducer } from '../../src/domain/revision.ts';
import { SIMULACION_INICIAL } from '../../src/domain/simulacion.ts';
import { FACTURACION_BASE, PRECIOS, datosFactura } from '../../src/mocks/facturacion.ts';
import { ESCENARIOS } from '../../src/navigation/escenarios.ts';

const fac = (id) => ESCENARIOS[id].facturacion;
const ids = (s) => s.pedidos.map((p) => `${p.letra}·${p.id}`);

test('R18 · la tarea 35 nace de la revisión cerrada con los pedidos revisados, en su orden', () => {
  const s = fac('facturacion');
  assert.deepEqual(ids(s), ['A·1001', 'B·1002', 'C·1003']);
  assert.equal(pedidoEnCurso(s).id, '1001');
  assert.deepEqual(indicador(s), { n: 1, total: 3 });
  // Total de A: 11×285.50 + 2×189 + 4×39.90 + 1×612
  assert.equal(pedidoEnCurso(s).total, 4290.1);
});

test('R18 · un pedido sacado de la ronda en la revisión no entra a la tarea 35', () => {
  const rev = revisionReducer(ESCENARIOS['revision-corporativo'].revision, { type: 'retirarPedido' });
  const cerrada = { ...rev, pedidos: rev.pedidos.map((p) => (p.estado === 'pendiente' ? { ...p, estado: 'revisado' } : p)) };
  const s = facturacionDesdeRevision(cerrada, PRECIOS, datosFactura(), FACTURACION_BASE);
  assert.deepEqual(ids(s), ['A·1001', 'C·1003']);
});

test('R18 · los traspasos de la ronda no entran a la facturación', () => {
  let rev = ESCENARIOS['facturacion-con-traspaso'].revision;
  assert.equal(rev.pedidos[1].traspaso, true);
  rev = revisionReducer(revisionReducer(rev, { type: 'fijar', codigo: '2010000', cantidad: 1 }), { type: 'finalizarPedido' });
  const s = facturacionDesdeRevision(rev, PRECIOS, datosFactura(), FACTURACION_BASE);
  assert.deepEqual(ids(s), ['A·1001', 'C·1003']);
  assert.deepEqual(indicador(s), { n: 1, total: 2 });
});

test('R22 · facturar asigna el folio y no avanza de pedido hasta embarcar', () => {
  let s = facturacionReducer(fac('facturacion'), { type: 'facturar', timbrada: true });
  assert.deepEqual(pedidoEnCurso(s).factura, { folio: '1099204', estado: 'timbrada' });
  assert.equal(pedidoEnCurso(s).id, '1001');
  s = facturacionReducer(s, { type: 'facturar', timbrada: true });
  assert.equal(s.siguienteFolio, 1099205, 'facturar dos veces no genera otro folio');
});

test('R23 · una factura sin timbrar se puede timbrar después', () => {
  let s = facturacionReducer(fac('facturacion'), { type: 'facturar', timbrada: false });
  assert.equal(pedidoEnCurso(s).factura.estado, 'sin-timbrar');
  s = facturacionReducer(s, { type: 'timbrar' });
  assert.equal(pedidoEnCurso(s).factura.estado, 'timbrada');
});

test('R25 · embarque compatible solo con mismo cliente y misma dirección', () => {
  assert.deepEqual(embarquesCompatibles(fac('embarque-nuevo'), pedidoEnCurso(fac('embarque-nuevo'))), []);
  const otra = fac('embarque-otra-direccion');
  assert.equal(otra.embarques.length, 1);
  assert.deepEqual(embarquesCompatibles(otra, pedidoEnCurso(otra)), [], 'el de otra dirección no se ofrece');
  const b = fac('embarque-previo-b');
  assert.equal(pedidoEnCurso(b).id, '1002');
  assert.deepEqual(embarquesCompatibles(b, pedidoEnCurso(b)).map((e) => e.id), ['147650']);
});

test('R25 y R27 · C se agrega al embarque de A (mismo cliente y dirección) y la tarea termina', () => {
  let s = fac('embarque-c-mismo-cliente');
  const c = pedidoEnCurso(s);
  assert.equal(c.id, '1003');
  assert.deepEqual(indicador(s), { n: 3, total: 3 });
  assert.deepEqual(embarquesCompatibles(s, c).map((e) => e.id), ['147707'], 'el de B (otro cliente) no se ofrece');
  s = facturacionReducer(s, { type: 'ligarEmbarque', embarqueId: '147707' });
  assert.equal(s.embarques.find((e) => e.id === '147707').facturas, 2);
  assert.equal(pedidoEnCurso(s), null);
});

test('R25 · crear un embarque nuevo liga la factura y avanza al siguiente pedido', () => {
  let s = facturacionReducer(fac('embarque-nuevo'), { type: 'crearEmbarque', paqueteria: 'DHL', comentario: 'Recibe almacén' });
  assert.equal(s.pedidos[0].embarqueId, '147707');
  assert.equal(s.embarques[0].paqueteria, 'DHL');
  assert.equal(pedidoEnCurso(s).id, '1002');
  assert.deepEqual(indicador(s), { n: 2, total: 3 });
});

test('R27 · al retomar se abre el primer pedido sin embarque', () => {
  const s = fac('facturacion-retomar');
  assert.equal(pedidoEnCurso(s).id, '1002');
  assert.ok(pedidoEnCurso(s).factura, 'B ya está facturado: se abre en "Continuar a embarque"');
});

test('R20 · banderas de las semillas de la tarea 35', () => {
  assert.equal(ESCENARIOS['facturacion-sin-bandera'].simulacion.facturacionEnHH, false);
  assert.equal(ESCENARIOS['facturacion-concluida-en-otro'].simulacion.facturacionConcluidaEnOtro, true);
  assert.equal(SIMULACION_INICIAL.facturacionEnHH, true, 'la demo sigue de la revisión a la facturación sin cortes');
});
