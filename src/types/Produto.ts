import { Categoria } from "./Categoria";

export interface Produto {
    id: number;
    nome: string;
    descricao?: string;
    preco: number;
    categoria: Categoria;
    ativo: boolean;
    // O backend ainda não retorna esse campo (ver TODO em ProdutoImagem.tsx).
    // Mantido opcional/nullable de propósito para já funcionar assim que a API
    // passar a devolver a URL do Supabase Storage.
    imagemUrl?: string | null;
}

// Criação/atualização não enviam `imagemUrl` de propósito — o backend ainda
// não aceita esse campo oficialmente (ver TODO em ProdutoImagem.tsx).
export interface DadosNovoProduto {
    nome: string;
    descricao?: string;
    preco: number;
    categoriaId: number;
}

export interface DadosAtualizarProduto {
    nome: string;
    descricao?: string;
    preco: number;
    categoriaId: number;
    ativo: boolean;
}
