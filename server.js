// =================================================================
// 📋 NOMBRE DEL ARCHIVO: server.js
// =================================================================
// 
// 🎯 ¿QUÉ HACE ESTE ARCHIVO?
// Este archivo es como el "cerebro" de nuestra aplicación.
// Piensa en él como un recepcionista de un hotel que:
// 1. Atiende a las personas que llegan (rutas web)
// 2. Enciende el Bot de Telegram cuando se lo pides
// 3. Coordina el envío de reportes PDF
//
// =================================================================


// =================================================================
// 📦 PASO 1: IMPORTAR HERRAMIENTAS (Como sacar herramientas de una caja)
// =================================================================

// ¿QUÉ ES "require"?
// Es como decir "tráeme esta herramienta para poder usarla aquí"
// Es similar a sacar un martillo de tu caja de herramientas


// ---------------------------
// HERRAMIENTA 1: Express
// ---------------------------
const express = require('express');
// ☝️ ¿Qué significa esto?
// - "const" = Estoy creando una variable que NO va a cambiar
// - "express" = El nombre que le pongo a mi variable
// - "require('express')" = Voy a buscar e importar la herramienta llamada "express"
//
// 🤔 ¿Qué es Express?
// Es un framework (conjunto de herramientas pre-hechas) que hace 
// MUCHO MÁS FÁCIL crear un servidor web.
// Sin Express, tendrías que escribir cientos de líneas de código.
// Con Express, puedes hacer lo mismo en pocas líneas.


// ---------------------------
// HERRAMIENTA 2: Path
// ---------------------------
const path = require('path');
// ☝️ ¿Qué es Path?
// Es una herramienta que viene incluida en Node.js (no hay que instalarla)
// Sirve para trabajar con rutas de archivos de forma segura
//
// 📂 Ejemplo:
// En Windows, las rutas se escriben así: C:\Usuarios\Documentos\archivo.txt
// En Mac/Linux se escriben así: /Usuarios/Documentos/archivo.txt
// Path se encarga de que tu código funcione en AMBOS sistemas


// ---------------------------
// HERRAMIENTA 3: dotenv
// ---------------------------
require('dotenv').config();
// ☝️ ¿Qué hace esto?
// 1. "require('dotenv')" = Importa la herramienta dotenv
// 2. ".config()" = Ejecuta una función de dotenv que se llama "config"
//
// 🤔 ¿Para qué sirve dotenv?
// Lee un archivo especial llamado ".env" que contiene información SECRETA
// como contraseñas, tokens, etc.
//
// 📄 Ejemplo de archivo .env:
// TOKEN_BOT=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
// SERVER_PORT=3000
//
// Esto es como tener un diario secreto con tus contraseñas


// ---------------------------
// HERRAMIENTA 4: Nuestro Bot de Telegram
// ---------------------------
const initTelegramBot = require('./bot.js');
// ☝️ ¿Qué significa esto?
// - "initTelegramBot" = Nombre de la variable
// - "./bot.js" = Busca un archivo llamado "bot.js" en LA MISMA CARPETA
//   (el punto "." significa "carpeta actual")
//
// 🤖 ¿Qué es initTelegramBot?
// Es una FUNCIÓN (una acción) que está en otro archivo
// Esta función se encarga de "encender" nuestro Bot de Telegram


// ---------------------------
// HERRAMIENTA 5: Generador de Reportes
// ---------------------------
const { generarYEnviarReportes } = require('./index.js');
// ☝️ ¿Por qué tiene llaves { } esta vez?
// Porque del archivo "index.js" solo queremos importar UNA función específica
// Es como decir: "del archivo index.js, solo dame la función generarYEnviarReportes"
//
// 📊 ¿Qué hace generarYEnviarReportes?
// Es la función principal que crea los PDFs y los envía por correo


// =================================================================
// ⚙️ PASO 2: CONFIGURACIÓN (Preparar todo antes de empezar)
// =================================================================


