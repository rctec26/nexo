import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Activity,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Check,
  ChevronDown,
  CircleAlert,
  Cpu,
  Download,
  FileSpreadsheet,
  HardDrive,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MemoryStick,
  Package,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import './App.css'

type Product = {
  id: string
  name: string
  sku: string
  category: string
  price: number
  quantity: number
  min_stock: number
  created_at?: string
}

type Movement = {
  id: string
  product_id: string
  type: 'entrada' | 'saida'
  quantity: number
  client_name: string
  movement_date: string
  product?: { name?: string; category?: string; sku?: string } | null
}

type View = 'dashboard' | 'products' | 'movements'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const demoProducts: Product[] = [
  { id: 'demo-1', name: 'SSD Kingston NV2 1TB', sku: 'SSD-KNV2-1T', category: 'Armazenamento', price: 429.9, quantity: 18, min_stock: 5 },
  { id: 'demo-2', name: 'Memória Corsair Vengeance 16GB', sku: 'RAM-CV-16G', category: 'Memória RAM', price: 289.9, quantity: 12, min_stock: 5 },
  { id: 'demo-3', name: 'Memória Kingston DDR3 8GB', sku: 'RAM-KD3-8G', category: 'Memória RAM', price: 119.9, quantity: 3, min_stock: 5 },
  { id: 'demo-4', name: 'Mouse Logitech M170', sku: 'AC-LOG-M170', category: 'Acessórios', price: 79.9, quantity: 24, min_stock: 8 },
]

