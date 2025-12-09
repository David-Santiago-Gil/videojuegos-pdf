const { Client } = require('pg');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');
const { exec } = require('child_process'); 
require('dotenv').config(); 

// ⚠️ RUTA ABSOLUTA DE QPDF ⚠️
// Reemplaza esta ruta si tu qpdf.exe se encuentra en una ubicación diferente.
const QPDF_PATH = 'C:\\qpdf\\bin\\qpdf.exe'; 
// ==============================================================

// ============ CONFIGURACIÓN (usando .env) ============

const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD 
};

const emailConfig = {
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
};

// ==============================================================

// 📍 Obtener Ubicación Geográfica por IP
async function obtenerUbicacion() {
    console.log('📍 Obteniendo ubicación IP...');
    try {
        const response = await fetch('http://ip-api.com/json/');
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log(`✅ Ubicación detectada: ${data.city}, ${data.country} (Lat: ${data.lat}, Lon: ${data.lon})`);
            return data;
        } else {
            return { city: 'Desconocida', country: 'Desconocido', lat: 0, lon: 0 };
        }
    } catch (error) {
        console.error('Error al contactar la API de geolocalización:', error.message);
        return { city: 'Error de Red', country: 'Error', lat: 0, lon: 0 };
    }
}

// Obtener datos de Videojuegos de PostgreSQL
async function obtenerVideojuegos() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        const result = await client.query(
            'SELECT id, nombre, genero, anio, precio FROM videojuegos ORDER BY id'
        );
        return result.rows;
    } finally {
        await client.end();
    }
}

// Obtener la lista de destinatarios (correo y cédula)
async function obtenerDestinatarios() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        const result = await client.query(
            'SELECT cedula, email FROM destinatarios'
        );
        return result.rows; 
    } finally {
        await client.end();
    }
}

// Generar PDF con PDFKit
async function generarPDF(videojuegos, ubicacion) {
    return new Promise((resolve, reject) => {
        const nombreArchivo = `TEMP_${Date.now()}.pdf`;
        const rutaPdf = path.join(__dirname, nombreArchivo);
        
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(rutaPdf);
        doc.pipe(stream);

        // TÍTULO Y UBICACIÓN
        doc.fontSize(20).font('Helvetica-Bold')
           .text('CATÁLOGO DE VIDEOJUEGOS', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(10).font('Helvetica')
           .text(`Generado: ${new Date().toLocaleString('es-ES')}`, { align: 'left' });
           
        if (ubicacion && ubicacion.city) {
            doc.text(`Ubicación de Servidor: ${ubicacion.city}, ${ubicacion.country}`);
        }
        doc.moveDown(1.5);

        // TABLA: Contenido de los 20 juegos
        const tableTop = doc.y;
        const colWidths = { id: 40, nombre: 180, genero: 100, anio: 60, precio: 80 };

        doc.fontSize(11).font('Helvetica-Bold');
        let x = 50;
        doc.rect(x, tableTop, 460, 25).fillAndStroke('#CCCCCC', '#000000');
        
        doc.fillColor('#000000')
           .text('ID', x + 5, tableTop + 7, { width: colWidths.id, align: 'center' });
        x += colWidths.id;
        doc.text('Nombre', x + 5, tableTop + 7, { width: colWidths.nombre, align: 'left' });
        x += colWidths.nombre;
        doc.text('Género', x + 5, tableTop + 7, { width: colWidths.genero, align: 'left' });
        x += colWidths.genero;
        doc.text('Año', x + 5, tableTop + 7, { width: colWidths.anio, align: 'center' });
        x += colWidths.anio;
        doc.text('Precio', x + 5, tableTop + 7, { width: colWidths.precio, align: 'right' });

        doc.font('Helvetica').fontSize(10);
        let y = tableTop + 30;

        videojuegos.forEach((juego, index) => {
            const precio = parseFloat(juego.precio) || 0;

            if (index % 2 === 0) {
                doc.rect(50, y - 5, 460, 20).fill('#F5F5F5');
            }

            x = 50;
            doc.fillColor('#000000')
               .text(juego.id, x + 5, y, { width: colWidths.id, align: 'center' });
            x += colWidths.id;
            doc.text(juego.nombre, x + 5, y, { width: colWidths.nombre, align: 'left' });
            x += colWidths.nombre;
            doc.text(juego.genero || 'N/A', x + 5, y, { width: colWidths.genero, align: 'left' });
            x += colWidths.genero;
            doc.text(juego.anio || '-', x + 5, y, { width: colWidths.anio, align: 'center' });
            x += colWidths.anio;
            doc.text(`$${precio.toFixed(2)}`, x + 5, y, { width: colWidths.precio - 10, align: 'right' });
            y += 20;
        });

        doc.moveDown(2);
        
        doc.fontSize(8).font('Helvetica')
           .text('Documento Protegido con Cédula Personal', 50, doc.page.height - 50, { align: 'center', width: 500 });

        doc.end();
        stream.on('finish', () => resolve(rutaPdf));
        stream.on('error', reject);
    });
}

// 🔐 ENCRIPTAR CON QPDF (Usando la RUTA ABSOLUTA)
async function encriptarConQPDF(rutaPdfOriginal, password) {
    const nombreFinal = `Videojuegos_PROTEGIDO_${new Date().toISOString().slice(0,10)}.pdf`;
    const rutaPdfFinal = path.join(__dirname, nombreFinal);
    
    console.log('   → Aplicando encriptación AES-256...');

    // 💡 Usa la ruta absoluta para evitar el error "QPDF no está en el PATH"
    const comando = `"${QPDF_PATH}" "${rutaPdfOriginal}" --encrypt ${password} ${password} 256 --print=full --modify=none --extract=n --accessibility=y -- "${rutaPdfFinal}"`;

    return new Promise((resolve, reject) => {
        
        exec(comando, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(`QPDF no está instalado o no está en el PATH. Error: ${stderr || error.message}`));
            }
            if (!fs.existsSync(rutaPdfFinal)) {
                return reject(new Error('PDF encriptado no se creó.'));
            }
            console.log('   ✅ Encriptación AES-256 aplicada');
            resolve(rutaPdfFinal);
        });
    });
}

