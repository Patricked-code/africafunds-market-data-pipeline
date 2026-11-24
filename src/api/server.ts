import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pool } from '../db/pool.js';
import { logger } from '../config/logger.js';
import * as query from './queries.js';
import { resolveCorsOrigin } from './cors.js';

const host = process.env.API_HOST || '0.0.0.0';
const port = Number.parseInt(process.env.API_PORT || '8080', 10);
const allowedOrigins = (process.env.DASHBOARD_ORIGINS || '*').split(',').map((value) => value.trim()).filter(Boolean);

function setCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  const allowed = resolveCorsOrigin(origin, allowedOrigins);
  if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept');
}

function json(req: IncomingMessage, res: ServerResponse, status: number, payload: unknown): void {
  setCors(req, res);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(payload));
}

function integerParam(url: URL, key: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(url.searchParams.get(key) || String(fallback), 10);
  return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') { setCors(req, res); res.writeHead(204); res.end(); return; }
  if (req.method !== 'GET') { json(req, res, 405, { ok: false, error: 'method_not_allowed' }); return; }
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') { json(req,res,200,await query.health()); return; }
  if (url.pathname === '/api/v1/status') { json(req,res,200,await query.statusSummary()); return; }
  if (url.pathname === '/api/v1/markets') { json(req,res,200,{ data: await query.markets() }); return; }
  if (url.pathname === '/api/v1/sources') { json(req,res,200,{ data: await query.sources(url) }); return; }
  if (url.pathname === '/api/v1/runs') { json(req,res,200,{ data: await query.runs(integerParam(url,'limit',50,1,500)) }); return; }
  if (url.pathname === '/api/v1/backfill') { json(req,res,200,{ data: await query.backfill(integerParam(url,'limit',100,1,1000)) }); return; }
  if (url.pathname === '/api/v1/indices') { json(req,res,200,{ data: await query.indices(url,integerParam(url,'limit',500,1,5000)) }); return; }
  if (url.pathname === '/api/v1/rates') { json(req,res,200,{ data: await query.rates(url,integerParam(url,'limit',500,1,5000)) }); return; }
  json(req,res,404,{ ok:false,error:'not_found',path:url.pathname });
}

const server=createServer((req,res)=>{ route(req,res).catch((error)=>{ logger.error({ error, url:req.url },'Erreur API'); json(req,res,500,{ ok:false,error:'internal_error' }); }); });
server.listen(port,host,()=>logger.info({ host,port },'API AfricaFunds démarrée'));

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Arrêt de l’API');
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM',()=>void shutdown('SIGTERM'));
process.on('SIGINT',()=>void shutdown('SIGINT'));
