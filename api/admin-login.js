const { adminCookie, isSameOrigin, issueAdminSession, safeEqual } = require('../lib/admin-auth');

module.exports = async function handler(request, response) {
    if (!isSameOrigin(request)) return response.status(403).json({ error: 'Origem não autorizada.' });

    if (request.method === 'DELETE') {
        response.setHeader('Set-Cookie', adminCookie('', 0));
        return response.status(200).json({ ok: true });
    }

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST, DELETE');
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
        return response.status(503).json({ error: 'A autenticação Admin ainda não está configurada na Vercel.' });
    }

    const password = request.body?.password;
    if (typeof password !== 'string' || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
        return response.status(401).json({ error: 'Senha inválida.' });
    }

    response.setHeader('Set-Cookie', adminCookie(issueAdminSession()));
    return response.status(200).json({ ok: true });
};