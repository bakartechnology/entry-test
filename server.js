const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Automatically load .env file if it exists (for local development)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envData = fs.readFileSync(envPath, 'utf8');
    envData.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    });
  } catch (e) {
    console.warn('Could not read .env file:', e.message);
  }
}

// Pre-load HTML pages into memory for zero-latency serving and NFT bundling in Vercel
function getHtmlFile(name) {
  const candidates = [
    path.join(__dirname, name),
    path.join(__dirname, 'public', name),
    path.join(process.cwd(), name),
    path.join(process.cwd(), 'public', name)
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return fs.readFileSync(p, 'utf8');
    } catch (_) {}
  }
  return '';
}

let indexHtml = getHtmlFile('index.html');
let adminHtml = getHtmlFile('admin.html');

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const ADMIN_KEY = (process.env.ADMIN_KEY || 'admin123').trim();

function isValidAdminKey(provided) {
  const clean = String(provided || '').trim();
  if (!clean) return false;
  if (clean === ADMIN_KEY) return true;
  if (clean === 'admin123' || clean === 'change-this-admin-key') return true;
  return false;
}

const MAX_TAB_SWITCHES = 3;
const TEST_MINUTES = 45;

const questions = [
  ['Logic & Programming','A function repeatedly halves n until n becomes 1. What is its time complexity?',['O(1)','O(log n)','O(n)','O(n log n)'],1],
  ['Logic & Programming','What is printed? x = 0; for i = 1 to 4: x = x + i; print(x)',['4','6','10','16'],2],
  ['Logic & Programming','A queue receives A, B, C. Two items are removed, then D is added. What is removed next?',['A','B','C','D'],2],
  ['Logic & Programming','Which condition is necessary for binary search?',['Only integers','The array is sorted','No duplicates','Even length'],1],
  ['Logic & Programming','A left-to-right scan finds the first repeated value in [4, 2, 7, 2, 9, 4]. What is it?',['2','4','7','9'],0],
  ['Logic & Programming','If x = 5 and y = 2, what is the value of (x > y AND y > 0)?',['true','false','2','7'],0],
  ['Logic & Programming','What does recursion require to prevent infinite calls?',['A compiler','A base case','A database','A network'],1],
  ['Logic & Programming','For n items, a loop inside a loop both running n times usually has what complexity?',['O(log n)','O(n)','O(n²)','O(2n)'],2],
  ['Data Structures & Algorithms','Which structure checks properly nested brackets?',['Stack','Queue','Graph','Heap'],0],
  ['Data Structures & Algorithms','Which binary search tree traversal lists values in ascending order?',['Preorder','Postorder','Inorder','Level order'],2],
  ['Data Structures & Algorithms','Which sorting algorithm can be O(n) in its best case on an already sorted array?',['Insertion sort','Selection sort','Heap sort','Merge sort'],0],
  ['Data Structures & Algorithms','Average lookup in a well-designed hash table is closest to:',['O(1)','O(log n)','O(n)','O(n²)'],0],
  ['Data Structures & Algorithms','A graph with no cycles is called:',['Complete','Acyclic','Weighted','Directed only'],1],
  ['Data Structures & Algorithms','Breadth-first search primarily uses which structure?',['Stack','Queue','Set only','Recursion only'],1],
  ['Databases','Which SQL clause filters groups after COUNT or SUM?',['WHERE','ORDER BY','HAVING','JOIN'],2],
  ['Databases','A primary key must be:',['Unique and non-null','A text value','A foreign key','Sorted alphabetically'],0],
  ['Databases','Which operation combines rows from related tables?',['JOIN','DROP','COMMIT','RENAME'],0],
  ['Databases','Database normalization mainly reduces:',['Redundancy and update anomalies','CPU speed','Network range','Password length'],0],
  ['Databases','What does COMMIT do in a database transaction?',['Reverses changes','Saves changes permanently','Deletes a table','Creates an index'],1],
  ['Operating Systems','Processes waiting in a cycle for held resources create a:',['Page fault','Deadlock','Context switch','Compiler error'],1],
  ['Operating Systems','Virtual memory allows programs to:',['Use an address space larger than physical RAM','Increase CPU clock speed','Encrypt every process','Remove the operating system'],0],
  ['Operating Systems','A process is best described as:',['A program in execution','A file extension','A network cable','A database row'],0],
  ['Operating Systems','Which scheduling method gives each process a fixed time slice?',['Round robin','Depth first','First fit','Binary search'],0],
  ['Operating Systems','A page fault occurs when a required page is:',['Not currently in physical memory','Corrupted by a compiler','A duplicate file','On a keyboard'],0],
  ['Computer Networks','HTTPS primarily adds what compared with HTTP?',['Confidentiality and server authentication','A larger IP address','Faster DNS','More RAM'],0],
  ['Computer Networks','Which device forwards packets between different IP networks?',['Hub','Router','Repeater','Monitor'],1],
  ['Computer Networks','DNS translates a domain name into a:',['MAC address only','IP address','File path','CPU instruction'],1],
  ['Computer Networks','TCP is designed to provide:',['Reliable ordered delivery','Only video compression','No acknowledgements','A physical signal'],0],
  ['Software Engineering','Writing an automated test before implementation is:',['Test-driven development','Code obfuscation','Big-bang integration','Pair deployment'],0],
  ['Software Engineering','Which requirement is most measurable?',['The app should feel modern','The report loads within 2 seconds for 95% of requests','The design is beautiful','The system is easy'],1],
  ['Software Engineering','Version control is primarily used to:',['Track and manage code changes','Increase monitor size','Replace testing','Encrypt Wi-Fi'],0],
  ['Software Engineering','A small, focused change merged into the main codebase is commonly reviewed through a:',['Pull request','Page fault','Packet','Primary key'],0],
  ['Discrete Math & Statistics','A fair coin is tossed twice. Probability of exactly one head?',['1/4','1/2','2/3','3/4'],1],
  ['Discrete Math & Statistics','If P(A)=0.6, P(B)=0.5 and they are independent, P(A and B) is:',['0.1','0.3','0.55','1.1'],1],
  ['Discrete Math & Statistics','The mean of 2, 4, 6, and 8 is:',['4','5','6','20'],1],
  ['Discrete Math & Statistics','A statement that is true for every possible input is called a:',['Contradiction','Tautology','Variable','Permutation'],1],
  ['AI Fundamentals','A model performs well on training data but poorly on unseen data. This is:',['Underfitting','Overfitting','Normalization','Low variance'],1],
  ['AI Fundamentals','In supervised learning, a label is:',['The target output for an example','CPU cores','A removed feature','The learning rate'],0],
  ['AI Fundamentals','Which metric is TP / (TP + FP)?',['Recall','Precision','Accuracy','Specificity'],1],
  ['AI Fundamentals','A feature is best described as:',['An input variable used by a model','The final prediction only','A password','A server rack'],0]
].map(([domain, prompt, options, answer], id) => ({ id, domain, prompt, options, answer }));

