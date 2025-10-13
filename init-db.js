const { createTables } = require('./database/init');
const { seedDatabase } = require('./database/seed');
const { closeDatabase } = require('./database/connection');

async function initializeDatabase() {
  console.log('🚀 Inicializando banco de dados ORBIS...\n');
  
  try {
    // Criar tabelas
    await createTables();
    
    // Popular com dados de exemplo
    await seedDatabase();
    
    console.log('\n✅ Banco de dados inicializado com sucesso!');
    console.log('📊 Dados de exemplo foram inseridos nas tabelas.');
    console.log('🔌 Pronto para usar com o servidor Express.\n');
    
  } catch (error) {
    console.error('\n❌ Erro durante inicialização:', error);
    process.exit(1);
  } finally {
    // Fechar conexão
    await closeDatabase();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };