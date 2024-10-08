const fs = require('fs');
const pug = require('pug');
const cssnano = require('cssnano');

async function replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (full, ...args) => {
        promises.push(asyncFn(full, ...args));
        return full;
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
};

let pugStr = fs.readFileSync("./index.pug", "utf-8");
const html = pug.compile(pugStr)();

replaceAsync(html, /<style>(.*?)<\/style>/gs, async (match, css) => {
    let ccsnanofn = cssnano();
    const mini_css = await ccsnanofn.process(css, { from: undefined });
    return "<style>" + mini_css.css + "</style>";
}).then((res) => {
    fs.writeFileSync("./raw.svg", res);
    res = res
        .replace(/<%(.*?)%>/g, (match, p1) => "${" + p1 + "}")
        .replace(/\{\{(.*?)\}\}/g, (match, p1) => "${" + p1 + "}");
    
    fs.writeFileSync("./index.svg", res);
});