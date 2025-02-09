const { Connection } = require('tds');

const dbConfig = {
    server: process.env.SYBASE_HOST,
    port: parseInt(process.env.SYBASE_PORT, 10),
    options: {
        database: process.env.SYBASE_DATABASE,
        userName: process.env.SYBASE_USER,
        password: process.env.SYBASE_PASSWORD,
        encrypt: false, // Set to true if required by your Sybase server
        rowCollectionOnDone: true, // Ensures rows are collected in the `done` event
    },
};

function convertToBytes(size) {
    if (!size) return 0;
    const units = { P: 1e15, T: 1e12, G: 1e9, M: 1e6, K: 1e3 };
    const unit = size.slice(-1);
    return units[unit] ? parseFloat(size) * units[unit] : parseFloat(size);
}

export default async function handler(req, res) {
    const connection = new Connection(dbConfig);

    try {
        // Connect to the Sybase database
        connection.connect((connectErr) => {
            if (connectErr) {
                console.error('Connection error:', connectErr);
                return res.status(500).json({ error: 'Failed to connect to Sybase database' });
            }

            // Define the query
            const query = `SELECT * FROM RDJ_Storage_Monitoring`; // Update with your actual table

            // Execute the query
            const request = connection.request();
            request.sqlText = query;

            request.on('row', (row) => {
                console.log('Row:', row);
            });

            request.on('done', (result) => {
                const formattedData = result.rows.map((row) => {
                    const totalBytes = convertToBytes(row.total);
                    const usedBytes = convertToBytes(row.used);
                    const freeBytes = convertToBytes(row.free);
                    const percentUsed = totalBytes > 0 ? ((usedBytes / totalBytes) * 100).toFixed(2) : 0;

                    return {
                        timestamp: row.timestamp,
                        filesystem: row.filesystem,
                        total: totalBytes,
                        used: usedBytes,
                        free: freeBytes,
                        percent: percentUsed,
                        mount: row.mount,
                        account: row.account,
                    };
                });

                // Close the connection and send the response
                connection.close();
                res.status(200).json(formattedData);
            });

            request.on('error', (queryErr) => {
                console.error('Query error:', queryErr);
                connection.close();
                res.status(500).json({ error: 'Failed to execute query' });
            });

            connection.execSql(request);
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        if (connection.state === 'LoggedIn') {
            connection.close();
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
