import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
    return {
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    };
};

// CORS headers for Web Response
const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
};

// Main Export
export default async function handler(req, res) {
    if (isWeb(req)) {
        return handleWeb(req);
    } else {
        return handleNode(req, res);
    }
}

// Check if Request is Web Standard
function isWeb(req) {
    return typeof req.json === 'function' || req instanceof Request;
}

// Web Standard Handler
async function handleWeb(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        return await processSave(body, (data) => {
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

// Node.js Handler
async function handleNode(req, res) {
    // Set CORS Headers
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    try {
        await processSave(req.body, (data) => {
            res.status(200).json(data);
        }, (errCode, msg) => {
            res.status(errCode).json({ status: 'error', message: msg });
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
}

// Logic Shared
async function processSave(body, onSuccess, onError) {
    const { id, latitude, longitude, sentiment, comment, version } = body || {};

    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
        console.error("Missing Supabase credentials:", {
            hasUrl: !!config.url,
            hasKey: !!config.key
        });
        return onError(500, `Server configuration error: Missing ${!config.url ? 'URL' : ''}${!config.url && !config.key ? ' and ' : ''}${!config.key ? 'Key' : ''}`);
    }

    const supabase = createClient(config.url, config.key);

    let data, error;

    if (id) {
        // UPDATE
        ({ data, error } = await supabase
            .from('ppgis-geodays')
            .update({
                sentiment,
                comment,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single());
    } else {
        // INSERT
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return onError(400, 'Invalid coordinates');
        }

        if (!['like', 'dislike'].includes(sentiment)) {
            return onError(400, 'Sentiment must be "like" or "dislike"');
        }

        ({ data, error } = await supabase
            .from('ppgis-geodays')
            .insert([
                {
                    latitude,
                    longitude,
                    sentiment,
                    comment,
                    version: typeof version === 'number' ? version : null
                },
            ])
            .select()
            .single());
    }

    if (error) {
        console.error('Supabase error:', error);
        throw error;
    }

    return onSuccess({ status: 'ok', data });
}
