/**
 * Semillas de la demo. `?escenario=<id>` siembra el store al arrancar: la ronda, la configuración simulada de
 * la sucursal y el servidor (`simulacion`) y la etapa. La pantalla va en el hash (`#/surtido`).
 * Mantiene el patrón del proyecto base: la semilla se lee una vez en main.tsx.
 *
 * Cada caso del catálogo (`catalogo.ts`) apunta a una de estas semillas; varias comparten la misma. Cada semilla
 * prepara, sobre la ronda de `src/mocks/ronda.ts`, el estado que describe el GIVEN de sus escenarios, con los
 * mismos números; `tests/domain/escenarios.test.mjs` lo comprueba.
 */
import { estadoInicial, type PartidaPedido, type Pedido, type RondaState } from '../domain/ronda';
import type { Semilla } from '../store/AppStore';
import { revisionDesdeRonda, type PedidoRevision, type RevisionState } from '../domain/revision';
import { facturacionDesdeRevision, facturacionReducer, type Embarque, type FacturacionState } from '../domain/facturacion';
import { EMBARQUE_OTRA_DIRECCION, EMBARQUE_PREVIO_B, FACTURACION_BASE, PRECIOS, datosFactura } from '../mocks/facturacion';

type Retoque = (p: PartidaPedido) => PartidaPedido;

/** Aplica un retoque a las partidas del pedido indicado por su índice en la ronda. */
function retocar(base: RondaState, cambios: Record<number, Retoque>): RondaState {
  const pedidos = base.ronda.pedidos.map((pedido, i) => {
    const fn = cambios[i];
    return fn ? { ...pedido, partidas: pedido.partidas.map(fn) } : pedido;
  });
  return { ...base, ronda: { ...base.ronda, pedidos } };
}

/** Quita códigos de los pedidos indicados, cuando el escenario habla de menos pedidos con ese código. */
function sinCodigos(base: RondaState, cambios: Record<number, string[]>): RondaState {
  const pedidos = base.ronda.pedidos.map((pedido, i) => {
    const fuera = cambios[i];
    return fuera ? { ...pedido, partidas: pedido.partidas.filter((x) => !fuera.includes(x.codigo)) } : pedido;
  });
  return { ...base, ronda: { ...base.ronda, pedidos } };
}

/** Cambia datos del pedido (p. ej. corporativo con orden de compra). */
function conPedido(base: RondaState, idx: number, cambios: Partial<Pedido>): RondaState {
  const pedidos = base.ronda.pedidos.map((p, i) => (i === idx ? { ...p, ...cambios } : p));
  return { ...base, ronda: { ...base.ronda, pedidos } };
}

/** Deja en la ronda solo los pedidos indicados (por índice), en ese orden y con su letra de origen. */
function soloPedidos(base: RondaState, idxs: number[]): RondaState {
  return { ...base, ronda: { ...base.ronda, pedidos: idxs.map((i) => base.ronda.pedidos[i]) } };
}


const completar: Retoque = (p) => ({ ...p, surtido: p.solicitado });
const surtir = (codigo: string, n: number): Retoque => (p) => (p.codigo === codigo ? { ...p, surtido: n } : p);
const negar = (codigo: string, motivo = 'Sin existencia'): Retoque => (p) =>
  p.codigo === codigo ? { ...p, surtido: 0, motivoNegacion: motivo } : p;
/** Completa todo salvo el código indicado, que queda con `n` piezas. */
const todoMenos = (codigo: string, n: number): Retoque => (p) => (p.codigo === codigo ? { ...p, surtido: n } : completar(p));
const sinPromocion: Retoque = (p) => ({ ...p, promocion: null });
/** Niega todas las partidas del pedido. */
const negarTodo: Retoque = (p) => ({ ...p, surtido: 0, motivoNegacion: 'Sin existencia' });
const y = (...fns: Retoque[]): Retoque => (p) => fns.reduce((acc, fn) => fn(acc), p);

/* ------------------------------------------------------------------ *
 * Rondas (A · 1001, B · 1002, C · 1003)
 * ------------------------------------------------------------------ */

const base = () => estadoInicial();

/** 1001 con 3 de 11 de 0486600 y lo demás en 0: hay avance y hay códigos en 0. */
const conAvance = () => retocar(base(), { 0: surtir('0486600', 3) });






