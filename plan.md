¡Gracias por las aclaraciones! He incorporado tus respuestas a los casos límite y ajustado el prompt para reflejar las nuevas precisiones, como la posibilidad de usar dispositivos `USED` en nuevas asignaciones, la validación de un solo usuario, el manejo de `return_device_imei` no existente, y la clarificación sobre desasignaciones pendientes. El prompt está optimizado para ser claro, conciso y alineado con el esquema Prisma, asegurando que Claude (o una IA similar) entienda el flujo completo.

---

### Prompt Mejorado para Claude

**Título: Flujo de Asignación de Dispositivos con UI y Backend Basado en Prisma**

**Resumen**:  
Desarrollamos un sistema de gestión de dispositivos para asignar teléfonos móviles a usuarios. Los dispositivos con `status` en `NEW`, `USED` o `REPAIRED` en la tabla `device` son elegibles para asignación. Una `Nueva Asignación` ocurre cuando un usuario no tenía un teléfono previamente, pudiendo asignarse un dispositivo `NEW`, `USED` o `REPAIRED`, mientras que un `Reemplazo` implica que el usuario ya tenía un dispositivo y puede incluir la devolución de un IMEI. El sistema incluye una interfaz de usuario (UI) con un modal stepper para asignaciones, gestión de envíos opcionales (Translyf/Serv. Transporte) y devoluciones. El backend usa PostgreSQL con Prisma, esquemas `main_auth`, `phones` y `support`. Nota: El sistema es usado por un solo usuario, por lo que no se requiere manejo de concurrencia. Las desasignaciones (`assignment_type` = `UNASSIGN`) no están contempladas en este flujo, pero deben quedar pendientes para futuro desarrollo.

**Contexto de la Base de Datos (Esquema Prisma)**:  
Modelos relevantes:  
- **device** (esquema `phones`):  
  - Campos: `id`, `imei` (único), `status` (enum: `NEW`, `USED`, `REPAIRED`, etc.), `assigned_to` (nullable), `distributor_id`, `model_id`, `purchase_id`, `created_at`, `updated_at`, `is_deleted`, `deletion_reason`.  
  - Relaciones: `assignments` (uno a muchos), `distributor`, `model` (`phone_model`), `purchase`.  
- **assignment** (esquema `phones`):  
  - Campos: `id`, `at`, `assigned_to`, `device_id`, `type` (enum: `ASSIGN`, `UNASSIGN`), `assignee_name`, `assignee_phone`, `assignee_email`, `contact_details`, `delivery_location`, `distributor_id`, `expects_return` (boolean), `return_device_imei`, `return_status`, `return_received_at`, `return_notes`, `shipping_voucher_id`, `soti_device_id`, `status` (string, por defecto: `active`), `closed_at`, `closure_reason`, `shipping_status` (string, por defecto: `pending`), `shipped_at`, `delivered_at`, `shipping_notes`.  
  - Relaciones: `device`, `distributor`, `soti_device`.  
- **phone_model** (esquema `phones`): Campos como `brand`, `model`, `color`, `storage_gb`.  
- **distributor** (esquema `phones`): Campos como `name`, relacionado con `assignment` y `device`.  

**Requisitos de la Interfaz de Usuario (UI)**:  
1. **Vista de Lista de Dispositivos**:  
   - Mostrar dispositivos con `status` = `NEW`, `USED` o `REPAIRED` desde la tabla `device`.  
   - Columnas: `imei`, `model` (de `phone_model.brand` y `phone_model.model`), `status`, `distributor.name` (si aplica).  
   - Cada dispositivo tiene dos botones:  
     - **Ver Más**: Muestra detalles (ej., `imei`, `model.brand`, `model.model`, `status`, `distributor.name`).  
     - **Asignar**: Abre un modal con un stepper para la asignación.  

