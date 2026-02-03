#!/bin/bash

echo "🚀 Iniciando servidor..."

# Buscar AceStream
ACESTREAM_BIN=$(which acestreamengine || find /opt -name "acestreamengine" -type f 2>/dev/null | head -1)

if [ -n "$ACESTREAM_BIN" ] && [ -x "$ACESTREAM_BIN" ]; then
    echo "✅ AceStream encontrado: $ACESTREAM_BIN"
    
    # Intentar iniciar AceStream
    $ACESTREAM_BIN \
        --client-console \
        --live-cache-type memory \
        --live-mem-cache-size 500000000 \
        --port 6878 \
        --bind-all &

    ACE_PID=$!
    sleep 5
    
    # Verificar si está corriendo
    if kill -0 $ACE_PID 2>/dev/null; then
        echo "✅ AceStream Engine iniciado (PID: $ACE_PID)"
        export ACESTREAM_AVAILABLE=true
    else
        echo "⚠️ AceStream no pudo iniciar, continuando sin soporte P2P"
        export ACESTREAM_AVAILABLE=false
    fi
else
    echo "⚠️ AceStream no encontrado, modo proxy HTTP solo"
    export ACESTREAM_AVAILABLE=false
fi

# Iniciar servidor Node
echo "🌐 Iniciando servidor web en puerto ${PORT:-3000}"
exec node server.js
