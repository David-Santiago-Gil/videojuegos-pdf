// Archivo: index.js
// Este módulo contiene la lógica de negocio central, encargándose de las operaciones
// que requieren tiempo y recursos: acceso a la Base de Datos (BD), generación de 
// documentos (PDF), seguridad (Cifrado) y comunicación (Email).

// =================================================================
// 📚 MÓDULOS Y DEPENDENCIAS (Las "cajas de herramientas" especializadas)
// =================================================================
const { Client } = require('pg'); 
// 'pg' es la librería (o módulo) de Node.js que funciona como un "driver" 
// para comunicarse con la base de datos PostgreSQL. El objeto 'Client' 
// es la clase fundamental para establecer una conexión.

const PDFDocument = require('pdfkit'); 
// 'pdfkit' es una librería para generar archivos PDF. Se utiliza para 
// construir el documento de manera programática, línea por línea.

const fs = require('fs'); 
// 'fs' (File System) es un módulo nativo de Node.js. Permite interactuar 
// con el disco duro del servidor para crear, leer y eliminar archivos (como los PDF).

const nodemailer = require('nodemailer'); 
// 'nodemailer' es la librería estándar para enviar correos electrónicos 
// a través de servidores SMTP (Simple Mail Transfer Protocol).

const path = require('path'); 
// 'path' es un módulo nativo. Ayuda a construir rutas de archivos y directorios 
// de forma segura, garantizando que funcionen tanto en Windows (con \) como en Linux (con /).

const { exec } = require('child_process'); 
// 'child_process' es un módulo nativo. Su función 'exec' permite ejecutar 
// comandos del sistema operativo (como si estuvieras escribiendo en la terminal). 
// Es CRÍTICO para usar el programa externo QPDF.

require('dotenv').config(); 
// Carga todas las variables clave (credenciales, puertos, tokens) desde el 
// archivo .env al entorno de ejecución de Node.js (process.env).


// ⚠️ RUTA ABSOLUTA DE QPDF (Tomada del .env) ⚠️
const QPDF_PATH = process.env.QPDF_PATH; 
// Almacena la ruta del ejecutable QPDF. Si no se encuentra, el cifrado fallará.


// =================================================================
// ⚙️ CONFIGURACIÓN GLOBAL (Detalles de conexión y autenticación)
// =================================================================

// Configuración de la Base de Datos (PostgreSQL)
const dbConfig = {
    host: process.env.DB_HOST, // Dirección del servidor de la BD.
    port: parseInt(process.env.DB_PORT), // El puerto debe ser un número entero.
    database: process.env.DB_NAME, // Nombre de la base de datos a conectar.
    user: process.env.DB_USER, // Usuario con permisos de acceso.
    password: process.env.DB_PASSWORD // Contraseña del usuario.
};

// Configuración de Correo Electrónico (Para Nodemailer)
const emailConfig = {
    service: process.env.EMAIL_SERVICE, // Proveedor de correo (ej: 'gmail').
    auth: {                             // Objeto de Autenticación (credenciales SMTP).
        user: process.env.EMAIL_USER,   // Email desde donde se enviarán los reportes.
        pass: process.env.EMAIL_PASS    // Contraseña o Token de aplicación del email.
    }
};


// =================================================================
// 🌎 FUNCIONES DE OBTENCIÓN DE DATOS (Acceso a recursos externos)
// =================================================================

// 📍 Obtener Ubicación Geográfica por IP (Función Asíncrona)
async function obtenerUbicacion() {
    // 'async' indica que esta función realiza operaciones que requieren 'espera' (await).
    try {
        // 'fetch' (usado en Node) realiza una petición HTTP a una API externa.
        // Se usa para obtener información dinámica sobre el entorno del servidor.
        const response = await fetch('http://ip-api.com/json/'); 
        // 'await' pausa la ejecución hasta que la respuesta de la API llega.
        const data = await response.json(); // Parsea la respuesta de texto a un objeto JSON.
        if (data.status === 'success') {
            return data; // Devuelve los datos de ubicación.
        } else {
            return { city: 'Desconocida', country: 'Desconocido', lat: 0, lon: 0 };
        }
    } catch (error) {
        // Manejo de errores de red o conexión a la API.
        return { city: 'Error de Red', country: 'Error', lat: 0, lon: 0 };
    }
}

