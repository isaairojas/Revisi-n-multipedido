/**
 * Revisión multipedido en la HH: **propuesta para la demo, sin spec**. Las reglas R1–R17 están en el intent local
 * `docs/REVISION-MULTIPEDIDO-INTENT.md` (decisiones de Producto del 2026-11-25). Cuando se formalice el cambio SDD,
 * estas leyendas `Intent revisión · Rn` se sustituyen por `SDD <id-del-cambio> · <Requirement>`.
 *
 * Cada pedido de la ronda se revisa con la revisión independiente de hoy (tarea 34, `AssortmentCheck` de
 * exodus-gtm-pwa y Figma "🔎 Revisión - Independiente"), uno por uno y en el orden que fijó el surtido (A, B, C).
 *
 * Pura: decide y calcula; las pantallas despachan y avisan.
 */
import { leerCodigo } from './codigos';
import { letraDe, type Cliente, type Promocion, type Ronda } from './ronda';

/** Negación del gestor de discrepancias: "Negar" (no se revisó nada) o "Marcar parcialidad" (se revisó una parte). */
export type Negacion = { tipo: 'negado' | 'parcialidad'; motivo: string };

export type PartidaRevision = {
  codigo: string;
  descripcion: string;
  imagen: string;
  /** Lo que se surtió en la ronda para este pedido: es lo que se revisa. */
  surtido: number;
  revisado: number;
  /**
   * Revisión simplificada (contador en vez de escaneo). La decide el servidor; en la demo, los misceláneos del
   * surtido (`revisionSimplificada` en `IAssortmentCheckProduct`).
   */
  simplificada: boolean;
  promocion: Promocion | null;
  negacion: Negacion | null;
};

export type EstadoPedidoRevision = 'pendiente' | 'revisado' | 'retirado';

export type PedidoRevision = {
  id: string;
  /** Letra del contenedor que fijó el surtido: no cambia aunque otro pedido no entre a la revisión (R4). */
  letra: string;
  cliente: Cliente;
  corporativoOC: boolean;
  /** Traspaso: se revisa como los demás, pero no se factura (R18). */
  traspaso: boolean;
  partidas: PartidaRevision[];
  estado: EstadoPedidoRevision;
};

export type RevisionState = { rondaId: string; pedidos: PedidoRevision[] };

/**
 * Intent revisión · R4, R5: la revisión de la ronda sale de lo que se surtió. Entran los pedidos de la ronda en su
 * orden (los retirados durante el surtido ya no están en ella) con las partidas que tienen piezas surtidas; un pedido
 * negado por completo no entra.
 */
export function revisionDesdeRonda(r: Ronda): RevisionState {
  const pedidos: PedidoRevision[] = [];
  r.pedidos.forEach((p, i) => {
    const partidas = p.partidas
      .filter((x) => !x.motivoNegacion && x.surtido > 0)
      .map<PartidaRevision>((x) => ({
        codigo: x.codigo,
        descripcion: x.descripcion,
        imagen: x.imagen,
        surtido: x.surtido,
        revisado: 0,
        simplificada: x.miscelaneo,
        promocion: x.promocion,
        negacion: null,
      }));
    if (partidas.length === 0) return;
    pedidos.push({ id: p.id, letra: letraDe(r, i), cliente: p.cliente, corporativoOC: !!p.corporativoOC, traspaso: !!p.traspaso, partidas, estado: 'pendiente' });
  });
  return { rondaId: r.id, pedidos };
}

/* ------------------------------------------------------------------ *
 * Vistas
 * ------------------------------------------------------------------ */

/** Intent revisión · R4, R10: el pedido en curso es el primer pendiente (al retomar, el primero que falta). */
export function pedidoEnCursoIdx(s: RevisionState): number {
  return s.pedidos.findIndex((p) => p.estado === 'pendiente');
}

export function pedidoEnCurso(s: RevisionState): PedidoRevision | null {
  const i = pedidoEnCursoIdx(s);
  return i >= 0 ? s.pedidos[i] : null;
}

/** Intent revisión · R6: "Pedido n de N", contado sobre los pedidos que entraron a la revisión. */
export function indicador(s: RevisionState): { n: number; total: number } {
  return { n: pedidoEnCursoIdx(s) + 1, total: s.pedidos.length };
}

export const pedidosPendientes = (s: RevisionState) => s.pedidos.filter((p) => p.estado === 'pendiente');

export type EstadoRevisionPartida = 'sin-revisar' | 'parcial' | 'completo';

