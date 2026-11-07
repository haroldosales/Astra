const { isAdminRequest, isSameOrigin } = require('../lib/admin-auth');
const { saveAdminPassword, verifyAdminPassword } = require('../lib/admin-password');

module.exports = async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    if (!isSameOrigin(request)) return response.status(403).json({ error: 'Origem não autorizada.' });
    if (!isAdminRequest(request)) return response.status(401).json({ error: 'Acesso Admin necessário.' });

    const { currentPassword, newPassword } = request.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
        newPassword.length < 12 || newPassword.length > 128) {
        return response.status(400).json({ error: 'A nova senha deve ter entre 12 e 128 caracteres.' });
    }

    try {
        if (!await verifyAdminPassword(currentPassword)) {
            return response.status(401).json({ error: 'Senha atual inválida.' });
        }

        await saveAdminPassword(newPassword);
        return response.status(200).json({ ok: true });
    } catch (error) {
        console.error('Could not update Admin password.', error);
        return response.status(503).json({ error: 'Não foi possível atualizar a senha. Verifique o armazenamento da Vercel.' });
    }
};
