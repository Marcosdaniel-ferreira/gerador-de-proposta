// 1. Configurações Globais (Nova regra: Chaves PIX por Tenant)
const CONFIG = {
    taxes: {
        asaas: 0.0199 
    },
    tenants: {
        horizon: {
            name: 'Horizon Lab',
            site: 'https://horizonlab.com.br',
            logo: './assets/img/logo-horizon.png',
            prefixId: 'HZ',
            colors: { bg: '#1E3A8A', text: '#FFFFFF' },
            pix: { tipo: 'CNPJ', chave: '36.501.017/0001-70' } // Altere para o dado real
        },
        m7: {
            name: 'Studio M7',
            site: 'https://studiom7.framer.website',
            logo: './assets/img/logo-m7.png',
            prefixId: 'M7',
            colors: { bg: '#000000', text: '#FFFFFF' },
            pix: { tipo: 'CNPJ', chave: '36.501.017/0001-70' } // Altere para o dado real
        }
    }
};

const Utils = {
    formatCurrency: (value) => {
        if (isNaN(value)) return "0,00";
        return parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    parseCurrencyInput: (value) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }
};

class ProposalCalculator {
    static calculate(baseValue, extraCost, checklistCosts) {
        const totalFaturado = baseValue + extraCost;
        const totalImpostos = totalFaturado * CONFIG.taxes.asaas;
        const lucroLiquido = totalFaturado - totalImpostos - checklistCosts - extraCost;

        return { totalFaturado, totalImpostos, lucroLiquido };
    }
}

class UIController {
    constructor() {
        this.currentTenant = 'horizon'; 
        this.cacheDOM();
        this.bindEvents();
        this.updateTenantTheme();
        
        const taxTotal = (CONFIG.taxes.asaas * 100).toFixed(2);
        this.dom.displayTaxas.innerText = `Taxa Asaas: ${taxTotal}%`;
    }

    cacheDOM() {
        this.dom = {
            tenantSelect: document.getElementById('tenantSelect'),
            headerName: document.getElementById('headerName'),
            headerLink: document.getElementById('headerLink'),
            tipoProjeto: document.getElementById('tipoProjeto'),
            descricaoServico: document.getElementById('descricaoServico'),
            btnProcessar: document.getElementById('btnProcessar'),
            btnPdf: document.getElementById('btnPdf'),
            displayTaxas: document.getElementById('displayTaxas')
        };
    }

    bindEvents() {
        this.dom.tenantSelect.addEventListener('change', (e) => {
            this.currentTenant = e.target.value;
            this.updateTenantTheme();
        });
        this.dom.btnProcessar.addEventListener('click', () => this.processProposal());
        this.dom.btnPdf.addEventListener('click', () => this.exportPDF());
    }

    updateTenantTheme() {
        const tenant = CONFIG.tenants[this.currentTenant];
        
        document.documentElement.style.setProperty('--color-tenant-bg', tenant.colors.bg);
        document.documentElement.style.setProperty('--color-tenant-text', tenant.colors.text);
        
        this.dom.headerName.innerText = tenant.name.split(' ')[0];
        this.dom.headerLink.href = tenant.site;

        document.getElementById('pdfLogo').src = tenant.logo;
        document.getElementById('pdfLinkSite').href = tenant.site;
        
        // Data Binding: Informações de PIX e Metadados
        document.getElementById('propPixType').innerText = tenant.pix.tipo;
        document.getElementById('propPixKey').innerText = tenant.pix.chave;
        
        const dataAtual = new Date();
        document.getElementById('propId').innerText = `ID: ${tenant.prefixId}-${dataAtual.getFullYear()}`;
        document.getElementById('propData').innerText = `DATE: ${dataAtual.toLocaleDateString('pt-BR')}`;
        document.getElementById('pdfFooterName').innerText = `© ${tenant.name}`;
    }

