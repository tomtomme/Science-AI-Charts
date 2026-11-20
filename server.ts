import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import {
  getPricingMonitorStatus,
  runPricingCheck,
} from './server/pricingMonitor.ts';
import {
  getGdpxMonitorStatus,
  runGdpxCheck,
  updateGdpxPreferences,
} from './server/gdpxMonitor.ts';
import {
  getIntegrityMonitorStatus,
  runIntegrityCheck,
  updateIntegrityPreferences,
} from './server/integrityMonitor.ts';
import { getOrRefreshWeeklyTranslation } from './server/sheetTranslator.ts';
import { fetchLabsGridFromPublishedHtml } from './server/labsGrid.ts';

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

  app.get('/api/labs-grid', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
      const grid = await fetchLabsGridFromPublishedHtml(forceRefresh);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.json(grid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch labs formatting grid.';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/translations/sheet', async (req, res) => {
    try {
      const body = req.body || {};
      const payload = {
        a1: String(body.a1 || ''),
        c1: String(body.c1 || ''),
        categoryNames: Array.isArray(body.categoryNames) ? body.categoryNames.map(String) : [],
        compositeScoreNames: Array.isArray(body.compositeScoreNames) ? body.compositeScoreNames.map(String) : [],
        retiredCategoryNames: Array.isArray(body.retiredCategoryNames) ? body.retiredCategoryNames.map(String) : [],
        b34: String(body.b34 || ''),
        c34: String(body.c34 || ''),
        n34: String(body.n34 || ''),
        o34: String(body.o34 || ''),
      };
      const force = body.force === true;
      const result = await getOrRefreshWeeklyTranslation(payload, force);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sheet translation failed.';
      res.status(500).json({ error: message });
    }
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
      const statusCode =
        message.includes('GEMINI_API_KEY') || message.includes('Google Sheets connection required')
          ? 400
          : message.includes('429')
          ? 429
          : 500;
      res.status(statusCode).json({ error: message });
    }
  });

  app.get('/api/gdpx-monitor/status', async (_req, res) => {
    try {
      const status = await getGdpxMonitorStatus();
      res.json(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load GDPx monitor status.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/gdpx-monitor/check', async (req, res) => {
    try {
      const models = Array.isArray(req.body?.models) ? req.body.models : undefined;
      const trigger = req.body?.trigger === 'daily_auto' ? 'daily_auto' : 'manual';
      const report = await runGdpxCheck({ models, trigger });
      res.json({ report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GDPx check failed.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/gdpx-monitor/preferences', async (req, res) => {
    try {
      const report = await updateGdpxPreferences({
        ignoreIds: Array.isArray(req.body?.ignoreIds) ? req.body.ignoreIds : undefined,
        unignoreIds: Array.isArray(req.body?.unignoreIds) ? req.body.unignoreIds : undefined,
        manualMappings:
          req.body?.manualMappings && typeof req.body.manualMappings === 'object'
            ? req.body.manualMappings
            : undefined,
        models: Array.isArray(req.body?.models) ? req.body.models : undefined,
      });
      res.json({ report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update GDPx preferences.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/integrity-monitor/status', async (_req, res) => {
    try {
      const status = await getIntegrityMonitorStatus();
      res.json(status);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load Integrity-Bench monitor status.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/integrity-monitor/check', async (req, res) => {
    try {
      const models = Array.isArray(req.body?.models) ? req.body.models : undefined;
      const trigger = req.body?.trigger === 'daily_auto' ? 'daily_auto' : 'manual';
      const report = await runIntegrityCheck({ models, trigger });
      res.json({ report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Integrity-Bench check failed.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/integrity-monitor/preferences', async (req, res) => {
    try {
      const report = await updateIntegrityPreferences({
        ignoreIds: Array.isArray(req.body?.ignoreIds) ? req.body.ignoreIds : undefined,
        unignoreIds: Array.isArray(req.body?.unignoreIds) ? req.body.unignoreIds : undefined,
        manualMappings:
          req.body?.manualMappings && typeof req.body.manualMappings === 'object'
            ? req.body.manualMappings
            : undefined,
        models: Array.isArray(req.body?.models) ? req.body.models : undefined,
      });
      res.json({ report });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update Integrity-Bench preferences.';
      res.status(500).json({ error: message });
    }
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          hmr: !isHmrDisabled,
          ws: isHmrDisabled ? (false as const) : { server: httpServer },
        },
        appType: 'spa',
      })
    );

    if (isHmrDisabled) {
      app.get('/@vite/client', async (_req, res, next) => {
        try {
          const vite = await vitePromise;
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

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
