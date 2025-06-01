/**
 * Function to get insurance backoffice data from Hubtel.
 *
 * @param {Object} args - Arguments for the insurance backoffice request.
 * @param {string} args.startDate - The start date for the query (ISO 8601 format, e.g., "2025-05-28T09:00:00Z").
 * @param {string} args.endDate - The end date for the query (ISO 8601 format, e.g., "2025-05-29T09:00:00Z").
 * @param {boolean} args.isFulfilled - Filter for fulfilled status (true/false).
 * @param {number} args.pagesize - Number of records to return per page (e.g., 100).
 * @param {string} [args.authorization] - Bearer token for authorization (optional, can use environment variable).
 * @returns {Promise<Object>} - The result of the insurance backoffice request.
 */
const executeFunction = async ({ startDate, endDate, isFulfilled, pagesize, authorization }) => {
    const baseUrl = process.env.BASE_URL;

    try {
        // Construct the URL with query parameters
        const url = new URL(`${baseUrl}/backoffice`);
        url.searchParams.append('startDate', startDate);
        url.searchParams.append('endDate', endDate);
        url.searchParams.append('isFulfilled', isFulfilled.toString());
        url.searchParams.append('pagesize', pagesize.toString());

        // Set up headers for the request
        const headers = {
            'Authorization': `Bearer ${process.env.BEARER_TOKEN}`,
            'User-Agent': 'Postman-MCP-Server',
            'Content-Type': 'application/json'
        };

        // Perform the fetch request
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers
        });

        // Check if the response was successful
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Parse and return the response data
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting insurance backoffice data:', error);
        return {
            error: 'An error occurred while getting insurance backoffice data.',
            details: error.message
        };
    }
};

/**
 * Tool configuration for getting insurance backoffice data from Hubtel.
 * @type {Object}
 */
const apiTool = {
    function: executeFunction,
    definition: {
        type: 'function',
        function: {
            name: 'get_insurance_backoffice_data',
            description: 'Get insurance backoffice data from Hubtel within a specified date range with pagination and fulfillment filtering.',
            parameters: {
                type: 'object',
                properties: {
                    startDate: {
                        type: 'string',
                        description: 'The start date for the query in ISO 8601 format (e.g., "2025-05-28T09:00:00Z").'
                    },
                    endDate: {
                        type: 'string',
                        description: 'The end date for the query in ISO 8601 format (e.g., "2025-05-29T09:00:00Z").'
                    },
                    isFulfilled: {
                        type: 'boolean',
                        description: 'Filter for fulfilled status. Set to true to get fulfilled records, false for unfulfilled.'
                    },
                    pagesize: {
                        type: 'integer',
                        description: 'Number of records to return per page (typically 100 or less).',
                        minimum: 1,
                        maximum: 1000
                    }
                },
                required: ['startDate', 'endDate', 'isFulfilled']
            }
        }
    }
};

export { apiTool };