// ---------------------------
// CONFIGURACIÓN 1: El Puerto
// ---------------------------
const PORT = process.env.SERVER_PORT || 3000;
// ☝️ Descomposición línea por línea:
//
// "const PORT" = Creo una variable llamada PORT (puerto en inglés)
//
// "process.env.SERVER_PORT" = Busca en las variables de entorno
// (las que cargó dotenv del archivo .env) una llamada "SERVER_PORT"
//
// "||" = Esto significa "O" (operador lógico)
//
// "3000" = Si no encuentra SERVER_PORT en el .env, usa 3000 como valor por defecto
//
// 🌐 ¿Qué es un Puerto?
// Es como un "canal de TV" en tu computadora
// Tu computadora puede tener muchos programas corriendo al mismo tiempo
// Cada uno usa un "puerto" diferente para no confundirse
// Ejemplo: puerto 3000, puerto 8080, puerto 5000, etc.


// ---------------------------
// CONFIGURACIÓN 2: La URL del Servidor
// ---------------------------
const SERVER_URL = `http://localhost:${PORT}`;
// ☝️ Descomposición:
//
// "const SERVER_URL" = Variable que guardará la dirección web completa
//
// Comillas raras ` ` = Se llaman "template literals" o "plantillas de texto"
// Te permiten INSERTAR variables dentro del texto usando ${variable}
//
// "http://" = Protocolo (la forma de comunicarse)
// "localhost" = Es tu propia computadora (no internet, solo local)
// ":${PORT}" = Inserta el valor de PORT (por ejemplo, si PORT es 3000, quedará :3000)
//
// 🔗 Resultado final: http://localhost:3000
// Esta es la dirección donde funcionará tu servidor


// ---------------------------
// CONFIGURACIÓN 3: Crear la Aplicación Express
// ---------------------------
const app = express();
// ☝️ ¿Qué pasa aquí?
//
// "express()" = Ejecuto la función express (tiene paréntesis)
// Esto CREA una nueva aplicación de servidor
//
// "const app" = Guardo esa aplicación en una variable llamada "app"
//
// 💡 De ahora en adelante, "app" es nuestro servidor
// Todo lo que hagamos con el servidor se hará a través de "app"


// ---------------------------
// CONFIGURACIÓN 4: Middleware para JSON
// ---------------------------
app.use(express.json());
// ☝️ Análisis palabra por palabra:
//
// "app" = Mi servidor
// ".use()" = Una función que dice "usa esto"
// "express.json()" = Una función especial de Express
//
// 🤔 ¿Para qué sirve?
// Configura el servidor para que pueda ENTENDER datos en formato JSON
//
// 📄 ¿Qué es JSON?
// JSON = JavaScript Object Notation
// Es una forma de escribir datos que las computadoras entienden fácilmente
// Ejemplo: {"nombre": "Juan", "edad": 30}
//
// Sin esta línea, si alguien envía datos JSON a tu servidor, no los entendería


// ---------------------------
// CONFIGURACIÓN 5: Variable de Estado del Bot
// ---------------------------
let botInicializado = false;
// ☝️ Análisis completo:
//
// "let" = Palabra para crear una variable que SÍ puede cambiar (diferente de "const")
//
// "botInicializado" = Nombre de la variable (usamos estilo camelCase)
//
// "= false" = Le damos el valor "falso" (false en inglés)
//
// 🚦 ¿Para qué sirve esta variable?
// Es como un interruptor de luz: puede ser true (encendido) o false (apagado)
// Nos dice si el Bot de Telegram ya está funcionando o no
//
// Empezamos con "false" porque al inicio el Bot NO está encendido


// =================================================================
// 🎬 PASO 3: FUNCIONES (Acciones que puede hacer nuestro programa)
// =================================================================


// ---------------------------
// FUNCIÓN PRINCIPAL: ejecutarScriptPDF
// ---------------------------
// Esta función se encarga de generar y enviar los reportes PDF

