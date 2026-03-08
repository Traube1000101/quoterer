import * as ping from "./ping";
import * as quote from "./quote";
import * as quoteMuch from "./quoteMuch";
import * as setChannel from "./setChannel";

export const commands = {
    [ping.data.name]: ping,
    [quote.data.name]: quote,
    [quoteMuch.data.name]: quoteMuch,
    [setChannel.data.name]: setChannel,
};