/** Solo falta 1 pieza de 2010000 en 1003: el próximo surtido resuelve la ronda. */
const rondaAlFilo = () => retocar(base(), { 0: completar, 1: completar, 2: todoMenos('2010000', 0) });


/**
 * "Kit afinación" (0486600 + 2389475) completo en 1001; en 1002 se negó 2389475 con 0486600 en 5 de 5. Falta 1
 * pieza de 2010000 en 1003 para resolver la ronda.
 */
const promocionIncompleta = () =>
  retocar(base(), { 0: completar, 1: y(completar, negar('2389475')), 2: todoMenos('2010000', 0) });

/** Promoción incompleta en 1001 (2389475 negado) y 1003 con 2012000 parcial (1 de 2). */
const promocionYParciales = () =>
  retocar(base(), { 0: y(completar, negar('2389475')), 1: completar, 2: todoMenos('2012000', 1) });

/**
 * Corporativo 1002 incompleto (0486600 en 2 de 5, lo demás en 0), promoción incompleta en 1001 (2389475 negado),
 * 1394010 parcial en 1001 (2 de 4) y 2012000 parcial en 1003 (1 de 2): el cierre recorre los avisos en orden.
 */
const cierreEnOrden = () =>
  conPedido(
    retocar(base(), {
      0: y(completar, negar('2389475'), surtir('1394010', 2)),
      1: surtir('0486600', 2),
      2: todoMenos('2012000', 1),
    }),
    1,
    { corporativoOC: true },
  );

/**
 * "Parciales en varios pedidos": 0486600 con 3 de 11 en A y 5 de 5 en B, y 2389475 con 1 de 2 solo en C; lo
 * demás completo. Sin promociones en esta ronda, para que el único aviso sea el de parciales.
 */
const parcialesEnVarios = () =>
  retocar(
    sinCodigos(base(), { 0: ['2389475'], 1: ['2389475'], 2: ['0486600'] }),
    { 0: y(sinPromocion, todoMenos('0486600', 3)), 1: y(sinPromocion, completar), 2: todoMenos('2389475', 1) },
  );

/** 1001 con 1394010 parcial (2 de 4); lo demás completo y la promoción completa. */
const parcialEnA = () => retocar(base(), { 0: todoMenos('1394010', 2), 1: completar, 2: completar });

/** Un solo pedido (1001), opcionalmente retocado. */
const pedidoUnico = (fn?: Retoque) => soloPedidos(fn ? retocar(base(), { 0: fn }) : base(), [0]);





/** Los tres pedidos son corporativos con orden de compra e incompletos. */
const tresCorporativos = () => {
  let s = retocar(base(), { 0: surtir('0486600', 3), 1: surtir('0486600', 2), 2: surtir('0486600', 1) });
  for (const i of [0, 1, 2]) s = conPedido(s, i, { corporativoOC: true });
  return s;
};

/** 1002 y 1003 corporativos con orden de compra e incompletos; 1001 completo. */
const dosCorporativos = () =>
  conPedido(conPedido(retocar(base(), { 0: completar, 1: surtir('0486600', 2), 2: surtir('0486600', 1) }), 1, { corporativoOC: true }), 2, {
    corporativoOC: true,
  });

/** 1002 corporativo con orden de compra e incompleto (0486600 en 2 de 5); 1001 y 1003 completos. */
const corporativoIncompleto = () =>
  conPedido(retocar(base(), { 0: completar, 1: surtir('0486600', 2), 2: completar }), 1, { corporativoOC: true });

/**
 * "Kit afinación" en 1002 con 0486600 en 5 de 5 y 2389475 en 1 de 2, sin ningún código negado; 1001 y 1003 completos
 * (Promoción incompleta al finalizar la ronda · "Incompleta sin códigos negados").
 */
const promocionSinNegados = () => retocar(base(), { 0: completar, 1: todoMenos('2389475', 1), 2: completar });

/** "Kit afinación" incompleta en 1001 y en 1002 (2389475 negado en los dos); lo demás completo. */
const promocionEnAyB = () => retocar(base(), { 0: y(completar, negar('2389475')), 1: y(completar, negar('2389475')), 2: completar });

/** Solo la promoción de 1001 incompleta (2389475 negado); sin parciales, códigos en 0 ni corporativos. */
const soloPromocionEnA = () => retocar(base(), { 0: y(completar, negar('2389475')), 1: completar, 2: completar });