async function ejecutarScriptPDF(res, source) {
    // ☝️ Descomposición de la PRIMERA LÍNEA:
    //
    // "async" = Palabra especial que indica que esta función hace cosas
    //           que toman TIEMPO (como descargar un archivo o enviar un email)
    //
    // "function" = Palabra para declarar/crear una función
    //
    // "ejecutarScriptPDF" = Nombre que le damos a nuestra función
    //
    // "(res, source)" = PARÁMETROS de entrada (datos que la función necesita)
    //   - "res" = Respuesta (response en inglés) - para responder al navegador
    //   - "source" = Origen (de dónde vino la petición: web o telegram)
    //
    // "{ }" = Todo el código entre estas llaves es el CUERPO de la función
    //         (lo que la función hace cuando la llamas)


    // -----------------------------
    // VERIFICACIÓN 1: ¿Está el Bot encendido?
    // -----------------------------
    if (!botInicializado) {
        // ☝️ Línea por línea:
        //
        // "if" = "Si" en español (condicional)
        //
        // "!" = Signo de exclamación significa "NO" (negación)
        //
        // "!botInicializado" = "Si NO está inicializado el bot"
        //
        // Traducción completa: "Si el bot NO está encendido, entonces..."

        
        return res.status(403).send(`<html><body><h1>❌ Bot No Iniciado.</h1><p>Debe iniciar el bot primero visitando <a href="${SERVER_URL}/iniciar/bot">/iniciar/bot</a></p></body></html>`);
        // ☝️ Esta línea hace VARIAS cosas. Vamos por partes:
        //
        // "return" = Detiene la función AQUÍ y devuelve algo
        //
        // "res" = El objeto de respuesta (para contestarle al navegador)
        //
        // ".status(403)" = Establece un código de error HTTP
        //   - 403 = "Prohibido" (Forbidden en inglés)
        //   - Es como poner un cartel de "No Puedes Pasar"
        //
        // ".send()" = Envía una respuesta al navegador
        //
        // "` `" = Plantilla de texto (template literal) que permite escribir HTML
        //
        // HTML entre comillas = Es código de página web
        //   - <html> = Inicio de documento web
        //   - <body> = Cuerpo del documento
        //   - <h1> = Título grande
        //   - <p> = Párrafo
        //   - <a href="..."> = Enlace clickeable
        //
        // "${SERVER_URL}" = Inserta la URL del servidor en el texto
        //
        // 🎯 RESULTADO:
        // Muestra una página web diciendo "Error: Bot no iniciado, 
        // haz clic aquí para iniciarlo"
    }
    

    // -----------------------------
    // BLOQUE TRY-CATCH (Intentar-Atrapar)
    // -----------------------------
    try {
        // ☝️ ¿Qué es try-catch?
        //
        // Es como un "red de seguridad" en el circo
        //
        // "try" = "Intenta hacer esto..."
        // "catch" = "Si algo sale mal, atrapa el error aquí"
        //
        // 💡 ¿Por qué es importante?
        // Si algo falla (internet se cae, archivo no existe, etc.),
        // el programa NO se rompe completamente, sino que maneja el error


        // ----------------
        // LOG 1: Registro de inicio
        // ----------------
        console.log(`[SERVER LOG] 📧 Petición recibida desde: ${source}. Iniciando lógica de PDF...`);
        // ☝️ Descomposición:
        //
        // "console.log()" = Función que IMPRIME texto en la consola/terminal
        //   - Es como escribir un mensaje en un diario
        //   - Solo los programadores lo ven, no los usuarios
        //
        // "[SERVER LOG]" = Etiqueta para identificar que es un mensaje del servidor
        //
        // "${source}" = Inserta el valor de la variable "source"
        //   (puede ser "WEB_DIRECTA" o "TELEGRAM")
        //
        // 📝 Ejemplo de salida en consola:
        // [SERVER LOG] 📧 Petición recibida desde: WEB_DIRECTA. Iniciando lógica de PDF...


        // ----------------
        // ACCIÓN PRINCIPAL: Generar y Enviar Reportes
        // ----------------
        await generarYEnviarReportes();
        // ☝️ Análisis completo:
        //
        // "await" = "Espera" en español
        //   - Le dice al programa: "Detente aquí hasta que esto termine"
        //   - SOLO se puede usar dentro de funciones "async"
        //
        // "generarYEnviarReportes()" = Llama/ejecuta la función importada
        //   - Esta función está en index.js
        //   - Crea los PDFs
        //   - Los envía por correo
        //   - Puede tardar varios segundos
        //
        // ";" = Punto y coma que termina la instrucción
        //
        // 🚨 IMPORTANTE: Esta es la línea MÁS IMPORTANTE de la función
        // Aquí es donde realmente se hace el trabajo pesado


        // ----------------
        // LOG 2: Registro de éxito
        // ----------------
        console.log(`[SERVER LOG] ✅ Lógica de PDF completada con éxito para ${source}.`);
        // ☝️ Otro mensaje para la consola
        // Confirma que todo salió bien
        // La marca ✅ es un indicador visual de éxito


        // ----------------
        // RESPUESTA DE ÉXITO al Navegador
        // ----------------
        return res.send(`
            <html>
                <body>
                    <h1 style="color: green;">✅ Proceso de Envío de PDF Terminado.</h1>
                    <p>Los reportes han sido enviados. Verifique sus correos.</p>
                    <p><a href="${SERVER_URL}/">Volver al Directorio</a></p>
                </body>
            </html>
        `);
        // ☝️ Análisis:
        //
        // "return res.send()" = Envía HTML al navegador y TERMINA la función
        //
        // HTML con múltiples líneas:
        //   - <h1 style="color: green;"> = Título verde
        //   - <p> = Párrafos con mensajes
        //   - <a href="${SERVER_URL}/"> = Enlace para volver a inicio
        //
        // 🎯 RESULTADO:
        // El usuario ve una página web de éxito con un mensaje verde


    } catch (error) {
        // ☝️ Este bloque se ejecuta SOLO si algo falló en el "try"
        //
        // "catch" = "Atrapa" el error
        //
        // "(error)" = Variable que contiene información sobre QUÉ falló
        //   - error.message = El mensaje de error
        //   - error.stack = Información técnica del error


        // ----------------
        // LOG DE ERROR
        // ----------------
        console.error(`[SERVER ERROR] ❌ Fallo en la ejecución del PDF desde ${source}:`, error.message);
        // ☝️ Análisis:
        //
        // "console.error()" = Como console.log() pero para ERRORES
        //   - Aparece en rojo en la consola
        //   - Indica que algo salió mal
        //
        // "error.message" = El mensaje específico del error
        //   Ejemplo: "No se pudo conectar a la base de datos"


        // ----------------
        // RESPUESTA DE ERROR al Navegador
        // ----------------
        return res.status(500).send(`
            <html><body><h1>❌ ERROR CRÍTICO.</h1><p>Fallo al ejecutar el script de PDF.</p><p>Detalle: ${error.message}</p><p><a href="${SERVER_URL}/">Volver al Directorio</a></p></body></html>
        `);
        // ☝️ Análisis:
        //
        // ".status(500)" = Código de error HTTP 500
        //   - 500 = "Error Interno del Servidor"
        //   - Es como decir "Algo se rompió aquí dentro"
        //
        // "${error.message}" = Muestra el error específico al usuario
        //
        // 🎯 RESULTADO:
        // El usuario ve una página de error explicando qué salió mal
    }
}
// ☝️ Llave que cierra la función ejecutarScriptPDF


