FROM ubuntu:22.04

# Evitar prompts interactivos
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Madrid

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
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Instalar AceStream Engine usando el método alternativo (repositorio)
RUN apt-get update && \
    apt-get install -y wget gnupg && \
    echo "deb http://repo.acestream.org/ubuntu/ focal main" | tee /etc/apt/sources.list.d/acestream.list && \
    wget -O - http://repo.acestream.org/keys/acestream.asc | apt-key add - && \
    apt-get update && \
    apt-get install -y acestream-engine || echo "Repositorio falló, intentando método directo..."

# Si el repositorio falla, descargar directamente
RUN if [ ! -f /usr/bin/acestreamengine ]; then \
        cd /tmp && \
        wget --timeout=30 --tries=3 "http://acestream.org/downloads/linux/acestream_3.1.74_x86_64.tar.gz" -O acestream.tar.gz && \
        tar -xzf acestream.tar.gz && \
        mv acestream_* /opt/acestream && \
        ln -s /opt/acestream/acestreamengine /usr/bin/acestreamengine && \
        rm -f acestream.tar.gz; \
    fi

# Verificar instalación
RUN ls -la /usr/bin/acestreamengine || ls -la /opt/acestream/ || echo "Buscando acestream..." && find / -name "*acestream*" -type f 2>/dev/null | head -20

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json primero
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
