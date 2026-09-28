export default {
  async fetch(request, env, ctx) {
    // Serve os ficheiros estáticos e ativa o suporte a variáveis
    return await env.ASSETS.fetch(request);
  },
};
