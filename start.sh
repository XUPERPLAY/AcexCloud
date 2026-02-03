#!/bin/bash

echo "🚀 Iniciando AceStream Cloud Proxy..."

# Buscar el binario de AceStream en varias ubicaciones posibles
ACESTREAM_BIN=""

if [ -f /usr/bin/acestreamengine ]; then
    ACESTREAM_BIN="/usr/bin/acestreamengine"
elif [ -f /opt/acestream/acestreamengine ]; then
    ACESTREAM_BIN="/opt/acestream/acestreamengine"
    # Añadir al PATH si es necesario
    export PATH=$PATH:/opt/acestream
elif [ -f /usr/local/bin/acestreamengine ]; then
    ACESTREAM_BIN="/usr/local/bin/acestreamengine"
else
    echo "❌ Buscando acestreamengine en el sistema..."
    find /usr -name "acestreamengine" -type f 2>/dev/null
    find /opt -name "acestreamengine" -type f 2>/dev/null
    echo "❌ Error: AceStream engine no encontrado"
    exit 1
fi

echo "✅ AceStream engine encontrado en: $ACESTREAM_BIN"

# Verificar que el binario funciona
if ! $ACESTREAM_BIN --version 2>/dev/null && ! $ACESTREAM_BIN --help 2>/dev/null | head -5; then
    echo "⚠️ No se pudo verificar el binario, pero continuando..."
fi

# Iniciar AceStream Engine
echo "📺 Iniciando AceStream Engine..."
$ACESTREAM_BIN \
    --client-console \
    --live-cache-type memory \
    --live-mem-cache-size 1000000000 \
    --port 6878 \
    --bind-all \
    --log-stdout \
    --log-severity info &

ACE_PID=$!

# Esperar a que AceStream esté listo
echo "⏳ Esperando que AceStream Engine inicie..."
MAX_WAIT=60
for i in $(seq 1 $MAX_WAIT); do
    if curl -s http://127.0.0.1:6878/webui/api/service?method=get_version > /dev/null 2>&1; then
        echo "✅ AceStream Engine listo en $i segundos!"
        break
    fi
    
    if ! kill -0 $ACE_PID 2>/dev/null; then
        echo "❌ AceStream Engine murió durante el inicio"
        exit 1
    fi
    
    echo "   Esperando... ($i/$MAX_WAIT)"
    sleep 2
done

# Verificar si está corriendo
if ! kill -0 $ACE_PID 2>/dev/null; then
    echo "❌ Error: AceStream Engine no está corriendo"
    exit 1
fi

echo "🌐 AceStream Engine corriendo en PID: $ACE_PID"

# Iniciar el servidor Node.js
echo "🚀 Iniciando servidor proxy..."
exec node server.js
