import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import {
  getPricingMonitorStatus,
  runPricingCheck,
  startDailyPricingScheduler,
} from './server/pricingMonitor.ts';

async function createAppServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const port =
    process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
    });
  });

  app.get('/api/pricing-monitor/status', async (_req, res) => {
    try {
      const status = await getPricingMonitorStatus();
      res.json(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load pricing monitor status.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/pricing-monitor/check', async (req, res) => {
    try {
      const models = Array.isArray(req.body?.models) ? req.body.models : undefined;
      const trigger = req.body?.trigger === 'daily_auto' ? 'daily_auto' : 'manual';
      const report = await runPricingCheck({ models, trigger });
      res.json({ report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pricing check failed.';
      const statusCode = message.includes('GEMINI_API_KEY')
        ? 400
        : message.includes('429')
        ? 429
        : 500;
      res.status(statusCode).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        ...(isHmrDisabled ? { ws: false as const } : {}),
      },
      appType: 'spa',
    });

    if (isHmrDisabled) {
      app.get('/@vite/client', async (_req, res, next) => {
        try {
          const result = await vite.transformRequest('/@vite/client');
          if (!result) return next();
          const code = result.code.replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* HMR WebSocket connection disabled via DISABLE_HMR=true */'
          );
          res.status(200).type('application/javascript').send(code);
        } catch (err) {
          next(err);
        }
      });
    }

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
    startDailyPricingScheduler();
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
