const KV_NAMESPACE = "KV_LOGS";
const BATCH_SIZE = 20;
const BATCH_FLUSH_SECONDS = 300;
const MAX_BATCH_READ = 50;

let logBatch = [];
let lastFlushTime = Date.now();
let flushing = false;

function isAuth(request, pwd) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").some(c => c.trim() === "log_token=" + pwd);
}

function eI(t) {
  const e = t instanceof ArrayBuffer ? new Uint8Array(t) : new TextEncoder().encode(t);
  let n = "";
  for (const o of e) n += String.fromCharCode(o);
  return btoa(n).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let tI = null;
async function yT() {
  if (!tI) {
    tI = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  }
  return tI;
}

async function c1(t, e) {
  const key = await yT();
  const jwk = await crypto.subtle.exportKey("jwk", key.publicKey);
  const header = eI(JSON.stringify({ alg: "ES256", typ: "dpop+jwt", jwk: jwk }));
  const payload = eI(JSON.stringify({
    htu: t,
    htm: e,
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000)
  }));
  const unsigned = header + "." + payload;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key.privateKey,
    new TextEncoder().encode(unsigned)
  );
  return unsigned + "." + eI(signature);
}

function GenerateSessionId() {
  return "app_" + Math.random().toString(36).substring(2, 15);
}

async function safeParse(resp) {
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function sendActivationRequest(IID) {
  if (!IID) throw new Error("missing IID");
  const dpop = await c1("/api/productActivation/validateIID", "POST");
  const sid = GenerateSessionId();
  const digits = Math.floor(IID.length / 9);

  const res = await fetch("https://visualsupport.microsoft.com/api/productActivation/validateIID", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer govUrlID",
      "DPoP": dpop,
      "x-session-id": sid
    },
    body: JSON.stringify({
      IID: IID,
      ProductType: "windows",
      productGroup: "Windows",
      productName: "Windows 11",
      numberOfDigits: digits,
      Country: "CHN",
      Region: "APAC",
      InstalledDevices: 1,
      OverrideStatusCode: "MUL",
      InitialReasonCode: "45164"
    })
  });

  return {
    status: res.status,
    success: res.ok,
    data: await safeParse(res)
  };
}

function getFormatTime(offset = 8) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const tz = new Date(utc + 3600000 * offset);
  return tz.toISOString().replace("T", " ").slice(0, 19);
}

async function flushBatch(kv) {
  if (flushing || logBatch.length === 0) return;
  flushing = true;
  try {
    const key = "batch_" + Date.now() + "_" + crypto.randomUUID();
    await kv.put(key, JSON.stringify(logBatch));
    logBatch = [];
    lastFlushTime = Date.now();
  } finally {
    flushing = false;
  }
}

function needFlush() {
  if (logBatch.length >= BATCH_SIZE) return true;
  return (Date.now() - lastFlushTime) / 1000 > BATCH_FLUSH_SECONDS;
}

async function getAllLogs(kv) {
  if (!kv) return [];
  const { keys } = await kv.list({ limit: MAX_BATCH_READ });
  const all = [];
  for (const k of keys) {
    const val = await kv.get(k.name);
    if (!val) continue;
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr)) all.push(...arr);
    } catch { }
  }
  return all.sort((a, b) => (b.time || "").localeCompare(a.time || ""));
}

async function deleteLogById(kv, targetId) {
  if (!targetId) return false;
  const { keys } = await kv.list({ limit: 100 });
  for (const k of keys) {
    const val = await kv.get(k.name);
    if (!val) continue;
    try {
      let arr = JSON.parse(val);
      const filtered = arr.filter(item => item.id !== targetId);
      if (filtered.length !== arr.length) {
        if (filtered.length === 0) await kv.delete(k.name);
        else await kv.put(k.name, JSON.stringify(filtered));
        return true;
      }
    } catch { }
  }
  return false;
}

async function clearAllLogs(kv) {
  let cursor;
  do {
    const res = await kv.list({ cursor: cursor });
    cursor = res.cursor;
    await Promise.all(res.keys.map(k => kv.delete(k.name)));
  } while (cursor);
}

function loginPage() {
  return `<!DOCTYPE html><meta charset="utf-8"><title>登录</title><style>body{display:grid;place-items:center;height:100vh;margin:0}.box{padding:24px;background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);width:320px}input,button{width:100%;padding:10px;margin:8px 0;border-radius:6px;border:1px solid #ddd}button{background:#0066cc;color:white;border:none;cursor:pointer}</style><div class="box"><h3>日志后台登录</h3><form method="post"><input type="password" name="pwd" required placeholder="密码"><button>登录</button></form></div>`;
}

