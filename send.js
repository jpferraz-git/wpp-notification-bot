import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      const groups = await sock.groupFetchAllParticipating();
      const group = Object.values(groups).find(g => g.subject === 'Bonda');

      if (!group) {
        console.error('Group "Bonda" not found!');
        process.exit(1);
      }

      await sock.sendMessage(group.id, { text: 'QUEBRA BOLAS' });
      console.log('Message sent!');
      process.exit(0);
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log('Connection closed with code:', code);
      if (code === DisconnectReason.loggedOut) {
        console.log('Logged out!');
      } else {
        console.log('Reconnecting...');
        connect();
      }
    }
  });
}

connect();