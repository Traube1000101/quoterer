import { deployCommandsGlobal } from "@/util/deploy-commands";
import { commands } from "@/commands";

const commandsData = Object.values(commands).map((command) => command.data);
deployCommandsGlobal(commandsData);
