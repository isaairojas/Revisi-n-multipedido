/**
 * Estado global del surtido multipedido V2: ronda en curso, toasts y, solo para la demo, la configuración
 * simulada de la sucursal.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import { estadoInicial, pedidoCompleto, rondaReducer, tareaSinAvance, type RondaAction, type RondaState } from '../domain/ronda';
import { SIMULACION_INICIAL, type Simulacion } from '../domain/simulacion';
import { SIGUIENTE_RONDA } from '../mocks/ronda';
import { revisionDesdeRonda, revisionReducer, type RevisionAction, type RevisionState } from '../domain/revision';
import { facturacionDesdeRevision, facturacionReducer, type FacturacionAction, type FacturacionState } from '../domain/facturacion';
import { FACTURACION_BASE, PRECIOS, datosFactura } from '../mocks/facturacion';
import type { Ronda } from '../domain/ronda';
import { hablar } from '../domain/voz';
import type { ToastKind } from '../design-system/components/organisms/Toast/Toast';

export type Etapa = 'surtido' | 'tareas' | 'revision' | 'facturacion';

/** Tarea cargada en la asignación: la ronda por surtir o la revisión de la ronda ya surtida (propuesta sin spec). */
export type TareaCargada = 'surtido' | 'revision' | 'facturacion';

export type ToastData = { id: number; kind: ToastKind; title: string; message: string };

/** Último código surtido y el pedido que lo recibió: la lista y las tarjetas lo resaltan (solo presentación). */
export type UltimoEscaneo = { codigo: string; pedidoId: string };

type Store = {
  ronda: RondaState;
  dispatch: Dispatch<RondaAction>;
  etapa: Etapa;
  setEtapa: (e: Etapa) => void;
  toast: ToastData | null;
  mostrarToast: (t: Omit<ToastData, 'id'>) => void;
  cerrarToast: () => void;
  ultimoEscaneo: UltimoEscaneo | null;
  setUltimoEscaneo: (u: UltimoEscaneo | null) => void;
  /**
   * Pedidos cuyo aviso "Pedido completado" ya salió (o que ya estaban cerrados al arrancar). Vive aquí y
   * no en la lista porque un pedido también se cierra o se reabre desde el detalle, que desmonta la lista.
   */
  pedidosAvisados: Set<string>;
  /** Configuración simulada de la sucursal, la tarea y el servidor (la siembra el escenario). */
  simulacion: Simulacion;
  /** La tarea tal como llegó del servidor (sin avance): salir del listado descarta todo y vuelve a este estado. */
  tareaOriginal: RondaState;
  /**
   * El listado ya se abrió (contenedores vinculados). Ir al detalle y volver no es una
   * apertura nueva; salir, finalizar o retomar la tarea sí.
   */
  listadoAbierto: boolean;
  setListadoAbierto: (v: boolean) => void;
  /**
   * Carga la siguiente tarea de la cola al finalizar la ronda: la asignación de tareas la muestra ya cargada
   * (SDD 2026-10-26-multipedido-surtido-listado · Finalizar el surtido del pedido).
   */
  cargarSiguienteTarea: () => void;
  /** Última lectura en voz alta: la demo la muestra también como subtítulo (`VozHost`). */
  lectura: { id: number; texto: string } | null;
  /** Lee en voz alta (si el navegador tiene voz) y deja el subtítulo. Quien llama decide si se debe leer. */
  leer: (texto: string) => void;

  /* ---- Revisión multipedido (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md) ---- */
  tarea: TareaCargada;
  /** Revisión de la ronda: sus pedidos en el orden del surtido, con lo revisado del pedido en curso. */
  revision: RevisionState | null;
  dispatchRevision: Dispatch<RevisionAction>;
  /** Intent revisión · R1: al finalizar el surtido queda cargada la revisión de la misma ronda. */
  cargarRevision: (r: Ronda) => void;
  /** Intent revisión · R8: al terminar el último pedido, la asignación muestra la siguiente tarea de la cola. */
  terminarRevision: () => void;

  /* ---- Facturación y embarque de la ronda, tarea 35 (propuesta sin spec: R18–R27) ---- */
  facturacion: FacturacionState | null;
  dispatchFacturacion: Dispatch<FacturacionAction>;
  /** Intent revisión · R18: al cerrar la revisión de la ronda queda cargada la tarea 35 de la misma ronda. */
  cargarFacturacion: (rev: RevisionState) => void;
  /** Intent revisión · R27: al terminar el último pedido, la asignación muestra la siguiente tarea de la cola. */
  terminarFacturacion: () => void;
};

const Ctx = createContext<Store | null>(null);

export type Semilla = {
  ronda?: RondaState;
  etapa?: Etapa;
  toast?: Omit<ToastData, 'id'>;
  ultimoEscaneo?: UltimoEscaneo;
  simulacion?: Partial<Simulacion>;
  /** Con revisión, la asignación muestra la tarea de revisión (y no la de surtido). */
  revision?: RevisionState;
  /** Con facturación, la asignación muestra la tarea 35 de la ronda. */
  facturacion?: FacturacionState;
};

