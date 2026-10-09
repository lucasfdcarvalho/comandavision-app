export type TipoDialogo = 'info' | 'sucesso' | 'aviso' | 'erro';

export type BotaoDialogo = {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void | Promise<void>;
};

export type EstadoDialogo = {
    id: number;
    origem: string;
    titulo: string;
    mensagem: string;
    botoes: BotaoDialogo[];
    tipo: TipoDialogo;
    aoFechar?: () => void;
    botaoEmAndamento: number | null;
};

// Independente da UI: a trava é síncrona, inclusive antes do próximo render.
export class DialogoController {
    private fila: EstadoDialogo[] = [];
    private proximoId = 0;
    private ouvintes = new Set<() => void>();

    getSnapshot = (): EstadoDialogo | null => this.fila[0] ?? null;

    subscribe = (ouvinte: () => void) => {
        this.ouvintes.add(ouvinte);
        return () => { this.ouvintes.delete(ouvinte); };
    };

    private atualizar() {
        this.ouvintes.forEach((ouvinte) => ouvinte());
    }

    abrir(origem: string, titulo: string, mensagem: string, botoes?: BotaoDialogo[], tipo: TipoDialogo = 'info', aoFechar?: () => void) {
        // Toques repetidos não acumulam a mesma confirmação.
        if (this.fila.some((item) => item.origem === origem && item.titulo === titulo && item.mensagem === mensagem)) return;
        this.fila.push({
            id: ++this.proximoId, origem, titulo, mensagem,
            botoes: botoes ?? (tipo === 'sucesso' ? [] : [{ text: 'Entendi' }]),
            tipo, aoFechar, botaoEmAndamento: null,
        });
        this.atualizar();
    }

    removerOrigem(origem: string) {
        // Uma tela desmontada nunca deixa callbacks de confirmação pendentes.
        this.fila = this.fila.filter((item) => item.origem !== origem);
        this.atualizar();
    }

    fechar(id: number) {
        const atual = this.getSnapshot();
        if (atual?.id !== id || atual.botaoEmAndamento !== null) return;
        this.fila.shift();
        this.atualizar();
        // Retira da fila antes de navegar, impedindo redirecionamentos repetidos.
        atual.aoFechar?.();
    }

    async selecionar(id: number, indice: number) {
        const atual = this.getSnapshot();
        if (atual?.id !== id || atual.botaoEmAndamento !== null) return;
        const botao = atual.botoes[indice];
        if (!botao) return;
        if (botao.style === 'cancel') {
            this.fechar(id);
            return;
        }

        this.fila[0] = { ...atual, botaoEmAndamento: indice };
        this.atualizar();
        try {
            await botao.onPress?.();
            // O callback pode ter navegado ou aberto outra mensagem.
            if (this.getSnapshot()?.id === id) {
                this.fila.shift();
                this.atualizar();
            }
        } catch (erro: unknown) {
            if (this.getSnapshot()?.id !== id) return;
            this.fila[0] = {
                ...atual,
                titulo: 'Não foi possível concluir',
                mensagem: erro instanceof Error ? erro.message : 'Tente novamente em instantes.',
                tipo: 'erro',
                botoes: [{ text: 'Entendi' }],
                aoFechar: undefined,
                botaoEmAndamento: null,
            };
            this.atualizar();
        }
    }
}
