const http = require('http');
const mongoose = require('mongoose');
const fetch = global.fetch || require('node-fetch');
const User = require('../models/User');
const Requisition = require('../models/Requisition');

const MONGO_URL = 'mongodb://127.0.0.1:27017/landdonation';

if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  process.env.MONGO_URI = MONGO_URL;
}

const app = require('../app');

const TEST_USERS = [
  { role: 'DM Tehsil', email: 'workflow.dm@example.com', name: 'Workflow DM' },
  { role: 'BCC Officer Tehsil', email: 'workflow.bcc@example.com', name: 'Workflow BCC' },
  { role: 'Tehsil Manager', email: 'workflow.tm@example.com', name: 'Workflow TM' },
  { role: 'BCC Specialist', email: 'workflow.chief@example.com', name: 'Workflow BCC Specialist' },
  { role: 'WB User', email: 'workflow.wb@example.com', name: 'Workflow WB' }
];

const DEFAULT_PASSWORD = 'Passw0rd!';
const INITIAL_STATUS = 'Pending DM Review';

async function ensureUsers() {
  const results = {};
  for (const userDef of TEST_USERS) {
    let user = await User.findOne({ email: userDef.email });
    if (!user) {
      user = new User({
        name: userDef.name,
        email: userDef.email,
        role: userDef.role,
        password: DEFAULT_PASSWORD,
        activeStatus: 'active'
      });
      await user.save();
    }
    results[userDef.role] = user;
  }
  return results;
}

async function login(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function loginAll(baseUrl) {
  const tokens = {};
  for (const userDef of TEST_USERS) {
    const auth = await login(baseUrl, userDef.email, DEFAULT_PASSWORD);
    tokens[userDef.role] = auth.token;
  }
  return tokens;
}

function headersFor(role, tokenMap) {
  const token = tokenMap[role];
  if (!token) {
    throw new Error(`Missing token for role ${role}`);
  }
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function createRequisition(dmUser) {
  const now = new Date();
  const req = new Requisition({
    title: 'Workflow Smoke Test',
    description: 'Automated smoke test requisition',
    purpose: 'Test Workflow',
    division: 'Test Division',
    district: 'Test District',
    tehsil: 'Test Tehsil',
    requestedBy: dmUser._id,
    assignedTo: dmUser._id,
    landArea: '1000 sq ft',
    landType: 'Private Land',
    landAcquisition: {
      type: 'Private Land',
      status: ''
    },
    requiredDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    priority: 'Medium',
    status: INITIAL_STATUS,
    activityLog: [
      {
        action: 'Created',
        user: dmUser._id,
        timestamp: now,
        remarks: 'Workflow smoke test requisition created'
      }
    ]
  });
  await req.save();
  return req;
}

async function patchWorkflow(url, headers, payload, label) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload)
  });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${response.statusText} ${raw}`);
  }
  const statusLabel = data?.status || data?.raw || 'unknown';
  console.log(`${label} ✓ -> ${statusLabel}`);
  return data;
}

async function main() {
  await mongoose.connection.asPromise();
  const users = await ensureUsers();

  await Requisition.deleteMany({ title: 'Workflow Smoke Test' });
  const requisition = await createRequisition(users['DM Tehsil']);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const tokens = await loginAll(baseUrl);
  const dmHeaders = headersFor('DM Tehsil', tokens);
  const bccHeaders = headersFor('BCC Officer Tehsil', tokens);
  const tmHeaders = headersFor('Tehsil Manager', tokens);
  const chiefHeaders = headersFor('BCC Specialist', tokens);
  const wbHeaders = headersFor('WB User', tokens);

  await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/dm-forward-bcc`,
    dmHeaders,
    {
      remarks: 'Smoke test: DM forwarding to BCC.',
      officerId: users['BCC Officer Tehsil']._id
    },
    'DM -> BCC'
  );

  await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/bcc-forward-tm`,
    bccHeaders,
    {
      remarks: 'Smoke test: BCC forwarding to TM.',
      officerId: users['Tehsil Manager']._id
    },
    'BCC -> TM'
  );

  await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/tm-forward-chief`,
    tmHeaders,
    {
      remarks: 'Smoke test: TM forwarding to BCC Specialist.',
      officerId: users['BCC Specialist']._id
    },
    'TM -> BCC Specialist'
  );

  await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/chief-forward-bcc`,
    chiefHeaders,
    {
      remarks: 'Smoke test: Chief sending back to BCC for WB dispatch.',
      officerId: users['BCC Officer Tehsil']._id
    },
    'Chief -> BCC (WB dispatch)'
  );

  await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/bcc-forward-wb`,
    bccHeaders,
    {
      remarks: 'Smoke test: BCC sending to WB.',
      officerId: users['WB User']._id
    },
    'BCC -> WB'
  );

  await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/wb-approve`,
    wbHeaders,
    {
      remarks: 'Smoke test: WB approval recorded.',
      officerId: users['BCC Specialist']._id
    },
    'WB approval'
  );

  await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/chief-mark-tm`,
    chiefHeaders,
    {
      remarks: 'Smoke test: Chief marking back to TM.',
      officerId: users['Tehsil Manager']._id
    },
    'Chief -> TM'
  );

  await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/tm-forward-bcc`,
    tmHeaders,
    {
      remarks: 'Smoke test: TM sending for closure.',
      officerId: users['BCC Officer Tehsil']._id
    },
    'TM -> BCC (closure)'
  );

  const finalState = await patchWorkflow(
    `${baseUrl}/requisition/${requisition._id}/bcc-close`,
    bccHeaders,
    {
      remarks: 'Smoke test: BCC closing the requisition.'
    },
    'BCC close'
  );

  console.log('Workflow smoke test complete. Final status:', finalState.status);

  server.close();
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
