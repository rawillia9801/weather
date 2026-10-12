import tls from 'node:tls';
import { randomBytes } from 'node:crypto';

function mailbox(value) {
  const email = String(value || '').trim();
  if (!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email)) {
    throw new Error('Invalid SMTP email address');
  }
  return email;
}

function encodedHeader(value) {
  const safe = String(value || '').replace(/[\r\n]+/g, ' ').trim();
  return `=?UTF-8?B?${Buffer.from(safe, 'utf8').toString('base64')}?=`;
}

function encodedBody(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
}

function createMessage({ from, to, subject, text, html }) {
  const sender = mailbox(from);
  const recipient = mailbox(to);
  const domain = sender.split('@')[1];
  const boundary = `staley-${randomBytes(14).toString('hex')}`;
  const id = `${Date.now()}.${randomBytes(12).toString('hex')}@${domain}`;
  const parts = [
    `From: ${encodedHeader('Staley Street Weather')} <${sender}>`,
    `To: <${recipient}>`,
    `Subject: ${encodedHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${id}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody(text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody(html),
    `--${boundary}--`,
    '',
  ];
  return { sender, recipient, id, source: parts.join('\r\n') };
}

async function connectSmtp(host, port) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: true,
    });
    socket.setTimeout(25000);
    socket.once('secureConnect', () => resolve(socket));
    socket.once('error', reject);
    socket.once('timeout', () => {
      socket.destroy(new Error('SMTP connection timed out'));
    });
  });
}

function createReplies(socket) {
  let buffer = '';
  let current = [];
  const ready = [];
  const listeners = [];
  let failure = null;

  function fail(error) {
    failure = error instanceof Error ? error : new Error('SMTP connection closed');
    while (listeners.length) listeners.shift().reject(failure);
  }

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    while (buffer.includes('\n')) {
      const end = buffer.indexOf('\n');
      const line = buffer.slice(0, end).replace(/\r$/, '');
      buffer = buffer.slice(end + 1);
      current.push(line);
      if (/^\d{3} /.test(line)) {
        const reply = { code: Number(line.slice(0, 3)), lines: current };
        current = [];
        if (listeners.length) listeners.shift().resolve(reply);
        else ready.push(reply);
      }
    }
  });
  socket.on('error', fail);
  socket.on('close', () => fail(new Error('SMTP connection closed unexpectedly')));

  return function next() {
    if (ready.length) return Promise.resolve(ready.shift());
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => listeners.push({ resolve, reject }));
  };
}

export async function sendSmtpEmail({ host, port = 465, user, password, from, to, subject, text, html }) {
  if (!host || !user || !password) throw new Error('SMTP mailbox credentials are not configured');
  if (Number(port) !== 465) throw new Error('SMTP SSL requires port 465');
  const message = createMessage({ from: from || user, to, subject, text, html });
  const socket = await connectSmtp(host, Number(port));
  const next = createReplies(socket);
  const wait = async (expected) => {
    const response = await next();
    if (!expected.includes(response.code)) {
      const safeDetail = response.lines.join(' ').slice(0, 260);
      throw new Error(`SMTP rejected the request (${response.code}): ${safeDetail}`);
    }
    return response;
  };
  const command = async (value, expected) => {
    socket.write(`${value}\r\n`);
    return wait(expected);
  };

  try {
    await wait([220]);
    await command('EHLO staleyclimate.info', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(user, 'utf8').toString('base64'), [334]);
    await command(Buffer.from(password, 'utf8').toString('base64'), [235]);
    await command(`MAIL FROM:<${message.sender}>`, [250]);
    await command(`RCPT TO:<${message.recipient}>`, [250, 251]);
    await command('DATA', [354]);
    const escaped = message.source.replace(/(^|\r\n)\./g, '$1..');
    socket.write(`${escaped}\r\n.\r\n`);
    await wait([250]);
    await command('QUIT', [221]).catch(() => {});
    return { messageId: message.id, accepted: message.recipient };
  } finally {
    socket.end();
    socket.destroy();
  }
}
