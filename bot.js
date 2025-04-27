const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Objeto Mensaje como lo tenías, sin cambios

const Mensaje = {
    infoTurnos: {
      dias: [
        { dia: 'Lunes', horario: '16 a 18 hs' },
        { dia: 'Jueves', horario: '17 a 20 hs' },
      ],
      instrucciones: [
        'Dejar por escrito:',
        '- NOMBRE',
        '- APELLIDO',
        '- DNI',
        '- PREPAGA',
      ],
      adicional: 'Para turnos de Estudio, enviar foto de la orden.'
    },
    infoBiopsias: 'Si tiene biopsia, se ve los días lunes con turno.',
    horariosDoctor: [
      { dia: 'Lunes', horario: '16:00 a 19:00 hs' },
      { dia: 'Jueves', horario: '14:30 a 19:00 hs' },
    ],
    doctor: 'Dr. Thome Marcelo, Gastroenterologo',
    mensaje_peticion: '**No se atienden urgencias**',
    direccion: 'Av Maipu 1585 12 B, Vte Lopez',
    telefono_fijo: '4795-0444',
    mail_consultorio:'consultoriodrthome@gmail.com'
};


const RESPONDED_FILE = path.join(__dirname, 'responded.json');
let respondedContacts = new Set();

function loadRespondedContacts() {
    if (fs.existsSync(RESPONDED_FILE)) {
        try {
            const data = fs.readFileSync(RESPONDED_FILE);
            const ids = JSON.parse(data);
            respondedContacts = new Set(ids);
        } catch (err) {
            console.error('Error al cargar responded.json:', err);
        }
    }
}

function saveRespondedContacts() {
    fs.writeFileSync(RESPONDED_FILE, JSON.stringify([...respondedContacts], null, 2));
}

loadRespondedContacts();

function generarMensaje(mensaje) {
    let texto = '📅 *Los turnos se dan los dias:*\n';
    mensaje.infoTurnos.dias.forEach(dia => {
        texto += `- ${dia.dia}: ${dia.horario}\n`;
    });

    texto += `\n📝 *${mensaje.infoTurnos.instrucciones[0]}*\n`;
    mensaje.infoTurnos.instrucciones.slice(1).forEach(item => {
        texto += `${item}\n`;
    });

    texto += `\n📷 ${mensaje.infoTurnos.adicional}\n\n`;
    texto += `🧪 *Biopsias:* ${mensaje.infoBiopsias}\n\n`;
    texto += `*${mensaje.doctor}* atiende consultorio:\n`;
    mensaje.horariosDoctor.forEach(horario => {
        texto += `- ${horario.dia}: ${horario.horario}\n`;
    });

    texto += `\n📍 *Dirección:* ${mensaje.direccion}\n`;

    texto += `📞 *Teléfono del consultorio:* ${mensaje.telefono_fijo}\n`;

    texto += `📧 *Email:* ${mensaje.mail_consultorio}\n`;

    texto += `\n⚠️ ${mensaje.mensaje_peticion}`;

    return texto;
}

const client = new Client({
    authStrategy: new LocalAuth(),  // <- esto te falta agregar para que no tengas que escanear QR siempre
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot listo para recibir mensajes');
});

client.on('message', async (message) => {
    if (message.from.includes('@g.us')) return; // Ignorar grupos

    const contact = await message.getContact();
    const contactId = contact.id._serialized;

    if (!respondedContacts.has(contactId)) { // <--- Primero chequeás
        respondedContacts.add(contactId); // <-- MARCAR antes de mandar
        saveRespondedContacts();          // <-- GUARDAR antes de mandar

        const textoMensaje = generarMensaje(Mensaje);
        await client.sendMessage(message.from, textoMensaje); // <--- Después mandás el mensaje
        console.log(`✅ Respondí a ${contact.pushname || contact.number}`);
    } else {
        console.log(`ℹ️ Ya le había respondido a ${contact.pushname || contact.number}`);
    }
});

client.initialize();

