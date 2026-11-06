const { get, put } = require('@vercel/blob');
const { isAdminRequest, isSameOrigin } = require('../lib/admin-auth');

const STATE_PATH = 'astra-state.json';
const MAX_STATE_BYTES = 1024 * 1024;

module.exports = async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');

    if (request.method === 'GET') {
        try {
            const blob = await get(STATE_PATH, { access: 'private', useCache: false });
            if (!blob) return response.status(200).json({ state: null });
            const state = JSON.parse(await new Response(blob.stream).text());
            return response.status(200).json({ state });
        } catch (error) {
            console.error('Could not read shared Astra state.', error);
            return response.status(503).json({ error: 'Armazenamento da Vercel indisponível.' });
        }
    }

    if (request.method !== 'PUT') {
        response.setHeader('Allow', 'GET, PUT');
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    if (!isSameOrigin(request)) return response.status(403).json({ error: 'Origem não autorizada.' });
    if (!isAdminRequest(request)) return response.status(401).json({ error: 'Acesso Admin necessário.' });

    const state = request.body?.state;
    if (!state || !Array.isArray(state.captains) || !Array.isArray(state.players) || !Array.isArray(state.teams)) {
        return response.status(400).json({ error: 'Formato de estado inválido.' });
    }

    const serializedState = JSON.stringify(state);
    if (Buffer.byteLength(serializedState, 'utf8') > MAX_STATE_BYTES) {
        return response.status(413).json({ error: 'O estado do draft excede o limite permitido.' });
    }

    try {
        await put(STATE_PATH, serializedState, {
            access: 'private',
            allowOverwrite: true,
            addRandomSuffix: false,
            contentType: 'application/json',
            cacheControlMaxAge: 60
        });
        return response.status(200).json({ ok: true });
    } catch (error) {
        console.error('Could not save shared Astra state.', error);
        return response.status(503).json({ error: 'Não foi possível salvar no armazenamento da Vercel.' });
    }
};