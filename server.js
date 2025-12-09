// Archivo: server.js
// FUNCIÓN: Actúa como el Servidor HTTP (Express) y el Coordinador principal de la aplicación.
// Responsable de manejar rutas web, iniciar el Bot de Telegram y orquestar el proceso de Reportes PDF.

// =================================================================
// 📚 MÓDULOS DEL SERVIDOR (Las "herramientas" que instalamos)
// =================================================================

// 1. Framework Express
const express = require('express'); 
// Importa Express, el framework que facilita la creación de servidores y el manejo de rutas.

// 2. Módulo de Rutas
const path = require('path'); 
// Módulo nativo para manejar rutas de archivos de forma compatible entre sistemas operativos.

// 3. Módulo de Variables de Entorno
require('dotenv').config(); 
// Carga las variables de configuración (tokens, puertos) desde el archivo .env.

// 4. Importación de Lógica Externa (Nuestros propios módulos)
const initTelegramBot = require('./bot.js'); 
// Importa la función que inicializa y conecta el Bot de Telegram.

const { generarYEnviarReportes } = require('./index.js'); 
// Importa la función principal del motor de reportes PDF.

// =================================================================
// ⚙️ CONFIGURACIÓN Y ESTADO GLOBAL (Variables de control)
// =================================================================

const PORT = process.env.SERVER_PORT || 3000; 
// Define el puerto donde el servidor escuchará (valor de .env o 3000 por defecto).

const SERVER_URL = `http://localhost:${PORT}`; 
// URL base para generar enlaces internos.

const app = express(); 
// Instancia la aplicación Express. 'app' es nuestro objeto central del servidor.

app.use(express.json()); 
// Middleware para configurar a Express para que pueda leer datos en formato JSON.

// 💡 Variable de estado (Flag) para el Bot
let botInicializado = false; 
// Bandera booleana para asegurar que el Bot solo se inicie una vez.


// -------------------------------------------------------------
// 🛠️ FUNCIÓN CENTRAL: ORQUESTADOR DEL PDF
// -------------------------------------------------------------
async function ejecutarScriptPDF(res, source) {
    if (!botInicializado) {
         // Si el Bot no está en línea, devuelve un error HTTP 403 (Prohibido).
         return res.status(403).send(`<html><body><h1>❌ Bot No Iniciado.</h1><p>Debe iniciar el bot primero visitando <a href="${SERVER_URL}/iniciar/bot">/iniciar/bot</a></p></body></html>`);
    }
    
    try {
        // Log en la consola: Registra el inicio del proceso de ejecución
        console.log(`[SERVER LOG] 📧 Petición recibida desde: ${source}. Iniciando lógica de PDF...`);
        
        // 🚨 EJECUCIÓN DEL NÚCLEO: Llama al motor de reportes y espera ('await').
        await generarYEnviarReportes(); 

        // Log de éxito
        console.log(`[SERVER LOG] ✅ Lógica de PDF completada con éxito para ${source}.`);
        
        // Respuesta HTTP de Éxito
        return res.send(`
            <html>
                <body>
                    <h1 style="color: green;">✅ Proceso de Envío de PDF Terminado.</h1>
                    <p>Los reportes han sido enviados. Verifique sus correos.</p>
                    <p><a href="${SERVER_URL}/">Volver al Directorio</a></p>
                </body>
            </html>
        `);

    } catch (error) {
        // Captura el error si index.js lanza una excepción.
        console.error(`[SERVER ERROR] ❌ Fallo en la ejecución del PDF desde ${source}:`, error.message);
        
        // Respuesta HTTP de Error 500
        return res.status(500).send(`
            <html><body><h1>❌ ERROR CRÍTICO.</h1><p>Fallo al ejecutar el script de PDF.</p><p>Detalle: ${error.message}</p><p><a href="${SERVER_URL}/">Volver al Directorio</a></p></body></html>
        `);
    }
}


// -------------------------------------------------------------
// 🛣️ DEFINICIÓN DE RUTAS (ENDPOINTS)
// -------------------------------------------------------------