/**
 * Solo códigos en cero: 1002 tiene 2389475 en 0 sin negar y lo demás está completo. El "Kit afinación" de 1002 no
 * cuenta como incompleto porque no todos sus códigos se iniciaron (regla del V2).
 */
const soloCeros = () => retocar(base(), { 0: completar, 1: todoMenos('2389475', 0), 2: completar });

/** La ronda G-500 con 1001 completo y 1002 corporativo completo salvo 1 pieza de 1394010. */
const corporativoAlFilo = () =>
  conPedido(soloPedidos(retocar(base(), { 0: completar, 1: todoMenos('1394010', 1) }), [0, 1]), 1, { corporativoOC: true });





/* ------------------------------------------------------------------ *
 * Semillas
 * ------------------------------------------------------------------ */

const tareas = (s: Omit<Semilla, 'etapa'> = {}): Semilla => ({ etapa: 'tareas', ...s });
const surtido = (s: Omit<Semilla, 'etapa'> = {}): Semilla => ({ etapa: 'surtido', ...s });

/* ------------------------------------------------------------------ *
 * Revisión multipedido (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md)
 * ------------------------------------------------------------------ */

/** G-500 surtida completa: A · 1001, B · 1002 y C · 1003. */
const rondaSurtida = () => retocar(base(), { 0: completar, 1: completar, 2: completar });

type RetoqueRevision = (p: PedidoRevision) => PedidoRevision;

/** Revisión de una ronda surtida, con retoques por pedido (índice dentro de la revisión). */
function revisionDe(rs: RondaState, cambios: Record<number, RetoqueRevision> = {}): RevisionState {
  const r = revisionDesdeRonda(rs.ronda);
  return { ...r, pedidos: r.pedidos.map((p, i) => (cambios[i] ? cambios[i](p) : p)) };
}

/** Todo revisado salvo los códigos indicados, que quedan con esa cantidad revisada. */
const revisadoMenos = (faltan: Record<string, number> = {}): RetoqueRevision => (p) => ({
  ...p,
  partidas: p.partidas.map((x) => ({ ...x, revisado: x.codigo in faltan ? faltan[x.codigo] : x.surtido })),
});
/** Pedido ya revisado y finalizado. */
const finalizado: RetoqueRevision = (p) => ({ ...revisadoMenos()(p), estado: 'revisado' });
/** Solo esos códigos llevan revisión; lo demás en 0. */
const revisadoSolo = (hechos: Record<string, number>): RetoqueRevision => (p) => ({
  ...p,
  partidas: p.partidas.map((x) => ({ ...x, revisado: hechos[x.codigo] ?? 0 })),
});

/** Semilla de revisión: la ronda surtida, su revisión cargada y la bandera de revisión multipedido activa. */
const revision = (rev: RevisionState, etapa: 'tareas' | 'revision', simulacion: Semilla['simulacion'] = {}, ronda = rondaSurtida()): Semilla => ({
  etapa,
  ronda,
  revision: rev,
  simulacion: { revisionMultipedidoEnHH: true, ...simulacion },
});

