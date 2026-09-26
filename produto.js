/* A pagina de produto passa a servir os 191, e nao um.
 *
 * Todo cartao da vitrine aponta para produto.html?p=slug. Sem isso, cento e
 * noventa deles caiam na mesma pagina da Yara Candy: o caminho existia e
 * levava ao lugar errado, que e pior do que nao existir.
 *
 * A pagina nasce escrita com a Yara Candy porque ela e o unico produto com
 * tudo apurado: preco conferido, piramide olfativa, kit e foto propria. Para
 * os outros, este arquivo troca o que se sabe e APAGA o que nao se sabe. Nao
 * existe preco herdado, nota olfativa herdada nem kit herdado: ficar com o
 * dado do produto anterior seria inventar do jeito mais convincente possivel.
 */
(function () {
  'use strict'

  var slug = new URLSearchParams(location.search).get('p')
  if (!slug) return               // sem parametro, a pagina fica como nasceu

  var corpo = document.body
  corpo.setAttribute('data-carregando', '')

  function texto(sel, valor) {
    var el = document.querySelector(sel)
    if (el) el.textContent = valor
  }

  function sumir(sel) {
    var el = document.querySelector(sel)
    if (el) el.remove()
  }

  window.Catalogo.carregar().then(function (produtos) {
    var p = window.Catalogo.porSlug(produtos, slug)
    corpo.removeAttribute('data-carregando')
    if (!p) {
      naoEncontrado()
      return
    }

    var nomeCheio = p.marca + ' ' + p.nome
    document.title = nomeCheio + ' · Yanca Perfumaria'
    texto('.compra__marca', p.marca)
    texto('.compra h1', p.nome)
    texto('.barra-compra__nome', nomeCheio)

    // migalha de pao: o caminho de volta e o da categoria deste produto
    var trilha = document.querySelector('.trilha')
    if (trilha) {
      var rota = {
        importados: ['Perfumaria importada', 'colecao.html?c=importados'],
        arabes: ['Perfumaria árabe', 'colecao.html?c=arabes'],
        beleza: ['Beleza', 'colecao.html?c=beleza']
      }[p.categoria] || ['Toda a vitrine', 'colecao.html?c=tudo']
      trilha.innerHTML =
        '<a href="index.html">Início</a><span aria-hidden="true">·</span>' +
        '<a href="' + rota[1] + '">' + window.Catalogo.esc(rota[0]) + '</a>' +
        '<span aria-hidden="true">·</span>' +
        '<a href="colecao.html?marca=' + encodeURIComponent(p.marca) + '">' +
        window.Catalogo.esc(p.marca) + '</a>' +
        '<span aria-hidden="true">·</span>' +
        '<span aria-current="page">' + window.Catalogo.esc(p.nome) + '</span>'
    }

    // foto: uma so por produto. Galeria de uma foto nao e galeria.
    var retrato = document.querySelector('.retrato img')
    if (retrato && p.foto) {
      retrato.src = p.foto
      retrato.alt = 'Frasco de ' + nomeCheio
      if (p.foto_tamanho && p.foto_tamanho[0]) {
        retrato.width = p.foto_tamanho[0]
        retrato.height = p.foto_tamanho[1]
      }
      if (p.foto_recortada === false) {
        document.querySelector('.retrato').classList.add('retrato--branco')
      }
    }
    var barraFoto = document.querySelector('.barra-compra__foto img')
    if (barraFoto && p.foto) {
      barraFoto.src = p.foto
      if (p.foto_tamanho && p.foto_tamanho[0]) {
        barraFoto.width = p.foto_tamanho[0]
        barraFoto.height = p.foto_tamanho[1]
      }
    }

    /* Preco: nao existe para estes produtos, e a pagina diz isso em vez de
       repetir o preco da Yara Candy com outro nome em cima. */
    var valor = document.querySelector('.compra__valor')
    if (valor) {
      var comPreco = (p.variantes || []).some(function (v) { return v.preco })
      if (!comPreco) {
        valor.innerHTML = '<span class="compra__sem-preco">Preço ainda não definido para este frasco.</span>' +
          '<span class="medida">Cartão em até 3x sem juros, Pix e boleto.</span>'
      }
    }
    sumir('.kit-aviso')          // o aviso de kit e do produto que tem kit

    /* Tamanho: o que o catalogo sabe deste produto, e nada alem. */
    var lista = document.querySelector('.opcao__lista')
    if (lista) {
      var medidas = (p.variantes || []).map(function (v) { return v.medida }).filter(Boolean)
      if (!medidas.length) {
        var bloco = lista.closest('.opcao')
        if (bloco) {
          bloco.innerHTML = '<div class="opcao__titulo"><span class="medida">Tamanho</span></div>' +
            '<p class="opcao__nota">O volume deste item ainda não está cadastrado. ' +
            'Ele entra aqui junto com o preço.</p>'
        }
      } else {
        lista.innerHTML = medidas.map(function (m, i) {
          return '<button class="opcao__botao" type="button" aria-pressed="' +
            (i === 0 ? 'true' : 'false') + '">' + window.Catalogo.esc(m) + '</button>'
        }).join('')
        var nota = document.querySelector('.opcao__nota')
        if (nota) {
          nota.textContent = medidas.length === 1
            ? 'Este frasco sai em ' + medidas[0] + '. Outros volumes entram aqui quando estiverem definidos, cada um com o preço dele.'
            : 'Cada volume tem o preço dele. O preço aparece aqui quando estiver definido.'
        }
        lista.addEventListener('click', function (e) {
          var b = e.target.closest('.opcao__botao')
          if (!b) return
          lista.querySelectorAll('.opcao__botao').forEach(function (o) {
            o.setAttribute('aria-pressed', String(o === b))
          })
        })
      }
    }

    /* Piramide olfativa: so existe apurada para a Yara Candy. Herdar a dela
       seria descrever o cheiro de um perfume com as notas de outro, que e a
       mentira mais dificil de a cliente perceber e a mais cara quando ela
       percebe, porque ja comprou. */
    if (!p.notas) sumir('.olfato')
    sumir('.kit')                // idem: kit e do produto que tem kit

    // a linha de irmaos vira a linha da marca, que existe para todos
    var irmaos = document.querySelector('.irmaos')
    if (irmaos) {
      var daMarca = produtos.filter(function (o) {
        return o.marca === p.marca && o.slug !== p.slug && o.foto
      }).slice(0, 4)
      if (!daMarca.length) {
        irmaos.remove()
      } else {
        irmaos.querySelector('.irmaos__titulo').textContent = 'Outros da ' + p.marca
        irmaos.querySelector('.irmaos__fila').innerHTML = daMarca.map(function (o) {
          return '<a class="irmao" href="produto.html?p=' + encodeURIComponent(o.slug) + '">' +
            '<span class="irmao__foto"><img src="' + window.Catalogo.esc(o.foto) + '"' +
            (o.foto_tamanho && o.foto_tamanho[0]
              ? ' width="' + o.foto_tamanho[0] + '" height="' + o.foto_tamanho[1] + '"' : '') +
            ' alt="" loading="lazy"></span>' +
            '<span class="irmao__nome">' + window.Catalogo.esc(o.nome) + '</span></a>'
        }).join('')
      }
    }

    document.dispatchEvent(new CustomEvent('yanca:produto', { detail: p }))
  }).catch(function () {
    corpo.removeAttribute('data-carregando')
    naoEncontrado()
  })

  function naoEncontrado() {
    var alvo = document.querySelector('.compra')
    if (!alvo) return
    document.title = 'Produto não encontrado · Yanca Perfumaria'
    alvo.innerHTML =
      '<h1>Este produto não está na vitrine.</h1>' +
      '<p class="compra__sem-preco">O endereço aponta para um frasco que não existe no catálogo, ' +
      'ou que saiu dele. A vitrine inteira continua a um clique.</p>' +
      '<div class="compra__acoes">' +
      '<a class="acao acao--larga" href="colecao.html?c=tudo">' +
      '<span class="acao__texto">Ver a vitrine inteira</span></a></div>'
    sumir('.retrato img')
    sumir('.irmaos')
    sumir('.olfato')
    sumir('.kit')
    sumir('.barra-compra')
  }
})()
