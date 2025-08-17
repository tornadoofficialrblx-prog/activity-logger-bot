const { Client, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

const CHANNEL_ID = '1393362245089759273'; // Your log channel ID
let logs = {}; // Tracks usernames and their message IDs + time in seconds

// Helper: convert Discord embed time string to seconds
function parseTime(timeStr) {
    const parts = timeStr.split(/m|s/).map(p => p.trim()).filter(Boolean);
    let seconds = 0;
    if (parts.length === 2) seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    else if (timeStr.includes('m')) seconds = parseInt(parts[0]) * 60;
    else if (timeStr.includes('s')) seconds = parseInt(parts[0]);
    return seconds;
}

// Helper: convert seconds to "Xm Ys" format
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m > 0 ? m + 'm ' : ''}${s}s`;
}

// On bot ready, scan old messages
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const channel = await client.channels.fetch(CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 100 });
    messages.forEach(msg => {
        if (!msg.embeds.length) return;
        const embed = msg.embeds[0];
        if (!embed.fields) return;
        const usernameField = embed.fields.find(f => f.name === 'Username:');
        const timeField = embed.fields.find(f => f.name === 'Time:');
        if (!usernameField || !timeField) return;
        const username = usernameField.value;
        const timeInSeconds = parseTime(timeField.value);
        logs[username] = { messageId: msg.id, timeInSeconds };
    });
    console.log('Finished scanning old logs:', logs);
});

// Listen for new messages (webhooks)
client.on('messageCreate', async message => {
    if (message.channel.id !== CHANNEL_ID) return;
    if (!message.webhookId) return; // Only process webhook messages
    if (!message.embeds.length) return;
    const embed = message.embeds[0];
    if (!embed.fields) return;

    const usernameField = embed.fields.find(f => f.name === 'Username:');
    const timeField = embed.fields.find(f => f.name === 'Time:');
    if (!usernameField || !timeField) return;

    const username = usernameField.value;
    const newTime = parseTime(timeField.value);

    let totalTime = newTime;

    // If old log exists, add time and delete old message
    if (logs[username]) {
        const oldMessageId = logs[username].messageId;
        const oldTime = logs[username].timeInSeconds;
        totalTime += oldTime;

        try {
            const oldMsg = await message.channel.messages.fetch(oldMessageId);
            if (oldMsg) await oldMsg.delete();
        } catch (err) {
            console.log('Error deleting old message:', err.message);
        }
    }

    // Send new log
    const sentMsg = await message.channel.send({
        embeds: [{
            title: "Staff Activity Tracker",
            color: 2829617,
            description: "Activity Log",
            fields: [
                { name: 'Username:', value: username },
                { name: 'Time:', value: formatTime(totalTime) }
            ]
        }]
    });

    // Update logs tracking
    logs[username] = { messageId: sentMsg.id, timeInSeconds: totalTime };
    console.log(`Updated log for ${username}: ${formatTime(totalTime)}`);
});

client.login('MTQwNjYzNjMyMTE4MjcxNjAxNA.G35aqO.hQlHzxkXSOQ3_neuwd8fhzBGRX_qD_dVU6vbPM');
