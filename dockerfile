FROM debian:bullseye-slim

# Instalar dependencias
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    ca-certificates \
    libpython3.9 \
    python3 \
    net-tools \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Descargar AceStream desde mirror alternativo (más fiable)
RUN cd /tmp && \
    wget --timeout=60 -O acestream.tar.gz \
    "https://github.com/martinbjeldbak/acestream-http-proxy/releases/download/v1.0.0/acestream-engine-linux-x86_64.tar.gz" || \
    wget --timeout=60 -O acestream.tar.gz \
    "https://archive.org/download/acestream-engine-linux-x86_64/acestream-engine-linux-x86_64.tar.gz" && \
    tar -xzf acestream.tar.gz && \
    mv acestream_* /opt/acestream && \
    chmod +x /opt/acestream/acestreamengine && \
    ln -sf /opt/acestream/acestreamengine /usr/local/bin/acestreamengine && \
    rm -f acestream.tar.gz

# Instalar Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x start.sh

# Puerto para la web y AceStream
EXPOSE 8080 6878

CMD ["./start.sh"]
