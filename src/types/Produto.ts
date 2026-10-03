import { Categoria } from "./Categoria";

export interface Produto {
    id: number;
    nome: string;
    descricao?: string;
    preco: number;
    categoria: Categoria;
    ativo: boolean;
    // URL pública do arquivo no Supabase Storage (bucket `produtos`).
    imagemUrl?: string | null;
}

export interface DadosNovoProduto {
    nome: string;
    descricao?: string;
    preco: number;
    categoriaId: number;
    imagemUrl?: string | null;
}

export interface DadosAtualizarProduto {
    nome: string;
    descricao?: string;
    preco: number;
    categoriaId: number;
    ativo: boolean;
    // A API trata ausência como "sem imagem": sempre envie a URL atual para não apagá-la.
    imagemUrl: string | null;
}