// ⚙️ RUTA 1: /iniciar/bot (GET)
app.get('/iniciar/bot', (req, res) => {
    // 💡 LOG DE ACCESO A RUTA: Registra la IP del cliente.
    console.log(`[SERVER ACCESS] Acceso a ruta: /iniciar/bot desde ${req.ip}`); 
    
    if (botInicializado) {
        const mensaje = '⚠️ El Bot de Telegram ya estaba activo.';
        console.log(`[SERVER LOG] ${mensaje}`);
        return res.send(`<html><body><h1>${mensaje}</h1><p>El bot ya está haciendo polling.</p><p><a href="${SERVER_URL}/">Volver al Directorio</a></p></body></html>`);
    }

    try {
        // 🚨 ACCIÓN CLAVE: INICIA EL BOT
        initTelegramBot(generarYEnviarReportes); 
        botInicializado = true; // Establece el flag a true.
        
        console.log(`[SERVER LOG] ✅ BOT INICIADO exitosamente vía ruta web.`);
        
        // 🚨 CAMBIO CLAVE: Respuesta Mínima para evitar problemas de renderizado en blanco.
        return res.send(`
            <html>
                <body>
                    <h1 style="color: green;">🤖 Bot Iniciado.</h1>
                    <p>El Bot está listo. Regresa al directorio.</p>
                    <p><a href="${SERVER_URL}/">Volver al Directorio Principal</a></p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error(`[SERVER ERROR] ❌ Error al iniciar el Bot:`, error.message);
        return res.status(500).send(`
            <html><body><h1>❌ Error al iniciar el Bot.</h1><p>Revise el token.</p><p><a href="${SERVER_URL}/">Volver al Directorio</a></p></body></html>
        `);
    }
});


// ⚙️ RUTA 2: /enviar/pdf (GET)
app.get('/enviar/pdf', (req, res) => {
    // 💡 LOG DE ACCESO A RUTA
    console.log(`[SERVER ACCESS] Acceso a ruta: /enviar/pdf desde ${req.ip}.`); 
    
    // Delega la ejecución a la función central.
    ejecutarScriptPDF(res, 'WEB_DIRECTA');
});


// ⚙️ RUTA 3: / (Directorio Principal - GET)
app.get('/', (req, res) => {
    // 💡 LOG SOLICITADO POR EL USUARIO: Registra el acceso a la raíz.
    console.log(`[SERVER ACCESS] Acceso a ruta: / (Directorio) desde ${req.ip}`);
    
    const botStatus = botInicializado ? '✅ ACTIVO' : '❌ INACTIVO';
    const botLink = botInicializado ? 'El Bot está listo para el comando /enviar_pdf.' : `<a href="${SERVER_URL}/iniciar/bot">➡️ INICIAR BOT AHORA</a>`;
    
    // Envía el código HTML de la página de directorio al navegador.
    res.send(`
        <html>
            <body style="font-family: sans-serif; padding: 30px; line-height: 1.6;">
                <h1 style="color: #007bff;">🚀 Directorio de Activación del Sistema</h1>
                
                <h2>1. Estado e Inicio del Bot</h2>
                <p><b>Estado Actual:</b> ${botStatus}</p>
                <p>${botLink}</p>
                
                <hr>

                <h2>2. Generar Reporte PDF (Activación Web Manual)</h2>
                <p>Usa esta opción para forzar la generación y el envío de los reportes.</p>
                <p style="font-size: 1.1em;">
                    <a href="${SERVER_URL}/enviar/pdf" style="color: ${botInicializado ? 'green' : 'gray'}; font-weight: bold;">
                        ➡️ ${SERVER_URL}/enviar/pdf
                    </a>
                </p>
                <small>Nota: La activación del PDF requiere que el Bot esté iniciado.</small>
            </body>
        </html>
    `);
});


// -------------------------------------------------------------
// 🚀 INICIO DEL SERVIDOR
// -------------------------------------------------------------
app.listen(PORT, () => {
    // La función 'callback' que se ejecuta al iniciar.
    console.log(`[SERVER] 🌐 Servidor Express escuchando en ${SERVER_URL}`);
    console.log(`💡 Visita ${SERVER_URL}/ para empezar.`);
});