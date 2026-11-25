/**
 * "Datos de la factura" de la tarea 35 de la ronda (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md · R19–R27).
 * Figma "🧾 Facturación" 3841:818 (formulario) · 6004:6726 (generando) · 6004:6594 (error) · 6004:7618 (facturada) y
 * "🚚 Embarque" 6157:11770 / 6157:1645. Base: `DatosFactura` del prototipo "Solicitud anticipada Uber" y
 * `BillingTaskScreen` de exodus-gtm-pwa (release/2.14.0).
 *
 * Lo nuevo de la ronda: el indicador "Ronda · Pedido n de N" con la letra (R19), el reintento de timbrado (R23) y el
 * aviso "Continúa con…" entre pedidos (R27). La dirección de entrega es de solo lectura (R21).
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import idCard from '@assets/icons/id-card.svg';
import listAlt from '@assets/icons/list-alt.svg';
import receiptLong from '@assets/icons/receipt-long.svg';
import personIcon from '@assets/icons/person.svg';
import ordersIcon from '@assets/icons/orders.svg';
import locationOn from '@assets/icons/location-on.svg';
import handPackage from '@assets/icons/hand-package.svg';
import printIcon24 from '@assets/icons/print-24.svg';
import loading from '@assets/icons/loading-indicator.svg';
import stepperMenos from '@assets/icons/stepper-menos.svg';
import stepperMas from '@assets/icons/stepper-mas.svg';
import { AppHeader } from '@ds/components/organisms/AppHeader/AppHeader';
import { ContentPanel } from '@ds/components/organisms/ContentPanel/ContentPanel';
import { BottomBar } from '@ds/components/organisms/BottomBar/BottomBar';
import { Button } from '@ds/components/atoms/Button/Button';
import { Stepper } from '@ds/components/atoms/Stepper/Stepper';
import { FloatingLabelInput } from '@ds/components/molecules/FloatingLabelInput/FloatingLabelInput';
import {
  embarqueDe,
  embarquesCompatibles,
  facturacionReducer,
  pedidoEnCurso,
  type Embarque,
  type PedidoFacturacion,
} from '../../domain/facturacion';
import { fallaUnaVez, type Simulacion } from '../../domain/simulacion';
import { sonar } from '../../domain/sonidos';
import { EMPLEADO_FACTURA } from '../../mocks/facturacion';
import { useStore, type ToastData } from '../../store/AppStore';
import { ContenedorLetra } from '../surtido/Contenedores';
import {
  AgregarEmbarqueEleccionModal,
  AgregarEmbarqueSelectorModal,
  EmbarqueCreadoModal,
  FacturaAgregadaModal,
  FacturaSinTimbrarModal,
  NuevoEmbarqueModal,
  SiguienteFacturaModal,
} from './FacturacionModals';
import revision from '../revision/Revision.module.css';
import styles from './DatosFactura.module.css';

type Proceso = 'generando' | 'timbrando' | null;

type Overlay =
  | { k: 'sinTimbrar' }
  | { k: 'eleccion' }
  | { k: 'nuevo'; hayActivos: boolean }
  | { k: 'selector' }
  | { k: 'creado'; embarqueId: string }
  | { k: 'agregada'; embarqueId: string }
  | { k: 'siguiente'; terminado: PedidoFacturacion; siguiente: PedidoFacturacion; embarqueId: string };

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const TOAST_ERROR_FACTURA: Omit<ToastData, 'id'> = {
  kind: 'error',
  title: 'Error al generar la factura',
  message: 'Podría ser la conexión a internet, acercate al Wi-Fi de tu sucursal e inténtalo nuevamente.',
};

/** Intent revisión · R24: toast de impresión según la impresora del proceso "Factura pedidos cliente". */
function toastImpresion(sim: Simulacion, mensajeOk: string): Omit<ToastData, 'id'> {
  if (sim.impresora === 'no-configurada') {
    return { kind: 'warning', title: 'Impresora no configurada', message: 'No podrás imprimir hasta que asignes una impresora a este proceso.' };
  }
  if (sim.impresora === 'sin-conexion') {
    return {
      kind: 'error',
      title: 'Impresora sin conexión',
      message: 'No se pudo conectar con la impresora. Verifica que esté encendida y conectada a la red, e intenta de nuevo.',
    };
  }
  return { kind: 'success', title: 'Imprimiendo factura', message: mensajeOk };
}

