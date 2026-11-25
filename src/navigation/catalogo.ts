/**
 * Catálogo de escenarios de la demo de revisión multipedido para QA: de la finalización del surtido de la ronda al
 * cierre de la tarea 35. Tiene dos partes:
 * - La finalización del surtido: un caso por escenario de las specs de exodus-gtm-pwa (`sdd/changes/`) que están en
 *   `tests/alineacion/alcance-revision.json`, con la semilla que lo prepara, los pasos y el resultado esperado (el THEN
 *   del escenario). Lo vigila `tests/domain/alineacion.test.mjs`. El resto del surtido vive en la demo de surtido
 *   multipedido (https://github.com/isaairojas/HH-Surtido-Multiorden).
 * - La revisión (tarea 34) y la facturación y el embarque (tarea 35): propuesta sin spec, con las reglas R1–R27 del
 *   intent local `docs/REVISION-MULTIPEDIDO-INTENT.md`.
 *
 * Los datos son los de la spec (`src/mocks/ronda.ts`): ronda G-500 con 1001 (A) y 1003 (C), del mismo
 * cliente, y 1002 (B). Se escanean 0486600 y 1365800 (etiqueta de 18 dígitos); los demás son misceláneos (se
 * teclea el código y se captura la cantidad). 9999999 no está en la ronda.
 *
 * `extra`: regla escrita en el requisito que no tiene escenario propio en la spec.
 *
 * Etiqueta única: los QR de la demo (E1, E2…) los genera `qrEtiquetaUnica`; el servicio de etiqueta única se simula
 * (da por buena toda etiqueta que no se haya escaneado ya). Guía por voz: se oye con la voz del navegador y se ve
 * como subtítulo "Voz". Lo que la HH manda al servidor no se ve en la demo: los casos solo describen lo que se ve.
 */
import { etiqueta } from '../domain/codigos';

export type CambioId = 'listado' | 'cierre' | 'armado' | 'revision' | 'facturacion';

/** En el orden del flujo: finalizar el surtido, revisar la ronda (34) y facturar y embarcar (35). */
export const CAMBIOS: { id: CambioId; titulo: string; carpeta: string }[] = [
  { id: 'listado', titulo: 'Finalizar el surtido de la ronda', carpeta: '2026-10-26-multipedido-surtido-listado' },
  { id: 'cierre', titulo: 'Cierre del listado: avisos y fallas al finalizar', carpeta: '2026-11-05-multipedido-surtido-listado-cierre' },
  { id: 'armado', titulo: 'Pedidos retenidos o cancelados durante el surtido', carpeta: '2026-10-26-multipedido-armado-ronda' },
  // Propuesta sin spec (2026-11-25): sus casos nombran las reglas R1–R27 del intent local, no requisitos de una spec.
  { id: 'revision', titulo: 'Revisión multipedido (propuesta, sin spec)', carpeta: 'docs/REVISION-MULTIPEDIDO-INTENT.md' },
  { id: 'facturacion', titulo: 'Facturación y embarque de la ronda (propuesta, sin spec)', carpeta: 'docs/REVISION-MULTIPEDIDO-INTENT.md' },
];

export type Codigo = { etiqueta: string; valor: string };

export type Caso = {
  id: string;
  cambio: CambioId;
  requisito: string;
  /** Nombre exacto del escenario en el spec. */
  escenario: string;
  /** Semilla de `escenarios.ts` y pantalla (hash) donde arranca. */
  semilla?: string;
  ruta?: string;
  pasos: string[];
  esperado: string;
  /** Lecturas listas para copiar y pegar en el lector. */
  codigos?: Codigo[];
  extra?: boolean;
  /**
   * Caso de una propuesta que todavía no tiene spec (revisión multipedido): `requisito` y `escenario` son los del
   * intent local y `alineacion.test.mjs` no los compara con la foto de las specs.
   */
  propuesta?: boolean;
};

const c = (valor: string, texto?: string): Codigo => ({ etiqueta: texto ?? valor, valor });
const e18 = (codigo: string, n: number): Codigo => ({ etiqueta: `${n} ${n === 1 ? 'pieza' : 'piezas'} de ${codigo}`, valor: etiqueta(codigo, n) });

const LISTADO = '2026-10-26-multipedido-surtido-listado';
const VOZ =
  'La lectura sale como subtítulo "Voz" sobre la pantalla y, si el navegador tiene voz, también se oye (algunos navegadores solo hablan después de tocar la pantalla: usa ⋮ → "Repetir audio").';
const ESCANEA = (codigo: string, n: number) =>
  `Pega ${codigo} en el lector (o tócalo en ⌨ y tecléalo), captura ${n} y acepta.`;

