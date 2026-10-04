/* O catalogo, num lugar so.
 *
 * Antes a colecao montava a prateleira clonando cartao da home: a home era o
 * banco de dados. Com vinte produtos isso passa; com cento e noventa e um a
 * home teria que carregar o catalogo inteiro para a colecao poder filtrar, e
 * quem paga essa conta e a cliente no 4G.
 *
 * Agora o banco de dados e dados/catalogo.json, a home mostra uma fatia e a
 * colecao le o arquivo. O mesmo arquivo e o que vai virar a importacao do
 * Shopify depois, entao o trabalho de organizar isso nao se perde.
 *
 * Preco nao esta aqui porque ainda nao existe preco. Quando existir, ele
 * entra no JSON e o cartao passa a mostrar, sem mexer neste arquivo.
 */
(function (raiz) {
  'use strict'

  var CAMINHO = 'dados/catalogo.json'
  var cache = null

  function carregar() {
    if (cache) return cache
    cache = fetch(CAMINHO)
      .then(function (r) {
        if (!r.ok) throw new Error('catalogo ' + r.status)
        return r.json()
      })
      .then(function (d) { return d.produtos || [] })
    return cache
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function limpar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  }

  /* A linha de tamanho do cartao. Um volume aparece inteiro; muitos viram
     faixa, porque "20, 30, 35, 50, 80 e 100 ml" num cartao de 150px vira
     parede de numero e ninguem le. */
  function linhaMedidas(p) {
    var ms = (p.variantes || []).map(function (v) { return v.medida }).filter(Boolean)
    if (!ms.length) return 'Volume a confirmar'
    if (ms.length === 1) return ms[0]
    var numeros = ms.map(function (m) { return parseFloat(m) }).filter(function (n) { return !isNaN(n) })
    if (numeros.length !== ms.length) return ms.length + ' tamanhos'
    var menor = Math.min.apply(null, numeros)
    var maior = Math.max.apply(null, numeros)
    var unidade = (ms[0].split(' ')[1] || 'ml')
    if (ms.length === 2) return menor + ' e ' + maior + ' ' + unidade
    return ms.length + ' tamanhos, de ' + menor + ' a ' + maior + ' ' + unidade
  }

  var SACOLA_SVG = '<svg viewBox="0 0 24 24"><path d="M5 7.5h14l-1.2 13H6.2z"/>' +
    '<path d="M8.8 10V6.2a3.2 3.2 0 0 1 6.4 0V10"/></svg>'
  var CORACAO_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 20s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8c0 4.8-7 9.2-7 9.2z"/></svg>'

  function cartao(p, opcoes) {
    opcoes = opcoes || {}
    var nome = esc(p.nome)
    var marca = esc(p.marca)
    var destino = 'produto.html?p=' + encodeURIComponent(p.slug)
    var foto = p.foto
      ? '<img src="' + esc(p.foto) + '"' +
        (p.foto_tamanho && p.foto_tamanho[0]
          ? ' width="' + p.foto_tamanho[0] + '" height="' + p.foto_tamanho[1] + '"' : '') +
        ' alt="' + marca + ' ' + nome + '" loading="' + (opcoes.ansioso ? 'eager' : 'lazy') + '">'
      : '<span class="peca__sem-foto" aria-hidden="true"></span>'

    return '<div class="peca-caixa">' +
      '<a class="peca" href="' + destino + '">' +
      (p.selo ? '<span class="peca__selo">' + esc(p.selo) + '</span>' : '') +
      '<span class="peca__retrato' +
      (p.foto && p.foto_recortada === false ? ' peca__retrato--branco' : '') +
      (p.foto_base ? ' peca__retrato--apoiado"' +
        ' style="--base-largura: ' + (p.foto_base.largura * 100).toFixed(1) + '%;' +
        ' --base-altura: ' + (p.foto_base.altura * 100).toFixed(1) + '%"' : '"') + '>' + foto +
      '<span class="peca__rapido">Compra rápida' + SACOLA_SVG + '</span></span>' +
      '<span class="peca__marca medida">' + marca + '</span>' +
      '<h3 class="peca__nome">' + nome + '</h3>' +
      '<span class="peca__rodape"><span class="peca__medidas">' +
      esc(linhaMedidas(p)) + '</span></span>' +
      '</a>' +
      '<button class="favorito" type="button" aria-pressed="false" ' +
      'aria-label="Favoritar ' + marca + ' ' + nome + '">' + CORACAO_SVG + '</button>' +
      '</div>'
  }

  /* Filtro. Tudo que a barra de endereco sabe dizer sobre a prateleira. */
  function filtrar(produtos, f) {
    f = f || {}
    var saida = produtos

    if (f.categoria) {
      saida = saida.filter(function (p) { return p.categoria === f.categoria })
    }
    if (f.subcategoria) {
      saida = saida.filter(function (p) { return p.subcategoria === f.subcategoria })
    }
    if (f.marca) {
      var alvo = limpar(f.marca)
      saida = saida.filter(function (p) { return limpar(p.marca) === alvo })
    }
    if (f.genero) {
      saida = saida.filter(function (p) { return p.genero === f.genero })
    }
    if (f.busca) {
      var termos = limpar(f.busca).split(/\s+/).filter(Boolean)
      saida = saida.filter(function (p) {
        var campo = limpar(p.marca + ' ' + p.nome + ' ' + (p.subcategoria || ''))
        return termos.every(function (t) { return campo.indexOf(t) > -1 })
      })
    }
    return saida
  }

  function marcasDe(produtos) {
    var vistas = []
    produtos.forEach(function (p) {
      if (vistas.indexOf(p.marca) === -1) vistas.push(p.marca)
    })
    return vistas.sort(function (a, b) { return a.localeCompare(b, 'pt-BR') })
  }

  function porSlug(produtos, slug) {
    for (var i = 0; i < produtos.length; i++) {
      if (produtos[i].slug === slug) return produtos[i]
    }
    return null
  }

  raiz.Catalogo = {
    carregar: carregar,
    cartao: cartao,
    filtrar: filtrar,
    marcasDe: marcasDe,
    porSlug: porSlug,
    linhaMedidas: linhaMedidas,
    esc: esc,
    limpar: limpar,
  }
})(window)
