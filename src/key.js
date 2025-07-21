const { schnorr } = require('@noble/curves/secp256k1');
const { sha256 } = require('@noble/hashes/sha256');
const { bytesToHex, hexToBytes } = require('@noble/hashes/utils');
const { bech32 } = require('@scure/base');

const Bech32MaxSize = 1023;

/**
 * 生成随机私钥
 * @returns {Uint8Array} 私钥字节数组
 */
function generateSecretKey() {
    return schnorr.utils.randomPrivateKey();
}

/**
 * 获取公钥（字节数组形式）
 * @param {Uint8Array} secretKey - 私钥字节数组
 * @returns {Uint8Array} 公钥字节数组
 */
function getPublicKeyBytes(secretKey) {
    return schnorr.getPublicKey(secretKey);
}

/**
 * 获取公钥（十六进制字符串形式）
 * @param {Uint8Array} secretKey - 私钥字节数组
 * @returns {string} 公钥十六进制字符串
 */
function getPublicKey(secretKey) {
    return bytesToHex(getPublicKeyBytes(secretKey));
}

/**
 * Bech32 编码函数
 * @param {string} prefix - Bech32 前缀
 * @param {Uint8Array} data - 待编码数据
 * @returns {string} 编码后的 Bech32 字符串
 */
function encodeBech32(prefix, data) {
    const words = bech32.toWords(data);
    return bech32.encode(prefix, words, Bech32MaxSize);
}

/**
 * Bech32 解码函数
 * @param {string} bech32String - Bech32 字符串
 * @returns {{prefix: string, data: Uint8Array}} 解码后的前缀和数据
 */
function decodeBech32(bech32String) {
    const { prefix, words } = bech32.decode(bech32String, Bech32MaxSize);
    const data = bech32.fromWords(words);
    return { prefix, data };
}

/**
 * 私钥 Bech32 编码（esec 前缀）
 * @param {Uint8Array} privkey - 私钥字节数组
 * @returns {string} 编码后的 Bech32 字符串
 */
function esecEncode(privkey) {
    return encodeBech32("esec", privkey);
}

/**
 * 私钥 Bech32 解码
 * @param {string} bech32String - Bech32 字符串
 * @returns {{prefix: string, data: Uint8Array}} 解码后的前缀和私钥数据
 */
function esecDecode(bech32String) {
    return decodeBech32(bech32String);
}

/**
 * 公钥 Bech32 编码（epub 前缀）
 * @param {Uint8Array|string} pubkey - 公钥字节数组或十六进制字符串
 * @returns {string} 编码后的 Bech32 字符串
 */
function epubEncode(pubkey) {
    if (typeof pubkey === 'string') {
        pubkey = hexToBytes(pubkey);
    }
    return encodeBech32("epub", pubkey);
}

/**
 * 公钥 Bech32 解码
 * @param {string} bech32String - Bech32 字符串
 * @returns {{prefix: string, data: Uint8Array}} 解码后的前缀和公钥数据
 */
function epubDecode(bech32String) {
    return decodeBech32(bech32String);
}


/**
 * 严格序列化对象（确保签名和验证时结果一致）
 * @param {Object} obj - 待序列化的事件对象
 * @returns {string} 标准化的JSON字符串
 */
function eventSerialize(obj) {
    // 递归处理嵌套对象，确保字段排序一致
    function sortObjectKeys(input) {
        if (typeof input !== 'object' || input === null) {
            // 非对象类型直接返回（如字符串、数字、布尔值）
            return input;
        }

        // 数组元素递归排序
        if (Array.isArray(input)) {
            return input.map(item => sortObjectKeys(item));
        }

        // 对象字段按字母顺序排序，并递归处理值
        const sorted = {};
        Object.keys(input)
            .sort((a, b) => a.localeCompare(b)) // 按字段名升序排序
            .forEach(key => {
                const value = input[key];
                // 处理undefined（转为null，避免JSON.stringify忽略）
                sorted[key] = value === undefined ? null : sortObjectKeys(value);
            });
        return sorted;
    }

    // 先排序对象字段，再序列化
    const sortedObj = sortObjectKeys(obj);
    // 序列化时禁用空格，确保结果紧凑且一致
    return JSON.stringify(sortedObj);
}

/**
 * 对消息进行哈希处理
 * @param {string|Uint8Array} message - 消息字符串或字节数组
 * @returns {string} 哈希后的十六进制字符串
 */
function hashMessage(message) {
   
    if (typeof message === 'string') {
        message = new TextEncoder().encode(message);
    }
 
    return bytesToHex(sha256(message));
}

/**
 * 对消息进行签名
 * @param {string} messageHex - 消息的十六进制字符串
 * @param {Uint8Array} privateKey - 私钥字节数组
 * @returns {string} 签名的十六进制字符串
 */
function signStr(messageHex, privateKey) {
    // 将十六进制消息转换为字节数组
    const messageBytes = hexToBytes(messageHex);
    const signature = schnorr.sign(messageBytes, privateKey);
    return bytesToHex(signature);
}

