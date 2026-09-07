const fs = require('fs');
const path = require('path');
const db = require('./database');
require('dotenv').config();

async function migrate() {
    console.log("🚀 Starting migration from JSON to High-Speed MongoDB...");

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("❌ MONGODB_URI is missing in .env! Cannot migrate.");
        process.exit(1);
    }

    await db.connect(uri);

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        return console.log("❌ No data directory found. Nothing to migrate.");
    }

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        const moduleName = file.replace('.json', '');
        const filePath = path.join(dataDir, file);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);
            
            // Handle different JSON structures
            const data = parsed.settings || parsed;

            let count = 0;
            for (const [guildId, settings] of Object.entries(data)) {
                await db.set(moduleName, guildId, settings);
                count++;
            }
            console.log(`✅ Migrated ${count} records from ${file} to module: ${moduleName}`);
        } catch (e) {
            console.error(`❌ Failed migrating ${file}:`, e);
        }
    }

    console.log("\n✨ Migration Complete! You can now delete the .json files and use the cloud database.");
    process.exit(0);
}

migrate();
