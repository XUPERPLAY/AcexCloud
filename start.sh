#!/bin/bash

echo "🚀 Iniciando AceStream Cloud..."

# Verificar AceStream
if [ ! -f /usr/local/bin/acestreamengine ]; then
    echo "❌ AceStream no encontrado"
    exit 1
fi

echo "✅ AceStream encontrado"

# Iniciar AceStream Engine
echo "📺 Iniciando motor AceStream..."
/usr/local/bin/acestreamengine \
    --client-console \
    --live-cache-type memory \
    --live-mem-cache-size 500000000 \
    --port 6878 \
    --bind-all \
    --log-stdout &

ACE_PID=$!

# Esperar que inicie
sleep 10

# Verificar si está corriendo
if ! kill -0 $ACE_PID 2>/dev/null; then
    echo "❌ AceStream no pudo iniciar"
    exit 1
fi

echo "✅ AceStream corriendo (PID: $ACE_PID)"

# Iniciar servidor Node
echo "🌐 Iniciando servidor web..."
exec node server.js