const ESCENARIOS_REVISION: Record<string, Semilla> = {
  // R1: C le falta 2010000 (misceláneo): al capturarlo, la ronda se completa y se finaliza.
  'revision-fin-surtido': surtido({ ronda: rondaAlFilo(), simulacion: { revisionMultipedidoEnHH: true } }),
  'revision-tareas': revision(revisionDe(rondaSurtida()), 'tareas'),
  revision: revision(revisionDe(rondaSurtida()), 'revision'),
  // R7: a A solo le falta escanear 1365800.
  'revision-a-casi': revision(revisionDe(rondaSurtida(), { 0: revisadoMenos({ '1365800': 0 }) }), 'revision'),
  // R8: A y B ya revisados; a C le falta 2010000 (simplificada).
  'revision-c-ultimo': revision(revisionDe(rondaSurtida(), { 0: finalizado, 1: finalizado, 2: revisadoMenos({ '2010000': 0 }) }), 'revision'),
  // R9 y R10: A ya revisado; B lleva 2 de 5 de 0486600.
  'revision-retomar': revision(revisionDe(rondaSurtida(), { 0: finalizado, 1: revisadoSolo({ '0486600': 2 }) }), 'revision'),
  // R4 y R5: B se retiró durante el surtido.
  'revision-sin-b': revision(revisionDe(soloPedidos(rondaSurtida(), [0, 2])), 'tareas', {}, soloPedidos(rondaSurtida(), [0, 2])),
  // R5: B se negó completo en el surtido.
  'revision-b-negado': revision(
    revisionDe(retocar(rondaSurtida(), { 1: negarTodo })),
    'tareas',
    {},
    retocar(rondaSurtida(), { 1: negarTodo }),
  ),
  // R16: A sin promoción, con 0486600 en 8 de 11 y 1365800 en 0.
  'revision-discrepancias': revision(
    revisionDe(retocar(rondaSurtida(), { 0: sinPromocion }), { 0: revisadoMenos({ '0486600': 8, '1365800': 0 }) }),
    'revision',
  ),
  // R16: el Kit afinación de A (0486600 + 2389475) con 0486600 en 5 de 11.
  'revision-promocion': revision(revisionDe(rondaSurtida(), { 0: revisadoMenos({ '0486600': 5 }) }), 'revision'),
  // R16: B corporativo con orden de compra, con 2 de 5 de 0486600 revisadas.
  'revision-corporativo': revision(
    revisionDe(conPedido(rondaSurtida(), 1, { corporativoOC: true }), { 0: finalizado, 1: revisadoSolo({ '0486600': 2 }) }),
    'revision',
  ),
  // R17: falla la red al finalizar A la primera vez.
  'revision-falla-red': revision(revisionDe(rondaSurtida(), { 0: revisadoMenos({ '1365800': 0 }) }), 'revision', { fallaFinalizarRevision: '1001' }),
  // R3: sin la bandera de revisión multipedido.
  'revision-sin-bandera': revision(revisionDe(rondaSurtida()), 'tareas', { revisionMultipedidoEnHH: false }),
  // R2
  'revision-no-surtida': revision(revisionDe(rondaSurtida()), 'tareas', { revisionNoSurtida: true }),
  'revision-iniciada-en-otro': revision(revisionDe(rondaSurtida()), 'tareas', { revisionIniciadaEnOtro: true }),
};

/* ------------------------------------------------------------------ *
 * Facturación y embarque de la ronda, tarea 35 (propuesta sin spec: R18–R27)
 * ------------------------------------------------------------------ */

/** Revisión de la G-500 cerrada: A, B y C revisados completos. */
const revisionCerrada = () => revisionDe(rondaSurtida(), { 0: finalizado, 1: finalizado, 2: finalizado });

/** Tarea 35 recién cargada de la G-500 cerrada (con embarques previos de la sucursal y entregas distintas, opcionales). */
function facturacionDe(embarques: Embarque[] = [], entregas: Record<string, string> = {}): FacturacionState {
  return facturacionDesdeRevision(revisionCerrada(), PRECIOS, datosFactura(entregas), { ...FACTURACION_BASE, embarques });
}

const facturar = (s: FacturacionState, timbrada = true) => facturacionReducer(s, { type: 'facturar', timbrada });
const embarcar = (s: FacturacionState, paqueteria = 'PAQUETERIA INTERNA', comentario = 'Entregar en almacén de recepción') =>
  facturacionReducer(s, { type: 'crearEmbarque', paqueteria, comentario });
/** A facturado y embarcado (147707), B facturado y embarcado (147708): queda C. */
const AyBEmbarcados = (s: FacturacionState) => embarcar(facturar(embarcar(facturar(s))), 'ESTAFETA', 'Recibe compras');

/** Semilla de la tarea 35: la ronda surtida, la revisión cerrada y las banderas de revisión y facturación activas. */
const fac = (st: FacturacionState, etapa: 'tareas' | 'facturacion', simulacion: Semilla['simulacion'] = {}): Semilla => ({
  etapa,
  ronda: rondaSurtida(),
  revision: revisionCerrada(),
  facturacion: st,
  simulacion: { revisionMultipedidoEnHH: true, facturacionEnHH: true, ...simulacion },
});

