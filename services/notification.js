var admin = require('firebase-admin');
var serviceAccount = require("./tickfilm-bf4af-firebase-adminsdk-jzd6u-de6c6735db.json");
const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://tickfilm-bf4af.firebaseio.com"
});
class Notification {
    sendNotification(deviceToken, notifyTitle, notifyBody, dataKey) {
        var token = deviceToken;
        var message = {
            data: {
                my_key: dataKey,
            },
            notification: {
                title: notifyTitle,
                body: notifyBody
            },
            token: token
        };
        if (deviceToken) {
            const messaging = app.messaging();
            messaging.send(message)
                .then((response) => {
                    // Response is a message ID string.
                    console.log('Successfully sent message:', response);
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });
        }
    }

}
module.exports = new Notification()
