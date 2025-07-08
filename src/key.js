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
 * 对消息进行哈希处理
 * @param {string|Uint8Array} message - 消息字符串或字节数组
 * @returns {Uint8Array} 哈希后的字节数组
 */
function hashMessage(message) {
    if (typeof message === 'string') {
        message = new TextEncoder().encode(message);
    }
    return sha256(message);
}

/**
 * 签名消息
 * @param {string|Uint8Array} message - 消息字符串或字节数组
 * @param {Uint8Array} privateKey - 私钥字节数组
 * @returns {string} 签名的十六进制字符串
 */
function signMessage(message, privateKey) {
    const messageHash = hashMessage(message);
    const signature = schnorr.sign(messageHash, privateKey);
    return bytesToHex(signature);
}

/**
 * 验证消息签名
 * @param {string|Uint8Array} message - 消息字符串或字节数组
 * @param {string} signature - 签名的十六进制字符串
 * @param {string|Uint8Array} publicKey - 公钥（十六进制字符串、字节数组或 Bech32 字符串）
 * @returns {boolean} 签名是否有效
 */
function verifyMessage(message, signature, publicKey) {
    const messageHash = hashMessage(message);
    const sigBytes = hexToBytes(signature);
    
    let pubkeyBytes;
    if (typeof publicKey === 'string') {
        if (publicKey.startsWith('epub1')) {
            pubkeyBytes = epubDecode(publicKey).data;
        } else {
            pubkeyBytes = hexToBytes(publicKey);
        }
    } else {
        pubkeyBytes = publicKey;
    }
    
    return schnorr.verify(sigBytes, messageHash, pubkeyBytes);
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
    signMessage,
    verifyMessage,
    hashMessage,
    encodeBech32,
    decodeBech32
};


if (require.main === module) {
	  // 使用示例
	const privateKey = generateSecretKey();
	const publicKey = getPublicKey(privateKey);

	console.log('生成的私钥 (Hex):', bytesToHex(privateKey));
	console.log('生成的公钥 (Hex):', publicKey);
	console.log('生成的私钥 (Bech32):', esecEncode(privateKey));
	console.log('生成的公钥 (Bech32):', epubEncode(publicKey));

	// 待签名的消息
	const message = "Hello, EventStore!";

	// 签名
	const signature = signMessage(message, privateKey);
	console.log('签名结果:', signature);

	// 验证签名
	const isValid = verifyMessage(message, signature, publicKey);
	console.log('签名验证结果:', isValid);

	// 验证Bech32编码的公钥
	const bech32PublicKey = epubEncode(publicKey);
	const isValidBech32 = verifyMessage(message, signature, bech32PublicKey);
	console.log('Bech32公钥验证结果:', isValidBech32);
}
 

