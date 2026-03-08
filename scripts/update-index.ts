import fs from "fs";

function file2commandName(file: string) {
    const fileNameWithoutExtension = file.replace(".ts", "");
    return {
        fileName: fileNameWithoutExtension,
        commandName: fileNameWithoutExtension.replace(
            /-([a-z])/g,
            (match, p1) => p1.toUpperCase()
        ),
    };
}

function updateIndexFile() {
    const commandsDir = "./src/commands";
    const indexPath = `${commandsDir}/index.ts`;

    const commandFiles = fs
        .readdirSync(commandsDir)
        .filter((file) => file.endsWith(".ts") && file !== "index.ts")
        .map(file2commandName);

    const exportStatements = commandFiles.map((file) => {
        return `import * as ${file.commandName} from "./${file.fileName}";`;
    });

    const commandsExport = `\nexport const commands = {\n${commandFiles
        .map((file) => {
            return `    [${file.commandName}.data.name]: ${file.commandName},`;
        })
        .join("\n")}\n};`;

    exportStatements.push(commandsExport);

    fs.writeFileSync(indexPath, exportStatements.join("\n"));
    console.log("Updated commands/index.ts with the following commands:");
    commandFiles.forEach((file) => {
        console.log(`  - ${file.commandName}`);
    });
}

updateIndexFile();