export function AppStoreProvider({ children, semilla }: { children: ReactNode; semilla?: Semilla }) {
  const [ronda, dispatch] = useReducer(rondaReducer, undefined, () => semilla?.ronda ?? estadoInicial());
  const [tareaOriginal, setTareaOriginal] = useState<RondaState>(() => tareaSinAvance(ronda));
  const [etapa, setEtapa] = useState<Etapa>(semilla?.etapa ?? 'tareas');
  const [toast, setToast] = useState<ToastData | null>(semilla?.toast ? { id: 0, ...semilla.toast } : null);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<UltimoEscaneo | null>(semilla?.ultimoEscaneo ?? null);
  // Conjunto mutable y estable: la lista lo consulta y lo actualiza al mostrar el aviso.
  const [pedidosAvisados] = useState(() => new Set(ronda.ronda.pedidos.filter(pedidoCompleto).map((p) => p.id)));
  const [simulacion] = useState<Simulacion>(() => ({ ...SIMULACION_INICIAL, ...semilla?.simulacion }));
  const [listadoAbierto, setListadoAbierto] = useState(false);
  const [tarea, setTarea] = useState<TareaCargada>(semilla?.facturacion ? 'facturacion' : semilla?.revision ? 'revision' : 'surtido');
  const [facturacionEstado, dispatchFacturacion] = useReducer(
    (s: FacturacionState | null, a: FacturacionAction) => (a.type === 'cargar' ? a.estado : s ? facturacionReducer(s, a) : s),
    semilla?.facturacion ?? null,
  );
  const [revisionEstado, dispatchRevision] = useReducer(
    (s: RevisionState | null, a: RevisionAction) => (a.type === 'cargar' ? a.estado : s ? revisionReducer(s, a) : s),
    semilla?.revision ?? null,
  );

  // SDD 2026-10-26-multipedido-surtido-listado · Corregir la cantidad surtida de un pedido: un pedido reabierto por
  // una corrección vuelve a avisar "Pedido completado" cuando se completa otra vez.
  useEffect(() => {
    for (const p of ronda.ronda.pedidos) if (!pedidoCompleto(p)) pedidosAvisados.delete(p.id);
  }, [ronda, pedidosAvisados]);

  const mostrarToast = useCallback((t: Omit<ToastData, 'id'>) => setToast({ id: Date.now(), ...t }), []);
  const cerrarToast = useCallback(() => setToast(null), []);

  const [lectura, setLectura] = useState<{ id: number; texto: string } | null>(null);
  const leer = useCallback((texto: string) => {
    hablar(texto);
    setLectura({ id: Date.now(), texto });
  }, []);

  const cargarSiguienteTarea = useCallback(() => {
    const siguiente = estadoInicial(SIGUIENTE_RONDA);
    pedidosAvisados.clear();
    dispatch({ type: 'cargar', estado: siguiente });
    setTareaOriginal(siguiente);
    setUltimoEscaneo(null);
    setListadoAbierto(false);
  }, [pedidosAvisados]);

  const cargarRevision = useCallback((r: Ronda) => {
    dispatchRevision({ type: 'cargar', estado: revisionDesdeRonda(r) });
    setTarea('revision');
  }, []);

  const terminarRevision = useCallback(() => {
    cargarSiguienteTarea();
    setTarea('surtido');
  }, [cargarSiguienteTarea]);

  const cargarFacturacion = useCallback((rev: RevisionState) => {
    dispatchFacturacion({ type: 'cargar', estado: facturacionDesdeRevision(rev, PRECIOS, datosFactura(), FACTURACION_BASE) });
    setTarea('facturacion');
  }, []);

  const terminarFacturacion = useCallback(() => {
    cargarSiguienteTarea();
    setTarea('surtido');
  }, [cargarSiguienteTarea]);

  const value = useMemo(
    () => ({
      ronda,
      dispatch,
      etapa,
      setEtapa,
      toast,
      mostrarToast,
      cerrarToast,
      ultimoEscaneo,
      setUltimoEscaneo,
      pedidosAvisados,
      simulacion,
      tareaOriginal,
      listadoAbierto,
      setListadoAbierto,
      cargarSiguienteTarea,
      lectura,
      leer,
      tarea,
      revision: revisionEstado,
      dispatchRevision,
      cargarRevision,
      terminarRevision,
      facturacion: facturacionEstado,
      dispatchFacturacion,
      cargarFacturacion,
      terminarFacturacion,
    }),
    [ronda, etapa, toast, mostrarToast, cerrarToast, ultimoEscaneo, pedidosAvisados, simulacion, tareaOriginal, listadoAbierto, cargarSiguienteTarea, lectura, leer, tarea, revisionEstado, cargarRevision, terminarRevision, facturacionEstado, cargarFacturacion, terminarFacturacion],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de AppStoreProvider');
  return s;
}