/** Escenarios de la finalización del surtido: listado y cierre (alcance en `tests/alineacion/alcance-revision.json`). */
const CASOS_FINALIZAR: Caso[] = [
  /* ================= 2026-10-26-multipedido-surtido-listado · surtido-listado ================= */
  {
    id: 'finalizar-ronda-3',
    cambio: 'listado',
    requisito: 'Finalizar el surtido del pedido',
    escenario: 'Finalizar una ronda de 3 pedidos',
    semilla: 'cierra-ronda',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" ("Haz surtido el total…") toca ✓.'],
    esperado: 'Se registra cada pedido por separado, la ronda se guarda una sola vez y sale el toast "Surtido finalizado" ("¡Se completó la ronda de surtido exitosamente!").',
    codigos: [c('2010000')],
  },
  {
    id: 'cierre-sin-resumen',
    cambio: 'listado',
    requisito: 'Finalizar el surtido del pedido',
    escenario: 'El cierre no muestra resumen de la ronda',
    semilla: 'cierra-ronda',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓.'],
    esperado:
      'El toast "Surtido finalizado" ("¡Se completó la ronda de surtido exitosamente!") sale sobre la asignación de tareas, con la siguiente tarea ya cargada: la revisión de la misma ronda ("REVISAR PEDIDO CLIENTE" G-500). No hay pantalla de resumen con el avance ni la lista de pedidos de la ronda.',
    codigos: [c('2010000')],
  },
  {
    id: 'finalizar-pedido-unico',
    cambio: 'listado',
    requisito: 'Finalizar el surtido del pedido',
    escenario: 'Finalizar con todos los códigos surtidos',
    semilla: 'pedido-unico-al-filo',
    ruta: '/surtido',
    pasos: [ESCANEA('1394010', 1), 'En "Finalizar surtido" toca ✓.'],
    esperado: 'Se guarda el pedido y la ronda, sale el toast "Surtido finalizado" ("¡Se completó la ronda de surtido exitosamente!") y vuelve a la asignación de tareas.',
    codigos: [c('1394010')],
  },
  {
    id: 'retirar-corporativo-3',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Retirar un corporativo de una ronda de 3',
    semilla: 'corporativo-incompleto',
    ruta: '/surtido',
    pasos: ['1002 es corporativo con orden de compra e incompleto.', 'Toca ⋮ → "Finalizar surtido". En "No es posible finalizar este pedido" toca ✓ para sacarlo.'],
    esperado:
      '"Pedido retirado de la ronda" y vuelve a la ventana principal sin 1002 en las tarjetas ni en el desglose; los totales ya no lo cuentan, no entra ningún otro pedido y puede finalizar con 1001 y 1003.',
  },
  {
    id: 'letras-fijas',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Las letras no cambian al sacar un pedido',
    semilla: 'corporativo-incompleto',
    ruta: '/surtido',
    pasos: ['La ronda lleva 1001 (A), 1002 (B) y 1003 (C); 1002 es corporativo e incompleto.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacar 1002.', 'Abre el detalle de 0486600.'],
    esperado: '1001 sigue como A y 1003 como C en las tarjetas, en el desglose de las filas y en el detalle.',
  },
  {
    id: 'falla-retiro',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Falla el retiro del pedido',
    semilla: 'falla-retiro',
    ruta: '/surtido',
    pasos: ['El servicio de retiro falla.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacar 1002.'],
    esperado:
      '"El pedido corporativo no pudo ser retirado de la ronda por un error en el sistema. Vuelva a intentar." con la única opción de cerrar; 1002 sigue en la ronda y en el listado.',
  },
  {
    id: 'falla-registro-retiro',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Falla el registro del retiro',
    semilla: 'falla-registro-retiro',
    ruta: '/surtido',
    pasos: ['No se puede guardar el registro del retiro.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacar 1002.'],
    esperado: 'El mismo aviso, con la única opción de cerrar; 1002 sigue en la ronda y se puede volver a intentar (en la demo el reintento ya pasa).',
  },
  {
    id: 'corporativo-sin-piezas',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Corporativo sin piezas surtidas',
    semilla: 'corporativo-sin-piezas',
    ruta: '/surtido',
    pasos: ['1002 es corporativo y no tiene piezas surtidas; 1001 tiene 3 piezas de 0486600.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacarlo.'],
    esperado: 'Las piezas surtidas de 1001 y 1003 no cambian y solo baja el total requerido.',
  },
  {
    id: 'retirar-pedido',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Retirar pedido',
    semilla: 'corporativo-incompleto',
    ruta: '/surtido',
    pasos: ['1002 es corporativo con orden de compra y quedan productos incompletos.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacarlo.'],
    esperado:
      '"Pedido retirado de la ronda" ("Aparta la mercancía ya surtida y repórtalo para su validación.") y regresa a la ventana principal sin 1002 en tarjetas, filas ni desglose.',
  },
  {
    id: 'retirar-pedido-unico',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Retirar el único pedido',
    semilla: 'pedido-unico-corporativo-incompleto',
    ruta: '/surtido',
    pasos: ['La tarea tiene un solo pedido, corporativo con orden de compra e incompleto.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacarlo.'],
    esperado:
      '"Pedido retirado de la ronda" y regresa como hoy, a la asignación de tareas; no queda en una ventana principal vacía ni sale "Ronda sin pedidos". (Lo mismo con el último pedido que queda de una ronda: caso "Se sacan corporativos hasta quedar uno".)',
  },
  {
    id: 'queda-un-pedido',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Queda un solo pedido en la ronda',
    semilla: 'ronda-dos-corporativo',
    ruta: '/surtido',
    pasos: ['Ronda de 2 pedidos; 1002 es corporativo e incompleto.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacarlo.', 'Abre el detalle de un código.'],
    esperado:
      'El listado se ve como el de un solo pedido de hoy: solo los códigos de 1001, sin tarjetas de contenedor, sin "Surtido por pedido" en el detalle ni avisos de cambio de pedido, y puede finalizarse.',
  },
  {
    id: 'registro-retiro',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Registro del retiro del corporativo',
    semilla: 'corporativo-incompleto',
    ruta: '/surtido',
    pasos: ['La ronda G-500 lleva 1001, 1002 (corporativo) y 1003.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacar 1002.'],
    esperado:
      'En la HH: 1001 y 1003 siguen en la ronda (tarjetas A y C). En el servidor queda guardado que 1002 salió de la ronda G-500, donde iba con 1001 y 1003 (la demo no muestra lo que se guarda en el servidor).',
  },
  {
    id: 'corporativo-no-se-retira',
    cambio: 'listado',
    requisito: 'Sacar el pedido de la ronda',
    escenario: 'Corporativo que no se retira',
    semilla: 'corporativo-al-filo',
    ruta: '/surtido',
    pasos: ['La ronda G-500 lleva 1001 y 1002 (corporativo); a 1002 le falta 1 pieza de 1394010.', ESCANEA('1394010', 1), 'En "Finalizar surtido" toca ✓.'],
    esperado:
      'La ronda se surte completa sin sacar a 1002: no sale "No es posible finalizar este pedido" y termina con "Surtido finalizado". En el servidor no se guarda ningún registro de retiro para 1002.',
    codigos: [c('1394010')],
  },
  {
    id: 'promo-segundo-pedido',
    cambio: 'listado',
    requisito: 'Promoción incompleta al finalizar la ronda',
    escenario: 'Incompleta solo en el segundo pedido',
    semilla: 'promocion',
    ruta: '/surtido',
    pasos: ['"Kit afinación" (0486600 + 2389475) está en 1001 y 1002; 1001 la completó y en 1002 se negó 2389475 con 0486600 en 5 de 5.', ESCANEA('2010000', 1), 'Toca "Finalizar surtido" (con una promoción pendiente la ronda no ofrece finalizar sola).'],
    esperado: 'Se ve la promoción con solo el pedido 1002 y la ronda no se cierra.',
    codigos: [c('2010000')],
  },
  {
    id: 'promo-sin-negados',
    cambio: 'listado',
    requisito: 'Promoción incompleta al finalizar la ronda',
    escenario: 'Incompleta sin códigos negados',
    semilla: 'promocion-sin-negados',
    ruta: '/surtido',
    pasos: ['En 1002 "Kit afinación" lleva 0486600 en 5 de 5 y 2389475 en 1 de 2, sin ningún código negado.', 'Toca ⋮ → "Finalizar surtido".'],
    esperado: 'Se ve la promoción incompleta del pedido 1002 con el avance de sus dos códigos y la ronda no se cierra.',
  },
  {
    id: 'promo-cancelar',
    cambio: 'listado',
    requisito: 'Promoción incompleta al finalizar la ronda',
    escenario: 'Cancelar sin retirar',
    semilla: 'promocion',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'Toca "Finalizar surtido" (con una promoción pendiente la ronda no ofrece finalizar sola).', 'En la promoción de 1002 toca ✕.', 'Toca "Finalizar surtido" abajo otra vez.'],
    esperado: 'Vuelve al listado con 0486600 aún surtido en 1002 (B 5/5) y el flujo de la promoción se puede reabrir con "Finalizar surtido".',
    codigos: [c('2010000')],
  },
  {
    id: 'promo-eliminar',
    cambio: 'listado',
    requisito: 'Promoción incompleta al finalizar la ronda',
    escenario: 'Eliminar los productos de la promoción',
    semilla: 'promocion',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'Toca "Finalizar surtido" (con una promoción pendiente la ronda no ofrece finalizar sola).', 'En la promoción toca "Eliminar productos" y pega 0486600.'],
    esperado:
      '0486600 queda negado en 0 con el motivo de promoción (6) en 1002 y 1001 conserva lo surtido. "Promoción negada": "Retira los siguientes productos del contenedor:" con el contenedor B, 0486600 "5 de 5" y 2389475 "Negado".',
    codigos: [c('2010000'), c('0486600')],
  },
  {
    id: 'promo-codigo-invalido',
    cambio: 'listado',
    requisito: 'Promoción incompleta al finalizar la ronda',
    escenario: 'Código que no es de la promoción',
    semilla: 'promocion',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'Toca "Finalizar surtido" (con una promoción pendiente la ronda no ofrece finalizar sola).', 'En la promoción toca "Eliminar productos".', 'Pega la etiqueta de 1 pieza de 1365800, que no es de la promoción.'],
    esperado: '"Código inválido" ("El código escaneado no pertenece a los códigos con promoción."), vuelve a "Finalizar surtido" y nada se niega.',
    codigos: [c('2010000'), e18('1365800', 1)],
  },
  {
    id: 'promo-falla-eliminar',
    cambio: 'listado',
    requisito: 'Promoción incompleta al finalizar la ronda',
    escenario: 'Falla "Eliminar productos" en uno de los pedidos',
    semilla: 'falla-eliminar-promocion',
    ruta: '/surtido',
    pasos: [
      '"Kit afinación" quedó incompleta en 1001 y 1002 y el registro de la negación de 1002 falla.',
      'Toca "Finalizar surtido"; en la promoción toca "Eliminar productos" y pega 0486600.',
    ],
    esperado:
      'Sale el error de negación de hoy ("No es posible negar el producto"); la promoción no queda negada en ningún pedido y sigue en "Finalizar surtido" para reintentar (en la demo el reintento ya pasa).',
    codigos: [c('0486600')],
  },

  /* ================= 2026-11-05-multipedido-surtido-listado-cierre ================= */
  {
    id: 'salir-tras-sacar',
    cambio: 'cierre',
    requisito: 'Salir del listado deshace el vínculo',
    escenario: 'Salida después de sacar un pedido',
    semilla: 'corporativo-incompleto',
    ruta: '/surtido',
    pasos: ['Toca ⋮ → "Finalizar surtido" y toca ✓ para sacar el corporativo 1002.', 'Toca "Menú" (regresar) y acepta.'],
    esperado:
      'La confirmación dice "Se verán afectados los 2 pedidos de la ronda" y se desvinculan 1001 y 1003. Que 1002 conserve su registro para surtirse fuera de la ronda es del servidor.',
  },
  {
    id: 'salir-tras-cancelado',
    cambio: 'cierre',
    requisito: 'Salir del listado deshace el vínculo',
    escenario: 'Salida después de aceptar un cancelado',
    semilla: 'cancelado-al-finalizar',
    ruta: '/surtido',
    pasos: ['1002 quedó cancelado.', 'Toca ⋮ → "Finalizar surtido" y "Aceptar" en "Pedido cancelado".', 'Toca "Menú" (regresar) y acepta.'],
    esperado:
      'La confirmación dice "Se verán afectados los 2 pedidos de la ronda" y sale sin ningún aviso más. Se desvinculan los tres contenedores, incluido el de 1002 (eso es del servidor; la demo no lo muestra).',
  },
  {
    id: 'falla-guardado-segundo',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Falla el guardado del segundo pedido',
    semilla: 'falla-guardado',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓: 1001 se registra y el guardado de 1002 falla por la red.', 'En "Tarea incompleta" toca "Cancelar".'],
    esperado:
      '"Tarea incompleta" ("No se pudo guardar el pedido 1002. Hubo un error de red al finalizar el surtido. Por favor, acércate a un access point y vuelve a intentarlo."). Al cancelar se desvincula la tarea completa, ningún pedido conserva lo registrado y la tarea queda pendiente en la lista, sin avance.',
    codigos: [c('2010000')],
  },
  {
    id: 'falla-desvincular-al-cancelar',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Falla la desvinculación al cancelar',
    semilla: 'falla-desvincular-al-cancelar',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓: falla el guardado de 1002.', 'En "Tarea incompleta" toca "Cancelar": la desvinculación falla.'],
    esperado: 'Sigue en "Tarea incompleta" con "Cancelar" y "Reintentar" y no sale al inicio, para que ninguna ronda quede a medio registrar.',
    codigos: [c('2010000')],
  },
  {
    id: 'reintentar-falla-red',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Reintentar tras la falla de red',
    semilla: 'falla-guardado',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓.', 'En "Tarea incompleta" toca "Reintentar".'],
    esperado: 'Se registran 1002 y 1003, la ronda se guarda una sola vez y sale "¡Se completó la ronda de surtido exitosamente!".',
    codigos: [c('2010000')],
  },
  {
    id: 'falla-guardado-servidor',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Falla el guardado por un error del servidor',
    semilla: 'falla-guardado-servidor',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓: 1001 se registra y el guardado de 1002 falla con un error del servidor.'],
    esperado: '"Tarea incompleta" con las mismas opciones "Cancelar" y "Reintentar" que ante una falla de red (y el mismo texto: la HH de hoy no tiene otro).',
    codigos: [c('2010000')],
  },
  {
    id: 'reintentar-vuelve-a-fallar',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Reintentar vuelve a fallar',
    semilla: 'falla-guardado-dos-veces',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓.', 'En "Tarea incompleta" toca "Reintentar".'],
    esperado: 'Sale otra vez "Tarea incompleta" con las mismas opciones, sin volver a registrar 1001. Un segundo "Reintentar" ya pasa.',
    codigos: [c('2010000')],
  },
  {
    id: 'concluida-a-mitad',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Otro usuario concluye la ronda a mitad del guardado',
    semilla: 'concluida-a-mitad',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓: 1001 se registra y otro usuario concluye la ronda antes de 1002.'],
    esperado: '"Esta tarea ya fue concluida por otro usuario." Cuentan los registros del primero que concluyó y lo ya registrado de 1001 no se deshace.',
    codigos: [c('2010000')],
  },
  {
    id: 'falla-cierre-ronda',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Falla el cierre de la ronda',
    semilla: 'falla-cierre-ronda',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓: 1001, 1002 y 1003 se registran y falla el cierre de la ronda por la red.', 'En "Tarea incompleta" toca "Reintentar".'],
    esperado:
      '"Tarea incompleta" ("No se pudo cerrar la ronda. Hubo un error de red al finalizar el surtido. Por favor, acércate a un access point y vuelve a intentarlo."). Al reintentar solo se vuelve a cerrar la ronda, sin registrar otra vez los pedidos, y sale "Surtido finalizado".',
    codigos: [c('2010000')],
  },
  {
    id: 'falla-guardado-pedido-unico',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Falla el guardado con un solo pedido',
    semilla: 'falla-guardado-pedido-unico',
    ruta: '/surtido',
    pasos: ['La tarea tiene un solo pedido (1001) y su guardado falla por la red.', ESCANEA('1394010', 1), 'En "Finalizar surtido" toca ✓ y, en "Tarea incompleta", "Cancelar".'],
    esperado: 'El mensaje es el de hoy, sin "No se pudo guardar el pedido {número}.", y "Cancelar" se comporta como hoy: desvincula y vuelve a la asignación de tareas.',
    codigos: [c('1394010')],
  },
  {
    id: 'parciales-varios',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Parciales en varios pedidos',
    semilla: 'parciales',
    ruta: '/surtido',
    pasos: ['0486600 tiene 3 de 11 en 1001 (A) y 5 de 5 en 1002 (B), y 2389475 tiene 1 de 2 en 1003 (C).', 'Toca ⋮ → "Finalizar surtido".'],
    esperado:
      'Una sola confirmación ("Tienes códigos surtidos parcialmente. ¿Deseas continuar?…") con 0486600 "8 de 16" (A 3/11 · B 5/5) y 2389475 "1 de 2" (C 1/2), en el orden del listado.',
  },
  {
    id: 'codigos-sin-surtir',
    cambio: 'cierre',
    requisito: 'Bloqueos y fallas al finalizar',
    escenario: 'Códigos sin surtir',
    semilla: 'con-avance',
    ruta: '/surtido',
    pasos: ['Hay productos con cantidad surtida 0 sin negar.', 'Toca ⋮ → "Finalizar surtido".'],
    esperado: 'El modal pide negar primero los códigos sin surtir: "Tienes códigos sin surtir, para finalizar el surtido primero deberás negarlos entrando al detalle del producto."',
  },
  {
    id: 'orden-corporativo-primero',
    cambio: 'cierre',
    requisito: 'Orden de los avisos al finalizar',
    escenario: 'Corporativo antes que los demás avisos',
    semilla: 'cierre-en-orden',
    ruta: '/surtido',
    pasos: ['1002 es corporativo con orden de compra e incompleto, 1001 tiene una promoción incompleta y hay productos parciales.', 'Toca ⋮ → "Finalizar surtido".', 'Toca ✓ para sacar 1002.'],
    esperado: 'Primero sale "No es posible finalizar este pedido" y, al sacar 1002, regresa a la ventana principal sin ver los demás avisos.',
  },
  {
    id: 'cancelado-y-corporativo',
    cambio: 'cierre',
    requisito: 'Orden de los avisos al finalizar',
    escenario: 'Cancelado que además era el corporativo',
    semilla: 'cancelado-corporativo',
    ruta: '/surtido',
    pasos: ['1002 es corporativo con orden de compra, está incompleto y además quedó cancelado.', 'Toca ⋮ → "Finalizar surtido" y acepta.'],
    esperado: 'Sale "Pedido cancelado" y, al aceptar, regresa a la ventana principal sin 1002, sin ver "No es posible finalizar este pedido".',
  },
  {
    id: 'orden-sin-surtir-tras-corporativo',
    cambio: 'cierre',
    requisito: 'Orden de los avisos al finalizar',
    escenario: 'Códigos en cero después de sacar el corporativo',
    semilla: 'corporativo-sin-piezas',
    ruta: '/surtido',
    pasos: ['1002 es corporativo e incompleto y 1001 tiene códigos en 0 sin negar.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacar 1002.', 'Toca ⋮ → "Finalizar surtido" otra vez.'],
    esperado: 'Ya sin 1002, sale "No es posible finalizar surtido" con "Tienes códigos sin surtir…".',
  },
  {
    id: 'orden-solo-promocion',
    cambio: 'cierre',
    requisito: 'Orden de los avisos al finalizar',
    escenario: 'Solo una promoción incompleta',
    semilla: 'solo-promocion',
    ruta: '/surtido',
    pasos: ['No hay pedidos cancelados, corporativos incompletos, códigos en cero ni parciales, y en 1001 "Kit afinación" quedó incompleta.', 'Toca "Finalizar surtido".'],
    esperado: 'Sale solo el aviso de la promoción incompleta del pedido 1001, sin ningún aviso anterior.',
  },
  {
    id: 'orden-solo-ceros',
    cambio: 'cierre',
    requisito: 'Orden de los avisos al finalizar',
    escenario: 'Solo códigos en cero',
    semilla: 'solo-ceros',
    ruta: '/surtido',
    pasos: ['No hay cancelados, corporativos incompletos, promociones incompletas ni parciales, y 1002 tiene 2389475 en 0 sin negar.', 'Toca ⋮ → "Finalizar surtido".'],
    esperado: 'Sale solo "No es posible finalizar surtido" con "Tienes códigos sin surtir…", sin ningún aviso anterior.',
  },
  {
    id: 'orden-promocion-sigue',
    cambio: 'cierre',
    requisito: 'Continuación tras un aviso al finalizar',
    escenario: 'La promoción negada sigue con el cierre',
    semilla: 'promocion-y-parciales',
    ruta: '/surtido',
    pasos: ['1001 tiene la promoción "Kit afinación" incompleta y 1003 un producto parcial (2012000, 1 de 2).', 'Toca ⋮ → "Finalizar surtido", luego "Eliminar productos" y pega 0486600.', 'En "Promoción negada" toca ✓.'],
    esperado: 'Sale la confirmación de parciales sin regresar a la ventana principal, con 2012000 "4 de 5" (B 3/3 · C 1/2) y sin contar los códigos negados de la promoción.',
    codigos: [c('0486600')],
  },
  {
    id: 'orden-parciales-confirman',
    cambio: 'cierre',
    requisito: 'Continuación tras un aviso al finalizar',
    escenario: 'Los parciales son la confirmación',
    semilla: 'parcial-en-a',
    ruta: '/surtido',
    pasos: ['1001 tiene un producto parcial (1394010, 2 de 4) y no hay corporativos, códigos en cero ni promociones incompletas.', 'Toca ⋮ → "Finalizar surtido" y, en el aviso de parciales, toca ✓.'],
    esperado: 'La ronda se finaliza sin mostrar además "Haz surtido el total de productos solicitados ¿Deseas finalizar la ronda?".',
  },
  {
    id: 'sacar-regresa',
    cambio: 'cierre',
    requisito: 'Continuación tras un aviso al finalizar',
    escenario: 'Sacar el corporativo regresa a la ventana principal',
    semilla: 'corporativo-incompleto',
    ruta: '/surtido',
    pasos: ['1002 es corporativo con orden de compra e incompleto.', 'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacarlo.'],
    esperado: 'Regresa a la ventana principal sin 1002 y tiene que volver a elegir "Finalizar surtido".',
  },
  {
    id: 'orden-completo',
    cambio: 'cierre',
    requisito: 'Orden de los avisos al finalizar',
    escenario: 'Todos los avisos en orden',
    semilla: 'cierre-en-orden',
    ruta: '/surtido',
    pasos: [
      'Toca ⋮ → "Finalizar surtido" y toca ✓ para sacar 1002.',
      'Toca ⋮ → "Finalizar surtido" otra vez.',
      'En la promoción toca "Eliminar productos", pega 0486600 y toca ✓.',
      'En la confirmación de parciales toca ✓.',
    ],
    esperado: 'La ronda se finaliza con un registro por cada pedido que queda (1001 y 1003) y un solo guardado de la ronda: sale "Surtido finalizado".',
    codigos: [c('0486600')],
  },
  {
    id: 'tres-corporativos',
    cambio: 'cierre',
    requisito: 'La ronda se queda sin pedidos',
    escenario: 'Se sacan corporativos hasta quedar uno',
    semilla: 'tres-corporativos',
    ruta: '/surtido',
    pasos: [
      '1001, 1002 y 1003 son corporativos con orden de compra e incompletos.',
      'Dos veces: ⋮ → "Finalizar surtido" y ✓ para sacar el pedido (sale 1001 y luego 1002).',
      'Con 1003 solo, ⋮ → "Finalizar surtido" y ✓ para sacarlo también.',
    ],
    esperado:
      '1003 sigue como pedido individual (sin tarjetas) y la tarea no se cancela. Al sacarlo también sale "Pedido retirado de la ronda" y regresa, como la canónica "Sacar el pedido de la ronda", no "Ronda sin pedidos".',
  },
  {
    id: 'todos-cancelados',
    cambio: 'cierre',
    requisito: 'La ronda se queda sin pedidos',
    escenario: 'Se cancelan todos los pedidos de la ronda',
    semilla: 'todos-cancelados',
    ruta: '/surtido',
    pasos: ['Los tres pedidos quedaron cancelados.', 'Toca ⋮ → "Finalizar surtido" y acepta los tres "Pedido cancelado", que salen seguidos.', 'En "Ronda sin pedidos" toca "Aceptar".'],
    esperado:
      '"Ronda sin pedidos" ("La ronda ya no tiene pedidos por surtir y su tarea se canceló."); la tarea y las que dependen de ella se cancelan, no se registra ningún surtido y con "Aceptar" vuelve a la asignación de tareas.',
  },
  {
    id: 'todo-negado',
    cambio: 'cierre',
    requisito: 'La ronda se queda sin pedidos',
    escenario: 'Todo negado',
    semilla: 'todo-negado',
    ruta: '/surtido',
    pasos: ['La ronda lleva 1001, 1002 y 1003 y todas las partidas están negadas salvo 2010000 de 1003.', 'Abre el detalle de 2010000 y niégalo con un motivo.'],
    esperado: 'Al finalizar sale "Ronda sin pedidos", la tarea se cancela, no se registra surtido como completado y vuelve a la asignación de tareas.',
  },
  {
    id: 'sacar-sin-supervision',
    cambio: 'cierre',
    requisito: 'Permisos de las acciones del listado',
    escenario: 'Sacar un pedido sin rol de supervisión',
    semilla: 'corporativo-incompleto',
    ruta: '/surtido',
    pasos: ['El usuario tiene la tarea asignada y no tiene ningún rol de supervisión.', 'Toca ⋮ → "Finalizar surtido".'],
    esperado: 'En "No es posible finalizar este pedido" puede sacar 1002 de la ronda sin que se le pida un rol adicional.',
  },
  {
    id: 'sin-avisos-un-pedido',
    cambio: 'cierre',
    requisito: 'Alcance de la ronda de un solo pedido',
    escenario: 'Sin avisos de cambio de pedido',
    semilla: 'pedido-unico-al-filo',
    ruta: '/surtido',
    pasos: ['La tarea tiene un solo pedido.', ESCANEA('1394010', 1)],
    esperado: 'No sale ningún aviso de cambio de pedido ni de pedido completado (sale directamente "Finalizar surtido").',
    codigos: [c('1394010')],
  },
  {
    id: 'queda-un-pedido-individual',
    cambio: 'cierre',
    requisito: 'Alcance de la ronda de un solo pedido',
    escenario: 'Queda un pedido: voz, salida y cierre individuales',
    semilla: 'dos-corporativos',
    ruta: '/surtido',
    pasos: [
      'La ronda empezó con 1001, 1002 y 1003; 1002 y 1003 son corporativos e incompletos.',
      'Dos veces: ⋮ → "Finalizar surtido" y ✓ para sacar el pedido.',
      'Toca ⋮ → "Repetir audio"; luego toca "Menú" y revisa la confirmación (toca "Cancelar"); luego finaliza.',
    ],
    esperado:
      `La voz dice "Pedido 1001, …"; la confirmación de salida es la de hoy, sin "Se verán afectados los {n} pedidos de la ronda", y la finalización es la de un solo pedido. ${VOZ}`,
  },
  {
    id: 'completa-ultimo-pedido',
    cambio: 'cierre',
    requisito: 'Aviso de pedido completado',
    escenario: 'Se completa el último pedido',
    semilla: 'cierra-ronda',
    ruta: '/surtido',
    pasos: ['1001 y 1002 ya están completos y a 1003 solo le falta una partida.', ESCANEA('2010000', 1), 'Toca ✓ (Aceptar).'],
    esperado:
      'No sale "Pedido completado": sale directamente, como hoy, "Haz surtido el total de productos solicitados ¿Deseas finalizar la ronda?" con "Cancelar" (✕) y "Aceptar" (✓); al aceptar se finaliza la ronda con todos sus pedidos.',
    codigos: [c('2010000')],
  },
  {
    id: 'cancelado-al-finalizar',
    cambio: 'cierre',
    requisito: 'Pedido cancelado durante el surtido',
    escenario: 'Un pedido cancelado al intentar finalizar',
    semilla: 'cancelado-al-finalizar',
    ruta: '/surtido',
    pasos: ['1002 quedó cancelado.', 'Toca ⋮ → "Finalizar surtido" y "Aceptar" en "Pedido cancelado".'],
    esperado:
      '"Pedido cancelado" ("El pedido 1002 fue cancelado. Aparta la mercancía ya surtida y repórtalo para su validación."); al aceptar vuelve a la ventana principal con 1001 y 1003, los totales recalculados y sin rastro de 1002. Hay que volver a confirmar la finalización.',
  },
  {
    id: 'cancelado-automatico',
    cambio: 'cierre',
    requisito: 'Pedido cancelado durante el surtido',
    escenario: 'Cancelado en la finalización automática',
    semilla: 'cancelado-automatico',
    ruta: '/surtido',
    pasos: ['1002 quedó cancelado y solo falta la última partida.', ESCANEA('2010000', 1)],
    esperado: 'Al ofrecer finalizar, sale primero "Pedido cancelado" y, al aceptar, vuelve a la ventana principal sin 1002.',
    codigos: [c('2010000')],
  },
  {
    id: 'cierra-sin-cancelado',
    cambio: 'cierre',
    requisito: 'Pedido cancelado durante el surtido',
    escenario: 'La ronda se cierra sin el cancelado',
    semilla: 'cancelado-automatico',
    ruta: '/surtido',
    pasos: [ESCANEA('2010000', 1), 'Acepta "Pedido cancelado".', 'Toca "Finalizar surtido" y confirma con ✓.'],
    esperado: 'La ronda se cierra con 1001 y 1003, y 1002 no se registra: sale "Surtido finalizado".',
    codigos: [c('2010000')],
  },
  {
    id: 'dos-cancelados',
    cambio: 'cierre',
    requisito: 'Pedido cancelado durante el surtido',
    escenario: 'Dos cancelados en el mismo intento',
    semilla: 'dos-cancelados',
    ruta: '/surtido',
    pasos: ['La ronda lleva 1001, 1002 y 1003 y quedaron cancelados 1002 y 1003.', 'Toca ⋮ → "Finalizar surtido" y acepta los avisos.'],
    esperado:
      '"Pedido cancelado" de 1002 y, al aceptar, enseguida el de 1003, sin volver a la ventana entre uno y otro; después vuelve a la ventana con 1001, que sigue como pedido individual (sin tarjetas).',
  },
  {
    id: 'falla-comprobar-cancelados',
    cambio: 'cierre',
    requisito: 'Pedido cancelado durante el surtido',
    escenario: 'Falla la comprobación de cancelados',
    semilla: 'falla-cancelados',
    ruta: '/surtido',
    pasos: ['El servicio que dice qué pedidos están cancelados falla.', ESCANEA('2010000', 1)],
    esperado:
      'Sale la alerta de error de la app, la ronda no se finaliza y sigue en el listado; con "Finalizar surtido" puede volver a intentarlo (en la demo el reintento ya responde).',
    codigos: [c('2010000')],
  },

  /* ---- Ronda ya concluida por otro usuario (clarificación 31) ---- */
  {
    id: 'dos-hh',
    cambio: 'cierre',
    requisito: 'Ronda ya concluida por otro usuario',
    escenario: 'Dos HH con la misma ronda',
    semilla: 'concluida-por-otro',
    ruta: '/surtido',
    pasos: ['Otro usuario ya finalizó la misma ronda.', ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓.'],
    esperado:
      '"Esta tarea ya fue concluida por otro usuario.", sin registrar nada; cuentan los registros del primero y, al cerrar el error, vuelve a la asignación de tareas sin desvincular.',
    codigos: [c('2010000')],
  },

  /* ---- Servicio cierre-ronda-surtido (assortment-task, specs-servicio): lo que se ve en la HH ---- */
  {
    id: 'servicio-todos-cancelados',
    cambio: 'cierre',
    requisito: 'Ronda sin pedidos',
    escenario: 'Ronda multipedido V2 con todos los pedidos cancelados',
    semilla: 'todos-cancelados',
    ruta: '/surtido',
    pasos: ['Ronda multipedido V2 de 3 pedidos, los tres cancelados.', 'Toca ⋮ → "Finalizar surtido" y acepta los tres "Pedido cancelado".'],
    esperado:
      'La HH ve "Ronda sin pedidos", sin error. En el servidor las tareas de la ronda quedan canceladas, no se registra surtido y la respuesta dice "ronda cancelada" (la demo no muestra la respuesta del servidor).',
  },
  {
    id: 'servicio-todo-negado',
    cambio: 'cierre',
    requisito: 'Ronda sin pedidos',
    escenario: 'Ronda multipedido V2 con todo negado',
    semilla: 'todo-negado',
    ruta: '/surtido',
    pasos: ['Ronda multipedido V2 de 3 pedidos; solo falta negar 2010000 de 1003.', 'Abre el detalle de 2010000 y niégalo con un motivo.'],
    esperado:
      'La HH ve "Ronda sin pedidos", sin error. En el servidor las tareas quedan canceladas, no se registra surtido como completado y la respuesta dice "ronda cancelada".',
  },
  {
    id: 'servicio-con-surtido',
    cambio: 'cierre',
    requisito: 'Ronda sin pedidos',
    escenario: 'Ronda multipedido V2 con surtido',
    semilla: 'cierra-ronda',
    ruta: '/surtido',
    pasos: ['Ronda multipedido V2 con piezas surtidas.', ESCANEA('2010000', 1), 'En "Finalizar surtido" toca ✓.'],
    esperado: 'La ronda se cierra como hoy: sale "Surtido finalizado", no "Ronda sin pedidos" (la respuesta del servidor no dice "ronda cancelada").',
    codigos: [c('2010000')],
  },
];