// Enviar correo con Nodemailer (Recibe email y cédula/password)
async function enviarCorreo(rutaPdf, emailDestino, passwordPdf) {
    const transporter = nodemailer.createTransport(emailConfig);

    const mailOptions = {
        from: emailConfig.auth.user,
        to: emailDestino, 
        subject: `🔐 Catálogo Videojuegos PROTEGIDO - ${new Date().toLocaleDateString('es-ES')}`,
        html: `
            <p>Hola,</p>
            <p>Adjuntamos el Catálogo de Videojuegos.</p>
            <p style="font-weight: bold; color: red;">La contraseña para abrir el PDF es su número de cédula:</p>
            <h2 style="color: #007bff;">${passwordPdf}</h2>
            <p>El documento está protegido con cifrado AES-256 bits.</p>
        `,
        attachments: [{ filename: path.basename(rutaPdf), path: rutaPdf }]
    };

    await transporter.sendMail(mailOptions);
}


// FUNCIÓN PRINCIPAL (El Bucle de Envíos)
async function main() {
    let ubicacion = null; 
    
    try {
        console.log('🎮 === SISTEMA DE ENVÍO DE REPORTES PERSONALIZADOS ===\n');

        // 1. Obtener datos estáticos (Ubicación y Videojuegos)
        ubicacion = await obtenerUbicacion();
        console.log('\n📊 Conectando a PostgreSQL para obtener datos...');
        const videojuegos = await obtenerVideojuegos();
        
        const destinatarios = await obtenerDestinatarios();
        console.log(`✅ Se encontraron ${destinatarios.length} destinatarios para procesar.`);


        // 2. Bucle principal: Generar, Encriptar y Enviar para CADA Destinatario
        for (const destinatario of destinatarios) {
            let rutaPdfTemp = null;
            let rutaPdfFinal = null; 
            const email = destinatario.email;
            const cedula = destinatario.cedula; 

            try {
                console.log(`\n---------------------------------`);
                console.log(`➡️ PROCESANDO ENVÍO para: ${email}`);

                // a. Generar PDF
                rutaPdfTemp = await generarPDF(videojuegos, ubicacion); 
                
                // b. Encriptar con la CÉDULA como contraseña
                rutaPdfFinal = await encriptarConQPDF(rutaPdfTemp, cedula); 
                console.log(`🔑 Cédula/Contraseña: "${cedula}"`);

                // c. Enviar el correo personalizado
                console.log('📧 Enviando correo...');
                await enviarCorreo(rutaPdfFinal, email, cedula);
                console.log(`✅ Correo enviado exitosamente a ${email}!\n`);
                
            } catch (error) {
                console.error(`\n❌ ERROR al procesar a ${email}:`, error.message);
            } finally {
                // d. Limpiar archivos 
                if (rutaPdfTemp && fs.existsSync(rutaPdfTemp)) {
                    fs.unlinkSync(rutaPdfTemp);
                }
                if (rutaPdfFinal && fs.existsSync(rutaPdfFinal)) {
                    fs.unlinkSync(rutaPdfFinal);
                }
            }
        }
        
        console.log('🎉 ¡PROCESO COMPLETADO!');
        
    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO DEL SISTEMA:', error.message);
        process.exit(1);
    }
}

// Ejecutar el proceso
main();