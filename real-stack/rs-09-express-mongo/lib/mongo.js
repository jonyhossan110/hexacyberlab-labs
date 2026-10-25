/* A small Mongo-STYLE query engine — it stands in for MongoDB in this lab
   (no mongod exists in this environment). Collections live in memory and
   persist to data/<name>.json. The matcher understands the query operators
   real MongoDB understands — $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex,
   $exists, $or, $and — and, exactly like Mongoose, it happily evaluates
   OPERATOR OBJECTS wherever a query value appears. The engine is honest;
   the vulnerabilities live in routes that hand it raw request input. */
const fs = require('fs');
const path = require('path');
const config = require('../app/config');

function getPath(doc, key) {
  return key.split('.').reduce((o, k) => (o == null ? o : o[k]), doc);
}
function applyOp(val, op, operand) {
  switch (op) {
    case '$ne': return val !== operand;
    case '$gt': return val > operand;
    case '$gte': return val >= operand;
    case '$lt': return val < operand;
    case '$lte': return val <= operand;
    case '$in': return Array.isArray(operand) && operand.includes(val);
    case '$nin': return !(Array.isArray(operand) && operand.includes(val));
    case '$regex': {
      if (typeof val !== 'string') return false;
      try { return (operand instanceof RegExp ? operand : new RegExp(operand)).test(val); }
      catch (e) { return false; }
    }
    case '$exists': return operand ? val !== undefined : val === undefined;
    default: return false;
  }
}
function matchValue(val, cond) {
  if (cond && typeof cond === 'object' && !(cond instanceof RegExp) && !Array.isArray(cond)) {
    const keys = Object.keys(cond);
    if (keys.some(k => k.startsWith('$'))) {
      return keys.every(k => (k === '$options' ? true : applyOp(val, k, cond[k])));
    }
    return JSON.stringify(val) === JSON.stringify(cond);
  }
  if (cond instanceof RegExp) return typeof val === 'string' && cond.test(val);
  return val === cond;
}
function matches(doc, query) {
  for (const [k, v] of Object.entries(query || {})) {
    if (k === '$or') { if (!Array.isArray(v) || !v.some(q => matches(doc, q))) return false; continue; }
    if (k === '$and') { if (!Array.isArray(v) || !v.every(q => matches(doc, q))) return false; continue; }
    if (k.startsWith('$')) return false;
    if (!matchValue(getPath(doc, k), v)) return false;
  }
  return true;
}
/* True when any nested value in the object is a query-operator object —
   the routes use this to notice operator injection actually happened. */
function hasOperator(v) {
  if (!v || typeof v !== 'object') return false;
  return Object.entries(v).some(([k, val]) => k.startsWith('$') || hasOperator(val));
}

class Collection {
  constructor(name) {
    this.name = name;
    this.file = path.join(config.dataDir, name + '.json');
    this.docs = [];
    this.fresh = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(parsed)) { this.docs = parsed; this.fresh = false; }
    } catch (e) { /* first run — seeded by lib/seed.js */ }
  }
  persist() {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.docs, null, 2));
  }
  find(query = {}) { return this.docs.filter(d => matches(d, query)); }
  findOne(query = {}) { return this.docs.find(d => matches(d, query)) || null; }
  countDocuments(query = {}) { return this.find(query).length; }
  insertOne(doc) { this.docs.push(doc); this.persist(); return doc; }
  save(doc) { this.persist(); return doc; } // documents are live references
}

const cache = {};
function collection(name) {
  if (!cache[name]) cache[name] = new Collection(name);
  return cache[name];
}
module.exports = { collection, matches, hasOperator };