// =================================================================
// 🛣️ PASO 4: RUTAS (Los "caminos" que puede tomar el usuario)
// =================================================================

// 💡 ¿Qué es una ruta?
// Es como una dirección en tu sitio web
// Ejemplo: www.misitio.com/inicio
//          www.misitio.com/contacto
// Cada ruta hace algo diferente


// ---------------------------------------------------------------------
// RUTA 1: /iniciar/bot
// ---------------------------------------------------------------------
// Esta ruta ENCIENDE el Bot de Telegram

app.get('/iniciar/bot', (req, res) => {
    // ☝️ Descomposición COMPLETA de esta línea:
    //
    // "app" = Nuestro servidor
    //
    // ".get()" = Método que dice "cuando alguien VISITE esta ruta..."
    //   - GET es un tipo de petición HTTP (para OBTENER información)
    //   - Otros tipos: POST (enviar), PUT (actualizar), DELETE (borrar)
    //
    // "'/iniciar/bot'" = La ruta/camino (entre comillas)
    //   - Se escribe: http://localhost:3000/iniciar/bot
    //
    // "(req, res) =>" = Función de flecha (arrow function)
    //   - "req" = request (petición) - información que LLEGA del navegador
    //   - "res" = response (respuesta) - lo que ENVIAMOS al navegador
    //   - "=>" = Sintaxis moderna para crear funciones
    //
    // "{ }" = Cuerpo de la función (lo que hace cuando alguien visita la ruta)


    // ----------------
    // LOG DE ACCESO
    // ----------------
    console.log(`[SERVER ACCESS] Acceso a ruta: /iniciar/bot desde ${req.ip}`);
    // ☝️ Análisis:
    //
    // "[SERVER ACCESS]" = Etiqueta para identificar accesos a rutas
    //
    // "req.ip" = La dirección IP de quien está accediendo
    //   - IP = Identificador único de cada computadora en internet
    //   - Ejemplo: 192.168.1.100
    //
    // 📝 Ejemplo de salida:
    // [SERVER ACCESS] Acceso a ruta: /iniciar/bot desde 127.0.0.1


    // ----------------
    // VERIFICACIÓN: ¿Ya está encendido el Bot?
    // ----------------
    if (botInicializado) {
        // ☝️ "if (botInicializado)" = "Si el bot YA está inicializado..."
        // (No tiene "!" esta vez, así que verifica si es TRUE)


        const mensaje = '⚠️ El Bot de Telegram ya estaba activo.';
        // ☝️ Crea una variable con un mensaje de advertencia
        // ⚠️ = Símbolo de advertencia


        console.log(`[SERVER LOG] ${mensaje}`);
        // ☝️ Imprime el mensaje en la consola


        return res.send(`<html><body><h1>${mensaje}</h1><p>El bot ya está haciendo polling.</p><p><a href="${SERVER_URL}/">Volver al Directorio</a></p></body></html>`);
        // ☝️ Análisis:
        //
        // "return" = Termina la función aquí (no continúa ejecutando)
        //
        // "res.send()" = Envía HTML al navegador
        //
        // "polling" = Término técnico que significa "revisando mensajes constantemente"
        //   - El bot está "preguntando" a Telegram cada segundo:
        //     "¿Hay mensajes nuevos? ¿Hay mensajes nuevos?"
        //
        // 🎯 RESULTADO:
        // Si intentas iniciar el bot dos veces, te dice que ya está activo
    }


    // ----------------
    // BLOQUE TRY-CATCH para iniciar el Bot
    // ----------------
    try {
        // ☝️ Intenta hacer esto...


        // ----------------
        // ACCIÓN: INICIAR EL BOT
        // ----------------
        initTelegramBot(generarYEnviarReportes);
        // ☝️ Análisis MUY IMPORTANTE:
        //
        // "initTelegramBot()" = Llama a la función que enciende el bot
        //   (Esta función viene de bot.js, la importamos al inicio)
        //
        // "(generarYEnviarReportes)" = Le PASAMOS una función como parámetro
        //   - NO tiene paréntesis porque no la queremos ejecutar AHORA
        //   - Se la damos al bot para que la ejecute cuando sea necesario
        //   - Es como darle una herramienta que usará después
        //
        // 🤖 ¿Qué hace esto?
        // 1. Conecta el bot a Telegram
        // 2. El bot empieza a escuchar comandos
        // 3. Cuando recibe el comando /enviar_pdf, usará generarYEnviarReportes


        botInicializado = true;
        // ☝️ Análisis:
        //
        // Cambia el valor de la variable a "true" (verdadero)
        //
        // 💡 ¿Por qué?
        // Para RECORDAR que ya iniciamos el bot
        // Si alguien intenta iniciarlo de nuevo, la verificación de arriba
        // detectará que botInicializado = true y no dejará


        console.log(`[SERVER LOG] ✅ BOT INICIADO exitosamente vía ruta web.`);
        // ☝️ Mensaje de confirmación en la consola


        // ----------------
        // RESPUESTA DE ÉXITO
        // ----------------
        return res.send(`
            <html>
                <body>
                    <h1 style="color: green;">🤖 Bot Iniciado.</h1>
                    <p>El Bot está listo. Regresa al directorio.</p>
                    <p><a href="${SERVER_URL}/">Volver al Directorio Principal</a></p>
                </body>
            </html>
        `);
        // ☝️ Envía página HTML verde confirmando que el bot está listo


    } catch (error) {
        // ☝️ Si algo falla al iniciar el bot...


        console.error(`[SERVER ERROR] ❌ Error al iniciar el Bot:`, error.message);
        // ☝️ Imprime el error en la consola


        return res.status(500).send(`
            <html><body><h1>❌ Error al iniciar el Bot.</h1><p>Revise el token.</p><p><a href="${SERVER_URL}/">Volver al Directorio</a></p></body></html>
        `);
        // ☝️ Envía página de error
        // Sugiere revisar el token (la "contraseña" del bot)
    }
});
// ☝️ Llave y paréntesis que cierran la ruta /iniciar/bot