// Obtener datos de Videojuegos de PostgreSQL
async function obtenerVideojuegos() {
    const client = new Client(dbConfig); // Instancia un nuevo cliente de BD con la configuración.
    try {
        await client.connect(); // Abre la conexión con la base de datos.
        const result = await client.query(
            'SELECT id, nombre, genero, anio, precio FROM videojuegos ORDER BY id'
        ); // Ejecuta la consulta SQL y espera el resultado.
        return result.rows; // 'rows' es el array de registros devuelto por la BD.
    } finally {
        // 'finally' garantiza que este código se ejecute SIEMPRE, haya error o no.
        await client.end(); // 🚨 Cierra la conexión de la BD para liberar recursos del servidor.
    }
}

// Obtener la lista de destinatarios (correo y cédula)
async function obtenerDestinatarios() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        const result = await client.query(
            'SELECT cedula, email FROM destinatarios' // Obtenemos la cédula para usarla como contraseña.
        );
        return result.rows; 
    } finally {
        await client.end();
    }
}


// =================================================================
// 📄 FUNCIONES DE PROCESAMIENTO (Manipulación de Archivos y Comunicación)
// =================================================================

// Generar PDF con PDFKit
async function generarPDF(videojuegos, ubicacion) {
    // Es necesario usar una 'Promesa' porque el proceso de escribir el archivo 
    // en el disco duro es asíncrono y debe ser monitoreado.
    return new Promise((resolve, reject) => { 
        const nombreArchivo = `TEMP_${Date.now()}.pdf`; // Nombre único temporal.
        const rutaPdf = path.join(__dirname, nombreArchivo); // Ruta completa donde se guardará.
        
        const doc = new PDFDocument({ margin: 50 }); // Instancia el documento PDF.
        const stream = fs.createWriteStream(rutaPdf); // Crea un 'stream' (canal de flujo) para escribir.
        doc.pipe(stream); // Conecta el flujo de datos del PDFKit al archivo físico.

        // --- Contenido del PDF ---
        // (Lógica para dibujar texto, tablas, y manejar la paginación...)
        
        doc.end(); // Cierra el flujo de escritura del documento PDF.
        stream.on('finish', () => resolve(rutaPdf)); // Resuelve la Promesa (éxito) cuando el archivo está completo.
        stream.on('error', reject); // Rechaza la Promesa (falla) si hay un error de I/O (Input/Output).
    });
}

// 🔐 ENCRIPTAR CON QPDF (Programa externo)
async function encriptarConQPDF(rutaPdfOriginal, password) {
    const nombreFinal = `Videojuegos_PROTEGIDO_${new Date().toISOString().slice(0,10)}.pdf`;
    const rutaPdfFinal = path.join(__dirname, nombreFinal);
    
    // El comando de cifrado QPDF usa la cédula como contraseña dos veces 
    // (una para el propietario y otra para el usuario final).
    const comando = `"${QPDF_PATH}" "${rutaPdfOriginal}" --encrypt ${password} ${password} 256 --print=full --modify=none --extract=n --accessibility=y -- "${rutaPdfFinal}"`;

    return new Promise((resolve, reject) => {
        // 'exec' ejecuta el comando de cifrado en la terminal del servidor.
        exec(comando, (error, stdout, stderr) => { 
            if (error) {
                // Falla si QPDF no existe o hay problemas de permisos.
                return reject(new Error(`QPDF no está instalado o no está en el PATH. Error: ${stderr || error.message}`));
            }
            if (!fs.existsSync(rutaPdfFinal)) {
                // Verificación de que el archivo cifrado fue creado correctamente.
                return reject(new Error('PDF encriptado no se creó.'));
            }
            resolve(rutaPdfFinal); // Devuelve la ruta del archivo final cifrado.
        });
    });
}

