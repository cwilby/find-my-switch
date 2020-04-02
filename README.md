# Find My Switch

Monitors Amazon and sends a SMS/Slack notification when a Nintendo Switch becomes available for sale on Amazon.com.

**Note**

Requires a Twilio and Slack account.

## Installation

1. Clone this repo.
2. `npm install`
3. (Optional) Modify products.json with the name and url of Nintendo Switch products
4. Create a .env file with the following attributes

```                                                
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/123123123/12312312312/123123123123123123123123
SLACK_CHANNEL="#general"
TWILIO_ACCOUNT_SID=1231231231231231231231231231231231
TWILIO_AUTH_TOKEN=12312312312312312312312312312312
TWILIO_PHONE_NUMBER=+6191234567
SMS_TO_NUMBER=+6192345678,+16193456789
SCAN_INTERVAL=15
```

5. Leave it running and receive a notification when a Nintendo Switch becomes available.

```
npm start
```