// ---------------------------------------------------------------------
// RUTA 2: /enviar/pdf
// ---------------------------------------------------------------------
// Esta ruta genera y envía los reportes PDF directamente desde la web

app.get('/enviar/pdf', (req, res) => {
    // ☝️ Similar a la ruta anterior:
    //
    // "app.get()" = Define una ruta GET
    // "'/enviar/pdf'" = El camino es /enviar/pdf
    // "(req, res) =>" = Función que se ejecuta cuando alguien visita esta ruta


    // ----------------
    // LOG DE ACCESO
    // ----------------
    console.log(`[SERVER ACCESS] Acceso a ruta: /enviar/pdf desde ${req.ip}.`);
    // ☝️ Registra quién accedió a esta ruta


    // ----------------
    // DELEGACIÓN: Llama a la función principal
    // ----------------
    ejecutarScriptPDF(res, 'WEB_DIRECTA');
    // ☝️ Análisis completo:
    //
    // "ejecutarScriptPDF()" = Llama a la función que definimos antes
    //
    // "res" = Le pasa el objeto de respuesta
    //   (para que la función pueda responder al navegador)
    //
    // "'WEB_DIRECTA'" = Le indica el origen de la petición
    //   - Es un texto que identifica que vino de la web
    //   - No de Telegram
    //   - Esto aparecerá en los logs para saber de dónde vino la solicitud
    //
    // 💡 ¿Por qué hacer esto?
    // En lugar de escribir TODO el código aquí otra vez,
    // simplemente llamamos a la función que ya hace ese trabajo
    // Esto se llama "reutilización de código"
});
// ☝️ Cierra la ruta /enviar/pdf


