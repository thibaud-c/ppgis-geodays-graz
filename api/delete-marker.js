import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
    return {
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    };
};

const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
    if (isWeb(req)) return handleWeb(req);
    return handleNode(req, res);
}

function isWeb(req) {
    return typeof req.json === 'function' || req instanceof Request;
}

// Web Standard
async function handleWeb(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST' && req.method !== 'DELETE') {
        return new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        return await processDelete(body, (data) => {
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }, (errCode, msg) => {
            return new Response(JSON.stringify({ status: 'error', message: msg }), {
                status: errCode,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        });
    } catch (e) {
        return new Response(JSON.stringify({ status: 'error', message: e.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}

// Node.js Standard
async function handleNode(req, res) {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST' && req.method !== 'DELETE') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    try {
        await processDelete(req.body, (data) => {
            res.status(200).json(data);
        }, (errCode, msg) => {
            res.status(errCode).json({ status: 'error', message: msg });
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
}

async function processDelete(body, onSuccess, onError) {
    const { id } = body || {};

    if (!id) return onError(400, 'Missing ID');

    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
        console.error("Missing Supabase credentials:", {
            hasUrl: !!config.url,
            hasKey: !!config.key
        });
        return onError(500, `Server configuration error: Missing ${!config.url ? 'URL' : ''}${!config.url && !config.key ? ' and ' : ''}${!config.key ? 'Key' : ''}`);
    }

    const supabase = createClient(config.url, config.key);

    const { error } = await supabase
        .from('ppgis-geodays')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error('Supabase error:', error);
        throw error;
    }

    return onSuccess({ status: 'ok', message: 'Marker deleted' });
}
