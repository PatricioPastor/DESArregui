Bien, aquí te dejo un **contexto completo y autónomo** que puedes copiar y pegar directamente en Claude (el modelo de IA de Anthropic). Lo he estructurado de manera clara, detallada y self-contained, para que Claude pueda entender todo el flujo: desde la operabilidad de tu planilla Excel (que en realidad es Google Sheets con el script de Apps Script), pasando por el documento PDF que necesitas generar, el análisis predictivo (proyecciones, stock, netos, etc.), hasta cómo integrarlo en tu aplicación React existente. Incluyo el contenido completo del PDF transcrito, descripciones de las screenshots (que muestran una versión web del informe), y sugerencias para el desarrollo en React, basándome en el prompt de v0 que te di anteriormente, pero adaptado para hacer la conclusión más sintética y enfatizar el stock actual.

He incorporado todo lo discutido previamente: el script original y modificado, la integración de stock, el dashboard con gráficos, y ahora el PDF como base para el contenido dinámico en React. Claude podrá generar código React basado en esto, asumiendo que tu app ya está iniciada (por ejemplo, con Shadcn UI, Tailwind, etc.).

### Prompt/Contexto para Claude:

```
Hola Claude. Te voy a dar un contexto absoluto y completo sobre un proyecto para gestionar reportes de inventario de dispositivos móviles (celulares) en la compañía DESA. El objetivo es que me ayudes a desarrollar una aplicación React que ya tengo iniciada, integrando: 

1. La operabilidad de una planilla Excel (en realidad Google Sheets con un script de Google Apps Script) que procesa datos de solicitudes y genera reportes con proyecciones y stock.
2. Un documento PDF específico ("PROYECCIÓN CON STOCK.pdf") que representa el informe final a generar/visualizar.
3. Análisis predictivo: Cálculos de proyecciones basadas en datos históricos, integrando stock disponible para netos (demanda - stock), presupuestos y recomendaciones.
4. Integración en una app React: Mostrar el informe en un dashboard interactivo, con secciones, tablas, gráficos, y una vista embebida del PDF o renderizado dinámico. Haz la conclusión más sintética (más corta, con bullets, sin redundancias). Enfatiza la presencia del stock actual en todas las secciones relevantes.

El usuario quiere comenzar a desarrollar esto en una app React existente, con un estilo similar a las screenshots proporcionadas (header con logo DESA, título, fecha; secciones con tablas y texto; footer con www.desa.com.ar y icons sociales: Facebook, X, Instagram, LinkedIn, WhatsApp). Usa Shadcn UI, Tailwind CSS, y componentes como Cards, Tables, Charts (con Recharts o Chart.js), para un dashboard moderno y responsive.

**Parte 1: Operabilidad de la planilla Excel (Google Sheets con Apps Script)**
La base es una hoja de Google Sheets llamada "ANALISIS" que procesa datos de issues/solicitudes de JIRA o similar, relacionados con asignaciones y recambios de celulares para distribuidoras (EDEN, EDELAP, EDEA, EDESA, EDES, DESA). Los datos están en rangos:
- Actual: G2:M (Issue Type, Key, Summary, Labels, Compañía, Created, Updated).
- Previo: O2:U (mismo).
- Stock: En una hoja separada "Stock" (A2:B7: Compañía, Stock Disponible).

El script (Google Apps Script) procesa filas, extrae cantidades de Summary (ej: "R-1" -> recambio de 1), clasifica por Labels ("REC" para recambio, "ASG" para asignaciones, "P-" para pendientes), suma por compañía, integra stock para netos (max(0, total - stock)), calcula proyecciones (variación % entre previo y actual, aplicada al futuro, ajustada por stock), y escribe tablas en "ANALISIS" (filas 11+, 22+, 33+, 41+). También crea un dashboard en hoja "Dashboard" con gráficos (barras, pastel, líneas) y documentación en "Documentacion".

Código completo del script modificado (con stock y dashboard):
[Inserta aquí el código completo que te di en la respuesta anterior, el del script modificado con dashboard].

Ejemplo de datos procesados (de la tabla proporcionada):
- Filas como "R-1 - CAMBIO DE CELULAR" con Labels "REC-CEL" -> Recambio +1 para EDESA.
- Totales: Suma cantidades, resta stock para netos.

Análisis predictivo en el script:
- Variación: (actual.total - previo.total) / previo.total.
- Proyectado: actual.total * (1 + variación).
- Neto: max(0, proyectado - stock).
- Globales: Suma de todo, con presupuestos (ej: unidades * U$S 576 para Galaxy A16).

**Parte 2: El documento PDF a generar ("PROYECCIÓN CON STOCK.pdf")**
Este es el informe final que se genera basado en el script. Tiene 6 páginas, con datos de Mayo-Julio 2025, proyecciones para Agosto-Octubre, stock actual, y presupuestos. Usa placeholders como <DEMANDA_ANALIZADA:64>, <DISPOSITIVOS_OBSOLETOS:25>, etc. El informe debe generarse dinámicamente en la app React (ej: usando react-pdf para exportar, o renderizar en UI).

Contenido completo transcrito del PDF:
<PAGE 1>
<FECHA_REPORTE>

Informe dispositivos móviles

Este informe tiene como objetivo estimar la cantidad de equipos celulares necesarios para cubrir las necesidades operativas durante el período <RANGO_FECHA_TEXTO>.

El análisis se basa en los datos recopilados por Mesa de ayuda sobre los equipos entregados a las distribuidoras (EDEN, EDEA, EDELAP, EDES y EDESA) desde el <RANGO_INICIO_FECHA>, incluyendo:

● Asignaciones a nuevos usuarios
● Recambios por robo, rotura, extravío u obsolescencia

Esta información permite establecer una proyección para el próximo trimestre, basada en el comportamiento real del período anterior.
</PAGE>

<PAGE 2>
Distribuidoras

A continuación, se presenta un resumen del comportamiento de consumo de equipos móviles por parte de cada distribuidora durante el trimestre analizado.

Se incluyen datos de:

● Solicitudes pendientes (resueltas o no según contexto)
● Nuevas asignaciones
● Recambios por obsolescencia, rotura, robo o extravío

Distribuidora | Pendientes | Asignaciones | Recambios | Demanda Total
EDEN | 0 | 2 | 19 | 21
EDELAP | 0 | 3 | 7 | 10
EDEA | 0 | 0 | 14 | 14
EDESA | 0 | 5 | 4 | 9
EDES | 0 | 0 | 5 | 5
DESA | 0 | 2 | 3 | 5
TOTAL | 0 | 12 | 52 | 64

Análisis

Teléfonos pendientes de recambio (solicitud y obsolescencia)

Actualmente, no se registran tickets pendientes activos. No obstante, en la base de datos de SOTI MobiControl se identifican <DISPOSITIVOS_OBSOLETOS:25> que se encuentran por debajo del estándar vigente (Samsung Galaxy A16/A2X).

Teléfonos reemplazados

Durante el trimestre mayo–julio 2025, se entregaron <DEMANDA_ANALIZADA:64> dispositivos entre asignaciones nuevas y recambios.
</PAGE>

<PAGE 3>
Conclusión

Sobre la base de los datos registrados en el último trimestre (mayo a julio 2025), se entregaron un total de <DEMANDA_ANALIZADA:64> equipos celulares. Esta cifra incluye tanto asignaciones nuevas como recambios por distintos motivos (robo, extravío, rotura u obsolescencia).

A continuación, se detalla el motivo de cada entrega:

● Asignaciones a nuevos ingresos: XX unidades
● Recambios por rotura: XX unidades
● Recambios por robo o extravío: XX unidades
● Recambios por obsolescencia (fuera de estándar): XX unidades

Si comparamos ese número con el trimestre anterior (febrero a abril 2025), donde se entregaron 73 equipos, podemos ver que la demanda bajó levemente.

La previsión para el próximo trimestre (agosto a octubre 2025), tomamos como referencia esa diferencia. Entonces podríamos esperar una demanda un poco menor. En este caso, la proyección da como resultado <DEMANDA_PROYECTADA:56> equipos (la estimación es en caso de que la tendencia continúe).

A esa cantidad hay que sumarle los <DISPOSITIVOS_OBSOLETOS> dispositivos que hoy están identificados como obsoletos en el sistema de gestión (SOTI), ya que deben ser reemplazados por modelos actuales.

Por lo tanto, la necesidad total estimada para el próximo trimestre es de 56 equipos (proyección futura)

Teniendo en cuenta que el modelo estándar que se utiliza para este tipo de recambios es el Samsung Galaxy A16, cuyo valor unitario es de U$S 576, el presupuesto estimado sería:

U$S 46.656 (81 equipos × U$S 576)

Nota: Aunque actualmente no hay tickets pendientes activos, esta estimación contempla posibles ingresos y recambios durante los próximos meses, con base en la evolución reciente de la demanda.
</PAGE>

<PAGE 4>
Estado actual de stock de dispositivos

Modelo | Cantidad disponible | Uso habitual
Samsung Galaxy A16 | 117 | Recambios convencionales
Samsung Galaxy A36 | 8 | <DEFINIR TEXTO CON LEO>
Samsung Galaxy A56 | 4 | <DEFINIR TEXTO CON LEO>
Galaxy S25 Plus | 1 | <DEFINIR TEXTO CON LEO>
Galaxy S25 Ultra | 1 | <DEFINIR TEXTO CON LEO>
TOTAL | 131

El stock actual disponible se compone de 131 dispositivos, de los cuales:

● 117 unidades del modelo Galaxy A16 están destinadas a cubrir la demanda operativa general (asignaciones, recambios y reemplazos).
● El resto del stock corresponde a modelos de gama media y alta, utilizados en situaciones específicas para jefaturas, coordinaciones o gerencias.

Este nivel de stock permite, por ahora, responder tanto a la demanda proyectada como a los equipos obsoletos detectados. Sin embargo, en caso de un pico de demanda inesperado o de una demora en la reposición por parte del proveedor, se recomienda reforzar la reserva operativa con una compra preventiva de al menos 30 unidades.
</PAGE>

<PAGE 5>
Escenario mínimo y urgente

En caso de que se priorice solo cubrir lo ya solicitado a través de tickets aprobados, la demanda mínima a cubrir es de <PENDIENTES> dispositivos.

Este escenario contempla únicamente los reemplazos ya solicitados, que se distribuyen del siguiente modo:

● EDEA: <PENDIENTE_EDEA>
● EDELAP: <PENDIENTE_EDELAP>
● EDESA: <PENDIENTE_EDESA>
● EDEN: <PENDIENTE_EDEN>
● EDES: <PENDIENTE_EDES>
● DESA: <PENDIENTE_DESA>

Presupuesto estimado: U$S <PRECIO_MINIMO> (²)

Adquisición de accesorios

Para acompañar los dispositivos mencionados anteriormente, se recomienda también la compra de los siguientes accesorios, que cubrirán tanto la entrega inmediata como posibles solicitudes por recambios:

● <ACCESORIOS_TEMP_AX> vidrios templados para Galaxy A25
● <ACCESORIOS_FUND_AX> fundas para Galaxy A25
● <ACCESORIOS_CAB_C_AX> cabezales de cargador tipo C

Presupuesto estimado para accesorios: U$S <TOTAL_ACCES_AX> (³)
</PAGE>

<PAGE 6>
Proyección de Gama Media / Alta

En paralelo al recambio convencional, se prevé la necesidad de reemplazar o asignar nuevos equipos para personal de supervisión, gerencia o dirección.

Se estima el siguiente requerimiento:

● Galaxy A35: <GAMA_M_A35> unidades
● Galaxy A55: <GAMA_M_A55> unidades
● Galaxy S25+: <GAMA_A_S2X> unidades

Presupuesto estimado: U$S <GAMA_MED_ACCES> (Incluye equipos y accesorios correspondientes)
</PAGE>

**Parte 3: Análisis predictivo (lo que deberíamos realizar)**
Basado en el script y PDF:
- Compara previo (73) vs. actual (64) -> Variación negativa (baja demanda).
- Proyectado: 56 (basado en tendencia), +25 obsoletos = 81 total estimado.
- Integrar stock (131 total, 117 A16 para general): Neto = max(0, demanda - stock). Recomendar compra si neto >0 o pico esperado (30 unidades preventivas).
- Presupuestos: Unidades * U$S 576 para A16; incluir accesorios y gama alta.
- Acciones: Reforzar stock si demora proveedor; priorizar mínimos urgentes; monitorear SOTI para obsoletos.
- En la app: Hacer dinámico con datos de Sheets (via API o import), calcular netos/proyecciones en frontend o backend.

**Parte 4: Screenshots de la app existente (versión web del informe)**
La app ya iniciada muestra el PDF renderizado en web:
- Screenshot 1: Header "DESA", badge "FECHA REPORTE", título "Informe dispositivos móviles", intro texto, bullets de asignaciones/recambios, proyección.
- Screenshot 2: Sección "Distribuidoras" con resumen, tabla (como en PDF), "Análisis" con pendientes (0 tickets, 25 obsoletos), reemplazados (64).
- Screenshot 3: "Conclusión" con detalles, comparación (73 previo), proyección (56+25=81), presupuesto U$S 46.656, nota.
- Screenshot 4: "Estado actual de stock" con tabla (117 A16, etc., total 131), texto enfatizando cobertura y recomendación de 30 unidades.
- Screenshot 5: "Escenario mínimo y urgente" con pendientes por distribuidora, presupuesto; "Adquisición de accesorios" con lista, presupuesto.
- Screenshot 6: "Proyección de Gama Media / Alta" con requerimientos, presupuesto.
- Footer en todos: "www.desa.com.ar" + icons (f, @, x, in, WhatsApp).

**Parte 5: Instrucciones para desarrollar en React**
Basado en un prompt de v0 para generar código React: Crea un dashboard moderno/responsive usando Shadcn UI, Tailwind. Estructura en secciones scrollables, mirroring el PDF pero mejorado (más sintético en conclusión). Header fijo con logo "DESA", título, fecha (usa fecha actual: August 28, 2025). Botón "Exportar PDF" (usa react-pdf). Sidebar o modal para viewer PDF embebido (react-pdf). Gráficos: Barras para distribuidoras, Donut para breakdown, Línea para tendencias (previo/actual/proyectado), Pie para stock.

Haz conclusión sintética: Usa bullets para motivos, resume en <200 palabras.


Genera código completo para un componente Dashboard.tsx, asumiendo app iniciada con theme toggle (dark/light).

Por favor, genera el código React modificado, explicando cambios y cómo integra todo.
```