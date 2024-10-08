const nacl = require("tweetnacl");
const amaribot = new (require("amaribot.js").AmariBot)(process.env.ab_tkn);
const unbelievaboat = new (require('unb-api').Client)(process.env.ub_tkn);

const utils = {
    headers: { "Content-Type": "application/json" },

    createResponse: (statusCode, body) => ({
        headers: utils.headers,
        statusCode,
        body: typeof body === "object" ? JSON.stringify(body) : body
    })
};

const commands = [{
    name: "profile",
    execute: async (interaction, bot) => {
        const targetOption = interaction.data?.options?.find(opt => opt.name === "target");
        const user = targetOption ? await bot.discordFetch("GET", "users", targetOption.value) : interaction.member.user;

        const { total } = await unbelievaboat.getUserBalance(bot.options.guildID, user.id);

        let lvlStr = "";
        try {
            let { exp, level } = await amaribot.getUserLevel(bot.options.guildID, user.id);
            if (level >= 50) {
                level = 50;
                exp = 0;
            }

            let expPerc = 10 * exp / amaribot.getNextLevelExp(level);
            lvlStr = `${level} Ур. [${"#".repeat(expPerc << 0)}${".".repeat(Math.ceil(10 - expPerc))}]`
        } catch (error) {
            console.log(error.message);
            lvlStr = "0 Ур. [..........]";
        }

        await bot.reply(interaction, {
            embeds: [{
                color: 0x9B6CF0,
                description: `<@${user.id}>\n\n\`${lvlStr}\`\nВ коробке: **${total} ${bot.options.emojis.currency}**`,
                thumbnail: { url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` }
            }]
        });
    }
}];

class DiscordBot {
    constructor(commands) {
        this.options = {
            api: `https://discord.com/api/v10`,
            guildID: "1008753716125499403",
            emojis: {
                currency: "<a:gem:1281664263504662529>"
            }
        }
        this.commands = commands;
    }

    async validateRequest({ headers, body }) {
        headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));

        const signature = headers["x-signature-ed25519"];
        const timestamp = headers["x-signature-timestamp"];
        if (!signature || !timestamp) return false;

        try {
            return nacl.sign.detached.verify(
                Buffer.from(timestamp + body),
                Buffer.from(signature, "hex"),
                Buffer.from(process.env.public_key, "hex")
            );
        } catch {
            return false;
        }
    }

    async discordFetch(method, ...route) {
        const url = `${this.options.api}/${route.join("/")}`;
        const response = await fetch(url, {
            method,
            headers: {
                ...utils.headers,
                Authorization: `Bot ${process.env.ds_tkn}`
            }
        });
        return response.json();
    }

    async reply(interaction, data) {
        const url = `${this.options.api}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
        return fetch(url, {
            method: 'PATCH',
            headers: utils.headers,
            body: JSON.stringify(data)
        });
    }

    async handleInteraction(interaction) {
        if (interaction.type === 1) return utils.createResponse(200, { type: 1 });

        if (interaction.type === 2) {
            const command = this.commands.find(cmd => cmd.name === interaction.data.name);
            if (command) {
                command.execute(interaction, this);
                return utils.createResponse(200, { type: 5 });
            }

            return utils.createResponse(200, { type: 4, data: { content: `Command \`${interaction.data.name}\` not found.`, flags: 1 << 6 } });
        }
    }
}

module.exports.handler = async function (event, context) {
    if (!event?.body) return utils.createResponse(400, { error: "No body" });

    const bot = new DiscordBot(commands);

    if (!await bot.validateRequest(event)) return utils.createResponse(401, { error: "Invalid request signature" });

    return bot.handleInteraction(JSON.parse(event.body));
};