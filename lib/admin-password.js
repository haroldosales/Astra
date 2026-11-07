const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { get, put } = require('@vercel/blob');
const { safeEqual } = require('./admin-auth');

const scrypt = promisify(crypto.scrypt);
const PASSWORD_PATH = 'astra-admin-password.json';
const KEY_LENGTH = 64;

async function readAdminPassword() {
    const blob = await get(PASSWORD_PATH, { access: 'private', useCache: false });
    if (!blob) return null;

    const credential = JSON.parse(await new Response(blob.stream).text());
    if (credential?.version !== 1 || typeof credential.salt !== 'string' || typeof credential.hash !== 'string') {
        throw new Error('Stored Admin password has an invalid format.');
    }

    return credential;
}

async function verifyAdminPassword(password) {
    const credential = await readAdminPassword();
    if (!credential) {
        return typeof process.env.ADMIN_PASSWORD === 'string' &&
            process.env.ADMIN_PASSWORD.length > 0 &&
            safeEqual(password, process.env.ADMIN_PASSWORD);
    }

    const expectedHash = Buffer.from(credential.hash, 'base64');
    const actualHash = await scrypt(password, Buffer.from(credential.salt, 'base64'), KEY_LENGTH);
    return expectedHash.length === KEY_LENGTH && crypto.timingSafeEqual(actualHash, expectedHash);
}

async function saveAdminPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = await scrypt(password, salt, KEY_LENGTH);
    await put(PASSWORD_PATH, JSON.stringify({
        version: 1,
        salt: salt.toString('base64'),
        hash: hash.toString('base64')
    }), {
        access: 'private',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
        cacheControlMaxAge: 0
    });
}

module.exports = { saveAdminPassword, verifyAdminPassword };