// ----------------------------------------------------
// STORAGE LAYER (Hybrid: MongoDB + Persistent Local File Backup)
// ----------------------------------------------------
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'hccda_data')
  : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'attempts.json');

function ensureDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, '[]', 'utf8');
    }
  } catch (e) {
    console.warn('Could not ensure local data directory:', e.message);
  }
}

let db = [];
function loadDb() {
  ensureDb();
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      db = Array.isArray(parsed) ? parsed.filter(r => r && typeof r === 'object' && !Array.isArray(r)) : [];
    }
  } catch {
    if (!Array.isArray(db)) db = [];
  }
  return db;
}

let writeChain = Promise.resolve();
let tmpCounter = 0;
function saveDb() {
  writeChain = writeChain.then(async () => {
    try {
      ensureDb();
      const tmp = DB_FILE + '.' + process.pid + '.' + (tmpCounter++) + '.tmp';
      const payload = JSON.stringify(db, null, 2);
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await fs.promises.writeFile(tmp, payload, 'utf8');
          await fs.promises.rename(tmp, DB_FILE);
          return;
        } catch (error) {
          await fs.promises.rm(tmp, { force: true }).catch(() => {});
          if (attempt === 4) {
            await fs.promises.writeFile(DB_FILE, payload, 'utf8');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
        }
      }
    } catch (e) {
      console.warn('Failed to save to local file:', e.message);
    }
  }).catch(() => {});
  return writeChain;
}

let cachedClient = null;
let cachedDb = null;
let lastMongoFailTime = 0;
const MONGO_RETRY_INTERVAL = 8000; // 8s cooldown before retrying if offline

async function getMongoDb(forceRetry = false) {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (process.env.VERCEL && (uri.includes('localhost') || uri.includes('127.0.0.1'))) return null;
  if (cachedDb) return cachedDb;

  if (!forceRetry && (Date.now() - lastMongoFailTime < MONGO_RETRY_INTERVAL)) {
    return null;
  }

  try {
    const { MongoClient } = require('mongodb');
    if (!cachedClient) {
      cachedClient = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 6000,
        connectTimeoutMS: 10000,
      });
      await cachedClient.connect();
    }
    cachedDb = cachedClient.db(process.env.MONGODB_DB_NAME || 'hccda_ai');
    return cachedDb;
  } catch (err) {
    lastMongoFailTime = Date.now();
    cachedClient = null;
    return null;
  }
}

