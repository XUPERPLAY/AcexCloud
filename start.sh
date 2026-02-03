#!/bin/bash

echo "🚀 Iniciando AceStream Cloud Proxy..."

# Verificar que AceStream está instalado
if [ ! -f /usr/bin/acestreamengine ]; then
    echo "❌ Error: AceStream engine no encontrado"
    exit 1
fi

echo "✅ AceStream engine encontrado"

# Iniciar AceStream Engine en segundo plano
echo "📺 Iniciando AceStream Engine..."
/usr/bin/acestreamengine \
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
for i in {1..30}; do
    if curl -s http://127.0.0.1:6878/webui/api/service?method=get_version > /dev/null 2>&1; then
        echo "✅ AceStream Engine listo!"
        break
    fi
    echo "   Intentando... ($i/30)"
    sleep 2
done

# Verificar si AceStream está corriendo
if ! kill -0 $ACE_PID 2>/dev/null; then
    echo "❌ Error: AceStream Engine no pudo iniciar"
    exit 1
fi

echo "🌐 AceStream Engine corriendo en PID: $ACE_PID"

# Iniciar el servidor Node.js
echo "🚀 Iniciando servidor proxy..."
exec node server.js