    processProposal() {
        const inputs = {
            cliente: document.getElementById('clienteNome').value.trim() || 'CLIENTE NÃO DEFINIDO',
            categoria: this.dom.tipoProjeto.value.trim() || 'SERVIÇO NÃO DEFINIDO',
            descricao: this.dom.descricaoServico.value.trim(),
            valorBase: Utils.parseCurrencyInput(document.getElementById('valorProjeto').value),
            nomeExtra: document.getElementById('nomeFerramenta').value.trim(),
            custoExtra: Utils.parseCurrencyInput(document.getElementById('custoFerramenta').value)
        };

        let checklistCosts = 0;
        document.querySelectorAll('.tool-checkbox:checked').forEach(chk => {
            checklistCosts += parseFloat(chk.value);
        });

        const { totalFaturado, lucroLiquido } = ProposalCalculator.calculate(
            inputs.valorBase, 
            inputs.custoExtra, 
            checklistCosts
        );

        document.getElementById('valorLucroInterno').innerText = Utils.formatCurrency(lucroLiquido);
        document.getElementById('painelLucro').classList.remove('hidden');

        document.getElementById('propCliente').innerText = inputs.cliente;
        document.getElementById('propCategoria').innerText = inputs.categoria;
        document.getElementById('propValorBase').innerText = Utils.formatCurrency(inputs.valorBase);
        
        const blocoDescricao = document.getElementById('blocoDescricao');
        if (inputs.descricao) {
            document.getElementById('propDescricao').innerText = inputs.descricao;
            blocoDescricao.classList.remove('hidden');
        } else {
            blocoDescricao.classList.add('hidden');
        }

        const isRecorrente = inputs.categoria.toUpperCase().includes('BRANDING');
        document.getElementById('labelValorTotal').innerText = isRecorrente ? 'VALOR MENSAL (RECORRENTE)' : 'VALOR TOTAL DO PROJETO';
        document.getElementById('propTotal').innerText = Utils.formatCurrency(totalFaturado);

        const linhaExtra = document.getElementById('linhaFerramenta');
        if (inputs.custoExtra > 0) {
            linhaExtra.classList.remove('hidden');
            linhaExtra.classList.add('flex');
            document.getElementById('propNomeFerramenta').innerText = (inputs.nomeExtra || 'FERRAMENTA').toUpperCase();
            document.getElementById('propValorFerramenta').innerText = Utils.formatCurrency(inputs.custoExtra);
        } else {
            linhaExtra.classList.add('hidden');
            linhaExtra.classList.remove('flex');
        }

        const docProposta = document.getElementById('documentoProposta');
        docProposta.classList.remove('hidden');
        docProposta.classList.add('flex', 'flex-col');
        
        this.dom.btnPdf.classList.remove('hidden');
    }

    exportPDF() {
        const element = document.getElementById('documentoProposta');
        let nomeCliente = document.getElementById('clienteNome').value.trim() || 'Projeto';
        const prefixo = CONFIG.tenants[this.currentTenant].prefixId;
        
        nomeCliente = nomeCliente.replace(/[^a-z0-9]/gi, '_').toUpperCase();

        window.scrollTo(0, 0);

        const originalCssText = element.style.cssText;
        const originalClassList = element.className;

        element.style.cssText = "width: 794px !important; height: 1123px !important; padding: 60px 50px !important; background: #ffffff; display: flex !important; flex-direction: column !important; box-sizing: border-box !important;";

        const opt = {
            margin:       0, 
            filename:     `${prefixo}_PROPOSTA_${nomeCliente}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { 
                scale: 2,           
                useCORS: true, 
                logging: false,
                scrollY: 0,
                scrollX: 0,
                windowWidth: document.documentElement.offsetWidth
            },
            jsPDF:        { unit: 'px', format: [794, 1123], orientation: 'portrait' } 
        };
        
        setTimeout(() => {
            html2pdf().set(opt).from(element).save().then(() => {
                element.style.cssText = originalCssText;
                element.className = originalClassList;
            });
        }, 150);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UIController();
});