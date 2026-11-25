/**
 * "Revisión de pedido" de la ronda multipedido (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md).
 *
 * Es la pantalla de la revisión independiente de hoy (Figma "🔎 Revisión - Independiente" › Interfaz principal
 * revisión; `AssortmentCheckScreen` de exodus-gtm-pwa) aplicada al pedido en curso de la ronda. Lo nuevo:
 * - Intent revisión · R6: la línea "Ronda G-500 · Pedido n de N" y la letra del contenedor junto al pedido.
 * - Intent revisión · R7: al finalizar un pedido, el aviso "Continúa con…" (✓) abre el siguiente.
 * - Intent revisión · R8: al finalizar el último, toast "Revisión finalizada" y regreso a la asignación.
 * - Intent revisión · R9: la flecha "Menú" sale y descarta el avance del pedido en curso, como hoy.
 */
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import avanceIcon from '@assets/icons/avance-pedido.svg';
import { AppHeader } from '@ds/components/organisms/AppHeader/AppHeader';
import { ContentPanel } from '@ds/components/organisms/ContentPanel/ContentPanel';
import { BottomBar } from '@ds/components/organisms/BottomBar/BottomBar';
import { Chip } from '@ds/components/atoms/Chip/Chip';
import { ScanInput, type ScanInputHandle } from '@ds/components/molecules/ScanInput/ScanInput';
import {
  AVISOS_REVISION,
  avance,
  estadoRevision,
  evaluarLectura,
  indicador,
  ordenarPartidas,
  pasoFinalizar,
  pedidoEnCurso,
  pedidoEnCursoIdx,
  pedidoRevisadoCompleto,
  revisionReducer,
  type CodigoPromocion,
  type Negacion,
  type PedidoRevision,
} from '../../domain/revision';
import { fallaUnaVez } from '../../domain/simulacion';
import { sonar } from '../../domain/sonidos';
import { useStore } from '../../store/AppStore';
import { AvisoModal, ConNegritas, TextoAviso, botonesConfirmar } from '../surtido/overlays/Avisos';
import { ContenedorLetra } from '../surtido/Contenedores';
import { DiscrepanciaModal, MenuRevision, MotivoModal, SiguientePedidoModal, SimplificadaModal } from './RevisionModals';
import { FOTO_POR_DEFECTO } from './useFoto';
import styles from './Revision.module.css';

type Cola = { cola: string[]; idx: number; negados: number };

type Modal =
  | { t: 'menu' }
  | { t: 'simplificada'; codigo: string }
  | { t: 'confirmar'; sinDiferencias: boolean }
  | { t: 'corporativo' }
  | { t: 'promocion'; codigos: CodigoPromocion[] }
  | ({ t: 'discrepancia' } & Cola)
  | ({ t: 'motivo'; tipo: Negacion['tipo'] } & Cola)
  | ({ t: 'regresar' } & Cola)
  | { t: 'red' }
  | { t: 'siguiente'; terminado: PedidoRevision; siguiente: PedidoRevision; retirado?: boolean };

const TEXTO_CORPORATIVO =
  'Este es un **pedido corporativo** que requiere surtido y revisado en su totalidad. Actualmente hay **productos sin revisar,** por lo que no puede finalizarse.';

