export type PatchMatch = string | RegExp;
export type PatchReplaceFn = (substring: string, ...args: string[]) => string;

export type PatchReplace = {
    match: PatchMatch;
    replacement: string | PatchReplaceFn;
}

export type Patch = {
    find: PatchMatch;
    replace: PatchReplace | PatchReplace[];
    hardFail?: boolean; // if any patches fail, all fail
    prerequisite?: () => boolean;
};

export type PluginExports = {
    patches?: Patch[];
    styles?: string[];
};