// ---------------------------------------------------------------------
// RUTA 3: / (Ruta raíz - La página principal)
// ---------------------------------------------------------------------
// Esta es la página de inicio, el "directorio" o "menú principal"

app.get('/', (req, res) => {
    // ☝️ Ruta raíz:
    //
    // "'/" = Solo una barra diagonal
    // Es la página que ves cuando visitas: http://localhost:3000
    // (Sin nada después del dominio)


    // ----------------
    // LOG DE ACCESO
    // ----------------
    console.log(`[SERVER ACCESS] Acceso a ruta: / (Directorio) desde ${req.ip}`);
    // ☝️ Registra acceso a la página principal


    // ----------------
    // PREPARACIÓN: Variables para mostrar estado
    // ----------------
    
    const botStatus = botInicializado ? '✅ ACTIVO' : '❌ INACTIVO';
    // ☝️ Operador TERNARIO (condicional en una línea):
    //
    // Sintaxis: condición ? valor_si_verdadero : valor_si_falso
    //
    // "botInicializado" = La condición que se evalúa
    //
    // "?" = Pregunta "¿es verdadero?"
    //
    // "'✅ ACTIVO'" = Si es true (verdadero), usa este texto
    //
    // ":" = Significa "sino"
    //
    // "'❌ INACTIVO'" = Si es false (falso), usa este texto
    //
    // 📝 Ejemplo:
    // Si botInicializado = true  → botStatus = '✅ ACTIVO'
    // Si botInicializado = false → botStatus = '❌ INACTIVO'


    const botLink = botInicializado ? 'El Bot está listo para el comando /enviar_pdf.' : `<a href="${SERVER_URL}/iniciar/bot">➡️ INICIAR BOT AHORA</a>`;
    // ☝️ Otro operador ternario:
    //
    // Si el bot YA está inicializado:
    //   → Muestra un mensaje de texto simple
    //
    // Si el bot NO está inicializado:
    //   → Muestra un enlace HTML clickeable para iniciarlo
    //
    // 💡 Esto hace que la página sea "inteligente"
    // Cambia según el estado actual del bot


    // ----------------
    // RESPUESTA: Enviar la página HTML completa
    // ----------------
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
    // ☝️ ANÁLISIS COMPLETO DEL HTML:
    //
    // "res.send()" = Envía esta página al navegador
    //
    // Plantilla de texto con HTML:
    //
    //   <html> = Inicio del documento
    //
    //   <body style="..."> = Cuerpo con estilos CSS en línea
    //     - font-family: sans-serif = Tipo de letra sin "adornos"
    //     - padding: 30px = Espacio interno de 30 píxeles
    //     - line-height: 1.6 = Espacio entre líneas de texto
    //
    //   <h1 style="color: #007bff;"> = Título principal color azul
    //     - #007bff = Código de color en hexadecimal (azul)
    //
    //   <h2> = Título secundario (más pequeño que h1)
    //
    //   <p> = Párrafo
    //
    //   <b> = Texto en negrita (bold)
    //
    //   "${botStatus}" = Inserta el estado del bot (ACTIVO o INACTIVO)
    //
    //   "${botLink}" = Inserta el enlace o mensaje del bot
    //
    //   <hr> = Línea horizontal separadora
    //
    //   <a href="..."> = Enlace clickeable
    //
    //   "style="color: ${botInicializado ? 'green' : 'gray'}" =
    //     Operador ternario dentro del HTML:
    //     - Si el bot está inicializado → color verde
    //     - Si no está inicializado → color gris
    //
    //   <small> = Texto pequeño (como una nota al pie)
    //
    // 🎯 RESULTADO VISUAL:
    // El usuario ve una página web bonita con:
    // 1. El estado del bot (activo/inactivo)
    // 2. Un botón o enlace para iniciar el bot (si no está activo)
    // 3. Un enlace para generar PDFs manualmente
});
// ☝️ Cierra la ruta / (raíz)


