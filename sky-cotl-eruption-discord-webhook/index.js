const SHARD_PTTRN = "C b A a B b C a A b B a".split(" ")
const REALMS = {
    "prairie": {
        name: "полуденной прерии",
        maps: {
            "bird": "птичье гнездо",
            "island": "остров укрытия",
            "cave": "пещера",
            "butterfly": "поля бабочек",
            "village": "колокольни"
        },
    },
    "forest": {
        name: "тайном лесу",
        maps: {
            "tree": "домик на дереве",
            "sunny": "бабушка",
            "end": "сад после храма",
            "brook": "ручей",
            "boneyard": "кладбище"
        },
    },
    "valley": {
        name: "долине триумфа",
        maps: {
            "rink": "ледяной каток",
            "hermit": "отшельник",
            "dreams": "деревушка мечтаний"
        },
    },
    "wasteland": {
        name: "золотой пустоши",
        maps: {
            "crab": "корабль с крабами",
            "ark": "забытый ковчег",
            "graveyard": "кладбище",
            "temple": "храм",
            "battlefield": "поле сражения"
        },
    },
    "vault": {
        name: "хранилище знаний",
        maps: {
            "jelly": "бухта медуз",
            "starlight": "звездная пустыня"
        },
    }
};

const SHARD_TYPES = [{
    type: "A",
    maps: ['prairie.bird', 'forest.tree', 'valley.dreams', 'wasteland.crab', 'vault.jelly'],
    schedule: ["9:28", "15:28", "21:28"],
    color: 8931327,
    description: "умеренные"
}, {
    type: "B",
    maps: ['prairie.island', 'forest.sunny', 'valley.hermit', 'wasteland.ark', 'vault.jelly'],
    schedule: ["10:38", "16:38", "22:38"],
    color: 15420235,
    description: "сильные"
}, {
    type: "C",
    maps: ['prairie.cave', 'forest.end', 'valley.dreams', 'wasteland.graveyard', 'vault.jelly'],
    schedule: ["14:48", "20:48", "2:48"],
    color: 4942285,
    description: "умеренные"
}, {
    type: "a",
    maps: ['prairie.butterfly', 'forest.brook', 'valley.rink', 'wasteland.temple', 'vault.starlight'],
    schedule: [],
    color: 11513775,
    description: "обыкновенные"
}, {
    type: "b",
    maps: ['prairie.village', 'forest.boneyard', 'valley.rink', 'wasteland.battlefield', 'vault.starlight'],
    schedule: [],
    color: 11513775,
    description: "обыкновенные"
}, {
    type: "X",
    schedule: []
}];

const calc_type = (date) => {
    const day = date.getDay(),
        letter = SHARD_PTTRN[(date.getDate() - 1) % SHARD_PTTRN.length];

    const exceptions = [["a", "b"], ["C", "b"], ["A", "C"], ["A", "B"], ["B"], null, ["a"]];
    if (exceptions[day] && exceptions[day].includes(letter)) return SHARD_TYPES[5];

    if (["A", "B", "C"].includes(letter)) return SHARD_TYPES.find(x => x.type === letter);
    return SHARD_TYPES.find(x => x.type === letter);
};

const calc_reward = (type, location) => {
    const defaultRewards = { "A": 2.5, "B": 3.5, "C": 2.0 };
    const overrideRewards = { 'forest.end': 2.5, 'valley.dreams': 2.5, 'forest.tree': 3.5, 'vault.jelly': 3.5 };
    return overrideRewards[location] || defaultRewards[type];
};

const send = (msg) => {
    return fetch(process.env.wh, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg)
    }).then(async r => {
        if (r.ok) return { statusCode: 200 }
        else throw new Error(`HTTP error! Status: ${r.status}`)
    }).catch(error => ({ statusCode: 520, body: { error: error.message || "Unknown error" } }))
}

module.exports.handler = async function (event) {
    const now = event?.body?.date || new Date();

    let res = calc_type(now), msg = {};

    const sc = res.schedule.map(x => x.split(":").map(Number).join(":")),
        current_time = `${now.getHours()}:${now.getMinutes()}`;

    const [r, m] = res.maps[(now.getDate() - 1) % res.maps.length].split('.'),
        realm = REALMS[r],
        map = realm.maps[m];

    if (current_time === "0:0") {
        if (res.type === "X") {
            return send({ content: "Осколки сегодня не падают." })
        } else {
            msg = {
                embeds: [{
                    color: res.color,
                    image: { url: `https://raw.githubusercontent.com/zippw/yandex-cloud-functions/sky-cotl-eruption-discord-webhook/main/sky/maps/eruption_maps_jpg/${r}/${m}.jpg` }
                }]
            };

            if (res.type === "a" || res.type === "b") {
                msg.embeds[0].description = `Извержение в **${realm.name} (${map})**`;
                msg.embeds[0].footer = { text: `${res.description} осколки.` };

                return send(msg);
            } else {
                msg.embeds[0].description = `Извержение в **${realm.name} (${map})**\n` +
                    "Расписание на сегодня: " +
                    res.schedule.map(x => {
                        const d = new Date();
                        d.setUTCHours(...x.split(":"), 0, 0);
                        return `<t:${(d.getTime() / 1000) << 0}:t>`
                    }).join(", ");
                msg.embeds[0].footer = {
                    icon_url: "https://cdn.discordapp.com/emojis/1236292546930413699.webp?size=128&quality=lossless",
                    text: calc_reward(res.type, [r, m].join('.')) + ` - максимальная награда 　|　 ${res.description} осколки.`
                };

                return send(msg);
            };

        }
    } else {
        if (!sc.includes(current_time)) return { statusCode: 200, body: { current_time, sc, timing: sc.includes(current_time) } };

        const ts = (now.getTime() / 1000) << 0;
        msg.content = `>>> <@&${process.env.sky_eruption_role_id}> Извержение в **${realm.name} (${map})**. Конец: <t:${ts + 60 * 60 * 4}:R>`;
        msg.allowed_mentions = { parse: ['roles'] };

        return send(msg)
    }
};
