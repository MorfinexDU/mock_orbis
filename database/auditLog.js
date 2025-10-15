const { runQuery } = require('./connection');

async function registrarLog(tabela, registro_id, operacao, valores_anteriores, valores_novos, user_id, observacoes = null) {
  try {
    const campos_alterados = valores_anteriores && valores_novos 
      ? Object.keys(valores_novos).filter(key => {
          const oldVal = JSON.stringify(valores_anteriores[key]);
          const newVal = JSON.stringify(valores_novos[key]);
          return oldVal !== newVal;
        })
      : [];

    await runQuery(`
      INSERT INTO logs_auditoria 
      (tabela_afetada, registro_id, operacao, campos_alterados, valores_anteriores, valores_novos, user_id, observacoes, data_operacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      tabela,
      String(registro_id),
      operacao,
      JSON.stringify(campos_alterados),
      JSON.stringify(valores_anteriores || {}),
      JSON.stringify(valores_novos || {}),
      user_id || 'system',
      observacoes
    ]);
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error);
  }
}

module.exports = { registrarLog };
