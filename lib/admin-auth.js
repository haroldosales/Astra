const crypto = require('node:crypto');

const COOKIE_NAME = 'astra_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function issueAdminSession() {
    const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
    const payload = Buffer.from(JSON.stringify({ expiresAt })).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

function isAdminRequest(request) {
    const cookies = request.headers.cookie || '';
    const token = cookies.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    if (!token || !process.env.ADMIN_SESSION_SECRET) return false;

    const [payload, signature] = decodeURIComponent(token).split('.');
    if (!payload || !signature) return false;

    const expectedSignature = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url');
    if (!safeEqual(signature, expectedSignature)) return false;

    try {
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).expiresAt > Date.now();
    } catch {
        return false;
    }
}

function adminCookie(value, maxAge = SESSION_TTL_SECONDS) {
    const secure = process.env.VERCEL ? '; Secure' : '';
    return `${COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function isSameOrigin(request) {
    const origin = request.headers.origin;
    if (!origin) return true;
    try {
        return new URL(origin).host === request.headers.host;
    } catch {
        return false;
    }
}

module.exports = { adminCookie, isAdminRequest, isSameOrigin, issueAdminSession, safeEqual };