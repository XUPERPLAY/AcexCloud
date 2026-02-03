FROM ubuntu:22.04

# Evitar prompts interactivos
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    nodejs \
    npm \
    python3 \
    python3-pip \
    libpython3.10 \
    net-tools \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Descargar e instalar AceStream Engine
RUN wget -O /tmp/acestream.deb "https://download.acestream.media/linux/acestream_3.1.74_x86_64.deb" && \
    dpkg -i /tmp/acestream.deb || apt-get install -f -y && \
    rm /tmp/acestream.deb && \
    apt-get clean

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json primero (para cache de capas Docker)
COPY package*.json ./

# Instalar dependencias Node.js
RUN npm install --production

# Copiar el resto de archivos
COPY . .

# Crear directorio public si no existe
RUN mkdir -p /app/public

# Hacer ejecutable el script de inicio
RUN chmod +x start.sh

# Exponer puertos
EXPOSE 3000 6878

# Comando de inicio
CMD ["./start.sh"]
