# Script para resolver el bloqueo de Prisma
cd d:\Proyecto_suizasoft_git\Clinica_dental\backend

Write-Host "Resolviendo migración fallida '20260227000000_add_invoice_customer_fields'..." -ForegroundColor Cyan
npx prisma migrate resolve --rolled-back "20260227000000_add_invoice_customer_fields"

Write-Host "Intentando aplicar migraciones pendientes..." -ForegroundColor Cyan
npx prisma migrate deploy

Write-Host "Paso final: Generando el cliente Prisma..." -ForegroundColor Cyan
npx prisma generate

Write-Host "Proceso completado. Ahora puedes intentar 'npm start' de nuevo." -ForegroundColor Green