const ESCENARIOS_FACTURACION: Record<string, Semilla> = {
  // R18: A y B revisados; a C le falta 2010000. Al cerrar C queda cargada la tarea 35 de la G-500.
  'facturacion-desde-revision': revision(
    revisionDe(rondaSurtida(), { 0: finalizado, 1: finalizado, 2: revisadoMenos({ '2010000': 0 }) }),
    'revision',
    { facturacionEnHH: true },
  ),
  // R18: B es un traspaso: se revisa, pero a la tarea 35 solo entran A y C (pedidos de cliente).
  'facturacion-con-traspaso': revision(
    revisionDe(conPedido(rondaSurtida(), 1, { traspaso: true }), { 0: finalizado, 1: finalizado, 2: revisadoMenos({ '2010000': 0 }) }),
    'revision',
    {},
    conPedido(rondaSurtida(), 1, { traspaso: true }),
  ),
  // Recorrido completo desde el fin del surtido: surtido → revisión → facturación y embarque.
  'flujo-completo': surtido({ ronda: rondaAlFilo(), simulacion: { revisionMultipedidoEnHH: true, facturacionEnHH: true } }),
  'facturacion-tareas': fac(facturacionDe(), 'tareas'),
  facturacion: fac(facturacionDe(), 'facturacion'),
  'facturacion-error': fac(facturacionDe(), 'facturacion', { fallaGenerarFactura: '1001' }),
  'facturacion-sin-timbrar': fac(facturacionDe(), 'facturacion', { facturaSinTimbrar: ['1001'] }),
  'facturacion-impresora-no-configurada': fac(facturar(facturacionDe()), 'facturacion', { impresora: 'no-configurada' }),
  'facturacion-impresora-sin-conexion': fac(facturar(facturacionDe()), 'facturacion', { impresora: 'sin-conexion' }),
  // R25: A facturada, sin embarques activos → "Nuevo embarque".
  'embarque-nuevo': fac(facturar(facturacionDe()), 'facturacion'),
  // R25: 48213 tiene un embarque activo en OTRA dirección: no es compatible con A → "Nuevo embarque".
  'embarque-otra-direccion': fac(facturar(facturacionDe([EMBARQUE_OTRA_DIRECCION])), 'facturacion'),
  // R25: B tiene un embarque activo previo en su dirección → "Agregar embarque".
  'embarque-previo-b': fac(facturar(embarcar(facturar(facturacionDe([EMBARQUE_PREVIO_B])))), 'facturacion'),
  // R25, R27: A y B embarcados; C (mismo cliente y dirección que A) facturada: se agrega al embarque de A y cierra.
  'embarque-c-mismo-cliente': fac(facturar(AyBEmbarcados(facturacionDe())), 'facturacion'),
  // R26: la liga de A al embarque falla la primera vez.
  'embarque-falla-ligar': fac(facturar(facturacionDe()), 'facturacion', { fallaLigarEmbarque: '1001' }),
  // R27: A embarcado y B facturado sin embarque: al retomar desde Tareas se abre B en "Continuar a embarque".
  'facturacion-retomar': fac(facturar(embarcar(facturar(facturacionDe()))), 'tareas'),
  // R20
  'facturacion-sin-bandera': fac(facturacionDe(), 'tareas', { facturacionEnHH: false }),
  'facturacion-concluida-en-otro': fac(facturacionDe(), 'tareas', { facturacionConcluidaEnOtro: true }),
};

