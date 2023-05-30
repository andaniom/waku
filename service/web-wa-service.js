const {phoneNumberFormatter} = require("../helper/formater");
const messageRepository = require("../repository/message");

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
class WebWaService {
    constructor() {
    }

    async sendMessage(data) {
        // console.log('send_message', data);
        let devices = [];
        data.devices.forEach(clientId => {
            const client = sessions.find(sess => sess.id === clientId)?.client;
            if (client) {
                // console.log(client)
                devices.push(clientId);
            }
        })

        if (data.receivers.length === 0 || isNaN(devices.length) || devices.length <= 0) {
            return;
        }

        const partSize = Math.ceil(data.receivers.length / devices.length);

        let datas = [];

        for (let i = 0; i < data.receivers.length; i += partSize) {
            const part = data.receivers.slice(i, i + partSize);
            datas.push(part);
        }

        for (let i = 0; i < devices.length; i += devices.length) {
            const clientId = devices[i];
            await this.processMessage(clientId, datas[i], data.id);
        }
    }

    async processMessage(clientId, datas, messageId) {
        const client = sessions.find(sess => sess.id === clientId)?.client;
        if (client) {
            for (let i = 0; i < datas.length; i++) {
                try {
                    let receiver = datas[i];
                    const number = phoneNumberFormatter(receiver);
                    const isRegisteredNumber = await client.isRegisteredUser(number);
                    if (isRegisteredNumber) {
                        const message = await messageRepository.findById(messageId);
                        console.log(clientId, message.message, number)
                        const res = await client.sendMessage(number, message.message);
                        console.log(res);
                        let count = message.success ? (message.success + 1) : 1
                        const update = await messageRepository.update(messageId, {"success": count});
                        console.log("client send ", update)
                        io.emit('send-message', {"id": messageId, "value": receiver, "success": count});
                    }
                    await delay(1000);
                    if ((i + 1) % 10 === 0 && i !== 0) {
                        await delay(5000);
                    }
                } catch (e) {
                    console.log(e)
                }

            }
        }
    }

    async handleMessage(clientId, msg){
        console.log('MESSAGE RECEIVED', msg);
    }
}

module.exports = new WebWaService();