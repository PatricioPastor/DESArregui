# Script de Migración de SIMs

Este script migra SIMs desde un archivo Excel a la base de datos mediante el endpoint de sincronización.

## Requisitos Previos

1. La tabla `sim` debe estar creada en la base de datos (ya se hizo con `bunx prisma db push`)
2. El servidor de desarrollo debe estar corriendo en `http://localhost:3000` (o especificar otra URL)
3. El archivo Excel debe tener las siguientes columnas:
   - **ICC**: Identificador único de la SIM (requerido)
   - **IP**: Dirección IP (opcional)
   - **Estado**: Estado de la SIM (Inventario, Activado, etc.)
   - **Empresa**: Formato "PROVIDER (DISTRIBUTOR)" - Ejemplos:
     - `CLARO (EDEN)`
     - `CLARO (EDELAP)`
     - `MOVISTAR (EDEN)`
     - `MOVISTAR (EDELAP)`

## Uso

### Migración básica (servidor local)

```bash
bun run scripts/migrate-sims.ts prisma/export_sims.xlsx
```

### Migración con servidor personalizado

```bash
bun run scripts/migrate-sims.ts prisma/export_sims.xlsx http://localhost:3000
```

### Migración a producción

```bash
bun run scripts/migrate-sims.ts prisma/export_sims.xlsx https://tu-dominio.com
```

## Qué hace el script

1. **Lee el archivo Excel**: Busca la hoja "sims" o usa la primera hoja disponible
2. **Valida los datos**: Filtra filas sin ICC o Empresa
3. **Muestra estadísticas**: Total de SIMs, empresas únicas, estados únicos
4. **Envía a la API**: Llama al endpoint `/api/sync/sims` con todos los datos
5. **Muestra resultados**: Creadas, actualizadas, desactivadas, errores, etc.

## Ejemplo de salida

```
📖 Leyendo archivo Excel: prisma/export_sims.xlsx
📄 Usando hoja: "sims"
📊 Total de filas encontradas: 5071
✅ SIMs válidas después de filtrar: 5071

📈 Estadísticas:
   - Total SIMs: 5071
   - Empresas únicas: 4
   - Estados únicos: 2
   - Empresas encontradas: CLARO (EDEN), CLARO (EDELAP), MOVISTAR (EDEN), MOVISTAR (EDELAP)

🚀 Enviando 5071 SIMs a http://localhost:3000/api/sync/sims...

✅ Migración completada!
   - Procesadas: 5071
   - Creadas: 5071
   - Actualizadas: 0
   - Desactivadas: 0
   - Distributors creados: 2
   - Errores: 0

🎉 ¡Migración exitosa!
```

## Notas importantes

- El script procesa **todas las SIMs en una sola llamada** al endpoint
- Las SIMs que no están en el archivo se marcarán como `is_active = false`
- Los distributors se crean automáticamente si no existen
- El formato de Empresa debe ser exacto: "PROVIDER (DISTRIBUTOR)"
- Para 68k registros, el proceso puede tardar varios minutos

## Solución de problemas

### Error: "El archivo no existe"
- Verifica que la ruta al archivo Excel sea correcta
- Usa rutas relativas desde la raíz del proyecto

### Error: "No se encontraron SIMs válidas"
- Verifica que las columnas del Excel tengan los nombres correctos (ICC, IP, Estado, Empresa)
- Asegúrate de que haya datos en las filas

### Error de conexión al servidor
- Verifica que el servidor esté corriendo
- Si usas una URL diferente, especifícala como segundo parámetro

### Errores de validación
- Revisa el formato de la columna "Empresa": debe ser "PROVIDER (DISTRIBUTOR)"
- Verifica que todas las filas tengan ICC y Empresa