/** Chip de "Revisado": amarillo sin revisar, azul parcial, verde completo (`QuantityProgress` de la app). */
export function estadoRevision(p: PartidaRevision): EstadoRevisionPartida {
  if (p.revisado <= 0) return 'sin-revisar';
  return p.revisado >= p.surtido ? 'completo' : 'parcial';
}

const ORDEN: Record<EstadoRevisionPartida, number> = { parcial: 0, 'sin-revisar': 1, completo: 2 };

/** Intent revisión · R11: parciales, luego sin revisar, luego completos; dentro de cada grupo, por código. */
export function ordenarPartidas(ps: PartidaRevision[]): PartidaRevision[] {
  return [...ps].sort((a, b) => ORDEN[estadoRevision(a)] - ORDEN[estadoRevision(b)] || Number(a.codigo) - Number(b.codigo));
}

/** % de piezas revisadas sobre surtidas (solo llega a 100 cuando todo está revisado). */
export function avance(p: PedidoRevision): number {
  const surtido = p.partidas.reduce((n, x) => n + x.surtido, 0);
  const revisado = p.partidas.reduce((n, x) => n + Math.min(x.revisado, x.surtido), 0);
  return surtido === 0 ? 0 : Math.floor((revisado / surtido) * 100);
}

export const pedidoRevisadoCompleto = (p: PedidoRevision) => p.partidas.every((x) => x.revisado >= x.surtido);

/* ------------------------------------------------------------------ *
 * Lector
 * ------------------------------------------------------------------ */

export type ResultadoLecturaRevision =
  | { tipo: 'invalido' }
  | { tipo: 'incorrecto'; codigo: string }
  | { tipo: 'simplificada'; codigo: string }
  | { tipo: 'manual'; codigo: string }
  | { tipo: 'cantidad-invalida'; codigo: string }
  | { tipo: 'sobrante'; codigo: string }
  | { tipo: 'ok'; codigo: string; cantidad: number };

/**
 * Intent revisión · R12, R13: validaciones del escaneo en el orden de la app (`AssortmentCheckController`). El
 * producto se busca **solo en el pedido en curso**: un código de otro pedido de la ronda es "Producto incorrecto".
 * Un código de 7 dígitos es tecleado (sin cantidad): "Ingreso manual no permitido", salvo en la simplificada.
 */
export function evaluarLectura(p: PedidoRevision, valor: string): ResultadoLecturaRevision {
  const l = leerCodigo(valor);
  if (l.tipo === 'invalido') return { tipo: 'invalido' };
  const partida = p.partidas.find((x) => x.codigo === l.codigo);
  if (!partida) return { tipo: 'incorrecto', codigo: l.codigo };
  if (partida.simplificada) return { tipo: 'simplificada', codigo: l.codigo };
  if (l.tipo === 'codigo') return { tipo: 'manual', codigo: l.codigo };
  if (l.cantidad <= 0) return { tipo: 'cantidad-invalida', codigo: l.codigo };
  if (partida.revisado + l.cantidad > partida.surtido) return { tipo: 'sobrante', codigo: l.codigo };
  return { tipo: 'ok', codigo: l.codigo, cantidad: l.cantidad };
}

/** Avisos de la lectura con los textos de `es.ts` de la app (sin las negritas `**`, que el toast no pinta). */
export const AVISOS_REVISION: Record<Exclude<ResultadoLecturaRevision['tipo'], 'ok' | 'simplificada'>, { title: string; message: string }> = {
  invalido: { title: 'Código inválido', message: 'El código de barras capturado no es válido.' },
  incorrecto: { title: 'Producto incorrecto', message: 'El producto escaneado no pertenece a este pedido.' },
  manual: { title: 'Ingreso manual no permitido', message: 'Ingreso manual no permitido para este producto. Escanea la etiqueta.' },
  'cantidad-invalida': {
    title: 'Cantidad inválida',
    message: 'No es posible revisar un producto con cantidad cero. Por favor, ingresa una cantidad mayor.',
  },
  sobrante: {
    title: 'Escaneo sobrante',
    message: 'La cantidad ingresada es mayor a la cantidad surtida. Por favor, ingresa una cantidad menor.',
  },
};

/* ------------------------------------------------------------------ *
 * Finalizar
 * ------------------------------------------------------------------ */

export type CodigoPromocion = { codigo: string; revisado: number; surtido: number };

