import path from "path";
import fs from "fs";

const prod = process.env.NODE_ENV === "production";
const watch = process.argv.includes("--watch");

const external = [
    "electron",
    "fs",
    "path",
    "module"
];

async function build(name, entry) {
    let outfile = path.join("./dist", name + ".js");

    const dropLabels = [];
    const labels = {
        injector: ["injector"],
        nodePreload: ["node-preload"],
        webPreload: ["web-preload"],
        browser: ["browser"],

        webTarget: ["web-preload", "browser"],
        nodeTarget: ["node-preload", "injector"]
    };
    for (const [label, targets] of Object.entries(labels)) {
        if (!targets.includes(name)) {
            dropLabels.push(label);
        }
    }

    const define = {
        //MOONLIGHT_ENV: `"${name}"`,
        //MOONLIGHT_PROD: prod.toString(),
        //MOONLIGHT_BRANCH: `"${buildBranch}"`,
        //MOONLIGHT_VERSION: `"${buildVersion}"`
    };

    const nodeDependencies = ["glob"];
    const ignoredExternal = name === "web-preload" ? nodeDependencies : [];

    const esbuildConfig = {
        entryPoints: [entry],
        outfile,

        format: "iife",
        globalName: "module.exports",

        platform: ["web-preload", "browser"].includes(name) ? "browser" : "node",

        treeShaking: true,
        bundle: true,
        minify: prod,
        sourcemap: "inline",

        external: [...ignoredExternal, ...external],

        define,
        dropLabels,

        logLevel: "silent",
        //plugins,

        // https://github.com/evanw/esbuild/issues/3944
        footer:
            name === "web-preload"
                ? {
                    js: `\n//# sourceURL=${name}.js`
                }
                : undefined
    };
}

const promises = [];

const coreExtensions = fs.readdirSync("./packages/core-extensions/src");
for (const ext of coreExtensions) {
    for (const fileExt of ["ts", "tsx"]) {
        for (const type of ["index", "node", "host"]) {
            if (fs.existsSync(`./packages/core-extensions/src/${ext}/${type}.${fileExt}`)) {
                promises.push(buildExt(ext, type, fileExt));
            }
        }
    }
}

await Promise.all(promises);