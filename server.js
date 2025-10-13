const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const parametrosRoutes = require('./routes/parametros');
const etapasRoutes = require('./routes/etapas');
const rotasRoutes = require('./routes/rotas');
const operacoesRoutes = require('./routes/operacoes');
const coeficientesRoutes = require('./routes/coeficientes');
const regrasRoutes = require('./routes/regras');
const projetosRoutes = require('./routes/projetos');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// API Routes
app.use('/orbis/parametros', parametrosRoutes);
app.use('/orbis/etapas', etapasRoutes);
app.use('/orbis/rotas', rotasRoutes);
app.use('/orbis/operacoes', operacoesRoutes);
app.use('/orbis/coeficientes', coeficientesRoutes);
app.use('/orbis/regras', regrasRoutes);
app.use('/orbis/projetos', projetosRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ORBIS Backend Mock is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Info
app.get('/orbis', (req, res) => {
  res.json({
    name: 'ORBIS Backend Mock',
    version: '1.0.0',
    description: 'API mock para desenvolvimento do sistema ORBIS',
    endpoints: [
      '/orbis/parametros',
      '/orbis/etapas', 
      '/orbis/rotas',
      '/orbis/operacoes',
      '/orbis/coeficientes',
      '/orbis/regras',
      '/orbis/projetos'
    ],
    documentation: 'Ver arquivos de documentação na pasta DOCS_TI_FINAL'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    message: `Rota ${req.method} ${req.originalUrl} não existe`,
    availableEndpoints: [
      'GET /health',
      'GET /orbis',
      'GET/POST/PUT/DELETE /orbis/parametros',
      'GET/POST/PUT/DELETE /orbis/etapas',
      'GET/POST/PUT/DELETE /orbis/rotas',
      'GET/POST/PUT/DELETE /orbis/operacoes',
      'GET/POST/PUT/DELETE /orbis/coeficientes',
      'GET/POST/PUT/DELETE /orbis/regras',
      'GET/POST/PUT/DELETE /orbis/projetos'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ORBIS Backend Mock rodando na porta ${PORT}`);
  console.log(`📚 API Info: http://localhost:${PORT}/orbis`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`🔗 Base URL: http://localhost:${PORT}/orbis`);
});

module.exports = app;