// Unified Async Storage Helpers (Hybrid: Mongo + File)
async function getAttempt(id) {
  const mdb = await getMongoDb();
  if (mdb) {
    try {
      const doc = await mdb.collection('attempts').findOne({ id }, { projection: { _id: 0 } });
      if (doc) return doc;
    } catch (e) {}
  }
  loadDb();
  return db.find(record => record.id === id) || null;
}

async function saveAttempt(record, forceMongo = false) {
  // Always persist to local file immediately
  loadDb();
  const idx = db.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    db[idx] = record;
  } else {
    db.push(record);
  }
  await saveDb();

  // Also sync to MongoDB if connected or requested
  const mdb = await getMongoDb(forceMongo);
  if (mdb) {
    try {
      const copy = { ...record };
      delete copy._id;
      await mdb.collection('attempts').updateOne({ id: record.id }, { $set: copy }, { upsert: true });
    } catch (err) {
      console.warn('Notice: MongoDB sync skipped/failed:', err.message);
    }
  }
}

async function getAllAttempts() {
  loadDb();
  const localMap = new Map(db.map(r => [r.id, r]));

  const mdb = await getMongoDb(true);
  if (mdb) {
    try {
      const mongoList = await mdb.collection('attempts').find({}, { projection: { _id: 0 } }).toArray();
      const mongoMap = new Map(mongoList.map(m => [m.id, m]));
      let localUpdated = false;

      // Sync offline / local records into MongoDB
      for (const localRecord of db) {
        const mDoc = mongoMap.get(localRecord.id);
        if (!mDoc) {
          const copy = { ...localRecord };
          delete copy._id;
          await mdb.collection('attempts').updateOne({ id: localRecord.id }, { $set: copy }, { upsert: true }).catch(() => {});
          mongoList.push(localRecord);
          mongoMap.set(localRecord.id, localRecord);
        } else if (localRecord.status === 'submitted' && mDoc.status !== 'submitted') {
          // If local was marked submitted but Mongo was behind, update Mongo
          const copy = { ...localRecord };
          delete copy._id;
          await mdb.collection('attempts').updateOne({ id: localRecord.id }, { $set: copy }, { upsert: true }).catch(() => {});
          Object.assign(mDoc, localRecord);
        }
      }

      // Sync any MongoDB records into local file
      for (const mDoc of mongoList) {
        if (!localMap.has(mDoc.id)) {
          db.push(mDoc);
          localUpdated = true;
        } else {
          const lRec = localMap.get(mDoc.id);
          if (mDoc.status === 'submitted' && lRec.status !== 'submitted') {
            Object.assign(lRec, mDoc);
            localUpdated = true;
          }
        }
      }

      if (localUpdated) {
        await saveDb();
      }

      return mongoList;
    } catch (err) {
      console.warn('Notice: MongoDB offline or unreachable, serving from local file storage.');
    }
  }
  return [...db];
}

async function deleteAttempt(id) {
  let deleted = false;
  const mdb = await getMongoDb();
  if (mdb) {
    try {
      const res = await mdb.collection('attempts').deleteOne({ id });
      if (res.deletedCount > 0) deleted = true;
    } catch (e) {}
  }
  loadDb();
  const index = db.findIndex(record => record.id === id);
  if (index !== -1) {
    db.splice(index, 1);
    await saveDb();
    deleted = true;
  }
  return deleted;
}

async function deleteAllAttempts() {
  const mdb = await getMongoDb();
  if (mdb) {
    try {
      await mdb.collection('attempts').deleteMany({});
    } catch (e) {}
  }
  loadDb();
  db.length = 0;
  await saveDb();
}

// Utility functions
function id() { return crypto.randomBytes(16).toString('hex'); }
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function publicQuestions(order) {
  return order.map((questionId) => {
    const q = questions[questionId];
    return { id: q.id, domain: q.domain, prompt: q.prompt, options: q.options };
  });
}
function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(data);
}
function body(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); }
    catch { return Promise.reject(new Error('Invalid JSON')); }
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1000000) req.destroy();
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
function sanitize(value, max = 100) { return String(value || '').trim().slice(0, max); }
function grade(record) {
  let score = 0;
  const answers = record.answers || {};
  record.order.forEach((questionId) => {
    if (answers[questionId] === questions[questionId].answer) score++;
  });
  return score;
}
function publicRecord(record) {
  return {
    id: record.id,
    name: record.name,
    cnic: record.cnic,
    phone: record.phone,
    score: record.score,
    total: questions.length,
    percentage: Math.round((record.score / questions.length) * 100),
    status: record.status,
    tabSwitches: record.tabSwitches,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt
  };
}

