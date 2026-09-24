// Movimento da loja. Três coisas, orquestradas, e nada espalhado.
//
// 1. A revelação ao rolar só é ligada aqui dentro. O estado escondido vive sob
//    html.revelando, então página sem JS, ou com movimento reduzido, nasce
//    inteira visível. Conteúdo escondido por animação que não roda é conteúdo
//    perdido, e isso custa venda.
// 2. O cabeçalho encolhe e recolhe a tarja ao descer, devolve ao subir.
// 3. Os trilhos horizontais rolam com a roda do mouse, que é o que falta na
//    maioria das lojas e obriga a arrastar.

(function () {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches

  /* 1. revelação */
  if (!quieto && 'IntersectionObserver' in window) {
    const alvos = document.querySelectorAll(
      '.secao__cabeca, .peca, .marca-cartao, .area, .frente, .beneficio, .faixa-kit__grade > *, .kit__caixa, .gaveta, .olfato__desenho, .olfato__grade > div, .irmaos, .medidas'
    )
    if (alvos.length) {
      document.documentElement.classList.add('revelando')
      alvos.forEach((el) => el.classList.add('revelar'))
      const olho = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((e) => {
            if (!e.isIntersecting) return
            e.target.classList.add('visivel')
            olho.unobserve(e.target)
          })
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
      )
      alvos.forEach((el) => olho.observe(el))

      // Rede de segurança: se algo não for observado a tempo, revela tudo.
      setTimeout(() => alvos.forEach((el) => el.classList.add('visivel')), 4000)
    }
  }

  /* 1c. barra de compra fixa na página de produto */
  const barra = document.querySelector('.barra-compra')
  const gatilho = document.querySelector('.compra__acoes')
  if (barra && gatilho && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([e]) => barra.classList.toggle('visivel', !e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 }
    ).observe(gatilho)
  }

  /* 1d. o número da economia conta até o valor quando entra na tela.
     Só no valor de economia: número que sobe em toda parte vira ruído, e aqui
     ele existe para a pessoa ver o tamanho do desconto se formar. */
  const contar = (el) => {
    const alvo = parseFloat(el.textContent.replace(/[^\d,]/g, '').replace(',', '.'))
    if (!isFinite(alvo)) return
    const dinheiro = (v) => 'R$ ' + v.toFixed(2).replace('.', ',')
    const duracao = 1100
    const inicio = performance.now()
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / duracao)
      const suave = 1 - Math.pow(1 - t, 3)
      el.textContent = dinheiro(alvo * suave)
      if (t < 1) requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  }

  const numeros = document.querySelectorAll('.kit-aviso__valor strong, .kit__economia strong')
  if (numeros.length && !quieto && 'IntersectionObserver' in window) {
    const olho = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (!e.isIntersecting) return
          contar(e.target)
          olho.unobserve(e.target)
        })
      },
      { threshold: 0.9 }
    )
    numeros.forEach((n) => olho.observe(n))
  }

  /* 1e. a sacola pula quando um item entra por compra rápida */
  const conta = document.querySelector('.sacola__conta')
  document.querySelectorAll('.peca__rapido').forEach((botao) => {
    botao.addEventListener('click', (e) => {
      e.preventDefault()
      if (!conta) return
      conta.textContent = String(+conta.textContent + 1)
      conta.classList.remove('pulando')
      void conta.offsetWidth
      conta.classList.add('pulando')
    })
  })

  /* 1f. profundidade.
     Um listener só de pointermove no documento serve os cartões e o retrato
     do produto. Tudo sai em variável CSS e o CSS faz a
     transição, então nenhum quadro é calculado no JavaScript. */
  if (!quieto && matchMedia('(hover: hover)').matches) {
    const retrato = document.querySelector('.retrato')
    let pendente = false
    let ultimo = null

    const aplicar = () => {
      pendente = false
      const e = ultimo
      if (!e) return

      // o retrato do produto se move como vidro pesado: ângulo menor ainda
      if (retrato) {
        const c = retrato.getBoundingClientRect()
        if (e.clientY > c.top - 200 && e.clientY < c.bottom + 200) {
          const dx = (e.clientX - (c.left + c.width / 2)) / (c.width / 2)
          const dy = (e.clientY - (c.top + c.height / 2)) / (c.height / 2)
          retrato.style.setProperty('--ry', (Math.max(-1, Math.min(1, dx)) * 4).toFixed(2) + 'deg')
          retrato.style.setProperty('--rx', (Math.max(-1, Math.min(1, -dy)) * 3).toFixed(2) + 'deg')
        }
      }

      // o cartão sob o cursor inclina e acende
      const cartao = e.target.closest && e.target.closest('.peca')
      if (cartao) {
        const c = cartao.getBoundingClientRect()
        const px = (e.clientX - c.left) / c.width
        const py = (e.clientY - c.top) / c.height
        cartao.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg')
        cartao.style.setProperty('--rx', ((0.5 - py) * 9).toFixed(2) + 'deg')
        const foto = cartao.querySelector('.peca__retrato')
        if (foto) {
          const f = foto.getBoundingClientRect()
          foto.style.setProperty('--luzx', (((e.clientX - f.left) / f.width) * 100).toFixed(1) + '%')
          foto.style.setProperty('--luzy', (((e.clientY - f.top) / f.height) * 100).toFixed(1) + '%')
        }
      }
    }

    addEventListener(
      'pointermove',
      (e) => {
        ultimo = e
        if (pendente) return
        pendente = true
        requestAnimationFrame(aplicar)
      },
      { passive: true }
    )

    // ao sair, tudo volta ao repouso pela própria transição do CSS
    document.addEventListener(
      'pointerout',
      (e) => {
        const cartao = e.target.closest && e.target.closest('.peca')
        if (cartao && !cartao.contains(e.relatedTarget)) {
          cartao.style.removeProperty('--rx')
          cartao.style.removeProperty('--ry')
        }
      },
      true
    )
  }

  /* 1h. palco de banners do topo.
     Uma pista com translate e nada de reposicionar elemento: o navegador
     resolve o deslize na composição, então roda liso até em celular fraco.

     Passa sozinho, mas para quando o cursor entra, quando o foco cai dentro,
     quando a aba sai de vista e quando a pessoa toma o controle. Banner que
     troca embaixo do dedo de quem estava lendo é o defeito clássico daqui. */
  const pista = document.querySelector('.palco__pista')
  if (pista) {
    const palco = pista.closest('.palco')
    const cenas = [...pista.children]
    const caixaPontos = palco.querySelector('.palco__pontos')
    const ESPERA = 7000
    let atual = 0
    let relogio = null

    cenas.forEach((cena, i) => {
      const ponto = document.createElement('button')
      ponto.className = 'palco__ponto'
      ponto.type = 'button'
      ponto.setAttribute('role', 'tab')
      ponto.setAttribute('aria-label', 'Destaque ' + (i + 1))
      ponto.addEventListener('click', () => {
        ir(i)
        segurar()
      })
      caixaPontos.appendChild(ponto)
    })
    const pontos = [...caixaPontos.children]

    function ir(n) {
      atual = (n + cenas.length) % cenas.length
      pista.style.setProperty('--i', atual)
      cenas.forEach((cena, i) => {
        cena.classList.toggle('cena--ativa', i === atual)
        // inert tira do foco e do leitor de tela o que está fora de vista,
        // senão o Tab sai passeando por banner que ninguém está vendo.
        cena.inert = i !== atual
      })
      pontos.forEach((ponto, i) => ponto.setAttribute('aria-selected', String(i === atual)))
    }

    function andar() {
      relogio = setTimeout(() => {
        ir(atual + 1)
        andar()
      }, ESPERA)
    }
    function parar() {
      clearTimeout(relogio)
      relogio = null
    }
    function segurar() {
      parar()
      if (!quieto && !document.hidden) andar()
    }

    palco.querySelectorAll('[data-palco]').forEach((b) =>
      b.addEventListener('click', () => {
        ir(atual + Number(b.dataset.palco))
        segurar()
      })
    )

    palco.addEventListener('pointerenter', parar)
    palco.addEventListener('pointerleave', segurar)
    palco.addEventListener('focusin', parar)
    palco.addEventListener('focusout', segurar)
    document.addEventListener('visibilitychange', () => (document.hidden ? parar() : segurar()))

    palco.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      ir(atual + (e.key === 'ArrowRight' ? 1 : -1))
      segurar()
    })

    // Arrastar com o dedo. Só conta gesto horizontal: se a pessoa está
    // rolando a página, o banner não pode roubar o movimento.
    let px = 0
    let py = 0
    let arrastando = false
    palco.addEventListener('pointerdown', (e) => {
      px = e.clientX
      py = e.clientY
      arrastando = true
    })
    palco.addEventListener('pointerup', (e) => {
      if (!arrastando) return
      arrastando = false
      const dx = e.clientX - px
      const dy = e.clientY - py
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        ir(atual + (dx < 0 ? 1 : -1))
        segurar()
      }
    })

    ir(0)
    segurar()
  }

  /* 1g. gaveta de menu do celular.
     Foco preso dentro dela enquanto está aberta, Esc fecha, e o fundo trava
     de rolar. Gaveta que deixa a página rolar por baixo é a falha mais comum
     em loja no celular, e é a que faz a pessoa perder o lugar onde estava. */
  const gaveta = document.querySelector('.menu-movel')
  const veu = document.querySelector('.veu')
  if (gaveta && veu) {
    const focaveis = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
    let devolverFoco = null

    const abrir = (comBusca) => {
      devolverFoco = document.activeElement
      veu.hidden = false
      requestAnimationFrame(() => {
        veu.classList.add('aberto')
        gaveta.classList.add('aberta')
      })
      gaveta.setAttribute('aria-hidden', 'false')
      document.body.style.overflow = 'hidden'
      document.querySelectorAll('[data-abre-gaveta]').forEach((b) => b.setAttribute('aria-expanded', 'true'))
      const alvo = comBusca ? gaveta.querySelector('input') : gaveta.querySelector(focaveis)
      alvo && alvo.focus()
    }

    const fechar = () => {
      veu.classList.remove('aberto')
      gaveta.classList.remove('aberta')
      gaveta.setAttribute('aria-hidden', 'true')
      document.body.style.overflow = ''
      document.querySelectorAll('[data-abre-gaveta]').forEach((b) => b.setAttribute('aria-expanded', 'false'))
      setTimeout(() => { veu.hidden = true }, 450)
      devolverFoco && devolverFoco.focus()
    }

    document.querySelectorAll('[data-abre-gaveta]').forEach((b) =>
      b.addEventListener('click', () => abrir(b.classList.contains('busca-movel')))
    )
    document.querySelectorAll('[data-fecha-gaveta]').forEach((b) => b.addEventListener('click', fechar))
    gaveta.querySelectorAll('.menu-movel__lista a, .menu-movel__pe a').forEach((a) => a.addEventListener('click', fechar))

    addEventListener('keydown', (e) => {
      if (!gaveta.classList.contains('aberta')) return
      if (e.key === 'Escape') return fechar()
      if (e.key !== 'Tab') return
      const itens = [...gaveta.querySelectorAll(focaveis)].filter((el) => el.offsetParent !== null)
      if (!itens.length) return
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    })
  }

  /* 1i. convite de primeira visita.
     Abre uma vez, guarda a resposta por trinta dias e some. Pop-up que volta
     toda visita expulsa justamente quem já estava dentro da loja.

     Nasce com hidden no HTML: sem JS, ninguém fica com uma caixa presa na
     frente da vitrine. */
  const convite = document.getElementById('convite')
  if (convite) {
    const CHAVE = 'yanca:convite'
    const DIAS = 30
    let devolveFoco = null

    const jaViu = () => {
      // Saida para fotografar a loja sem a caixa na frente: serve para captura
      // de tela, arte de anuncio e conferencia de layout.
      if (location.search.includes('sem-convite')) return true
      try {
        const quando = Number(localStorage.getItem(CHAVE))
        return quando && Date.now() - quando < DIAS * 864e5
      } catch (e) {
        // navegação privada bloqueia storage; melhor não mostrar do que estourar
        return true
      }
    }
    const anotar = () => {
      try {
        localStorage.setItem(CHAVE, String(Date.now()))
      } catch (e) {}
    }

    const abrirConvite = () => {
      convite.hidden = false
      devolveFoco = document.activeElement
      document.body.style.overflow = 'hidden'
      const campo = convite.querySelector('input')
      if (campo) campo.focus({ preventScroll: true })
    }
    const fecharConvite = () => {
      convite.hidden = true
      document.body.style.overflow = ''
      anotar()
      if (devolveFoco && devolveFoco.focus) devolveFoco.focus()
    }

    convite.querySelectorAll('[data-fecha-convite]').forEach((b) =>
      b.addEventListener('click', fecharConvite)
    )
    addEventListener('keydown', (e) => {
      if (convite.hidden) return
      if (e.key === 'Escape') {
        fecharConvite()
        return
      }
      if (e.key !== 'Tab') return
      const itens = [...convite.querySelectorAll('button, input')].filter((el) => el.offsetParent !== null)
      if (!itens.length) return
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    })

    const forma = convite.querySelector('.convite__forma')
    if (forma) {
      forma.addEventListener('submit', (e) => {
        e.preventDefault()
        const campo = forma.querySelector('input')
        const erro = forma.querySelector('.convite__erro')
        const valor = campo.value.trim()
        // Validação em português: o aviso do próprio navegador sai em inglês
        // em muita máquina, e numa loja brasileira isso parece defeito.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
          erro.textContent = 'Confira o e-mail: está faltando alguma coisa nele.'
          erro.hidden = false
          campo.focus()
          return
        }
        erro.hidden = true
        const pronto = document.createElement('p')
        pronto.className = 'convite__pronto'
        pronto.textContent = 'Pronto. Você entrou na lista com ' + valor + '.'
        forma.replaceChildren(pronto)
        anotar()
        setTimeout(fecharConvite, 2600)
      })
    }

    if (!jaViu()) setTimeout(abrirConvite, 2600)
  }

  /* 1j. idioma da loja.
     O padrão é português e ele nunca depende de JS: a página nasce em
     português no próprio HTML. O inglês é uma camada por cima, trocando só o
     texto de interface, e a escolha fica guardada.

     Nome de produto e de marca ficam de fora do dicionário de propósito:
     "Good Girl Eau de Parfum" se chama assim nos dois idiomas. */
  const IDIOMAS = {
    en: {
      'Envio para todo o Brasil': 'We ship across Brazil',
      'Frete calculado no seu CEP': 'Shipping calculated by postcode',
      'Até 3x sem juros': 'Up to 3x interest free',
      'No cartão ou no Pix': 'Card or Pix',
      'Lacrado e original': 'Sealed and genuine',
      'Nota fiscal em todo pedido': 'Invoice with every order',
      'Sete dias para desistir': 'Seven days to change your mind',
      'Como manda o CDC': 'As Brazilian consumer law requires',
      Importados: 'Designer',
      Árabes: 'Arabic',
      Beleza: 'Beauty',
      Marcas: 'Brands',
      Kits: 'Bundles',
      Buscar: 'Search',
      'Minha conta': 'My account',
      Favoritos: 'Wishlist',
      'Abrir menu': 'Open menu',
      'Fechar menu': 'Close menu',
      'Buscar por Khamrah, Anua, protetor solar…': 'Search Khamrah, Anua, sunscreen…',
      'Perfumaria importada': 'Designer perfumery',
      'As grifes que você já conhece pelo nome.': 'The houses you already know by name.',
      'Ver os importados': 'Shop designer',
      'Perfumaria árabe': 'Arabic perfumery',
      'Khamrah, Asad, Yara e a linha inteira.': 'Khamrah, Asad, Yara and the whole line.',
      'Ver os árabes': 'Shop Arabic',
      'Body splash e creme, na mesma página.': 'Body splash and cream, on one page.',
      'Ver os kits': 'Shop bundles',
      'A prateleira de grife': 'The designer shelf',
      'Ver os 35 de grife': 'See all 35 designer',
      'Ver os 60 perfumes': 'See all 60 perfumes',
      'O mais procurado da prateleira': 'Most asked for on this shelf',
      'Compra rápida': 'Quick add',
      'Preço a definir': 'Price to be set',
      'Foto oficial pendente': 'Official photo pending',
      'As marcas': 'The brands',
      'Ver todas': 'See all',
      'Banho e corpo': 'Bath and body',
      Corpo: 'Body',
      Rosto: 'Face',
      Solar: 'Sun care',
      Novo: 'New',
      'Ver a beleza inteira': 'Shop all beauty',
      'Primeira visita': 'First visit',
      'Entre na lista da Yanca.': 'Join the Yanca list.',
      'Seu e-mail': 'Your email',
      'Quero receber': 'Sign me up',
      Fechar: 'Close',
    },
  }

  const seletor = document.querySelector('.idioma')
  if (seletor) {
    const botaoIdioma = seletor.querySelector('.idioma__botao')
    const listaIdioma = seletor.querySelector('.idioma__lista')
    const sigla = seletor.querySelector('.idioma__sigla')
    const CHAVE_IDIOMA = 'yanca:idioma'

    // O texto original de cada nó é guardado uma vez, para voltar ao português
    // sem recarregar a página e sem precisar de um dicionário invertido.
    const nos = []
    const andarilho = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let no = andarilho.nextNode(); no; no = andarilho.nextNode()) {
      const bruto = no.nodeValue.trim()
      if (bruto) nos.push([no, no.nodeValue, bruto])
    }
    const atributos = [...document.querySelectorAll('[placeholder], [aria-label]')].map((el) => [
      el,
      el.getAttribute('placeholder'),
      el.getAttribute('aria-label'),
    ])

    const trocarIdioma = (codigo) => {
      const dic = IDIOMAS[codigo] || null
      nos.forEach(([no, original, bruto]) => {
        const novo = dic && dic[bruto]
        no.nodeValue = novo ? original.replace(bruto, novo) : original
      })
      atributos.forEach(([el, ph, rotulo]) => {
        if (ph) el.setAttribute('placeholder', (dic && dic[ph]) || ph)
        if (rotulo) el.setAttribute('aria-label', (dic && dic[rotulo]) || rotulo)
      })
      document.documentElement.lang = codigo === 'en' ? 'en' : 'pt-BR'
      if (sigla) sigla.textContent = codigo === 'en' ? 'EN' : 'PT'
      // Todos os botões de idioma da página, e não só os do cabeçalho: no
      // celular o seletor vive dentro da gaveta.
      document.querySelectorAll('[data-idioma]').forEach((b) =>
        b.setAttribute('aria-current', String(b.dataset.idioma === codigo))
      )
      try {
        localStorage.setItem(CHAVE_IDIOMA, codigo)
      } catch (e) {}
    }

    botaoIdioma.addEventListener('click', () => {
      const aberto = !listaIdioma.hidden
      listaIdioma.hidden = aberto
      botaoIdioma.setAttribute('aria-expanded', String(!aberto))
    })
    document.querySelectorAll('[data-idioma]').forEach((b) =>
      b.addEventListener('click', () => {
        trocarIdioma(b.dataset.idioma)
        listaIdioma.hidden = true
        botaoIdioma.setAttribute('aria-expanded', 'false')
      })
    )
    document.addEventListener('click', (e) => {
      if (seletor.contains(e.target) || listaIdioma.hidden) return
      listaIdioma.hidden = true
      botaoIdioma.setAttribute('aria-expanded', 'false')
    })

    try {
      const guardado = localStorage.getItem(CHAVE_IDIOMA)
      if (guardado && guardado !== 'pt') trocarIdioma(guardado)
    } catch (e) {}
  }

  /* 2. cabeçalho */
  const topo = document.querySelector('.amarracao')
  if (topo) {
    let ultimo = 0
    let agendado = false
    addEventListener(
      'scroll',
      () => {
        if (agendado) return
        agendado = true
        requestAnimationFrame(() => {
          const y = scrollY
          topo.classList.toggle('encolhida', y > 90 && y > ultimo)
          if (y < 90) topo.classList.remove('encolhida')
          ultimo = y
          agendado = false
        })
      },
      { passive: true }
    )
  }

  /* 3b. setas dos trilhos. A seta desliga quando chega na ponta, em vez de
     continuar clicável sem fazer nada, que é o defeito da maioria das lojas. */
  document.querySelectorAll('.trilho-caixa').forEach((caixa) => {
    const pista = caixa.querySelector('.trilho, .marcas')
    if (!pista) return
    const setas = caixa.querySelectorAll('.seta')
    const ajustar = () => {
      const fim = pista.scrollWidth - pista.clientWidth - 2
      setas.forEach((s) => {
        const antes = s.dataset.rola === 'antes'
        s.disabled = antes ? pista.scrollLeft <= 2 : pista.scrollLeft >= fim
      })
    }
    setas.forEach((s) =>
      s.addEventListener('click', () => {
        const passo = Math.round(pista.clientWidth * 0.8)
        pista.scrollBy({ left: s.dataset.rola === 'antes' ? -passo : passo, behavior: 'smooth' })
      })
    )
    pista.addEventListener('scroll', ajustar, { passive: true })
    addEventListener('resize', ajustar)
    ajustar()
  })

  /* 3. trilhos */
  document.querySelectorAll('.trilho, .marcas').forEach((trilho) => {
    trilho.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
        const antes = trilho.scrollLeft
        trilho.scrollLeft += e.deltaY
        if (trilho.scrollLeft !== antes) e.preventDefault()
      },
      { passive: false }
    )
  })
})()
