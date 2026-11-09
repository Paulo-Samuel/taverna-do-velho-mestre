// Link que abre a criação já com a aventura marcada (modo história ou avançado no sistema dela). Sem "server-only".
export function linkDaAventura(a: { id: string; sistemas: string[] }): string {
  const sistema = a.sistemas[0];
  return sistema === "historia" ? `/nova?aventura=${a.id}` : `/nova/avancada?sistema=${sistema}&aventura=${a.id}`;
}