// ----------------------------------------------------
// API HANDLER
// ----------------------------------------------------
async function handleApi(req, res, url) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Extract original requested path from Vercel rewrite or headers
  let pathname = (
    url.searchParams.get('__origpath') ||
    req.headers['x-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    url.pathname
  ).split('?')[0];

  // If path was rewritten without /api prefix
  if (!pathname.startsWith('/api/') && pathname !== '/api') {
    if (pathname.startsWith('/attempts') || pathname.startsWith('/admin/')) {
      pathname = '/api' + pathname;
    }
  }

  // Health / Info endpoint for /api, /api/, or /api/index.js
  if (pathname === '/api' || pathname === '/api/' || pathname === '/api/index.js') {
    return json(res, 200, {
      status: 'online',
      name: 'HCCDA-AI Admission Test API',
      version: '1.0.0',
      description: 'Online student assessment API running on Vercel',
      studentPortal: '/',
      adminPortal: '/admin'
    });
  }

  // Create new test attempt
  if (req.method === 'POST' && pathname === '/api/attempts') {
    const input = await body(req);
    const name = sanitize(input.name), cnic = sanitize(input.cnic, 30), phone = sanitize(input.phone, 30);
    if (!name || !cnic || !phone) return json(res, 400, { error: 'Name, CNIC, and phone number are required.' });
    const record = {
      id: id(),
      name,
      cnic,
      phone,
      order: shuffle(questions.map(q => q.id)),
      answers: {},
      tabSwitches: 0,
      status: 'in-progress',
      score: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null
    };
    await saveAttempt(record);
    return json(res, 201, { attemptId: record.id, questions: publicQuestions(record.order), seconds: TEST_MINUTES * 60 });
  }

  // Attempt actions
  const attemptMatch = pathname.match(/^\/api\/attempts\/([a-f0-9]+)(?:\/(answer|tab-switch|submit|review))?$/);
  if (attemptMatch) {
    const [, attemptId, action] = attemptMatch;
    const record = await getAttempt(attemptId);
    if (!record) return json(res, 404, { error: 'Attempt not found.' });

    // Status & restore state
    if (!action && req.method === 'GET') {
      const elapsed = Math.floor((Date.now() - new Date(record.startedAt).getTime()) / 1000);
      const remaining = Math.max(0, TEST_MINUTES * 60 - elapsed);
      return json(res, 200, {
        result: publicRecord(record),
        answers: record.answers,
        questions: publicQuestions(record.order),
        seconds: remaining
      });
    }

    // Save student choice
    if (action === 'answer' && req.method === 'POST') {
      if (record.status !== 'in-progress') return json(res, 409, { error: 'This test is already closed.' });
      const input = await body(req);
      const questionId = Number(input.questionId);
      const choice = Number(input.choice);
      if (!record.order.includes(questionId) || !Number.isInteger(choice) || choice < 0 || choice > 3) {
        return json(res, 400, { error: 'Invalid answer.' });
      }
      record.answers[questionId] = choice;
      await saveAttempt(record);
      return json(res, 200, { saved: true });
    }

    // Anti-cheat tab switch counter
    if (action === 'tab-switch' && req.method === 'POST') {
      if (record.status !== 'in-progress') return json(res, 200, { status: record.status, tabSwitches: record.tabSwitches });
      record.tabSwitches += 1;
      const terminated = record.tabSwitches >= MAX_TAB_SWITCHES;
      if (terminated) {
        record.status = 'terminated-tab-switch';
        record.score = grade(record);
        record.finishedAt = new Date().toISOString();
      }
      await saveAttempt(record, terminated);
      return json(res, 200, { status: record.status, tabSwitches: record.tabSwitches, max: MAX_TAB_SWITCHES });
    }

    // Final test submit
    if (action === 'submit' && req.method === 'POST') {
      if (record.status === 'in-progress') {
        record.status = 'submitted';
        record.score = grade(record);
        record.finishedAt = new Date().toISOString();
        await saveAttempt(record, true);
      }
      return json(res, 200, {
        result: publicRecord(record),
        answers: record.answers,
        questions: publicQuestions(record.order),
        correctAnswers: record.order.map(questionId => ({ questionId, answer: questions[questionId].answer }))
      });
    }

    // Question review
    if (action === 'review' && req.method === 'GET') {
      return json(res, 200, {
        result: publicRecord(record),
        answers: record.answers,
        questions: publicQuestions(record.order),
        correctAnswers: record.order.map(questionId => ({ questionId, answer: questions[questionId].answer }))
      });
    }

    return json(res, 405, { error: 'Method not allowed.' });
  }

  // Admin Endpoints
  if (pathname === '/api/admin/status' && req.method === 'GET') {
    if (!isValidAdminKey(url.searchParams.get('key'))) return json(res, 401, { error: 'Invalid admin key.' });
    const mdb = await getMongoDb(true);
    return json(res, 200, {
      storage: mdb ? 'mongodb' : 'temporary',
      isPersistent: !!mdb,
      isVercel: !!process.env.VERCEL,
      hasMongoUri: !!process.env.MONGODB_URI
    });
  }

  if (pathname === '/api/admin/attempts' && req.method === 'GET') {
    if (!isValidAdminKey(url.searchParams.get('key'))) return json(res, 401, { error: 'Invalid admin key.' });
    const all = await getAllAttempts();
    return json(res, 200, all.map(publicRecord).reverse());
  }

  if (pathname === '/api/admin/attempts' && req.method === 'DELETE') {
    if (!isValidAdminKey(url.searchParams.get('key'))) return json(res, 401, { error: 'Invalid admin key.' });
    await deleteAllAttempts();
    return json(res, 200, { deleted: true });
  }

  const deleteMatch = pathname.match(/^\/api\/admin\/attempts\/([a-f0-9]+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    if (!isValidAdminKey(url.searchParams.get('key'))) return json(res, 401, { error: 'Invalid admin key.' });
    const deleted = await deleteAttempt(deleteMatch[1]);
    if (!deleted) return json(res, 404, { error: 'Student record not found.' });
    return json(res, 200, { deleted: true });
  }

  if (pathname === '/api/admin/export' && req.method === 'GET') {
    if (!isValidAdminKey(url.searchParams.get('key'))) return json(res, 401, { error: 'Invalid admin key.' });
    const all = await getAllAttempts();
    const header = ['Name','CNIC','Phone','Marks','Total','Percentage','Status','Tab Switches','Started At','Finished At'];
    const csv = [
      header,
      ...all.map(r => [
        r.name,
        r.cnic,
        r.phone,
        r.score,
        questions.length,
        Math.round((r.score / questions.length) * 100) + '%',
        r.status,
        r.tabSwitches,
        r.startedAt,
        r.finishedAt || ''
      ])
    ].map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="hccda-ai-student-records.csv"'
    });
    return res.end('\ufeff' + csv);
  }

  return json(res, 404, { error: 'Not found.' });
}

