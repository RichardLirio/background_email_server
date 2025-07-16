import fs from "fs";
import path from "path";
import { hash } from "bcrypt";
import { randomUUID } from "crypto";

interface Client {
  id: string;
  secret: string;
  name: string;
  active: boolean;
  scopes: string[];
}

const filePath = path.resolve(__dirname, "data.json");

export async function getClients() {
  const rawData = fs.readFileSync(filePath, "utf-8");

  const clientsArray: Client[] = JSON.parse(rawData);

  return clientsArray;
}

// Função para gerar hash de senha (para criar novos clientes)
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

// Função para adicionar novo cliente
export async function addClient(clientData: {
  secret: string;
  name: string;
  scopes: string[];
}) {
  const hashedSecret = await hashPassword(clientData.secret);

  const client = {
    id: randomUUID(),
    secret: hashedSecret,
    name: clientData.name,
    active: true,
    scopes: clientData.scopes,
  };
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  fs.writeFileSync(
    filePath,
    JSON.stringify([...data, client], null, 2),
    "utf-8"
  );

  return client.id;
}