export type PasoFinalizar =
  | { tipo: 'corporativo' }
  | { tipo: 'promocion'; codigos: CodigoPromocion[] }
  | { tipo: 'discrepancias'; codigos: string[] }
  | { tipo: 'confirmar'; sinDiferencias: boolean };

/** Partidas con diferencia que todavía no se negaron, por código ascendente (gestor de discrepancias). */
export function codigosConDiferencia(p: PedidoRevision): string[] {
  return p.partidas
    .filter((x) => x.revisado < x.surtido && !x.negacion)
    .map((x) => x.codigo)
    .sort((a, b) => Number(a) - Number(b));
}

/**
 * Intent revisión · R15, R16: lo que sale al pedir finalizar, en el orden de la app: corporativo incompleto →
 * promoción incompleta → discrepancias → confirmación.
 */
export function pasoFinalizar(p: PedidoRevision): PasoFinalizar {
  const incompleto = p.partidas.some((x) => x.revisado < x.surtido);
  if (p.corporativoOC && incompleto) return { tipo: 'corporativo' };
  const promosIncompletas = new Set(p.partidas.filter((x) => x.promocion && x.revisado < x.surtido).map((x) => x.promocion!.id));
  if (promosIncompletas.size > 0) {
    const codigos = p.partidas
      .filter((x) => x.promocion && promosIncompletas.has(x.promocion.id))
      .map((x) => ({ codigo: x.codigo, revisado: x.revisado, surtido: x.surtido }));
    return { tipo: 'promocion', codigos };
  }
  const diferencias = codigosConDiferencia(p);
  if (diferencias.length > 0) return { tipo: 'discrepancias', codigos: diferencias };
  return { tipo: 'confirmar', sinDiferencias: p.partidas.every((x) => !x.negacion) };
}

/* ------------------------------------------------------------------ *
 * Reducer (todas las acciones son sobre el pedido en curso)
 * ------------------------------------------------------------------ */

export type RevisionAction =
  | { type: 'cargar'; estado: RevisionState }
  /** Escaneo válido: suma la cantidad de la etiqueta. */
  | { type: 'sumar'; codigo: string; cantidad: number }
  /** Simplificada o detalle: fija la cantidad revisada (0 = cancelar la revisión del producto). */
  | { type: 'fijar'; codigo: string; cantidad: number }
  | { type: 'negar'; codigo: string; negacion: Negacion }
  /** "¿Regresar a revisión?": se restablecen los productos negados. */
  | { type: 'quitarNegaciones' }
  | { type: 'finalizarPedido' }
  /** Corporativo incompleto que se saca de la ronda. */
  | { type: 'retirarPedido' }
  /** Intent revisión · R9: salir a mitad del pedido descarta su avance, como hoy. */
  | { type: 'descartarAvance' };

function enCurso(s: RevisionState, fn: (p: PedidoRevision) => PedidoRevision): RevisionState {
  const i = pedidoEnCursoIdx(s);
  if (i < 0) return s;
  return { ...s, pedidos: s.pedidos.map((p, j) => (j === i ? fn(p) : p)) };
}

const conPartida = (codigo: string, fn: (x: PartidaRevision) => PartidaRevision) => (p: PedidoRevision): PedidoRevision => ({
  ...p,
  partidas: p.partidas.map((x) => (x.codigo === codigo ? fn(x) : x)),
});

export function revisionReducer(s: RevisionState, a: RevisionAction): RevisionState {
  switch (a.type) {
    case 'cargar':
      return a.estado;
    case 'sumar':
      return enCurso(s, conPartida(a.codigo, (x) => ({ ...x, revisado: Math.min(x.surtido, x.revisado + a.cantidad) })));
    case 'fijar':
      return enCurso(s, conPartida(a.codigo, (x) => ({ ...x, revisado: Math.max(0, Math.min(x.surtido, a.cantidad)), negacion: null })));
    case 'negar':
      return enCurso(s, conPartida(a.codigo, (x) => ({ ...x, negacion: a.negacion })));
    case 'quitarNegaciones':
      return enCurso(s, (p) => ({ ...p, partidas: p.partidas.map((x) => ({ ...x, negacion: null })) }));
    case 'finalizarPedido':
      return enCurso(s, (p) => ({ ...p, estado: 'revisado' }));
    case 'retirarPedido':
      return enCurso(s, (p) => ({ ...p, estado: 'retirado' }));
    case 'descartarAvance':
      return enCurso(s, (p) => ({ ...p, partidas: p.partidas.map((x) => ({ ...x, revisado: 0, negacion: null })) }));
  }
}