// =================================================================
// 🚀 PASO 5: INICIAR EL SERVIDOR (Encender todo)
// =================================================================

app.listen(PORT, () => {
    // ☝️ DESCOMPOSICIÓN LÍNEA POR LÍNEA:
    //
    // "app" = Nuestro servidor
    //
    // ".listen()" = Función que significa "escuchar"
    //   - Le dice al servidor: "Enciéndete y escucha peticiones"
    //   - Es como abrir las puertas de una tienda
    //
    // "PORT" = El puerto donde escuchar (por ejemplo 3000)
    //   - Recuerda: lo definimos al inicio con process.env.SERVER_PORT || 3000
    //
    // "() => { }" = Función de flecha (callback)
    //   - Se ejecuta DESPUÉS de que el servidor se enciende exitosamente
    //   - Es como decir "cuando estés listo, haz esto..."


    // ----------------
    // LOG 1: Confirmación de inicio
    // ----------------
    console.log(`[SERVER] 🌐 Servidor Express escuchando en ${SERVER_URL}`);
    // ☝️ Análisis:
    //
    // "console.log()" = Imprime en la consola/terminal
    //
    // "[SERVER]" = Etiqueta para identificar mensajes del servidor
    //
    // "🌐" = Emoji de globo (indica que es algo de red/web)
    //
    // "Servidor Express escuchando en" = Mensaje descriptivo
    //
    // "${SERVER_URL}" = Inserta la URL completa (http://localhost:3000)
    //
    // 📺 Ejemplo de lo que verás en la terminal:
    // [SERVER] 🌐 Servidor Express escuchando en http://localhost:3000


    // ----------------
    // LOG 2: Instrucción para el usuario
    // ----------------
    console.log(`💡 Visita ${SERVER_URL}/ para empezar.`);
    // ☝️ Análisis:
    //
    // "💡" = Emoji de bombilla (representa una idea/sugerencia)
    //
    // "Visita ${SERVER_URL}/" = Le dice al usuario dónde ir
    //   - Es una instrucción amigable
    //   - Le indica que abra esa URL en su navegador
    //
    // 📺 Ejemplo de salida:
    // 💡 Visita http://localhost:3000/ para empezar.
    //
    // 🎯 PROPÓSITO:
    // Estos mensajes le confirman al programador que:
    // 1. El servidor se encendió correctamente
    // 2. Dónde puede acceder a él
});
// ☝️ Cierra la función callback de listen()