/**
 * Escenarios del armado de la ronda que ocurren con la ronda ya en surtido y se ven al finalizarla. Los demás
 * escenarios del armado se validan en el simulador de la demo de surtido multipedido.
 */
const CASOS_ARMADO: Caso[] = [
  {
    id: 'armado-retencion-durante-surtido',
    cambio: 'armado',
    requisito: 'Pedidos retenidos o cancelados',
    escenario: 'Retención durante el surtido',
    semilla: 'cierra-ronda',
    ruta: '/surtido',
    pasos: [
      'La ronda lleva 1001, 1002 y 1003 y 1002 se retuvo mientras se surte (la retención no se ve en la HH).',
      'Surte lo que falta: pega 2010000 en el lector (o tócalo en ⌨ y tecléalo), captura 1 y acepta.',
      'En "Finalizar surtido" toca ✓.',
    ],
    esperado:
      'La ronda se finaliza como hoy (toast "Surtido finalizado") y el listado no muestra ningún aviso de retención.',
    codigos: [c('2010000')],
  },
  {
    id: 'armado-cancelacion-durante-surtido',
    cambio: 'armado',
    requisito: 'Pedidos retenidos o cancelados',
    escenario: 'Cancelación durante el surtido',
    semilla: 'cancelado-al-finalizar',
    ruta: '/surtido',
    pasos: ['1002 se canceló mientras se surte.', 'Toca ⋮ → "Finalizar surtido" y "Aceptar" en "Pedido cancelado".'],
    esperado:
      '1002 sale de la ronda y lo surtido de 1001 y 1003 se conserva. Que no llegue a la siguiente tarea de esos pedidos es del servidor: no se ve en la demo.',
  },
];

