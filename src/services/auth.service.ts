import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "@/env";
import { getClients } from "@/data/clients";

export async function authenticate(client_id: string, client_secret: string) {
  const clients = await getClients();

  const client = clients.find((client) => {
    return client_id === client.id;
  });

  if (!client || !client.active) {
    throw new Error("invalid_client");
  }

  const isValid = await bcrypt.compare(client_secret, client.secret);
  if (!isValid) {
    throw new Error("invalid_client");
  }

  const token = jwt.sign({ client_id: client.id }, env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return {
    token,
    scope: client.scopes.join(" "),
    name: client.name,
  };
}