// =================================================================
// 🎉 FIN DEL ARCHIVO server.js
// =================================================================
//
// 📋 RESUMEN DE LO QUE HACE ESTE ARCHIVO:
//
// 1. IMPORTA herramientas necesarias (Express, dotenv, bot, reportes)
//
// 2. CONFIGURA el servidor:
//    - Define el puerto (3000 por defecto)
//    - Crea la aplicación Express
//    - Configura middleware para JSON
//    - Crea variable de estado del bot
//
// 3. DEFINE la función ejecutarScriptPDF:
//    - Verifica si el bot está activo
//    - Genera y envía reportes PDF
//    - Maneja errores
//
// 4. CREA 3 rutas web:
//    - /iniciar/bot → Enciende el bot de Telegram
//    - /enviar/pdf → Genera PDFs manualmente
//    - / → Página principal (directorio/menú)
//
// 5. INICIA el servidor:
//    - Lo pone a escuchar en el puerto configurado
//    - Muestra mensajes de confirmación
//
//
// 🔄 FLUJO DE TRABAJO TÍPICO:
//
// 1. El usuario ejecuta: node server.js
// 2. El servidor se enciende en http://localhost:3000
// 3. El usuario visita esa URL en su navegador
// 4. Ve la página principal con opciones
// 5. Hace clic en "Iniciar Bot"
// 6. El bot de Telegram se enciende
// 7. Ahora puede:
//    a) Enviar PDFs desde la web (/enviar/pdf)
//    b) Enviar PDFs desde Telegram (comando /enviar_pdf)
//
//
// 💡 CONCEPTOS CLAVE QUE DEBES ENTENDER:
//
// - SERVIDOR: Programa que espera peticiones y responde
// - RUTA: Camino/dirección web (como /inicio, /contacto)
// - PUERTO: "Canal" donde el servidor escucha (como canal de TV)
// - FUNCIÓN: Bloque de código reutilizable con un nombre
// - ASYNC/AWAIT: Manera de manejar operaciones que toman tiempo
// - TRY-CATCH: Red de seguridad para atrapar errores
// - HTML: Lenguaje para crear páginas web
// - VARIABLE: "Caja" que guarda un valor con un nombre
// - CONDICIONAL (if): Hace algo solo si una condición es verdadera
// - CONSOLE.LOG: Imprime mensajes en la terminal (para debugging)