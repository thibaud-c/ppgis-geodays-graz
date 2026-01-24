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
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
    const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const version = url.searchParams.get('version');

    if (isWeb(req)) return handleWeb(req, version);
    return handleNode(req, res, version);
}

function isWeb(req) {
    return typeof req.json === 'function' || req instanceof Request;
}

// Web Standard
async function handleWeb(req, version) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    return await processList((data) => {
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }, (errCode, msg) => {
        return new Response(JSON.stringify({ status: 'error', message: msg }), {
            status: errCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }, version);
}

// Node.js Standard
async function handleNode(req, res, version) {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    await processList((data) => {
        res.status(200).json(data);
    }, (errCode, msg) => {
        res.status(errCode).json({ status: 'error', message: msg });
    }, version);
}

async function processList(onSuccess, onError, version) {
    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
        console.error("Missing Supabase credentials:", {
            hasUrl: !!config.url,
            hasKey: !!config.key
        });
        return onError(500, `Server configuration error: Missing ${!config.url ? 'URL' : ''}${!config.url && !config.key ? ' and ' : ''}${!config.key ? 'Key' : ''}`);
    }

    try {
        const supabase = createClient(config.url, config.key);

        let query = supabase
            .from('ppgis-geodays')
            .select('*')
            .is('deleted_at', null);

        if (version) {
            query = query.eq('version', version);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return onSuccess({ status: 'ok', data });
    } catch (e) {
        console.error('Error fetching markers:', e);
        return onError(500, 'Internal server error');
    }
}
