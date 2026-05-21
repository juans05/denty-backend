# Usar una imagen oficial de Node.js como base
FROM node:18-alpine

# Instalar dependencias necesarias para Prisma y herramientas de red
RUN apk add --no-cache openssl bash

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de definición de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias del proyecto
RUN npm install

# Copiar el resto del código del servidor
COPY . .

# Generar el cliente de Prisma (fundamental para que funcione en Docker)
RUN npx prisma generate

# Exponer el puerto que usa la aplicación (3000 según .env)
EXPOSE 3000

# Comando para arrancar la aplicación
# Esto ejecutará el script 'start' de package.json que contiene la autoreparación
CMD ["npm", "start"]
