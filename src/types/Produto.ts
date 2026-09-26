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
