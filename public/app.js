// Format currency values
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(value);
};

// Store the full dataset globally
let fullData = null;

// Update summary cards
const updateSummary = (summary) => {
    document.getElementById('totalGstins').textContent = summary.totalGstins;
    document.getElementById('totalTdsRegistered').textContent = summary.totalTdsRegistered;
    document.getElementById('totalTdsValue').textContent = formatCurrency(summary.totalTdsValue);
    document.getElementById('totalTdsPaid').textContent = formatCurrency(summary.totalTdsPaid);
    document.getElementById('totalTdsPending').textContent = formatCurrency(summary.totalTdsPending);
    document.getElementById('lastUpdated').textContent = `Last Updated: ${new Date().toLocaleString()}`;
};

// Get status badge HTML
const getStatusBadge = (status) => {
    const badges = {
        'FULLY_PAID': 'status-badge status-badge-success',
        'PARTIALLY_PAID': 'status-badge status-badge-warning',
        'NOT_PAID': 'status-badge status-badge-danger',
        'PENDING': 'status-badge status-badge-warning'
    };

    const labels = {
        'FULLY_PAID': 'Paid',
        'PARTIALLY_PAID': 'Partial',
        'NOT_PAID': 'Not Paid',
        'PENDING': 'Pending'
    };

    return `<span class="${badges[status] || badges.NOT_PAID}">${labels[status] || 'Not Paid'}</span>`;
};

// Handle row click for downloading GSTR2A
const handleRowClick = async (gstinNumber) => {
    try {
        const response = await fetch(`/api/gstr2a/download/${gstinNumber}`);
        if (!response.ok) {
            throw new Error('Failed to download file');
        }
        
        // Get the filename from the Content-Disposition header if available
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
            ? contentDisposition.split('filename=')[1].replace(/"/g, '')
            : `${gstinNumber}_GSTR2A.xlsx`;

        // Convert response to blob
        const blob = await response.blob();
        
        // Create download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('Error downloading file:', error);
        alert('Failed to download GSTR2A file. Please try again later.');
    }
};

// Create table row for GSTIN details
const createTableRow = (data) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 animate-fade-in cursor-pointer';
    row.onclick = () => handleRowClick(data.gstinNumber);
    
    const tdsStatus = data.isTdsRegistered
        ? '<span class="status-badge status-badge-registered">Registered</span>'
        : '<span class="status-badge status-badge-unregistered">Not Registered</span>';

    const paymentStatusBadge = getStatusBadge(data.tdsStatus);
    const tdsDifferenceClass = data.tdsDifference > 0 ? 'text-red-600' : 'text-green-600';

    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${data.gstinNumber}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.panNumber}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.legalName}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${data.isTdsRegistered ? 'text-blue-600' : 'text-gray-400'}">${data.tdsGstinNumber}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">${tdsStatus}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.totalInvoices}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${data.eligibleInvoices}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatCurrency(data.totalTdsApplicable)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formatCurrency(data.tdsPaymentDone)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${tdsDifferenceClass}">${formatCurrency(Math.abs(data.tdsDifference))}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">${paymentStatusBadge}</td>
    `;

    return row;
};

// Filter data based on current filter values
const filterData = () => {
    if (!fullData) return [];

    const gstinFilter = document.getElementById('gstinFilter').value.toUpperCase();
    const paymentStatusFilter = document.getElementById('paymentStatusFilter').value;
    const tdsStatusFilter = document.getElementById('tdsStatusFilter').value;

    return fullData.filter(item => {
        // GSTIN filter
        if (gstinFilter && !item.gstinNumber.includes(gstinFilter)) {
            return false;
        }

        // Payment status filter
        if (paymentStatusFilter && item.tdsStatus !== paymentStatusFilter) {
            return false;
        }

        // TDS registration status filter
        if (tdsStatusFilter !== '') {
            const isRegistered = tdsStatusFilter === 'true';
            if (item.isTdsRegistered !== isRegistered) {
                return false;
            }
        }

        return true;
    });
};

// Update table with filtered data
const updateTable = (data) => {
    const tableBody = document.getElementById('gstinTableBody');
    tableBody.innerHTML = ''; // Clear existing content

    if (data.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="10" class="px-6 py-4 text-center text-gray-500">
                No records found matching the current filters
            </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }

    // Add rows
    data.forEach(item => {
        tableBody.appendChild(createTableRow(item));
    });
};

// Setup filter event listeners
const setupFilters = () => {
    const filters = ['gstinFilter', 'paymentStatusFilter', 'tdsStatusFilter'];
    
    filters.forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', () => {
            const filteredData = filterData();
            updateTable(filteredData);
        });
    });

    // Add input event for GSTIN filter for real-time filtering
    document.getElementById('gstinFilter').addEventListener('input', () => {
        const filteredData = filterData();
        updateTable(filteredData);
    });

    // Reset filters
    document.getElementById('resetFilters').addEventListener('click', () => {
        filters.forEach(filterId => {
            document.getElementById(filterId).value = '';
        });
        updateTable(fullData);
    });
};

// Fetch and display data
const fetchData = async () => {
    try {
        const response = await fetch('/api/analytics/tds-report');
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        
        // Store the full dataset
        fullData = data.details;
        
        // Update summary
        updateSummary(data.summary);

        // Update table with all data
        updateTable(fullData);

    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data. Please try again later.');
    }
};

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    fetchData();
    // Refresh data every 5 minutes
    setInterval(fetchData, 300000);
}); 