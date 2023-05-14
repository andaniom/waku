const {phoneNumberFormatter} = require("../helper/formater");

class WebWaService {
    constructor() {
    }

    async sendMessage(data) {
        console.log('send_message', data);
        let devices = [];
        data.devices.forEach(clientId => {
            const client = sessions.find(sess => sess.id === clientId)?.client;
            if (client) {
                console.log(client)
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
            await this.processMessage(clientId, datas[i]);
        }
    }

    async processMessage(clientId, datas) {
        const client = sessions.find(sess => sess.id === clientId)?.client;
        if (client) {
            console.log(client)
            datas.forEach(receiver => {
                const message = data.message;
                const number = phoneNumberFormatter(receiver);
                console.log(message, number)
                client.isRegisteredUser(number).then(isRegisteredNumber => {
                    if (isRegisteredNumber) {
                        client.sendMessage(number, message);
                    }
                });
            });
        }
    }
}

module.exports = new WebWaService();