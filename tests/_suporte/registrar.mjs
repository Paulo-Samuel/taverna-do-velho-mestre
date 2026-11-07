// Ponto de entrada do `node --import` usado por `npm test` e pelos scripts golden: liga o carregador (carregador.mjs) antes de
// qualquer módulo do projeto ser importado. Sem dependência nova: só o type stripping do Node 24 e os hooks de módulo.
import { register } from "node:module";

register("./carregador.mjs", import.meta.url);
