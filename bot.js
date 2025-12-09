// Archivo: bot.js
// FUNCIÓN: Módulo de Interacción con Telegram. Actúa como la capa de frontend del bot,
// encargándose de la comunicación con la API de Telegram, el procesamiento de comandos 
// de usuario, la consulta de la Base de Datos (BD) y la activación del Motor de Reportes.

// =================================================================
// 📚 MÓDULOS Y DEPENDENCIAS (Las librerías necesarias)
// =================================================================

const TelegramBot = require('node-telegram-bot-api');
// Importa la librería oficial para interactuar con la API de Telegram. Es la base
// para crear la instancia del bot y manejar la recepción/envío de mensajes.

const { Client } = require('pg'); 
// Importa la clase 'Client' del driver de PostgreSQL. Se usa para establecer 
// y gestionar las conexiones con la BD para obtener datos de videojuegos.

require('dotenv').config(); 
// Carga las variables de entorno (como el token del bot y credenciales de BD) 
// desde el archivo .env en el objeto global process.env.


// =================================================================
// ⚙️ CONFIGURACIÓN DE BASE DE DATOS Y LÓGICA DE CONSULTA
// =================================================================

// Objeto de configuración de la BD (PostgreSQL)
const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT), // Se convierte el puerto a número entero
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD 
};

/**
 * Función Asíncrona para obtener datos de Videojuegos desde PostgreSQL.
 * @param {string | null} busqueda - Término de búsqueda (ID numérico o parte del nombre).
 * @returns {Array<Object> | null} Lista de videojuegos encontrados o null si hay un error.
 */
async function obtenerVideojuegos(busqueda = null) {
    const client = new Client(dbConfig); // Crea una nueva instancia de conexión a la BD.
    let query = 'SELECT id, nombre, genero, anio, precio FROM videojuegos ';
    let params = []; // Array de parámetros seguros (evita la Inyección SQL).
    
    try {
        await client.connect(); // Intenta establecer la conexión con la BD.

        if (busqueda) {
            // Lógica de Búsqueda Flexible: determina si la búsqueda es por ID o por Nombre.
            
            // Comprueba si el término de búsqueda es un número válido.
            if (!isNaN(busqueda) && isFinite(busqueda)) {
                // Caso 1: Búsqueda por ID (ej: /buscar 4)
                query += 'WHERE id = $1'; // $1 es un placeholder para el primer parámetro.
                params = [parseInt(busqueda)]; 
            } else {
                // Caso 2: Búsqueda por Nombre (ej: /buscar zelda)
                query += 'WHERE nombre ILIKE $1'; // ILIKE: Búsqueda insensible a mayúsculas y minúsculas, y parcial.
                params = [`%${busqueda}%`]; // Los '%' permiten buscar la cadena en cualquier parte del nombre.
            }
        }
        
        query += ' ORDER BY id LIMIT 20'; // Ordena y limita los resultados para el chat.

        const result = await client.query(query, params); // Ejecuta la consulta SQL.
        return result.rows; // Devuelve el array de filas (videojuegos).
    } catch (error) {
        // Captura cualquier error de conexión o consulta de la BD.
        console.error("❌ Error al acceder a la base de datos en el Bot:", error);
        return null; 
    } finally {
        // Bloque 'finally' garantiza que el cliente se desconecte, haya éxito o error.
        await client.end(); 
    }
}


// =================================================================
// ➡️ EXPORTACIÓN DEL MÓDULO (Inicialización y Manejo de Comandos) ⬅️
// =================================================================
/**
 * Inicializa el Bot de Telegram.
 * @param {function} generarReporteFn - Función del motor de reportes (de index.js)
 * que se activa con el comando /enviar_pdf.
 * @returns {TelegramBot} La instancia del bot inicializado.
 */