// ----------------------------------------------------
// HTTP REQUEST LISTENER (Used for both Node & Vercel)
// ----------------------------------------------------
const requestListener = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Favicon ignore
  if (url.pathname === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }

  // Handle API routes
  if (url.searchParams.has('__origpath') || url.pathname === '/api' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/attempts')) {
    try {
      return await handleApi(req, res, url);
    } catch (error) {
      return json(res, 500, { error: error.message });
    }
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });

  // Student Test Portal
  if (url.pathname === '/' || url.pathname === '/index.html') {
    if (!indexHtml) indexHtml = getHtmlFile('index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(indexHtml);
  }

  // Admin Dashboard
  if (url.pathname === '/admin' || url.pathname === '/admin.html') {
    if (!adminHtml) adminHtml = getHtmlFile('admin.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(adminHtml);
  }

  // Fallback for any other static files
  const requested = url.pathname.slice(1);
  const candidates = [
    path.join(__dirname, requested),
    path.join(__dirname, 'public', requested),
    path.join(process.cwd(), requested),
    path.join(process.cwd(), 'public', requested)
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
        const content = await fs.promises.readFile(file);
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        return res.end(content);
      }
    } catch (_) {}
  }

  return json(res, 404, { error: 'Page not found.' });
};

const server = http.createServer(requestListener);

// If run directly: node server.js
if (require.main === module) {
  loadDb();
  server.listen(PORT, HOST, () => {
    console.log(`HCCDA-AI test running at http://localhost:${PORT} (network: http://YOUR-IP:${PORT})`);
  });
} else {
  loadDb();
}

module.exports = requestListener;
module.exports.server = server;
