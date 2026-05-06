# Pruebas con Postman

Archivos:

- [EcommerceBiess.postman_collection.json](/D:/codex/EcommerceBiess/postman/EcommerceBiess.postman_collection.json)
- [EcommerceBiess.local.postman_environment.json](/D:/codex/EcommerceBiess/postman/EcommerceBiess.local.postman_environment.json)

## Importar

1. Abre Postman.
2. Importa la coleccion.
3. Importa el environment local.
4. Selecciona el environment `EcommerceBiess Local`.

## Variables que debes revisar

- `backend_base_url`
- `payphone_base_url`
- `payphone_token`
- `payphone_store_id`
- `customer_phone`

No subas el token real a Git. El environment deja un placeholder y debes reemplazarlo en Postman.

## Orden recomendado

### Backend

1. `Health`
2. `Login Cliente`
3. `List Products`
4. `Create PayPhone Order`
5. `Refresh PayPhone Order Status`
6. `Get Order By Id`

### PayPhone directo

1. `Users Check`
2. `Create Sale Direct`
3. `Get Sale By Client Transaction Id`

## Qué guarda automaticamente

La coleccion llena estas variables al ejecutar:

- `customer_access_token`
- `admin_access_token`
- `product_id_1`
- `product_id_2`
- `order_id`
- `payphone_client_transaction_id`
- `payphone_transaction_id`

## Montos de ejemplo

La prueba directa contra PayPhone usa estos centavos:

- `sale_amount = 3296`
- `sale_amount_with_tax = 2866`
- `sale_tax = 430`
- `sale_amount_without_tax = 0`

Si cambias el monto, debes mantener esta regla:

`amount = amountWithoutTax + amountWithTax + tax + service + tip`

## Qué aisla cada bloque

- Backend: prueba tu API local completa.
- PayPhone directo: elimina el backend de la ecuacion y prueba solo credenciales, `storeId`, telefono y API externa.

## Logs utiles

Si la prueba del backend falla, revisa:

- [payphone-errors.log](/D:/codex/EcommerceBiess/backend/logs/payphone-errors.log)

Si una llamada backend devuelve `Ref: PP-...`, busca esa referencia en ese archivo.