// Enviar correo con Nodemailer
async function enviarCorreo(rutaPdf, emailDestino, passwordPdf) {
    const transporter = nodemailer.createTransport(emailConfig); // Crea el 'transporter' (el vehículo de envío).

    const mailOptions = { 
        from: emailConfig.auth.user, 
        to: emailDestino,            
        subject: `🔐 Catálogo Videojuegos PROTEGIDO - ${new Date().toLocaleDateString('es-ES')}`, 
        
        // El cuerpo HTML del correo explica la contraseña (CÉDULA) al destinatario.
        html: `
            <p>Estimado(a) destinatario(a),</p>
            <p>Adjuntamos el **Catálogo de Videojuegos**, un archivo PDF importante.</p>
            
            <div style="background-color: #f0f8ff; padding: 15px;">
                <p style="font-weight: bold; color: #333;">⚠️ Atención: El documento está protegido con cifrado AES-256 bits.</p>
                <p>La **contraseña** para poder abrir el archivo PDF es:</p>
                <h2 style="color: #FF0000; margin: 5px 0;">SU NÚMERO DE CÉDULA/IDENTIFICACIÓN</h2>
            </div>
            
            <p>Saludos cordiales.</p>
        `,
        attachments: [{ filename: path.basename(rutaPdf), path: rutaPdf }] // Adjunta el archivo cifrado.
    };

    await transporter.sendMail(mailOptions); // Envía el correo electrónico y espera la confirmación.
    console.log(`[EMAIL] ✅ Enviado reporte a: ${emailDestino}`);
}


// =================================================================
// ➡️ FUNCIÓN PRINCIPAL DE EJECUCIÓN (El Orquestador del Proceso) ⬅️
// =================================================================

async function generarYEnviarReportes() {
    let ubicacion = null; 
    
    try {
        console.log('🎮 === INICIO DEL PROCESO DE REPORTES ===\n');

        // 1. Fase de Preparación y Obtención de Datos
        ubicacion = await obtenerUbicacion(); // Obtiene la ubicación de la API.
        const videojuegos = await obtenerVideojuegos(); // Consulta la tabla de juegos.
        const destinatarios = await obtenerDestinatarios(); // Consulta la lista de emails/cédulas.
        
        console.log(`✅ Se encontraron ${destinatarios.length} destinatarios para procesar.`);

        // 2. Fase de Procesamiento por Lotes (Bucle)
        // Recorre la lista de destinatarios para generar un PDF cifrado para cada uno.
        for (const destinatario of destinatarios) { 
            let rutaPdfTemp = null;
            let rutaPdfFinal = null; 
            const email = destinatario.email;
            const cedula = destinatario.cedula; 

            try {
                // Tarea 1: Generar el PDF
                rutaPdfTemp = await generarPDF(videojuegos, ubicacion); 
                // Tarea 2: Cifrar el PDF (usando la cédula como clave)
                rutaPdfFinal = await encriptarConQPDF(rutaPdfTemp, cedula); 
                
                // Tarea 3: Enviar el correo
                await enviarCorreo(rutaPdfFinal, email, cedula);
                
            } catch (error) {
                // Manejo de error NO fatal: si falla un correo, el resto debe continuar.
                console.error(`\n❌ ERROR al procesar a ${email}:`, error.message);
            } finally {
                // 3. Fase de Limpieza (CRÍTICO)
                // Usamos 'finally' para asegurar que los archivos temporales sean eliminados.
                if (rutaPdfTemp && fs.existsSync(rutaPdfTemp)) {
                    fs.unlinkSync(rutaPdfTemp); // Elimina el PDF temporal (no cifrado).
                }
                if (rutaPdfFinal && fs.existsSync(rutaPdfFinal)) {
                    fs.unlinkSync(rutaPdfFinal); // Elimina el PDF cifrado (después de ser enviado).
                }
            }
        }
        
        console.log('\n🎉 ¡PROCESO DE REPORTE COMPLETADO!');
        
    } catch (error) {
        // Manejo de error FATAL (ej: la BD no responde, fallo de credenciales de email).
        console.error('\n❌ ERROR CRÍTICO AL INICIAR EL PROCESO (Fatal):', error.message);
        // 'throw error' pasa el error a la función que nos llamó (server.js o bot.js) 
        // para que ellos puedan reportarlo al usuario final.
        throw error; 
    }
}

// =================================================================
// 💡 EXPORTACIÓN DEL MÓDULO (Punto de acceso para server.js)
// =================================================================
// 'module.exports' define qué partes de este archivo serán visibles para otros archivos 
// de Node.js que lo importen.
module.exports = {
    generarYEnviarReportes // Exportamos la función principal por su nombre exacto.
};