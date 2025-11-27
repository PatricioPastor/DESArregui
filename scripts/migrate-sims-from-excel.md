# Guía de Migración de SIMs desde Excel

Este documento explica cómo migrar las 68k líneas de SIMs desde un archivo Excel a la base de datos.

## Paso 1: Crear la tabla en la base de datos

La tabla ya está creada usando `prisma db push`. Si necesitas recrearla:

```bash
bunx prisma db push
```

## Paso 2: Exportar desde Google Drive

1. Abre el archivo Excel en Google Drive
2. Exporta como Excel (.xlsx)
3. Guarda el archivo localmente (ej: `prisma/export_sims.xlsx`)

## Paso 3: Preparar los datos

El archivo debe tener las siguientes columnas (nombres exactos):
- **ICC**: Identificador único de la SIM (requerido)
- **IP**: Dirección IP (opcional)
- **Estado**: Estado de la SIM (Inventario, Activado, etc.)
- **Empresa**: Formato "PROVIDER (DISTRIBUTOR)" - Ejemplos:
  - `CLARO (EDEN)`
  - `CLARO (EDELAP)`
  - `MOVISTAR (EDEN)`
  - `MOVISTAR (EDELAP)`

**Importante**: El formato de Empresa debe ser exactamente "PROVIDER (DISTRIBUTOR)" donde:
- PROVIDER puede ser: CLARO o MOVISTAR
- DISTRIBUTOR es el nombre de la distribuidora (se buscará o creará automáticamente en la tabla distributor)

## Paso 4: Migrar usando el script automatizado (Recomendado)

El método más fácil es usar el script de migración incluido:

```bash
bun run scripts/migrate-sims.ts prisma/export_sims.xlsx
```

Este script:
- Lee el Excel automáticamente
- Valida y filtra los datos
- Envía todo al endpoint de sincronización
- Muestra estadísticas y resultados

Ver `scripts/README-migrate-sims.md` para más detalles.

## Paso 5: Migración manual (Alternativa)

Si prefieres hacerlo manualmente, puedes convertir a JSON y usar curl:

### Opción A: Usando Node.js con xlsx

```bash
npm install xlsx
```

```javascript
const XLSX = require('xlsx');
const fs = require('fs');

// Leer el archivo Excel
const workbook = XLSX.readFile('sims.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convertir a JSON
const data = XLSX.utils.sheet_to_json(worksheet);

// Mapear columnas (los nombres deben coincidir exactamente con las columnas del Excel)
const sims = data.map(row => ({
  ICC: String(row.ICC || row['ICC'] || '').trim(),
  IP: row.IP || row['IP'] || null,
  Estado: String(row.Estado || row['Estado'] || 'Inventario').trim(),
  Empresa: String(row.Empresa || row['Empresa'] || '').trim(),
})).filter(sim => sim.ICC && sim.Empresa); // Filtrar filas sin ICC o Empresa

// Guardar como JSON
fs.writeFileSync('sims.json', JSON.stringify({ sims }, null, 2));
console.log(`Convertidas ${sims.length} SIMs a JSON`);
```

### Opción B: Usando Python con pandas

```python
import pandas as pd
import json

# Leer el archivo Excel
df = pd.read_excel('sims.xlsx')

# Mapear columnas (los nombres deben coincidir exactamente con las columnas del Excel)
sims = df.apply(lambda row: {
    'ICC': str(row.get('ICC', '')).strip(),
    'IP': str(row.get('IP', '')).strip() if pd.notna(row.get('IP', None)) else None,
    'Estado': str(row.get('Estado', 'Inventario')).strip(),
    'Empresa': str(row.get('Empresa', '')).strip(),
}, axis=1).tolist()

# Filtrar SIMs sin ICC o Empresa
sims = [s for s in sims if s['ICC'] and s['ICC'] != '' and s['Empresa'] and s['Empresa'] != '']

# Guardar como JSON
with open('sims.json', 'w', encoding='utf-8') as f:
    json.dump({'sims': sims}, f, indent=2, ensure_ascii=False)

print(f'Convertidas {len(sims)} SIMs a JSON')
```

## Paso 6: Sincronizar con la API (si usas método manual)

Una vez que tengas el archivo `sims.json`, puedes sincronizar usando curl o un script:

### Usando curl:

```bash
curl -X POST http://localhost:3000/api/sync/sims \
  -H "Content-Type: application/json" \
  -d @sims.json
```

### Usando Node.js:

```javascript
const fs = require('fs');
const fetch = require('node-fetch');

const simsData = JSON.parse(fs.readFileSync('sims.json', 'utf-8'));

async function syncSims() {
  try {
    const response = await fetch('http://localhost:3000/api/sync/sims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simsData),
    });

    const result = await response.json();
    console.log('Resultado de sincronización:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

syncSims();
```

## Paso 7: Verificar la sincronización

Puedes verificar que las SIMs se sincronizaron correctamente consultando la API:

```bash
curl http://localhost:3000/api/sims?limit=10
```

## Notas importantes

- **Método recomendado**: Usa el script `scripts/migrate-sims.ts` para migración automatizada
- El endpoint procesa las SIMs en lotes de 5000 para optimizar el rendimiento
- Las SIMs que no están en el archivo de sincronización se marcarán como `is_active = false`
- El proceso puede tardar varios minutos para 68k registros
- Se recomienda hacer la primera migración en horario de bajo tráfico
- Los distributors se crean automáticamente si no existen en la base de datos

## Actualizaciones recurrentes

Para actualizaciones periódicas, puedes:

1. Exportar el Excel actualizado desde Google Drive
2. Convertir a JSON usando los scripts anteriores
3. Llamar al endpoint `/api/sync/sims` con los nuevos datos

El endpoint automáticamente:
- Creará nuevas SIMs que no existan
- Actualizará las SIMs existentes
- Desactivará las SIMs que ya no estén en el archivo

