import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes        from './routes/auth.js';
import userRoutes        from './routes/users.js';
import clientRoutes      from './routes/clients.js';
import sampleGroupRoutes from './routes/sampleGroups.js';
import sampleRoutes      from './routes/samples.js';
import testRoutes        from './routes/tests.js';
import testDefRoutes     from './routes/testDefinitions.js';
import reportRoutes      from './routes/reports.js';
import bulkAssignRoutes  from './routes/bulkAssign.js';
import uploadRoutes      from './routes/upload.js';
import auditRoutes       from './routes/audit.js';

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'https://lims-5-v4.vercel.app', credentials: true }));
app.use(express.json());

app.use('/api/auth',             authRoutes);
app.use('/api/users',            userRoutes);
app.use('/api/clients',          clientRoutes);
app.use('/api/sample-groups',    sampleGroupRoutes);
app.use('/api/samples',          sampleRoutes);
app.use('/api/tests',            testRoutes);
app.use('/api/test-definitions', testDefRoutes);   // kept for read-only (bulk assign dropdown)
app.use('/api/reports',          reportRoutes);
app.use('/api/bulk-assign',      bulkAssignRoutes);
app.use('/api/upload',           uploadRoutes);
app.use('/api/audit',            auditRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`🚀 CoalLIMS API v3 → http://localhost:${PORT}`));
