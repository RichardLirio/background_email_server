import { env } from "@/env";
import fs from "node:fs/promises";
import path from "node:path";
//path.resolve(__dirname, "../public/", "example.html");
export async function FileExist() {
  const filePath =
    env.NODE_ENV === "development"
      ? path.resolve(__dirname, "../../data/", "data.json")
      : __dirname + "/data/data.json";
  try {
    await fs.access(filePath, fs.constants.F_OK);
  } catch {
    await fs.writeFile(filePath, JSON.stringify([], null, 2)); //cria o arquivo json usado como banco de dados
    console.info("💾 Arquivo Json Criado com sucesso");
  }
}
