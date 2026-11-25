/**
 * Datos de ejemplo de la facturación y el embarque de la ronda G-500 (propuesta sin spec,
 * docs/REVISION-MULTIPEDIDO-INTENT.md · R18–R27). Las direcciones, precios y embarques son ficticios; los textos de las
 * pantallas son los de Figma "🧾 Facturación" y "🚚 Embarque".
 *
 * 1001 (A) y 1003 (C) son del cliente 48213 con la **misma dirección de entrega**: el embarque que se crea para A es
 * compatible con C. 1002 (B) es del 51077.
 */
import type { Cliente } from '../domain/ronda';
import type { DatosFacturaPedido, Direccion, Embarque, FacturacionState } from '../domain/facturacion';
import { EMPLEADO } from './ronda';

/** Precio unitario por código (ilustrativo). */
export const PRECIOS: Record<string, number> = {
  '0486600': 285.5,
  '2389475': 189,
  '1394010': 39.9,
  '1365800': 612,
  '2012000': 24.5,
  '1978000': 18,
  '2010000': 26,
};

export const DIRECCIONES: Record<string, Direccion> = {
  'D-48213-1': { id: 'D-48213-1', texto: 'Av. Industria 120 Int. 0, Parque Industrial, 45130 Zapopan, Jalisco.' },
  'D-48213-2': { id: 'D-48213-2', texto: 'Calle Laurel 48 Int. 3, Las Arboledas, 45070 Zapopan, Jalisco.' },
  'D-51077-1': { id: 'D-51077-1', texto: 'Av. Central 905 Int. 0, Centro, 44100 Guadalajara, Jalisco.' },
};

const FISCAL: Record<string, Direccion> = {
  '48213': DIRECCIONES['D-48213-1'],
  '51077': DIRECCIONES['D-51077-1'],
};

const ORIGEN: Record<string, string> = { '1001': 'Mostrador', '1002': 'Web', '1003': 'Mostrador' };

/** Empleado que revisó (tarea 34): el mismo surtidor de la demo. */
export const EMPLEADO_FACTURA = `${EMPLEADO.id} | ${EMPLEADO.nombre}`;

/** Datos de la factura de cada pedido. `entregas` cambia la dirección de entrega de un pedido (escenarios). */
export function datosFactura(entregas: Record<string, string> = {}) {
  return (pedidoId: string, cliente: Cliente): DatosFacturaPedido => ({
    origen: ORIGEN[pedidoId] ?? 'Mostrador',
    formaPago: 'Factura | Venta a crédito',
    metodoEntrega: 'Envío a domicilio',
    direccionFiscal: FISCAL[cliente.id] ?? DIRECCIONES['D-48213-1'],
    direccionEntrega: DIRECCIONES[entregas[pedidoId] ?? `D-${cliente.id}-1`] ?? DIRECCIONES['D-48213-1'],
  });
}

/** Folio y número de embarque siguientes (los de Figma), sin embarques activos previos. */
export const FACTURACION_BASE: Pick<FacturacionState, 'embarques' | 'siguienteFolio' | 'siguienteEmbarque'> = {
  embarques: [],
  siguienteFolio: 1099204,
  siguienteEmbarque: 147707,
};

/** Embarque activo de días anteriores para 51077 en su dirección (compatible con B). */
export const EMBARQUE_PREVIO_B: Embarque = {
  id: '147650',
  clienteId: '51077',
  direccionId: 'D-51077-1',
  paqueteria: 'ESTAFETA',
  comentario: 'Entregar en recepción, horario de 9 a 18 h',
  facturas: 1,
  fecha: '2026-11-24 17:40',
};

/** Embarque activo de 48213 en **otra** dirección: no es compatible con A ni con C. */
export const EMBARQUE_OTRA_DIRECCION: Embarque = {
  id: '147655',
  clienteId: '48213',
  direccionId: 'D-48213-2',
  paqueteria: 'PAQUETERIA INTERNA',
  comentario: 'Sucursal Arboledas',
  facturas: 2,
  fecha: '2026-11-24 12:05',
};
