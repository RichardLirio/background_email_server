import fs from "node:fs/promises";

export async function FileExist(file: string) {
  try {
    await fs.access(file, fs.constants.F_OK);
  } catch {
    await fs.writeFile("./src/data/data.json", JSON.stringify([], null, 2)); //cria o arquivo json usado como banco de dados
    console.info("💾 Arquivo Json Criado com sucesso");
  }
}
