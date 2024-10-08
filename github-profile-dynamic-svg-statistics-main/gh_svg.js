const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a)); // https://www.trysmudford.com/blog/linear-interpolation-functions/
const valxp = n => {
    n = n << 0;
    let len = n.toString().length;
    return n < 5 * 10 ** (len - 1) ? 5 * 10 ** (len - 1) : 10 ** len;
}; // set goal for stars (1 -> 5 -> 10 -> 50 -> 100 -> 500 -> 1000 -> 5000 ...)

/* GitHub Visitor Count */
const ghvc = async (username, token) => { // Yandex Cloud Functions adds the generated iam token to context
    const TableName = "test/users";
    const getItemResponse = await fetch(process.env.ydb_endpoint, {
        method: 'POST',
        headers: { 'X-Amz-Target': 'DynamoDB_20120810.GetItem', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ TableName, Key: { "username": { "S": username } } })
    });

    let result = 1;
    if (getItemResponse.ok) {
        const data = await getItemResponse.json();
        if (data.Item) result = parseInt(data.Item.ghvc.N) + 1;
    };

    await fetch(process.env.ydb_endpoint, {
        method: 'POST',
        headers: { 'X-Amz-Target': 'DynamoDB_20120810.PutItem', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ TableName, Item: { "username": { "S": username }, "ghvc": { "N": result.toString() } } })
    });

    return result;
};

let fetch_result, prevOptions = ""; // store temp data to reduce number of requests

module.exports.handler = async function (event, context) {
    const options = Object.assign({
        max_langs: 9,
        use_default_lang_colors: false,
        username: 'zippw',
    }, event.queryStringParameters);

    if (!fetch_result || prevOptions !== JSON.stringify(options)) {
        const response = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `bearer ${process.env.gh_tkn}`
            },
            body: JSON.stringify({
                query: `{ user(login: "${options.username}") { repositories(first: 100) { nodes { name stargazerCount forkCount languages(first: 100) { edges { size node { name ${options.use_default_lang_colors === 'true' ? "color " : ""}} } } } } createdAt } }`
            })
        });

        fetch_result = await response.json();
        if (fetch_result.errors) return { body: fetch_result };
        prevOptions = JSON.stringify(options);
    }

    const
        langsData = fetch_result.data.user.repositories.nodes,
        langsObj = langsData.reduce((acc, repo) => {
            repo.languages.edges.forEach(({ size, node: { name, color } }) => {
                acc[name] = { size: (acc[name]?.size || 0) + size, color };
            });
            return acc;
        }, {}),
        totalLangsSize = Object.values(langsObj).reduce((acc, data) => acc + data.size, 0),
        totalStars = fetch_result.data.user.repositories.nodes.reduce((acc, data) => acc += data.stargazerCount, 0);

    let svg = {
        languages: "",
        perc: "",
        points: "",
        circles: "",
        collectedStarsStr: Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 2 }).format(totalStars),
        maxStarsStr: Intl.NumberFormat('en-US', { notation: "compact" }).format(valxp(totalStars)),
        starProgressWidth: range(0, valxp(totalStars), 0, 120, totalStars),
        profileViews: Intl.NumberFormat('en-US').format(await ghvc(options.username, context.token.access_token)),
        createdAt: new Date(fetch_result.data.user.createdAt).toLocaleString("en", { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
    };

    let languages = Object.entries(langsObj)
        .map(([name, { size, color }]) => ({ color, perc: ((size / totalLangsSize) * 100).toFixed(2), name }))
        .sort((a, b) => b.perc - a.perc)
        .map(x => x.name.length >= 17 ? { name: x.name.slice(0, 17) + "...", perc: x.perc } : x);

    let otherPerc = languages.slice(options.max_langs).reduce((acc, x) => acc + parseFloat(x.perc), 0);
    languages = languages.slice(0, options.max_langs);
    if (otherPerc > 0) languages.push({ color: "#8d96a0", perc: otherPerc.toFixed(2), name: "Other" });

    const circleOptions = {
        radius: 30,
        strokeWidth: 10
    };

    const circumference = 2 * Math.PI * circleOptions.radius;
    const circlePos = circleOptions.strokeWidth / 2 + circleOptions.radius;
    let languages_height = 20 + languages.length * 12 + 10;
    languages_height = clamp(languages_height, 40 + circleOptions.radius * 2 + circleOptions.strokeWidth / 2, 1000);
    let start = 100;
    svg.height = languages_height + 97;
    languages.forEach((lang, i, arr) => {
        let ci = arr.length - 1 - i;
        const color = options.use_default_lang_colors === 'true' ? lang.color : `hsl(269, 100%, ${Math.floor(lerp(20, 83, (ci + 1) / arr.length))}%)`;
        const ccolor = options.use_default_lang_colors === 'true' ? arr[ci].color : `hsl(269, 100%, ${Math.floor(lerp(20, 83, (i + 1) / arr.length))}%)`;
        const dashOffset = circumference - (arr[ci].perc * circumference / 100) + 1;
        const rotation = -90 + ((100 - start) * 360 / 100);

        svg.languages += `<tspan x="0" y="${i * 12}" style="animation-delay:${500 / arr.length * (i + 1)}ms" class="flicker">${lang.name}</tspan>`;
        svg.perc += `<tspan x="0" y="${i * 12}" style="animation-delay:${500 / arr.length * (i + 1)}ms" class="flicker">${lang.perc}%</tspan>`;
        svg.points += `<rect rx="2" x="0" y="${i * 12}" width="4" height="4" fill="${color}" style="animation-delay:${500 / arr.length * (i + 1)}ms" class="flicker"/>`;
        svg.circles += `<circle class="dcircle" cx="${circlePos}" cy="${circlePos}" r="${circleOptions.radius}" stroke-dasharray="${circumference.toFixed(4)}" stroke-dashoffset="${dashOffset}" stroke="${ccolor}" style="transform: rotate(${rotation}deg); transform-origin: ${circlePos}px ${circlePos}px" />`;
        start -= arr[ci].perc;
    });

    return {
        headers: {
            "Content-Type": "image/svg+xml",
            "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'", // use from <img src>
            "Cache-Control": "no-cache" // disable github camo cache
        },
        /* for testing svg */
        // body: require('fs').readFileSync('./svggen/raw.svg', 'utf-8').replace(/(\{\{(.*?)\}\})/g, (_, __, p2) => eval(p2)).replace(/(<%(.*?)%>)/g, (_, __, p2) => eval(p2)),

        /* Put here svg code from index.svg file */
        body: ``
    };
};