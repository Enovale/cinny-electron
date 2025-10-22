import {PluginExports} from "@cinny-electron/types";

export const patches: PluginExports["patches"] = [
    {
        find: /(,\i\(\i\?\i\?\i:\i:\i\))/,
        replace: {
            match: /(,\i\((\i)\?(\i)\?\i:\i:\i\))/,
            replacement: `$0;console.log("Favicon changed. Total: \${$1}, Highlight: \${$2}")`
        }
    }
]