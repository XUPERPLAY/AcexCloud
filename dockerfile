FROM debian:bullseye-slim

# Instalar dependencias básicas
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    ca-certificates \
    xz-utils \
    libssl1.1 \
    libffi7 \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Descargar AceStream desde fuente alternativa (mirror ruso confiable)
RUN cd /tmp && \
    wget --timeout=120 --tries=3 \
    "http://dl.acestream.org/linux/acestream_3.1.74_x86_64.tar.gz" && \
    tar -xzf acestream_3.1.74_x86_64.tar.gz && \
    mv acestream_* /opt/acestream && \
    chmod +x /opt/acestream/acestreamengine && \
    ln -sf /opt/acestream/acestreamengine /usr/local/bin/acestreamengine && \
    rm -f acestream_3.1.74_x86_64.tar.gz && \
    ls -la /opt/acestream/

# Si falla el anterior, intentar con otro mirror
RUN if [ ! -f /usr/local/bin/acestreamengine ]; then \
        cd /tmp && \
        wget --timeout=120 --tries=3 \
        "https://archive.org/download/acestream-3.1.74-linux/acestream-3.1.74-linux.tar.gz" && \
        tar -xzf acestream-3.1.74-linux.tar.gz && \
        mv acestream_* /opt/acestream && \
        chmod +x /opt/acestream/acestreamengine && \
        ln -sf /opt/acestream/acestreamengine /usr/local/bin/acestreamengine && \
        rm -f acestream-3.1.74-linux.tar.gz; \
    fi

# Verificar instalación
RUN ls -la /usr/local/bin/acestreamengine || (echo "❌ AceStream no instalado" && exit 1)

# Instalar Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x start.sh

EXPOSE 8080 6878

CMD ["./start.sh"]
