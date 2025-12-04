import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import expressLayouts from 'express-ejs-layouts';
import { router as sessionRouter } from './src/routes/sessionRoutes.mjs';
import { router as metricsRouter } from './src/routes/metricsRoutes.mjs';
import { router as chatRouter } from './src/routes/chatRoutes.mjs';
import { router as pageRouter } from './src/routes/pageRoutes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use('/', pageRouter);
app.use('/api/session', sessionRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/chat', chatRouter);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(` http://localhost:${PORT}`));
