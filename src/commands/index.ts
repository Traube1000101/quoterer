import * as ping from "./ping";
import * as quote from "./quote";
import * as quoteMuch from "./quoteMuch";
import * as quoteMuchPrivate from "./quoteMuchPrivate";
import * as quotePrivate from "./quotePrivate";
import * as setChannel from "./setChannel";

export const commands = {
    [ping.data.name]: ping,
    [quote.data.name]: quote,
    [quoteMuch.data.name]: quoteMuch,
    [quoteMuchPrivate.data.name]: quoteMuchPrivate,
    [quotePrivate.data.name]: quotePrivate,
    [setChannel.data.name]: setChannel,
};