export const ESCENARIOS: Record<string, Semilla> = {
  ...ESCENARIOS_REVISION,
  ...ESCENARIOS_FACTURACION,
  /* ---- Toma de tarea y Detalle de la ronda ---- */
  tareas: tareas(),
  // "dos pedidos, 101 y 102": la spec usa otros folios en este escenario.
  // Ronda multipedido V2 en la asignación: quién armó la ronda y la falla de la bandera de listado.
  // Falla al cargar la ronda.

  /* ---- Apertura del listado ---- */

  /* ---- Escaneo y lista ---- */
  'con-avance': surtido({ ronda: conAvance(), ultimoEscaneo: { codigo: '0486600', pedidoId: '1001' } }),

  /* ---- Negar ---- */
  // 0486600 en 1001 (3 de 11), 1002 y 1003; el registro de la negación de 1002 falla.

  /* ---- Corrección (escalera) ---- */

  /* ---- Promoción ---- */
  promocion: surtido({ ronda: promocionIncompleta() }),
  'promocion-sin-negados': surtido({ ronda: promocionSinNegados() }),
  'falla-eliminar-promocion': surtido({ ronda: promocionEnAyB(), simulacion: { fallaEliminarPromocion: '1002' } }),
  'solo-promocion': surtido({ ronda: soloPromocionEnA() }),
  'solo-ceros': surtido({ ronda: soloCeros() }),

  /* ---- Finalizar, sacar el corporativo, salir ---- */
  'cierra-ronda': surtido({ ronda: rondaAlFilo() }),
  'concluida-por-otro': surtido({ ronda: rondaAlFilo(), simulacion: { concluidaPorOtro: true } }),
  'concluida-a-mitad': surtido({ ronda: rondaAlFilo(), simulacion: { concluidaAntesDe: '1002' } }),
  'pedido-unico-al-filo': surtido({ ronda: pedidoUnico(todoMenos('1394010', 3)) }),
  'corporativo-incompleto': surtido({ ronda: corporativoIncompleto() }),
  'falla-retiro': surtido({ ronda: corporativoIncompleto(), simulacion: { fallaRetiro: 'retiro' } }),
  'falla-registro-retiro': surtido({ ronda: corporativoIncompleto(), simulacion: { fallaRetiro: 'registro' } }),
  'corporativo-al-filo': surtido({ ronda: corporativoAlFilo() }),
  'corporativo-sin-piezas': surtido({ ronda: conPedido(conAvance(), 1, { corporativoOC: true }) }),
  'pedido-unico-corporativo-incompleto': surtido({ ronda: conPedido(pedidoUnico(surtir('0486600', 5)), 0, { corporativoOC: true }) }),
  'ronda-dos-corporativo': surtido({
    ronda: conPedido(soloPedidos(retocar(base(), { 0: completar, 1: surtir('0486600', 2) }), [0, 1]), 1, { corporativoOC: true }),
  }),
  'tres-corporativos': surtido({ ronda: tresCorporativos() }),
  'dos-corporativos': surtido({ ronda: dosCorporativos() }),
  parciales: surtido({ ronda: parcialesEnVarios() }),
  'parcial-en-a': surtido({ ronda: parcialEnA() }),
  'promocion-y-parciales': surtido({ ronda: promocionYParciales() }),
  'cierre-en-orden': surtido({ ronda: cierreEnOrden() }),
  'cancelado-corporativo': surtido({ ronda: cierreEnOrden(), simulacion: { cancelados: ['1002'] } }),
  'cancelado-al-finalizar': surtido({ ronda: conAvance(), simulacion: { cancelados: ['1002'] } }),
  'cancelado-automatico': surtido({ ronda: rondaAlFilo(), simulacion: { cancelados: ['1002'] } }),
  'todos-cancelados': surtido({ ronda: conAvance(), simulacion: { cancelados: ['1001', '1002', '1003'] } }),
  'dos-cancelados': surtido({ ronda: conAvance(), simulacion: { cancelados: ['1002', '1003'] } }),
  'falla-cancelados': surtido({ ronda: rondaAlFilo(), simulacion: { fallaComprobacionCancelados: true } }),
  'todo-negado': surtido({ ronda: retocar(base(), { 0: negarTodo, 1: negarTodo, 2: y(negarTodo, (p) => (p.codigo === '2010000' ? { ...p, motivoNegacion: null } : p)) }) }),
  'falla-guardado': surtido({ ronda: rondaAlFilo(), simulacion: { fallaGuardado: '1002' } }),
  'falla-guardado-servidor': surtido({ ronda: rondaAlFilo(), simulacion: { fallaGuardado: '1002', tipoFallaGuardado: 'servidor' } }),
  'falla-guardado-dos-veces': surtido({ ronda: rondaAlFilo(), simulacion: { fallaGuardado: '1002', vecesFallaGuardado: 2 } }),
  'falla-cierre-ronda': surtido({ ronda: rondaAlFilo(), simulacion: { fallaCierreRonda: true } }),
  'falla-guardado-pedido-unico': surtido({ ronda: pedidoUnico(todoMenos('1394010', 3)), simulacion: { fallaGuardado: '1001' } }),
  'falla-desvincular-al-cancelar': surtido({ ronda: rondaAlFilo(), simulacion: { fallaGuardado: '1002', fallaDesvincular: '1002' } }),

  /* ---- Etiqueta única (EU) ---- */

  /* ---- Guía por voz ---- */
  // Los balanceos (actividad 58) nunca forman ronda multipedido V2 (armado-ronda, clarificación 35): la ronda V2 es
  // siempre de la actividad 31 y el balanceo, de un solo pedido.

  /* ---- Imagen y familia ---- */
};

export function idEscenario(search: string = window.location.search): string | null {
  return new URLSearchParams(search).get('escenario');
}

export function semillaDesdeUrl(): Semilla | undefined {
  const id = idEscenario();
  return id ? ESCENARIOS[id] : undefined;
}
