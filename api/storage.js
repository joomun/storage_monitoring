const odbc = require('odbc');

export default async function handler(req, res) {
    try {
        const db = await odbc.connect(process.env.SYBASE_DSN);
        const result = await db.query("SELECT timestamp, filesystem, total, used, free, mount, account FROM storage_table");
        await db.close();

        res.status(200).json(result);
    } catch (error) {
        console.error("Error connecting to Sybase:", error);
        res.status(500).json({ error: "Failed to connect to Sybase" });
    }
}