module.exports = function(generarReporteFn) {
    const token = process.env.TELEGRAM_BOT_TOKEN; 
    
    try {
        // Instancia el bot. { polling: true } le dice al bot que debe mantenerse 
        // "preguntando" a Telegram por mensajes nuevos constantemente.
        const bot = new TelegramBot(token, { polling: true }); 
        console.log('🤖 Bot de Telegram listo. Escuchando comandos...');

        // ----------------------------------------
        // 💬 COMANDO: /start (Bienvenida)
        // ----------------------------------------
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id; 
            const userName = msg.from.username || msg.from.first_name;
            console.log(`[BOT COMMAND] Usuario ${userName} (${chatId}) usó /start.`);
            
            bot.sendMessage(chatId, 
                `👋 ¡Hola! Soy el Bot de Reportes y Catálogo.
                
                Comandos disponibles:
                - /catalogo: Muestra los últimos videojuegos.
                - /buscar <nombre o ID>: Busca un juego por nombre o ID.
                - /enviar_pdf: Inicia el proceso de reporte por email.`);
        });
        
        // ----------------------------------------
        // 📚 COMANDO: /catalogo (Listado general)
        // ----------------------------------------
        bot.onText(/\/catalogo/, async (msg) => {
            const chatId = msg.chat.id;
            const userName = msg.from.username || msg.from.first_name;
            console.log(`[BOT COMMAND] Usuario ${userName} (${chatId}) usó /catalogo.`);
            
            bot.sendMessage(chatId, '🔎 Obteniendo el catálogo de videojuegos...');
            
            const juegos = await obtenerVideojuegos();

            if (!juegos || juegos.length === 0) {
                return bot.sendMessage(chatId, '❌ No se encontraron videojuegos en la base de datos.');
            }
            
            // 💡 LOG DE CATÁLOGO
            console.log(`[BOT LOG] Catálogo de juegos: ${juegos.length} resultados encontrados.`);

            let mensaje = '📚 **Últimos Videojuegos en Catálogo:**\n\n';
            
            // Bucle de construcción del mensaje con robustez contra datos nulos de la BD
            juegos.forEach(juego => {
                // Validación: Si el campo es null/undefined, asigna 'N/A' o maneja el formato seguro.
                const genero = juego.genero || 'N/A';
                const anio = juego.anio || 'N/A';
                // Valida si el precio existe antes de formatearlo a dos decimales.
                const precio = juego.precio ? `$${parseFloat(juego.precio).toFixed(2)}` : 'N/A'; 

                mensaje += `*ID ${juego.id}*: **${juego.nombre}**\n`;
                mensaje += `   - Género: ${genero}\n`;
                mensaje += `   - Año: ${anio}\n`;
                mensaje += `   - Precio: ${precio}\n\n`; 
            });
            
            bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' }); // Envía el mensaje usando formato Markdown.
        });
        
        // ----------------------------------------
        // 🔍 COMANDO: /buscar <query> (Búsqueda específica)
        // ----------------------------------------
        // Expresión regular que captura todo el texto que sigue a /buscar.
        bot.onText(/\/buscar (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const userName = msg.from.username || msg.from.first_name;
            const busqueda = match[1].trim(); // El término capturado.
            
            console.log(`[BOT COMMAND] Usuario ${userName} (${chatId}) usó /buscar con query: "${busqueda}".`);

            bot.sendMessage(chatId, `🔎 Buscando videojuegos que coincidan con: *${busqueda}*...`, { parse_mode: 'Markdown' });
            
            const juegos = await obtenerVideojuegos(busqueda); // Llama a la BD.

            if (!juegos) {
                return bot.sendMessage(chatId, '❌ Ocurrió un error al intentar acceder a la base de datos.');
            }

            if (juegos.length === 0) {
                // 💡 LOG: Registra la búsqueda fallida
                console.log(`[BOT LOG] Búsqueda "${busqueda}": 0 resultados encontrados.`);
                return bot.sendMessage(chatId, `❌ No se encontraron resultados para "*${busqueda}*". Intenta con otro nombre o ID.`, { parse_mode: 'Markdown' });
            }

            // -------------------------------------------------------------
            // 💡 MEJORA DE LOG: Registra los nombres de los juegos encontrados en la consola
            // -------------------------------------------------------------
            const nombresEncontrados = juegos.map(j => `[ID ${j.id}: ${j.nombre}]`);
            console.log(`[BOT LOG] Búsqueda "${busqueda}": ${juegos.length} resultados. -> ${nombresEncontrados.join(', ')}`);

            let mensaje = `✅ **Resultados de la búsqueda para ${busqueda}:**\n\n`;
            
            // Bucle de Construcción del Mensaje (con Validación de NULLs)
            juegos.forEach(juego => {
                const genero = juego.genero || 'N/A';
                const anio = juego.anio || 'N/A';
                const precio = juego.precio ? `$${parseFloat(juego.precio).toFixed(2)}` : 'N/A'; 

                mensaje += `*ID ${juego.id}*: **${juego.nombre}**\n`;
                mensaje += `   - Género: ${genero}\n`;
                mensaje += `   - Año: ${anio}\n`;
                mensaje += `   - Precio: ${precio}\n\n`;
            });
            
            bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
        });
        
        // Manejar comando /buscar sin argumento (Ayuda)
        bot.onText(/\/buscar$/, (msg) => {
            const userName = msg.from.username || msg.from.first_name;
            console.log(`[BOT COMMAND] Usuario ${userName} usó /buscar sin argumento.`);
            bot.sendMessage(msg.chat.id, 'Por favor, usa el comando así: `/buscar <nombre o ID>`', { parse_mode: 'Markdown' });
        });
        
        // ----------------------------------------
        // 📄 COMANDO: /enviar_pdf (Activación del Motor de Reportes)
        // ----------------------------------------
        bot.onText(/\/enviar_pdf/, async (msg) => { 
            const chatId = msg.chat.id;
            const userName = msg.from.username || msg.from.first_name;
            
            console.log(`[BOT COMMAND] 📧 Usuario ${userName} (${chatId}) solicitó /enviar_pdf. Ejecutando lógica de reporte...`);

            bot.sendMessage(chatId, 
                '⏳ Iniciando el proceso de generación, encriptación y envío de PDF. Esto puede tardar...');

            try {
                // 🚨 LLAMADA CRÍTICA: Ejecuta la función principal del motor de reportes (index.js).
                await generarReporteFn(); 
                
                console.log(`[LOG] ✅ Lógica de reporte completada exitosamente.`);
                bot.sendMessage(chatId, 
                    `✅ ¡PROCESO DE REPORTE FINALIZADO! Los reportes han sido enviados.`);
                
            } catch (error) {
                // Captura el error si el motor de reportes falla (ej: error en QPDF o BD).
                console.error(`[LOG ERROR] ❌ Fallo al generar el reporte (ejecutado por ${userName}):`, error.message);
                bot.sendMessage(chatId, 
                    `❌ Fallo grave al generar el PDF. Error: ${error.message}.`);
            }
        });

        return bot; // Devuelve la instancia del bot para que server.js sepa que está activo.
        
    } catch (error) {
        // Captura errores si el Token de Telegram es inválido o la inicialización falla.
        console.error('❌ ERROR CRÍTICO al iniciar el Bot de Telegram:', error.message);
        throw new Error('No se pudo inicializar el Bot. Revise TELEGRAM_BOT_TOKEN en .env.');
    }
};