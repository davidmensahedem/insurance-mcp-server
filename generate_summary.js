import { writeFileSync } from 'fs';

async function generateUnfulfilledTransactionsSummary() {
    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(9, 0, 0, 0); // Set to 9 AM

    const today = new Date();
    today.setHours(9, 0, 0, 0); // Set to 9 AM

    const startDate = yesterday.toISOString();
    const endDate = today.toISOString();

    const baseUrl = 'https://instantservicesinsurance.hubtel.com';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzNTUzODEzNy00MmVmLTQzZjUtYTZhMC04NTc0MGVkMWQ4MGIiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9tb2JpbGVwaG9uZSI6IjIzMzU1ODE1NzY2NiIsIm5iZiI6MTc0MjQ3MjYzMywiZXhwIjoxNzc0MDA4NjMzLCJpc3MiOiJodHRwOi8vaHVidGVsLmNvbSIsImF1ZCI6Imh0dHA6Ly9odWJ0ZWwuY29tIn0.my1h37-VLuiecpMW5zvD3A6bimzUYqL8DVgkKwhPdfs';

    try {
        // Construct the URL for unfulfilled transactions
        const url = new URL(`${baseUrl}/backoffice`);
        url.searchParams.append('startDate', startDate);
        url.searchParams.append('endDate', endDate);
        url.searchParams.append('isFulfilled', 'false'); // Get unfulfilled transactions
        url.searchParams.append('pagesize', '100');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Postman-MCP-Server',
            'Content-Type': 'application/json'
        };

        console.log(`Fetching unfulfilled transactions from ${startDate} to ${endDate}...`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        console.log('API Response structure:', JSON.stringify(data, null, 2));

        // Handle different possible response structures
        let transactions = [];
        let transactionCount = 0;
        let totalAmount = 0;

        if (data.data && Array.isArray(data.data)) {
            transactions = data.data;
        } else if (Array.isArray(data)) {
            transactions = data;
        } else if (data.items && Array.isArray(data.items)) {
            transactions = data.items;
        } else if (data.results && Array.isArray(data.results)) {
            transactions = data.results;
        } else if (data.data && data.data.results && Array.isArray(data.data.results)) {
            transactions = data.data.results;
        }

        transactionCount = transactions.length;

        // Calculate total amount if transactions exist
        if (transactions.length > 0) {
            totalAmount = transactions.reduce((sum, transaction) => {
                const amount = parseFloat(transaction.orderDetails?.amountPaid || transaction.amount || transaction.value || transaction.total || 0);
                return sum + amount;
            }, 0);
        }

        const summary = `There were ${transactionCount} unfulfilled insurance transactions since yesterday with a total value of GHS ${totalAmount.toFixed(2)}.`;

        // Save to txt file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `unfulfilled_transactions_summary_${timestamp}.txt`;

        writeFileSync(filename, summary);

        console.log(`Summary generated: ${summary}`);
        console.log(`Saved to: ${filename}`);

        return { summary, filename, data };

    } catch (error) {
        const errorSummary = `Failed to retrieve unfulfilled transactions since yesterday due to: ${error.message}`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `unfulfilled_transactions_error_${timestamp}.txt`;

        writeFileSync(filename, errorSummary);

        console.error('Error:', error);
        console.log(`Error summary saved to: ${filename}`);

        return { summary: errorSummary, filename, error: error.message };
    }
}

// Run the function
generateUnfulfilledTransactionsSummary(); 