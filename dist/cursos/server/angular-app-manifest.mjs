
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/buscar-certificados"
  },
  {
    "renderMode": 2,
    "route": "/intranet"
  },
  {
    "renderMode": 2,
    "redirectTo": "/",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 21825, hash: 'eb47befd56a7674b37ac2622ac2b40f2b8bfa0f1c1b8d1985df6674980237bd6', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 961, hash: '6ef0fc74d263e4936e016e21143451a9039c86b2e712c4c7b8c4c52081a49014', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'intranet/index.html': {size: 44255, hash: 'd1ab4778b7549786ab6c3e100340931f7743e141f91818a6fe66a8723ef06069', text: () => import('./assets-chunks/intranet_index_html.mjs').then(m => m.default)},
    'buscar-certificados/index.html': {size: 71086, hash: 'a630db9b2ce047ff00c57d495165ecb1222d3175b762a831cd97a7e2d3cd62d1', text: () => import('./assets-chunks/buscar-certificados_index_html.mjs').then(m => m.default)},
    'index.html': {size: 83917, hash: 'd16099ea0c768288e992cf7a7230f084eeb38a57ac30cbde3130be1b90443005', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-5OH2XYND.css': {size: 111737, hash: 'En/nT87voMs', text: () => import('./assets-chunks/styles-5OH2XYND_css.mjs').then(m => m.default)}
  },
};
