/**
 * API client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

if (!API_BASE_URL && import.meta.env.PROD) {
    console.warn("VITE_API_BASE_URL is not set. API calls will fail on static hosting.");
}

/**
 * Save marker to backend
 */
/**
 * Save marker to backend (Create or Update)
 */
export async function saveMarker(data: {
    id?: string;
    latitude?: number;
    longitude?: number;
    sentiment?: 'like' | 'dislike';
    comment?: string;
    version?: number;
}) {
    const response = await fetch(`${API_BASE_URL}/api/save-marker`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save marker');
    }

    return response.json();
}

/**
 * Soft delete a marker
 */
export async function deleteMarker(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/delete-marker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete marker');
    }

    return response.json();
}

/**
 * Get all active markers (optionally filtered by version)
 */
export async function getMarkers(version?: number | string) {
    let url = `${API_BASE_URL}/api/markers`;
    if (version !== undefined && version !== null && version !== '') {
        url += `?version=${version}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Failed to fetch markers');
    }

    const json = await response.json();
    return json.data;
}
