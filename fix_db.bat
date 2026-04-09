@echo off
echo Resolviendo bloqueo de Prisma...
cd /d %~dp0
call npx prisma migrate resolve --rolled-back "20260227000000_add_invoice_customer_fields"
echo Intentando desplegar migraciones...
call npx prisma migrate deploy
echo Generando cliente...
call npx prisma generate
echo Proceso finalizado. Intenta npm start ahora.
pause
