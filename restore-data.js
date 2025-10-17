const { runQuery, closeDatabase } = require('./database/connection');
const fs = require('fs');
const path = require('path');

async function restoreData() {
  console.log('📥 Restaurando dados do backup...\n');
  
  try {
    const backupPath = path.join(__dirname, 'database', 'backup-data.json');
    
    if (!fs.existsSync(backupPath)) {
      console.log('❌ Arquivo de backup não encontrado!');
      return;
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📅 Backup de: ${backup.timestamp}\n`);

    // Restaurar cada tabela
    for (const [tableName, rows] of Object.entries(backup.tables)) {
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]).filter(col => col !== 'id');
      const placeholders = columns.map(() => '?').join(', ');
      
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        await runQuery(
          `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
      
      console.log(`✅ ${tableName}: ${rows.length} registros restaurados`);
    }

    console.log('\n✅ Dados restaurados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao restaurar dados:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  restoreData();
}

module.exports = { restoreData };
