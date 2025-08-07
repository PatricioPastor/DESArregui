# Discovery Questions

## Q1: Will the CSV data be loaded dynamically from the Google Sheets API or stored as a static file?
**Default if unknown:** Yes (data should be loaded dynamically from Google Sheets API for real-time updates)

## Q2: Should the table display all CSV columns or only a specific subset?
**Default if unknown:** Yes (display key columns like IMEI, nombre_soti, distribuidora, ultima_conexion, and status)

## Q3: Do users need to be able to filter and search through the table data?
**Default if unknown:** Yes (filtering by distribuidora and searching by IMEI/nombre is essential for operational use)

## Q4: Should the table support real-time updates when the Google Sheet is modified?
**Default if unknown:** Yes (Mesa de Ayuda operations require current data for device management)

## Q5: Do users need to perform actions on table rows (edit, delete, assign tickets)?
**Default if unknown:** Yes (users need to update device status, assign tickets, and manage IMEI records)