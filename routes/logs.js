const express = require('express');
const router = express.Router();
const { getAllRows, getRow, runQuery } = require('../database/connection');

// GET /orbis/logs - Listar logs com filtros
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, tabela, user_id, operacao, data_inicio, data_fim, registro_id } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM logs_auditoria WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM logs_auditoria WHERE 1=1';
    let params = [];

    if (tabela) {
      query += ' AND tabela_afetada = ?';
      countQuery += ' AND tabela_afetada = ?';
      params.push(tabela);
    }

    if (user_id) {
      query += ' AND user_id = ?';
      countQuery += ' AND user_id = ?';
      params.push(user_id);
    }

    if (operacao) {
      query += ' AND operacao = ?';
      countQuery += ' AND operacao = ?';
      params.push(operacao);
    }

    if (registro_id) {
      query += ' AND registro_id = ?';
      countQuery += ' AND registro_id = ?';
      params.push(registro_id);
    }

    if (data_inicio) {
      query += ' AND date(data_operacao) >= ?';
      countQuery += ' AND date(data_operacao) >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ' AND date(data_operacao) <= ?';
      countQuery += ' AND date(data_operacao) <= ?';
      params.push(data_fim);
    }

    query += ' ORDER BY data_operacao DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows, countResult] = await Promise.all([
      getAllRows(query, params),
      getRow(countQuery, params.slice(0, -2))
    ]);

    const logs = rows.map(row => ({
      ...row,
      campos_alterados: row.campos_alterados ? JSON.parse(row.campos_alterados) : [],
      valores_anteriores: row.valores_anteriores ? JSON.parse(row.valores_anteriores) : {},
      valores_novos: row.valores_novos ? JSON.parse(row.valores_novos) : {}
    }));

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/logs/:id - Buscar log por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getRow('SELECT * FROM logs_auditoria WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Log não encontrado'
      });
    }

    const log = {
      ...row,
      campos_alterados: row.campos_alterados ? JSON.parse(row.campos_alterados) : [],
      valores_anteriores: row.valores_anteriores ? JSON.parse(row.valores_anteriores) : {},
      valores_novos: row.valores_novos ? JSON.parse(row.valores_novos) : {}
    };

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Erro ao buscar log:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/logs/tabelas - Listar tabelas monitoradas com contadores
router.get('/tabelas', async (req, res) => {
  try {
    const rows = await getAllRows(`
      SELECT tabela_afetada as tabela, COUNT(*) as total_logs
      FROM logs_auditoria
      GROUP BY tabela_afetada
      ORDER BY total_logs DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Erro ao listar tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /orbis/logs/usuarios - Listar usuários com atividade recente
router.get('/usuarios', async (req, res) => {
  try {
    const rows = await getAllRows(`
      SELECT user_id, COUNT(*) as total_operacoes, MAX(data_operacao) as ultima_atividade
      FROM logs_auditoria
      GROUP BY user_id
      ORDER BY ultima_atividade DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;
