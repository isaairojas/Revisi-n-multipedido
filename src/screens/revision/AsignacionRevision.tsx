/**
 * Asignación de la tarea de revisión de la ronda (propuesta sin spec: docs/REVISION-MULTIPEDIDO-INTENT.md).
 *
 * - Intent revisión · R1: al finalizar el surtido queda cargada "REVISAR PEDIDO CLIENTE" de la misma ronda.
 * - Intent revisión · R2: validaciones de Figma al tomarla ("No es posible iniciar esta tarea", "Tarea iniciada
 *   previamente").
 * - Intent revisión · R3: sin la bandera, una tarea de varios pedidos muestra "Tarea incompleta" como hoy.
 * - Intent revisión · R10: los pedidos ya revisados se marcan y la revisión retoma en el primero que falta.
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
import { pedidosPendientes, type PedidoRevision } from '../../domain/revision';
import { useStore } from '../../store/AppStore';
import { AvisoModal, TextoAviso, botonesConfirmar } from '../surtido/overlays/Avisos';
import tareas from '../tareas/AsignacionTareas.module.css';

type Aviso = 'sin-bandera' | 'no-surtida' | 'iniciada-en-otro';

const ESTADO: Record<PedidoRevision['estado'], string> = {
  pendiente: 'Por revisar',
  revisado: 'Revisado',
  retirado: 'Retirado de la ronda',
};

export function AsignacionRevision() {
  const navigate = useNavigate();
  const { revision, simulacion, setEtapa } = useStore();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  if (!revision) return null;

  const total = revision.pedidos.length;
  const pendientes = pedidosPendientes(revision).length;

  const abrir = () => {
    setAviso(null);
    setEtapa('revision');
    navigate('/revision');
  };

  const aceptar = () => {
    if (!simulacion.revisionMultipedidoEnHH && total > 1) return setAviso('sin-bandera');
    if (simulacion.revisionNoSurtida) return setAviso('no-surtida');
    if (simulacion.revisionIniciadaEnOtro) return setAviso('iniciada-en-otro');
    abrir();
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
              label={revision.rondaId}
              value={pendientes === total ? `${total} ${total === 1 ? 'pedido' : 'pedidos'}` : `${pendientes} de ${total} pedidos por revisar`}
            />
          </div>
        </div>
        <InfoBlock title="Actividad" icon={activityIcon} iconSize={{ w: 13.482, h: 19.872 }} rows={[{ value: 'REVISAR PEDIDO CLIENTE' }]} />
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
          rows={revision.pedidos.map((p) => ({
            label: total > 1 ? `Contenedor ${p.letra}` : 'Pedido',
            value: total > 1 ? `${p.id} · ${ESTADO[p.estado]}` : p.id,
          }))}
        />
      </ContentPanel>
      <BottomBar>
        <div className="row">
          <Button asset={botonCancelar} label="Cancelar" className={tareas.half} />
          <Button variant="success" icon="check" label="Aceptar" className={tareas.half} onClick={aceptar} />
        </div>
      </BottomBar>

      {aviso === 'sin-bandera' && (
        <AvisoModal titulo="Tarea incompleta" tipo="reloj" botones={[{ label: 'Cerrar', variante: 'error', onClick: () => setAviso(null) }]}>
          <TextoAviso>
            Esta tarea aún no ha sido finalizada en Exodus Sucursales. Por favor, conclúyela desde ese sistema para poder continuar.
          </TextoAviso>
        </AvisoModal>
      )}
      {aviso === 'no-surtida' && (
        <AvisoModal titulo="No es posible iniciar esta tarea" tipo="reloj" botones={[{ label: 'Cerrar', variante: 'error', onClick: () => setAviso(null) }]}>
          <TextoAviso>La orden no se encuentra surtida, es necesario que se surta para poder revisarla.</TextoAviso>
        </AvisoModal>
      )}
      {aviso === 'iniciada-en-otro' && (
        <AvisoModal titulo="Tarea iniciada previamente" tipo="reloj" botones={botonesConfirmar(() => setAviso(null), abrir)}>
          <TextoAviso>La revisión de este pedido fue iniciada desde Exodus Sucursales.</TextoAviso>
          <TextoAviso>¿Deseas continuar con la revisión en este dispositivo?</TextoAviso>
        </AvisoModal>
      )}
    </div>
  );
}