const demoMovements: Movement[] = [
  { id: 'movement-1', product_id: 'demo-1', type: 'entrada', quantity: 10, client_name: 'Tech Center', movement_date: '2026-10-27', product: { name: 'SSD Kingston NV2 1TB' } },
  { id: 'movement-2', product_id: 'demo-2', type: 'saida', quantity: 2, client_name: 'Mariana Costa', movement_date: '2026-10-26', product: { name: 'Memória Corsair Vengeance 16GB' } },
  { id: 'movement-3', product_id: 'demo-4', type: 'saida', quantity: 1, client_name: 'Oficina Byte', movement_date: '2026-10-25', product: { name: 'Mouse Logitech M170' } },
]

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function App() {
  const [today] = useState(() => new Date())
  const [authenticated, setAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [authenticating, setAuthenticating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [view, setView] = useState<View>('dashboard')
  const [products, setProducts] = useState<Product[]>(supabase ? [] : demoProducts)
  const [movements, setMovements] = useState<Movement[]>(supabase ? [] : demoMovements)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todas as categorias')
  const [modal, setModal] = useState<'product' | 'movement' | null>(null)
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const lowStock = products.filter((product) => product.quantity <= product.min_stock)
  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0)
  const stockValue = products.reduce((sum, product) => sum + product.quantity * product.price, 0)
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'Todas as categorias' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  }), [categoryFilter, products, search])

  async function loadInventory() {
    if (!supabase) return
    const [productResult, movementResult] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('movements').select('*, product:products(name, category)').order('movement_date', { ascending: false }).limit(50),
    ])
    if (productResult.error || movementResult.error) {
      setNotice(`Não foi possível carregar os dados: ${(productResult.error ?? movementResult.error)?.message}`)
    } else {
      setProducts((productResult.data ?? []) as Product[])
      setMovements((movementResult.data ?? []) as Movement[])
      setNotice('')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setLoginError('Não foi possível verificar a sessão. Tente entrar novamente.')
      setAuthenticated(Boolean(data.session))
      setAuthLoading(false)
      if (data.session) void loadInventory()
    })
    return () => { active = false }
  }, [])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    if (supabase) {
      setAuthenticating(true)
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      setAuthenticating(false)
      if (error) {
        setLoginError(error.message.toLowerCase().includes('invalid login credentials')
          ? 'E-mail ou senha inválidos.'
          : error.message.toLowerCase().includes('email not confirmed')
            ? 'Confirme seu e-mail antes de entrar.'
            : error.message)
        return
      }
      setAuthenticated(true)
      void loadInventory()
      return
    }

    if (password !== 'admin') {
      setLoginError('Senha incorreta. Tente novamente.')
      return
    }
    setAuthenticated(true)
  }

  async function signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setNotice(`Não foi possível encerrar a sessão: ${error.message}`)
        return
      }
    }
    setAuthenticated(false)
    setProducts(supabase ? [] : demoProducts)
    setMovements(supabase ? [] : demoMovements)
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const product = {
      name: String(formData.get('name')).trim(),
      sku: String(formData.get('sku')).trim(),
      category: String(formData.get('category')),
      price: Number(formData.get('price')),
      quantity: Number(formData.get('quantity')),
      min_stock: Number(formData.get('min_stock')),
    }
    setSaving(true)
    if (supabase) {
      const { error } = await supabase.from('products').insert(product)
      if (error) setNotice(`Erro ao cadastrar produto: ${error.message}`)
      else {
        setNotice('Produto cadastrado com sucesso.')
        await loadInventory()
        setModal(null)
      }
    } else {
      setProducts((current) => [...current, { ...product, id: `demo-${Date.now()}` }])
      setNotice('Produto adicionado à demonstração. Configure o Supabase para salvar os dados.')
      setModal(null)
    }
    setSaving(false)
  }

  async function saveMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const productId = String(formData.get('product_id'))
    const quantity = Number(formData.get('quantity'))
    const clientName = String(formData.get('client_name')).trim()
    const movementDate = String(formData.get('movement_date'))
    const selectedProduct = products.find((product) => product.id === productId)
    if (!selectedProduct) return
    if (movementType === 'saida' && quantity > selectedProduct.quantity) {
      setNotice('A quantidade de saída não pode ser maior que o estoque disponível.')
      return
    }

    setSaving(true)
    if (supabase) {
      const { error } = await supabase.rpc('register_stock_movement', {
        p_product_id: productId,
        p_type: movementType,
        p_quantity: quantity,
        p_client_name: clientName,
        p_movement_date: movementDate,
      })
      if (error) setNotice(`Erro ao registrar movimentação: ${error.message}`)
      else {
        setNotice('Movimentação registrada com sucesso.')
        await loadInventory()
        setModal(null)
      }
    } else {
      const signedQuantity = movementType === 'entrada' ? quantity : -quantity
      setProducts((current) => current.map((product) => product.id === productId ? { ...product, quantity: product.quantity + signedQuantity } : product))
      setMovements((current) => [{
        id: `movement-${Date.now()}`,
        product_id: productId,
        type: movementType,
        quantity,
        client_name: clientName,
        movement_date: movementDate,
        product: { name: selectedProduct.name, category: selectedProduct.category },
      }, ...current])
      setNotice('Movimentação adicionada à demonstração. Configure o Supabase para salvar os dados.')
      setModal(null)
    }
    setSaving(false)
  }

  async function exportMovements() {
    setExporting(true)
    try {
      let reportMovements = movements
      if (supabase) {
        const pageSize = 1000
        const allMovements: Movement[] = []
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await supabase
            .from('movements')
            .select('*, product:products(name, category, sku)')
            .order('movement_date', { ascending: false })
            .range(offset, offset + pageSize - 1)
          if (error) throw error
          const page = (data ?? []) as Movement[]
          allMovements.push(...page)
          if (page.length < pageSize) break
        }
        reportMovements = allMovements
      }

      if (reportMovements.length === 0) {
        setNotice('Não há movimentações para exportar.')
        return
      }

      const { default: writeExcelFile } = await import('write-excel-file/browser')
      const headers = ['Data', 'Tipo', 'Produto', 'SKU', 'Categoria', 'Quantidade', 'Cliente / fornecedor']
      const headerStyle = { fontWeight: 'bold' as const, backgroundColor: '#2F7657', textColor: '#FFFFFF' }
      const rows = [
        headers.map((value) => ({ value, ...headerStyle })),
        ...reportMovements.map((movement) => [
          { value: new Date(`${movement.movement_date}T12:00:00`), format: 'dd/mm/yyyy' },
          movement.type === 'entrada' ? 'Entrada' : 'Saída',
          movement.product?.name ?? 'Produto',
          movement.product?.sku ?? '',
          movement.product?.category ?? '',
          movement.quantity,
          movement.client_name,
        ]),
      ]
      const file = await writeExcelFile(rows, {
        sheet: 'Movimentações',
        columns: [16, 14, 34, 20, 22, 14, 30].map((width) => ({ width })),
        stickyRowsCount: 1,
      }).toBlob()
      const downloadUrl = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `relatorio-movimentacoes-${today.toISOString().slice(0, 10)}.xlsx`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      setNotice(`Relatório XLSX exportado com ${reportMovements.length} movimentações.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado'
      setNotice(`Não foi possível exportar o relatório: ${message}`)
    } finally {
      setExporting(false)
    }
  }

  if (!authenticated || authLoading) {
    return (
      <main className="login-page">
        <section className="login-aside">
          <div className="brand brand-light"><span className="brand-mark"><Cpu size={21} /></span><span>nexo<span className="brand-dot">.</span></span></div>
          <div className="login-story">
            <span className="eyebrow">GESTÃO DE ESTOQUE</span>
            <h1>Seu estoque,<br />em <span>boa ordem.</span></h1>
            <p>Uma visão clara de cada componente, entrada e saída do seu negócio.</p>
            <div className="login-illustration" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="chip chip-large"><Cpu size={45} strokeWidth={1.2} /></div>
              <div className="chip chip-small"><MemoryStick size={26} strokeWidth={1.5} /></div>
              <div className="chip chip-tiny"><HardDrive size={22} strokeWidth={1.5} /></div>
              <span className="spark spark-one">+</span><span className="spark spark-two">+</span>
            </div>
          </div>
          <p className="aside-footnote"><ShieldCheck size={15} /> Controle simples para quem entende de tecnologia.</p>
        </section>
        <section className="login-main">
          <div className="login-form-wrap">
            <div className="login-mobile-brand brand"><span className="brand-mark"><Cpu size={21} /></span><span>nexo<span className="brand-dot">.</span></span></div>
            <span className="eyebrow eyebrow-muted">ÁREA ADMINISTRATIVA</span>
            <h2>{authLoading ? 'Verificando acesso' : 'Bem-vindo de volta'}</h2>
            <p className="login-description">{authLoading ? 'Verificando sua sessão segura...' : supabase ? 'Entre com sua conta para acessar o painel.' : 'Entre com sua senha para acessar o modo demonstração.'}</p>
            {!authLoading && <form className="login-form" onSubmit={signIn}>
              {supabase && <><label htmlFor="admin-email">E-mail</label><div className={`password-field ${loginError ? 'field-error' : ''}`}><Mail size={17} /><input id="admin-email" type="email" autoComplete="username" placeholder="voce@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></>}
              <label htmlFor="admin-password">Senha</label>
              <div className={`password-field ${loginError ? 'field-error' : ''}`}>
                <LockKeyhole size={17} />
                <input id="admin-password" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              {loginError && <p className="form-error"><CircleAlert size={15} />{loginError}</p>}
              <button className="button button-primary login-button" type="submit" disabled={authenticating}>{authenticating ? 'Autenticando...' : 'Acessar painel'} <ArrowDownLeft size={17} /></button>
            </form>}
            {authLoading && <LoadingState />}
            {!authLoading && <p className="login-demo-note">{supabase ? 'Use o e-mail cadastrado no Supabase Auth.' : <>Acesso de demonstração: <strong>admin</strong></>}</p>}
            <div className="login-footer"><span>© 2026 Nexo Estoque</span><span>Feito para manter tudo no lugar.</span></div>
          </div>
        </section>
      </main>
    )
  }

  const categories = ['Todas as categorias', ...new Set(products.map((product) => product.category))]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="#inicio" onClick={() => setView('dashboard')}><span className="brand-mark"><Cpu size={20} /></span><span>nexo<span className="brand-dot">.</span></span></a>
        <div className="workspace-label">ESPAÇO DE TRABALHO</div>
        <div className="workspace-switch"><span className="workspace-avatar">P</span><span><strong>Pablo Soluções</strong><small>Estoque principal</small></span><ChevronDown size={15} /></div>
        <div className="nav-label">MENU PRINCIPAL</div>
        <nav className="side-nav" aria-label="Navegação principal">
          <button className={view === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setView('dashboard')}><LayoutDashboard size={18} />Visão geral</button>
          <button className={view === 'products' ? 'nav-item active' : 'nav-item'} onClick={() => setView('products')}><Package size={18} />Produtos<span className="nav-count">{products.length}</span></button>
          <button className={view === 'movements' ? 'nav-item active' : 'nav-item'} onClick={() => setView('movements')}><Activity size={18} />Movimentações</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span className={supabase ? 'status-dot online' : 'status-dot'} />{supabase ? 'Supabase conectado' : 'Modo demonstração'}<span className="status-info" title={supabase ? 'Dados conectados ao Supabase' : 'Configure as variáveis do Supabase para persistir os dados'}>i</span></div>
          <button className="profile-row" onClick={() => void signOut()}><span className="profile-avatar">AD</span><span className="profile-copy"><strong>Administrador</strong><small>Encerrar sessão</small></span><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{view === 'dashboard' ? 'Visão geral' : view === 'products' ? 'Produtos' : 'Movimentações'}</strong></div>
          <div className="topbar-right"><span className="today-label">{dateFormat.format(today)}</span><span className="topbar-divider" /><span className="profile-avatar top-avatar">AD</span></div>
        </header>

        <div className="page-content">
          {!supabase && <div className="demo-banner"><CircleAlert size={16} /><span><strong>Modo demonstração.</strong> Os dados não serão gravados. Configure as chaves do Supabase para ativar a persistência.</span></div>}
          {notice && <div className="notice-banner" role="status"><span>{notice}</span><button aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
          {view === 'dashboard' && <>
            <div className="page-heading"><div><span className="eyebrow eyebrow-muted">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(today).toUpperCase()}</span><h1>Visão geral</h1><p>Acompanhe o que está acontecendo no seu estoque.</p></div><button className="button button-primary" onClick={() => { setMovementType('entrada'); setModal('movement') }}><Plus size={17} />Nova movimentação</button></div>
            <section className="metric-grid" aria-label="Resumo do estoque">
              <article className="metric-card"><div className="metric-top"><span>Produtos cadastrados</span><span className="metric-icon icon-blue"><Package size={18} /></span></div><strong className="metric-value">{products.length}</strong><span className="metric-foot">itens diferentes no catálogo</span></article>
              <article className="metric-card"><div className="metric-top"><span>Unidades em estoque</span><span className="metric-icon icon-green"><Boxes size={18} /></span></div><strong className="metric-value">{totalUnits}</strong><span className="metric-foot">unidades disponíveis</span></article>
              <article className="metric-card"><div className="metric-top"><span>Valor em estoque</span><span className="metric-icon icon-orange"><Activity size={18} /></span></div><strong className="metric-value metric-money">{currency.format(stockValue)}</strong><span className="metric-foot">com base no custo cadastrado</span></article>
              <article className="metric-card"><div className="metric-top"><span>Estoque baixo</span><span className="metric-icon icon-red"><CircleAlert size={18} /></span></div><strong className="metric-value">{lowStock.length}</strong><span className="metric-foot">{lowStock.length ? 'precisam de atenção' : 'tudo dentro do esperado'}</span></article>
            </section>
            <section className="dashboard-grid">
              <article className="panel recent-panel"><div className="panel-heading"><div><h2>Movimentações recentes</h2><p>Últimas entradas e saídas registradas</p></div><button className="text-button" onClick={() => setView('movements')}>Ver todas <ArrowDownLeft size={15} /></button></div><MovementTable movements={movements.slice(0, 5)} /></article>
              <article className="panel low-stock-panel"><div className="panel-heading"><div><h2>Estoque baixo</h2><p>Produtos no limite mínimo</p></div><span className="low-stock-count">{lowStock.length}</span></div>
                {lowStock.length ? <div className="low-stock-list">{lowStock.slice(0, 5).map((product) => <div className="low-stock-item" key={product.id}><ProductGlyph category={product.category} /><div className="low-stock-copy"><strong>{product.name}</strong><small>{product.sku}</small></div><span className="stock-warning">{product.quantity} un.</span></div>)}</div> : <div className="empty-state compact"><span className="empty-icon"><Check size={20} /></span><strong>Estoque em dia</strong><p>Nenhum produto abaixo do mínimo.</p></div>}
              </article>
            </section>
            <section className="panel catalog-panel"><div className="panel-heading"><div><h2>Produtos em destaque</h2><p>Um resumo do seu catálogo</p></div><button className="text-button" onClick={() => setView('products')}>Abrir catálogo <ArrowDownLeft size={15} /></button></div><ProductTable products={products.slice(0, 4)} /></section>
          </>}

          {view === 'products' && <>
            <div className="page-heading"><div><span className="eyebrow eyebrow-muted">CATÁLOGO</span><h1>Produtos</h1><p>Gerencie componentes, periféricos e acessórios.</p></div><button className="button button-primary" onClick={() => setModal('product')}><Plus size={17} />Cadastrar produto</button></div>
            <section className="panel full-panel"><div className="toolbar"><div className="search-box"><Search size={17} /><input aria-label="Buscar produtos" placeholder="Buscar por nome ou SKU..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><label className="select-wrap"><SlidersHorizontal size={16} /><select aria-label="Filtrar categoria" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label><span className="result-count">{filteredProducts.length} produtos</span></div>
              {loading ? <LoadingState /> : filteredProducts.length ? <ProductTable products={filteredProducts} /> : <EmptyState title="Nenhum produto encontrado" description="Cadastre um produto ou ajuste os filtros de busca." />}
            </section>
          </>}

          {view === 'movements' && <>
            <div className="page-heading"><div><span className="eyebrow eyebrow-muted">HISTÓRICO</span><h1>Movimentações</h1><p>Entradas e saídas registradas no estoque.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => { setMovementType('saida'); setModal('movement') }}><ArrowUpFromLine size={17} />Registrar saída</button><button className="button button-primary" onClick={() => { setMovementType('entrada'); setModal('movement') }}><ArrowDownToLine size={17} />Registrar entrada</button></div></div>
            <section className="panel full-panel"><div className="panel-heading movement-heading"><div><h2>Histórico completo</h2><p>{movements.length} movimentações carregadas</p></div><button className="button button-secondary" onClick={() => void exportMovements()} disabled={exporting || movements.length === 0}><FileSpreadsheet size={16} />{exporting ? 'Gerando...' : 'Exportar XLSX'}<Download size={15} /></button></div>{loading ? <LoadingState /> : movements.length ? <MovementTable movements={movements} /> : <EmptyState title="Nenhuma movimentação ainda" description="Registre uma entrada ou saída para começar o histórico." />}</section>
          </>}
        </div>
      </main>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="eyebrow eyebrow-muted">{modal === 'product' ? 'CATÁLOGO' : 'ESTOQUE'}</span><h2 id="modal-title">{modal === 'product' ? 'Cadastrar produto' : 'Nova movimentação'}</h2></div><button className="icon-button" aria-label="Fechar" onClick={() => setModal(null)}><X size={19} /></button></div>
          {modal === 'product' ? <form className="data-form" onSubmit={saveProduct}><label>Nome do produto<input name="name" placeholder="Ex.: SSD Kingston NV2 1TB" required /></label><div className="form-row"><label>SKU / código<input name="sku" placeholder="Ex.: SSD-KNV2-1T" required /></label><label>Categoria<select name="category" defaultValue="Armazenamento"><option>Armazenamento</option><option>Memória RAM</option><option>Acessórios</option><option>Processadores</option><option>Placas de vídeo</option><option>Outros</option></select></label></div><div className="form-row"><label>Preço de custo (R$)<input name="price" type="number" min="0" step="0.01" placeholder="0,00" required /></label><label>Quantidade inicial<input name="quantity" type="number" min="0" step="1" placeholder="0" required /></label></div><label>Alerta de estoque mínimo<input name="min_stock" type="number" min="0" step="1" defaultValue="5" required /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar produto'}</button></div></form> : <form className="data-form" onSubmit={saveMovement}><div className="movement-toggle" role="group" aria-label="Tipo de movimentação"><button type="button" className={movementType === 'entrada' ? 'toggle-option selected entry-selected' : 'toggle-option'} onClick={() => setMovementType('entrada')}><ArrowDownToLine size={16} />Entrada</button><button type="button" className={movementType === 'saida' ? 'toggle-option selected exit-selected' : 'toggle-option'} onClick={() => setMovementType('saida')}><ArrowUpFromLine size={16} />Saída</button></div><label>Produto<select name="product_id" required defaultValue=""><option value="" disabled>Selecione um produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.quantity} un. disponíveis</option>)}</select></label><div className="form-row"><label>Quantidade<input name="quantity" type="number" min="1" step="1" placeholder="0" required /></label><label>Data<input name="movement_date" type="date" defaultValue={today.toISOString().slice(0, 10)} required /></label></div><label>Nome do cliente / fornecedor<input name="client_name" placeholder="Ex.: João Silva ou fornecedor" required /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="button button-primary" disabled={saving || products.length === 0}>{saving ? 'Salvando...' : 'Registrar movimentação'}</button></div>{products.length === 0 && <p className="inline-hint">Cadastre pelo menos um produto antes de registrar movimentações.</p>}</form>}
        </section></div>}
    </div>
  )
}

function ProductGlyph({ category }: { category: string }) {
  const Icon = category.toLowerCase().includes('memória') ? MemoryStick : category.toLowerCase().includes('armazenamento') ? HardDrive : category.toLowerCase().includes('processador') ? Cpu : Package
  return <span className="product-glyph"><Icon size={17} /></span>
}

function ProductTable({ products }: { products: Product[] }) {
  return <div className="table-scroll"><table><thead><tr><th>PRODUTO</th><th>CATEGORIA</th><th>SKU</th><th>PREÇO</th><th>ESTOQUE</th><th>STATUS</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><div className="product-cell"><ProductGlyph category={product.category} /><strong>{product.name}</strong></div></td><td><span className="category-label">{product.category}</span></td><td className="sku-cell">{product.sku}</td><td className="price-cell">{currency.format(product.price)}</td><td><strong className="quantity-cell">{product.quantity}</strong><span className="unit-label"> un.</span></td><td>{product.quantity <= product.min_stock ? <span className="status-pill status-low"><span />Estoque baixo</span> : <span className="status-pill status-ok"><span />Disponível</span>}</td></tr>)}</tbody></table></div>
}

function MovementTable({ movements }: { movements: Movement[] }) {
  if (movements.length === 0) return <EmptyState title="Nenhuma movimentação ainda" description="As movimentações recentes aparecerão aqui." />
  return <div className="table-scroll"><table><thead><tr><th>TIPO</th><th>PRODUTO</th><th>CLIENTE / FORNECEDOR</th><th>DATA</th><th>QUANTIDADE</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td><span className={movement.type === 'entrada' ? 'movement-type movement-in' : 'movement-type movement-out'}>{movement.type === 'entrada' ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}{movement.type === 'entrada' ? 'Entrada' : 'Saída'}</span></td><td><strong className="movement-product">{movement.product?.name ?? 'Produto'}</strong></td><td className="client-cell">{movement.client_name}</td><td className="date-cell">{dateFormat.format(new Date(`${movement.movement_date}T12:00:00`))}</td><td><strong className={movement.type === 'entrada' ? 'movement-quantity quantity-in' : 'movement-quantity quantity-out'}>{movement.type === 'entrada' ? '+' : '-'}{movement.quantity} un.</strong></td></tr>)}</tbody></table></div>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><span className="empty-icon"><Package size={20} /></span><strong>{title}</strong><p>{description}</p></div>
}

function LoadingState() {
  return <div className="loading-state"><span className="loading-spinner" />Carregando estoque...</div>
}

export default App