function logPage(logs, page, totalPages, search, pageSize) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = logs.slice(start, end);

  const rows = paginated.map(item => `
  <tr>
    <td>${item.time || ""}</td>
    <td style="font-family:monospace">${item.IID || ""}</td>
    <td>${item.ip || ""}</td>
    <td>${item.result && item.result.success ? "✅成功" : "❌失败"}</td>
    <td>
      <button onclick="del('${item.id}')" style="background:red;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin:0 2px">删除</button>
      <button onclick="searchSameIID('${encodeURIComponent(item.IID || "")}')" style="background:#6c757d;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin:0 2px">同IID</button>
      <button onclick="showDetail('${encodeURIComponent(JSON.stringify(item.result))}')" style="background:#0066cc;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin:0 2px">详情</button>
    </td>
  </tr>`).join("");

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(`<a href="?page=${i}&search=${encodeURIComponent(search)}" style="margin:0 5px;color:${page === i ? "red" : "#0066cc"}">${i}</a>`);
  }

  return `<!DOCTYPE html><meta charset="utf-8"><title>IID 激活日志</title>
<style>
body{margin:20px;font-family:system-ui;background:#fafafa}
.card{background:white;padding:20px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
.bar{display:flex;gap:10px;margin:10px 0}
input{flex:1;padding:8px;border-radius:6px;border:1px solid #ddd}
button{padding:8px 12px;border:none;border-radius:6px;color:white;cursor:pointer}
.red{background:red}
table{width:100%;border-collapse:collapse}
th,td{padding:10px;border:1px solid #eee}
#detailModal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center}
#detailModal .modal-content{background:#fff;border-radius:8px;padding:20px;width:90%;max-width:800px;max-height:80vh;overflow:auto;position:relative}
#detailModal .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
#detailModal .modal-header h3{margin:0;font-size:20px}
#detailModal .btn-group{display:flex;gap:10px}
#detailModal .btn-copy{background:#28a745;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:16px}
#detailModal .btn-close{background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:16px}
#detailContent{background:#f8f9fa;padding:16px;border-radius:6px;white-space:pre-wrap;font-family:monospace;min-height:200px;max-height:50vh;overflow:auto}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 16px;border-radius:10px;opacity:0;transition:0.3s}
.toast.show{opacity:1;top:30px}
</style>

<div class="card">
  <h3>IID 激活日志</h3>
  <div class="bar">
    <input id="s" value="${search}" placeholder="搜索 IID">
    <button onclick="location.href='?search='+encodeURIComponent(document.getElementById('s').value)">搜索</button>
    <a href="/logs/clear"><button class="red">清空全部</button></a>
  </div>
  <div style="margin:10px 0">${pages.join("")}</div>
  <table>
    <tr><th>时间</th><th>IID</th><th>IP</th><th>状态</th><th>操作</th></tr>
    ${rows}
  </table>
</div>

<div id="detailModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>激活详情</h3>
      <div class="btn-group">
        <button class="btn-close" onclick="closeDetailModal()">关闭</button>
        <button class="btn-copy" id="copyJsonBtn" onclick="copyDetailJson()">复制JSON</button>
      </div>
    </div>
    <div id="detailContent"></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const $ = s => document.querySelector(s);
const toast = msg => {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
};

function searchSameIID(iid){
  if(!iid) return;
  location.href = "?search=" + decodeURIComponent(iid);
}

function showDetail(resultStr){
  try{
    const result = JSON.parse(decodeURIComponent(resultStr));
    $("#detailContent").textContent = JSON.stringify(result, null, 2);
    $("#detailModal").style.display = "flex";
  }catch(e){
    $("#detailContent").textContent = "解析失败：" + e;
    $("#detailModal").style.display = "flex";
  }
}

function closeDetailModal(){
  $("#detailModal").style.display = "none";
}

async function copyDetailJson(){
  const txt = $("#detailContent").textContent;
  if(!txt) { toast("暂无内容"); return; }
  try{
    await navigator.clipboard.writeText(txt);
    toast("已复制JSON");
  }catch(e){
    toast("复制失败，请手动复制");
  }
}

async function del(id){
  if(!confirm("确认删除？")) return;
  await fetch("/logs/delete",{method:"POST",body:id});
  location.reload();
}
</script>`;
}

function toolPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IID 确认 ID 工具</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui}
body{background:#f0f7ff;padding:20px;max-width:800px;margin:0 auto}
.card{background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,120,212,0.1);padding:24px;margin-bottom:20px}
h1{font-size:20px;margin-bottom:16px;display:flex;align-items:center;gap:10px}
img{width:22px;height:22px}
label{font-weight:600;margin:8px 0;display:block}
textarea{width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;min-height:120px}
button{padding:12px 16px;border-radius:10px;border:none;background:#0078d4;color:#fff;font-weight:600;cursor:pointer}
.btn-gray{background:#64748b}
.btn-red{background:#d93034}
.btn-group{display:flex;gap:10px;margin:10px 0}
.result{background:#f8f9fa;padding:12px;border-radius:10px;white-space:pre-wrap;font-family:monospace;min-height:200px;max-height:400px;overflow:auto}
.status{margin:10px 0;color:#059669}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 16px;border-radius:10px;opacity:0;transition:0.3s}
.toast.show{opacity:1;top:30px}
.footer{text-align:center;color:#666;font-size:14px;line-height:1.6;margin-top:24px}
.footer a{color:#0078dc;text-decoration:none}
</style>
</head>
<body>

<div class="card">
  <h1><img src="https://icons.duckduckgo.com/ip3/microsoft.com.ico"> IID 确认 ID 批量工具</h1>
  <label>IID 列表（一行一个）</label>
  <textarea id="iids" placeholder="一行一个 IID，支持批量粘贴"></textarea>

  <div class="btn-group">
    <button id="runBtn">获取确认ID</button>
    <button id="copyBtn" class="btn-gray">复制结果</button>
    <button id="clearAllBtn" class="btn-red">清空</button>
  </div>

  <div class="status" id="status"></div>
  <label>运行结果</label>
  <div class="result" id="resultBox"></div>
</div>

<div class="footer">
  本工具后端服务器通过官方接口 visualsupport.microsoft.com 获取确认 ID<br>
  数据安全返回并展示于前端页面，仅用于合法授权设备激活<br><br>
  <a href="/logs">日志后台管理</a><br><br>本页面使用<a href="https://github.com/wpyok168/cfgetcid" target="_blank">Github</a>开源项目进行部署，如果需要可以自行部署
</div>

<div class="toast" id="toast"></div>

<script>
const $ = s => document.querySelector(s);
const toast = msg => {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
};

$("#clearAllBtn").onclick = () => {
  $("#iids").value = "";
  $("#resultBox").textContent = "";
  $("#status").textContent = "";
  toast("已清空全部");
};

$("#copyBtn").onclick = async () => {
  const txt = $("#resultBox").textContent;
  if (!txt) { toast("暂无内容"); return; }
  await navigator.clipboard.writeText(txt);
  toast("已复制结果");
};

$("#runBtn").onclick = async () => {
  const text = $("#iids").value;
  const lines = text.split("\\n").map(i => i.trim().replace(/\\D/g,"")).filter(Boolean);
  if (lines.length === 0) { toast("请输入 IID"); return; }

  const btn = $("#runBtn");
  btn.disabled = true;
  btn.textContent = "处理中...";

  const output = [];
  for (const iid of lines) {
    $("#status").textContent = "处理：" + iid;
    try {
      const resp = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ IID: iid })
      });
      const json = await resp.json();
      output.push(JSON.stringify(json, null, 2) + "\\n------------------------------------\\n");
    } catch(e) {
      output.push("请求失败\\n------------------------------------\\n");
    }
  }

  $("#resultBox").textContent = output.join("");
  $("#status").textContent = "完成：" + lines.length + " 条";
  btn.disabled = false;
  btn.textContent = "批量获取";
  toast("处理完成");
};
</script>
</body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    const LOG_PASSWORD = env.LOG_PASSWORD;
    const PAGE_SIZE = parseInt(env.PAGE_SIZE) || 20;
    const TIMEZONE = parseInt(env.TIMEZONE_OFFSET) || 8;
    const kv = env[KV_NAMESPACE];
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/logs/clear") {
      if (!isAuth(request, LOG_PASSWORD)) return new Response("403", { status: 403 });
      await clearAllLogs(kv);
      return Response.redirect("/logs", 302);
    }

    if (path === "/logs/delete") {
      if (!isAuth(request, LOG_PASSWORD)) return new Response("403", { status: 403 });
      const id = await request.text();
      await deleteLogById(kv, id);
      return new Response("ok");
    }

    if (path === "/logs") {
      if (!LOG_PASSWORD) {
        return new Response("请设置 LOG_PASSWORD 环境变量", {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      if (request.method === "POST") {
        const form = await request.formData();
        const pwd = form.get("pwd");
        if (pwd === LOG_PASSWORD) {
          return new Response(null, {
            status: 302,
            headers: {
              "Location": "/logs",
              "Set-Cookie": "log_token=" + LOG_PASSWORD + "; Path=/logs; HttpOnly; Max-Age=86400; SameSite=Lax"
            }
          });
        }
      }

      if (!isAuth(request, LOG_PASSWORD)) {
        return new Response(loginPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      await flushBatch(kv);
      const search = url.searchParams.get("search") || "";
      const page = parseInt(url.searchParams.get("page")) || 1;
      const logs = await getAllLogs(kv);
      const filtered = search ? logs.filter(item => (item.IID || "").includes(search)) : logs;
      const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
      return new Response(logPage(filtered, page, totalPages, search, PAGE_SIZE), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    if (request.method === "GET") {
      return new Response(toolPage(), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    try {
      const body = await request.json();
      const IID = body.IID;
      if (!IID) {
        return Response.json({ error: "missing IID" }, { status: 400 });
      }

      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const result = await sendActivationRequest(IID);

      logBatch.push({
        id: crypto.randomUUID(),
        time: getFormatTime(TIMEZONE),
        IID: IID,
        ip: ip,
        result: result
      });

      if (needFlush()) {
        ctx.waitUntil(flushBatch(kv));
      }

      return Response.json(result);
    } catch (err) {
      return Response.json({ error: "error", detail: err + "" }, { status: 500 });
    }
  }
};
