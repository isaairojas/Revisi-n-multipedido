/**
 * Las semillas de la demo dan los números de la spec. Cada prueba lleva el nombre del escenario (cambio ·
 * requisito · escenario) y comprueba, sobre la semilla que usa su caso del catálogo, el GIVEN y el THEN que se
 * pueden calcular en el dominio. Lo que solo se ve en pantalla (resaltados, modales, navegación) queda para QA.
 *
 * Correr con: npm run test:domain
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { SIMULACION_INICIAL } from '../../src/domain/simulacion.ts';
import {
  codigosParciales,
  corporativoIncompleto,
  letraDe,
  ordenarListado,
  productosVista,
  productoVista,
  promocionesPendientes,
  rondaReducer,
} from '../../src/domain/ronda.ts';
import { ESCENARIOS } from '../../src/navigation/escenarios.ts';
import { CASOS } from '../../src/navigation/catalogo.ts';

const semilla = (id) => {
  const s = ESCENARIOS[id];
  assert.ok(s, `no existe la semilla ${id}`);
  return s;
};
const ronda = (id) => semilla(id).ronda?.ronda ?? rondaReducer({ ronda: { id: '', pedidos: [] } }, { type: 'reiniciar' }).ronda;
const estado = (id) => ({ ronda: ronda(id) });
const desglose = (r, codigo) =>
  productoVista(r, codigo).presencias.map((p) => `${p.contenedor} ${p.estado === 'negado' ? 'Negado' : `${p.surtido}/${p.solicitado}`}`).join(' · ');
const surtir = (s, codigo, cantidad) => rondaReducer(s, { type: 'surtirPorCodigo', codigo, cantidad });
const orden = (r, o) => ordenarListado(productosVista(r), o).map((v) => v.codigo);
const piezas = (p) => p.partidas.reduce((n, x) => n + x.solicitado, 0);

test('cada caso del catálogo apunta a una semilla que existe', () => {
  for (const c of CASOS) assert.ok(ESCENARIOS[c.semilla], `${c.id}: semilla ${c.semilla}`);
});

test('datos de la ronda: 1001 (A) y 1003 (C) del mismo cliente, 1002 (B) de otro; tarjetas 0 de 18, 12 y 12', () => {
  const r = rondaReducer({ ronda: { id: '', pedidos: [] } }, { type: 'reiniciar' }).ronda;
  assert.deepEqual(r.pedidos.map((p, i) => `${letraDe(r, i)}·${p.id}`), ['A·1001', 'B·1002', 'C·1003']);
  assert.equal(r.pedidos[0].cliente.id, r.pedidos[2].cliente.id);
  assert.notEqual(r.pedidos[0].cliente.id, r.pedidos[1].cliente.id);
  assert.deepEqual(r.pedidos.map(piezas), [18, 12, 12]);
  assert.ok(!r.pedidos.some((p) => p.partidas.some((x) => x.codigo === '9999999')));
});













test('Promoción incompleta · solo en el segundo pedido: "Kit afinación" pendiente en 1002', () => {
  const p = promocionesPendientes(ronda('promocion'));
  assert.equal(p.length, 1);
  assert.equal(p[0].promocion.nombre, 'Kit afinación');
  assert.deepEqual(p[0].pedidos.map((x) => x.pedidoId), ['1002']);
  const b = p[0].pedidos[0].partidas.map((x) => `${x.codigo} ${x.negado ? 'Negado' : `${x.surtido} de ${x.solicitado}`}`);
  assert.deepEqual(b, ['0486600 5 de 5', '2389475 Negado']);
});

test('Bloqueos · Parciales en varios pedidos: 0486600 "8 de 16" (A 3/11 · B 5/5) y 2389475 "1 de 2" (C 1/2)', () => {
  const r = ronda('parciales');
  assert.equal(promocionesPendientes(r).length, 0);
  const parciales = ordenarListado(codigosParciales(r), { familia: true, ubicaciones: false });
  assert.deepEqual(
    parciales.map((v) => `${v.codigo} ${v.surtidoTotal} de ${v.solicitadoTotal} (${desglose(r, v.codigo)})`),
    ['0486600 8 de 16 (A 3/11 · B 5/5)', '2389475 1 de 2 (C 1/2)'],
  );
});

test('Orden de los avisos · La promoción negada sigue con el cierre: 2012000 "4 de 5" (B 3/3 · C 1/2)', () => {
  const s = estado('promocion-y-parciales');
  const id = promocionesPendientes(s.ronda)[0].promocion.id;
  const r = rondaReducer(s, { type: 'negarPromocion', promocionId: id }).ronda;
  assert.deepEqual(codigosParciales(r).map((v) => `${v.codigo} ${v.surtidoTotal} de ${v.solicitadoTotal} (${desglose(r, v.codigo)})`), [
    '2012000 4 de 5 (B 3/3 · C 1/2)',
  ]);
});

test('Orden de los avisos: el corporativo incompleto es 1002 y hay promoción y parciales detrás', () => {
  const r = ronda('cierre-en-orden');
  assert.equal(r.pedidos[corporativoIncompleto(r)].id, '1002');
  assert.equal(promocionesPendientes(r).length, 1);
  assert.ok(codigosParciales(r).length > 0);
});



const opciones = (id) => {
  const sim = { ...SIMULACION_INICIAL, ...semilla(id).simulacion };
  return { etiquetaUnica: sim.etiquetaUnica, etiquetasMasAntiguas: sim.etiquetasMasAntiguas };
};
const conEtiquetas = (id) => ({ ronda: ronda(id), etiquetas: semilla(id).ronda?.etiquetas });








/* ---- Revisión del 2026-11-24 (specs con el gate P del 2026-11-24) ---- */

const sim = (id) => ({ ...SIMULACION_INICIAL, ...semilla(id).simulacion });






test('Promoción · Incompleta sin códigos negados: solo 1002, con el avance de sus dos códigos', () => {
  const pendientes = promocionesPendientes(ronda('promocion-sin-negados'));
  assert.equal(pendientes.length, 1);
  assert.deepEqual(pendientes[0].pedidos.map((p) => p.pedidoId), ['1002']);
  assert.deepEqual(pendientes[0].pedidos[0].partidas.map((x) => `${x.codigo} ${x.surtido}/${x.solicitado}`), ['0486600 5/5', '2389475 1/2']);
});

test('Orden de los avisos · Solo códigos en cero: la promoción de 1002 no cuenta como incompleta', () => {
  assert.equal(promocionesPendientes(ronda('solo-ceros')).length, 0);
  assert.equal(codigosParciales(ronda('solo-ceros')).length, 0);
});

test('La ronda se queda sin pedidos · Todo negado: solo falta negar 2010000 de 1003', () => {
  const r = ronda('todo-negado');
  const vivas = r.pedidos.flatMap((p) => p.partidas.filter((x) => x.motivoNegacion === null).map((x) => `${p.id} ${x.codigo}`));
  assert.deepEqual(vivas, ['1003 2010000']);
  const negado = rondaReducer({ ronda: r }, { type: 'negar', codigo: '2010000', motivo: 'Sin existencia' }).ronda;
  assert.ok(negado.pedidos.every((p) => p.partidas.every((x) => x.motivoNegacion !== null)));
});


