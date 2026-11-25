/**
 * Facturación y embarque de la ronda (tarea 35) — **propuesta para la demo, sin spec**. Reglas R18–R27 del intent local
 * `docs/REVISION-MULTIPEDIDO-INTENT.md` (decisiones de Producto del 2026-11-25), sobre las historias de facturación en
 * la HH y Figma "🧾 Facturación" (3287:5564) y "🚚 Embarque" (6157:1119). Donde difieren, manda Figma.
 *
 * Al cerrar la revisión de toda la ronda (tarea 34) se factura y se embarca cada pedido por separado, en el orden de la
 * ronda. La factura y el embarque son por pedido; el embarque se comparte solo entre pedidos del mismo cliente y la misma
 * dirección de entrega (embarque compatible).
 *
 * Pura: decide y calcula; las pantallas despachan y avisan.
 */
import type { Cliente } from './ronda';
import type { RevisionState } from './revision';

export type Direccion = { id: string; texto: string };

/** Datos del pedido para la factura (en la HH los entrega `GET TareaEmbarque/{tareaId}`). */
export type DatosFacturaPedido = {
  origen: string;
  formaPago: string;
  metodoEntrega: string;
  direccionFiscal: Direccion;
  direccionEntrega: Direccion;
};

/** `timbrada`: CFDI con UUID. `sin-timbrar`: la factura existe pero el PAC no la timbró (R23). */
export type EstadoFactura = 'timbrada' | 'sin-timbrar';
export type Factura = { folio: string; estado: EstadoFactura };

export type Embarque = {
  id: string;
  clienteId: string;
  direccionId: string;
  paqueteria: string;
  comentario: string;
  facturas: number;
  fecha: string;
};

export type PedidoFacturacion = {
  id: string;
  letra: string;
  cliente: Cliente;
  total: number;
  datos: DatosFacturaPedido;
  factura: Factura | null;
  /** Embarque al que quedó ligada la factura: con él, el pedido termina dentro de la tarea 35 (R27). */
  embarqueId: string | null;
};

export type FacturacionState = {
  rondaId: string;
  pedidos: PedidoFacturacion[];
  /** Embarques activos (no entregados) de la sucursal, incluidos los que se crean en la ronda. */
  embarques: Embarque[];
  siguienteFolio: number;
  siguienteEmbarque: number;
};

/** Paqueterías del catálogo (Figma: "PAQUETERIA INTERNA"; las demás son de ejemplo). */
export const PAQUETERIAS = ['PAQUETERIA INTERNA', 'ESTAFETA', 'DHL', 'FEDEX', 'PAQUETEXPRESS'];
/** Comentario del embarque: obligatorio, hasta 50 caracteres (spec `empacar-pedido`). */
export const MAX_COMENTARIO = 50;

/** Fecha y hora fija de la demo para los embarques que se crean. */
export const FECHA_DEMO = '2026-11-25 10:15';

/**
 * Intent revisión · R18: la tarea 35 nace de la revisión cerrada de la ronda. Entran los **pedidos de cliente** revisados,
 * en su orden y con su letra: no los que se sacaron de la ronda en la revisión ni los traspasos, que no se facturan y no
 * se mezclan con la facturación. El total sale de lo revisado por el precio.
 */
export function facturacionDesdeRevision(
  rev: RevisionState,
  precios: Record<string, number>,
  datos: (pedidoId: string, cliente: Cliente) => DatosFacturaPedido,
  base: Pick<FacturacionState, 'embarques' | 'siguienteFolio' | 'siguienteEmbarque'>,
): FacturacionState {
  const pedidos = rev.pedidos
    .filter((p) => p.estado === 'revisado' && !p.traspaso)
    .map<PedidoFacturacion>((p) => ({
      id: p.id,
      letra: p.letra,
      cliente: p.cliente,
      total: Math.round(p.partidas.reduce((n, x) => n + x.revisado * (precios[x.codigo] ?? 0), 0) * 100) / 100,
      datos: datos(p.id, p.cliente),
      factura: null,
      embarqueId: null,
    }));
  return { rondaId: rev.rondaId, pedidos, ...base };
}

/* ------------------------------------------------------------------ *
 * Vistas
 * ------------------------------------------------------------------ */

export const pedidoTerminado = (p: PedidoFacturacion) => p.embarqueId !== null;

