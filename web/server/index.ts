import type { Connect } from "vite";
import * as http from "node:http";

export default function route(req: Connect.IncomingMessage, res: http.ServerResponse, next: Connect.NextFunction) {
  return true;
}