2. **Modal de Asignación (Stepper)**:  
   Un modal con un stepper para crear asignaciones:  
   - **Paso 1: Tipo de Asignación**  
     - Opciones: `Nueva Asignación` (`type` = `ASSIGN`, usuario sin teléfono previo) o `Reemplazo` (`type` = `ASSIGN`, usuario con teléfono previo).  
     - En `Nueva Asignación`, el dispositivo puede ser `NEW`, `USED` o `REPAIRED`, pero el usuario no devuelve un dispositivo a menos que se indique en el paso 3.  
     - En `Reemplazo`, siempre se espera una devolución (`expects_return` = `true` por defecto).  
   - **Paso 2: Transporte**  
     - Pregunta: "¿El teléfono debe enviarse por Translyf/Serv. Transporte?"  
     - Opciones: `Sí` (`shipping_status` = `pending`) o `No` (`shipping_status` = `null`).  
   - **Paso 3: Detalles de la Asignación**  
     - Recolectar:  
       - `assignee_name` (nombre y apellido del usuario asignado, obligatorio).  
       - `assignee_phone`, `assignee_email`, `contact_details` (opcionales).  
       - `assigned_to` (string, nombre y apellido del usuario, no requiere mapeo a `user.id`).  
     - Si es `Reemplazo` o `Nueva Asignación` con devolución:  
       - Preguntar: "¿Se devolverá un dispositivo?" (`expects_return` boolean).  
       - Si `expects_return` = `true`, recolectar `return_device_imei`.  
       - Si el `return_device_imei` no existe en `device.imei`, mostrar un CTA "Registrar Dispositivo Devuelto" para crear un nuevo registro en `device` con `status` = `USED` y los datos proporcionados (ej., `imei`, `model_id`).  
     - Si se requiere transporte (`shipping_status` = `pending`):  
       - Recolectar `delivery_location` (string, obligatorio) y `distributor_id` (seleccionar cualquier `distributor` de la tabla `distributor`).  
       - Opcional: `shipping_voucher_id` para rastreo.  
     - Al enviar:  
       - Crear registro en `assignment` con `status` = `active`.  
       - Si no hay transporte, establecer `delivered_at` = `now()`, `assignment.status` = `active`.  
       - Si hay transporte, establecer `shipping_status` = `pending`, dejar `delivered_at` como null.  
       - Actualizar `device.status` = `ASSIGNED`, `device.assigned_to` = `assignment.assigned_to`.  

3. **Gestión Post-Asignación (UI)**:  
   - **Para Asignaciones con Transporte** (`shipping_status` no es null):  
     - Mostrar acciones:  
       - **Iniciar Transporte**: Establecer `shipping_status` = `in_progress`, `shipped_at` = `now()`.  
       - **Seguimiento de Transporte**: Mostrar `shipping_status`, `shipped_at`, `delivered_at`, `shipping_notes`.  
       - **Finalizar Transporte**: Establecer `shipping_status` = `completed`, `delivered_at` = `now()`, `assignment.status` = `active`.  
     - Si `expects_return` = `true`, mostrar gestión de devolución:  
       - Ingresar `return_device_imei` (si no se proporcionó antes).  
       - Si el `return_device_imei` no existe en `device`, mostrar CTA "Registrar Dispositivo Devuelto" para crear un nuevo `device`.  
       - Establecer `return_status` = `received`, `return_received_at` = `now()`.  
   - **Para Asignaciones sin Transporte** (`shipping_status` = `null`):  
     - Si `expects_return` = `true`, mostrar gestión de devolución:  
       - Ingresar `return_device_imei` (validar contra `device.imei` o registrar nuevo).  
       - Establecer `return_status` = `received`, `return_received_at` = `now()`.  
   - **Finalización**:  
     - La asignación se considera completa cuando:  
       - `assignment.status` = `active`.  
       - `shipping_status` = `completed` (si aplica).  
       - `return_status` = `received` (si `expects_return` = `true`).  
     - Permitir cerrar la asignación:  
       - Manualmente: Botón para establecer `closed_at` = `now()`, `status` = `closed`, `closure_reason` (opcional).  
       - Automáticamente: Si se confirma la entrega (`delivered_at` no null) y la devolución (si aplica, `return_status` = `received`), establecer `status` = `closed`.  