export function FacturacionPedido() {
  const navigate = useNavigate();
  const { facturacion, dispatchFacturacion, terminarFacturacion, mostrarToast, simulacion } = useStore();
  // El pedido que se muestra no cambia al ligarlo al embarque: avanza hasta confirmar el aviso (R27).
  const [pedidoId, setPedidoId] = useState<string | null>(() => {
    if (!facturacion) return null;
    return (pedidoEnCurso(facturacion) ?? facturacion.pedidos[facturacion.pedidos.length - 1])?.id ?? null;
  });
  const [proceso, setProceso] = useState<Proceso>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [copias, setCopias] = useState(1);

  const pedido = facturacion?.pedidos.find((p) => p.id === pedidoId) ?? null;
  if (!facturacion || !pedido) return <Navigate to="/tareas" replace />;

  const idx = facturacion.pedidos.findIndex((p) => p.id === pedido.id);
  const total = facturacion.pedidos.length;
  const factura = pedido.factura;
  const embarque = embarqueDe(facturacion, pedido.embarqueId);
  const compatibles = embarquesCompatibles(facturacion, pedido);

  const imprimir = (mensajeOk: string) => {
    const t = toastImpresion(simulacion, mensajeOk);
    sonar(t.kind === 'success' ? 'ok' : 'error');
    mostrarToast(t);
  };

  /** R22, R23: "Generar factura" → "Generando factura…" → facturada, sin timbrar o error. */
  const generar = () => {
    setProceso('generando');
    window.setTimeout(() => {
      setProceso(null);
      if (simulacion.fallaGenerarFactura === pedido.id && fallaUnaVez(`factura-${pedido.id}`)) {
        sonar('error');
        return mostrarToast(TOAST_ERROR_FACTURA);
      }
      const timbrada = !simulacion.facturaSinTimbrar.includes(pedido.id);
      dispatchFacturacion({ type: 'facturar', timbrada });
      if (!timbrada) return setOverlay({ k: 'sinTimbrar' });
      imprimir('La factura ha sido generada correctamente.');
    }, 1800);
  };

  /** R23: reintento de timbrado de una factura sin timbrar (no la vuelve a generar). */
  const timbrar = () => {
    setProceso('timbrando');
    window.setTimeout(() => {
      setProceso(null);
      dispatchFacturacion({ type: 'timbrar' });
      sonar('ok');
      mostrarToast({ kind: 'success', title: 'Factura timbrada', message: `La factura ${factura?.folio} se timbró correctamente.` });
    }, 1500);
  };

  /** R25: con embarques compatibles se elige; sin ellos, se crea uno nuevo. */
  const continuarEmbarque = () => setOverlay(compatibles.length > 0 ? { k: 'eleccion' } : { k: 'nuevo', hayActivos: false });

  /** R26: la liga puede fallar la primera vez; se queda en la factura para reintentar. */
  const fallaLiga = () => {
    if (simulacion.fallaLigarEmbarque === pedido.id && fallaUnaVez(`embarque-${pedido.id}`)) {
      setOverlay(null);
      sonar('error');
      mostrarToast({ kind: 'error', title: 'Se produjo un error', message: 'No fue posible ligar la factura a un embarque.' });
      return true;
    }
    return false;
  };

  const ligado = () => {
    sonar('ok');
    mostrarToast({ kind: 'success', title: 'Factura ligada al embarque', message: 'La factura se ligó al embarque correctamente.' });
  };

  const crearEmbarque = (paqueteria: string, comentario: string) => {
    if (fallaLiga()) return;
    const despues = facturacionReducer(facturacion, { type: 'crearEmbarque', paqueteria, comentario });
    dispatchFacturacion({ type: 'crearEmbarque', paqueteria, comentario });
    ligado();
    setOverlay({ k: 'creado', embarqueId: despues.embarques[despues.embarques.length - 1].id });
  };

  const agregarAEmbarque = (embarqueId: string) => {
    if (fallaLiga()) return;
    dispatchFacturacion({ type: 'ligarEmbarque', embarqueId });
    ligado();
    setOverlay({ k: 'agregada', embarqueId });
  };

  /** R27: tras el resultado, el siguiente pedido pendiente o, en el último, la factura con "Regresar a tareas". */
  const despuesDelEmbarque = (embarqueId: string) => {
    const siguiente = facturacion.pedidos.find((p, j) => j > idx && p.embarqueId === null) ?? null;
    if (siguiente) return setOverlay({ k: 'siguiente', terminado: pedido, siguiente, embarqueId });
    setOverlay(null);
  };

  const regresarATareas = () => {
    terminarFacturacion();
    mostrarToast({ kind: 'success', title: 'Factura y embarque finalizados', message: 'El pedido fue facturado y ligado a un embarque correctamente.' });
    navigate('/tareas');
  };

  const terminado = !!embarque;
  const embarqueResultado = (id: string): Embarque | null => embarqueDe(facturacion, id);

  return (
    <div className={styles.screen}>
      {/* Figma: sin flecha de regreso hasta terminar el embarque (6157:11771 → 6178:15585). */}
      <AppHeader showBack={terminado} onBack={regresarATareas} />
      <ContentPanel title="Datos de la factura" paddingBottom={45} align="center" bottom={0}>
        {proceso ? (
          <div className={styles.centered}>
            <img className={styles.spin} src={loading} alt="" width={66} height={66} />
            <p className={styles.title24}>{proceso === 'generando' ? 'Generando factura…' : 'Timbrando factura…'}</p>
            <div className={styles.barContainer}>
              <div className={styles.barTrack}>
                <div className={styles.barFill} />
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.form}>
              {total > 1 && (
                <p className={`${revision.indicador} ${styles.indicadorRonda}`}>
                  <ContenedorLetra letra={pedido.letra} size={20} /> Ronda {facturacion.rondaId} ·{' '}
                  <b>
                    Pedido {idx + 1} de {total}
                  </b>
                </p>
              )}
              <div className={styles.totalBlock}>
                <p className={styles.totalLabel}>Total</p>
                <p className={styles.totalValue}>{moneda.format(pedido.total)}</p>
                {factura && (
                  <div className={styles.folioBox}>
                    <div className={styles.folioRow}>
                      <span>Folio factura</span>
                      <b>{factura.folio}</b>
                    </div>
                    {factura.estado === 'sin-timbrar' && (
                      <div className={styles.folioRow}>
                        <span>Timbrado</span>
                        <b className={styles.pendiente}>Pendiente</b>
                      </div>
                    )}
                    {embarque && (
                      <div className={styles.folioRow}>
                        <span>No. de embarque</span>
                        <b>{embarque.id}</b>
                      </div>
                    )}
                    {factura.estado === 'sin-timbrar' && (
                      <button type="button" className={styles.reintentar} onClick={timbrar}>
                        Reintentar timbrado
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.inputs}>
                <FloatingLabelInput label="Empleado" icon={idCard} value={EMPLEADO_FACTURA} />
                <FloatingLabelInput label="Pedido" icon={listAlt} value={`#${pedido.id} | ${pedido.datos.origen}`} />
                <FloatingLabelInput label="Forma de pago" icon={receiptLong} value={pedido.datos.formaPago} />
                <FloatingLabelInput label="Cliente" icon={personIcon} value={`${pedido.cliente.id} | ${pedido.cliente.nombre}`} />
                <FloatingLabelInput label="Método de entrega" icon={ordersIcon} value={pedido.datos.metodoEntrega} />
                <FloatingLabelInput label="Dirección fiscal" icon={locationOn} value={pedido.datos.direccionFiscal.texto} tall />
                {/* R21: de solo lectura (el cambio de dirección queda fuera). */}
                <FloatingLabelInput label="Dirección de entrega" icon={handPackage} value={pedido.datos.direccionEntrega.texto} tall />
              </div>
            </div>
            <div className={styles.printSection}>
              <div className={styles.printTitle}>
                <img src={printIcon24} alt="" width={24} height={24} />
                <p>Impresión</p>
              </div>
              <div className={styles.copiesRow}>
                <p className={styles.copiesLabel}>Copias</p>
                <div className={styles.stepper}>
                  <Stepper
                    value={copias}
                    min={1}
                    max={3}
                    onChange={setCopias}
                    minusAsset={copias <= 1 ? stepperMenos : undefined}
                    plusAsset={stepperMas}
                  />
                </div>
              </div>
            </div>
            <div className={styles.gap90} />
          </div>
        )}
      </ContentPanel>

      {!proceso && !factura && (
        <BottomBar>
          <div className="row">
            <Button variant="error" label="Cancelar" className={styles.flex1} onClick={() => navigate('/tareas')} />
            <Button variant="success" label="Generar factura" className={styles.flex1} onClick={generar} />
          </div>
        </BottomBar>
      )}
      {!proceso && factura && (
        <BottomBar>
          <div className="row">
            <Button
              variant="default"
              label="Reimprimir factura"
              className={styles.flex1}
              onClick={() => imprimir(`Se ${copias === 1 ? 'envió 1 copia' : `enviaron ${copias} copias`} de la factura ${factura.folio} a la impresora.`)}
            />
            {terminado ? (
              <Button variant="success" label="Regresar a tareas" className={styles.flex1} onClick={regresarATareas} />
            ) : (
              <Button variant="success" label="Continuar a embarque" className={styles.flex1} onClick={continuarEmbarque} />
            )}
          </div>
        </BottomBar>
      )}

      {overlay?.k === 'sinTimbrar' && (
        <FacturaSinTimbrarModal
          onContinuar={() => {
            setOverlay(null);
            imprimir('La factura ha sido generada correctamente.');
          }}
        />
      )}
      {overlay?.k === 'eleccion' && (
        <AgregarEmbarqueEleccionModal
          cantidad={compatibles.length}
          onNuevo={() => setOverlay({ k: 'nuevo', hayActivos: true })}
          onAgregar={() => setOverlay({ k: 'selector' })}
          onCancel={() => setOverlay(null)}
        />
      )}
      {overlay?.k === 'nuevo' && (
        <NuevoEmbarqueModal
          hayActivos={overlay.hayActivos}
          onCancel={() => setOverlay(overlay.hayActivos ? { k: 'eleccion' } : null)}
          onConfirm={crearEmbarque}
        />
      )}
      {overlay?.k === 'selector' && (
        <AgregarEmbarqueSelectorModal embarques={compatibles} onCancel={() => setOverlay({ k: 'eleccion' })} onConfirm={agregarAEmbarque} />
      )}
      {overlay?.k === 'creado' && <EmbarqueCreadoModal numero={overlay.embarqueId} onConfirm={() => despuesDelEmbarque(overlay.embarqueId)} />}
      {overlay?.k === 'agregada' && embarqueResultado(overlay.embarqueId) && (
        <FacturaAgregadaModal embarque={embarqueResultado(overlay.embarqueId)!} onConfirm={() => despuesDelEmbarque(overlay.embarqueId)} />
      )}
      {overlay?.k === 'siguiente' && (
        <SiguienteFacturaModal
          terminado={overlay.terminado}
          embarqueId={overlay.embarqueId}
          siguiente={overlay.siguiente}
          onContinuar={() => {
            setOverlay(null);
            setCopias(1);
            setPedidoId(overlay.siguiente.id);
          }}
        />
      )}
    </div>
  );
}
