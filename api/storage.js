const Sybase = require('sybase');

let db = new Sybase(
    process.env.SYBASE_HOST,
    process.env.SYBASE_PORT,
    process.env.SYBASE_DATABASE,
    process.env.SYBASE_USER,
    process.env.SYBASE_PASSWORD
);

function convertToBytes(size) {
    if (!size) return 0;
    const units = { P: 1e15, T: 1e12, G: 1e9, M: 1e6, K: 1e3 };
    const unit = size.slice(-1);
    return units[unit] ? parseFloat(size) * units[unit] : parseFloat(size);
}

export default async function handler(req, res) {
    try {
        await db.connect();
        const query = `SELECT timestamp, filesystem, total, used, free, mount, account FROM storage_table`; // Update with your actual table
        const result = await db.query(query);

        const formattedData = result.map(row => {
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
                account: row.account
            };
        });

        await db.disconnect();
        res.status(200).json(formattedData);
    } catch (error) {
        console.error('Error fetching Sybase data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
