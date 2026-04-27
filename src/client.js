const https = require("https");
const crypto = require("crypto");

class KimiClient {
    constructor(token) {
        if (!token) throw new Error("A valid Kimi API token is required.");
        this.token = token;
        this.chatId = null;
        this.lastMessageId = null;
    }

    // Helper: connect protocol encoder
    _connectEncode(obj) {
        const jsonStr = JSON.stringify(obj);
        const buffer = Buffer.from(jsonStr, 'utf-8');
        const lenBuffer = Buffer.alloc(4);
        lenBuffer.writeUInt32BE(buffer.length, 0);
        const header = Buffer.concat([Buffer.from([0x00]), lenBuffer]);
        return Buffer.concat([header, buffer]);
    }

    // Helper: Default headers
    _getHeaders() {
        const headers = {
            "accept": "*/*",
            "authorization": `Bearer ${this.token}`,
            "connect-protocol-version": "1",
            "content-type": "application/connect+json",
            "r-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Argentina/Buenos_Aires",
            "x-language": "es-AR",
            "x-msh-device-id": "7586915550627013133",
            "x-msh-platform": "web",
            "x-msh-session-id": "1731469129988841572"
        };
        if (this.chatId) {
            headers["referer"] = `https://www.kimi.com/chat/${this.chatId}`;
        } else {
            headers["referer"] = "https://www.kimi.com/";
        }
        return headers;
    }

    /**
     * Initializes a new chat session.
     * @param {string} model 
     * @returns {Promise<void>}
     */
    startNewChat(model = "SCENARIO_K2D5") {
        return new Promise((resolve, reject) => {
            const payload = {
                "scenario": model,
                "tools": [{"type": "TOOL_TYPE_SEARCH", "search": {}}],
                "message": {
                    "role": "user",
                    "blocks": [{"message_id": "", "text": {"content": "Hello"}}],
                    "scenario": model
                },
                "options": {"thinking": false}
            };

            const postData = this._connectEncode(payload);
            const req = https.request("https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat", {
                method: "POST",
                headers: this._getHeaders()
            }, (res) => {
                let buffer = Buffer.alloc(0);
                
                res.on("data", (chunk) => {
                    buffer = Buffer.concat([buffer, chunk]);
                    while (buffer.length >= 5) {
                        const length = buffer.readUInt32BE(1);
                        if (buffer.length < 5 + length) break;
                        
                        const frame = buffer.subarray(5, 5 + length);
                        buffer = buffer.subarray(5 + length);
                        
                        try {
                            const data = JSON.parse(frame.toString('utf-8'));
                            if (data.chat && data.chat.id) this.chatId = data.chat.id;
                            if (data.message && data.message.id) this.lastMessageId = data.message.id;
                        } catch (e) {}
                    }
                });

                res.on("end", () => {
                    if (this.chatId) resolve();
                    else reject(new Error("No chat ID returned"));
                });
            });
            
            req.on("error", reject);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Streams a message to Kimi and yields text chunks as they arrive.
     * @param {string} prompt The user's input
     * @param {object} options Configuration object
     * @returns {AsyncGenerator<string, void, unknown>}
     */
    async *sendMessage(prompt, options = {}) {
        if (!this.chatId) throw new Error("Chat not initialized. Call startNewChat() first.");

        const { 
            model = "SCENARIO_K2D5", 
            deepThink = false, 
            search = false 
        } = options;

        const payload = {
            "chat_id": this.chatId,
            "scenario": model,
            "tools": [],
            "message": {
                "parent_id": this.lastMessageId || "",
                "role": "user",
                "blocks": [
                    { "message_id": "", "text": { "content": prompt } }
                ],
                "scenario": model
            },
            "options": { "thinking": deepThink === true }
        };

        if (search === true) {
            payload.tools.push({ "type": "TOOL_TYPE_SEARCH", "search": {} });
        }

        const postData = this._connectEncode(payload);

        const response = await new Promise((resolve, reject) => {
            const req = https.request("https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat", {
                method: "POST",
                headers: this._getHeaders()
            }, (res) => resolve(res));
            
            req.on("error", reject);
            req.write(postData);
            req.end();
        });

        if (response.statusCode !== 200) {
            throw new Error(`Kimi API returned status code ${response.statusCode}`);
        }

        let buffer = Buffer.alloc(0);

        for await (const chunk of response) {
            buffer = Buffer.concat([buffer, chunk]);

            while (buffer.length >= 5) {
                const length = buffer.readUInt32BE(1);
                if (buffer.length < 5 + length) break;

                const frame = buffer.subarray(5, 5 + length);
                buffer = buffer.subarray(5 + length);

                try {
                    const data = JSON.parse(frame.toString('utf-8'));
                    
                    if (data.message && data.message.id) {
                        this.lastMessageId = data.message.id;
                    }

                    let chunkObj = null;

                    if (data.delta && data.delta.content) {
                        chunkObj = { type: 'text', content: data.delta.content };
                    } else if (data.op === "append" || data.op === "set") {
                        if (data.mask && data.mask.startsWith("block.")) {
                            if (data.block && data.block.think && data.block.think.content) {
                                chunkObj = { type: 'think', content: data.block.think.content };
                            } else if (data.block && data.block.text && data.block.text.content) {
                                chunkObj = { type: 'text', content: data.block.text.content };
                            }
                        }
                    }

                    if (chunkObj) {
                        yield chunkObj;
                    }
                } catch (e) {
                    // Ignore parsing errors for partial/malformed frames
                }
            }
        }
    }
}

module.exports = KimiClient;
