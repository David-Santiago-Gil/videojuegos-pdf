const { Client } = require('pg');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');
const { exec } = require('child_process'); 
// ⚠️ NO NECESITAS INSTALAR O IMPORTAR node-fetch si usas Node.js v18+
require('dotenv').config(); 

// ============ CONFIGURACIÓN (usando .env) ============

const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT), // 🛠️ CORRECCIÓN: Puerto como número
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

const emailDestinatario = process.env.EMAIL_DESTINATARIO;
const PDF_PASSWORD = process.env.PDF_PASSWORD;

// ==============================================================

// 📍 Obtener Ubicación Geográfica por IP (Usa el fetch nativo de Node.js)
async function obtenerUbicacion() {
    console.log('📍 Obteniendo ubicación IP...');
    try {
        // Usamos la API de ip-api.com
        const response = await fetch('http://ip-api.com/json/');
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log(`✅ Ubicación detectada: ${data.city}, ${data.country} (Lat: ${data.lat}, Lon: ${data.lon})`);
            return data;
        } else {
            console.log('⚠️ No se pudo obtener la ubicación IP.');
            return { city: 'Desconocida', country: 'Desconocido', lat: 0, lon: 0 };
        }
    } catch (error) {
        console.error('Error al contactar la API de geolocalización:', error.message);
        return { city: 'Error de Red', country: 'Error', lat: 0, lon: 0 };
    }
}

async function main() {
    let rutaPdfTemp = null;
    let rutaPdfFinal = null; 
    let ubicacion = null; 
    
    try {
        console.log('🎮 === SISTEMA DE GESTIÓN DE VIDEOJUEGOS ===\n');

        // Obtener la ubicación al inicio
        ubicacion = await obtenerUbicacion();
        
        console.log('\n📊 Conectando a PostgreSQL...');
        const videojuegos = await obtenerVideojuegos();
        console.log(`✅ Se obtuvieron ${videojuegos.length} videojuegos\n`);

        console.log('📄 Generando PDF...');
        rutaPdfTemp = await generarPDF(videojuegos, ubicacion); 
        console.log(`✅ PDF temporal generado\n`);
        
        console.log('🔐 Encriptando con QPDF (AES-256)...');
        rutaPdfFinal = await encriptarConQPDF(rutaPdfTemp); 
        console.log(`✅ PDF PROTEGIDO: ${path.basename(rutaPdfFinal)}`);
        console.log(`🔑 CONTRASEÑA: "${PDF_PASSWORD}"\n`);

        console.log('📧 Enviando correo...');
        await enviarCorreo(rutaPdfFinal);
        console.log('✅ Correo enviado exitosamente!\n');
        
        // Limpiar archivos
        if (rutaPdfTemp && fs.existsSync(rutaPdfTemp)) {
            fs.unlinkSync(rutaPdfTemp);
            console.log('🗑️ Archivo temporal eliminado (sin proteger)\n');
        }
        if (rutaPdfFinal && fs.existsSync(rutaPdfFinal)) {
            fs.unlinkSync(rutaPdfFinal);
            console.log('🗑️ Archivo final protegido eliminado (solo se envió por email)\n');
        }

        console.log('🎉 ¡PROCESO COMPLETADO!');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        
        if (error.message.includes('QPDF no está instalado o no está en el PATH')) {
            console.error('\n🔧 SOLUCIÓN:');
            console.error('   1. Verifica que QPDF esté instalado.');
            console.error('   2. **ASEGÚRATE de que la ruta de QPDF esté en el PATH** y Reinicia tu terminal/editor.');
        }
        
        // Limpiar archivos si falló
        if (rutaPdfTemp && fs.existsSync(rutaPdfTemp)) {
            fs.unlinkSync(rutaPdfTemp);
            console.log('🗑️ Archivo temporal eliminado.');
        }
        if (rutaPdfFinal && fs.existsSync(rutaPdfFinal)) {
            fs.unlinkSync(rutaPdfFinal);
            console.log('🗑️ Archivo final eliminado.');
        }
        
        process.exit(1);
    }
}

// Obtener datos de PostgreSQL
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

