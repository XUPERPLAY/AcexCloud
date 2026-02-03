FROM python:3.9-slim-bullseye

# Instalar dependencias básicas
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    ca-certificates \
    libssl-dev \
    libffi-dev \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Descargar e instalar AceStream Engine desde fuente alternativa (GitHub)
RUN cd /tmp && \
    wget --timeout=60 --tries=3 \
    "https://github.com/martinbjeldbak/acestream-http-proxy/raw/main/acestream-engine-linux-x86_64.tar.gz" \
    -O acestream.tar.gz 2>/dev/null || \
    wget --timeout=60 --tries=3 \
    "https://archive.org/download/acestream-engine-linux-x86_64/acestream-engine-linux-x86_64.tar.gz" \
    -O acestream.tar.gz 2>/dev/null || \
    curl -L -o acestream.tar.gz \
    "https://github.com/martinbjeldbak/acestream-http-proxy/releases/download/v1.0.0/acestream-engine-linux-x86_64.tar.gz" && \
    tar -xzf acestream.tar.gz && \
    mv acestream_* /opt/acestream && \
    chmod +x /opt/acestream/acestreamengine && \
    ln -sf /opt/acestream/acestreamengine /usr/local/bin/acestreamengine && \
    rm -f acestream.tar.gz

# Si falla la descarga, crear script falso para no romper el build
RUN if [ ! -f /usr/local/bin/acestreamengine ]; then \
        echo '#!/bin/bash\necho "AceStream no disponible"\nexit 1' > /usr/local/bin/acestreamengine && \
        chmod +x /usr/local/bin/acestreamengine; \
    fi

WORKDIR /app

# Copiar e instalar dependencias Node
COPY package*.json ./
RUN npm install --production

# Copiar el resto de archivos
COPY . .

# Crear directorio public
RUN mkdir -p /app/public

# Hacer ejecutable el script
RUN chmod +x start.sh

# Puerto
EXPOSE 3000

# Comando
CMD ["./start.sh"]