/** Intent revisión · R19, R27: el pedido en curso es el primero sin embarque (al retomar, el primero que falta). */
export function pedidoEnCursoIdx(s: FacturacionState): number {
  return s.pedidos.findIndex((p) => !pedidoTerminado(p));
}

export function pedidoEnCurso(s: FacturacionState): PedidoFacturacion | null {
  const i = pedidoEnCursoIdx(s);
  return i >= 0 ? s.pedidos[i] : null;
}

/** "Pedido n de N" del pedido en curso, o del último si ya terminaron todos. */
export function indicador(s: FacturacionState): { n: number; total: number } {
  const i = pedidoEnCursoIdx(s);
  return { n: (i >= 0 ? i : s.pedidos.length - 1) + 1, total: s.pedidos.length };
}

export const pedidosPendientes = (s: FacturacionState) => s.pedidos.filter((p) => !pedidoTerminado(p));

/** Intent revisión · R25: embarques activos del mismo cliente y la misma dirección de entrega. */
export function embarquesCompatibles(s: FacturacionState, p: PedidoFacturacion): Embarque[] {
  return s.embarques.filter((e) => e.clienteId === p.cliente.id && e.direccionId === p.datos.direccionEntrega.id);
}

export const embarqueDe = (s: FacturacionState, id: string | null) => (id ? s.embarques.find((e) => e.id === id) ?? null : null);

/** Texto de un embarque en el selector, como Figma: "147707 · 1 factura(s) · 2026-09-17 15:48". */
export const textoEmbarque = (e: Embarque) => `${e.id} · ${e.facturas} factura(s) · ${e.fecha}`;

/* ------------------------------------------------------------------ *
 * Reducer (las acciones son sobre el pedido en curso)
 * ------------------------------------------------------------------ */

export type FacturacionAction =
  | { type: 'cargar'; estado: FacturacionState }
  /** R22, R23: la factura se crea (timbrada o sin timbrar). */
  | { type: 'facturar'; timbrada: boolean }
  /** R23: reintento de timbrado de una factura sin timbrar. */
  | { type: 'timbrar' }
  /** R25: embarque nuevo con su paquetería y comentario; la factura queda ligada a él. */
  | { type: 'crearEmbarque'; paqueteria: string; comentario: string }
  /** R25: la factura se agrega a un embarque compatible. */
  | { type: 'ligarEmbarque'; embarqueId: string };

function enCurso(s: FacturacionState, fn: (p: PedidoFacturacion) => PedidoFacturacion): FacturacionState {
  const i = pedidoEnCursoIdx(s);
  if (i < 0) return s;
  return { ...s, pedidos: s.pedidos.map((p, j) => (j === i ? fn(p) : p)) };
}

export function facturacionReducer(s: FacturacionState, a: FacturacionAction): FacturacionState {
  const p = pedidoEnCurso(s);
  switch (a.type) {
    case 'cargar':
      return a.estado;
    case 'facturar': {
      if (!p || p.factura) return s;
      const factura: Factura = { folio: String(s.siguienteFolio), estado: a.timbrada ? 'timbrada' : 'sin-timbrar' };
      return { ...enCurso(s, (x) => ({ ...x, factura })), siguienteFolio: s.siguienteFolio + 1 };
    }
    case 'timbrar':
      return enCurso(s, (x) => (x.factura ? { ...x, factura: { ...x.factura, estado: 'timbrada' } } : x));
    case 'crearEmbarque': {
      if (!p?.factura) return s;
      const nuevo: Embarque = {
        id: String(s.siguienteEmbarque),
        clienteId: p.cliente.id,
        direccionId: p.datos.direccionEntrega.id,
        paqueteria: a.paqueteria,
        comentario: a.comentario,
        facturas: 1,
        fecha: FECHA_DEMO,
      };
      return {
        ...enCurso(s, (x) => ({ ...x, embarqueId: nuevo.id })),
        embarques: [...s.embarques, nuevo],
        siguienteEmbarque: s.siguienteEmbarque + 1,
      };
    }
    case 'ligarEmbarque': {
      if (!p?.factura || !embarquesCompatibles(s, p).some((e) => e.id === a.embarqueId)) return s;
      return {
        ...enCurso(s, (x) => ({ ...x, embarqueId: a.embarqueId })),
        embarques: s.embarques.map((e) => (e.id === a.embarqueId ? { ...e, facturas: e.facturas + 1 } : e)),
      };
    }
  }
}