// Generar PDF con PDFKit
async function generarPDF(videojuegos, ubicacion) {
    return new Promise((resolve, reject) => {
        const nombreArchivo = `TEMP_${Date.now()}.pdf`;
        const rutaPdf = path.join(__dirname, nombreArchivo);
        
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(rutaPdf);
        doc.pipe(stream);

        // TÍTULO
        doc.fontSize(20).font('Helvetica-Bold')
           .text('CATÁLOGO DE VIDEOJUEGOS', { align: 'center' })
           .moveDown(0.5);

        // FECHA y UBICACIÓN 
        doc.fontSize(10).font('Helvetica')
           .text(`Generado: ${new Date().toLocaleString('es-ES')}`, { align: 'left' });
           
        if (ubicacion && ubicacion.city) {
            doc.text(`Ubicación de Servidor: ${ubicacion.city}, ${ubicacion.country}`);
            doc.text(`Coordenadas (aprox.): Lat ${ubicacion.lat} / Lon ${ubicacion.lon}`);
        }
        doc.moveDown(1.5);


        // TABLA - ENCABEZADOS
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

        // TABLA - DATOS
        doc.font('Helvetica').fontSize(10);
        let y = tableTop + 30;
        let totalPrecio = 0;

        videojuegos.forEach((juego, index) => {
            const precio = parseFloat(juego.precio) || 0;
            totalPrecio += precio;

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

        // TOTAL
        y += 10;
        doc.fontSize(12).font('Helvetica-Bold')
           .text(`TOTAL: $${totalPrecio.toFixed(2)}`, 50, y, { width: 460, align: 'right' });

        // PIE DE PÁGINA
        doc.fontSize(8).font('Helvetica')
           .text('Sistema de Gestión de Videojuegos | Documento Protegido',
                     50, doc.page.height - 50, { align: 'center', width: 500 });

        doc.end();
        stream.on('finish', () => resolve(rutaPdf));
        stream.on('error', reject);
    });
}

// 🔐 ENCRIPTAR CON QPDF (Con llamada directa a exec)
async function encriptarConQPDF(rutaPdfOriginal) {
    const nombreFinal = `Videojuegos_PROTEGIDO_${new Date().toISOString().slice(0,10)}.pdf`;
    const rutaPdfFinal = path.join(__dirname, nombreFinal);
    
    console.log('   → Aplicando encriptación AES-256...');

    const comando = `qpdf "${rutaPdfOriginal}" --encrypt ${PDF_PASSWORD} ${PDF_PASSWORD} 256 --print=full --modify=none --extract=n --accessibility=y -- "${rutaPdfFinal}"`;

    return new Promise((resolve, reject) => {
        
        exec(comando, (error, stdout, stderr) => {
            if (error) {
                if (stderr.includes('not found') || stderr.includes('no se reconoce')) {
                     return reject(new Error('QPDF no está instalado o no está en el PATH.'));
                }
                return reject(new Error(`Fallo de QPDF: ${stderr}`));
            }

            if (!fs.existsSync(rutaPdfFinal)) {
                return reject(new Error('PDF encriptado no se creó.'));
            }

            const stats = fs.statSync(rutaPdfFinal);
            console.log(`   → Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log('   ✅ Encriptación AES-256 aplicada');

            resolve(rutaPdfFinal);
        });
    });
}

// Enviar correo con Nodemailer
async function enviarCorreo(rutaPdf) {
    const transporter = nodemailer.createTransport(emailConfig);

    const mailOptions = {
        from: emailConfig.auth.user,
        to: emailDestinatario,
        subject: `🔐 Catálogo Videojuegos PROTEGIDO - ${new Date().toLocaleDateString('es-ES')}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">🎮 Catálogo de Videojuegos</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Documento PROTEGIDO con AES-256</p>
                </div>
                
                <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                    <p style="font-size: 16px;">Hola,</p>
                    <p style="font-size: 16px;">Este PDF está <strong>protegido con encriptación AES-256</strong>.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px;">
                        <p style="margin: 5px 0;"><strong>📅 Generado:</strong> ${new Date().toLocaleString('es-ES')}</p>
                        <p style="margin: 5px 0;"><strong>📁 Archivo:</strong> ${path.basename(rutaPdf)}</p>
                        <p style="margin: 5px 0;"><strong>🔒 Encriptación:</strong> AES-256 bits</p>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 25px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 5px;">
                        <p style="margin: 0 0 15px 0; font-size: 18px; color: #856404;"><strong>🔐 CONTRASEÑA:</strong></p>
                        <div style="background: white; padding: 20px; border-radius: 5px; text-align: center; border: 3px solid #ffc107;">
                            <code style="font-size: 32px; font-weight: bold; color: #d63384; letter-spacing: 4px;">${PDF_PASSWORD}</code>
                        </div>
                    </div>
                    
                    <div style="background: #d1ecf1; padding: 20px; border-left: 4px solid #0dcaf0; margin: 20px 0; border-radius: 5px;">
                        <p style="margin: 0 0 10px 0;"><strong>📖 Para abrir:</strong></p>
                        <ol style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                            <li>Descarga el archivo adjunto</li>
                            <li>Abre con tu lector PDF</li>
                            <li><strong>SE PEDIRÁ CONTRASEÑA</strong></li>
                            <li>Ingresa: <code>${PDF_PASSWORD}</code></li>
                        </ol>
                    </div>
                    
                    <div style="background: #d4edda; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; border-radius: 5px;">
                        <p style="margin: 0 0 10px 0;"><strong>🛡️ Seguridad:</strong></p>
                        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>✅ Encriptación AES-256</li>
                            <li>✅ Requiere contraseña obligatoria</li>
                            <li>✅ Se puede imprimir</li>
                            <li>❌ NO modificable</li>
                            <li>❌ NO copiable</li>
                        </ul>
                    </div>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
                    <p style="color: #6c757d; font-size: 13px; margin: 0;">
                        <strong>Sistema de Gestión de Videojuegos</strong><br>
                        Encriptado con QPDF
                    </p>
                </div>
            </div>
        `,
        attachments: [{ filename: path.basename(rutaPdf), path: rutaPdf }]
    };

    await transporter.sendMail(mailOptions);
}

// Ejecutar
main();