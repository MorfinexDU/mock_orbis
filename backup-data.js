const { getAllRows, closeDatabase } = require('./database/connection');
const fs = require('fs');
const path = require('path');

async function backupData() {
  console.log('📦 Fazendo backup dos dados...\n');
  
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    // Backup de cada tabela
    const tables = [
      'parametros_processo',
      'etapas',
      'rotas',
      'operacoes',
      'tabelas_coeficientes',
      'regras_pos_calculo',
      'projetos'
    ];

    for (const table of tables) {
      const rows = await getAllRows(`SELECT * FROM ${table}`, []);
      backup.tables[table] = rows;
      console.log(`✅ ${table}: ${rows.length} registros`);
    }

    // Salvar em arquivo JSON
    const backupPath = path.join(__dirname, 'database', 'backup-data.json');
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
    
    console.log(`\n✅ Backup salvo em: ${backupPath}`);
    console.log(`📊 Total de tabelas: ${tables.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  backupData();
}

module.exports = { backupData };