/* ================= Revisión multipedido · propuesta sin spec (docs/REVISION-MULTIPEDIDO-INTENT.md) ================= */
const R = (n: number, titulo: string) => `R${n} · ${titulo}`;
const ACEPTA_TAREA = 'En Asignación de tareas toca ✓ (Aceptar).';
const CASOS_REVISION: Caso[] = [
  {
    id: 'rev-fin-surtido',
    cambio: 'revision',
    requisito: R(1, 'Entrada al finalizar el surtido'),
    escenario: 'Al finalizar el surtido queda cargada la revisión de la misma ronda',
    semilla: 'revision-fin-surtido',
    ruta: '/surtido',
    pasos: ['Al contenedor C solo le falta 2010000 (misceláneo).', 'Pega 2010000 en el lector, captura 1 y acepta.', 'Confirma "Finalizar surtido" con ✓.'],
    esperado:
      'Toast "Surtido finalizado" y la Asignación de tareas muestra "REVISAR PEDIDO CLIENTE" de la misma ronda G-500 con Contenedor A · 1001, B · 1002 y C · 1003 "Por revisar" (no la G-501).',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'rev-recorrido',
    cambio: 'revision',
    requisito: R(4, 'Un pedido a la vez en el orden del surtido'),
    escenario: 'La revisión abre el primer pedido de la ronda',
    semilla: 'revision-tareas',
    ruta: '/tareas',
    pasos: [ACEPTA_TAREA],
    esperado:
      'Se abre "Revisión de pedido" con "Ronda G-500 · Pedido 1 de 3", la letra A junto a "Pedido 1001" en "Avance de la revisión" (0 %) y solo los productos de 1001: 0486600, 1365800, 1394010 y 2389475.',
    propuesta: true,
  },
  {
    id: 'rev-escaneo',
    cambio: 'revision',
    requisito: R(12, 'Escaneo dentro del pedido'),
    escenario: 'Escanear una etiqueta suma lo revisado',
    semilla: 'revision',
    ruta: '/revision',
    pasos: ['Pega la etiqueta de 11 piezas de 0486600.'],
    esperado: 'Beep de acierto; 0486600 queda en 11 con el chip verde y la fila marcada en azul claro; el avance sube.',
    codigos: [e18('0486600', 11), e18('0486600', 1)],
    propuesta: true,
  },
  {
    id: 'rev-errores',
    cambio: 'revision',
    requisito: R(12, 'Escaneo dentro del pedido'),
    escenario: 'Rechazos del escaneo',
    semilla: 'revision',
    ruta: '/revision',
    pasos: [
      'Pega "12345" → "Código inválido".',
      'Pega la etiqueta de 9999999 → "Producto incorrecto".',
      'Pega la etiqueta de 2012000 (está en B y C, no en A) → "Producto incorrecto".',
      'Teclea 0486600 (7 dígitos) → "Ingreso manual no permitido".',
      'Pega la etiqueta de 12 piezas de 0486600 → "Escaneo sobrante".',
    ],
    esperado: 'Cada lectura suena el beep de error y muestra su toast rojo; lo revisado no cambia.',
    codigos: [c('12345', 'Código inválido'), e18('9999999', 1), e18('2012000', 1), c('0486600', '0486600 tecleado'), e18('0486600', 12)],
    propuesta: true,
  },
  {
    id: 'rev-simplificada',
    cambio: 'revision',
    requisito: R(13, 'Revisión simplificada'),
    escenario: 'Un misceláneo se revisa con el contador',
    semilla: 'revision',
    ruta: '/revision',
    pasos: ['Pega 1394010.', 'En "Revisión simplificada de producto" deja 4 y toca ✓.', 'Vuelve a pegar 1394010.'],
    esperado:
      'El contador arranca en lo surtido (4); al confirmar, 1394010 queda en 4 con chip verde. La segunda vez el modal muestra "Cantidad revisada previamente:".',
    codigos: [c('1394010')],
    propuesta: true,
  },
  {
    id: 'rev-detalle',
    cambio: 'revision',
    requisito: R(14, 'Detalle del producto'),
    escenario: 'Confirmar y cancelar la revisión desde el detalle',
    semilla: 'revision',
    ruta: '/revision',
    pasos: ['Toca la fila de 2389475 (simplificada) → "Confirmar revisión".', 'Toca otra vez 2389475 → "Cancelar revisión".', 'Toca la fila de 0486600 (sin revisar).'],
    esperado:
      '2389475 queda en 2 y luego regresa a 0. En 0486600 se ven "Surtido" y "Revisado" de solo lectura y "Cancelar revisión" inhabilitado.',
    propuesta: true,
  },
  {
    id: 'rev-siguiente',
    cambio: 'revision',
    requisito: R(7, 'Paso entre pedidos con aviso y palomita'),
    escenario: 'Al finalizar un pedido se abre el siguiente',
    semilla: 'revision-a-casi',
    ruta: '/revision',
    pasos: ['A solo le falta 1365800: pega su etiqueta de 1 pieza.', 'En "Finalizar revisión" (Revisión sin diferencias) toca ✓.', 'En el aviso toca ✓.'],
    esperado:
      'Aviso "Pedido A revisado": "Terminaste la revisión del pedido 1001" y "Continúa con B · Pedido 1002 · 51077 · REFACCIONARIA LA ÚNICA". Con ✓ se abre la revisión de 1002 con "Pedido 2 de 3" y la letra B.',
    codigos: [e18('1365800', 1)],
    propuesta: true,
  },
  {
    id: 'rev-ultimo',
    cambio: 'revision',
    requisito: R(8, 'Último pedido de la ronda'),
    escenario: 'Al finalizar el último pedido se regresa a la asignación',
    semilla: 'revision-c-ultimo',
    ruta: '/revision',
    pasos: ['A C (Pedido 3 de 3) solo le falta 2010000: pégalo y confirma 1 con ✓.', 'En "Finalizar revisión" toca ✓.'],
    esperado:
      'Toast "Revisión finalizada" y la Asignación de tareas muestra, sin cortes, la tarea 35 "FACTURAR Y EMBARCAR PEDIDO" de la misma G-500 con A, B y C "Por facturar" (ver el grupo "Facturación y embarque de la ronda").',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'rev-salir-retomar',
    cambio: 'revision',
    requisito: R(10, 'Salir y retomar'),
    escenario: 'Salir pierde el avance del pedido en curso y al retomar solo quedan los que faltan',
    semilla: 'revision-retomar',
    ruta: '/revision',
    pasos: ['Estás en B (Pedido 2 de 3) con 2 de 5 de 0486600.', 'Toca la flecha "Menú".', ACEPTA_TAREA],
    esperado:
      'La asignación muestra "2 de 3 pedidos por revisar", A · 1001 "Revisado" y B, C "Por revisar". Al aceptar se abre B otra vez en 0 % (el avance de B se perdió, como hoy).',
    propuesta: true,
  },
  {
    id: 'rev-sin-b',
    cambio: 'revision',
    requisito: R(5, 'Solo los pedidos surtidos en la ronda'),
    escenario: 'Un pedido retirado en el surtido no entra y las letras no cambian',
    semilla: 'revision-sin-b',
    ruta: '/tareas',
    pasos: ['B (1002) se retiró de la ronda durante el surtido.', ACEPTA_TAREA],
    esperado:
      'La tarea lista Contenedor A · 1001 y Contenedor C · 1003. La revisión abre A con "Pedido 1 de 2"; después sigue C (con su letra C), "Pedido 2 de 2".',
    propuesta: true,
  },
  {
    id: 'rev-b-negado',
    cambio: 'revision',
    requisito: R(5, 'Solo los pedidos surtidos en la ronda'),
    escenario: 'Un pedido negado por completo no entra',
    semilla: 'revision-b-negado',
    ruta: '/tareas',
    pasos: ['Todas las partidas de B (1002) se negaron en el surtido.'],
    esperado: 'La tarea de revisión solo lista Contenedor A · 1001 y Contenedor C · 1003.',
    propuesta: true,
  },
  {
    id: 'rev-discrepancias',
    cambio: 'revision',
    requisito: R(16, 'Finalizar manual desde el menú'),
    escenario: 'Gestor de discrepancias: marcar parcialidad y negar',
    semilla: 'revision-discrepancias',
    ruta: '/revision',
    pasos: [
      'Toca ⋮ → "Finalizar revisión".',
      'En "Gestor discrepancias" de 0486600 (8 de 11, diferencia −3) toca "Marcar parcialidad", elige un motivo y ✓.',
      'En 1365800 (0 de 1) toca "Negar", elige un motivo y ✓.',
      'En "Finalizar revisión" toca ✓.',
    ],
    esperado:
      'Las discrepancias salen una por una; al terminar, "Finalizar revisión" sin la leyenda "Revisión sin diferencias". Al confirmar, aviso "Pedido A revisado" y sigue B. "Regresar" después de negar pregunta "¿Regresar a revisión?" y restablece lo negado.',
    propuesta: true,
  },
  {
    id: 'rev-promocion',
    cambio: 'revision',
    requisito: R(16, 'Finalizar manual desde el menú'),
    escenario: 'Una promoción incompleta bloquea el cierre',
    semilla: 'revision-promocion',
    ruta: '/revision',
    pasos: ['El Kit afinación de A lleva 0486600 en 5 de 11.', 'Toca ⋮ → "Finalizar revisión".'],
    esperado: '"No es posible finalizar este pedido" con "Códigos de la promoción": 0486600 5 de 11 y 2389475 2 de 2. Solo se puede cerrar (✕).',
    propuesta: true,
  },
  {
    id: 'rev-corporativo',
    cambio: 'revision',
    requisito: R(16, 'Finalizar manual desde el menú'),
    escenario: 'Corporativo incompleto: se saca de la ronda y se sigue con el siguiente',
    semilla: 'revision-corporativo',
    ruta: '/revision',
    pasos: ['B (1002) es corporativo con orden de compra y está incompleto.', 'Toca ⋮ → "Finalizar revisión".', 'En "¿Deseas sacar el pedido de la ronda?" toca ✓.'],
    esperado: 'Aviso "Pedido B retirado de la ronda" con "Continúa con C · Pedido 1003". Con ✓ se abre C, "Pedido 3 de 3".',
    propuesta: true,
  },
  {
    id: 'rev-falla-red',
    cambio: 'revision',
    requisito: R(17, 'Falla de red al finalizar'),
    escenario: 'Reintentar sin avanzar al siguiente pedido',
    semilla: 'revision-falla-red',
    ruta: '/revision',
    pasos: ['Pega la etiqueta de 1365800 y confirma "Finalizar revisión" con ✓.', 'En "Tarea incompleta" toca "Reintentar".'],
    esperado: 'La primera vez sale "Tarea incompleta" (error de red) y se queda en A. Con "Reintentar" se envía y sale el aviso para seguir con B.',
    codigos: [e18('1365800', 1)],
    propuesta: true,
  },
  {
    id: 'rev-sin-bandera',
    cambio: 'revision',
    requisito: R(3, 'Sin la bandera, como hoy'),
    escenario: 'Tarea de revisión de varios pedidos sin la bandera',
    semilla: 'revision-sin-bandera',
    ruta: '/tareas',
    pasos: [ACEPTA_TAREA],
    esperado:
      '"Tarea incompleta": "Esta tarea aún no ha sido finalizada en Exodus Sucursales. Por favor, conclúyela desde ese sistema para poder continuar."',
    propuesta: true,
  },
  {
    id: 'rev-no-surtida',
    cambio: 'revision',
    requisito: R(2, 'Validaciones al tomar la tarea'),
    escenario: 'La orden no está surtida',
    semilla: 'revision-no-surtida',
    ruta: '/tareas',
    pasos: [ACEPTA_TAREA],
    esperado: '"No es posible iniciar esta tarea": "La orden no se encuentra surtida, es necesario que se surta para poder revisarla."',
    propuesta: true,
  },
  {
    id: 'rev-iniciada-en-otro',
    cambio: 'revision',
    requisito: R(2, 'Validaciones al tomar la tarea'),
    escenario: 'La revisión se inició desde Exodus Sucursales',
    semilla: 'revision-iniciada-en-otro',
    ruta: '/tareas',
    pasos: [ACEPTA_TAREA, 'Toca ✓ para continuar en este dispositivo.'],
    esperado:
      '"Tarea iniciada previamente" pregunta si se continúa en este dispositivo; con ✓ se abre la revisión de A, con ✕ se queda en la asignación.',
    propuesta: true,
  },
];

