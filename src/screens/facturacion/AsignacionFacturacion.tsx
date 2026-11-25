/**
 * Asignación de la tarea 35 "FACTURAR Y EMBARCAR PEDIDO" de la ronda (propuesta sin spec:
 * docs/REVISION-MULTIPEDIDO-INTENT.md · R18, R20, R27). Figma "🧾 Facturación" (6004:1813, 6588:9874).
 *
 * - R18: aparece al cerrar la revisión de la ronda (tarea 34), con los mismos contenedores.
 * - R20: sin `Bandera_FacturacionEnHH`, "Tarea incompleta" como hoy; si la tarea ya se finalizó en otro sistema, toast
 *   "Tarea finalizada" y la asignación pasa a la siguiente tarea.
 * - R27: los pedidos ya embarcados se marcan y la tarea retoma en el primero que falta.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userIcon from '@assets/icons/user.svg';
import tareaIcon from '@assets/icons/user-tarea.svg';
import activityIcon from '@assets/icons/activity.svg';
import calendarIcon from '@assets/icons/calendar.svg';
import receiptIcon from '@assets/icons/receipt.svg';
import botonCancelar from '@assets/icons/boton-cancelar.svg';
import { AppHeader } from '@ds/components/organisms/AppHeader/AppHeader';
import { ContentPanel } from '@ds/components/organisms/ContentPanel/ContentPanel';
import { BottomBar } from '@ds/components/organisms/BottomBar/BottomBar';
import { Button } from '@ds/components/atoms/Button/Button';
import { LabeledField } from '@ds/components/molecules/LabeledField/LabeledField';
import { InfoBlock } from '@ds/components/molecules/InfoBlock/InfoBlock';
import { EMPLEADO, TAREA } from '../../mocks/ronda';
import { pedidosPendientes, type PedidoFacturacion } from '../../domain/facturacion';
import { sonar } from '../../domain/sonidos';
import { useStore } from '../../store/AppStore';
import { AvisoModal, TextoAviso } from '../surtido/overlays/Avisos';
import tareas from '../tareas/AsignacionTareas.module.css';

const estado = (p: PedidoFacturacion) => (p.embarqueId ? 'Embarcado' : p.factura ? 'Facturado, sin embarque' : 'Por facturar');

export function AsignacionFacturacion() {
  const navigate = useNavigate();
  const { facturacion, simulacion, setEtapa, terminarFacturacion, mostrarToast } = useStore();
  const [sinBandera, setSinBandera] = useState(false);
  if (!facturacion) return null;

  const total = facturacion.pedidos.length;
  const pendientes = pedidosPendientes(facturacion).length;

  const aceptar = () => {
    if (!simulacion.facturacionEnHH) return setSinBandera(true);
    if (simulacion.facturacionConcluidaEnOtro) {
      terminarFacturacion();
      sonar('ok');
      return mostrarToast({
        kind: 'success',
        title: 'Tarea finalizada',
        message: 'Ya se facturó y embarcó el pedido correctamente desde otro sistema.',
      });
    }
    setEtapa('facturacion');
    navigate('/facturacion');
  };

  return (
    <div className={tareas.screen}>
      <AppHeader backLabel="Menú" />
      <ContentPanel title="Asignación de tareas" paddingBottom={22} align="start" bottom={124} scroll>
        <div className={tareas.section}>
          <div className={tareas.sectionTitle}>
            <img src={userIcon} alt="" width={11.458} height={11.458} />
            <p>Empleado</p>
          </div>
          <div className={tareas.fieldWidth}>
            <LabeledField labelWidth="hug" label={EMPLEADO.id} value={EMPLEADO.nombre} />
          </div>
        </div>
        <div className={tareas.section}>
          <div className={tareas.sectionTitle}>
            <img src={tareaIcon} alt="" width={11.161} height={13.708} />
            <p>Tarea asignada</p>
          </div>
          <div className={tareas.fieldWidth}>
            <LabeledField
              labelWidth="hug"
              label={facturacion.rondaId}
              value={pendientes === total ? `${total} ${total === 1 ? 'pedido' : 'pedidos'}` : `${pendientes} de ${total} pedidos por embarcar`}
            />
          </div>
        </div>
        <InfoBlock title="Actividad" icon={activityIcon} iconSize={{ w: 13.482, h: 19.872 }} rows={[{ value: 'FACTURAR Y EMBARCAR PEDIDO' }]} />
        <InfoBlock
          title="Fecha"
          icon={calendarIcon}
          iconSize={{ w: 14.589, h: 16.21 }}
          rows={[
            { label: 'Fecha inicio:', value: TAREA.fecha },
            { label: 'Hora inicio:', value: TAREA.hora },
          ]}
        />
        <InfoBlock
          title={TAREA.documentoLabel}
          icon={receiptIcon}
          iconSize={{ w: 13.482, h: 17.159 }}
          rows={facturacion.pedidos.map((p) => ({
            label: total > 1 ? `Contenedor ${p.letra}` : 'Pedido',
            value: total > 1 ? `${p.id} · ${estado(p)}` : p.id,
          }))}
        />
      </ContentPanel>
      <BottomBar>
        <div className="row">
          <Button asset={botonCancelar} label="Cancelar" className={tareas.half} />
          <Button variant="success" icon="check" label="Aceptar" className={tareas.half} onClick={aceptar} />
        </div>
      </BottomBar>

      {sinBandera && (
        <AvisoModal titulo="Tarea incompleta" tipo="reloj" botones={[{ label: 'Cerrar', variante: 'error', onClick: () => setSinBandera(false) }]}>
          <TextoAviso>
            Esta tarea aún no ha sido finalizada en Exodus Sucursales. Por favor, conclúyela desde ese sistema para poder continuar.
          </TextoAviso>
        </AvisoModal>
      )}
    </div>
  );
}
