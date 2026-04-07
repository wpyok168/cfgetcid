const https = require('https');
const crypto = require('crypto');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');

// ==============================================
// 【第一段完整原版代码 - 微软SOAP接口】
// ==============================================
const BPrivateKey = Buffer.from([
    0xfe, 0x31, 0x98, 0x75, 0xfb, 0x48, 0x84, 0x86, 0x9c, 0xf3, 0xf1, 0xce, 0x99, 0xa8, 0x90, 0x64,
    0xab, 0x57, 0x1f, 0xca, 0x47, 0x04, 0x50, 0x58, 0x30, 0x24, 0xe2, 0x14, 0x62, 0x87, 0x79, 0xa0
]);

function translateErrorCode(code) {
    switch (code) {
        case "0xD6":
        case "0x7F": return "Exceeded (激活次数上限)";
        case "0xD5": 
        case "0x67": return "Blocked (密钥已失效，无法获取确认ID！)";
        case "0x68": return "Invalid Key (无效密钥，无法获取确认ID！)";
        case "0x90": return "IID Error (安装ID错误)";
        case "0x86": return "Invalid Type (版本不匹配)";
        case "0x71": return "NeverObtained";
        default: return `错误码: ${code}`;
    }
}

function createSoapEnvelope(typeId, iid, pid) {
    const activationRequestXml = `
        <ar:ActivationRequest xmlns:ar="http://www.microsoft.com/DRM/SL/BatchActivationRequest/1.0">
            <ar:VersionNumber>2.0</ar:VersionNumber>
            <ar:RequestType>${typeId}</ar:RequestType>
            <ar:Requests>
                <ar:Request>
                    <ar:PID>${pid}</ar:PID>
                    <ar:IID>${iid}</ar:IID>
                </ar:Request>
            </ar:Requests>
        </ar:ActivationRequest>
    `.trim();
    const unicodeBytes = Buffer.from(activationRequestXml, 'ucs2');
    const requestXmlBase64 = unicodeBytes.toString('base64');
    const hmac = crypto.createHmac('sha256', BPrivateKey);
    hmac.update(unicodeBytes);
    const digest = hmac.digest('base64');
    const soapXml = `
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
                <ns1:BatchActivate xmlns:ns1="http://www.microsoft.com/BatchActivationService">
                    <ns1:request>
                        <ns1:Digest>${digest}</ns1:Digest>
                        <ns1:RequestXml>${requestXmlBase64}</ns1:RequestXml>
                    </ns1:request>
                </ns1:BatchActivate>
            </soap:Body>
        </soap:Envelope>
    `.trim();
    return soapXml;
}

function parseResponse(xmlContent) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, 'text/xml');
        const select = xpath.useNamespaces({ ns1: 'http://www.microsoft.com/BatchActivationService' });
        const responseXmlNode = select('//ns1:ResponseXml', doc)[0];
        if (!responseXmlNode) return "服务器返回空数据";
        const responseXmlValue = responseXmlNode.textContent;
        const innerDoc = parser.parseFromString(responseXmlValue, 'text/xml');
        const innerSelect = xpath.useNamespaces({ ar: 'http://www.microsoft.com/DRM/SL/BatchActivationResponse/1.0' });
        const cidNode = innerSelect('//ar:CID', innerDoc)[0];
        if (cidNode) return cidNode.textContent;
        const errorCodeNode = innerSelect('//ar:ErrorCode', innerDoc)[0];
        const errorCode = errorCodeNode ? errorCodeNode.textContent : '未知错误';
        return translateErrorCode(errorCode);
    } catch (e) {
        return `解析响应失败: ${e.message}`;
    }
}

function msXmlRequest(typeId, iid, pid) {
    return new Promise((resolve) => {
        const soapXml = createSoapEnvelope(typeId, iid, pid);
        const options = {
            hostname: 'activation.sls.microsoft.com',
            path: '/BatchActivation/BatchActivation.asmx',
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://www.microsoft.com/BatchActivationService/BatchActivate',
            },
            rejectUnauthorized: false,
        };
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => responseBody += chunk);
            res.on('end', () => resolve(parseResponse(responseBody)));
        });
        req.on('error', () => resolve(null));
        req.write(soapXml);
        req.end();
    });
}

// ==============================================
// 【第二段完整原版代码 - 备用接口】
// ==============================================
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

async function getCIDBackup(IID) {
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
    return await safeParse(res);
}

// ==============================================
// 【最终合并逻辑 - 完全按你的要求】
// ==============================================
(async () => {
    const IID = process.argv[2];
    if (!IID) {
        console.log("用法: node getCID.js [IID]");
        process.exit(1);
    }

    const TYPE_ID = 1;
    const PID = "00000-00096-133-004886-03-1033-8400.0000-1972012";

    console.log("\n正在尝试优先接口...");

    // 3秒超时控制
    const timeout = new Promise((resolve) => setTimeout(() => resolve("TIMEOUT"), 3000));
    const result = await Promise.race([msXmlRequest(TYPE_ID, IID, PID), timeout]);

    // ======================
    // 你的规则：
    // 1. 返回 Exceeded → 走备用
    // 2. 超时 → 走备用
    // 3. 其他 → 直接输出
    // ======================
    if (result === "TIMEOUT" || (result && result.includes("Exceeded")) || (result === "NeverObtained")) {
        console.log("⏰ 超时/激活上限，使用备用接口...\n");
        console.log(JSON.stringify(await getCIDBackup(IID), null, 2));
    } else {
        console.log("✅ 优先接口返回：");
        console.log(result);
    }
})();