/**
 * 验证 Schnorr 签名是否有效
 * @param {string} messageHex - 被签名的消息的十六进制字符串
 * @param {string} signatureHex - 十六进制格式的签名
 * @param {string} pubkey - 公钥（支持十六进制或Bech32格式）
 * @returns {boolean} 签名是否有效
 */
function verifyStr(messageHex, signatureHex, pubkey) {
  try {
    // 1. 将十六进制签名转回字节数组
    const signature = hexToBytes(signatureHex);

    // 2. 处理公钥（支持十六进制和Bech32格式）
    let pubkeyBytes;
    if (pubkey.startsWith('epub1')) {
        // Bech32格式的公钥
        const { data } = epubDecode(pubkey);
        pubkeyBytes = data;
    } else {
        // 十六进制格式的公钥
        pubkeyBytes = hexToBytes(pubkey);
    }

    // 3. 将十六进制消息转回字节数组
    const messageBytes = hexToBytes(messageHex);

    // 4. 使用 Schnorr 算法验证签名
    return schnorr.verify(signature, messageBytes, pubkeyBytes);
  } catch (error) {
    // 任何错误（如格式错误、签名无效）均返回 false
    console.error('签名验证失败:', error.message);
    return false;
  }
}

/**
 * 对事件进行签名
 * @param {Object} event - 事件对象
 * @param {Uint8Array} privkey - 私钥字节数组
 * @returns {Object} 签名后的事件
 */
function secureEvent(event, privkey) {
    // 确保事件有时间戳
    if (!event.created_at) {
        event.created_at = Math.floor(Date.now() / 1000);
    }
    
    // 按字母顺序序列化事件对象
    const serializeEvent = eventSerialize(event)
    
    // 计算事件哈希
    const eventid = hashMessage(serializeEvent);
    
    // 添加事件ID和签名
    event.id = eventid;
    event.sig = signStr(eventid, privkey);
    
    return event;
}

/**
 * 验证事件签名的有效性
 * @param {Object} event - 包含id、sig和created_at的事件对象
 * @param {string} pubkey - 用于验证签名的公钥（支持十六进制或Bech32格式）
 * @returns {boolean} - 签名是否有效
 */
function verifyEvent(event, pubkey) {
    // 1. 复制原始事件并移除可能影响签名的字段
    const eventCopy = { ...event };
    delete eventCopy.id;    // 移除原有id，重新计算
    delete eventCopy.sig;   // 移除原有签名，重新验证
    
    
    // 3. 按相同方式序列化事件（与签名时一致）
    const serializeEvent = eventSerialize(eventCopy)
     
    // 4. 计算事件哈希（与签名时一致）
    const calculatedEventId = hashMessage(serializeEvent);
    
    // 5. 验证原始id与计算出的id是否一致
    if (calculatedEventId !== event.id) {
        console.log('事件ID不匹配');
        console.log('计算的ID:', calculatedEventId);
        console.log('原始ID:', event.id);
        return false;
    }
    
    // 6. 使用公钥验证签名
    return verifyStr(event.id, event.sig, pubkey);
}

// 导出核心功能
module.exports = {
    generateSecretKey,
    getPublicKey,
    getPublicKeyBytes,
    esecEncode,
    esecDecode,
    epubEncode,
    epubDecode,
    hashMessage,
    secureEvent,
    verifyEvent,
    encodeBech32,
    decodeBech32
};

if (require.main === module) {
    // 使用示例
    const privateKey = generateSecretKey();
    const publicKey = getPublicKey(privateKey);
    const publicKeyBech32 = epubEncode(publicKey);

    console.log('生成的私钥 (Hex):', bytesToHex(privateKey));
    console.log('生成的公钥 (Hex):', publicKey);
    console.log('生成的公钥 (Bech32):', publicKeyBech32);

    // 待签名的事件
    const originalEvent = {
        ops: "C",
        code: 100,
        data: {
            email: "test@example.com",
            content: "这是一个测试事件"
        }
    };
    console.log('\n=== 原始事件 ===');
    console.log(originalEvent);

    // 签名事件
    const signedEvent = secureEvent(originalEvent, privateKey);
    console.log('\n=== 签名后的事件 ===');
    console.log({
        id: signedEvent.id,
        sig: signedEvent.sig,
        created_at: signedEvent.created_at,
        data: signedEvent.data
    });

    // 验证事件签名
    console.log('\n=== 签名验证 ===');
    console.log('使用Hex公钥验证:', verifyEvent(signedEvent, publicKey) ? '通过' : '失败');
    console.log('使用Bech32公钥验证:', verifyEvent(signedEvent, publicKeyBech32) ? '通过' : '失败');
    
    // 测试篡改事件
    console.log("篡改后验证测试:")
    const tamperedEvent = { ...signedEvent };
    tamperedEvent.data.content = "篡改后的内容";
    console.log('篡改后验证:', verifyEvent(tamperedEvent, publicKey) ? '通过' : '失败');
}
