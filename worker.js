const PLAY =
  'https://play.google.com/store/apps/details?id=com.planora.labs';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/go/play') return Response.redirect(PLAY, 302);
    if (pathname === '/go/features') return new Response(null, { status: 204 });
    return env.ASSETS.fetch(request);
  },
};
