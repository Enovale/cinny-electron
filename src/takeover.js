stop();

(async () => {
    console.log(window.location);
    const unparsedHtml = await (await fetch(location.href.split("#")[0])).text();
    const parsedHtml = new DOMParser().parseFromString(unparsedHtml, "text/html");
    for (const attr of document.firstElementChild.attributes) {
        document.firstElementChild.removeAttributeNode(attr);
    }
    for (const attr of parsedHtml.firstElementChild.attributes) {
        document.firstElementChild.setAttributeNode(attr.cloneNode());
    }
    document.firstElementChild.replaceChildren(
        ...parsedHtml.firstElementChild.children
    );
    window.esmsInitOptions = {
        shimMode: true,
        nativePassthrough: false,
        async source(url, fetchOpts, parent, defaultSourceHook) {
            const src = await defaultSourceHook(url, fetchOpts, parent);
            // This is where you do plaintext hooks.
            if (typeof src.source == "string") {
                src.source = src.source.replaceAll("Welcome to Cinny", "Welcome to FaaF");
                src.source += `console.log("Hello! I am ${url}. I have been successfully hooked.")`
            }
            return src;
        }
    };
    for (mod of document.querySelectorAll('script[type="module"]')) {
        mod.setAttribute("type", "module-shim");
    };
    for (mod of document.querySelectorAll('link[rel="modulepreload"]')) {
        mod.setAttribute("rel", "modulepreload-shim");
    };
    const esmShims = await import("https://esm.sh/es-module-shims");
    for (script of document.querySelectorAll("script:not([type])")) {
        Object.defineProperty(document, "currentScript", {
            value: script,
            configurable: true
        });
        // I really hate doing this but unfortunately es-module-shims doesn't actually have an abstraction around it since it assumes that everything is running as an es module.
        // This realistically could be fixed via quartz, but quartz's lack of circular import handling makes it less usable for this exact purpose.
        eval(script.innerText.replaceAll("import(", "importShim("));
    }
    Object.defineProperty(document, "currentScript", {
        value: null,
        configurable: true
    });
})();