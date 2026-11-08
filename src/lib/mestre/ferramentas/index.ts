import "server-only";
import { registrarExtensao } from "./contexto";
import { extensaoVampiro } from "./vampiro";

// Ferramentas do mestre. Valem para todos os sistemas e para os dois provedores:
// a API chama `executarFerramenta` direto; o Claude Code chega aqui pela ponte MCP (rota /api/interno/ferramentas).
// Cada ferramenta grava o resultado no banco e publica para todos os aparelhos da mesa.
// Os nomes teste, rolar_dados e alterar_ficha são usados pelos provedores e pela ponte: não renomeie.
//
// Uma pasta, um arquivo por área (testes, ficha, cena, diario, combate) e um por extensão de sistema (vampiro).
// Ferramenta própria de um sistema novo = um arquivo com uma ExtensaoFerramentas + uma linha registrarExtensao aqui.

registrarExtensao(extensaoVampiro);

export { definirFerramentas } from "./definicoes";
export { executarFerramenta } from "./executar";
export { acharPersonagem, jogadorRolaOsDados, persistirPersonagem, registrarDado, registrarExtensao } from "./contexto";
export type { ContextoFerramentas, ExtensaoFerramentas } from "./contexto";