**Requisitos del Backend**:  
1. **APIs** (Express.js con Prisma):  
   - `GET /devices`: Listar dispositivos con `status` en (`NEW`, `USED`, `REPAIRED`), incluir `model` y `distributor`.  
   - `GET /devices/:id`: Obtener detalles del dispositivo con `model` y `assignments`.  
   - `POST /assignments`: Crear asignación con:  
     - Obligatorios: `device_id`, `assigned_to` (nombre y apellido), `type` (`ASSIGN`), `assignee_name`.  
     - Opcionales: `assignee_phone`, `assignee_email`, `contact_details`, `delivery_location`, `distributor_id`, `expects_return`, `return_device_imei`, `shipping_voucher_id`.  
     - Establecer `shipping_status` = `pending` si hay transporte, de lo contrario `null`.  
     - Actualizar `device.status` = `ASSIGNED`, `device.assigned_to`.  
   - `PATCH /assignments/:id/transport`: Actualizar `shipping_status`, `shipped_at`, `delivered_at`, `shipping_notes`.  
   - `PATCH /assignments/:id/return`: Actualizar `return_device_imei`, `return_status`, `return_received_at`, `return_notes`.  
   - `POST /devices`: Crear nuevo dispositivo para `return_device_imei` no existente, con `status` = `USED`.  
   - `PATCH /assignments/:id/close`: Establecer `status` = `closed`, `closed_at`, `closure_reason`.  
   - `GET /assignments/:id`: Obtener asignación con `device`, `distributor`.  

2. **Validaciones**:  
   - Asegurar que `device.status` sea `NEW`, `USED` o `REPAIRED` antes de asignar.  
   - Verificar que no exista una asignación activa (`assignment.status` = `active`) para el `device_id`.  
   - Si `expects_return` = `true`, validar `return_device_imei` contra `device.imei`; si no existe, permitir crear un nuevo `device`.  
   - Requerir `delivery_location` y `distributor_id` si `shipping_status` = `pending`.  
   - Evitar cerrar la asignación a menos que:  
     - `shipping_status` = `completed` (si aplica).  
     - `return_status` = `received` (si `expects_return` = `true`).  

**Prioridades Clave**:  
- Permitir asignaciones de dispositivos `USED` o `REPAIRED` en `Nueva Asignación` si el usuario no tenía teléfono previo.  
- Manejar `return_device_imei` no existente con un CTA para registrar un nuevo dispositivo.  
- Asegurar que `delivery_location` y `distributor_id` estén definidos para envíos.  
- Mostrar mensajes de error amigables en la UI (ej., "Dispositivo ya asignado", "IMEI inválido").  
- Cierre automático de asignaciones al confirmar entrega y devolución (si aplica).  

**Entregables**:  
- **Frontend**:  
  - Componentes React para lista de dispositivos, modal stepper y gestión post-asignación.  
  - Usar Zustand para gestión de estado.  
  - Integrar APIs con Axios o Fetch.  
  - Mostrar errores amigables (ej., toast notifications).  
- **Backend**:  
  - Servidor Express.js con Prisma ORM.  
  - Endpoints de API con validación de entrada (Zod o Joi).  
  - Manejo de errores para casos como dispositivo ya asignado o IMEI inválido.  

**Ejemplo de Flujo**:  
1. El usuario selecciona un dispositivo `USED` (`imei: 12345`) y hace clic en "Asignar".  
2. Stepper:  
   - Elige `Nueva Asignación`.  
   - Selecciona "Sin transporte".  
   - Ingresa `assignee_name: Juan Pérez`, `assigned_to: Juan Pérez`.  
   - No espera devolución (`expects_return` = `false`).  
3. Se crea la asignación: `device.status` = `ASSIGNED`, `assignment.status` = `active`, `delivered_at` = `now()`, `status` = `closed` (automático).  
4. Para un `Reemplazo` con transporte:  
   - Elige `Reemplazo`, `expects_return` = `true`, ingresa `return_device_imei` (no existe).  
   - Clica "Registrar Dispositivo Devuelto", crea nuevo `device` con `status` = `USED`.  
   - Selecciona transporte, ingresa `delivery_location`, selecciona cualquier `distributor`.  
   - Se crea la asignación: `shipping_status` = `pending`.  
   - Inicia transporte (`shipping_status` = `in_progress`), luego finaliza (`shipping_status` = `completed`).  
   - Confirma devolución (`return_status` = `received`).  
   - La asignación se cierra automáticamente (`status` = `closed`).  

