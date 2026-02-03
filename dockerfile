FROM python:3.9-slim-bullseye

# Instalar Node.js
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    xz-utils \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Descargar e instalar AceStream
RUN cd /tmp && \
    wget --timeout=120 "http://dl.acestream.org/linux/acestream_3.1.74_x86_64.tar.gz" && \
    tar xzf acestream_3.1.74_x86_64.tar.gz && \
    mv acestream_* /opt/acestream && \
    ln -s /opt/acestream/acestreamengine /usr/local/bin/acestreamengine && \
    rm -f acestream_3.1.74_x86_64.tar.gz

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x start.sh

EXPOSE 8080 6878

CMD ["./start.sh"]