export function RevisionPedido() {
  const navigate = useNavigate();
  const { revision, dispatchRevision, cargarFacturacion, mostrarToast, simulacion } = useStore();
  const [modal, setModal] = useState<Modal | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const scanRef = useRef<ScanInputHandle>(null);
  // Cierre automático al 100 %: se ofrece cuando el pedido pasa a completo (no cada render).
  const completoAntes = useRef<{ id: string; completo: boolean } | null>(null);

  const pedido = revision ? pedidoEnCurso(revision) : null;

  useEffect(() => {
    if (!pedido) return;
    const completo = pedidoRevisadoCompleto(pedido);
    const antes = completoAntes.current?.id === pedido.id ? completoAntes.current.completo : false;
    completoAntes.current = { id: pedido.id, completo };
    if (completo && !antes && !modal) {
      const paso = pasoFinalizar(pedido);
      // Intent revisión · R15: al 100 % se ofrece finalizar sin pasar por el menú.
      if (paso.tipo === 'confirmar') setModal({ t: 'confirmar', sinDiferencias: paso.sinDiferencias });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  useEffect(() => {
    if (!ultimo) return;
    document.querySelector(`[data-revision="${ultimo}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [ultimo]);

  if (!revision || !pedido) return <Navigate to="/tareas" replace />;

  const { n, total } = indicador(revision);
  const pct = avance(pedido);
  const partidas = ordenarPartidas(pedido.partidas);
  const partidaDe = (codigo: string) => pedido.partidas.find((x) => x.codigo === codigo)!;

  const cerrar = () => {
    setModal(null);
    window.setTimeout(() => scanRef.current?.focus(), 0);
  };

  /** Intent revisión · R12: escaneo en el pedido en curso. */
  const onScan = (valor: string) => {
    if (modal) return;
    const res = evaluarLectura(pedido, valor);
    if (res.tipo === 'ok') {
      dispatchRevision({ type: 'sumar', codigo: res.codigo, cantidad: res.cantidad });
      setUltimo(res.codigo);
      return sonar('ok');
    }
    if (res.tipo === 'simplificada') return setModal({ t: 'simplificada', codigo: res.codigo });
    sonar('error');
    mostrarToast({ kind: 'error', ...AVISOS_REVISION[res.tipo] });
  };

  /** Intent revisión · R16: finalizar desde el menú, en el orden de la app. */
  const finalizarManual = () => {
    const paso = pasoFinalizar(pedido);
    if (paso.tipo === 'corporativo') return setModal({ t: 'corporativo' });
    if (paso.tipo === 'promocion') return setModal({ t: 'promocion', codigos: paso.codigos });
    if (paso.tipo === 'discrepancias') {
      sonar('error');
      return setModal({ t: 'discrepancia', cola: paso.codigos, idx: 0, negados: 0 });
    }
    setModal({ t: 'confirmar', sinDiferencias: paso.sinDiferencias });
  };

  /** El siguiente pedido pendiente después del que está en curso. */
  const siguienteDe = () => {
    const i = pedidoEnCursoIdx(revision);
    return revision.pedidos.find((p, j) => j > i && p.estado === 'pendiente') ?? null;
  };

  /** Fin de la ronda (Intent revisión · R8): la asignación muestra la siguiente tarea de la cola. */
  const terminarRonda = (titulo: string, mensaje: string, accion: 'finalizarPedido' | 'retirarPedido') => {
    // Intent revisión · R8, R18: al cerrar la revisión de la ronda, la siguiente tarea es la 35 de esta misma ronda
    // (factura y embarque de cada pedido de cliente). La bandera de facturación solo decide si se toma en la HH (R20).
    cargarFacturacion(revisionReducer(revision, { type: accion }));
    mostrarToast({ kind: 'success', title: titulo, message: mensaje });
    navigate('/tareas');
  };

  /** `TareaRevision/Finalizar` del pedido en curso. Intent revisión · R17: si falla la red, no se avanza. */
  const enviar = () => {
    if (simulacion.fallaFinalizarRevision === pedido.id && fallaUnaVez(`revision-${pedido.id}`)) {
      sonar('error');
      return setModal({ t: 'red' });
    }
    const siguiente = siguienteDe();
    dispatchRevision({ type: 'finalizarPedido' });
    sonar('ok');
    setUltimo(null);
    if (siguiente) return setModal({ t: 'siguiente', terminado: pedido, siguiente });
    terminarRonda('Revisión finalizada', 'Se revisó toda la mercancía del pedido correctamente.', 'finalizarPedido');
  };

  /** Corporativo incompleto: se saca de la ronda y se sigue con el siguiente pedido. */
  const retirar = () => {
    const siguiente = siguienteDe();
    dispatchRevision({ type: 'retirarPedido' });
    setUltimo(null);
    if (siguiente) return setModal({ t: 'siguiente', terminado: pedido, siguiente, retirado: true });
    terminarRonda('Pedido retirado de la ronda', 'Aparta la mercancía ya revisada y repórtalo para su validación.', 'retirarPedido');
  };

  /** Intent revisión · R9: salir descarta el avance del pedido en curso; los ya finalizados se conservan. */
  const salir = () => {
    dispatchRevision({ type: 'descartarAvance' });
    navigate('/tareas');
  };

  return (
    <div className={styles.screen}>
      <AppHeader backLabel="Menú" onBack={salir} onMenu={() => setModal({ t: 'menu' })} />

      <ContentPanel title="Revisión de pedido" bottom={124} scroll>
        <div className={styles.cuerpo}>
          {total > 1 && (
            <p className={styles.indicador} aria-live="polite">
              Ronda {revision.rondaId} · <b>Pedido {n} de {total}</b>
            </p>
          )}

          <section className={styles.avance} aria-label="Avance de la revisión">
            <div className={styles.avanceHead}>
              <span className={styles.avanceTitulo}>
                <img src={avanceIcon} alt="" width={11.161} height={13.708} />
                Avance de la revisión
              </span>
              <span className={styles.avancePedido}>
                {total > 1 && <ContenedorLetra letra={pedido.letra} variante="invertido" size={22} />}
                <b>Pedido {pedido.id}</b>
              </span>
            </div>
            <div className={styles.avanceBody}>
              <div className={styles.barra} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className={styles.barraRelleno} style={{ width: `${Math.max(pct, 9)}%` }}>
                  <span>{pct}%</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.tabla} aria-label="Productos del pedido">
            <div className={styles.tablaHead}>
              <span>PRODUCTO</span>
              <span>SURTIDO</span>
              <span>REVISADO</span>
            </div>
            <ul className={styles.filas}>
              {partidas.map((x) => {
                const estado = estadoRevision(x);
                return (
                  <li key={x.codigo}>
                    <button
                      type="button"
                      data-revision={x.codigo}
                      className={`${styles.fila} ${ultimo === x.codigo ? styles.filaUltima : ''}`}
                      onClick={() => navigate(`/revision/detalle/${x.codigo}`)}
                    >
                      <span className={styles.producto}>
                        <img className={styles.thumb} src={x.imagen} alt="" onError={(e) => (e.currentTarget.src = FOTO_POR_DEFECTO)} />
                        <span className={styles.productoTexto}>
                          <b>{x.codigo}</b>
                          <span className={styles.descripcion}>{x.descripcion}</span>
                        </span>
                      </span>
                      <span className={styles.numero}>{x.surtido}</span>
                      <span className={styles.numero}>
                        <span className={`${styles.chip} ${styles[estado]}`}>{x.revisado}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </ContentPanel>

      <BottomBar>
        <ScanInput ref={scanRef} onScan={onScan} autoFocus={!modal} />
      </BottomBar>

      {modal?.t === 'menu' && (
        <MenuRevision
          onCerrar={cerrar}
          onFinalizar={() => {
            setModal(null);
            finalizarManual();
          }}
        />
      )}

      {modal?.t === 'simplificada' && (
        <SimplificadaModal
          partida={partidaDe(modal.codigo)}
          onCancelar={cerrar}
          onConfirmar={(cantidad) => {
            if (cantidad > partidaDe(modal.codigo).surtido) {
              sonar('error');
              return mostrarToast({ kind: 'error', ...AVISOS_REVISION.sobrante });
            }
            dispatchRevision({ type: 'fijar', codigo: modal.codigo, cantidad });
            setUltimo(modal.codigo);
            sonar('ok');
            cerrar();
          }}
        />
      )}

      {modal?.t === 'confirmar' && (
        <AvisoModal titulo="Finalizar revisión" botones={botonesConfirmar(cerrar, enviar)}>
          {modal.sinDiferencias && <p className={styles.sinDiferencias}>Revisión sin diferencias</p>}
          <TextoAviso>¿Deseas finalizar la revisión?</TextoAviso>
        </AvisoModal>
      )}

      {modal?.t === 'corporativo' && (
        <AvisoModal titulo="No es posible finalizar este pedido" tipo="error" botones={botonesConfirmar(cerrar, retirar)}>
          <TextoAviso>
            <ConNegritas texto={TEXTO_CORPORATIVO} />
          </TextoAviso>
          <TextoAviso>
            <b>Aparta la mercancía ya revisada y repórtalo para su validación.</b>
          </TextoAviso>
          <TextoAviso>¿Deseas sacar el pedido de la ronda?</TextoAviso>
        </AvisoModal>
      )}

      {modal?.t === 'promocion' && (
        <AvisoModal
          titulo="No es posible finalizar este pedido"
          tipo="error"
          botones={[{ label: 'Cerrar', variante: 'error', icono: 'cross', onClick: cerrar }]}
        >
          <TextoAviso>
            Existen diferencias respecto a las promociones surtidas, mientras que estas diferencias permanezcan no se podrá
            finalizar la revisión.
          </TextoAviso>
          <div className={styles.promo}>
            <b className={styles.promoTitulo}>Códigos de la promoción</b>
            {modal.codigos.map((c) => (
              <div key={c.codigo} className={styles.promoFila}>
                <b>{c.codigo}</b>
                <Chip
                  status={c.revisado >= c.surtido ? 'completado' : c.revisado > 0 ? 'parcial' : 'no-iniciado'}
                  value={c.revisado}
                  total={c.surtido}
                />
              </div>
            ))}
          </div>
        </AvisoModal>
      )}

      {modal?.t === 'discrepancia' && (
        <DiscrepanciaModal
          partida={partidaDe(modal.cola[modal.idx])}
          onRegresar={() => (modal.negados > 0 ? setModal({ ...modal, t: 'regresar' }) : cerrar())}
          onNegar={(tipo) => setModal({ t: 'motivo', tipo, cola: modal.cola, idx: modal.idx, negados: modal.negados })}
        />
      )}

      {modal?.t === 'motivo' && (
        <MotivoModal
          partida={partidaDe(modal.cola[modal.idx])}
          tipo={modal.tipo}
          onCancelar={() => setModal({ t: 'discrepancia', cola: modal.cola, idx: modal.idx, negados: modal.negados })}
          onConfirmar={(motivo) => {
            dispatchRevision({ type: 'negar', codigo: modal.cola[modal.idx], negacion: { tipo: modal.tipo, motivo } });
            sonar('ok');
            const idx = modal.idx + 1;
            if (idx < modal.cola.length) return setModal({ t: 'discrepancia', cola: modal.cola, idx, negados: modal.negados + 1 });
            setModal({ t: 'confirmar', sinDiferencias: false });
          }}
        />
      )}

      {modal?.t === 'regresar' && (
        <AvisoModal
          titulo="¿Regresar a revisión?"
          botones={botonesConfirmar(
            () => setModal({ t: 'discrepancia', cola: modal.cola, idx: modal.idx, negados: modal.negados }),
            () => {
              dispatchRevision({ type: 'quitarNegaciones' });
              cerrar();
            },
          )}
        >
          <TextoAviso>Al regresar a la pantalla de revisión, se restablecerán los productos que se negaron como faltantes.</TextoAviso>
          <TextoAviso>Tendrás que volver a negarlos al terminar.</TextoAviso>
        </AvisoModal>
      )}

      {modal?.t === 'red' && (
        <AvisoModal
          titulo="Tarea incompleta"
          tipo="reloj"
          botones={[
            { label: 'Cancelar', variante: 'error', onClick: cerrar },
            { label: 'Reintentar', variante: 'success', onClick: enviar },
          ]}
        >
          <TextoAviso>Hubo un error de red al finalizar la revisión. Por favor, acércate a un access point y vuelve a intentarlo.</TextoAviso>
        </AvisoModal>
      )}

      {modal?.t === 'siguiente' && (
        <SiguientePedidoModal terminado={modal.terminado} siguiente={modal.siguiente} retirado={modal.retirado} onContinuar={cerrar} />
      )}
    </div>
  );
}
