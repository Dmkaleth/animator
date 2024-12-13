import * as CONSTANTS from "./constants.js"

Hooks.once("init", () => {
    game.settings.register(CONSTANTS.MODULE_ID, "nofslots", {
        config: false,
        scope: "world",
        type: Number,
        default: '5',
    });
    game.settings.register(CONSTANTS.MODULE_ID, "splash", {
        config: false,
        scope: "world",
        type: Array,
        default: [],
    });
});


export function getSetting(name) {
    return game.settings.get(CONSTANTS.MODULE_ID, name);
}

export function setSetting(name, value) {
    game.settings.set(CONSTANTS.MODULE_ID, name, value);
}