/* ============ Facturación y embarque de la ronda · tarea 35 · propuesta sin spec (R18–R27) ============ */
const GENERA = 'Toca "Generar factura" (espera "Generando factura…").';
const CASOS_FACTURACION: Caso[] = [
  {
    id: 'fac-desde-revision',
    cambio: 'facturacion',
    requisito: R(18, 'Orden de tareas: revisión de toda la ronda y luego la 35'),
    escenario: 'Al cerrar la revisión de la ronda queda cargada la tarea 35',
    semilla: 'facturacion-desde-revision',
    ruta: '/revision',
    pasos: ['A C (Pedido 3 de 3) solo le falta 2010000: pégalo y confirma 1 con ✓.', 'En "Finalizar revisión" toca ✓.'],
    esperado:
      'Toast "Revisión finalizada" y la Asignación de tareas muestra "FACTURAR Y EMBARCAR PEDIDO" de la misma G-500 con Contenedor A · 1001, B · 1002 y C · 1003 "Por facturar".',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'fac-flujo-completo',
    cambio: 'facturacion',
    requisito: R(18, 'Orden de tareas: revisión de toda la ronda y luego la 35'),
    escenario: 'Recorrido completo: surtido, revisión, facturación y embarque',
    semilla: 'flujo-completo',
    ruta: '/surtido',
    pasos: [
      'Termina el surtido (a C le falta 2010000: pégalo, captura 1, acepta y confirma con ✓).',
      'Revisa A, B y C (usa las lecturas del panel izquierdo) y confirma el paso entre pedidos.',
      'Toma la tarea 35 y factura y embarca A, B y C.',
    ],
    esperado: 'Las tres tareas de la G-500 se hacen seguidas en la HH; al terminar el último embarque la asignación muestra la G-501.',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'fac-traspaso',
    cambio: 'facturacion',
    requisito: R(18, 'Orden de tareas: revisión de toda la ronda y luego la 35'),
    escenario: 'Un traspaso de la ronda no se factura',
    semilla: 'facturacion-con-traspaso',
    ruta: '/revision',
    pasos: ['B (1002) es un traspaso. A y B ya se revisaron; a C le falta 2010000: pégalo, confirma 1 con ✓ y finaliza con ✓.'],
    esperado:
      'La tarea 35 de la G-500 solo lista Contenedor A · 1001 y Contenedor C · 1003 (pedidos de cliente): el traspaso no se mezcla con la facturación. Se facturan y embarcan A y C por separado ("Pedido 1 de 2", "Pedido 2 de 2").',
    codigos: [c('2010000')],
    propuesta: true,
  },
  {
    id: 'fac-recorrido',
    cambio: 'facturacion',
    requisito: R(19, 'Un pedido a la vez dentro de la tarea 35'),
    escenario: 'La tarea 35 abre la factura del primer pedido',
    semilla: 'facturacion-tareas',
    ruta: '/tareas',
    pasos: ['En Asignación de tareas toca ✓ (Aceptar).'],
    esperado:
      '"Datos de la factura" de 1001 con "Ronda G-500 · Pedido 1 de 3" y la letra A, el total, los siete campos de solo lectura (la dirección de entrega no se puede cambiar) y "Impresión · Copias".',
    propuesta: true,
  },
  {
    id: 'fac-generar',
    cambio: 'facturacion',
    requisito: R(22, 'Generar factura'),
    escenario: 'Factura generada y timbrada',
    semilla: 'facturacion',
    ruta: '/facturacion',
    pasos: [GENERA],
    esperado: 'Toast "Imprimiendo factura" y el formulario muestra "Folio factura 1099204" con "Reimprimir factura" y "Continuar a embarque".',
    propuesta: true,
  },
  {
    id: 'fac-error',
    cambio: 'facturacion',
    requisito: R(22, 'Generar factura'),
    escenario: 'Error al generar la factura',
    semilla: 'facturacion-error',
    ruta: '/facturacion',
    pasos: [GENERA, 'Vuelve a tocar "Generar factura".'],
    esperado: 'La primera vez sale el toast "Error al generar la factura" y el formulario queda igual; el reintento factura.',
    propuesta: true,
  },
  {
    id: 'fac-sin-timbrar',
    cambio: 'facturacion',
    requisito: R(23, 'Factura sin timbrar'),
    escenario: 'La factura se crea sin timbrar y se puede reintentar el timbrado',
    semilla: 'facturacion-sin-timbrar',
    ruta: '/facturacion',
    pasos: [GENERA, 'En "Factura sin timbrar" toca "Continuar a impresión".', 'Toca "Reintentar timbrado".'],
    esperado:
      'Modal "Factura sin timbrar"; después el folio con "Timbrado: Pendiente" y "Reintentar timbrado". Al reintentar: "Timbrando factura…" y toast "Factura timbrada". También se puede reimprimir o continuar al embarque sin timbrar.',
    propuesta: true,
  },
  {
    id: 'fac-impresora-no-configurada',
    cambio: 'facturacion',
    requisito: R(24, 'Reimprimir factura'),
    escenario: 'Impresora no configurada',
    semilla: 'facturacion-impresora-no-configurada',
    ruta: '/facturacion',
    pasos: ['Toca "Reimprimir factura".'],
    esperado: 'Toast "Impresora no configurada": "No podrás imprimir hasta que asignes una impresora a este proceso."',
    propuesta: true,
  },
  {
    id: 'fac-impresora-sin-conexion',
    cambio: 'facturacion',
    requisito: R(24, 'Reimprimir factura'),
    escenario: 'Impresora sin conexión',
    semilla: 'facturacion-impresora-sin-conexion',
    ruta: '/facturacion',
    pasos: ['Toca "Reimprimir factura".'],
    esperado: 'Toast rojo "Impresora sin conexión". La factura no cambia.',
    propuesta: true,
  },
  {
    id: 'emb-nuevo',
    cambio: 'facturacion',
    requisito: R(25, 'Embarque compatible: mismo cliente y misma dirección'),
    escenario: 'Sin embarque compatible se crea uno nuevo',
    semilla: 'embarque-nuevo',
    ruta: '/facturacion',
    pasos: ['Toca "Continuar a embarque".', 'Elige una paquetería, escribe un comentario y toca ✓.', 'En "Embarque creado" toca ✓.', 'En el aviso toca ✓.'],
    esperado:
      '"Nuevo embarque" con ✓ inhabilitado hasta llenar paquetería y comentario. Toast "Factura ligada al embarque", "Embarque creado · No. de embarque 147707" y aviso "Pedido A facturado y embarcado · Continúa con B · Pedido 1002".',
    propuesta: true,
  },
  {
    id: 'emb-otra-direccion',
    cambio: 'facturacion',
    requisito: R(25, 'Embarque compatible: mismo cliente y misma dirección'),
    escenario: 'Un embarque del mismo cliente en otra dirección no es compatible',
    semilla: 'embarque-otra-direccion',
    ruta: '/facturacion',
    pasos: ['48213 ya tiene el embarque 147655 activo en otra dirección.', 'Toca "Continuar a embarque".'],
    esperado: 'Sale "Nuevo embarque" ("No existe un embarque activo para este cliente"): el 147655 no se ofrece.',
    propuesta: true,
  },
  {
    id: 'emb-previo',
    cambio: 'facturacion',
    requisito: R(25, 'Embarque compatible: mismo cliente y misma dirección'),
    escenario: 'Embarque activo previo del cliente: agregar o generar nuevo',
    semilla: 'embarque-previo-b',
    ruta: '/facturacion',
    pasos: ['B (1002) está facturado y 51077 tiene el embarque 147650 activo en su dirección.', 'Toca "Continuar a embarque" y luego "Agregar existente".', 'Toca ✓.'],
    esperado:
      '"Agregar embarque": "Existe 1 embarque activo para este mismo cliente". El selector trae 147650 preseleccionado con su paquetería y comentario. Resultado "Factura agregada · 147650 (2 facturas)".',
    propuesta: true,
  },
  {
    id: 'emb-mismo-cliente-ronda',
    cambio: 'facturacion',
    requisito: R(27, 'Paso entre pedidos y cierre de la tarea 35'),
    escenario: 'C se agrega al embarque de A y la tarea 35 se cierra',
    semilla: 'embarque-c-mismo-cliente',
    ruta: '/facturacion',
    pasos: [
      'A (147707) y B (147708) ya están embarcados; C está facturado.',
      'Toca "Continuar a embarque" → "Agregar existente" → ✓ → ✓.',
      'Toca "Regresar a tareas".',
    ],
    esperado:
      'Solo se ofrece 147707 (el de A: mismo cliente 48213 y misma dirección). "Factura agregada · 147707 (2 facturas)", el formulario muestra "No. de embarque 147707" y "Regresar a tareas" cierra con el toast "Factura y embarque finalizados" y la G-501.',
    propuesta: true,
  },
  {
    id: 'emb-falla-ligar',
    cambio: 'facturacion',
    requisito: R(26, 'Resultado del embarque'),
    escenario: 'Falla al ligar la factura al embarque',
    semilla: 'embarque-falla-ligar',
    ruta: '/facturacion',
    pasos: ['Toca "Continuar a embarque", llena paquetería y comentario y toca ✓.', 'Repite.'],
    esperado: 'La primera vez sale el toast "Se produjo un error" y se queda en la factura; al repetir se crea el embarque.',
    propuesta: true,
  },
  {
    id: 'fac-retomar',
    cambio: 'facturacion',
    requisito: R(27, 'Paso entre pedidos y cierre de la tarea 35'),
    escenario: 'Retomar con un pedido facturado sin embarque',
    semilla: 'facturacion-retomar',
    ruta: '/tareas',
    pasos: ['En Asignación de tareas toca ✓ (Aceptar).'],
    esperado:
      'La tarea muestra A "Embarcado", B "Facturado, sin embarque" y C "Por facturar". Se abre B ("Pedido 2 de 3") ya facturado, con "Continuar a embarque".',
    propuesta: true,
  },
  {
    id: 'fac-sin-bandera',
    cambio: 'facturacion',
    requisito: R(20, 'Validaciones al tomar la tarea 35'),
    escenario: 'Sin Bandera_FacturacionEnHH',
    semilla: 'facturacion-sin-bandera',
    ruta: '/tareas',
    pasos: ['En Asignación de tareas toca ✓ (Aceptar).'],
    esperado: '"Tarea incompleta": la tarea se concluye en Exodus Sucursales.',
    propuesta: true,
  },
  {
    id: 'fac-concluida-en-otro',
    cambio: 'facturacion',
    requisito: R(20, 'Validaciones al tomar la tarea 35'),
    escenario: 'La tarea 35 ya se finalizó en otro sistema',
    semilla: 'facturacion-concluida-en-otro',
    ruta: '/tareas',
    pasos: ['En Asignación de tareas toca ✓ (Aceptar).'],
    esperado: 'Toast "Tarea finalizada": "Ya se facturó y embarcó el pedido correctamente desde otro sistema." y la asignación muestra la G-501.',
    propuesta: true,
  },
];

export const CASOS: Caso[] = [...CASOS_FINALIZAR, ...CASOS_ARMADO, ...CASOS_REVISION, ...CASOS_FACTURACION];

export const casoPorId = (id: string | null) => (id ? CASOS.find((x) => x.id === id) : undefined);

/** Liga de un caso: la semilla va en la query y la pantalla en el hash. */
export function urlCaso(x: Caso): string {
  return `?escenario=${x.semilla}&caso=${x.id}#${x.ruta}`;
}

/** Carpeta del spec, para mostrarla junto al requisito. */
export const carpetaDe = (id: CambioId) => CAMBIOS.find((x) => x.id === id)?.carpeta ?? LISTADO;