**Notas Adicionales**:  
- Las desasignaciones (`type` = `UNASSIGN`) no se implementan ahora, pero deben quedar documentadas como trabajo futuro.  
- El transporte es un servicio de correo interno, por lo que no se contemplan fallos (ej., paquetes perdidos).  
- No se requiere integración con `ticket` o `soti_device`.  
- El sistema es usado por un solo usuario, sin necesidad de control de concurrencia.  

---

### Cambios Incorporados Basados en tus Respuestas

1. **Dispositivos Usados en Nueva Asignación**:  
   - Aclarado que `Nueva Asignación` puede usar dispositivos `NEW`, `USED` o `REPAIRED` si el usuario no tenía teléfono, con la opción de devolución (`expects_return`).  

2. **Desasignaciones (`UNASSIGN`)**:  
   - Excluido del flujo actual, pero documentado como pendiente para futuro desarrollo.  

3. **Validación de Asignaciones Activas**:  
   - Agregada validación para evitar asignaciones múltiples (`assignment.status` = `active` para el mismo `device_id`).  

4. **Transporte sin Fallos**:  
   - Eliminado el manejo de fallos en transporte, ya que es un servicio interno confiable.  

5. **Devolución de IMEI No Existente**:  
   - Añadido CTA "Registrar Dispositivo Devuelto" para crear un nuevo `device` con `status` = `USED` si `return_device_imei` no existe.  

6. **Sin Integración con Tickets o SOTI**:  
   - Excluido cualquier manejo de `ticket` o `soti_device`.  

7. **Assigned_to Simplificado**:  
   - `assigned_to` es solo el nombre y apellido del usuario, sin mapeo a `user.id`.  

8. **Un Solo Usuario**:  
   - Eliminado el manejo de concurrencia, ya que el sistema es usado por una sola persona.  

9. **Distribuidores Flexibles**:  
   - Permitido seleccionar cualquier `distributor` para envíos, sin restricciones.  

10. **Cierre Automático/Manual**:  
    - Añadido cierre automático al confirmar entrega (`delivered_at`) y devolución (`return_status` = `received`), con opción manual vía botón.  

11. **Errores en UI**:  
    - Especificado que la UI debe mostrar mensajes amigables para errores (ej., toast notifications).  

12. **Sin Localización ni Auditoría**:  
    - Excluido soporte para monedas o registro de auditoría, según tu indicación.  

---

### Casos Límite Restantes (Opcionales para Considerar)

Aunque cubriste la mayoría de los casos, aquí hay algunos puntos opcionales que podrías querer aclarar en el futuro:  
1. **Dispositivos Eliminados**:  
   - ¿Qué pasa si un dispositivo se marca como `is_deleted` = `true` después de asignado? ¿Se cierra la asignación?  
2. **Reapertura de Asignaciones**:  
   - ¿Se puede reabrir una asignación cerrada (`status` = `closed`) si fue un error?  
3. **Historial de Asignaciones**:  
   - ¿La UI debe mostrar asignaciones históricas para un dispositivo (ej., todas las `assignment` con `status` = `closed`)?  
4. **Validación de Modelos**:  
   - Al registrar un dispositivo devuelto, ¿cómo se selecciona `model_id` en el CTA? ¿Un desplegable de `phone_model`?  

---

### Recomendaciones para Próximos Pasos

1. **Probar el Prompt**:  
   - Usa este prompt con Claude para generar código. Verifica que los componentes React, APIs y consultas Prisma cubran el flujo completo.  

2. **Especificar UI**:  
   - Si tienes preferencias sobre el diseño (ej., biblioteca como Material-UI, colores), añádelas al prompt para obtener componentes más precisos.  

3. **Documentar Desasignaciones**:  
   - Aunque no se implementan ahora, crea un documento o sección en el código con notas sobre cómo manejar `UNASSIGN` en el futuro.  

4. **Probar Errores**:  
   - Simula casos como `imei` inválido o dispositivo ya asignado para asegurar que la UI muestra mensajes claros.  

Si necesitas fragmentos de código (ej., componente React para el stepper, consulta Prisma para crear `assignment`), un diagrama del flujo, o más refinamientos, ¡avísame!