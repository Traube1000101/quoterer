import * as ping from "./ping";
import * as setChannel from "./setChannel";
import * as quote from "./quote";
import * as quoteMuch from "./quoteMuch";

export const commands = {
    ping,
    "set-channel": setChannel,
    quote: quote,
    "quote-much": quoteMuch,
};
