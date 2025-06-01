import { writeFileSync } from 'fs';

async function generateFulfilledTransactionsSummary() {
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
        // Construct the URL for fulfilled transactions
        const url = new URL(`${baseUrl}/backoffice`);
        url.searchParams.append('startDate', startDate);
        url.searchParams.append('endDate', endDate);
        url.searchParams.append('isFulfilled', 'true'); // Get fulfilled transactions
        url.searchParams.append('pagesize', '100');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Postman-MCP-Server',
            'Content-Type': 'application/json'
        };

        console.log(`Fetching fulfilled transactions from ${startDate} to ${endDate}...`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();

        // Handle different possible response structures
        let transactions = [];

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

        // Generate individual summaries for each transaction
        let summaries = [];
        let totalAmount = 0;

        transactions.forEach((transaction, index) => {
            const customerName = transaction.customerDetails?.customerName || 'Unknown Customer';
            const customerPhone = transaction.customerDetails?.customerMobileNumber || 'Unknown Phone';
            const amount = parseFloat(transaction.orderDetails?.amountPaid || 0);
            const coverType = transaction.quoteDetails?.riskDetails?.coverType || 'Unknown Coverage';
            const vehicleReg = transaction.quoteDetails?.quoteRequest?.registrationNumber || 'Unknown Vehicle';
            const orderDate = transaction.orderDetails?.orderDate ? new Date(transaction.orderDetails.orderDate).toLocaleDateString() : 'Unknown Date';

            totalAmount += amount;

            const summary = `${index + 1}. ${customerName} (${customerPhone}) purchased ${coverType} insurance for vehicle ${vehicleReg} on ${orderDate} for GHS ${amount.toFixed(2)}.`;
            summaries.push(summary);
        });

        // Create final summary content
        const summaryContent = `Fulfilled Insurance Transactions Since Yesterday:\n\n${summaries.join('\n')}\n\nTotal: ${transactions.length} transactions worth GHS ${totalAmount.toFixed(2)}`;

        // Save to txt file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `fulfilled_transactions_summary_${timestamp}.txt`;

        writeFileSync(filename, summaryContent);

        console.log(`Individual summaries generated for ${transactions.length} transactions`);
        console.log(`Total value: GHS ${totalAmount.toFixed(2)}`);
        console.log(`Saved to: ${filename}`);

        return { summaryContent, filename, data, count: transactions.length, totalAmount };

    } catch (error) {
        const errorSummary = `Failed to retrieve fulfilled transactions since yesterday due to: ${error.message}`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `fulfilled_transactions_error_${timestamp}.txt`;

        writeFileSync(filename, errorSummary);

        console.error('Error:', error);
        console.log(`Error summary saved to: ${filename}`);

        return { summary: errorSummary, filename, error: error.message };
    }
}

// Run the function
generateFulfilledTransactionsSummary(); 